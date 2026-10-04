"""Duplica runner UI fixture: eight mini-tasks, a real four-worker barrier."""
import argparse
import json
import signal
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'tests'))
from run import make_handler
from server.app import Application
from server.store import uid
from test_application import FakeCodex

parser = argparse.ArgumentParser(description='Recette fictive du harnais Duplica, sans inférence.')
parser.add_argument('--port', type=int, default=4362)
args = parser.parse_args()
directory = ROOT / '.atelier' / 'duplica-harness-e2e' / uid('run')
workspace = directory / 'workspace'
workspace.mkdir(parents=True)
(workspace / 'fixture.txt').write_text('expected', encoding='utf-8')
barrier = threading.Barrier(4, timeout=30)
release = threading.Event()
metrics_lock = threading.Lock()
metrics = {'active': 0, 'peak': 0, 'arrivals': [], 'barrierPassed': []}
plan = [{'id': 'mini_' + str(index), 'title': 'Mini-tâche ' + str(index),
         'prompt': 'Fixture mini-task ' + str(index) + '. Confirme la lecture des preuves.',
         'dependsOn': [], 'files': ['mini/task_' + str(index) + '.txt']} for index in range(8)]
recipe = {'requirements': [{'path': 'fixture.txt', 'contains': 'expected'}],
          'tests': [sys.executable, '-c', 'print("harness-independent-tests")'],
          'buildNotApplicable': True,
          'gui': [{'kind': 'open_url', 'url': 'http://127.0.0.1:' + str(args.port) + '/hover.html'},
                  {'kind': 'hover', 'label': 'Architecture'},
                  {'kind': 'expect', 'text': 'Architecture accessible au survol'}]}


class HarnessCodex(FakeCodex):
    def rpc(self, method, params=None, **kwargs):
        if method != 'turn/start':
            return super().rpc(method, params, **kwargs)
        if params.get('outputSchema'):
            callback = self.callback
            output = json.dumps({'tasks': plan})
            def planned(event):
                if event.get('method') == 'item/agentMessage/delta':
                    event['params']['delta'] = output
                elif event.get('method') == 'item/completed':
                    event['params']['item']['text'] = output
                callback(event)
            self.callback = planned
            try:
                return super().rpc(method, params, **kwargs)
            finally:
                self.callback = callback
        text = params['input'][0]['text']
        if 'Fixture mini-task ' in text:
            index = int(text.split('Fixture mini-task ', 1)[1].split('.', 1)[0])
            self.callback({'method': 'turn/started', 'params': {'turn': {'id': 'turn_fixture'}}})
            threading.Thread(target=self.perform, args=(params, index), daemon=True).start()
            return {'turn': {'id': 'turn_fixture'}}
        return super().rpc(method, params, **kwargs)

    def perform(self, params, index):
        with metrics_lock:
            metrics['active'] += 1
            metrics['peak'] = max(metrics['peak'], metrics['active'])
            metrics['arrivals'].append(index)
        try:
            barrier.wait()
            with metrics_lock:
                metrics['barrierPassed'].append(index)
            if not release.wait(timeout=30) or self.closed:
                raise ValueError('Recette arrêtée avant libération des workers fictifs.')
            super().rpc('turn/start', params)
        except Exception as error:
            self.callback({'method': 'turn/completed', 'params': {'turn': {
                'id': 'turn_fixture', 'status': 'failed', 'error': {'message': str(error)}}}})
        finally:
            with metrics_lock:
                metrics['active'] -= 1


app = Application(ROOT, directory / 'data')
app.store.update('project', 'atelier', path=str(workspace), name='Duplica · harnais fictif')
app.provider.update(connected=True, installed=True, plan='Fournisseur fictif', models=[{
    'model': 'fixture-duplica', 'displayName': 'Duplica fictif', 'isDefault': True,
    'defaultReasoningEffort': 'medium',
    'supportedReasoningEfforts': [{'reasoningEffort': 'medium'}, {'reasoningEffort': 'max'}]}])
app.discover = lambda: app.provider
provider = patch('server.app.CodexClient', HarnessCodex)
provider.start()
BaseHandler = make_handler(app, 'duplica-harness-fixture-nonce')


class Handler(BaseHandler):
    def do_GET(self):
        if self.path == '/api/fixture':
            if self.allowed(api=True):
                with metrics_lock:
                    observed = dict(metrics)
                self.reply({'directory': str(directory), 'workspace': str(workspace),
                            'provider': 'fixture', 'metrics': observed, 'recipe': recipe})
        elif self.path == '/hover.html':
            content = ('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Recette survol Duplica</title>'
                       '<style>body{font:20px system-ui;background:#181a20;color:white;padding:60px}'
                       'button{font:inherit;padding:25px}</style><h1>Contrôle de libellé</h1>'
                       '<button aria-label="Architecture" onmouseenter="document.querySelector(\'#result\').textContent=\'Architecture accessible au survol\'">'
                       'Architecture</button><p id="result">Survolez le bouton.</p></html>').encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path in ('/api/fixture/release', '/api/fixture/shutdown'):
            if self.allowed(api=True):
                release.set()
                self.reply({'ok': True})
                if self.path.endswith('/shutdown'):
                    threading.Thread(target=server.shutdown, daemon=True).start()
        else:
            super().do_POST()


server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
server.daemon_threads = True
signal.signal(signal.SIGTERM, lambda *_: (release.set(), threading.Thread(target=server.shutdown, daemon=True).start()))
print('Duplica harness fixture ready on ' + str(args.port) + ' · ' + str(directory), flush=True)
try:
    server.serve_forever()
finally:
    release.set()
    app.shutdown()
    app.store.db.close()
    server.server_close()
    provider.stop()
