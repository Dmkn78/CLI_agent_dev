"""Hover recipes use the same observed-control protection as real clicks."""
import tempfile
import unittest
from pathlib import Path

from server.computer import ComputerController, ComputerUnavailable
from server.duplica_verification import MissionVerifier, validate_recipe
from test_duplica_verification import MovingRecipeComputer


class HoverComputer(MovingRecipeComputer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.hovers = []

    def request(self, operation, target, payload):
        if operation == 'act' and payload['action']['kind'] == 'hover':
            self.hovers.append(payload)
            # This fixture reveals the same text on hover as the existing
            # click fixture. The production controller receives real hover.
            payload = {**payload, 'action': {**payload['action'], 'kind': 'click'}}
        return super().request(operation, target, payload)


class DuplicaHoverTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.directory.cleanup()

    def verifier(self, adapter):
        root = Path(self.directory.name)
        return MissionVerifier(None, ComputerController(adapter, root / 'screenshots'), root / 'reports')

    def recipe(self):
        return {'gui': [{'kind': 'open_url', 'url': 'http://127.0.0.1:4362/hover.html'},
                        {'kind': 'hover', 'label': 'Connexions'},
                        {'kind': 'expect', 'text': 'API locales & distantes'}]}

    def test_hover_reobserves_stale_control_once_before_retargeting(self):
        adapter = HoverComputer(rejections=1)
        result = self.verifier(adapter)._gui(self.recipe())
        self.assertEqual(result['status'], 'pass')
        self.assertEqual([hover['action']['index'] for hover in adapter.hovers], [2, 7])
        self.assertNotEqual(adapter.hovers[0]['observation'], adapter.hovers[1]['observation'])
        self.assertEqual(len(adapter.inputs), 1)

    def test_indeterminate_hover_outcome_is_never_replayed(self):
        adapter = HoverComputer()
        adapter.failure = ComputerUnavailable('Résultat du survol inconnu.')
        with self.assertRaises(ComputerUnavailable):
            self.verifier(adapter)._gui(self.recipe())
        self.assertEqual(len(adapter.hovers), 1)

    def test_gui_not_applicable_never_skips_a_configured_hover(self):
        adapter = HoverComputer()
        recipe = validate_recipe({**self.recipe(), 'guiNotApplicable': True}, self.directory.name)
        result = self.verifier(adapter)._gui(recipe)
        self.assertEqual(result['status'], 'pass')
        self.assertEqual(len(adapter.hovers), 1)
        self.assertEqual(recipe['gui'][1]['kind'], 'hover')


if __name__ == '__main__':
    unittest.main()
