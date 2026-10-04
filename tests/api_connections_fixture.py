"""Isolated API connection UI recipe with a typed, deterministic LM Studio fixture."""
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from run import make_handler
from server.app import Application
from server.store import uid
from test_api_connections import FixtureApi


class CatalogFixture(FixtureApi):
    def do_GET(self):
        if self.path == '/fixture/requests':
            self.respond({'requests': self.server.requests})
        else:
            super().do_GET()


def main():
    app = Application(ROOT, ROOT / '.atelier' / 'api-connection-evidence' / uid('fixture'))
    app.discover = lambda: app.provider
    fake_api = ThreadingHTTPServer(('127.0.0.1', 4339), CatalogFixture)
    fake_api.base = 'http://127.0.0.1:4339'
    fake_api.requests, fake_api.response_override, fake_api.status_override = [], None, 200
    fake_api.get_response_overrides = {
        '/v1/models': ({'data': [{'id': 'fixture-chat'}, {'id': 'fixture-embedding'}]}, 200),
        '/api/v1/models': ({'models': [
            {'type': 'llm', 'key': 'fixture-chat', 'display_name': 'Modèle de conversation fictif',
             'loaded_instances': [{'id': 'fixture-chat'}]},
            {'type': 'embedding', 'key': 'fixture-embedding', 'display_name': 'Embedding fictif',
             'loaded_instances': []}]}, 200),
    }
    fake_api.daemon_threads = True
    threading.Thread(target=fake_api.serve_forever, daemon=True).start()
    server = ThreadingHTTPServer(('127.0.0.1', 4338), make_handler(app, 'api-connections-fixture-nonce'))
    server.daemon_threads = True
    print('API connections fixture ready at http://127.0.0.1:4338', flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        app.shutdown()
        fake_api.shutdown()
        fake_api.server_close()


if __name__ == '__main__':
    main()
