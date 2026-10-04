"""Durable progressive batches using observed fake jobs, never a provider."""
import hashlib
import json
import tempfile
import threading
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from server.brain_batches import BrainBatches
from server.store import Store, now


class FakeBrain:
    def __init__(self, store):
        self.store, self.lock = store, threading.RLock()

    def config(self, project):
        if project not in ('atelier', 'other'):
            raise ValueError('Projet inconnu.')
        return {'projectId': project}


class BrainBatchTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.store = Store(self.root)
        self.brain = FakeBrain(self.store)
        self.batches = BrainBatches(self.brain)
        self.counter = 0

    def tearDown(self):
        self.store.db.close()
        self.temporary.cleanup()

    def create(self, count=2, **changes):
        data = {'name': 'Mes fichiers', 'projectId': 'atelier', 'timeZone': 'Europe/Paris',
                'entries': [{'relativePath': 'Dossier/Notes/note-' + str(index) + '.txt',
                             'size': 4, 'modifiedAt': 1700000000123 + index} for index in range(count)]}
        data.update(changes)
        return self.batches.create(data)

    def data(self, batch, index=0, text='data'):
        entry = batch['entries'][index]
        return {'projectId': batch['projectId'], 'batchId': batch['id'], 'batchIndex': index,
                'sourceName': entry['sourceName'], 'sourceType': 'text', 'text': text,
                'sourceRelativePath': entry['relativePath'], 'sourceModifiedAt': entry['modifiedAt'],
                'sourceTimeZone': batch['timeZone']}

    def job(self, batch, index=0, status='queued', text='data'):
        self.counter += 1
        entry = batch['entries'][index]
        job = {'id': 'voice_' + format(self.counter, '012x'), 'projectId': batch['projectId'],
               'sourceType': 'text', 'sourceName': entry['sourceName'], 'status': status,
               'sourceSha256': hashlib.sha256(text.encode()).hexdigest(), 'updatedAt': now()}
        self.store.put('brainJob', job)
        return job

    def imported(self, batch, index=0, status='queued', duplicate=False, text='data'):
        data = self.data(batch, index, text)
        self.batches.validate_import(data, data['sourceName'], len(text.encode()))
        job = self.job(batch, index, status, text)
        result = self.batches.record_import(data, dict(job, duplicate=duplicate))
        return job, result

    def test_manifest_is_metadata_only_and_initial_state_cannot_be_complete(self):
        with patch.object(Path, 'read_bytes', side_effect=AssertionError('No user file read')):
            batch = self.create()
        self.assertEqual(batch['state'], 'uploading')
        self.assertEqual((batch['total'], batch['totalBytes'], batch['pending']), (2, 8, 2))
        self.assertEqual((batch['received'], batch['active'], batch['completed'], batch['failed']), (0, 0, 0, 0))
        self.assertEqual(batch['entries'][0]['status'], 'pending')
        self.assertIsNone(batch['completedAt'])
        self.assertEqual(batch['entries'][0]['modifiedAt'], '2023-11-14T22:13:20.123+00:00')

    def test_progress_waits_for_last_file_and_projects_actual_job_transitions(self):
        batch = self.create()
        first, progress = self.imported(batch, status='review')
        self.assertEqual((progress['completed'], progress['pending'], progress['state']), (1, 1, 'uploading'))
        second, progress = self.imported(batch, 1, status='transcribing')
        self.assertEqual((progress['received'], progress['active'], progress['state']), (2, 1, 'processing'))
        self.store.update('brainJob', second['id'], status='exported', updatedAt=now())
        finished = self.batches.get(batch['id'])
        self.assertEqual((finished['completed'], finished['state']), (2, 'completed'))
        self.assertIsNotNone(finished['completedAt'])
        self.assertEqual(finished['receivedBytes'], 8)
        self.assertEqual([entry['status'] for entry in finished['entries']], ['review', 'exported'])

    def test_single_file_error_does_not_block_others_and_pending_prevents_terminal_state(self):
        batch = self.create(3)
        failed = self.batches.entry_error({'id': batch['id'], 'index': 0, 'error': 'Audio supérieur à 20 Mo.'})
        self.assertEqual((failed['failed'], failed['pending'], failed['state']), (1, 2, 'uploading'))
        self.imported(batch, 1, status='review')
        _, complete = self.imported(batch, 2, status='exported')
        self.assertEqual((complete['completed'], complete['failed'], complete['pending'], complete['state']), (2, 1, 0, 'failed'))
        self.assertTrue(complete['entries'][0]['retryable'])
        _, retried = self.imported(batch, 0, status='review')
        self.assertEqual((retried['failed'], retried['completed'], retried['state']), (0, 3, 'completed'))

    def test_failed_job_retry_is_observed_without_reupload_or_another_manifest(self):
        batch = self.create(1)
        job, failed = self.imported(batch, status='failed')
        self.assertEqual(failed['state'], 'failed')
        self.assertTrue(failed['entries'][0]['retryable'])
        self.store.update('brainJob', job['id'], status='queued', updatedAt=now())
        self.assertEqual(self.batches.get(batch['id'])['state'], 'processing')
        self.store.update('brainJob', job['id'], status='review', updatedAt=now())
        self.assertEqual(self.batches.get(batch['id'])['state'], 'completed')

    def test_recovery_after_storage_reopen_and_jobs_beyond_recent_hundred(self):
        batch = self.create()
        first, _ = self.imported(batch, status='review')
        for index in range(130):
            self.job(batch, status='exported')
        self.batches.entry_error({'id': batch['id'], 'index': 1, 'error': 'Upload interrompu.'})
        self.store.db.close()
        self.store = Store(self.root)
        self.brain = FakeBrain(self.store)
        self.batches = BrainBatches(self.brain)
        recovered = self.batches.get(batch['id'])
        self.assertEqual(recovered['entries'][0]['jobId'], first['id'])
        self.assertEqual((recovered['completed'], recovered['failed'], recovered['state']), (1, 1, 'failed'))
        self.assertEqual(recovered['createdAt'], batch['createdAt'])
        self.assertNotIn('entries', self.batches.snapshot()[0])

    def test_create_is_idempotent_across_order_and_timestamp_representations(self):
        batch = self.create()
        self.imported(batch, status='review')
        entries = [{'relativePath': entry['relativePath'], 'size': entry['size'],
                    'modifiedAt': entry['modifiedAt']} for entry in reversed(batch['entries'])]
        repeated = self.create(entries=entries)
        self.assertEqual(repeated['id'], batch['id'])
        self.assertTrue(repeated['duplicate'])
        self.assertEqual(repeated['entries'][0]['relativePath'], batch['entries'][0]['relativePath'])
        self.assertEqual(repeated['completed'], 1)
        self.assertEqual(len(self.store.all('brainBatch')), 1)
        self.assertNotEqual(self.create(timeZone='UTC')['id'], batch['id'])

    def test_duplicate_sources_and_record_replay_count_once(self):
        batch = self.create()
        job, first = self.imported(batch, status='review')
        data = self.data(batch, 1)
        self.batches.validate_import(data, data['sourceName'], 4)
        second = self.batches.record_import(data, dict(job, duplicate=True))
        repeated = self.batches.record_import(data, job)
        self.assertEqual((second['received'], second['duplicates'], second['completed']), (2, 1, 2))
        self.assertEqual(repeated, second)
        events = [event for event in self.store.events() if event['type'] == 'brain.batch_received']
        self.assertEqual(len(events), 2)

    def test_validate_canonical_fields_name_size_project_and_dates(self):
        batch = self.create(1)
        data = self.data(batch)
        data['sourceModifiedAt'] = '2023-11-14T23:13:20.123+01:00'
        fields = self.batches.validate_import(data, data['sourceName'], 4)
        self.assertEqual(fields, {'batchId': batch['id'], 'batchIndex': 0,
                                 'sourceRelativePath': batch['entries'][0]['relativePath'],
                                 'sourceModifiedAt': batch['entries'][0]['modifiedAt'], 'sourceTimeZone': 'Europe/Paris'})
        for changes, name, size in (({'projectId': 'other'}, data['sourceName'], 4),
                                    ({}, 'different.txt', 4), ({}, data['sourceName'], 5),
                                    ({}, data['sourceName'], True), ({}, data['sourceName'], 4.0),
                                    ({'sourceRelativePath': 'other/file.txt'}, data['sourceName'], 4),
                                    ({'sourceModifiedAt': '2024-01-01T00:00:00Z'}, data['sourceName'], 4),
                                    ({'sourceTimeZone': 'UTC'}, data['sourceName'], 4)):
            with self.subTest(changes=changes, name=name, size=size), self.assertRaises(ValueError):
                self.batches.validate_import({**data, **changes}, name, size)
        self.assertEqual(self.batches.get(batch['id'])['received'], 0)

    def test_received_entry_accepts_exact_replay_but_rejects_changed_content_before_copy(self):
        batch = self.create(1)
        job, _ = self.imported(batch, status='correcting')
        data = self.data(batch)
        self.assertEqual(self.batches.validate_import(data, data['sourceName'], 4)['batchId'], batch['id'])
        with self.assertRaisesRegex(ValueError, 'contenu différent'):
            self.batches.validate_import(dict(data, text='else'), data['sourceName'], 4)
        self.assertEqual(self.batches.get(batch['id'])['entries'][0]['jobId'], job['id'])

    def test_failed_entry_can_reference_new_job_but_active_entry_cannot(self):
        batch = self.create(1)
        job, _ = self.imported(batch)
        replacement = self.job(batch)
        with self.assertRaisesRegex(ValueError, 'possède déjà'):
            self.batches.record_import(self.data(batch), replacement)
        self.store.update('brainJob', job['id'], status='failed')
        result = self.batches.record_import(self.data(batch), replacement)
        self.assertEqual(result['entries'][0]['jobId'], replacement['id'])

    def test_browser_error_cannot_override_job_received_after_lost_upload_response(self):
        batch = self.create(1)
        _, observed = self.imported(batch, status='review')
        unchanged = self.batches.entry_error({'id': batch['id'], 'index': 0, 'error': 'Fetch failed.'})
        self.assertEqual(unchanged, observed)

    def test_missing_or_wrong_project_job_never_looks_complete(self):
        batch = self.create(1)
        job, _ = self.imported(batch, status='review')
        self.store.delete('brainJob', job['id'])
        missing = self.batches.get(batch['id'])
        self.assertEqual((missing['completed'], missing['failed'], missing['state']), (0, 1, 'failed'))
        self.assertIn('introuvable', missing['entries'][0]['error'])

    def test_snapshot_filters_project_and_never_exports_private_job_payloads(self):
        self.create(1)
        other = self.create(1, projectId='other')
        self.imported(other, status='review')
        self.assertEqual([item['id'] for item in self.batches.snapshot('other')], [other['id']])
        serialized = json.dumps(self.batches.snapshot())
        for key in ('original', 'configuration', 'inputFile', 'fingerprint', 'entries'):
            self.assertNotIn('"' + key + '"', serialized)

    def test_empty_unsupported_and_oversized_files_remain_visible_in_manifest(self):
        entries = [{'relativePath': 'Dossier/empty.txt', 'size': 0},
                   {'relativePath': 'Dossier/movie.mp3', 'size': 25 * 1024 * 1024},
                   {'relativePath': 'Dossier/archive.zip', 'size': 200}]
        batch = self.create(entries=entries)
        self.assertEqual((batch['total'], batch['pending']), (3, 3))
        for index in range(3):
            batch = self.batches.entry_error({'id': batch['id'], 'index': index, 'error': 'Fichier non compatible.'})
        self.assertEqual((batch['failed'], batch['state']), (3, 'failed'))

    def test_security_rejects_traversal_hidden_absolute_controls_and_duplicate_paths(self):
        for path in ('../file.txt', '/file.txt', 'Dossier/../file.txt', 'C:/file.txt', 'Dossier\\file.txt',
                     '.atelier/file.txt', 'Dossier/.hidden/file.txt', 'Dossier//file.txt', 'Dossier/./file.txt',
                     'Dossier/nul\x00.txt', 'Dossier/' + 'x' * 201, 'a/' * 41 + 'file.txt', 'x' * 501):
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.create(entries=[{'relativePath': path, 'size': 4}])
        with self.assertRaisesRegex(ValueError, 'plusieurs fois'):
            self.create(entries=[{'relativePath': 'a.txt', 'size': 4}] * 2)
        self.assertEqual(self.store.all('brainBatch'), [])

    def test_security_rejects_bad_sizes_dates_zone_names_and_limits(self):
        for size in (-1, True, 1.5, '4', 2 ** 53):
            with self.subTest(size=size), self.assertRaises(ValueError):
                self.create(entries=[{'relativePath': 'file.txt', 'size': size}])
        for date in (True, '2026-10-03', 'secret', float('nan'), -1):
            with self.subTest(date=date), self.assertRaises(ValueError):
                self.create(entries=[{'relativePath': 'file.txt', 'size': 4, 'modifiedAt': date}])
        for zone in ('Unknown/Zone', '../etc/passwd', '', 42):
            with self.subTest(zone=zone), self.assertRaisesRegex(ValueError, 'Fuseau'):
                self.create(timeZone=zone)
        for changes in ({'entries': []}, {'name': 'x' * 201}, {'name': 'nul\x00'},
                        {'projectId': []}, {'projectId': 'unknown'}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.create(**changes)
        self.assertEqual(self.store.all('brainBatch'), [])
        self.assertEqual(self.create(1000)['total'], 1000)
        with self.assertRaisesRegex(ValueError, '1 000'):
            self.create(1001)

    def test_only_allowlisted_manifest_metadata_is_stored_and_unknown_dates_stay_unknown(self):
        batch = self.create(entries=[{'relativePath': 'file.txt', 'size': 4, 'credential': 'do-not-store'}],
                            credential='do-not-store', timeZone=None)
        self.assertIsNone(batch['entries'][0]['modifiedAt'])
        self.assertEqual(batch['timeZone'], 'UTC')
        self.assertNotIn('do-not-store', json.dumps(self.store.all('brainBatch')))

    def test_invalid_batch_references_and_indexes_are_rejected(self):
        batch = self.create(1)
        for index in (-1, 1, True, '0', None):
            with self.subTest(index=index), self.assertRaises(ValueError):
                self.batches.validate_import(dict(self.data(batch), batchIndex=index), 'note-0.txt', 4)
        for identifier in ('../file', '', 'batch_missing', None):
            with self.subTest(identifier=identifier), self.assertRaises(ValueError):
                self.batches.get(identifier)
        self.assertEqual(self.batches.validate_import({'text': 'data'}, 'text', 4), {})
        self.assertIsNone(self.batches.record_import({}, {}))
        with self.assertRaises(ValueError):
            self.batches.validate_import({'batchIndex': 0}, 'text', 4)

    def test_http_routes_require_nonce_and_preserve_failed_entry_in_durable_batch(self):
        from run import make_handler
        self.brain.batches = self.batches
        app = type('BatchHttpFixture', (), {'brain': self.brain})()
        server = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(app, 'fixture-token'))
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        base = 'http://127.0.0.1:' + str(server.server_port)

        def request(path, body=None, authenticated=True):
            headers = {'X-Atelier-Token': 'fixture-token'} if authenticated else {}
            raw = json.dumps(body).encode() if body is not None else None
            if raw is not None:
                headers['Content-Type'] = 'application/json'
            with urlopen(Request(base + path, data=raw, headers=headers), timeout=2) as response:
                return json.load(response)

        try:
            manifest = {'name': 'Dossier', 'entries': [{'relativePath': 'Dossier/a.txt', 'size': 4}]}
            with self.assertRaises(HTTPError) as error:
                request('/api/brain/batch/create', manifest, authenticated=False)
            self.assertEqual(error.exception.code, 403)
            batch = request('/api/brain/batch/create', manifest)
            self.assertEqual(batch['pending'], 1)
            failed = request('/api/brain/batch/error', {'id': batch['id'], 'index': 0, 'error': 'Lecture impossible.'})
            self.assertEqual(failed['state'], 'failed')
            self.assertEqual(request('/api/brain/batch?id=' + batch['id']), failed)
            with self.assertRaises(HTTPError) as error:
                request('/api/brain/batch?id=' + batch['id'], authenticated=False)
            self.assertEqual(error.exception.code, 403)
            with self.assertRaises(HTTPError) as error:
                request('/api/brain/batch/create', {**manifest, 'entries': [{'relativePath': '../a.txt', 'size': 4}]})
            self.assertEqual(error.exception.code, 400)
            self.assertEqual(len(self.store.all('brainBatch')), 1)
        finally:
            server.shutdown()
            server.server_close()
            worker.join(timeout=2)


if __name__ == '__main__':
    unittest.main()
