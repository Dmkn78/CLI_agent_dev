"""Folder imports keep source identity and dated headers through the real queue.

All inference and audio calls use the local synthetic provider fixture.
"""
import json
import unittest
from pathlib import Path

import test_brain as fixtures


class BrainFolderIntegrationTests(unittest.TestCase):
    setUp = fixtures.BrainTests.setUp
    tearDown = fixtures.BrainTests.tearDown
    configured = fixtures.BrainTests.configured
    wait = fixtures.BrainTests.wait

    def manifest(self, files):
        return self.brain.batches.create({
            'projectId': 'atelier', 'name': 'Journal', 'timeZone': 'Europe/Paris',
            'entries': [{'relativePath': path, 'size': len(text.encode('utf-8')),
                         'modifiedAt': '2026-10-02T23:30:00Z'} for path, text in files]})

    def submit_entry(self, batch, index, text):
        entry = batch['entries'][index]
        return self.brain.submit({'projectId': 'atelier', 'batchId': batch['id'], 'batchIndex': index,
                                 'sourceType': 'text', 'sourceName': entry['sourceName'], 'text': text})

    def test_folder_retains_filename_dates_number_and_subject_separately(self):
        self.configured(permission='vault-write', autoExport=True)
        original = 'Résumé du 30 septembre 2026. Mon obsidienne garde mes idées.'
        batch = self.manifest([('Journal/Septembre/007 - bilan 2026-09-29.txt', original)])
        job = self.wait(self.submit_entry(batch, 0, original)['id'], statuses=('exported', 'failed'))
        self.assertEqual(job['status'], 'exported', job.get('error'))
        self.assertEqual(job['title'], '007 - bilan 2026-09-29')
        self.assertEqual(job['noteDate'], '2026-09-30')
        self.assertEqual(job['subject'], 'Mémoire du projet Obsidian')
        self.assertEqual(job['original'], original)
        self.assertTrue(Path(job['exportPath']).name.startswith('2026-09-30-0001-007-bilan-2026-09-29-'))
        note = job['markdown']
        self.assertIn('schema_version: 3', note)
        self.assertIn("file_number: '007'", note)
        self.assertIn("source: 'Journal/Septembre/007 - bilan 2026-09-29.txt'", note)
        self.assertIn('date: 2026-09-30', note)
        self.assertIn("date_basis: 'summary'", note)
        self.assertTrue(job['description'])
        metadata = job['noteMetadata']
        self.assertEqual(metadata['source_modified_at'], '2026-10-02T23:30:00Z')
        self.assertEqual(metadata['source_timezone'], 'Europe/Paris')
        self.assertTrue(metadata['metadata_uncertainties'])
        self.assertEqual(job['batchIndex'], 0)
        self.assertEqual(self.brain.batches.get(batch['id'])['state'], 'completed')

    def test_identical_audio_text_from_distinct_dated_paths_is_not_merged(self):
        self.configured()
        text = 'Les mêmes mots peuvent être dictés deux jours différents.'
        batch = self.manifest([('Journal/Jour1/vocal.txt', text), ('Journal/Jour2/vocal.txt', text)])
        first = self.wait(self.submit_entry(batch, 0, text)['id'])
        second = self.wait(self.submit_entry(batch, 1, text)['id'])
        self.assertNotEqual(first['id'], second['id'])
        again = self.submit_entry(batch, 0, text)
        self.assertEqual(again['id'], first['id'])
        self.assertTrue(again['duplicate'])
        self.assertEqual(len(self.app.store.all('brainJob')), 2)
        self.assertEqual(self.brain.batches.get(batch['id'])['completed'], 2)

    def test_bad_manifest_entry_can_fail_without_stopping_the_next_file(self):
        self.configured()
        text = 'Une note correcte après une erreur.'
        batch = self.manifest([('Journal/invalide.txt', 'four'), ('Journal/valide.txt', text)])
        with self.assertRaisesRegex(ValueError, 'taille'):
            self.submit_entry(batch, 0, 'wrong size')
        self.assertEqual(self.app.store.all('brainJob'), [])
        self.brain.batches.entry_error({'id': batch['id'], 'index': 0, 'error': 'Le fichier a changé.'})
        job = self.wait(self.submit_entry(batch, 1, text)['id'])
        self.assertEqual(job['status'], 'review')
        progress = self.brain.batches.get(batch['id'])
        self.assertEqual((progress['completed'], progress['failed'], progress['pending']), (1, 1, 0))
        self.assertEqual(progress['state'], 'failed')

    def test_unnamed_source_uses_its_local_date_without_losing_model_subject(self):
        self.configured()
        job = self.wait(self.brain.submit({'text': 'Mon compte rendu du projet.', 'sourceName': '',
                                         'sourceModifiedAt': '2026-10-02T23:30:00Z',
                                         'sourceTimeZone': 'Europe/Paris'})['id'])
        self.assertEqual(job['title'], '2026-10-03')
        self.assertEqual(job['noteDate'], '2026-10-03')
        self.assertEqual(job['noteDateBasis'], 'source_modified_at')
        self.assertEqual(job['subject'], 'Mémoire du projet Obsidian')
        self.assertEqual(job['noteMetadata']['note_date_timezone'], 'Europe/Paris')


if __name__ == '__main__':
    unittest.main()
