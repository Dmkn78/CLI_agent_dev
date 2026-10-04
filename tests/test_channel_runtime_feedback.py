"""Transport counters remain truthful when an API responds after cancellation."""
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace

from server.channel_runtime import ChannelRuntime
from server.store import Store


class ChannelRuntimeFeedbackTests(unittest.TestCase):
    def test_cancelled_api_call_keeps_measured_usage_without_publishing_reply(self):
        with tempfile.TemporaryDirectory() as directory:
            store = Store(Path(directory))
            store.put('channel', {'id': 'channel', 'status': 'running', 'runId': 'run'})
            entered, release = threading.Event(), threading.Event()
            errors = []

            def provider_reply(*arguments):
                entered.set()
                release.wait(3)
                return {'text': 'Late public reply', 'usage': {'totalTokens': 7}}

            app = SimpleNamespace(store=store, api_connections=SimpleNamespace(reply=provider_reply))
            runtime = ChannelRuntime(app)
            participant = {'id': 'participant', 'channelId': 'channel', 'projectId': 'atelier',
                'runId': 'run', 'name': 'API peer', 'role': 'agent', 'topic': 'Fixture topic',
                'configuration': {'runtime': 'api', 'provider': 'fixture', 'model': 'fixture'}}

            def worker():
                try:
                    runtime.reply(participant, [], 'discussion')
                except ValueError as error:
                    errors.append(str(error))

            thread = threading.Thread(target=worker)
            thread.start()
            try:
                self.assertTrue(entered.wait(2))
                store.update('channel', 'channel', status='stopped', runId=None)
            finally:
                release.set()
                thread.join(3)
            self.assertFalse(thread.is_alive())
            self.assertEqual(errors, ['Discussion interrompue.'])
            request = store.all('request')[0]
            self.assertEqual(request['status'], 'interrupted')
            self.assertEqual(request['usage'], {'totalTokens': 7})
            self.assertNotIn('Late public reply', str(request))
            store.db.close()
