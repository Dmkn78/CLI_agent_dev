"""Critical public debate preserves bounded user intent and attribution."""
import copy
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace

from server.channel_context import identified_messages, public_context
from server.channel_runtime import ChannelRuntime
from server.channels import ChannelHub, MAX_CONTEXT_CHARACTERS
from test_channels import FakeChannelApplication


def message(identifier, text, role='agent', participant='agent', author='Agent'):
    return {'id': identifier, 'role': role, 'text': text, 'participantId': participant, 'author': author,
            'sequence': int(identifier.split('-')[-1]) if identifier.split('-')[-1].isdigit() else 0}


class PublicContextTests(unittest.TestCase):
    def test_long_history_retains_original_ssh_request_and_latest_position_per_participant(self):
        intent = message('user-0', 'Je veux un pont SSH privé pour connecter mes autres PC.', 'user', None, 'Utilisateur')
        history = [intent] + [message('public-' + str(index), ('Ancienne position ' + str(index) + '. ') * 160,
                  participant='first' if index % 2 else 'second') for index in range(1, 21)]
        history[-2]['text'] = 'Dernière position du premier. ' * 200
        history[-1]['text'] = 'Dernière position du second. ' * 200
        context, report = public_context(history, MAX_CONTEXT_CHARACTERS, ['first', 'second'])
        by_id = {entry['id']: entry for entry in context}
        self.assertEqual(by_id['user-0']['text'], intent['text'])
        self.assertIn('public-19', by_id)
        self.assertIn('public-20', by_id)
        self.assertTrue(report['truncated'])
        self.assertEqual(report['includedUserMessageIds'], ['user-0'])
        self.assertEqual(report['omittedUserMessageIds'], [])
        self.assertLessEqual(report['includedCharacters'], MAX_CONTEXT_CHARACTERS)

    def test_many_user_corrections_are_explicit_verbatim_excerpts_without_invented_summary(self):
        users = [message('user-' + str(index), ('Demande ' + str(index) + ' : ') * 180,
                         'user', None, 'Utilisateur') for index in range(10)]
        history = users + [message('public-' + str(index), 'Proposition récente. ' * 600,
                                  participant='agent-' + str(index)) for index in range(8)]
        original = copy.deepcopy(history)
        context, report = public_context(history, MAX_CONTEXT_CHARACTERS)
        self.assertEqual(report['includedUserMessageIds'], [entry['id'] for entry in users])
        self.assertEqual(report['omittedUserMessageIds'], [])
        self.assertTrue(report['excerptMessageIds'])
        for excerpt in context:
            source = next(entry for entry in original if entry['id'] == excerpt['id'])
            self.assertEqual(excerpt['text'], source['text'][:len(excerpt['text'])])
            if 'contextExcerpt' in excerpt:
                self.assertEqual(excerpt['contextExcerpt']['originalCharacters'], len(source['text']))
        self.assertEqual(history, original)
        context[0]['text'] = 'Mutation locale'
        self.assertEqual(history, original)

    def test_short_history_is_complete_and_private_provider_fields_are_never_projected(self):
        history = [dict(message('user-0', 'But explicite', 'user', None), analysis='PRIVATE', tools=['PRIVATE'])]
        context, report = public_context(history, MAX_CONTEXT_CHARACTERS)
        self.assertFalse(report['truncated'])
        self.assertEqual(context[0]['text'], 'But explicite')
        self.assertNotIn('PRIVATE', str(context) + str(report))
        self.assertNotIn('contextExcerpt', context[0])

    def test_identification_distinguishes_namesakes_own_replies_peers_and_partial_user_text(self):
        history = [message('public-1', 'Mon avis', participant='first', author='Même nom'),
                   message('public-2', 'Son avis', participant='second', author='Même nom'),
                   dict(message('user-3', 'SSH', 'user', None, 'Utilisateur'),
                        contextExcerpt={'includedCharacters': 3, 'originalCharacters': 50})]
        marked = identified_messages(history, 'first')
        self.assertIn('votre réponse publique antérieure · id=first', marked[0]['author'])
        self.assertIn('réponse publique d’un pair · id=second', marked[1]['author'])
        self.assertIn('demande utilisateur', marked[2]['author'])
        self.assertIn('3/50 caractères', marked[2]['author'])
        self.assertEqual([entry['text'] for entry in marked], [entry['text'] for entry in history])

    def test_hundreds_of_short_messages_also_bound_identification_overhead(self):
        history = [message('user-' + str(index), 'Courte précision.', 'user', None, 'U' * 100) for index in range(512)]
        context, report = public_context(history, MAX_CONTEXT_CHARACTERS)
        self.assertLessEqual(report['estimatedProjectedCharacters'], report['projectedCharacterLimit'])
        self.assertTrue(report['truncated'])
        self.assertEqual(context[0]['id'], 'user-0')
        self.assertEqual(context[-1]['id'], 'user-511')
        self.assertTrue(report['omittedUserMessageIds'])

    def test_departed_participants_do_not_displace_current_positions(self):
        history = [message('old-' + str(index), 'Courte position.', participant='departed-' + str(index),
                           author='A' * 100) for index in range(300)]
        history += [message('current-301', 'Position actuelle.', participant='current')]
        context, report = public_context(history, MAX_CONTEXT_CHARACTERS, ['current'])
        self.assertIn('current-301', [entry['id'] for entry in context])
        self.assertLessEqual(report['estimatedProjectedCharacters'], report['projectedCharacterLimit'])


class CriticalDiscussionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.app = FakeChannelApplication(Path(self.temporary.name))
        self.hub = ChannelHub(self.app)
        self.channel_id = self.hub.create({'topic': 'Connecter les projets des autres PC par SSH privé.', 'maxRounds': 2})['id']

    def tearDown(self):
        self.hub.close()
        self.app.store.db.close()
        self.temporary.cleanup()

    def add(self, role='agent', name='Participant'):
        return self.hub.add_participant(self.channel_id, {'name': name, 'role': role, 'model': 'fixture'})

    def wait(self):
        deadline = time.monotonic() + 4
        while time.monotonic() < deadline:
            with self.hub.lock:
                workers = set(self.hub.workers)
            if not workers:
                return
            for worker in workers:
                worker.join(max(0, deadline - time.monotonic()))
        self.fail('Discussion fictive inachevée.')

    def test_critic_contributes_but_never_becomes_the_only_planner(self):
        critic = self.add('critic', 'Questionneur')
        with self.assertRaisesRegex(ValueError, 'construire le plan'):
            self.hub.start(self.channel_id)
        planner = self.add('agent', 'Rédacteur')
        self.hub.start(self.channel_id)
        self.wait()
        discussions = [call for call in self.app.calls if call['purpose'] == 'discussion']
        plans = [call for call in self.app.calls if call['purpose'] == 'plan']
        self.assertTrue(any(call['participant']['id'] == critic['id'] for call in discussions))
        self.assertEqual([call['participant']['id'] for call in plans], [planner['id']])
        self.assertEqual(self.hub.snapshot()['channels'][0]['planParticipantId'], planner['id'])

    def test_systemone_remains_consultant_only(self):
        with self.assertRaisesRegex(ValueError, 'consultant'):
            self.hub.add_participant(self.channel_id, {'name': 'Typé', 'role': 'critic',
                'configuration': {'runtime': 'api', 'connectionId': 'typed-consultant', 'model': 'fixture'}})

    def test_long_context_barrier_gives_the_same_original_intent_and_projection_to_every_peer(self):
        first, second = self.add('agent', 'Premier'), self.add('critic', 'Second')
        initial = self.hub.post_message(self.channel_id, {'text': 'Mettre en place le pont SSH privé demandé pour mes PC.'})
        channel = self.app.store.get('channel', self.channel_id)
        for index in range(20):
            entry = self.hub._message(channel, 'Proposition à comparer. ' * 150, first if index % 2 else second)
            channel['messages'].append(entry)
        self.app.store.put('channel', channel)
        self.hub.start(self.channel_id)
        self.wait()
        first_round = [call for call in self.app.calls if call['participant']['roundNumber'] == 1]
        self.assertEqual(len(first_round), 2)
        self.assertEqual(first_round[0]['messages'], first_round[1]['messages'])
        self.assertEqual(first_round[0]['participant']['contextProjection'], first_round[1]['participant']['contextProjection'])
        self.assertEqual(first_round[0]['messages'][0]['id'], initial['id'])
        self.assertEqual(first_round[0]['messages'][0]['text'], initial['text'])
        projection = first_round[0]['participant']['contextProjection']
        self.assertTrue(projection['truncated'])
        self.assertLessEqual(projection['includedCharacters'], MAX_CONTEXT_CHARACTERS)
        self.assertEqual(self.hub.snapshot()['rounds'][0]['contextProjection'], projection)
        self.assertTrue(all('contextProjection' in entry['activity'] for entry in self.hub.snapshot()['participants']))

    def test_runtime_identifies_self_and_critical_protocol_without_demanding_fake_opposition(self):
        critic = self.add('critic', 'Expert pareil')
        critic.update(topic='Sujet SSH privé', runId='run', configuration={'runtime': 'api', 'provider': 'fixture', 'model': 'fixture'},
            contextProjection={'truncated': True, 'omittedMessageIds': ['older'], 'excerptMessageIds': ['partial']})
        self.app.store.update('channel', self.channel_id, status='running', runId='run')
        calls = []

        def reply(*arguments):
            calls.append(arguments)
            return {'text': 'Choix étayé ; vérification de connectivité proposée.'}

        self.app.api_connections = SimpleNamespace(reply=reply)
        history = [message('own-1', 'Position précédente', participant=critic['id'], author='Expert pareil'),
                   message('peer-2', 'Position concurrente', participant='peer', author='Expert pareil'),
                   message('user-3', 'Je veux SSH', 'user', None, 'Utilisateur')]
        runtime = ChannelRuntime(self.app)
        runtime.reply(critic, history, 'discussion')
        instructions, context = calls[0][3], calls[0][1]
        self.assertIn('"participantId": "' + critic['id'] + '"', instructions)
        self.assertIn('Ton rôle de questionneur / contradicteur', instructions)
        self.assertIn('ne valide pas automatiquement', instructions)
        self.assertIn('Ne crée pas non plus de désaccord artificiel', instructions)
        self.assertIn('question discriminante', instructions)
        self.assertIn('ne prouve pas que l’utilisateur ne l’a jamais demandé', instructions)
        self.assertIn('Ne partage aucune pensée privée', instructions)
        self.assertIn('votre réponse publique antérieure', context[1]['author'])
        self.assertIn('réponse publique d’un pair', context[2]['author'])
        self.assertIn('demande utilisateur', context[3]['author'])
        self.assertNotIn('[[ATELIER:READY]]', instructions)
        self.assertEqual(self.app.store.all('request')[0]['contextProjection'], critic['contextProjection'])
        critic['roundMode'] = 'auto'
        runtime.reply(critic, history, 'discussion')
        self.assertIn('[[ATELIER:READY]]', calls[1][3])
        self.assertIn('[[ATELIER:CONTINUE]]', calls[1][3])


if __name__ == '__main__':
    unittest.main()
