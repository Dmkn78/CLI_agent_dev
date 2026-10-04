import shlex
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server.terminal import codex_images, prepare_codex


class TerminalImageTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name).resolve()
        self.image = self.root / "capture; $(touch unexpected) 'é.png"
        self.image.write_bytes(b'\x89PNG\r\n\x1a\nfixture')
        self.models = [{'model': 'fixture', 'supportedReasoningEfforts': [{'reasoningEffort': 'medium'}]}]

    def tearDown(self):
        self.directory.cleanup()

    def test_images_are_literal_arguments_and_preserve_both_permission_profiles(self):
        with patch('server.terminal.shutil.which', return_value='codex'):
            for sandbox in ('read-only', 'workspace-write'):
                plan = prepare_codex(self.root, {'model': 'fixture', 'effort': 'medium',
                    'sandbox': sandbox, 'images': [str(self.image)]}, self.models)
                self.assertEqual(plan['argv'][plan['argv'].index('--image') + 1], str(self.image))
                self.assertEqual(plan['argv'][plan['argv'].index('--sandbox') + 1], sandbox)
                self.assertEqual(plan['argv'][plan['argv'].index('--ask-for-approval') + 1], 'on-request')
                self.assertNotIn('exec', plan['argv'])
                self.assertNotIn('--dangerously-bypass-approvals-and-sandbox', plan['argv'])
                if plan['script'].startswith('cd '):
                    self.assertEqual(shlex.split(plan['script'].split('\n')[1]), plan['argv'])
        self.assertFalse((self.root / 'unexpected').exists())

    def test_relative_paths_and_duplicate_selection(self):
        self.assertEqual(codex_images([self.image.name, str(self.image)], self.root), [str(self.image)])

    def test_rejects_missing_non_images_and_invalid_lists(self):
        text = self.root / 'wrong.png'
        text.write_text('not an image')
        for images in ([str(text)], [str(self.root)], ['missing.png'], 'image.png', [None], ['x'] * 13):
            with self.subTest(images=images), self.assertRaises(ValueError):
                codex_images(images, self.root)

    def test_rejects_oversized_image(self):
        with self.image.open('r+b') as stream:
            stream.truncate(8 * 1024 * 1024 + 1)
        with self.assertRaisesRegex(ValueError, 'volumineuses'):
            codex_images([str(self.image)], self.root)


if __name__ == '__main__':
    unittest.main()
