"""Durable memories: no provider calls, no imported private application data."""
import json
from pathlib import Path
import tempfile
import unittest

from server.app import Application
from server.memory import export_memory, search_project_files
from server.memory_mcp import search_memories


class StructuredMemoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.app = Application(self.root)

    def tearDown(self):
        self.app.shutdown()
        self.app.store.db.close()
        self.temp.cleanup()

    def test_json_file_and_exports_retain_context_without_preloading_reserve(self):
        memory = self.app.upsert('memory', {'title': 'Décision API', 'body': 'Réutiliser le connecteur.',
            'author': 'Damien', 'subject': 'Authentification', 'why': 'Conserver les abonnements.',
            'context': 'Migration précédente à relire.', 'occurredAt': '2026-10-03',
            'tags': ['API'], 'source': 'docs/api.md', 'core': False})
        saved = json.loads((self.app.store.root / 'memory' / (memory['id'] + '.json')).read_text())
        self.assertEqual(saved['header']['project']['id'], 'atelier')
        self.assertEqual(saved['header']['why'], 'Conserver les abonnements.')
        self.assertEqual(saved['header']['provenance']['reference'], 'docs/api.md')
        self.assertEqual(saved['content']['context'], 'Migration précédente à relire.')
        self.assertNotIn('Migration précédente', self.app.memory_context('atelier'))
        result = export_memory(self.app, memory['id'])
        self.assertEqual(json.loads(result['content']), saved)
        markdown = export_memory(self.app, memory['id'], 'markdown')['content']
        self.assertTrue(markdown.startswith('---\nid: '))
        self.assertIn('author: "Damien"', markdown)
        self.assertIn('## Contexte\n\nMigration précédente', markdown)
        self.assertEqual(search_memories(self.app.store.all('memory'), 'authentification')[0]['id'], memory['id'])

    def test_edits_preserve_metadata_and_export_legacy_without_rewriting(self):
        memory = self.app.upsert('memory', {'title': 'Choix', 'body': 'Résumé', 'why': 'Motif', 'core': False})
        changed = self.app.upsert('memory', {'id': memory['id'], 'body': 'Résumé révisé'})
        saved = json.loads(export_memory(self.app, changed['id'])['content'])
        self.assertEqual(saved['header']['created_at'], memory['createdAt'])
        self.assertEqual(saved['header']['why'], 'Motif')
        legacy = self.app.store.all('memory')[0]
        result = export_memory(self.app, legacy['id'])
        self.assertEqual(json.loads(result['content'])['header']['subject'], legacy['title'])
        self.assertNotIn('schemaVersion', self.app.store.get('memory', legacy['id']))

    def test_project_file_search_excludes_private_paths_symlinks_and_outside(self):
        (self.root / 'docs').mkdir()
        (self.root / 'docs' / 'decision.md').write_text('design')
        for folder in ('.git', '.aws', '.codex', '.atelier', 'node_modules'):
            (self.root / folder).mkdir(exist_ok=True)
            (self.root / folder / 'decision-secret.txt').write_text('private')
        (self.root / '.env.decision').write_text('private')
        try:
            (self.root / 'decision-link').symlink_to(self.root / 'docs' / 'decision.md')
        except OSError:
            pass
        found = search_project_files(self.app, 'atelier', 'decision')
        self.assertEqual([item['path'] for item in found['entries']], ['docs/decision.md'])
        with self.assertRaises(ValueError):
            search_project_files(self.app, 'atelier', 'decision', '../')
        with self.assertRaises(ValueError):
            search_project_files(self.app, 'atelier', 'decision', '.atelier')

    def test_invalid_metadata_never_creates_json_file(self):
        with self.assertRaises(ValueError):
            self.app.upsert('memory', {'title': 'Mauvais souvenir', 'body': 'Fait', 'occurredAt': 'hier'})
        self.assertFalse((self.app.store.root / 'memory').exists())
