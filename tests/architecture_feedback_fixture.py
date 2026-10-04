"""Isolated architecture and Duplica lifecycle fixture. No provider calls."""
import json
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

PROPOSAL = {'title': 'Architecture de recette', 'explanation': 'Un projet local relié à ses preuves.',
            'graph': {'nodes': [{'id': 'p', 'type': 'rect', 'x': 150, 'y': 180, 'text': 'Projet'},
                                {'id': 'r', 'type': 'rect', 'x': 480, 'y': 180, 'text': 'Preuves'}],
                      'edges': [{'id': 'e', 'sourceNodeId': 'p', 'targetNodeId': 'r', 'type': 'polyline', 'text': 'Résultats observés'}]}}


class FeedbackCodex(FakeCodex):
    def __init__(self, callback=None, **kwargs):
        def event(message):
            if message.get('method') == 'item/agentMessage/delta':
                message['params']['delta'] = json.dumps(PROPOSAL)
            if message.get('method') == 'item/completed' and message['params'].get('item', {}).get('type') == 'agentMessage':
                message['params']['item']['text'] = json.dumps(PROPOSAL)
            callback(message)
        super().__init__(event, **kwargs)

    def rpc(self, method, params=None, **kwargs):
        if method == 'turn/start' and 'présente-toi' in params['input'][0]['text']:
            def reply():
                time.sleep(0.8)
                FakeCodex.rpc(self, method, params, **kwargs)
            threading.Thread(target=reply, daemon=True).start()
            return {'turn': {'id': 'turn_fixture'}}
        return super().rpc(method, params, **kwargs)


app = Application(ROOT, ROOT / '.atelier' / 'architecture-feedback-fixture' / uid('run'))
app.provider.update(connected=True, installed=True, plan='Fournisseur fictif', models=[
    {'model': 'fixture-code', 'displayName': 'Fournisseur fictif', 'isDefault': True, 'defaultReasoningEffort': 'medium',
     'supportedReasoningEfforts': [{'reasoningEffort': 'medium'}]}])
app.discover = lambda: app.provider
patcher = patch('server.app.CodexClient', FeedbackCodex)
patcher.start()
session = app.new_session({'model': 'fixture-code', 'purpose': 'architecture', 'name': 'Conception · recette',
                           'mission': 'Propose une architecture sans modifier les fichiers.'}, start=False)
app.start_session(session['id'])
app.prompt(session['id'], 'Propose une architecture.')
server = ThreadingHTTPServer(('127.0.0.1', 4351), make_handler(app, 'architecture-fixture-nonce'))
server.daemon_threads = True
print('Architecture fixture ready on 4351', flush=True)
try:
    server.serve_forever()
finally:
    app.shutdown()
    server.server_close()
    patcher.stop()
