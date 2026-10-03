import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server.app import Application
from server.duplica_telegram import TelegramRelay
from server.telegram_vault import load_token, save_token
from server.process_environment import agent_environment
from test_application import FakeCodex


class DiscussionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.app = Application(self.root)
        self.core = self.app.duplica
        self.app.provider.update(models=[{'model': 'fixture', 'isDefault': True, 'defaultReasoningEffort': 'medium',
            'supportedReasoningEfforts': [{'reasoningEffort': 'medium'}]}])
        self.provider_patch = patch('server.app.CodexClient', FakeCodex)
        self.provider_patch.start()

    def tearDown(self):
        self.app.shutdown()
        self.provider_patch.stop()
        self.app.store.db.close()
        self.temporary.cleanup()

    def wait(self):
        for worker in list(self.core.discussion.workers):
            worker.join(timeout=3)
            self.assertFalse(worker.is_alive())

    def test_discussion_shared_per_project_does_not_enable_supervision_or_work(self):
        self.core.save_context({'projectId': 'atelier', 'project': 'Préserver l’authentification'})
        first = self.core.discussion.send({'projectId': 'atelier', 'text': 'Comment avancer ?'})
        self.wait()
        second = self.core.discussion.send({'projectId': 'atelier', 'text': 'Précise les tests.'})
        self.wait()
        self.assertEqual(first['sessionId'], second['sessionId'])
        session = self.app.store.get('session', first['sessionId'])
        self.assertEqual(session['sandbox'], 'read-only')
        self.assertFalse(session['workEnabled'])
        self.assertEqual(self.core.settings()['status'], 'off')
        self.assertEqual(session['messages'][0]['text'], 'Comment avancer ?')
        client = self.app.clients[session['id']]
        turns = [params for method, params in client.calls if method == 'turn/start']
        self.assertIn('Préserver', turns[0]['input'][0]['text'])
        self.assertEqual(len(turns), 2)
        self.assertTrue(all(params['sandboxPolicy']['type'] == 'readOnly' for params in turns))
        self.core.control('start', True)
        self.assertFalse(self.core.supervised(session))

    def test_telegram_chat_uses_the_same_session_and_returns_assistant_reply(self):
        self.core.discussion.send({'projectId': 'atelier', 'text': 'Bonjour'})
        self.wait()
        session_id = self.app.store.all('duplicaChat')[0]['sessionId']
        relay = TelegramRelay(self.core, lambda *_: {})
        self.core.telegram = relay
        self.app.store.update('duplicaSettings', 'global', telegramEnabled=True)
        def message(text):
            return {'message': {'chat': {'type': 'private', 'id': 42}, 'from': {'id': 42}, 'text': text}}
        with patch.dict(os.environ, {'DUPLICA_TELEGRAM_CHAT_ID': '42', 'DUPLICA_TELEGRAM_BOT_TOKEN': 'fixture'}):
            self.assertIn('atelier', relay.handle_update(message('/project')))
            relay.handle_update(message('/project atelier'))
            self.assertIn('reçu', relay.handle_update(message('Explique le résultat.')))
            self.wait()
            self.assertEqual(self.app.store.all('duplicaChat')[0]['sessionId'], session_id)
            self.assertEqual(self.app.store.all('duplicaTelegram')[0]['text'], 'ok')
            self.assertEqual(self.app.store.get('session', session_id)['messages'][-2]['source'], 'telegram')

    def test_pairing_requires_the_private_sender_and_exact_short_lived_code(self):
        updates = []
        self.app.store.update('duplicaSettings', 'global', telegramBotUsername='ancien_bot', telegramOffset=900)
        relay = TelegramRelay(self.core, lambda method, payload: {'username': 'fixture_bot'} if method == 'getMe' else updates)
        self.core.telegram = relay
        pairing = relay.connect({'projectId': 'atelier', 'botToken': '123456:abcdefghijklmnopqrstuv'})
        self.assertEqual(relay.connection['offset'], 0)
        updates.append({'update_id': 10, 'message': {'chat': {'type': 'group', 'id': 42}, 'from': {'id': 42},
                                                  'text': '/start ' + pairing['pairingCode']}})
        self.assertFalse(relay.pair()['connected'])
        self.assertEqual(relay.connection['offset'], 11)
        updates.append({'update_id': 11, 'message': {'chat': {'type': 'private', 'id': 42}, 'from': {'id': 42},
                                                  'text': '/start ' + pairing['pairingCode']}})
        with patch.dict(os.environ, {}), patch('server.duplica_telegram.save_token') as persist, patch.object(relay, 'start'):
            self.assertTrue(relay.pair()['connected'])
            persist.assert_called_once()
            self.assertEqual(self.core.settings()['telegramChatId'], '42')
            self.assertEqual(self.core.settings()['telegramOffset'], 12)
            self.assertNotIn('abcdefghijklmnopqrstuv', json.dumps(self.core.snapshot()))
        with self.assertRaises(ValueError):
            relay.pair()

    @unittest.skipUnless(os.name == 'nt', 'Coffre Windows uniquement.')
    def test_windows_vault_encrypts_token_for_the_service_account(self):
        path = self.root / 'private-token.bin'
        token = 'fixture-only-token'
        save_token(path, token)
        self.assertNotIn(token.encode(), path.read_bytes())
        self.assertEqual(load_token(path), token)

    def test_bot_credential_is_not_inherited_by_agent_or_recipe_processes(self):
        with patch.dict(os.environ, {'DUPLICA_TELEGRAM_BOT_TOKEN': 'private-fixture', 'CODEX_CA_CERTIFICATE': 'public-fixture'}):
            environment = agent_environment()
            self.assertNotIn('DUPLICA_TELEGRAM_BOT_TOKEN', environment)
            self.assertEqual(environment['CODEX_CA_CERTIFICATE'], 'public-fixture')

    def test_work_button_is_scoped_and_does_not_reset_active_actions(self):
        self.core.work_on_project({'projectId': 'atelier'})
        generation = self.core.generation
        self.core.work_on_project({'projectId': 'atelier'})
        self.assertEqual(self.core.generation, generation)
        self.assertFalse(self.core.settings()['globalEnabled'])
        self.assertEqual(self.core.settings()['status'], 'active')

    def test_sprint_dates_and_project_membership_are_validated(self):
        with self.assertRaises(ValueError):
            self.app.upsert('sprint', {'title': 'Impossible', 'start': '2026-10-10', 'end': '2026-10-01'})
        project = self.app.upsert('project', {'name': 'Autre', 'path': str(self.root)})
        sprint = self.app.upsert('sprint', {'title': 'Autre sprint', 'projectId': project['id']})
        with self.assertRaises(ValueError):
            self.app.upsert('task', {'title': 'Mauvais rattachement', 'sprintId': sprint['id']})
        correct = self.app.upsert('sprint', {'title': 'Sprint valide', 'start': '2026-10-01', 'end': '2026-10-10'})
        task = self.app.upsert('task', {'title': 'Liée', 'sprintId': correct['id']})
        self.assertEqual(self.app.store.get('task', task['id'])['sprintId'], correct['id'])
