"""History pages preserve long discussions behind the existing local nonce."""
import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from run import make_handler
from server.channels import ChannelHub
from test_channels import FakeChannelApplication


class ChannelHistoryHttpTests(unittest.TestCase):
    def test_long_history_pages_are_complete_and_require_local_session(self):
        with tempfile.TemporaryDirectory() as temporary:
            app = FakeChannelApplication(Path(temporary))
            app.channels = ChannelHub(app)
            app.state = lambda: {'discussions': app.channels.snapshot()}
            channel = app.channels.create({'name': 'Archive fictive', 'topic': 'Conserver tous les échanges.'})
            texts = [('Message %04d · ' % index + 'preuve ' * 75).rstrip() for index in range(530)]
            expected = [app.channels.post_message(channel['id'], {'text': text}) for text in texts]
            server = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(app, 'history-fixture'))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = 'http://127.0.0.1:' + str(server.server_port)

            def api(route, query=None, authenticated=True):
                url = base + '/api/' + route + ('?' + urlencode(query) if query else '')
                request = Request(url, headers={'X-Atelier-Token': 'history-fixture'} if authenticated else {})
                with urlopen(request, timeout=5) as response:
                    return json.load(response)

            try:
                with self.assertRaises(HTTPError) as denied:
                    api('channels/history', {'id': channel['id']}, authenticated=False)
                self.assertEqual(denied.exception.code, 403)
                snapshot = api('state')['discussions']
                recent = snapshot['messages']
                metadata = snapshot['channels'][0]['history']
                self.assertEqual(metadata['messageCount'], len(texts))
                self.assertEqual(metadata['messageCharacters'], sum(map(len, texts)))
                self.assertLessEqual(len(recent), 120)
                self.assertLessEqual(sum(len(message['text']) for message in recent), 240000)
                self.assertTrue(metadata['hasMore'])
                collected, before = [], None
                while True:
                    query = {'id': channel['id'], 'limit': 73}
                    if before is not None:
                        query['before'] = before
                    page = api('channels/history', query)
                    self.assertEqual(page['channelId'], channel['id'])
                    self.assertLessEqual(len(page['messages']), 73)
                    self.assertEqual(page['history']['messageCount'], len(texts))
                    collected = page['messages'] + collected
                    if not page['history']['hasMore']:
                        break
                    cursor = page['history']['before']
                    if before is not None:
                        self.assertLess(cursor, before)
                    before = cursor
                self.assertEqual([message['id'] for message in collected], [message['id'] for message in expected])
                self.assertEqual([message['text'] for message in collected], texts)
                forward, after = [], 1
                while True:
                    page = api('channels/history', {'id': channel['id'], 'limit': 71, 'after': after})
                    forward.extend(page['messages'])
                    self.assertTrue(all(message['sequence'] > after for message in page['messages']))
                    if not page['history']['hasNewer']:
                        break
                    self.assertGreater(page['history']['after'], after)
                    after = page['history']['after']
                self.assertEqual([message['id'] for message in forward], [message['id'] for message in expected[1:]])
                self.assertEqual(api('channels/rounds', {'id': channel['id']})['rounds'], [])
                for bad in ({'id': 'missing'}, {'id': channel['id'], 'before': '1.5'},
                            {'id': channel['id'], 'limit': 'oops'},
                            {'id': channel['id'], 'before': 3, 'after': 1}):
                    with self.assertRaises(HTTPError) as invalid:
                        api('channels/history', bad)
                    self.assertEqual(invalid.exception.code, 400)
                self.assertEqual(app.calls, [])
            finally:
                server.shutdown()
                thread.join(timeout=3)
                server.server_close()
                app.channels.close()
                app.store.db.close()


if __name__ == '__main__':
    unittest.main()
