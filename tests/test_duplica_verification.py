"""GUI recipe regressions with an isolated computer adapter and no model calls."""
import tempfile
import unittest
from pathlib import Path

from server.computer import ComputerController, ComputerUnavailable, ObservationChanged
from server.duplica_verification import MissionVerifier


class MovingRecipeComputer:
    def __init__(self, rejections=0, visible=True):
        self.calls, self.inputs = [], []
        self.rejections = rejections
        self.index, self.visible = 2, visible
        self.labels = ['Connexions']
        self.text = 'Canaux d’agents · Plan avant action'
        self.failure = None
        self.on_observe = lambda: None

    def available(self):
        return True

    def cancel(self):
        pass

    def request(self, operation, target, payload):
        self.calls.append((operation, target, payload))
        if operation == 'observe':
            self.on_observe()
        elif payload['action']['kind'] == 'open_url':
            target = 'local-browser'
        elif payload['action']['kind'] == 'scroll_to':
            self.index, self.visible = 7, True
        elif payload['action']['kind'] in ('click', 'double_click'):
            if self.failure:
                self.inputs.append(payload['action'])
                raise self.failure
            if self.rejections:
                self.rejections -= 1
                self.index += 5
                raise ObservationChanged('Le contrôle a changé depuis l’observation ; aucun clic émis.')
            if payload['action']['index'] != self.index:
                raise ObservationChanged('Index périmé ; aucun clic émis.')
            self.inputs.append(payload['action'])
            self.text = 'API locales & distantes'
        return {'observationId': str(len(self.calls)), 'target': target, 'text': self.text,
                'controls': [{'index': self.index + offset, 'label': label, 'enabled': True,
                              'visible': self.visible} for offset, label in enumerate(self.labels)]}

    def attempts(self):
        return [payload for operation, _, payload in self.calls
                if operation == 'act' and payload['action']['kind'] in ('click', 'double_click')]


class GuiRecipeTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.directory.cleanup()

    def verifier(self, adapter):
        root = Path(self.directory.name)
        return MissionVerifier(None, ComputerController(adapter, root / 'screenshots'), root / 'reports')

    def recipe(self, kind='click'):
        return {'gui': [{'kind': 'open_url', 'url': 'http://127.0.0.1:4324/#channels'},
                        {'kind': 'expect', 'text': 'Canaux d’agents'},
                        {'kind': 'expect', 'text': 'Plan avant action'},
                        {'kind': kind, 'label': 'Connexions'},
                        {'kind': 'expect', 'text': 'API locales & distantes'}]}

    def test_recipe_reobserves_and_retargets_a_stale_click_once(self):
        for kind in ('click', 'double_click'):
            with self.subTest(kind=kind):
                adapter = MovingRecipeComputer(rejections=1)
                result = self.verifier(adapter)._gui(self.recipe(kind))
                self.assertEqual(result['status'], 'pass')
                self.assertEqual([attempt['action']['index'] for attempt in adapter.attempts()], [2, 7])
                self.assertNotEqual(adapter.attempts()[0]['observation'], adapter.attempts()[1]['observation'])
                self.assertEqual(len(adapter.inputs), 1)

    def test_recipe_resolves_the_label_again_after_revealing_a_control(self):
        adapter = MovingRecipeComputer(visible=False)
        result = self.verifier(adapter)._gui(self.recipe())
        self.assertEqual(result['status'], 'pass')
        self.assertEqual([attempt['action']['index'] for attempt in adapter.attempts()], [7])
        self.assertEqual(len(adapter.inputs), 1)

    def test_recipe_does_not_retry_an_indeterminate_input_result(self):
        adapter = MovingRecipeComputer()
        adapter.failure = ComputerUnavailable('Résultat du clic inconnu ; aucun replay.')
        with self.assertRaises(ComputerUnavailable):
            self.verifier(adapter)._gui(self.recipe())
        self.assertEqual(len(adapter.attempts()), 1)
        self.assertEqual(len(adapter.inputs), 1)

    def test_recipe_limits_refresh_to_one_retry(self):
        adapter = MovingRecipeComputer(rejections=2)
        with self.assertRaises(ObservationChanged):
            self.verifier(adapter)._gui(self.recipe())
        self.assertEqual(len(adapter.attempts()), 2)
        self.assertFalse(adapter.inputs)

    def test_recipe_does_not_click_a_missing_or_ambiguous_refreshed_label(self):
        for labels in (['Autre contrôle'], ['Connexions', 'Connexions']):
            with self.subTest(labels=labels):
                adapter = MovingRecipeComputer(rejections=1)
                adapter.on_observe = lambda: setattr(adapter, 'labels', labels) if adapter.attempts() else None
                result = self.verifier(adapter)._gui(self.recipe())
                self.assertEqual(result['status'], 'fail')
                self.assertEqual(result['observed'], 'Contrôle absent ou ambigu.')
                self.assertEqual(len(adapter.attempts()), 1)
                self.assertFalse(adapter.inputs)

    def test_recipe_cancelled_during_refresh_emits_no_retry(self):
        adapter = MovingRecipeComputer(rejections=1)
        verifier = self.verifier(adapter)
        adapter.on_observe = lambda: verifier.cancelled.set() if adapter.attempts() else None
        with self.assertRaisesRegex(ValueError, 'annulée'):
            verifier._gui(self.recipe())
        self.assertEqual(len(adapter.attempts()), 1)
        self.assertFalse(adapter.inputs)


if __name__ == '__main__':
    unittest.main()
