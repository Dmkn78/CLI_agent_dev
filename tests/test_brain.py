"""Voice workflow acceptance with a local fake API, never a real model."""
import base64
import hashlib
import json
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from unittest.mock import patch

from server.app import Application
from server.brain import Brain, INSTRUCTIONS, local_url, relative_folder
from run import make_handler


class BrainApiFixture(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def respond(self, value, status=200):
        body = json.dumps(value, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.server.calls.append((self.path, None))
        if self.path == '/redirect/v1/models':
            self.send_response(302)
            self.send_header('Location', self.server.base + '/v1/models')
            self.end_headers()
        elif self.path == '/api/v1/models':
            self.respond({'models': [{'key': 'fixture-brain-local', 'type': 'llm', 'loaded_instances': [{'id': 'fixture-brain-local'}]}]})
        else:
            self.respond({'data': [{'id': 'fixture-brain-local'}]})

    def do_POST(self):
        raw = self.rfile.read(int(self.headers['Content-Length']))
        if self.path.endswith('/audio/transcriptions') or self.path == '/v1/transcribe':
            self.server.calls.append((self.path, raw))
            self.respond({'text': self.server.transcript})
            return
        body = json.loads(raw)
        self.server.calls.append((self.path, body))
        self.server.received.set()
        self.server.release.wait(timeout=5)
        if self.server.override is not None:
            self.respond(self.server.override)
            return
        input_data = json.loads(body['messages'][-1]['content'])
        if 'transcription' in input_data:
            original = input_data['transcription']
            result = {'title': 'Mémoire du projet Obsidian', 'language': 'fr',
                      'description': 'Une dictée sur la mémoire du projet et ses notes Obsidian.',
                      'content_types': ['reflection'],
                      'text': original.replace('obsidienne', 'Obsidian'),
                      'topics': ['mémoire', 'Obsidian'], 'tags': ['second-cerveau'], 'entities': ['my_brain'],
                      'uncertainties': ['Terme RLCD à préciser.'] if 'RLCD' in original else [],
                      'corrections': [{'from': 'obsidienne', 'to': 'Obsidian', 'reason': 'Nom du logiciel.'}] if 'obsidienne' in original else []}
            content = json.dumps(result, ensure_ascii=False)
        else:
            content = 'Les notes parlent de mémoire. [[' + input_data['notes'][0]['path'] + ']]'
        self.respond({'choices': [{'finish_reason': 'stop', 'message': {'content': content}}],
                      'usage': {'prompt_tokens': 14, 'completion_tokens': 30, 'total_tokens': 44}})


class BrainTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.vault = self.root / 'my_brain'
        self.inbox = self.root / 'voice-inbox'
        self.vault.mkdir()
        self.inbox.mkdir()
        self.app = Application(self.root)
        self.brain = self.app.brain
        self.api = ThreadingHTTPServer(('127.0.0.1', 0), BrainApiFixture)
        self.api.daemon_threads = True
        self.api.base = 'http://127.0.0.1:' + str(self.api.server_port)
        self.api.calls, self.api.override = [], None
        self.api.transcript = 'Mon obsidienne garde toutes mes idées.'
        self.api.received, self.api.release = threading.Event(), threading.Event()
        self.api.release.set()
        self.thread = threading.Thread(target=self.api.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.api.release.set()
        self.app.shutdown()
        self.api.shutdown()
        self.api.server_close()
        self.thread.join(timeout=2)
        self.app.store.db.close()
        self.temp.cleanup()

    def configured(self, **changes):
        self.brain.save({'baseUrl': self.api.base + '/v1', 'vaultPath': str(self.vault),
                         'inputPath': str(self.inbox), **changes})
        self.brain.discover('atelier')
        return self.brain.save({'model': 'fixture-brain-local'})

    def wait(self, identifier, statuses=('review', 'exported', 'failed', 'cancelled', 'interrupted')):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            job = self.brain.job(identifier)
            if job['status'] in statuses:
                return job
            time.sleep(.01)
        self.fail('Voice job did not finish.')

    def submit(self, text='Mon obsidienne et ma mémoire. RLCD est ambigu.'):
        return self.brain.submit({'text': text, 'sourceName': 'dictée.txt'})

    def test_configuration_is_offline_catalog_is_read_only_and_models_are_discovered(self):
        config = self.brain.save({'baseUrl': self.api.base + '/v1'})
        self.assertFalse(self.api.calls)
        self.assertEqual(config['permission'], 'read-only')
        self.assertFalse(config['watching'])
        self.assertFalse(config['models'])
        self.assertIsNone(self.brain.worker.ident)
        self.assertIsNone(self.brain.watcher.ident)
        self.brain.discover('atelier')
        self.assertEqual(self.api.calls, [('/v1/models', None), ('/api/v1/models', None)])
        with self.assertRaises(ValueError):
            self.brain.save({'model': 'made-up-model'})

    def test_local_scope_no_redirect_and_paths_are_explicit(self):
        for endpoint in ('https://example.org/v1', 'http://192.168.1.2/v1', 'http://127.0.0.1.evil/v1',
                         'http://user@localhost/v1', 'http://localhost:0/v1', 'http://localhost/v1?q=x'):
            with self.subTest(endpoint=endpoint), self.assertRaises(ValueError):
                local_url(endpoint)
        self.assertEqual(local_url('http://localhost:1234/v1'), 'http://127.0.0.1:1234/v1')
        for folder in ('../outside', '/absolute', '.obsidian', 'Inbox/../../bad', 'Inbox//bad'):
            with self.subTest(folder=folder), self.assertRaises(ValueError):
                relative_folder(folder)
        self.brain.save({'baseUrl': self.api.base + '/redirect'})
        with self.assertRaisesRegex(ValueError, 'HTTP 302'):
            self.brain.discover('atelier')
        self.assertEqual(self.api.calls, [('/redirect/v1/models', None)])

    def test_faithful_text_original_yaml_and_observed_usage(self):
        self.configured(context='Notes de développement.', glossary='Obsidian, my_brain')
        original = 'Mon obsidienne et ma mémoire. RLCD est ambigu. <script>alert(1)</script>'
        job = self.wait(self.submit(original)['id'])
        self.assertEqual(job['status'], 'review')
        self.assertEqual(job['original'], original)
        self.assertEqual(Path(job['inputFile']).read_text(), original)
        self.assertEqual(job['result']['text'], original.replace('obsidienne', 'Obsidian'))
        self.assertEqual(job['usage'], {'inputTokens': 14, 'outputTokens': 30, 'totalTokens': 44})
        self.assertEqual(job['sourceSha256'], hashlib.sha256(original.encode()).hexdigest())
        self.assertIn("topics:\n  - 'mémoire'\n  - 'Obsidian'", job['markdown'])
        self.assertIn('## Transcription originale\n\n```text\n' + original, job['markdown'])
        self.assertIn('## Proposition IA — à relire', job['markdown'])
        self.assertTrue(job['transcriptionReview']['changed'])
        self.assertNotIn('source_sha256:', job['markdown'])
        self.assertIn('- Terme RLCD à préciser.', job['markdown'])
        request = self.api.calls[-1][1]
        self.assertEqual(request['model'], 'fixture-brain-local')
        self.assertEqual(request['messages'][0]['content'], INSTRUCTIONS)
        self.assertEqual(json.loads(request['messages'][1]['content'])['transcription'], original)
        self.assertNotIn('tools', request)
        self.assertEqual(list(self.vault.rglob('*.md')), [])
        snapshot = self.brain.snapshot()['jobs'][0]
        self.assertNotIn('original', snapshot)
        self.assertNotIn('markdown', snapshot)

    def test_export_requires_permission_is_idempotent_and_never_overwrites(self):
        self.configured()
        job = self.wait(self.submit()['id'])
        with self.assertRaises(ValueError):
            self.brain.export(job['id'])
        self.brain.save({'permission': 'vault-write'})
        exported = self.brain.export(job['id'])
        target = Path(exported['exportPath'])
        self.assertTrue(target.is_relative_to(self.vault.resolve()))
        self.assertEqual(target.read_text(), job['markdown'])
        self.assertEqual(exported['exportSha256'], hashlib.sha256(target.read_bytes()).hexdigest())
        target.write_text('Human edit.', encoding='utf-8')
        self.brain.export(job['id'])
        self.assertEqual(target.read_text(), 'Human edit.')
        self.assertEqual(len(list(self.vault.rglob('*.md'))), 1)

    def test_duplicate_input_never_triggers_another_model_call(self):
        self.configured()
        first = self.wait(self.submit()['id'])
        duplicate = self.submit()
        self.assertEqual(duplicate['id'], first['id'])
        self.assertTrue(duplicate['duplicate'])
        self.assertEqual(sum(path.endswith('/chat/completions') for path, _ in self.api.calls), 1)

    def test_audio_transcription_then_cleanup_and_automatic_note(self):
        self.configured(permission='vault-write', autoExport=True,
                        sttUrl=self.api.base + '/v1/audio/transcriptions', sttModel='fixture-asr-local')
        raw = b'FAKE_AUDIO_BYTES_NOT_A_REAL_RECORDING'
        job = self.brain.submit({'sourceName': 'voice.wav', 'sourceType': 'audio',
                                 'audioBase64': base64.b64encode(raw).decode()})
        done = self.wait(job['id'], ('exported', 'failed'))
        self.assertEqual(done['status'], 'exported')
        self.assertEqual(done['original'], self.api.transcript)
        paths = [entry[0] for entry in self.api.calls]
        self.assertEqual(paths, ['/v1/models', '/api/v1/models', '/v1/audio/transcriptions', '/v1/chat/completions'])
        payload = next(body for path, body in self.api.calls if path.endswith('/audio/transcriptions'))
        self.assertIn(b'name="file"; filename="voice.wav"', payload)
        self.assertIn(b'fixture-asr-local', payload)
        self.assertIn(raw, payload)
        self.assertEqual(Path(done['inputFile']).read_bytes(), raw)

    def test_malformed_or_truncated_output_never_exports(self):
        self.configured(permission='vault-write', autoExport=True)
        for index, override in enumerate((
            {'choices': [{'finish_reason': 'length', 'message': {'content': '{}'}}]},
            {'choices': [{'finish_reason': 'stop', 'message': {'content': 'not JSON'}}]},
            {'choices': [{'finish_reason': 'stop', 'message': {'content': '{}'}}]},
            {'choices': [{'finish_reason': 'stop', 'message': {'content': '{}', 'tool_calls': [{}]}}]},
        )):
            self.api.override = override
            job = self.wait(self.submit('Input '+str(index))['id'])
            self.assertEqual(job['status'], 'failed')
            self.assertNotIn('markdown', job)
        self.assertFalse(list(self.vault.rglob('*.md')))

    def test_cancel_and_retry_ignore_late_reply_from_previous_attempt(self):
        self.configured(permission='vault-write', autoExport=True)
        self.api.release.clear()
        job = self.submit()
        self.assertTrue(self.api.received.wait(2))
        self.brain.cancel(job['id'])
        self.brain.retry(job['id'])
        self.api.release.set()
        done = self.wait(job['id'], ('exported', 'failed'))
        self.assertEqual(done['status'], 'exported')
        self.assertEqual(done['attempts'], 2)
        self.assertEqual(sum(path.endswith('/chat/completions') for path, _ in self.api.calls), 2)
        events = [e['type'] for e in self.app.store.events() if e['data'].get('id') == job['id']]
        self.assertEqual(events.count('brain.review'), 1)
        self.assertEqual(len(list(self.vault.rglob('*.md'))), 1)

    def test_symlink_output_is_rejected_without_writing_outside_vault(self):
        self.configured(permission='vault-write')
        job = self.wait(self.submit()['id'])
        outside = self.root / 'outside'
        outside.mkdir()
        (self.vault / 'Inbox').symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'symbolique'):
            self.brain.export(job['id'])
        self.assertFalse(list(outside.iterdir()))

    def test_search_and_rag_use_existing_notes_and_explicit_excerpts(self):
        self.configured()
        (self.vault / 'memoire.md').write_text('---\ntopics: ["mémoire"]\n---\n# Second cerveau\n\nObsidian conserve les idées.', encoding='utf-8')
        (self.vault / 'other.md').write_text('# Cuisine\nRecette de soupe.', encoding='utf-8')
        hidden = self.vault / '.private'
        hidden.mkdir()
        (hidden / 'secret.md').write_text('mémoire privée', encoding='utf-8')
        search = self.brain.search('atelier', 'mémoire')
        self.assertEqual(search['total'], 1)
        self.assertEqual(search['matches'][0]['path'], 'memoire.md')
        answer = self.brain.ask('atelier', 'mémoire')
        self.assertIn('[[memoire.md]]', answer['answer'])
        self.assertTrue(answer['excerptsOnly'])
        request = self.api.calls[-1][1]
        notes = json.loads(request['messages'][1]['content'])['notes']
        self.assertEqual([n['path'] for n in notes], ['memoire.md'])
        with self.assertRaises(ValueError):
            self.brain.read_note('atelier', '../outside.md')
        count = len(self.api.calls)
        no_match = self.brain.ask('atelier', 'unfindable')
        self.assertEqual(len(self.api.calls), count)
        self.assertFalse(no_match['sources'])

    def test_watcher_only_imports_stable_files_once_and_does_not_delete_source(self):
        config = self.configured()
        # Drive the stable-file scanner deterministically without a live watcher.
        config['watching'] = True
        self.app.store.put('brainConfig', config)
        path = self.inbox / 'capture.txt'
        path.write_text('Mon obsidienne garde ma mémoire.', encoding='utf-8')
        (self.inbox / '.secret.txt').write_text('Do not import hidden files.', encoding='utf-8')
        with patch('server.brain.time.monotonic', return_value=100):
            self.brain._scan(config)
        self.assertFalse(self.app.store.all('brainJob'))
        with patch('server.brain.time.monotonic', return_value=103):
            self.brain._scan(config)
        jobs = self.app.store.all('brainJob')
        self.assertEqual(len(jobs), 1)
        self.wait(jobs[0]['id'])
        with patch('server.brain.time.monotonic', return_value=106):
            self.brain._scan(config)
        self.assertEqual(len(self.app.store.all('brainJob')), 1)
        self.assertTrue(path.is_file())

    def test_restart_pauses_watcher_and_preserves_jobs_and_original(self):
        config = self.configured()
        job = self.wait(self.submit()['id'])
        self.brain.close()
        self.app.store.update('brainConfig', config['id'], watching=True)
        self.app.store.update('brainJob', job['id'], status='queued')
        replacement = Brain(self.app)
        try:
            self.assertFalse(replacement.config('atelier')['watching'])
            self.assertEqual(replacement.job(job['id'])['status'], 'interrupted')
            self.assertEqual(replacement.job(job['id'])['original'], job['original'])
            self.assertIsNone(replacement.worker.ident)
        finally:
            replacement.close()

    def test_http_routes_require_nonce_and_host_before_any_inference(self):
        self.configured()
        server = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(self.app, 'brain-fixture'))
        server.daemon_threads = True
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        origin = 'http://127.0.0.1:' + str(server.server_port)
        payload = json.dumps({'text': 'Ma mémoire obsidienne.'}).encode()
        try:
            with self.assertRaises(HTTPError) as error:
                urlopen(Request(origin + '/api/brain/import', data=payload, headers={'Content-Type':'application/json'}))
            self.assertEqual(error.exception.code, 403)
            self.assertEqual(len(self.api.calls), 2)
            request = Request(origin + '/api/brain/import', data=payload,
                              headers={'Content-Type':'application/json','X-Atelier-Token':'brain-fixture'})
            with urlopen(request) as response:
                job = json.load(response)
            self.wait(job['id'])
            with urlopen(Request(origin + '/api/brain/job?id='+job['id'], headers={'X-Atelier-Token':'brain-fixture'})) as response:
                detail = json.load(response)
            self.assertEqual(detail['status'], 'review')
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)


if __name__ == '__main__':
    unittest.main()
