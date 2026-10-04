"""Automatic quota recipe using only a deterministic local provider."""
import argparse
import json
import sys
import tempfile
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from run import make_handler
from server.app import Application
from server.codex import CodexError


class QuotaProvider:
    def __init__(self):
        self.phase = 'initial'
        self.calls = []
        self.closed = False
        self.lock = threading.Lock()
        self.process = SimpleNamespace(poll=lambda: 0 if self.closed else None)

    def rpc(self, method, params=None, **kwargs):
        with self.lock:
            self.calls.append(method)
            phase = self.phase
        if method != 'account/rateLimits/read':
            raise AssertionError('Unexpected provider method: ' + method)
        if phase == 'error':
            raise CodexError('Erreur réseau fictive <preuve> ; aucun compte réel utilisé.')
        used = {'initial': 25, 'success': 42, 'recovery': 61}[phase]
        return {'rateLimitsByLimitId': {'codex': {
            'limitId': 'codex', 'limitName': 'Codex · fournisseur fictif',
            'primary': {'usedPercent': used, 'windowDurationMins': 300,
                        'resetsAt': 1791046800},
            'secondary': {'usedPercent': 18, 'windowDurationMins': 10080,
                          'resetsAt': 1791565200}}}}

    def close(self):
        self.closed = True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4347)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='atelier-quota-fixture-') as directory:
        app = Application(ROOT, Path(directory), limits_refresh_interval=2)
        provider = QuotaProvider()
        app.discovery = provider
        app.provider.update(connected=True, installed=True, authType='fixture',
                            plan='Abonnement fictif', status='ready', models=[])
        app.discover = lambda: app.provider
        app.native_usage.refresh = lambda: None
        app.official_tariffs.refresh = lambda **kwargs: app.official_tariffs.snapshot()
        app.refresh_limits()
        # The actual scheduler is accelerated for this recipe, while UI exercises
        # the production ten-minute message. No real subscription is accessed.
        app.provider['limitsRefreshIntervalSeconds'] = 600
        base = make_handler(app, 'quota-refresh-fixture-nonce')

        class Handler(base):
            def do_GET(self):
                if self.path == '/api/fixture/quotas':
                    if self.allowed(api=True):
                        with provider.lock:
                            self.reply({'phase': provider.phase,
                                        'calls': list(provider.calls)})
                    return
                super().do_GET()

            def do_POST(self):
                if self.path == '/api/fixture/quotas':
                    if not self.allowed(api=True):
                        return
                    data = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))))
                    phase = data.get('phase')
                    if phase not in ('initial', 'success', 'error', 'recovery'):
                        self.reply({'error': 'Unknown fixture phase'}, 400)
                        return
                    with provider.lock:
                        provider.phase = phase
                    self.reply({'phase': phase})
                    return
                super().do_POST()

        server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
        server.daemon_threads = True
        print('Quota refresh fixture ready on ' + str(args.port), flush=True)
        try:
            server.serve_forever()
        finally:
            server.server_close()
            app.shutdown()


if __name__ == '__main__':
    main()
