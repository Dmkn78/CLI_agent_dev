import hashlib
import json
import os
import sys
import tempfile
import threading
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from server.app import Application
from server.computer import ComputerController, DesktopBridge, ObservationChanged
from server.duplica_policy import DEFAULT_PERMISSIONS, classify_command, known_answer, project_path, validate_permissions
from server.duplica_telegram import TelegramRelay
from server.duplica_verification import validate_recipe
from test_application import FakeCodex


class ObservedComputer:
    """Fixture for core tests only. Real window input is tested in duplica_acceptance.cjs."""
    def __init__(self, app):
        self.app, self.calls, self.counter = app, [], 0
        self.passed, self.cancelled = False, False

    def available(self):
        return True

    def cancel(self):
        self.cancelled = True

    def request(self, operation, target, payload):
        self.counter += 1
        self.calls.append((operation, target, payload))
        if operation == 'act' and payload['action']['kind'] == 'click' and payload['action'].get('index') == 5:
            approval = self.app.store.all('approval')[0]
            self.app.approve(approval['id'], 'accept')
        return {'observationId': str(self.counter), 'target': 'local-browser' if payload.get('action', {}).get('kind') == 'open_url' else target,
                'text': 'Export réussi' if self.passed else 'Export cassé',
                'controls': [{'index': 2, 'label': 'Exporter', 'enabled': True},
                             {'index': 5, 'label': 'Autoriser', 'enabled': True,
                              'approvalId': self.app.store.all('approval')[0]['id'] if self.app.store.all('approval') else None, 'decision': 'accept'}]}


class DuplicaTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.app = Application(self.root)
        self.patch = patch('server.app.CodexClient', FakeCodex)
        self.patch.start()
        self.core = self.app.duplica
        self.app.store.update('duplicaSettings', 'global', status='active', interactionMode='backend')

    def tearDown(self):
        self.app.shutdown()
        self.patch.stop()
        self.app.store.db.close()
        self.temporary.cleanup()

    def session(self, **overrides):
        session = self.app.new_session({'model': 'fixture', 'name': 'Duplica fixture', 'planMode': False,
                                      'sandbox': 'workspace-write', 'duplicaEnabled': True, **overrides}, start=False)
        self.app.start_session(session['id'])
        return self.app.store.get('session', session['id'])

    def approval(self, session, method='item/commandExecution/requestApproval', **params):
        request_id = len(self.app.store.all('approval')) + 100
        self.app.on_event(session['id'], {'id': request_id, 'method': method, 'params': params})
        return self.app.store.all('approval')[-1]

    def mission(self, session, **changes):
        (self.root / 'feature.txt').write_text('expected', encoding='utf-8')
        recipe = {'requirements': [{'path': 'feature.txt', 'contains': 'expected'}], 'tests': [sys.executable, '-c', 'print("independent-tests")'],
                  'buildNotApplicable': True, 'gui': [{'kind': 'open_url', 'url': 'http://127.0.0.1:4329'},
                                                   {'kind': 'click', 'label': 'Exporter'}, {'kind': 'expect', 'text': 'Export réussi'}]}
        return self.core.save_mission({'sessionId': session['id'], 'goal': 'Export observable', 'recipe': recipe, **changes})

    def attach_computer(self):
        adapter = ObservedComputer(self.app)
        self.core.computer = ComputerController(adapter, self.core.directory / 'screenshots')
        self.core.verifier.computer = self.core.computer
        self.core.bridge.last_seen = time.monotonic()
        self.core.configure({'permissions': {'computer_control': 'auto', 'keyboard_mouse': 'auto', 'browser_control': 'auto'}})
        return adapter

    def test_supervision_is_off_initially_and_requires_explicit_scopes(self):
        self.assertFalse(self.core.settings()['globalEnabled'])
        session = self.session(duplicaEnabled=None)
        self.assertFalse(self.core.supervised(session))
        self.core.set_scope('project', 'atelier', True)
        self.assertTrue(self.core.supervised(session))
        self.core.set_scope('session', session['id'], False)
        self.assertFalse(self.core.supervised(session))
        self.core.control('take_control')
        self.core.set_scope('session', session['id'], True)
        self.assertFalse(self.core.supervised(session))

    def test_scope_never_recruits_benchmark_children(self):
        self.app.store.put('benchmark', {'id': 'bench', 'status': 'completed'})
        session = self.session(parentId='bench')
        self.assertFalse(self.core.supervised(session))

    def test_permissions_preserve_scope_and_do_not_classify_compound_commands(self):
        self.assertEqual(classify_command('npm test'), 'run_tests')
        for command in ('npm test; git push', 'npm test && rm -rf /', 'npm test\ncat .env', 'python -c "print(1)"', 'git diff --output=.env'):
            self.assertEqual(classify_command(command), 'unknown')
        for permission in ('git_push', 'payment', 'read_secrets', 'unknown'):
            with self.assertRaises(ValueError):
                validate_permissions({permission: 'auto'})
        with self.assertRaises(ValueError):
            validate_permissions({'destructive_system_operation': 'ask'})
        with self.assertRaises(ValueError):
            self.core.set_scope('project', 'atelier', 'true')

    def test_known_permission_is_approved_once_and_audited(self):
        session = self.session()
        approval = self.approval(session, command='npm test', cwd=str(self.root))
        self.core.tick()
        self.core.tick()
        self.assertEqual(self.app.clients[session['id']].answers, [(approval['requestId'], {'decision': 'accept'})])
        event = next(event for event in self.core.snapshot()['timeline'] if event['type'] == 'duplica.permission_resolved')
        self.assertEqual(event['data']['verdict']['source'], 'permissions:run_tests')
        self.assertTrue((self.core.directory / 'state/EVENTS.jsonl').is_file())

    def test_unknown_and_sensitive_permissions_wait_without_spam(self):
        session = self.session()
        self.approval(session, command='git push')
        self.core.tick()
        self.core.tick()
        self.assertEqual(len(self.app.store.all('duplicaRequest')), 1)
        self.assertFalse(self.app.clients[session['id']].answers)

    def test_permission_for_another_workspace_is_not_approved(self):
        session = self.session()
        self.approval(session, command='npm test', cwd=str(self.root.parent))
        self.core.tick()
        self.assertFalse(self.app.clients[session['id']].answers)

    def test_read_only_and_plan_profiles_cannot_autoapprove_writes(self):
        for session in (self.session(sandbox='read-only'), self.session(planMode=True)):
            self.core.configure({'permissions': {'workspace_write': 'auto'}})
            self.approval(session, method='item/fileChange/requestApproval', changes={'feature.py': {'type': 'add'}})
            self.core.tick()
            self.assertEqual(self.app.clients[session['id']].answers[-1][1], {'decision': 'decline'})

    def test_question_is_answered_from_explicit_memory_only(self):
        session = self.session()
        decision = self.core.save_decision({'projectId': 'atelier', 'questions': ['Quel format utiliser ?'], 'answer': 'CSV'})
        approval = self.approval(session, method='item/tool/requestUserInput', questions=[{'id': 'format', 'question': 'Quel format utiliser ?'}])
        self.core.tick()
        self.assertEqual(self.app.clients[session['id']].answers[-1], (approval['requestId'], {'answers': {'format': {'answers': ['CSV']}}}))
        event = next(event for event in self.core.snapshot()['timeline'] if event['type'] == 'duplica.question_answered')
        self.assertIn(decision['id'], event['data']['verdict']['source'])
        self.assertIn('CSV', (self.core.directory / 'projects/atelier/context/DECISIONS.md').read_text(encoding='utf-8'))

    def test_contradictions_and_other_projects_cannot_supply_answers(self):
        decisions = [{'id': 'a', 'questions': ['Question ?'], 'answer': 'A', 'projectId': 'one'},
                     {'id': 'b', 'questions': ['Question ?'], 'answer': 'B', 'projectId': 'one'}]
        self.assertEqual(known_answer('Question ?', decisions, 'one'), (None, []))
        self.assertEqual(known_answer('Question ?', decisions, 'two'), (None, []))
        self.assertEqual(known_answer('Une autre question ?', decisions[:1], 'one'), (None, []))

    def test_global_and_local_context_survive_restart_without_replaying_actions(self):
        session = self.session()
        self.core.save_context({'user': 'Priorité lisibilité', 'preferences': 'Tests avant livraison'})
        self.core.save_context({'projectId': 'atelier', 'project': 'Ne pas modifier l’authentification'})
        self.core.save_decision({'questions': ['Framework ?'], 'answer': 'Pas de Firebase'})
        self.mission(session)
        self.app.shutdown()
        recovered = Application(self.root)
        try:
            self.assertEqual(recovered.duplica.settings()['status'], 'paused')
            self.assertEqual(recovered.store.all('duplicaMission')[0]['status'], 'interrupted')
            self.assertFalse(recovered.clients)
            self.assertEqual(len(recovered.store.all('duplicaContext')), 2)
            self.assertEqual(recovered.store.all('duplicaDecision')[0]['answer'], 'Pas de Firebase')
        finally:
            recovered.shutdown()
            recovered.store.db.close()

    def test_done_without_independent_checks_never_completes_mission(self):
        session = self.session()
        mission = self.core.save_mission({'sessionId': session['id'], 'goal': 'Une feature', 'recipe': {}})
        self.app.prompt(session['id'], 'done')
        self.core.tick()
        self.assertEqual(self.app.store.get('duplicaMission', mission['id'])['status'], 'needs_evidence')
        self.assertFalse(self.app.store.all('duplicaVerification')[0]['passed'])

    def test_inaccessible_proof_does_not_trigger_code_corrections(self):
        session = self.session()
        mission = self.mission(session)
        self.attach_computer()
        self.app.prompt(session['id'], 'Implémente.')
        with patch.object(self.core.verifier, '_requirements', side_effect=PermissionError('Accès au fichier de recette refusé.')):
            self.core.tick()
        self.assertEqual(self.app.store.get('duplicaMission', mission['id'])['status'], 'needs_evidence')
        self.assertEqual(self.app.clients[session['id']].turn_count, 1)
        self.assertFalse(self.app.store.all('duplicaObservation'))
        self.assertEqual(self.app.store.all('duplicaVerification')[0]['checks'][0]['status'], 'not_run')

    def test_new_criteria_do_not_turn_an_old_failure_into_a_fix(self):
        session = self.session()
        mission = self.mission(session, maxContinuations=0)
        adapter = self.attach_computer()
        adapter.request = lambda operation, target, payload: {'observationId': str(time.monotonic()), 'target': target, 'text': 'broken', 'controls': []}
        self.app.prompt(session['id'], 'Implémente.')
        self.core.tick()
        updated = self.core.save_mission({'sessionId': session['id'], 'goal': 'Objectif redéfini', 'recipe': mission['recipe']})
        self.assertNotEqual(updated['configurationId'], mission['configurationId'])
        self.assertEqual(self.app.store.all('duplicaObservation')[0]['status'], 'superseded')
        self.assertNotIn('retestId', self.app.store.all('duplicaObservation')[0])

    def test_late_verification_cannot_complete_redefined_mission(self):
        session = self.session()
        mission = self.mission(session)
        self.attach_computer()
        def reconfigure(original, observed):
            self.core.save_mission({'sessionId': session['id'], 'goal': 'Nouvel objectif', 'recipe': mission['recipe']})
            return {'id': 'old-result', 'missionId': mission['id'], 'configurationId': original['configurationId'], 'passed': True,
                    'checks': [], 'cancelled': False}
        with patch.object(self.core.verifier, 'verify', side_effect=reconfigure):
            self.core.verify_mission(mission['id'])
        current = self.app.store.get('duplicaMission', mission['id'])
        self.assertEqual(current['status'], 'supervising')
        self.assertEqual(current['goal'], 'Nouvel objectif')
        self.assertTrue(self.app.store.all('duplicaVerification'))

    def test_real_test_process_and_observed_ui_gate_completion_and_retest(self):
        session = self.session()
        mission = self.mission(session)
        adapter = self.attach_computer()
        adapter.passed = True
        self.app.prompt(session['id'], 'Implémente.')
        self.core.tick()
        completed = self.app.store.get('duplicaMission', mission['id'])
        self.assertEqual(completed['status'], 'completed')
        verification = self.app.store.all('duplicaVerification')[0]
        checks = verification['checks']
        self.assertEqual(next(check for check in checks if check['stage'] == 'tests')['exitCode'], 0)
        self.assertIn('independent-tests', next(check for check in checks if check['stage'] == 'tests')['output'])
        artifacts = [verification['artifact']] + [check['artifact'] for check in checks if 'artifact' in check]
        for artifact in artifacts:
            with self.subTest(artifact=artifact['path']):
                self.assertEqual(hashlib.sha256(Path(artifact['path']).read_bytes()).hexdigest(), artifact['sha256'])
        self.assertTrue(any(operation == 'act' for operation, _, _ in adapter.calls))
        count = len(adapter.calls)
        self.core.tick()
        self.assertEqual(len(adapter.calls), count)

    def test_failure_is_reported_and_continuation_is_bounded(self):
        session = self.session()
        mission = self.mission(session, maxContinuations=1)
        adapter = self.attach_computer()
        # Avoid waiting five seconds for each negative expected-text check in this core test.
        adapter.request = lambda operation, target, payload: {'observationId': str(time.monotonic()), 'target': target, 'text': 'broken', 'controls': []}
        self.app.prompt(session['id'], 'Implémente.')
        self.core.tick()
        current = self.app.store.get('duplicaMission', mission['id'])
        self.assertEqual(current['continuations'], 1)
        self.assertEqual(current['status'], 'correcting')
        self.core.tick()
        self.assertEqual(self.app.store.get('duplicaMission', mission['id'])['status'], 'waiting_user')
        self.assertEqual(self.app.clients[session['id']].turn_count, 2)
        self.assertTrue((self.core.directory / 'observations/BUGS.md').is_file())
        self.assertIn('Contrôle absent', self.app.store.all('duplicaObservation')[0]['report'].replace('Contrôle absent ou ambigu.', 'Contrôle absent'))

    def test_gui_permission_uses_observed_click_without_backend_fallback(self):
        session = self.session()
        self.attach_computer()
        self.core.configure({'interactionMode': 'computer'})
        self.approval(session, command='npm test')
        self.core.tick()
        event = next(event for event in self.core.snapshot()['timeline'] if event['type'] == 'duplica.permission_resolved')
        self.assertEqual(event['data']['channel'], 'computer')

    def test_observations_are_single_use(self):
        adapter = ObservedComputer(self.app)
        computer = ComputerController(adapter, self.core.directory / 'screenshots')
        observation = computer.observe()
        computer.act(observation['id'], {'kind': 'click', 'index': 2})
        with self.assertRaises(ValueError):
            computer.act(observation['id'], {'kind': 'click', 'index': 2})

    def test_computer_audit_records_confirmed_action_with_observation(self):
        entries = []
        adapter = ObservedComputer(self.app)
        computer = ComputerController(adapter, self.core.directory / 'screenshots', entries.append)
        observation = computer.observe()
        computer.act(observation['id'], {'kind': 'click', 'index': 2})
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]['snapshotId'], observation['id'])
        self.assertEqual(entries[0]['source'], 'computer:observed-action')
        with self.assertRaises(ValueError):
            computer.act(observation['id'], {'kind': 'click', 'index': 2})
        self.assertEqual(len(entries), 1)

    def test_pre_input_rejection_reobserves_once_but_unknown_outcome_is_not_replayed(self):
        session = self.session()
        adapter = self.attach_computer()
        self.core.configure({'interactionMode': 'computer'})
        self.approval(session, command='npm test')
        original = adapter.request
        actions = []
        def reject_first(operation, target, payload):
            if operation == 'act':
                actions.append(payload)
                if len(actions) == 1:
                    raise ObservationChanged('Validation avant clic : contrôle déplacé.')
            return original(operation, target, payload)
        adapter.request = reject_first
        self.core.tick()
        self.assertEqual(len(actions), 2)
        self.assertEqual(len(self.app.clients[session['id']].answers), 1)
        self.approval(session, command='npm test')
        actions.clear()
        def unknown_outcome(operation, target, payload):
            if operation == 'act':
                actions.append(payload)
                raise ValueError('Résultat du clic inconnu.')
            return original(operation, target, payload)
        adapter.request = unknown_outcome
        self.core.tick()
        self.core.tick()
        self.assertEqual(len(actions), 1)
        self.assertEqual(len(self.app.clients[session['id']].answers), 1)

    def test_initial_objective_is_sent_once_from_user_mission_and_saved_context(self):
        session = self.session()
        self.core.save_context({'projectId': 'atelier', 'project': 'Garder l’authentification intacte'})
        self.core.save_mission({'sessionId': session['id'], 'goal': 'Mission explicite', 'recipe': {}, 'autoVerify': False, 'startMission': True})
        self.core.tick()
        self.core.tick()
        self.assertEqual(self.app.clients[session['id']].turn_count, 1)
        submitted = self.app.store.get('session', session['id'])['messages'][0]['text']
        self.assertIn('Mission explicite', submitted)
        self.assertIn('authentification intacte', submitted)

    def test_pause_cancels_leased_pc_action_and_rejects_late_result(self):
        bridge = DesktopBridge()
        bridge.poll()
        errors = []
        def run():
            try:
                bridge.request('act', 'platform', {'action': {'kind': 'click'}})
            except ValueError as error:
                errors.append(str(error))
        worker = threading.Thread(target=run)
        worker.start()
        deadline = time.monotonic() + 2
        job = None
        while not job and time.monotonic() < deadline:
            job = bridge.poll()['job']
            time.sleep(0.01)
        self.assertTrue(job)
        bridge.cancel()
        self.assertFalse(bridge.check(job['id'], job['generation'])['allowed'])
        bridge.complete(job['id'], {'observationId': 'late'})
        worker.join(timeout=2)
        self.assertFalse(worker.is_alive())
        self.assertIn('annulée', errors[0])

    def test_watchdog_reports_silence_once_without_restarting(self):
        session = self.session()
        self.app.store.update('session', session['id'], status='running', lastActivityAt=(datetime.now(timezone.utc)-timedelta(minutes=5)).isoformat())
        before = len(self.app.clients[session['id']].calls)
        self.core.tick()
        self.core.tick()
        self.assertEqual(len(self.app.store.all('duplicaRequest')), 1)
        self.assertEqual(len(self.app.clients[session['id']].calls), before)

    def test_recipes_reject_remote_browser_shells_and_private_paths(self):
        for recipe in ({'gui': [{'kind': 'open_url', 'url': 'https://example.com'}]},
                       {'tests': ['powershell.exe', '-Command', 'echo anything']},
                       {'requirements': [{'path': '../escape'}]}, {'requirements': [{'path': '.env'}]}):
            with self.assertRaises(ValueError):
                validate_recipe(recipe, str(self.root))

    def test_telegram_is_opt_in_and_rejects_unauthorized_chat_and_replay(self):
        calls = []
        relay = TelegramRelay(self.core, lambda method, payload: calls.append((method, payload)) or {})
        with patch.dict(os.environ, {'DUPLICA_TELEGRAM_CHAT_ID': '42', 'DUPLICA_TELEGRAM_BOT_TOKEN': 'fixture'}):
            self.assertFalse(relay.status()['enabled'])
            foreign = {'message': {'chat': {'type': 'private', 'id': 43}, 'from': {'id': 43}, 'text': '/stop'}}
            self.assertEqual(relay.handle_update(foreign), 'ignored')
            self.assertEqual(self.core.settings()['status'], 'active')
            session = self.session()
            self.approval(session, command='git push')
            self.core.tick()
            request = self.app.store.all('duplicaRequest')[0]
            update = {'message': {'chat': {'type': 'private', 'id': 42}, 'from': {'id': 42}, 'text': '/approve ' + request['id']}}
            self.assertIn('uniquement', relay.handle_update(update))
            with self.assertRaises(ValueError):
                relay.handle_update(update)
            self.assertEqual(self.core.settings()['permissions']['git_push'], 'ask')
            self.assertFalse(calls)


if __name__ == '__main__':
    unittest.main()
