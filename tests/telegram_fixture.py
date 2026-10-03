"""Local Telegram/agent simulators for UI acceptance; never contacts Telegram or Codex."""
import json
import os
import sys
import threading
import time
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from run import make_handler
from server.app import Application
from server.store import uid
from test_application import FakeCodex

environment = patch.dict(os.environ, {'DUPLICA_TELEGRAM_BOT_TOKEN': '', 'DUPLICA_TELEGRAM_CHAT_ID': ''})
environment.start()
directory = ROOT / '.atelier' / 'telegram-fixture' / uid('run')
app = Application(ROOT, directory)
project_files = directory / 'project'
project_files.mkdir()
app.store.update('project', 'atelier', name='Atelier · recette fictive', path=str(project_files))
app.store.put('project', {'id': 'fixture-other', 'name': 'Autre espace de travail', 'path': str(project_files)})
app.provider.update(connected=True, installed=True, plan='Fournisseur fictif', models=[{
    'model': 'fixture-code', 'displayName': 'Modèle de recette', 'isDefault': True,
    'defaultReasoningEffort': 'medium', 'supportedReasoningEfforts': [{'reasoningEffort': 'medium'}]}])
app.discover = lambda: app.provider
provider = patch('server.app.CodexClient', FakeCodex)
provider.start()
updates, sent = [], []
for index in range(4):
    app.new_session({'model': 'fixture-code', 'name': ['Analyse', 'Implémentation', 'Vérification', 'Mission Duplica'][index]}, start=False)
app.upsert('task', {'title': 'Valider le parcours Telegram', 'status': 'todo'})


def transport(method, payload):
    if method == 'getMe':
        return {'username': 'duplica_fixture_bot'}
    if method == 'getWebhookInfo':
        return {'url': ''}
    if method == 'getUpdates':
        if payload.get('timeout'):
            time.sleep(.15)
        return [entry for entry in updates if entry['update_id'] >= payload.get('offset', 0)]
    sent.append({'method': method, **payload})
    return {'message_id': len(sent)}


app.duplica.telegram.transport = transport
BaseHandler = make_handler(app, 'telegram-fixture-nonce')


class Handler(BaseHandler):
    def do_POST(self):
        if self.path == '/api/fixture/telegram':
            if not self.allowed(api=True):
                return
            payload = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            updates.append({'update_id': len(updates) + 1, 'message': {'text': payload['text'],
                'chat': {'type': 'private', 'id': payload.get('chatId', 42)}, 'from': {'id': payload.get('chatId', 42)}}})
            self.reply({'queued': True})
        elif self.path == '/api/fixture/shutdown':
            if self.allowed(api=True):
                self.reply({'ok': True})
                threading.Thread(target=server.shutdown, daemon=True).start()
        else:
            super().do_POST()

    def do_GET(self):
        if self.path == '/api/fixture/telegram':
            if self.allowed(api=True):
                self.reply({'sent': sent, 'updates': len(updates)})
        else:
            super().do_GET()


server = ThreadingHTTPServer(('127.0.0.1', 4336), Handler)
server.daemon_threads = True
print('Telegram fixture ready on 4336 · no external API calls', flush=True)
try:
    server.serve_forever()
finally:
    app.shutdown()
    app.store.db.close()
    server.server_close()
    provider.stop()
    environment.stop()
