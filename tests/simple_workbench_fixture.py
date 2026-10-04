"""Isolated panel recipe. All replies and counters are explicitly synthetic."""
import argparse
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from run import make_handler
from server.app import Application
from server.native_usage import NativeUsage
from server.store import now, uid
from test_application import FakeCodex

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=4337)
args = parser.parse_args()
directory = ROOT / '.atelier' / 'simple-workbench-fixture' / uid('run')
app = Application(ROOT, directory)
class RecipeNativeUsage(NativeUsage):
    def refresh(self):
        super().refresh()
        for terminal in app.store.all('nativeSession'):
            if terminal.get('runtime') == 'codex' and terminal.get('usageSource') != 'fixture-native':
                app.store.update('nativeSession', terminal['id'], usageSource='fixture-native',
                    usage={'total': {'inputTokens': 140000, 'outputTokens': 15000, 'cachedInputTokens': 40000, 'totalTokens': 155000},
                           'last': {'inputTokens': 30000, 'outputTokens': 1000, 'totalTokens': 31000}, 'modelContextWindow': 500000})


app.native_usage = RecipeNativeUsage(app, directory / 'rollouts')

for identifier, name in [('atelier', 'Atelier · recette'), ('workspace-b', 'Projet B · recette')]:
    workspace = directory / identifier
    workspace.mkdir()
    resources = workspace / 'ressources'
    resources.mkdir()
    (resources / 'notes.md').write_text('# Notes de recette\n\nTexte synthétique de ce projet.', encoding='utf-8')
    app.store.put('project', {'id': identifier, 'name': name, 'path': str(workspace), 'createdAt': now()})
app.provider.update(connected=True, installed=True, plan='Fournisseur fictif', models=[
    {'model': name, 'displayName': name, 'isDefault': index == 0, 'defaultReasoningEffort': 'medium',
     'supportedReasoningEfforts': [{'reasoningEffort': 'medium'}]}
    for index, name in enumerate(('fixture-code', 'fixture-review'))])
app.omp_provider.update(installed=True, models=[{**app.provider['models'][0], 'provider': 'fixture'}])
app.discover = lambda: app.provider
provider_patch = patch('server.app.CodexClient', FakeCodex)
provider_patch.start()
app.store.put('workflow', {'id': 'fixture-team', 'projectId': 'atelier', 'title': 'Équipe de recette', 'status': 'running', 'steps': [], 'agents': {}})
for index, (name, status) in enumerate([('Revoir les panneaux', 'running'), ('Vérifier les contrôles', 'waiting'), ('Attendre une mission', 'ready')]):
    session = app.new_session({'name': name, 'model': 'fixture-code', 'memory': False,
                              'parentId': 'fixture-team' if index < 2 else None, 'planMode': False}, start=False)
    app.store.update('session', session['id'], status=status)
channel = app.channels.create({'projectId': 'atelier', 'name': 'Discussion de recette', 'topic': 'Comparer les panneaux et les preuves.'})
channel_record = app.store.get('channel', channel['id'])
for index in range(2):
    channel_record['messages'].append({'id': uid('message'), 'channelId': channel['id'], 'projectId': 'atelier',
        'author': 'Participant fictif', 'role': 'agent', 'text': 'Réponse synthétique pour la recette.', 'createdAt': now(),
        'usage': {'inputTokens': 90000, 'outputTokens': 10000, 'cachedInputTokens': 30000, 'totalTokens': 100000}})
app.store.put('channel', channel_record)
class RecipeServer(ThreadingHTTPServer):
    allow_reuse_address = False


server = RecipeServer(('127.0.0.1', args.port), make_handler(app, 'simple-workbench-fixture-nonce'))
server.daemon_threads = True
print('Simple workbench fixture ready on ' + str(args.port), flush=True)
try:
    server.serve_forever()
finally:
    app.shutdown()
    server.server_close()
    provider_patch.stop()
