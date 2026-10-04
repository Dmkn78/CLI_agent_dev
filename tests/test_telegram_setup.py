import json
import os
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

from server.app import Application
from server.duplica_telegram import TelegramRelay


TOKEN = '123456:abcdefghijklmnopqrstuv'


class TelegramSetupTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.environment = patch.dict(os.environ, {'DUPLICA_TELEGRAM_BOT_TOKEN': '', 'DUPLICA_TELEGRAM_CHAT_ID': ''})
        self.environment.start()
        self.app = Application(Path(self.directory.name))
        self.core = self.app.duplica
        self.updates, self.sent = [], []
        self.webhook = ''
        self.relay = TelegramRelay(self.core, self.transport)
        self.core.telegram = self.relay
        self.worker = patch.object(self.relay, 'start')
        self.worker.start()
        self.vault = patch('server.duplica_telegram.save_token')
        self.save_token = self.vault.start()
        self.app.provider['models'] = [{'model': 'fixture', 'isDefault': True}]

    def tearDown(self):
        self.app.shutdown()
        self.app.store.db.close()
        self.worker.stop()
        self.vault.stop()
        self.environment.stop()
        self.directory.cleanup()

    def transport(self, method, payload):
        if method == 'getMe':
            return {'username': 'fixture_bot'}
        if method == 'getWebhookInfo':
            return {'url': self.webhook}
        if method == 'getUpdates':
            return [update for update in self.updates if update['update_id'] >= payload.get('offset', 0)]
        self.sent.append((method, payload))
        return {'message_id': len(self.sent)}

    def message(self, text, chat=42, sender=42, kind='private'):
        return {'update_id': len(self.updates) + 1, 'message': {
            'text': text, 'chat': {'id': chat, 'type': kind}, 'from': {'id': sender}}}

    def connect(self):
        return self.relay.connect({'projectId': 'atelier', 'botToken': TOKEN})

    def pair(self):
        pairing = self.connect()
        self.updates.append(self.message('/start ' + pairing['pairingCode']))
        self.assertTrue(self.relay.pair({'pairingId': pairing['pairingId']})['connected'])
        return pairing

    def test_deep_link_is_short_lived_and_never_contains_the_bot_token(self):
        pairing = self.connect()
        self.assertEqual(pairing['deepLink'], 'https://t.me/fixture_bot?start=' + pairing['pairingCode'])
        self.assertLessEqual(len(pairing['pairingCode']), 64)
        self.assertNotIn(TOKEN, json.dumps(pairing) + json.dumps(self.core.snapshot()))
        self.updates.append(self.message('/start ' + pairing['pairingCode']))
        self.relay.connection['expires'] = 0
        self.assertTrue(self.relay.pair()['expired'])
        self.save_token.assert_not_called()
        self.assertFalse(self.relay.status()['configured'])

    def test_rotation_wrong_sender_group_and_non_ascii_code_cannot_pair(self):
        first = self.connect()
        second = self.relay.renew()
        self.assertNotEqual(first['pairingCode'], second['pairingCode'])
        with self.assertRaises(ValueError):
            self.relay.pair({'pairingId': first['pairingId']})
        for code, sender, kind in [(first['pairingCode'],42,'private'), (second['pairingCode'],43,'private'),
                                    (second['pairingCode'],42,'group'), ('échec',42,'private')]:
            self.updates.append(self.message('/start ' + code, sender=sender, kind=kind))
        self.assertFalse(self.relay.pair()['connected'])
        self.assertFalse(self.relay.status()['configured'])
        self.updates.append(self.message('/start ' + second['pairingCode']))
        self.updates.append(self.message('Mon premier message'))
        self.assertTrue(self.relay.pair()['connected'])
        self.assertEqual(self.core.settings()['telegramOffset'], self.updates[-1]['update_id'])
        self.assertEqual(self.core.settings()['status'], 'off')
        self.assertEqual(self.relay.status()['workSandbox'], 'read-only')
        with self.assertRaises(ValueError):
            self.relay.pair()

    def test_webhook_is_not_replaced_and_transport_errors_do_not_leak_credentials(self):
        self.webhook = 'https://example.com/bot'
        with self.assertRaisesRegex(ValueError, 'webhook'):
            self.connect()
        self.assertIsNone(self.relay.connection)
        self.assertFalse(self.sent)
        with patch.object(self.relay, 'transport', side_effect=ValueError('https://api.telegram.org/bot' + TOKEN)):
            with self.assertRaises(ValueError) as error:
                self.connect()
        self.assertNotIn(TOKEN, str(error.exception))
        self.assertIsNone(self.relay.connection)

    def test_work_obeys_explicit_model_and_project_permissions(self):
        self.pair()
        with patch.object(self.core, 'work_on_project', return_value={'sessionId': 'mission'}) as work:
            foreign = self.message('/work Interdit', chat=43, sender=43)
            self.assertEqual(self.relay.handle_update(foreign), 'ignored')
            work.assert_not_called()
            self.relay.handle_update(self.message('/work Diagnostiquer'))
            self.assertEqual(work.call_args.args[0], {'projectId': 'atelier', 'goal': 'Diagnostiquer',
                'model': 'fixture', 'sandbox': 'read-only'})
            self.relay.configure({'workSandbox': 'workspace-write', 'workModel': 'fixture'})
            self.relay.handle_update(self.message('/work Implémenter'))
            self.assertEqual(work.call_args.args[0]['sandbox'], 'workspace-write')
        project = self.app.upsert('project', {'name': 'Autre', 'path': self.directory.name})
        self.relay.handle_update(self.message('/project ' + project['id']))
        self.assertEqual(self.relay.status()['projectId'], project['id'])
        self.assertEqual(self.relay.status()['workSandbox'], 'read-only')
        self.assertIsNone(self.core.settings()['telegramSessionId'])
        for settings in ({'workSandbox': 'danger-full-access'}, {'enabled': 'yes'}, {'workModel': 'unknown'}):
            with self.assertRaises(ValueError):
                self.relay.configure(settings)

    def test_cancel_disconnect_and_late_reply_never_reach_a_new_account(self):
        self.connect()
        self.relay.cancel_pairing()
        self.assertIsNone(self.relay.connection)
        with self.assertRaises(ValueError):
            self.relay.pair()
        self.pair()
        recipient = self.relay.recipient()
        self.relay.enqueue_reply('old', 'Réponse à l’ancien compte', recipient)
        self.relay.disconnect()
        self.assertEqual(self.app.store.get('duplicaTelegram', 'reply:old')['status'], 'cancelled')
        self.assertFalse(self.relay.status()['configured'])
        self.assertNotIn('DUPLICA_TELEGRAM_BOT_TOKEN', os.environ)
        self.pair()
        os.environ['DUPLICA_TELEGRAM_CHAT_ID'] = '99'
        self.relay.enqueue_reply('late', 'Réponse tardive', recipient)
        self.assertFalse(any(message['id'] == 'reply:late' for message in self.app.store.all('duplicaTelegram')))
        self.relay.flush()
        self.assertFalse(self.sent)

    def test_disconnect_finishes_when_poll_worker_clears_its_reference(self):
        self.pair()
        polling, finish_poll = threading.Event(), threading.Event()

        def poll():
            polling.set()
            finish_poll.wait(timeout=2)

        with patch.object(self.relay, '_poll', side_effect=poll):
            worker = threading.Thread(target=self.relay._run)
            self.relay.thread = worker
            worker.start()
            self.assertTrue(polling.wait(timeout=2))
            join = worker.join

            def stop_poll(**options):
                finish_poll.set()
                join(**options)

            try:
                with patch.object(worker, 'join', side_effect=stop_poll):
                    status = self.relay.disconnect()
            finally:
                finish_poll.set()
                join(timeout=2)

        self.assertIsNone(self.relay.thread)
        self.assertFalse(status['configured'])
        self.assertFalse(status['enabled'])
        self.assertFalse(status['disconnecting'])

    def test_second_disconnect_cannot_clear_a_replacement_connection(self):
        self.pair()
        self.relay.disconnecting = True
        try:
            with self.assertRaisesRegex(ValueError, 'déjà en cours'):
                self.relay.disconnect()
            self.assertTrue(self.relay.disconnecting)
            self.assertTrue(self.relay.status()['configured'])
        finally:
            self.relay.disconnecting = False


if __name__ == '__main__':
    unittest.main()
