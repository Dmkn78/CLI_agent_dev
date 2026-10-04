"""Source-first notes: a stable YAML contract, conservative review and migration."""
import hashlib
import json
import re
import unittest
from pathlib import Path
from unittest.mock import patch

import test_brain as fixtures
from server.brain import validate_result
from server.brain_notes import NOTE_VERSION, PROPOSAL_MARKER, literal_text, note_properties, render_note, retrieval_text


class BrainNoteTests(unittest.TestCase):
    setUp = fixtures.BrainTests.setUp
    tearDown = fixtures.BrainTests.tearDown
    configured = fixtures.BrainTests.configured
    wait = fixtures.BrainTests.wait
    submit = fixtures.BrainTests.submit

    def test_original_is_exact_and_unreviewed_invention_is_not_retrieved(self):
        self.configured(permission='vault-write', autoExport=True)
        original = '  Je ne veux pas signer.\n\nJe garde 150 euros, euh oui.  \n'
        result = {'title': 'Pensée personnelle', 'description': 'Une réflexion sur une décision.',
                  'language': 'fr', 'content_types': ['reflection', 'self-advice'],
                  'text': 'Je veux signer. Je garde 1500 euros et une licorneviolette.',
                  'topics': [], 'tags': [], 'entities': [], 'uncertainties': [], 'corrections': []}
        self.api.override = {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(result)}}]}
        job = self.wait(self.submit(original)['id'], statuses=('exported', 'failed'))
        self.assertEqual(job['status'], 'exported', job.get('error'))
        body = job['markdown'].split('## Transcription originale\n\n', 1)[1].split('\n\n' + PROPOSAL_MARKER, 1)[0]
        self.assertEqual(body, literal_text(original))
        self.assertEqual(job['original'], original)
        self.assertEqual(job['transcriptionReview']['status'], 'review-required')
        self.assertGreater(job['transcriptionReview']['counts']['changedPassages'], 0)
        self.assertTrue(job['transcriptionReview']['warnings'])
        self.assertEqual(job['result']['corrections'], [])  # Provider can omit its edits; diff still sees them.
        self.assertIn(result['text'], Path(job['exportPath']).read_text())
        self.assertNotIn('licorneviolette', retrieval_text(job['markdown']))
        self.assertEqual(self.brain.search('atelier', 'licorneviolette')['matches'], [])
        self.assertTrue(self.brain.search('atelier', 'signer')['matches'])

    def test_flat_properties_keep_strings_lists_dates_and_no_audit_payload(self):
        self.configured()
        job = self.wait(self.brain.submit({'sourceName': "007 - L'idée.txt", 'text': 'Une pensée.',
                                         'sourceModifiedAt': '2026-09-25T12:00:00Z'})['id'])
        header = job['markdown'].split('\n---\n', 1)[0]
        expected = ['schema_version', 'title', 'date', 'date_basis', 'source', 'file_number',
                    'subject', 'description', 'content_types', 'topics', 'entities', 'tags',
                    'related_notes', 'language']
        self.assertEqual(list(note_properties(job, job['result'])), expected)
        self.assertEqual([line.split(':', 1)[0] for line in header.splitlines()[1:]
                          if not line.startswith(' ')], expected)
        self.assertIn("title: '007 - L''idée'", header)
        self.assertIn("file_number: '007'", header)
        self.assertIn('date: 2026-09-25', header)
        self.assertIn("content_types:\n  - 'reflection'", header)
        self.assertNotIn('sha256', header)
        self.assertNotIn('llm_model', header)
        self.assertNotIn('voice_', header)
        self.assertNotIn('{', header)

    def test_controlled_multivalue_types_and_exact_proposed_text(self):
        self.configured()
        job = self.wait(self.submit('Une réflexion.')['id'])
        result = dict(job['result'], content_types=['story', 'reflection', 'story'], text='  Une réflexion.\n')
        clean = validate_result(result)
        self.assertEqual(clean['content_types'], ['reflection', 'story'])
        self.assertEqual(clean['text'], result['text'])
        with self.assertRaises(ValueError):
            validate_result(dict(result, content_types=['thinking']))

    def test_paired_markers_survive_reordered_properties_and_quoted_markers(self):
        self.configured()
        job = self.wait(self.submit('Une réflexion.')['id'])
        literal = '<!-- my-brain:unreviewed-proposal -->'
        original = 'Mon exemple contient ' + literal + ', tout doit rester.'
        proposed = 'Une invention licorneviolette ' + literal + ' encore du texte.'
        note = render_note(dict(job, original=original), dict(job['result'], text=proposed))
        note = note.replace('---\nschema_version:', '---\naliases: []\nschema_version:', 1)
        reference = retrieval_text(note)
        self.assertIn(original, reference)
        self.assertNotIn('licorneviolette', reference)

    def test_metadata_cannot_inject_properties_or_illegal_yaml_controls(self):
        self.configured()
        job = self.wait(self.submit('Un exemple.')['id'])
        result = dict(job['result'], topics=["yes\nunsafe: true\n'quoted'\x01"])
        header = render_note(job, result).split('\n---\n', 1)[0]
        self.assertNotIn('\x01', header)
        self.assertNotRegex(header, r'(?m)^unsafe:')
        self.assertIn("  - 'yes unsafe: true ''quoted'''", header)

    def test_literal_block_keeps_obsidian_comments_visible_and_fences_intact(self):
        original = '%% Secret visible %%\n<!-- commentaire ouvert\n```\nLe texte continue.'
        wrapped = literal_text(original)
        self.assertEqual(wrapped, '````text\n' + original + '\n````')

    def test_native_source_has_application_label_without_history_identifier(self):
        self.configured()
        job = self.wait(self.brain.submit({'sourceName': 'Fluid Voice · native-id', 'text': 'Une pensée.'},
                                        source_entry={'id': 'native-id', 'timestamp': 1791000000})['id'])
        self.assertEqual(note_properties(job, job['result'])['source'], 'Fluid Voice')
        header = job['markdown'].split('\n---\n', 1)[0]
        self.assertNotIn('native-id', header)
        self.assertEqual(job['sourceEntryId'], 'native-id')

    def test_reformat_does_not_reorder_history_by_database_update_order(self):
        first = self.legacy()
        second = self.wait(self.submit('Une autre note.')['id'], statuses=('exported', 'failed'))
        self.brain.reformat(first['id'])
        self.assertEqual([job['id'] for job in self.brain.snapshot()['jobs']], [second['id'], first['id']])

    def legacy(self):
        self.configured(permission='vault-write', autoExport=True)
        job = self.wait(self.submit('Mon obsidienne garde mes pensées.')['id'], statuses=('exported', 'failed'))
        old = '---\nid: "' + job['id'] + '"\n---\n# Ancienne présentation\n\n' + job['result']['text']
        Path(job['exportPath']).write_text(old, encoding='utf-8')
        result = dict(job['result']); result.pop('content_types'); result['content_type'] = 'voice-note'
        return self.app.store.update('brainJob', job['id'], result=result, markdown=old,
            noteFormatVersion=2, exportSha256=hashlib.sha256(old.encode()).hexdigest())

    def test_reformat_backs_up_and_preserves_links_without_inference(self):
        old = self.legacy()
        calls = len(self.api.calls)
        new = self.brain.reformat(old['id'])
        self.assertEqual(len(self.api.calls), calls)
        self.assertEqual(new['exportPath'], old['exportPath'])
        self.assertEqual(new['original'], old['original'])
        self.assertEqual(new['noteFormatVersion'], NOTE_VERSION)
        backup = Path(new['formatBackup'])
        self.assertEqual((backup / 'note.md').read_text(), old['markdown'])
        self.assertEqual(json.loads((backup / 'job.json').read_text())['result'], old['result'])
        self.assertEqual(Path(new['exportPath']).read_text(), new['markdown'])
        self.assertEqual(new['exportSha256'], hashlib.sha256(new['markdown'].encode()).hexdigest())
        self.assertEqual(self.brain.reformat(old['id'])['formatBackup'], new['formatBackup'])

    def test_reformat_preserves_manual_edits(self):
        job = self.legacy()
        path = Path(job['exportPath'])
        edited = job['markdown'] + '\nUne correction manuelle précieuse.'
        path.write_text(edited)
        with self.assertRaisesRegex(ValueError, 'modifiée manuellement'):
            self.brain.reformat(job['id'])
        self.assertEqual(path.read_text(), edited)
        self.assertEqual(self.brain.job(job['id'])['noteFormatVersion'], 2)

    def test_reformat_refuses_permission_and_symlink(self):
        job = self.legacy()
        self.brain.save({'permission': 'read-only', 'autoExport': False})
        with self.assertRaises(ValueError):
            self.brain.reformat(job['id'])
        self.brain.save({'permission': 'vault-write'})
        target = Path(job['exportPath'])
        outside = self.root / 'outside.md'
        outside.write_text(job['markdown'])
        target.unlink(); target.symlink_to(outside)
        with self.assertRaises(ValueError):
            self.brain.reformat(job['id'])
        self.assertEqual(outside.read_text(), job['markdown'])

    def test_edit_racing_with_migration_is_restored_and_kept_in_backup(self):
        import os
        job = self.legacy()
        target = Path(job['exportPath'])
        edited = job['markdown'] + '\nModification pendant la remise en forme.'
        rename = os.rename
        def concurrent_edit(source, destination):
            Path(source).write_text(edited)
            return rename(source, destination)
        with patch('server.brain.os.rename', side_effect=concurrent_edit):
            with self.assertRaisesRegex(ValueError, 'édition concurrente'):
                self.brain.reformat(job['id'])
        self.assertEqual(target.read_text(), edited)
        copies = list((self.app.store.root / 'brain' / 'note-backups').glob('*/live-note.md'))
        self.assertEqual(len(copies), 1)
        self.assertEqual(copies[0].read_text(), edited)

    def test_new_file_racing_with_publish_is_never_overwritten(self):
        import os
        job = self.legacy()
        target = Path(job['exportPath'])
        link = os.link
        def concurrent_file(source, destination, **options):
            if Path(source).suffix == '.tmp':
                target.write_text('Nouvelle édition créée dans Obsidian.')
            return link(source, destination, **options)
        with patch('server.brain.os.link', side_effect=concurrent_file):
            with self.assertRaises(FileExistsError):
                self.brain.reformat(job['id'])
        self.assertEqual(target.read_text(), 'Nouvelle édition créée dans Obsidian.')
        copies = list((self.app.store.root / 'brain' / 'note-backups').glob('*/live-note.md'))
        self.assertEqual(copies[0].read_text(), job['markdown'])

    def test_migration_recovers_publication_before_database_failure(self):
        job = self.legacy()
        put = self.app.store.put
        def failing_update(kind, value):
            if kind == 'brainJob' and value.get('noteFormatVersion') == NOTE_VERSION:
                raise OSError('Interruption simulée après publication.')
            return put(kind, value)
        with patch.object(self.app.store, 'put', side_effect=failing_update):
            with self.assertRaises(OSError):
                self.brain.reformat(job['id'])
        self.assertEqual(self.brain.job(job['id'])['noteFormatVersion'], 2)
        self.assertTrue(Path(job['exportPath']).read_text().startswith('---\nschema_version: 3\n'))
        calls = len(self.api.calls)
        recovered = self.brain.reformat(job['id'])
        self.assertEqual(recovered['noteFormatVersion'], NOTE_VERSION)
        self.assertEqual(len(self.api.calls), calls)
        self.assertEqual(self.app.store.all('brainNoteFormat'), [])
        self.assertEqual(Path(recovered['exportPath']).read_text(), recovered['markdown'])


if __name__ == '__main__':
    unittest.main()
