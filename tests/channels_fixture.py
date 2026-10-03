"""Isolated browser recipe with fake Codex, chat API and SystemOne servers."""
import argparse
import sys
import threading
import time
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server.app import Application
from server.store import uid
from run import make_handler
from test_application import FakeCodex
from test_api_connections import FixtureApi


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4324)
    parser.add_argument('--api-port', type=int, default=4325)
    parser.add_argument('--reply-delay', type=float, default=0)
    args = parser.parse_args()
    app = Application(ROOT, ROOT / '.atelier' / 'channels-browser-fixture' / uid('run'))
    models = [{'model': name, 'displayName': name, 'isDefault': index == 0,
               'defaultReasoningEffort': 'medium',
               'supportedReasoningEfforts': [{'reasoningEffort': effort} for effort in ('low','medium','high')]}
              for index, name in enumerate(('fixture-code', 'fixture-review'))]
    app.provider.update(connected=True, installed=True, models=models, authType='fixture', plan='Fournisseur fictif')
    app.discover = lambda: app.provider
    if args.reply_delay:
        native_reply = app.channel_reply

        def delayed_reply(*arguments):
            time.sleep(min(max(args.reply_delay, 0), 5))
            return native_reply(*arguments)

        app.channel_reply = delayed_reply
    fake_api = ThreadingHTTPServer(('127.0.0.1', args.api_port), FixtureApi)
    fake_api.base = 'http://127.0.0.1:' + str(args.api_port)
    fake_api.requests, fake_api.response_override, fake_api.status_override = [], None, 200
    fake_api.daemon_threads = True
    threading.Thread(target=fake_api.serve_forever, daemon=True).start()
    worker = app.new_session({'name': 'Agent existant fictif', 'model': 'fixture-code',
        'mission': 'PRIVATE_BROWSER_ORIGINAL_MISSION', 'sandbox': 'workspace-write'}, start=False)
    app.store.update('session', worker['id'], messages=[{'id':'original','role':'assistant',
        'text':'PRIVATE_BROWSER_ORIGINAL_RESPONSE','ts':worker['createdAt']}])
    with patch('server.app.CodexClient', FakeCodex):
        server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(app, 'channels-fixture-nonce'))
        server.daemon_threads = True
        print('Channels browser fixture ready', flush=True)
        try:
            server.serve_forever()
        finally:
            server.server_close()
            app.shutdown()
            fake_api.shutdown()
            fake_api.server_close()


if __name__ == '__main__':
    main()
