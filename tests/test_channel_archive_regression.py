"""Independent regressions for durable public history and user-chosen round limits.

Only deterministic providers and temporary SQLite databases are used. These
cases exercise ChannelHub's public contract rather than the archive's SQL.
"""
import copy
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from server.channel_context import MAX_PROJECTED_CHARACTERS, identified_messages
from server.channel_runtime import ChannelRuntime
from server.channels import ChannelHub, MAX_CONTEXT_CHARACTERS
from server.store import now
from test_channels import FakeChannelApplication


class ChannelArchiveRegressionTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.app = FakeChannelApplication(Path(self.directory.name))
        self.hub = ChannelHub(self.app)

    def tearDown(self):
        self.hub.close()
        self.app.store.db.close()
        self.directory.cleanup()

    def create(self, **options):
        channel = self.hub.create({'topic': 'Préparer le pont SSH privé demandé pour mes autres PC.',
                                   'name': 'Canal fictif durable', 'maxRounds': 1, **options})
        participant = self.hub.add_participant(channel['id'], {'name': 'Même nom', 'role': 'agent', 'model': 'fixture'})
        return channel['id'], participant

    def restart(self):
        self.hub.close()
        self.hub = ChannelHub(self.app)

    def summary(self, channel_id):
        return next(channel for channel in self.hub.snapshot()['channels'] if channel['id'] == channel_id)

    def wait(self, timeout=15):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            with self.hub.lock:
                workers = set(self.hub.workers)
                for run in self.hub._runs.values():
                    workers.update(run.reply_workers)
            if not workers:
                return
            for worker in workers:
                worker.join(max(0, min(.1, deadline - time.monotonic())))
        self.fail('Le fournisseur fictif ou le canal ne s’est pas arrêté.')

    def full_history(self, channel_id, limit=73):
        messages, records, seen, before = [], {}, set(), None
        while True:
            page = self.hub.history(channel_id, before=before, limit=limit)
            self.assertEqual(page['channelId'], channel_id)
            self.assertEqual(page['history']['loadedMessageCount'], len(page['messages']))
            self.assertEqual(page['messages'], sorted(page['messages'], key=lambda entry: entry['sequence']))
            self.assertLessEqual(len(page['messages']), 100)
            self.assertLessEqual(sum(len(entry['text']) for entry in page['messages']), 240000)
            if before is not None:
                self.assertTrue(all(entry['sequence'] < before for entry in page['messages']))
            for message in page['messages']:
                self.assertNotIn(message['id'], seen, 'Deux pages réintroduisent le même message.')
                seen.add(message['id'])
            messages = page['messages'] + messages
            records.update({entry['id']: entry for entry in page['rounds']})
            if not page['history']['hasMore']:
                break
            self.assertTrue(page['messages'], 'Une page vide avec hasMore ferait boucler le client.')
            next_before = page['history']['firstSequence']
            self.assertEqual(next_before, page['messages'][0]['sequence'])
            self.assertTrue(before is None or next_before < before)
            before = next_before
        return messages, records

    def legacy(self, *, interrupted=False, mostly_users=False, empty_round=False):
        channel_id, participant = self.create()
        peer = self.hub.add_participant(channel_id, {'name': 'Même nom', 'role': 'critic', 'model': 'fixture'})
        legacy = self.app.store.get('channel', channel_id)
        timestamp = now()
        rounds = [{'id': 'legacy-round-' + str(index), 'channelId': channel_id, 'runId': 'legacy-run',
            'number': index + 1, 'purpose': 'plan' if index == 160 else 'discussion',
            'status': 'running' if interrupted and index == 0 else 'completed',
            'startedAt': timestamp, 'completedAt': None if interrupted and index == 0 else timestamp,
            'participantIds': [participant['id'], peer['id']], 'snapshotSequence': index,
            'contextMessageIds': [], 'messageIds': [], 'error': None} for index in range(161)]
        messages = []
        for index in range(620):
            actor = participant if index % 2 else peer
            user = index in (0,310,619) or (mostly_users and index not in (100,200))
            if mostly_users and index == 100:
                actor = participant
            elif mostly_users and index == 200:
                actor = peer
            text = ('Précision utilisateur' if user else 'Position publique') + ' ' + str(index) + ' : ' + 'x' * 2000 + ' [fin ' + str(index) + ']'
            if index == 0:
                text = 'Demande initiale : conserver un pont SSH privé pour relier mes PC.'
            elif index == 619:
                text = 'Correction finale : utiliser mes comptes locaux et garder les approbations.'
            round_record = rounds[index % len(rounds)] if not user else None
            if empty_round and round_record is rounds[0]:
                round_record = None
            entry = {'id': 'legacy-public-' + str(index), 'channelId': channel_id,
                'participantId': None if user else actor['id'], 'author': 'Utilisateur' if user else actor['name'],
                'role': 'user' if user else actor['role'], 'text': text, 'createdAt': timestamp,
                'roundId': round_record['id'] if round_record else None, 'sequence': index + 1}
            if not user:
                entry['usage'] = {'inputTokens': 2, 'outputTokens': 1, 'totalTokens': 3}
            if round_record is not None:
                round_record['messageIds'].append(entry['id'])
            messages.append(entry)
        if empty_round:
            rounds[0].update(status='failed',error='Fournisseur fictif indisponible.')
        legacy.update(status='running' if interrupted else 'ready_for_review', sequence=len(messages),
            runId='legacy-run' if interrupted else None, runCount=1, plan='Ancien plan public à relire.',
            planParticipantId=participant['id'], messages=messages, rounds=rounds)
        self.app.store.put('channel', legacy)
        self.restart()
        return channel_id, participant, peer, messages, rounds

    def test_legacy_full_history_survives_migration_restart_and_ordered_paging(self):
        channel_id, _, _, expected, expected_rounds = self.legacy()
        summary = self.summary(channel_id)
        self.assertEqual(summary['history']['messageCount'], 620)
        self.assertEqual(summary['history']['roundCount'], 161)
        self.assertEqual(summary['history']['messageCharacters'], sum(len(entry['text']) for entry in expected))
        replies = sum(entry['role'] != 'user' for entry in expected)
        self.assertEqual(summary['usage']['total'], {'inputTokens': replies * 2, 'outputTokens': replies, 'totalTokens': replies * 3})
        recent = [entry for entry in self.hub.snapshot()['messages'] if entry['channelId'] == channel_id]
        self.assertLessEqual(len(recent), 120)
        self.assertLessEqual(sum(len(entry['text']) for entry in recent), 240000)
        self.assertEqual(recent[-1]['id'], expected[-1]['id'])
        self.assertNotIn(expected[0]['id'], [entry['id'] for entry in recent])
        received, records = self.full_history(channel_id)
        self.assertEqual(received, expected)
        # Some historical rounds may have no associated public message; all
        # rounds that do have messages must remain available on their pages.
        associated = {entry['roundId'] for entry in expected if entry['roundId']}
        self.assertEqual(set(records), associated)
        self.assertTrue(all(records[entry['id']] == entry for entry in expected_rounds if entry['id'] in associated))
        self.restart()
        self.assertEqual(self.full_history(channel_id)[0], expected)
        self.assertEqual(self.summary(channel_id)['history']['roundCount'], 161)
        self.assertFalse(self.app.calls)

    def test_restart_interrupts_old_running_round_outside_recent_cache(self):
        channel_id, _, _, expected, _ = self.legacy(interrupted=True)
        summary = self.summary(channel_id)
        self.assertEqual(summary['status'], 'interrupted')
        self.assertIsNone(summary['runId'])
        received, records = self.full_history(channel_id)
        self.assertEqual(received, expected)
        self.assertEqual(records['legacy-round-0']['status'], 'interrupted')
        self.assertTrue(records['legacy-round-0']['completedAt'])
        self.assertFalse(self.app.calls)

    def test_completed_provider_reply_is_archived_beyond_former_capacity(self):
        channel_id, _, _, expected, _ = self.legacy()
        self.hub.remove_participant(channel_id, self.hub.snapshot()['participants'][1]['id'])
        text = 'Réponse conservée ' + 'z' * 15000 + ' [fin conservée]'
        self.app.reply = lambda *_: {'text': text, 'usage': {'inputTokens': 5, 'outputTokens': 7, 'totalTokens': 12}}
        self.hub.start(channel_id)
        self.wait()
        summary = self.summary(channel_id)
        self.assertEqual(summary['status'], 'ready_for_review', summary.get('error'))
        received, _ = self.full_history(channel_id)
        self.assertEqual(received[:620], expected)
        self.assertEqual([entry['text'] for entry in received[620:]], [text,text])
        self.assertEqual(summary['history']['messageCount'], 622)
        self.assertEqual(summary['history']['roundCount'], 163)
        self.assertEqual(len(self.app.calls), 2)
        self.restart()
        self.assertEqual([entry['text'] for entry in self.full_history(channel_id)[0][-2:]], [text,text])
        first_task = self.hub.prepare_task(channel_id)
        self.assertEqual(self.hub.prepare_task(channel_id)['id'], first_task['id'])

    def test_fixed_requested_limit_above_six_finishes_with_one_plan(self):
        channel_id, _ = self.create(maxRounds=61)
        self.hub.start(channel_id)
        self.wait()
        summary = self.summary(channel_id)
        self.assertEqual(summary['status'], 'ready_for_review', summary.get('error'))
        self.assertEqual(sum(call['purpose'] == 'discussion' for call in self.app.calls), 61)
        self.assertEqual(sum(call['purpose'] == 'plan' for call in self.app.calls), 1)
        self.assertEqual(summary['history']['roundCount'], 62)

    def test_automatic_requested_limit_above_fifty_stops_exactly_without_plan(self):
        channel_id, _ = self.create(roundMode='auto',autoRoundLimit=61)
        self.hub.add_participant(channel_id, {'name': 'Pair', 'role': 'critic', 'model': 'fixture'})
        self.app.reply = lambda *_: {'text': 'Une vérification reste ouverte.\n[[ATELIER:CONTINUE]]'}
        self.hub.start(channel_id)
        self.wait()
        summary = self.summary(channel_id)
        self.assertEqual(summary['status'], 'needs_more_discussion', summary.get('error'))
        self.assertEqual(len(self.app.calls), 122)
        self.assertTrue(all(call['purpose'] == 'discussion' for call in self.app.calls))
        self.assertEqual(summary['history']['roundCount'], 61)
        self.assertEqual(len(self.full_history(channel_id)[0]), 122)
        self.assertIsNone(summary['plan'])

    def test_unlimited_discussion_can_conclude_after_fifty_rounds(self):
        channel_id, _ = self.create(roundMode='auto',autoRoundLimit=None)
        counter = 0
        def reply(participant, messages, purpose):
            nonlocal counter
            if purpose == 'plan':
                return {'text': 'Plan fictif après accord explicite.'}
            counter += 1
            return {'text': 'Avis public.\n' + ('[[ATELIER:READY]]' if counter == 53 else '[[ATELIER:CONTINUE]]')}
        self.app.reply = reply
        self.hub.start(channel_id)
        self.wait()
        self.assertEqual(counter, 53)
        self.assertEqual(self.summary(channel_id)['status'], 'ready_for_review')
        self.assertEqual(self.summary(channel_id)['history']['roundCount'], 54)
        self.assertIsNone(self.summary(channel_id)['autoRoundLimit'])

    def test_unlimited_discussion_is_cancelable_after_fifty_rounds(self):
        channel_id, _ = self.create(roundMode='auto',autoRoundLimit=None)
        entered, release = threading.Event(), threading.Event()
        counter = 0
        def reply(*_):
            nonlocal counter
            counter += 1
            if counter == 55:
                entered.set()
                if not release.wait(5):
                    raise RuntimeError('La réponse fictive bloquée n’a pas été libérée.')
            return {'text': 'Une question reste ouverte.\n[[ATELIER:CONTINUE]]'}
        self.app.reply = reply
        self.hub.start(channel_id)
        try:
            self.assertTrue(entered.wait(10), self.summary(channel_id).get('error'))
            self.assertEqual(self.summary(channel_id)['status'], 'running')
            self.hub.stop(channel_id)
        finally:
            release.set()
        self.wait()
        summary = self.summary(channel_id)
        self.assertEqual(summary['status'], 'stopped')
        self.assertFalse(summary['isStopping'])
        self.assertIsNone(summary['plan'])
        self.assertEqual(counter, 55)
        self.assertEqual(summary['history']['messageCount'], 54)
        self.assertEqual(summary['history']['roundCount'], 55)
        self.assertIn(channel_id, self.app.cancellations)

    def test_full_archive_context_keeps_old_positions_user_intent_and_bounded_attribution(self):
        channel_id, participant, peer, expected, _ = self.legacy(mostly_users=True)
        original = copy.deepcopy(expected)
        self.hub.configure(channel_id, {'maxRounds': 1})
        self.hub.start(channel_id)
        self.wait()
        discussion = [call for call in self.app.calls if call['purpose'] == 'discussion']
        self.assertEqual(len(discussion), 2)
        self.assertEqual(discussion[0]['messages'], discussion[1]['messages'])
        for call in discussion:
            by_id = {entry['id']: entry for entry in call['messages']}
            for identifier in ('legacy-public-0','legacy-public-619','legacy-public-100','legacy-public-200'):
                self.assertIn(identifier, by_id)
            self.assertEqual(by_id['legacy-public-0']['text'], expected[0]['text'])
            self.assertEqual(by_id['legacy-public-619']['text'], expected[-1]['text'])
            projection = call['participant']['contextProjection']
            self.assertEqual(projection['totalMessages'], 620)
            self.assertEqual(projection['originalCharacters'], sum(len(entry['text']) for entry in expected))
            self.assertLessEqual(projection['includedCharacters'], MAX_CONTEXT_CHARACTERS)
            self.assertLessEqual(projection['estimatedProjectedCharacters'], MAX_PROJECTED_CHARACTERS)
            identified = identified_messages(call['messages'], call['participant']['id'])
            by_id = {entry['id']: entry for entry in identified}
            own = 'legacy-public-100' if call['participant']['id'] == participant['id'] else 'legacy-public-200'
            other = 'legacy-public-200' if own == 'legacy-public-100' else 'legacy-public-100'
            self.assertIn('votre réponse publique antérieure', by_id[own]['author'])
            self.assertIn('réponse publique d’un pair', by_id[other]['author'])
            self.assertIn('demande utilisateur', by_id['legacy-public-0']['author'])
        # The candidate query is bounded; IDs it omits are therefore a partial
        # list. Providers must see the true total omission count from SQLite.
        evidence = copy.deepcopy(discussion[0]['participant'])
        evidence['configuration']['runtime'] = 'api'
        projection = evidence['contextProjection']
        self.assertFalse(projection['omittedMessageIdsComplete'])
        self.assertGreater(projection['omittedMessageCount'],len(projection['omittedMessageIds']))
        runtime = ChannelRuntime(self.app)
        with patch.object(runtime,'_api_reply',return_value={'text':'Avis public fictif.'}) as api_reply:
            runtime.reply(evidence,discussion[0]['messages'],'discussion')
        instructions = api_reply.call_args.args[3]
        self.assertIn(str(projection['omittedMessageCount']) + ' messages omis',instructions)
        self.assertEqual(self.full_history(channel_id)[0][:620], original)

    def test_old_failed_round_without_a_message_remains_accessible_by_round_pages(self):
        channel_id, _, _, expected, original_rounds = self.legacy(empty_round=True)
        recent = [record for record in self.hub.snapshot()['rounds'] if record['channelId'] == channel_id]
        self.assertNotIn('legacy-round-0',[record['id'] for record in recent])
        self.assertNotIn('legacy-round-0',self.full_history(channel_id)[1])
        received, positions, before = [], set(), None
        while True:
            page = self.hub.round_history(channel_id,before=before,limit=37)
            self.assertEqual(page['history']['roundCount'],161)
            self.assertEqual(page['history']['loadedRoundCount'],len(page['rounds']))
            self.assertEqual(page['rounds'],sorted(page['rounds'],key=lambda record: record['archivePosition']))
            for record in page['rounds']:
                self.assertNotIn(record['archivePosition'],positions)
                self.assertTrue(before is None or record['archivePosition'] < before)
                positions.add(record['archivePosition'])
            received = page['rounds'] + received
            if not page['history']['hasMore']:
                break
            self.assertTrue(page['rounds'])
            next_before = page['history']['firstPosition']
            self.assertEqual(next_before,page['rounds'][0]['archivePosition'])
            self.assertTrue(before is None or next_before < before)
            before = next_before
        self.assertEqual(len(received),161)
        self.assertEqual(received[0]['id'],'legacy-round-0')
        self.assertEqual(received[0]['status'],'failed')
        self.assertEqual(received[0]['messageIds'],[])
        self.assertEqual(received[0]['error'],original_rounds[0]['error'])
        self.assertEqual([{key:value for key,value in record.items() if key != 'archivePosition'} for record in received],original_rounds)
        self.assertEqual(self.full_history(channel_id)[0],expected)
        self.restart()
        oldest = self.hub.round_history(channel_id,before=2,limit=37)['rounds'][0]
        self.assertEqual(oldest['id'],'legacy-round-0')

    def capacity_failure(self, *, ambiguous=False, private=False, partial=False, incorrect_channel_error=False):
        channel_id, first = self.create()
        second = self.hub.add_participant(channel_id, {'name': 'Pair fictif', 'model': 'fixture'})
        channel = self.app.store.get('channel', channel_id)
        capacity_error = 'Historique public rempli ; crée un nouveau canal pour continuer.'
        started, completed = '2026-10-03T10:00:00+00:00', '2026-10-03T10:00:30+00:00'
        old = [{'id': 'old-public-' + channel_id + '-' + str(index), 'channelId': channel_id, 'sequence': index + 1,
            'text': 'Position publique ' + 'x' * 1970, 'role': 'agent', 'participantId': first['id'],
            'author': first['name'], 'createdAt': started, 'roundId': None} for index in range(119)]
        record = {'id': 'capacity-round-' + channel_id, 'channelId': channel_id, 'runId': 'old-run', 'number': 3,
            'purpose': 'discussion', 'status': 'failed', 'error': capacity_error,
            'participantIds': [first['id'],second['id']], 'messageIds': [],
            'snapshotSequence': len(old), 'startedAt': started, 'completedAt': completed,
            'contextMessageIds': [], 'contextProjection': {}}
        sessions = []
        for index, participant in enumerate((first,second)):
            text = 'Contribution publique récupérable ' + str(index) + ' : ' + 'z' * 5900 + ' [fin]'
            if private and index == 1:
                text = '<think>Raisonnement privé fictif</think>' + text
            session = {'id': 'unpublished-session-' + channel_id + '-' + str(index), 'channelId': channel_id,
                'channelParticipantId': participant['id'], 'discussionOnly': True,
                'status': 'closed', 'lastTurnStatus': 'completed', 'sandbox': 'read-only',
                'createdAt': '2026-10-03T10:00:05+00:00', 'completedAt': '2026-10-03T10:00:20+00:00',
                'messages': [{'role':'assistant','text':text,'reasoning':'PRIVATE_FIELD_NEVER_PUBLISHED'}],
                'usage': {'last': {'inputTokens':7,'outputTokens':3,'totalTokens':10}}}
            self.app.store.put('session', session)
            sessions.append(session)
        if ambiguous:
            self.app.store.put('session', dict(sessions[0],id='ambiguous-session-' + channel_id))
        if partial:
            record['messageIds'] = [old[0]['id']]
        channel.update(status='failed',error='Une autre erreur.' if incorrect_channel_error else capacity_error,
            runId=None,sequence=len(old),messages=old,rounds=[record],plan=None)
        self.app.store.put('channel',channel)
        self.restart()
        return channel_id, old, sessions

    def test_capacity_failed_round_recovers_only_completed_native_public_replies_once(self):
        channel_id, old, sessions = self.capacity_failure()
        recovered, records = self.full_history(channel_id)
        self.assertEqual(recovered[:len(old)], old)
        self.assertEqual(len(recovered), len(old) + 2)
        for message, session in zip(recovered[-2:], sessions):
            self.assertEqual(message['text'], session['messages'][0]['text'])
            self.assertEqual(message['sessionId'],session['id'])
            self.assertEqual(message['recoveredFromSession'],session['id'])
            self.assertEqual(message['recoveryReason'],'history_capacity')
            self.assertEqual(message['usage'],session['usage']['last'])
            self.assertEqual(message['roundId'],'capacity-round-' + channel_id)
        self.assertEqual(records['capacity-round-' + channel_id]['status'],'completed')
        self.assertEqual(records['capacity-round-' + channel_id]['previousStatus'],'failed')
        self.assertEqual(records['capacity-round-' + channel_id]['recoveryReason'],'history_capacity')
        self.assertEqual(self.summary(channel_id)['status'],'failed')
        self.assertFalse(self.app.calls)
        self.assertNotIn('PRIVATE_FIELD',str(recovered) + str(records))
        self.restart()
        self.assertEqual(self.full_history(channel_id)[0], recovered)
        self.assertEqual(self.summary(channel_id)['history']['messageCount'],len(old) + 2)

    def test_capacity_recovery_is_all_or_nothing_when_source_is_ambiguous_or_private(self):
        for options in ({'ambiguous':True},{'private':True},{'partial':True},{'incorrect_channel_error':True}):
            with self.subTest(options=options):
                channel_id, old, _ = self.capacity_failure(**options)
                self.assertEqual(self.full_history(channel_id)[0], old)
                self.assertEqual(self.summary(channel_id)['history']['messageCount'],len(old))
                self.assertFalse(self.app.calls)

    def test_oversized_counter_sum_never_breaks_complete_state_snapshot(self):
        channel_id, participant = self.create()
        channel = self.app.store.get('channel',channel_id)
        channel['messages'] = [{'id':'oversized-usage-' + str(index),'channelId':channel_id,'sequence':index + 1,
            'text':'Réponse publique fictive.', 'role':'agent','participantId':participant['id'],
            'author':participant['name'],'createdAt':now(),'roundId':None,
            'usage':{'inputTokens':2 ** 53 - 1,'outputTokens':1}} for index in range(1030)]
        channel['sequence'] = len(channel['messages'])
        self.app.store.put('channel',channel)
        self.restart()
        summary = self.summary(channel_id)
        self.assertEqual(summary['history']['messageCount'],1030)
        self.assertNotIn('inputTokens',summary['usage']['total'])
        self.assertEqual(summary['usage']['total']['outputTokens'],1030)


if __name__ == '__main__':
    unittest.main()
