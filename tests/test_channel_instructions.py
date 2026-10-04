"""Selected procedures reach isolated providers without enabling capabilities."""
import json
import os
import tempfile
import threading
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from server.channel_instructions import load_channel_instructions
from server.channel_runtime import ChannelRuntime
from server.channels import ChannelHub
from test_channels import FakeChannelApplication


class ChannelInstructionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.app = FakeChannelApplication(self.root)
        self.hub = ChannelHub(self.app)
        self.path = self.root / 'skills' / 'quality' / 'SKILL.md'
        self.path.parent.mkdir(parents=True)
        self.path.write_text('Méthode : comparer attendu et observé.', encoding='utf-8')

    def tearDown(self):
        self.hub.close()
        self.app.store.db.close()
        self.temporary.cleanup()

    def channel(self):
        return self.hub.create({'topic': 'Discuter des critères.', 'maxRounds': 2})['id']

    def add(self, identifier, **selected):
        return self.hub.add_participant(identifier, {'name': 'Expert', 'model': 'fixture', **selected})

    def wait(self):
        deadline = time.monotonic() + 4
        while time.monotonic() < deadline:
            with self.hub.lock:
                workers = set(self.hub.workers)
            if not workers:
                return
            for worker in workers:
                worker.join(max(0, deadline - time.monotonic()))
        self.fail('Le fournisseur fictif n’a pas terminé.')

    def test_only_selected_procedures_are_frozen_and_traced_for_every_turn(self):
        self.app.store.put('command', {'id': 'command_check', 'projectId': 'atelier', 'name': 'check',
            'kind': 'prompt', 'prompt': 'Préciser les inconnues.'})
        identifier = self.channel()
        expert = self.add(identifier, skills=['skills/quality/SKILL.md'], instructionCommands=['command_check'])
        peer = self.add(identifier)
        metadata = expert['instructionSources']
        self.assertEqual(len(metadata), 2)
        self.assertNotIn('content', str(metadata))

        def reply(participant, *_):
            if participant['id'] == expert['id']:
                self.path.write_text('NOUVEAU CONTENU NON SÉLECTIONNÉ', encoding='utf-8')
            return {'text': 'Contribution publique.'}

        self.app.reply = reply
        self.hub.start(identifier)
        self.wait()
        for call in self.app.calls:
            context = call['participant']['_instructionContext']
            if call['participant']['id'] == expert['id']:
                self.assertEqual(context[0]['content'], 'Méthode : comparer attendu et observé.')
                self.assertEqual(context[1]['content'], 'Préciser les inconnues.')
                self.assertEqual(context[0]['sha256'], metadata[0]['sha256'])
            else:
                self.assertEqual(context, [])
            self.assertNotIn('Méthode :', str(call['messages']))
        for round_record in self.hub.snapshot()['rounds']:
            self.assertEqual(round_record['instructionSources'][expert['id']], metadata)
            if peer['id'] in round_record['participantIds']:
                self.assertEqual(round_record['instructionSources'][peer['id']], [])
        snapshot = self.hub.snapshot()
        self.assertNotIn('Préciser les inconnues.', json.dumps(snapshot))
        self.assertNotIn('NOUVEAU CONTENU', json.dumps(snapshot))

    def test_selection_is_bounded_and_library_only(self):
        identifier = self.channel()
        for selection in ({'skills': 'skills/quality/SKILL.md'},
                          {'skills': ['skills/quality/SKILL.md'] * 2},
                          {'skills': ['unregistered.md']},
                          {'skills': ['../outside/SKILL.md']},
                          {'skills': [str(self.path)]},
                          {'instructionCommands': ['command_not_present']},
                          {'instructionCommands': ['command_' + str(i) for i in range(9)]}):
            with self.subTest(selection=selection), self.assertRaises(ValueError):
                self.add(identifier, **selection)
        self.assertEqual(self.hub.snapshot()['participants'], [])

    def test_missing_and_symlink_replacements_fail_before_provider_execution(self):
        identifier = self.channel()
        self.add(identifier, skills=['skills/quality/SKILL.md'])
        outside = self.root / 'other.md'
        outside.write_text('AUTRE CONTENU', encoding='utf-8')
        self.path.unlink()
        self.path.symlink_to(outside)
        with self.assertRaises(ValueError):
            self.hub.start(identifier)
        self.assertFalse(self.app.calls)
        self.path.unlink()
        with self.assertRaises(ValueError):
            self.hub.start(identifier)
        self.assertFalse(self.app.calls)
        self.assertEqual(self.hub.snapshot()['channels'][0]['status'], 'draft')

    def test_text_limits_utf8_and_redaction(self):
        identifier = self.channel()
        self.path.write_text('x' * 16001, encoding='utf-8')
        with self.assertRaises(ValueError):
            self.add(identifier, skills=['skills/quality/SKILL.md'])
        self.path.write_bytes(b'\xff')
        with self.assertRaisesRegex(ValueError, 'UTF-8'):
            self.add(identifier, skills=['skills/quality/SKILL.md'])
        self.path.write_text('Texte sk-abcdefghijklmnop masqué.', encoding='utf-8')
        participant = self.add(identifier, skills=['skills/quality/SKILL.md'])
        loaded = load_channel_instructions(self.app, participant)
        self.assertEqual(loaded[0]['content'], 'Texte [REDACTED] masqué.')
        self.assertEqual(loaded[0]['characters'], len(loaded[0]['content']))
        for index in range(2):
            self.app.store.put('command', {'id': 'command_' + str(index), 'projectId': 'atelier',
                'name': 'large-' + str(index), 'kind': 'prompt', 'prompt': 'x' * 16000})
        with self.assertRaisesRegex(ValueError, '32 000'):
            self.add(identifier, skills=['skills/quality/SKILL.md'], instructionCommands=['command_0', 'command_1'])

    @unittest.skipUnless(os.open in os.supports_dir_fd and hasattr(os, 'O_NOFOLLOW'), 'Descripteurs Unix requis')
    def test_symlink_swap_during_read_does_not_escape_validation(self):
        identifier = self.channel()
        original_open = os.open
        outside = self.root / 'other.md'
        outside.write_text('NE DOIT PAS ÊTRE LU', encoding='utf-8')

        def swapping_open(path, flags, *args, **kwargs):
            if path == 'SKILL.md':
                self.path.unlink()
                self.path.symlink_to(outside)
            return original_open(path, flags, *args, **kwargs)

        # Preserve the capability check when replacing the function for this race.
        with patch('server.channel_instructions.os.open', side_effect=swapping_open) as mocked_open:
            with patch('server.channel_instructions.os.supports_dir_fd', {mocked_open}):
                with self.assertRaisesRegex(ValueError, 'symlink'):
                    self.add(identifier, skills=['skills/quality/SKILL.md'])
        self.assertFalse(self.hub.snapshot()['participants'])

    def test_clone_does_not_inherit_procedures_and_legacy_participant_remains_valid(self):
        identifier = self.channel()
        self.app.store.put('session', {'id': 'work', 'projectId': 'atelier', 'name': 'Travail',
            'runtime': 'codex', 'provider': 'codex', 'model': 'fixture', 'effort': 'medium',
            'skills': ['skills/quality/SKILL.md'], 'instructionCommands': ['private'], 'mission': 'PRIVATE'})
        clone = self.hub.add_participant(identifier, {'sessionId': 'work'})
        self.assertEqual(clone['skills'], [])
        self.assertEqual(clone['instructionCommands'], [])
        channel = self.app.store.get('channel', identifier)
        for field in ('skills', 'instructionCommands', 'instructionSources'):
            channel['participants'][0].pop(field)
        self.app.store.put('channel', channel)
        self.hub.start(identifier)
        self.wait()
        self.assertEqual(self.hub.snapshot()['channels'][0]['status'], 'ready_for_review')

    def test_structured_systemone_cannot_claim_to_receive_text_procedures(self):
        identifier = self.channel()
        with self.assertRaisesRegex(ValueError, 'SystemOne'):
            self.hub.add_participant(identifier, {'name': 'Conseil', 'role': 'consultant',
                'configuration': {'runtime': 'api', 'connectionId': 'typed-consultant', 'model': 'fixture'},
                'skills': ['skills/quality/SKILL.md']})

    def test_api_runtime_receives_the_content_and_records_hash_without_tools(self):
        identifier = self.channel()
        participant = self.add(identifier, skills=['skills/quality/SKILL.md'])
        participant.update(topic='Sujet', runId='fixture-run', configuration={
            'runtime': 'api', 'provider': 'fixture', 'model': 'fixture'})
        self.app.store.update('channel', identifier, status='running', runId='fixture-run')
        requests = []

        def reply(*arguments):
            requests.append(arguments)
            return {'text': 'Réponse publique.'}

        self.app.api_connections = SimpleNamespace(reply=reply)
        response = ChannelRuntime(self.app).reply(participant, [], 'discussion')
        self.assertEqual(response['text'], 'Réponse publique.')
        self.assertIn('Méthode : comparer attendu et observé.', requests[0][3])
        self.assertIn('Il n’ajoute aucun outil ni permission', requests[0][3])
        self.assertEqual(self.app.store.all('request')[0]['instructionSources'], participant['instructionSources'])
        self.assertNotIn('Méthode :', str(self.app.store.all('request')))

    def test_native_runtime_keeps_the_isolated_session_and_embeds_text(self):
        identifier = self.channel()
        self.app.store.put('command', {'id': 'command_large', 'projectId': 'atelier', 'name': 'large',
            'kind': 'prompt', 'prompt': 'x' * 15900})
        self.path.write_text('Méthode : comparer attendu et observé.\n' + 'y' * 14900, encoding='utf-8')
        participant = self.add(identifier, skills=['skills/quality/SKILL.md'], instructionCommands=['command_large'])
        participant.update(topic='Sujet', runId='fixture-run')
        self.app.store.update('channel', identifier, status='running', runId='fixture-run')
        created, prompted = [], []
        self.app.clients, self.app.done = {}, {}

        def new_session(submitted, start=False):
            created.append(submitted)
            record = self.app.store.put('session', dict(submitted, mission=submitted['mission'][:20000],
                id='isolated', status='initializing', messages=[]))
            self.app.done['isolated'] = threading.Event()
            return record

        def prompt(session_id, text, source):
            prompted.append((text, source))
            self.app.store.update('session', session_id, lastTurnStatus='completed',
                                  messages=[{'role': 'assistant', 'text': 'Réponse publique.'}])
            self.app.done[session_id].set()

        self.app.new_session = new_session
        self.app.start_session = lambda sid: self.app.store.update('session', sid, status='ready')
        self.app.prompt = prompt
        response = ChannelRuntime(self.app).reply(participant, [], 'discussion')
        self.assertEqual(response['sessionId'], 'isolated')
        self.assertEqual(created[0]['skills'], [])
        self.assertFalse(created[0]['memory'])
        self.assertEqual(created[0]['sandbox'], 'read-only')
        self.assertIn('Méthode : comparer attendu et observé.', created[0]['mission'])
        self.assertIn('Méthode : comparer attendu et observé.', prompted[0][0])
        session = self.app.store.get('session', 'isolated')
        self.assertTrue(session['discussionOnly'])
        self.assertEqual(session['channelInstructionSources'], participant['instructionSources'])
        self.assertGreater(len(session['mission']), 20000)
        self.assertEqual(session['mission'], created[0]['mission'])
        self.assertIn('/channel-context/', session['workingPath'])


if __name__ == '__main__':
    unittest.main()
