"""Workspace/dashboard acceptance data only; no real provider or user data."""
import argparse
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from run import make_handler
from server.app import Application
from server.native_usage import NativeUsage
from server.store import now, uid

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=4335)
args = parser.parse_args()
directory = ROOT / '.atelier' / 'workspace-fixture' / uid('run')
app = Application(ROOT, directory)
app.native_usage = NativeUsage(app, directory / 'rollouts')
for identifier, name in [('atelier', 'Atelier · recette'), ('workspace-b', 'Projet B · recette')]:
    workspace = directory / identifier
    workspace.mkdir()
    app.store.put('project', {'id': identifier, 'name': name, 'path': str(workspace), 'createdAt': now()})
app.provider.update(connected=True, installed=True, plan='Fournisseur fictif', models=[
    {'model': 'fixture-code', 'displayName': 'Modèle fictif', 'isDefault': True,
     'defaultReasoningEffort': 'medium', 'supportedReasoningEfforts': [{'reasoningEffort': 'medium'}]}])
app.discover = lambda: app.provider
app.store.put('workflow', {'id': 'fixture-team', 'projectId': 'atelier', 'title': 'Équipe de recette', 'status': 'running', 'steps': [], 'agents': {}})
for index, (name, status) in enumerate([('Implémenter les workspaces', 'running'), ('Vérifier les panneaux', 'waiting'), ('Auditer la projection', 'ready'), ('Attendre une mission', 'ready')]):
    session = app.new_session({'name': name, 'model': 'fixture-code', 'mission': name, 'memory': False,
        'parentId': 'fixture-team' if index < 3 else None, 'planMode': False}, start=False)
    app.store.update('session', session['id'], status=status, lastTurnStatus='completed' if index == 2 else None,
        lastCompletedAt=now() if index == 2 else None, lastTurnDurationMs=17000 if index == 2 else None)
session = app.new_session({'name': 'Agent du projet B', 'projectId': 'workspace-b', 'model': 'fixture-code', 'memory': False}, start=False)
app.store.update('session', session['id'], status='ready')
server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(app, 'workspace-fixture-nonce'))
server.daemon_threads = True
print('Workspace fixture ready on ' + str(args.port), flush=True)
try:
    server.serve_forever()
finally:
    app.shutdown()
    server.server_close()
