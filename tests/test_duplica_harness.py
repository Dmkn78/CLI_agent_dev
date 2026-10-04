"""User-proxy runner regressions with discovered fixture models only."""
import hashlib
import json
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

from server.app import Application
from server.computer import ComputerController
from server.duplica_verification import MissionVerifier
from test_application import FakeCodex
from test_duplica import ObservedComputer
from test_workflow_parallel import mini_tasks


class DuplicaHarnessTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.app = Application(self.root)
        self.core = self.app.duplica
        self.app.provider.update(connected=True, installed=True, models=[{
            'model': 'fixture-duplica', 'displayName': 'Duplica fictif', 'isDefault': True,
            'defaultReasoningEffort': 'medium',
            'supportedReasoningEfforts': [{'reasoningEffort': 'medium'}, {'reasoningEffort': 'max'}]}])
        self.provider = patch('server.app.CodexClient', FakeCodex)
        self.provider.start()
        # Drive supervision ticks explicitly; team execution remains threaded.
        self.supervisor = patch.object(self.core, '_start_worker')
        self.supervisor.start()
        self.core.control('start')
        self.release = threading.Event()

    def tearDown(self):
        self.release.set()
        self.app.shutdown()
        self.supervisor.stop()
        self.provider.stop()
        self.app.store.db.close()
        self.directory.cleanup()

    def changes(self, **overrides):
        return {'projectId': 'atelier', 'goal': 'Valider le harnais avec huit mini-tâches.',
                'model': 'fixture-duplica', 'effort': 'max', 'sandbox': 'read-only',
                'tasks': mini_tasks(8), 'maxTasks': 12, 'maxParallel': 4,
                'maxContinuations': 1, 'continuous': False, 'planMode': False, **overrides}

    def wait_team(self, run):
        for thread in list(self.app.workflow_threads):
            thread.join(timeout=10)
            self.assertFalse(thread.is_alive(), 'Équipe fictive bloquée.')
        return self.app.store.get('workflow', run['workflowId'])

    def observed_run(self, run):
        return next(observed for observed in self.core.runner.snapshot() if observed['id'] == run['id'])

    def wait_verifiers(self):
        for thread in list(self.core.runner.threads):
            thread.join(timeout=10)
            self.assertFalse(thread.is_alive(), 'Vérification fictive bloquée.')

    def full_recipe(self):
        adapter = ObservedComputer(self.app)
        adapter.passed = True
        self.core.computer = ComputerController(adapter, self.core.directory / 'screenshots')
        self.core.configure({'permissions': {'computer_control': 'auto', 'keyboard_mouse': 'auto', 'browser_control': 'auto'}})
        return {'requirements': [{'path': 'feature.txt', 'contains': 'expected'}],
                'tests': [sys.executable, '-c', 'print("independent-runner-tests")'],
                'buildNotApplicable': True,
                'gui': [{'kind': 'open_url', 'url': 'http://127.0.0.1:4329'},
                        {'kind': 'expect', 'text': 'Export réussi'}]}

    def test_work_for_me_creates_observable_team_and_keeps_explicit_effort(self):
        run = self.core.work_on_project(self.changes())
        workflow = self.wait_team(run)
        self.assertEqual(workflow['status'], 'completed', workflow.get('error'))
        self.assertEqual(len([step for step in workflow['steps'] if step['role'] == 'Implémentation']), 8)
        children = [session for session in self.app.store.all('session') if session.get('parentId') == run['workflowId']]
        self.assertTrue(children)
        self.assertTrue(all(child['model'] == 'fixture-duplica' and child['effort'] == 'max' for child in children))
        self.assertTrue(all(child['sandbox'] == 'read-only' for child in children))
        self.assertTrue(any(scope['id'] == 'workflow:' + run['workflowId'] and scope['enabled']
                            for scope in self.app.store.all('duplicaScope')))
        self.assertEqual(self.observed_run(run)['maxParallel'], 4)
        self.assertTrue(any(observed['id'] == run['id'] for observed in self.core.snapshot()['runs']))

    def test_completed_turns_without_recipe_remain_unverified_and_tasks_in_review(self):
        run = self.core.runner.launch(self.changes())
        self.wait_team(run)
        self.core.runner.tick()
        observed = self.observed_run(run)
        self.assertEqual(observed['status'], 'needs_evidence')
        self.assertFalse(any(result.get('passed') for result in self.app.store.all('duplicaVerification')))
        tasks = [self.app.store.get('task', task_id) for task_id in observed['taskIds']]
        self.assertTrue(tasks)
        self.assertTrue(all(task['status'] == 'review' for task in tasks))

    def test_plan_permission_waits_before_any_implementation(self):
        run = self.core.runner.launch(self.changes(tasks=mini_tasks(2), planMode=True))
        # The approval gate is driven by workflow events, not an elapsed-time
        # guess. Its notification is written only after the plan is published.
        emitted = threading.Event()
        original_notify = self.app.notify
        # Existing team may already be at the gate; inspecting status is safe.
        workflow = self.app.store.get('workflow', run['workflowId'])
        if workflow['status'] != 'waiting_plan':
            def notifying(*args, **kwargs):
                result = original_notify(*args, **kwargs)
                if args and args[0] == run['workflowId'] + ':plan':
                    emitted.set()
                return result
            with patch.object(self.app, 'notify', side_effect=notifying):
                if self.app.store.get('workflow', run['workflowId'])['status'] != 'waiting_plan':
                    self.assertTrue(emitted.wait(timeout=5))
        self.core.runner.tick()
        workflow = self.app.store.get('workflow', run['workflowId'])
        self.assertEqual(workflow['status'], 'waiting_plan')
        self.assertFalse(any(step['role'] == 'Implémentation' for step in workflow['steps']))
        self.core.control('stop')

    def test_pause_cancels_all_children_without_silent_replay_on_start(self):
        barrier = threading.Barrier(3, timeout=6)
        started = []
        state_lock = threading.Lock()

        def held_wait(session_id, prompt, schema=None, cancel=None, **kwargs):
            with state_lock:
                started.append(session_id)
            barrier.wait()
            self.assertTrue(self.release.wait(timeout=6))
            self.assertTrue(cancel())
            raise ValueError('Pause du runner fictif.')

        with patch.object(self.app, 'wait_session', side_effect=held_wait):
            run = self.core.runner.launch(self.changes(tasks=mini_tasks(6), maxParallel=2))
            try:
                barrier.wait()
                self.core.control('pause')
            finally:
                self.release.set()
            workflow = self.wait_team(run)
        self.assertEqual(workflow['status'], 'cancelled')
        self.assertIn(self.observed_run(run)['status'], ('paused', 'interrupted'))
        self.assertEqual(len(started), 2)
        children = [session for session in self.app.store.all('session') if session.get('parentId') == run['workflowId']]
        self.assertTrue(all(child['status'] in ('closed', 'stopped') for child in children))
        workflow_count, session_count = len(self.app.store.all('workflow')), len(self.app.store.all('session'))
        self.core.control('start')
        self.core.runner.tick()
        self.assertEqual(len(self.app.store.all('workflow')), workflow_count)
        self.assertEqual(len(self.app.store.all('session')), session_count)

    def test_invalid_limits_models_and_efforts_create_no_work(self):
        for override in ({'maxParallel': 0}, {'maxParallel': 9}, {'maxTasks': 21},
                         {'maxContinuations': 11}, {'model': 'absent'}, {'effort': 'absent'},
                         {'sandbox': 'danger-full-access'}):
            with self.subTest(override=override), self.assertRaises(ValueError):
                self.core.runner.launch(self.changes(**override))
        self.assertFalse(self.core.runner.snapshot())
        self.assertFalse(self.app.store.all('workflow'))
        self.assertFalse(self.app.store.all('session'))
        self.assertFalse(self.app.store.all('task'))

    def test_existing_session_adoption_does_not_create_another_team(self):
        session = self.app.new_session({'projectId': 'atelier', 'name': 'Agent déjà présent',
            'model': 'fixture-duplica', 'effort': 'max', 'sandbox': 'read-only', 'planMode': False})
        result = self.core.work_on_project({'projectId': 'atelier', 'sessionId': session['id'],
                                          'goal': 'Relire la mission existante.'})
        self.assertEqual(result['sessionId'], session['id'])
        self.assertFalse(self.core.runner.snapshot())
        self.assertFalse(self.app.store.all('workflow'))
        self.assertEqual(len(self.app.store.all('session')), 1)

    def test_independent_failure_creates_one_correction_and_passed_retest(self):
        (self.root / 'feature.txt').write_text('broken', encoding='utf-8')
        recipe = self.full_recipe()
        root = self.root

        class CorrectingProvider(FakeCodex):
            def rpc(self, method, params=None, **kwargs):
                if method == 'turn/start':
                    starts = [data for called, data in self.calls if called == 'thread/start']
                    sandbox = starts[-1].get('sandbox') if starts else None
                    text = params['input'][0]['text']
                    if '# BUG ' in text and params.get('outputSchema'):
                        params = dict(params)
                        params.pop('outputSchema', None)
                        # Model output is deterministic and includes the real
                        # failure report. Preserve normal provider events.
                        outcome = json.dumps({'tasks': [{'id': 'repair', 'title': 'Réparer le défaut observé',
                            'prompt': text, 'files': ['feature.txt'], 'dependsOn': []}]})
                        callback = self.callback
                        def planned(event):
                            if event.get('method') == 'item/agentMessage/delta':
                                event['params']['delta'] = outcome
                            elif event.get('method') == 'item/completed':
                                event['params']['item']['text'] = outcome
                            callback(event)
                        self.callback = planned
                        try:
                            return super().rpc(method, params, **kwargs)
                        finally:
                            self.callback = callback
                    # Fixture repair happens only in the authorized writer,
                    # after the independent failure report reaches that turn.
                    if sandbox == 'workspace-write' and '# BUG ' in text:
                        (root / 'feature.txt').write_text('expected', encoding='utf-8')
                return super().rpc(method, params, **kwargs)

        with patch('server.app.CodexClient', CorrectingProvider):
            run = self.core.runner.launch(self.changes(tasks=mini_tasks(2), sandbox='workspace-write', recipe=recipe))
            self.wait_team(run)
            self.core.runner.tick()
            self.wait_verifiers()
            correcting = self.observed_run(run)
            self.assertEqual(correcting['continuations'], 1)
            self.assertEqual(len(correcting['workflowIds']), 2)
            self.wait_team(correcting)
            self.core.runner.tick()
            self.wait_verifiers()
        completed = self.observed_run(run)
        self.assertEqual(completed['status'], 'completed', completed.get('reason'))
        self.assertEqual(completed['validation'], 'VERIFIED')
        results = [result for result in self.app.store.all('duplicaVerification') if result['missionId'] == run['id']]
        self.assertEqual([result['passed'] for result in results], [False, True])
        for result in results:
            command = next(check for check in result['checks'] if check['stage'] == 'tests')
            self.assertEqual(command['exitCode'], 0)
            self.assertIn('independent-runner-tests', command['output'])
            artifact = result['artifact']
            self.assertEqual(hashlib.sha256(Path(artifact['path']).read_bytes()).hexdigest(), artifact['sha256'])
        bugs = [bug for bug in self.app.store.all('duplicaObservation') if bug['missionId'] == run['id']]
        self.assertEqual(len(bugs), 1)
        self.assertEqual(bugs[0]['status'], 'resolved')
        self.assertEqual(bugs[0]['retestId'], results[-1]['id'])
        self.assertEqual(self.app.store.get('task', completed['activeTaskId'])['status'], 'review')

    def test_failed_independent_recipe_stops_at_correction_budget(self):
        (self.root / 'feature.txt').write_text('broken', encoding='utf-8')
        run = self.core.runner.launch(self.changes(tasks=mini_tasks(1), recipe=self.full_recipe(), maxContinuations=0))
        self.wait_team(run)
        self.core.runner.tick()
        self.wait_verifiers()
        failed = self.observed_run(run)
        self.assertEqual(failed['status'], 'waiting_user')
        self.assertEqual(failed['continuations'], 0)
        self.assertEqual(len(failed['workflowIds']), 1)
        self.assertEqual(len(self.app.store.all('duplicaVerification')), 1)
        self.assertFalse(self.app.store.all('duplicaVerification')[0]['passed'])

    def test_continuous_backlog_processes_new_tasks_and_waits_without_phantom_work(self):
        (self.root / 'feature.txt').write_text('expected', encoding='utf-8')
        first = self.app.upsert('task', {'title': 'Premier TODO', 'description': 'Relire les preuves.'})
        run = self.core.runner.launch(self.changes(goal='', tasks=None, continuous=True, recipe=self.full_recipe()))
        self.wait_team(run)
        self.core.runner.tick()
        self.wait_verifiers()
        self.assertEqual(self.observed_run(run)['status'], 'waiting_tasks')
        before = len(self.app.store.all('workflow'))
        self.core.runner.tick()
        self.assertEqual(len(self.app.store.all('workflow')), before)
        second = self.app.upsert('task', {'title': 'Nouveau TODO', 'description': 'Relire un autre résultat.'})
        self.core.runner.tick()
        following = self.observed_run(run)
        self.wait_team(following)
        self.core.runner.tick()
        self.wait_verifiers()
        final = self.observed_run(run)
        self.assertEqual(final['status'], 'waiting_tasks')
        self.assertEqual(final['taskIds'], [first['id'], second['id']])
        self.assertEqual(len(final['workflowIds']), 2)
        self.assertTrue(all(self.app.store.get('task', task_id)['status'] == 'review' for task_id in final['taskIds']))

    def test_explicit_recipe_resume_verifies_same_team_with_initial_configuration(self):
        (self.root / 'feature.txt').write_text('expected', encoding='utf-8')
        run = self.core.runner.launch(self.changes(tasks=mini_tasks(2)))
        self.wait_team(run)
        self.core.runner.tick()
        self.assertEqual(self.observed_run(run)['status'], 'needs_evidence')
        workflows, sessions = len(self.app.store.all('workflow')), len(self.app.store.all('session'))
        recipe = {'requirements': [{'path': 'feature.txt', 'contains': 'expected'}],
                  'tests': [sys.executable, '-c', 'print("headless-independent-tests")'],
                  'buildNotApplicable': True, 'guiNotApplicable': True}
        resumed = self.core.work_on_project({'projectId': 'atelier', 'resumeRunId': run['id'],
            'model': 'attempted-change', 'effort': 'medium', 'sandbox': 'workspace-write', 'recipe': recipe})
        self.assertEqual(resumed['id'], run['id'])
        self.assertEqual(resumed['model'], 'fixture-duplica')
        self.assertEqual(resumed['effort'], 'max')
        self.assertEqual(resumed['sandbox'], 'read-only')
        self.core.runner.tick()
        self.wait_verifiers()
        completed = self.observed_run(run)
        self.assertEqual(completed['status'], 'completed', completed.get('reason'))
        self.assertEqual(len(self.app.store.all('workflow')), workflows)
        self.assertEqual(len(self.app.store.all('session')), sessions)
        result = self.app.store.all('duplicaVerification')[-1]
        self.assertTrue(result['passed'])
        self.assertEqual(next(check for check in result['checks'] if check['stage'] == 'gui')['status'], 'pass')
        self.assertFalse(any(event['type'] == 'duplica.computer_action' for event in self.core.snapshot()['timeline']))

    def test_disabled_workflow_scope_stops_continuous_backlog_dispatch(self):
        (self.root / 'feature.txt').write_text('expected', encoding='utf-8')
        self.app.upsert('task', {'title': 'Premier TODO supervisé', 'description': 'Relire les preuves.'})
        run = self.core.runner.launch(self.changes(goal='', tasks=None, continuous=True, recipe=self.full_recipe()))
        self.wait_team(run)
        self.core.runner.tick()
        self.wait_verifiers()
        self.assertEqual(self.observed_run(run)['status'], 'waiting_tasks')
        self.core.set_scope('workflow', run['workflowId'], False)
        pending = self.app.upsert('task', {'title': 'TODO après retrait de portée'})
        self.core.runner.tick()
        self.assertEqual(self.observed_run(run)['status'], 'interrupted')
        self.assertEqual(len(self.app.store.all('workflow')), 1)
        self.assertEqual(self.app.store.get('task', pending['id'])['status'], 'todo')
        self.core.control('start')
        self.core.runner.tick()
        self.assertEqual(len(self.app.store.all('workflow')), 1)

    def test_old_permission_request_cannot_grant_a_redefined_recipe(self):
        (self.root / 'feature.txt').write_text('expected', encoding='utf-8')
        recipe = self.full_recipe()
        recipe['build'] = [sys.executable, '-c', 'print("fixture-build")']
        self.core.configure({'permissions': {'run_tests': 'ask', 'run_build': 'ask'}})
        run = self.core.runner.launch(self.changes(tasks=mini_tasks(1), recipe=recipe))
        self.wait_team(run)
        self.core.runner.tick()
        requests = [request for request in self.app.store.all('duplicaRequest') if request['detail'].get('runId') == run['id']]
        self.assertEqual(len(requests), 2)
        rejected = next(request for request in requests if request['detail']['category'] == 'run_tests')
        stale = next(request for request in requests if request['detail']['category'] == 'run_build')
        self.core.resolve_request(rejected['id'], accepted=False)
        revised = {**recipe, 'requirements': [{'path': 'feature.txt', 'contains': 'new criterion'}]}
        resumed = self.core.runner.launch({'projectId': 'atelier', 'resumeRunId': run['id'], 'recipe': revised})
        self.assertNotEqual(resumed['configurationId'], run['configurationId'])
        self.core.runner.tick()
        with self.assertRaises(ValueError):
            self.core.resolve_request(stale['id'], accepted=True)
        self.assertEqual(self.observed_run(run)['grants'], [])
        self.assertEqual(self.app.store.get('duplicaRequest', stale['id'])['status'], 'expired')
        current_requests = [request for request in self.app.store.all('duplicaRequest')
                            if request['status'] == 'pending' and request['detail'].get('runId') == run['id']]
        refused = next(request for request in current_requests if request['detail']['category'] == 'run_tests')
        stale_again = next(request for request in current_requests if request['detail']['category'] == 'run_build')
        self.core.resolve_request(refused['id'], accepted=False)
        resumed_again = self.core.runner.launch({'projectId': 'atelier', 'resumeRunId': run['id'], 'recipe': revised})
        self.assertEqual(resumed_again['configurationId'], resumed['configurationId'])
        self.core.runner.tick()
        with self.assertRaises(ValueError):
            self.core.resolve_request(stale_again['id'], accepted=True)
        self.assertEqual(self.observed_run(run)['grants'], [])
        self.assertEqual(self.app.store.get('duplicaRequest', stale_again['id'])['status'], 'expired')

    def test_independent_verification_reserves_workspace_against_next_todo(self):
        (self.root / 'feature.txt').write_text('expected', encoding='utf-8')
        recipe = {'requirements': [{'path': 'feature.txt', 'contains': 'expected'}],
                  'tests': [sys.executable, '-c', 'print("lease-tests")'],
                  'buildNotApplicable': True, 'guiNotApplicable': True}
        run = self.core.runner.launch(self.changes(tasks=mini_tasks(2), recipe=recipe))
        self.wait_team(run)
        entered = threading.Event()
        original = MissionVerifier.verify

        def held_verification(verifier, mission, session):
            entered.set()
            self.assertTrue(self.release.wait(timeout=6))
            return original(verifier, mission, session)

        with patch.object(MissionVerifier, 'verify', autospec=True, side_effect=held_verification):
            self.core.runner.tick()
            try:
                self.assertTrue(entered.wait(timeout=6))
                pending = self.app.upsert('task', {'title': 'TODO concurrent après fin technique'})
                self.assertIsNone(self.app.task_queue.claim('atelier', 'other-fixture', pending['id']))
                active = self.app.store.get('task', run['activeTaskId'])
                self.assertEqual(active['claimedBy'], run['id'])
            finally:
                self.release.set()
            self.wait_verifiers()
        self.assertEqual(self.observed_run(run)['status'], 'completed')
        self.assertIsNone(self.app.store.get('task', run['activeTaskId'])['claimedBy'])
        claimed = self.app.task_queue.claim('atelier', 'other-fixture', pending['id'])
        self.assertEqual(claimed['id'], pending['id'])
        self.app.task_queue.finish(pending['id'], 'other-fixture', False)


if __name__ == '__main__':
    unittest.main()
