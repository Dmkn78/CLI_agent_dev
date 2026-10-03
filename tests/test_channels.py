import copy
import json
import tempfile
import threading
import time
import unittest
from collections import defaultdict
from pathlib import Path
from unittest.mock import patch

from server.channels import ChannelHub, MAX_MESSAGE_CHARACTERS
from server.store import Store, uid


class FakeApiConnections:
    def configuration(self, submitted):
        connection_id = submitted.get('connectionId')
        if connection_id not in ('local-chat', 'typed-consultant'):
            raise ValueError('Connexion inconnue.')
        return {'runtime': 'api', 'provider': 'api:' + connection_id, 'connectionId': connection_id,
                'model': submitted.get('model', 'fixture'), 'effort': 'off',
                'protocol': 'systemone' if connection_id == 'typed-consultant' else 'openai',
                'apiKey': 'never-forward-this'}


class FakeChannelApplication:
    def __init__(self, directory):
        self.store = Store(directory)
        self.store.put('project', {'id': 'atelier', 'name': 'Atelier', 'path': str(directory)})
        self.api_connections = FakeApiConnections()
        self.calls = []
        self.cancellations = []
        self.lock = threading.RLock()
        self.reply = self.default_reply

    def project(self, project_id):
        return self.store.get('project', project_id)

    def model_configuration(self, submitted):
        if submitted.get('model') != 'fixture':
            raise ValueError('Modèle absent du catalogue fictif.')
        runtime = submitted.get('runtime', 'codex')
        return {'runtime': runtime, 'provider': 'fixture-provider' if runtime == 'omp' else 'codex',
                'model': 'fixture', 'effort': submitted.get('effort', 'medium')}

    def channel_reply(self, participant, public_messages, purpose):
        with self.lock:
            self.calls.append({'participant': copy.deepcopy(participant), 'messages': copy.deepcopy(public_messages),
                               'purpose': purpose})
        return self.reply(participant, public_messages, purpose)

    def default_reply(self, participant, public_messages, purpose):
        return {'text': 'Plan public à relire.' if purpose == 'plan' else 'Réponse publique de ' + participant['name'],
                'analysis': 'PRIVATE_REASONING', 'tools': [{'output': 'PRIVATE_TOOL_OUTPUT'}]}

    def channel_cancel(self, channel_id):
        with self.lock:
            self.cancellations.append(channel_id)

    def upsert(self, kind, submitted):
        record = dict(submitted, id=uid(kind))
        self.store.put(kind, record)
        return record


class ChannelTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.app = FakeChannelApplication(Path(self.temporary.name))
        self.hub = ChannelHub(self.app)

    def tearDown(self):
        self.hub.close()
        self.app.store.db.close()
        self.temporary.cleanup()

    def channel(self, max_rounds=1):
        return self.hub.create({'projectId': 'atelier', 'name': 'Décider ensemble',
                                'topic': 'Définir les étapes et les vérifications.', 'maxRounds': max_rounds})['id']

    def participant(self, channel_id, name='Agent', role='agent', runtime='codex'):
        return self.hub.add_participant(channel_id, {'name': name, 'role': role,
            'configuration': {'runtime': runtime, 'model': 'fixture', 'effort': 'medium'}})

    def summary(self, channel_id):
        return next(channel for channel in self.hub.snapshot()['channels'] if channel['id'] == channel_id)

    def wait(self):
        deadline = time.monotonic() + 4
        while time.monotonic() < deadline:
            with self.hub.lock:
                workers = set(self.hub.workers)
                for run in self.hub._runs.values():
                    workers.update(run.reply_workers)
            if not workers:
                return
            for worker in workers:
                worker.join(timeout=max(0, deadline - time.monotonic()))
        self.fail('Les réponses fictives ne sont pas terminées.')

    def test_public_round_barrier_isolation_and_orchestrator_plan(self):
        channel_id = self.channel(2)
        first = self.participant(channel_id, 'Premier')
        planner = self.participant(channel_id, 'Orchestrateur', 'orchestrator', 'omp')
        self.hub.post_message(channel_id, {'text': 'Voici la question publique.'})
        entered = threading.Event()
        first_returned = threading.Event()
        release = threading.Event()
        rounds_by_participant = defaultdict(int)
        counter_lock = threading.Lock()

        def reply(participant, public_messages, purpose):
            if purpose == 'plan':
                return {'text': 'Plan final soumis à revue.', 'analysis': 'PRIVATE_REASONING'}
            with counter_lock:
                rounds_by_participant[participant['id']] += 1
                number = rounds_by_participant[participant['id']]
            if number == 1 and participant['id'] == first['id']:
                public_messages.append({'analysis': 'PRIVATE_MUTATION'})
                first_returned.set()
            if number == 1 and participant['id'] == planner['id']:
                entered.set()
                if not release.wait(3):
                    raise RuntimeError('Barrière fictive non libérée.')
            return {'text': participant['name'] + ' · tour ' + str(number), 'analysis': 'PRIVATE_REASONING'}

        self.app.reply = reply
        started = self.hub.start(channel_id)
        self.assertTrue(started['runId'])
        try:
            self.assertTrue(entered.wait(2))
            self.assertTrue(first_returned.wait(2))
            self.assertEqual(len(self.hub.snapshot()['messages']), 1)
            self.assertEqual(self.hub.snapshot()['rounds'][0]['status'], 'running')
        finally:
            release.set()
        self.wait()
        snapshot = self.hub.snapshot()
        self.assertEqual(self.summary(channel_id)['status'], 'ready_for_review')
        self.assertEqual(self.summary(channel_id)['plan'], 'Plan final soumis à revue.')
        self.assertEqual(self.summary(channel_id)['planParticipantId'], planner['id'])
        self.assertEqual(self.summary(channel_id)['sequence'], 6)
        self.assertEqual([record['snapshotSequence'] for record in snapshot['rounds']], [1, 3, 5])
        self.assertEqual([record['purpose'] for record in snapshot['rounds']], ['discussion', 'discussion', 'plan'])
        discussions = [call for call in self.app.calls if call['purpose'] == 'discussion']
        self.assertEqual(len(discussions), 4)
        self.assertEqual(discussions[0]['messages'], discussions[1]['messages'])
        self.assertEqual(discussions[2]['messages'], discussions[3]['messages'])
        self.assertEqual(len(discussions[2]['messages']), 3)
        plan = next(call for call in self.app.calls if call['purpose'] == 'plan')
        self.assertEqual(plan['participant']['id'], planner['id'])
        self.assertEqual(len(plan['messages']), 5)
        self.assertTrue(all(call['participant']['sandbox'] == 'read-only' and not call['participant']['memory']
                            and not call['participant']['workEnabled'] for call in self.app.calls))
        self.assertNotIn('PRIVATE_', json.dumps(snapshot) + json.dumps(self.app.calls) + json.dumps(self.app.store.latest_events()))

    def test_clone_copies_configuration_without_work_session_context(self):
        channel_id = self.channel()
        source = {'id': 'working-session', 'projectId': 'atelier', 'name': 'Travail existant',
                  'runtime': 'codex', 'provider': 'codex', 'model': 'fixture', 'effort': 'medium',
                  'mission': 'PRIVATE_MISSION', 'messages': [{'role': 'assistant', 'text': 'PRIVATE_ANSWER'}],
                  'reasoning': 'PRIVATE_THOUGHTS', 'tools': ['PRIVATE_TOOL'], 'threadId': 'private-thread',
                  'sandbox': 'workspace-write', 'memory': True, 'workEnabled': True, 'status': 'running'}
        self.app.store.put('session', source)
        participant = self.hub.add_participant(channel_id, {'sessionId': source['id']})
        self.assertEqual(participant['sourceSessionId'], source['id'])
        self.assertEqual(participant['configuration']['model'], 'fixture')
        self.assertNotIn('PRIVATE_', json.dumps(participant))
        with self.assertRaises(ValueError):
            self.hub.add_participant(channel_id, {'sessionId': source['id'], 'model': 'fixture'})
        other = dict(source, id='other-session', projectId='another-project')
        self.app.store.put('session', other)
        with self.assertRaises(ValueError):
            self.hub.add_participant(channel_id, {'sessionId': other['id']})
        self.hub.start(channel_id)
        self.wait()
        self.assertEqual(self.app.store.get('session', source['id']), source)
        self.assertNotIn('sourceSessionId', self.app.calls[0]['participant'])
        self.assertNotIn('PRIVATE_', json.dumps(self.app.calls) + json.dumps(self.hub.snapshot()))

    def test_messages_validate_public_text_and_provider_metadata_is_filtered(self):
        channel_id = self.channel()
        self.participant(channel_id)
        for submitted in ({'text': ''}, {'text': 'x' * (MAX_MESSAGE_CHARACTERS + 1)},
                          {'text': {'analysis': 'private'}}, {'text': 'Public', 'role': 'agent'},
                          {'text': '<think>Private</think>'}, {'text': '{"analysis":"Private"}'},
                          {'text': 'Invalid\x00control'}):
            with self.subTest(submitted=str(submitted)[:60]), self.assertRaises(ValueError):
                self.hub.post_message(channel_id, submitted)
        public = self.hub.post_message(channel_id, {'text': 'Une clé sk-abcdefghijklmnop est masquée.'})
        self.assertEqual(public['role'], 'user')
        self.assertIsNone(public['participantId'])
        self.assertIn('[REDACTED]', public['text'])
        self.app.reply = lambda *_: {'text': 'Réponse publique.', 'analysis': 'PRIVATE_THOUGHTS',
            'usage': {'inputTokens': 8, 'outputTokens': 3, 'totalTokens': 11, 'cachedInputTokens': -1,
                      'analysis': 'PRIVATE_USAGE', 'reasoningOutputTokens': float('nan')},
            'sessionId': 'isolated-discussion-session', 'tools': ['PRIVATE_TOOLS']}
        self.hub.start(channel_id)
        self.wait()
        reply = self.hub.snapshot()['messages'][1]
        self.assertEqual(reply['usage'], {'inputTokens': 8, 'outputTokens': 3, 'totalTokens': 11})
        self.assertEqual(reply['sessionId'], 'isolated-discussion-session')
        plan = self.app.calls[-1]
        self.assertFalse(any('usage' in message or 'sessionId' in message for message in plan['messages']))
        self.assertNotIn('PRIVATE_', json.dumps(self.hub.snapshot()))

    def test_provider_failure_is_visible_and_retry_is_explicit(self):
        channel_id = self.channel()
        self.participant(channel_id)

        def failing_reply(*_):
            raise RuntimeError('Fournisseur fictif indisponible.')

        self.app.reply = failing_reply
        self.hub.start(channel_id)
        self.wait()
        self.assertEqual(self.summary(channel_id)['status'], 'failed')
        self.assertIn('indisponible', self.summary(channel_id)['error'])
        self.assertEqual(self.hub.snapshot()['rounds'][0]['status'], 'failed')
        self.assertFalse(self.hub.snapshot()['messages'])
        self.assertIsNone(self.summary(channel_id)['plan'])
        self.assertEqual(len(self.app.calls), 1)
        self.app.reply = self.app.default_reply
        self.hub.start(channel_id)
        self.wait()
        self.assertEqual(self.summary(channel_id)['status'], 'ready_for_review')
        self.assertEqual(self.summary(channel_id)['runCount'], 2)
        self.assertEqual(len(self.hub.snapshot()['rounds']), 3)

    def test_stop_discards_late_replies_and_blocks_edits_and_restart_until_return(self):
        channel_id = self.channel()
        participant = self.participant(channel_id)
        entered, release = threading.Event(), threading.Event()

        def blocking_reply(*_):
            entered.set()
            release.wait(3)
            return {'text': 'Réponse arrivée après arrêt.'}

        self.app.reply = blocking_reply
        self.hub.start(channel_id)
        try:
            self.assertTrue(entered.wait(2))
            with self.assertRaises(ValueError):
                self.hub.start(channel_id)
            stopped = self.hub.stop(channel_id)
            self.assertEqual(stopped['status'], 'stopped')
            self.assertIsNone(stopped['runId'])
            self.assertTrue(stopped['isStopping'])
            for change in (lambda: self.hub.start(channel_id), lambda: self.hub.post_message(channel_id, {'text': 'Message'}),
                           lambda: self.participant(channel_id, 'Nouveau'),
                           lambda: self.hub.remove_participant(channel_id, participant['id'])):
                with self.assertRaises(ValueError):
                    change()
            self.assertEqual(self.app.cancellations, [channel_id])
            with self.assertRaisesRegex(ValueError, 'Arrêt en cours'):
                self.hub.start(' ' + channel_id + ' ')
        finally:
            release.set()
        self.wait()
        self.assertFalse(self.hub.snapshot()['messages'])
        self.assertFalse(self.summary(channel_id)['isStopping'])
        self.assertEqual(self.hub.snapshot()['rounds'][0]['status'], 'stopped')
        self.app.reply = self.app.default_reply
        self.hub.start(channel_id)
        self.wait()
        self.assertEqual(self.summary(channel_id)['status'], 'ready_for_review')
        self.assertNotIn('après arrêt', json.dumps(self.hub.snapshot()))

    def test_restart_marks_unfinished_runs_interrupted_without_automatic_calls(self):
        channel_id = self.channel()
        participant = self.participant(channel_id)
        self.hub.post_message(channel_id, {'text': 'Historique à conserver.'})
        channel = self.app.store.get('channel', channel_id)
        channel.update(status='running', runId='old-run', runCount=1)
        channel['rounds'].append({'id': 'old-round', 'channelId': channel_id, 'runId': 'old-run',
            'number': 1, 'purpose': 'plan', 'participantIds': [participant['id']], 'status': 'running',
            'messageIds': [], 'snapshotSequence': 1, 'contextMessageIds': [], 'error': None})
        self.app.store.put('channel', channel)
        self.hub.close()
        self.hub = ChannelHub(self.app)
        self.assertEqual(self.summary(channel_id)['status'], 'interrupted')
        self.assertIsNone(self.summary(channel_id)['runId'])
        self.assertEqual(self.hub.snapshot()['rounds'][0]['status'], 'interrupted')
        self.assertEqual(self.summary(channel_id)['sequence'], 1)
        self.assertFalse(self.app.calls)
        self.assertFalse(self.hub.workers)
        self.hub.start(channel_id)
        self.wait()
        self.assertEqual(self.summary(channel_id)['status'], 'ready_for_review')
        self.assertEqual(self.hub.snapshot()['messages'][1]['sequence'], 2)

    def test_provider_timeout_fences_late_reply_until_worker_finishes(self):
        channel_id = self.channel()
        self.participant(channel_id)
        entered, release = threading.Event(), threading.Event()

        def blocking_reply(*_):
            entered.set()
            release.wait(3)
            return {'text': 'Réponse tardive au délai.'}

        self.app.reply = blocking_reply
        with patch('server.channels.REPLY_TIMEOUT_SECONDS', 0.05):
            self.hub.start(channel_id)
            self.assertTrue(entered.wait(2))
            try:
                for worker in list(self.hub.workers):
                    worker.join(2)
                    self.assertFalse(worker.is_alive())
                self.assertEqual(self.summary(channel_id)['status'], 'failed')
                self.assertIn('Délai', self.summary(channel_id)['error'])
                with self.assertRaises(ValueError):
                    self.hub.start(channel_id)
            finally:
                release.set()
        self.wait()
        self.assertFalse(self.hub.snapshot()['messages'])

    def test_systemone_consultant_and_local_api_are_interoperable_without_credentials(self):
        channel_id = self.channel()
        self.hub.add_participant(channel_id, {'name': 'Décideur', 'role': 'consultant',
            'configuration': {'runtime': 'api', 'connectionId': 'typed-consultant', 'model': 'fixture'}})
        with self.assertRaises(ValueError):
            self.hub.start(channel_id)
        with self.assertRaises(ValueError):
            self.hub.add_participant(channel_id, {'role': 'orchestrator',
                'configuration': {'runtime': 'api', 'connectionId': 'typed-consultant', 'model': 'fixture'}})
        planner = self.hub.add_participant(channel_id, {'name': 'Chat local', 'role': 'duplica',
            'configuration': {'runtime': 'api', 'connectionId': 'local-chat', 'model': 'fixture'}})
        self.hub.start(channel_id)
        self.wait()
        self.assertEqual(self.summary(channel_id)['planParticipantId'], planner['id'])
        self.assertEqual({call['participant']['configuration']['protocol'] for call in self.app.calls},
                         {'systemone', 'openai'})
        self.assertTrue(all(call['participant']['id'] == planner['id'] for call in self.app.calls if call['purpose'] == 'plan'))
        self.assertNotIn('never-forward-this', json.dumps(self.app.calls) + json.dumps(self.hub.snapshot()))

    def test_bounds_permissions_and_unknown_inputs(self):
        for max_rounds in (0, 7, True, '2'):
            with self.subTest(max_rounds=max_rounds), self.assertRaises(ValueError):
                self.channel(max_rounds)
        channel_id = self.channel(6)
        for index in range(8):
            self.participant(channel_id, 'Agent ' + str(index))
        with self.assertRaises(ValueError):
            self.participant(channel_id, 'Neuvième')
        another = self.channel()
        for submitted in ({'sandbox': 'workspace-write', 'model': 'fixture'},
                          {'memory': True, 'model': 'fixture'}, {'workEnabled': True, 'model': 'fixture'},
                          {'model': 'fixture', 'role': 'tool'}, {'model': 'fixture', 'role': []},
                          {'configuration': {'runtime': 'api', 'apiKey': 'private'}}):
            with self.subTest(submitted=submitted), self.assertRaises(ValueError):
                self.hub.add_participant(another, submitted)
        self.hub.start(channel_id)
        self.wait()
        self.assertEqual(len([call for call in self.app.calls if call['purpose'] == 'discussion']), 48)
        self.assertEqual(len([call for call in self.app.calls if call['purpose'] == 'plan']), 1)
        self.assertEqual(len(self.hub.snapshot()['messages']), 49)
        with patch('server.channels.MAX_HISTORY_MESSAGES', 49):
            with self.assertRaises(ValueError):
                self.hub.start(channel_id)
            with self.assertRaises(ValueError):
                self.hub.post_message(channel_id, {'text': 'Au-delà de la limite.'})
        with patch('server.channels.MAX_HISTORY_CHARACTERS', 1):
            with self.assertRaises(ValueError):
                self.hub.post_message(another, {'text': 'Trop long.'})
        with patch('server.channels.MAX_RECORDED_ROUNDS', 7):
            with self.assertRaises(ValueError):
                self.hub.start(channel_id)

    def test_private_or_empty_provider_text_fails_without_persisting_it(self):
        for text in ('<analysis>PRIVATE_THOUGHTS</analysis>', '<tool_call>PRIVATE_TOOL</tool_call>', '',
                     'x' * (MAX_MESSAGE_CHARACTERS + 1)):
            with self.subTest(text=text):
                channel_id = self.channel()
                self.participant(channel_id)
                self.app.reply = lambda *_, text=text: {'text': text}
                self.hub.start(channel_id)
                self.wait()
                self.assertEqual(self.summary(channel_id)['status'], 'failed')
                self.assertIsNone(self.summary(channel_id)['plan'])
        self.assertNotIn('PRIVATE_', json.dumps(self.hub.snapshot()) + json.dumps(self.app.store.latest_events()))

    def test_failed_plan_keeps_public_discussion_and_never_prepares_a_task(self):
        channel_id = self.channel()
        self.participant(channel_id)

        def reply(participant, public_messages, purpose):
            if purpose == 'plan':
                raise RuntimeError('La synthèse fictive a échoué.')
            return {'text': 'Discussion publique conservée.'}

        self.app.reply = reply
        self.hub.start(channel_id)
        self.wait()
        self.assertEqual(self.summary(channel_id)['status'], 'failed')
        self.assertIsNone(self.summary(channel_id)['plan'])
        self.assertEqual([message['text'] for message in self.hub.snapshot()['messages']], ['Discussion publique conservée.'])
        self.assertEqual([record['status'] for record in self.hub.snapshot()['rounds']], ['completed', 'failed'])
        with self.assertRaises(ValueError):
            self.hub.prepare_task(channel_id)
        self.assertFalse(self.app.store.all('task'))

    def test_clone_rejects_callback_that_reuses_the_working_session(self):
        channel_id = self.channel()
        self.app.store.put('session', {'id': 'source-session', 'projectId': 'atelier', 'name': 'Source',
                                      'runtime': 'codex', 'model': 'fixture', 'effort': 'medium'})
        self.hub.add_participant(channel_id, {'sessionId': 'source-session'})
        self.app.reply = lambda *_: {'text': 'Réponse publique.', 'sessionId': 'source-session'}
        self.hub.start(channel_id)
        self.wait()
        self.assertEqual(self.summary(channel_id)['status'], 'failed')
        self.assertIn('réutiliser', self.summary(channel_id)['error'])
        self.assertFalse(self.hub.snapshot()['messages'])

    def test_thread_start_failure_does_not_leave_a_channel_permanently_owned(self):
        channel_id = self.channel()
        self.participant(channel_id)
        with patch('server.channels.threading.Thread.start', side_effect=RuntimeError('Thread indisponible.')):
            with self.assertRaisesRegex(ValueError, 'démarrer'):
                self.hub.start(channel_id)
        self.assertEqual(self.summary(channel_id)['status'], 'failed')
        self.assertFalse(self.hub.workers)
        self.assertFalse(self.hub._runs)
        self.hub.start(' ' + channel_id + ' ')
        self.wait()
        self.assertEqual(self.summary(channel_id)['status'], 'ready_for_review')

    def test_participant_lifecycle_is_public_and_stop_rejects_late_status(self):
        channel_id = self.channel()
        participant = self.participant(channel_id)
        entered, release = threading.Event(), threading.Event()

        def reply(current, messages, purpose):
            self.hub.participant_activity(current, 'responding', sessionId='observed-native-session',
                                          reasoning='PRIVATE_REASONING')
            entered.set()
            release.wait(3)
            self.hub.participant_activity(current, 'completed')
            return {'text': 'Contribution tardive.'}

        self.app.reply = reply
        self.hub.start(channel_id)
        self.assertTrue(entered.wait(2))
        activity = self.hub.snapshot()['participants'][0]['activity']
        self.assertEqual(activity['status'], 'responding')
        self.assertEqual(activity['sessionId'], 'observed-native-session')
        self.assertNotIn('PRIVATE_REASONING', json.dumps(self.hub.snapshot()))
        try:
            self.hub.stop(channel_id)
            self.assertEqual(self.hub.snapshot()['participants'][0]['activity']['status'], 'stopped')
        finally:
            release.set()
            self.wait()
        self.assertEqual(self.hub.snapshot()['participants'][0]['activity']['status'], 'stopped')
        self.assertFalse(self.hub.snapshot()['messages'])

    def test_usage_counts_native_api_interrupted_and_unknown_calls_once(self):
        channel_id = self.channel()
        self.participant(channel_id)
        self.app.store.put('session', {'id': 'native', 'channelId': channel_id})
        for identifier, details in [
            ('native-call', {'sessionId': 'native', 'status': 'completed', 'usage': {'totalTokens': 10}}),
            ('api-call', {'channelId': channel_id, 'status': 'interrupted', 'usage': {'totalTokens': 3}}),
            ('unknown-call', {'channelId': channel_id, 'status': 'failed', 'usage': None}),
            ('other-call', {'channelId': 'other', 'status': 'completed', 'usage': {'totalTokens': 1000}}),
        ]:
            self.app.store.put('request', {'id': identifier, **details})
        usage = self.summary(channel_id)['usage']
        self.assertEqual(usage['total']['totalTokens'], 13)
        self.assertEqual(usage['partialFields'], ['totalTokens'])

    def test_failed_participant_has_individual_error_and_preserved_configuration(self):
        channel_id = self.channel()
        participant = self.hub.add_participant(channel_id, {'name': 'Tester', 'role': 'agent',
            'configuration': {'runtime': 'codex', 'model': 'fixture', 'effort': 'high'}})
        self.app.reply = lambda *args: (_ for _ in ()).throw(ValueError('Modèle indisponible.'))
        self.hub.start(channel_id)
        self.wait()
        current = self.hub.snapshot()['participants'][0]
        self.assertEqual(current['configuration'], participant['configuration'])
        self.assertEqual(current['activity']['status'], 'failed')
        self.assertIn('indisponible', current['activity']['error'])

    def test_prepare_task_is_idempotent_review_only_and_recovers_missing_link(self):
        channel_id = self.channel()
        participant = self.participant(channel_id)
        with self.assertRaises(ValueError):
            self.hub.prepare_task(channel_id)
        self.hub.start(channel_id)
        self.wait()
        self.assertFalse(self.app.store.all('task'))
        task = self.hub.prepare_task(channel_id)
        self.assertEqual(task['status'], 'review')
        self.assertEqual(task['projectId'], 'atelier')
        self.assertIn(self.summary(channel_id)['topic'], task['description'])
        self.assertIn(self.summary(channel_id)['plan'], task['description'])
        self.assertEqual(self.hub.prepare_task(channel_id)['id'], task['id'])
        channel = self.app.store.get('channel', channel_id)
        channel['preparedTaskId'] = None
        channel['rounds'][-1].pop('preparedTaskId')
        self.app.store.put('channel', channel)
        self.assertEqual(self.hub.prepare_task(channel_id)['id'], task['id'])
        self.assertEqual(len(self.app.store.all('task')), 1)
        self.hub.post_message(channel_id, {'text': 'Une précision avant un autre plan.'})
        with self.assertRaises(ValueError):
            self.hub.prepare_task(channel_id)
        self.hub.start(channel_id)
        self.wait()
        second = self.hub.prepare_task(channel_id)
        self.assertNotEqual(second['id'], task['id'])
        self.hub.remove_participant(channel_id, participant['id'])
        self.assertEqual(self.summary(channel_id)['status'], 'draft')
        self.assertIsNone(self.summary(channel_id)['plan'])
        self.assertTrue(self.hub.snapshot()['messages'])
        self.assertFalse(self.hub.snapshot()['participants'])
        with self.assertRaises(ValueError):
            self.hub.start(channel_id)

    def test_context_bound_is_public_and_snapshot_mutation_does_not_change_state(self):
        channel_id = self.channel()
        self.participant(channel_id)
        for text in ('Premier message', 'Deuxième message', 'Troisième message'):
            self.hub.post_message(channel_id, {'text': text})
        snapshot = self.hub.snapshot()
        snapshot['messages'][0]['text'] = 'PRIVATE_MUTATION'
        snapshot['participants'][0]['configuration']['model'] = 'changed'
        with patch('server.channels.MAX_CONTEXT_CHARACTERS', len('Troisième message')):
            self.hub.start(channel_id)
            self.wait()
        self.assertEqual([message['text'] for message in self.app.calls[0]['messages']], ['Troisième message'])
        self.assertEqual(self.hub.snapshot()['messages'][0]['text'], 'Premier message')
        self.assertEqual(self.hub.snapshot()['participants'][0]['configuration']['model'], 'fixture')

    def test_close_is_bounded_cancels_workers_and_refuses_late_mutations(self):
        channel_id = self.channel()
        self.participant(channel_id)
        entered, release = threading.Event(), threading.Event()

        def blocking_reply(*_):
            entered.set()
            release.wait(3)
            return {'text': 'Réponse après fermeture.'}

        self.app.reply = blocking_reply
        self.hub.start(channel_id)
        self.assertTrue(entered.wait(2))
        try:
            with patch('server.channels.SHUTDOWN_JOIN_SECONDS', 0.05):
                self.hub.close()
            self.assertEqual(self.summary(channel_id)['status'], 'interrupted')
            self.assertEqual(self.app.cancellations, [channel_id])
            with self.assertRaises(ValueError):
                self.hub.post_message(channel_id, {'text': 'Message après fermeture.'})
        finally:
            release.set()
        self.wait()
        self.assertFalse(self.hub.snapshot()['messages'])


if __name__ == '__main__':
    unittest.main()
