"""Deterministic team scheduling: no credentials, real models, or timing claims."""
import threading
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server.app import Application
from server.workflow_runtime import next_batch, normalize_tasks
from test_application import FakeCodex


def mini_tasks(count):
    return [{'id': 'mini_' + str(index), 'title': 'Mini-tâche ' + str(index),
             'prompt': 'Réponds ok pour la mini-tâche ' + str(index),
             'files': ['mini/task_' + str(index) + '.txt'], 'dependsOn': []}
            for index in range(count)]


class TaskPlanTests(unittest.TestCase):
    def test_ready_batch_respects_dependencies_and_declared_write_conflicts(self):
        plan = mini_tasks(4)
        plan[1]['files'] = plan[0]['files']
        plan[3]['dependsOn'] = [plan[0]['id']]
        tasks = normalize_tasks(plan)
        self.assertEqual([task['id'] for task in next_batch(tasks, set(), 4, True)], ['mini_0', 'mini_2'])
        self.assertEqual([task['id'] for task in next_batch(tasks, {'mini_0', 'mini_2'}, 4, True)], ['mini_1', 'mini_3'])
        self.assertEqual(len(next_batch(tasks, set(), 4, False)), 3)

    def test_unknown_write_scope_serializes_and_parent_directories_conflict(self):
        plan = mini_tasks(3)
        plan[0]['files'] = []
        tasks = normalize_tasks(plan)
        self.assertEqual(len(next_batch(tasks, set(), 3, True)), 1)
        plan[0]['files'], plan[1]['files'] = ['web'], ['web/app.js']
        tasks = normalize_tasks(plan)
        batch = next_batch(tasks, set(), 3, True)
        self.assertEqual([task['id'] for task in batch], ['mini_0', 'mini_2'])

    def test_invalid_plan_never_reaches_an_agent(self):
        for invalid in (
            [dict(mini_tasks(1)[0], dependsOn=['absent'])],
            [dict(mini_tasks(1)[0], dependsOn=['mini_0'])],
            [dict(mini_tasks(2)[0], dependsOn=['mini_1']), dict(mini_tasks(2)[1], dependsOn=['mini_0'])],
            [mini_tasks(1)[0], mini_tasks(1)[0]],
            [dict(mini_tasks(1)[0], files=['../outside'])],
            [dict(mini_tasks(1)[0], files=['.env.local'])],
            [dict(mini_tasks(1)[0], files=['.atelier/private.json'])],
        ):
            with self.subTest(plan=invalid), self.assertRaises(ValueError):
                normalize_tasks(invalid)

    def test_zero_based_dependency_indices_are_resolved_to_unique_ids(self):
        plan = mini_tasks(3)
        plan[2]['dependsOn'] = [0, 1, 0]
        tasks = normalize_tasks(plan)
        self.assertEqual(tasks[2]['dependsOn'], ['mini_0', 'mini_1'])


class WorkflowParallelTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.app = Application(Path(self.directory.name))
        self.provider = patch('server.app.CodexClient', FakeCodex)
        self.provider.start()
        self.release = threading.Event()

    def tearDown(self):
        self.release.set()
        self.app.shutdown()
        self.provider.stop()
        self.app.store.db.close()
        self.directory.cleanup()

    def launch(self, tasks, workers=4, **overrides):
        return self.app.workflow({'mode': 'orchestration', 'name': 'Harnais fictif parallèle',
            'model': 'fixture', 'effort': 'medium', 'mission': 'Mini-tâches de validation du runner.',
            'sandbox': 'workspace-write', 'planMode': False, 'tasks': tasks, 'maxTasks': 20,
            'agents': {'workers': [{'name': 'Fixture ' + str(index)} for index in range(workers)],
                       'reviewer': None, 'synthesizer': None}, **overrides})

    def finish(self, flow):
        for thread in list(self.app.workflow_threads):
            thread.join(timeout=12)
            self.assertFalse(thread.is_alive(), 'Un workflow reste bloqué après le test fictif.')
        return self.app.store.get('workflow', flow['id'])

    def test_eight_mini_tasks_run_in_two_concurrent_batches_of_four(self):
        barrier = threading.Barrier(4, timeout=6)
        state_lock = threading.Lock()
        active, peak, entered = 0, 0, []
        original = self.app.wait_session

        def controlled_wait(session_id, *args, **kwargs):
            nonlocal active, peak
            with state_lock:
                active += 1
                peak = max(peak, active)
                entered.append(session_id)
            try:
                # A sequential scheduler cannot cross this barrier. No elapsed
                # duration is used as evidence that agents ran concurrently.
                barrier.wait()
                return original(session_id, *args, **kwargs)
            finally:
                with state_lock:
                    active -= 1

        with patch.object(self.app, 'wait_session', side_effect=controlled_wait):
            flow = self.launch(mini_tasks(8))
            completed = self.finish(flow)
        self.assertEqual(completed['status'], 'completed', completed.get('error'))
        self.assertEqual(peak, 4)
        self.assertEqual(len(set(entered)), 8)
        self.assertEqual(len(completed['steps']), 8)
        self.assertTrue(all(step['status'] == 'completed' for step in completed['steps']))
        children = [self.app.store.get('session', step['sessionId']) for step in completed['steps']]
        self.assertTrue(all(child['parentId'] == flow['id'] and child['status'] == 'closed' for child in children))
        self.assertTrue(all(step['handoff']['validation'] == 'UNVERIFIED' for step in completed['steps']))

    def test_dependent_task_waits_for_both_independent_parents(self):
        plan = mini_tasks(3)
        plan[2]['dependsOn'] = ['mini_0', 'mini_1']
        barrier = threading.Barrier(2, timeout=6)
        completed_parents = set()
        state_lock = threading.Lock()
        original = self.app.wait_session

        def controlled_wait(session_id, prompt, *args, **kwargs):
            if 'mini-tâche 2' in prompt:
                with state_lock:
                    self.assertEqual(completed_parents, {0, 1})
            else:
                barrier.wait()
            output = original(session_id, prompt, *args, **kwargs)
            for index in (0, 1):
                if 'mini-tâche ' + str(index) in prompt:
                    with state_lock:
                        completed_parents.add(index)
            return output

        with patch.object(self.app, 'wait_session', side_effect=controlled_wait):
            flow = self.launch(plan, workers=2)
            completed = self.finish(flow)
        self.assertEqual(completed['status'], 'completed', completed.get('error'))
        self.assertEqual(len(completed['steps']), 3)

    def test_cancellation_stops_the_batch_and_never_dispatches_pending_tasks(self):
        barrier = threading.Barrier(3, timeout=6)
        started = []
        state_lock = threading.Lock()

        def controlled_wait(session_id, prompt, schema=None, cancel=None, **kwargs):
            with state_lock:
                started.append(session_id)
            barrier.wait()
            self.assertTrue(self.release.wait(timeout=6))
            self.assertTrue(cancel())
            raise ValueError('Workflow annulé par le test.')

        with patch.object(self.app, 'wait_session', side_effect=controlled_wait):
            flow = self.launch(mini_tasks(6), workers=2)
            try:
                barrier.wait()
                self.app.store.update('workflow', flow['id'], status='cancelled')
            finally:
                self.release.set()
            cancelled = self.finish(flow)
        self.assertEqual(cancelled['status'], 'cancelled')
        self.assertEqual(len(started), 2)
        children = [session for session in self.app.store.all('session') if session.get('parentId') == flow['id']]
        self.assertEqual(len(children), 2)
        self.assertTrue(all(session['status'] == 'closed' for session in children))
        self.assertFalse(any(session['id'] in self.app.clients for session in children))

    def test_failure_in_first_batch_closes_all_children_and_blocks_dependants(self):
        barrier = threading.Barrier(2, timeout=6)
        failure = threading.Event()
        started = []
        state_lock = threading.Lock()
        plan = mini_tasks(4)
        plan[2]['dependsOn'] = ['mini_0']
        plan[3]['dependsOn'] = ['mini_1']

        def controlled_wait(session_id, prompt, *args, **kwargs):
            with state_lock:
                started.append(session_id)
            barrier.wait()
            if 'mini-tâche 0' in prompt:
                failure.set()
                raise ValueError('Défaut contrôlé de la mini-tâche 0.')
            self.assertTrue(failure.wait(timeout=6))
            raise ValueError('Pair interrompu après le défaut contrôlé.')

        with patch.object(self.app, 'wait_session', side_effect=controlled_wait):
            flow = self.launch(plan, workers=2)
            failed = self.finish(flow)
        self.assertEqual(failed['status'], 'failed')
        self.assertEqual(len(started), 2)
        children = [session for session in self.app.store.all('session') if session.get('parentId') == flow['id']]
        self.assertEqual(len(children), 2)
        self.assertTrue(all(session['status'] == 'closed' for session in children))
        self.assertFalse(any(session['id'] in self.app.clients for session in children))

    def test_late_provider_constructor_cannot_reopen_a_closed_child(self):
        started = threading.Event()
        providers = []
        release = self.release

        class DelayedProvider(FakeCodex):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                providers.append(self)
                started.set()
                if not release.wait(timeout=6):
                    raise ValueError('Fournisseur fictif non libéré.')

        session = self.app.new_session({'model': 'fixture', 'planMode': False}, start=False)
        with patch('server.app.CodexClient', DelayedProvider):
            worker = threading.Thread(target=self.app.start_session, args=(session['id'],))
            worker.start()
            try:
                self.assertTrue(started.wait(timeout=6))
                self.app.report(session['id'], close=True)
            finally:
                release.set()
            worker.join(timeout=6)
            self.assertFalse(worker.is_alive())
        self.assertEqual(self.app.store.get('session', session['id'])['status'], 'closed')
        self.assertNotIn(session['id'], self.app.clients)
        self.assertEqual(len(providers), 1)
        self.assertTrue(providers[0].closed)

    def test_late_turn_events_cannot_reopen_or_request_approval_on_closed_session(self):
        session = self.app.new_session({'model': 'fixture', 'planMode': False})
        self.app.report(session['id'], close=True)
        for event in (
            {'method': 'turn/started', 'params': {'turn': {'id': 'late-turn'}}},
            {'method': 'turn/completed', 'params': {'turn': {'id': 'late-turn', 'status': 'completed'}}},
            {'id': 42, 'method': 'item/commandExecution/requestApproval', 'params': {'command': 'npm test'}},
        ):
            self.app.on_event(session['id'], event)
        self.assertEqual(self.app.store.get('session', session['id'])['status'], 'closed')
        self.assertFalse(self.app.store.all('approval'))
        ignored = [event for event in self.app.store.events(0, 200, session=session['id'])
                   if event['type'] == 'session.late_event_ignored']
        self.assertEqual(len(ignored), 3)


if __name__ == '__main__':
    unittest.main()
