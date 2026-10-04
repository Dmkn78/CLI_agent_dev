"""Isolated UX fixture: synthetic files, fake replies, no model inference."""
import argparse
import base64
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from run import make_handler
from server.app import Application
from server.store import uid
from test_application import FakeCodex

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=4332)
args = parser.parse_args()
directory = ROOT / '.atelier' / 'feedback-fixture' / uid('run')
app = Application(ROOT, directory)
project_files = directory / 'project'
project_files.mkdir()
resources = project_files / 'ressources'
resources.mkdir()
(resources / 'notes.md').write_text('Contexte synthétique pour la recette.', encoding='utf-8')
(resources / 'reference.png').write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0coAAAAASUVORK5CYII='))
skill = project_files / 'skills' / 'fixture-skill'
skill.mkdir(parents=True)
(skill / 'SKILL.md').write_text('Consigne synthétique : explique les vérifications.', encoding='utf-8')
agent_skill = project_files / '.agents' / 'skills' / 'fixture-agent-skill'
agent_skill.mkdir(parents=True)
(agent_skill / 'SKILL.md').write_text('Skill synthétique du projet : examiner les preuves.', encoding='utf-8')
app.store.update('project', 'atelier', path=str(project_files), name='Projet de recette')
app.provider.update(connected=True, installed=True, plan='Fournisseur fictif', models=[
    {'model': name, 'displayName': name, 'isDefault': index == 0, 'defaultReasoningEffort': 'medium',
     'supportedReasoningEfforts': [{'reasoningEffort': effort} for effort in ('low', 'medium', 'high')]}
    for index, name in enumerate(('fixture-code', 'fixture-review'))])
app.discover = lambda: app.provider
original_reply = app.channel_reply
def reply(participant, messages, purpose):
    if participant.get('roundMode') == 'auto' and purpose == 'discussion':
        return {'text': 'Réponse fictive : le résultat et les contrôles sont définis.\n[[ATELIER:READY]]'}
    return original_reply(participant, messages, purpose)
app.channel_reply = reply
provider_patch = patch('server.app.CodexClient', FakeCodex)
provider_patch.start()
session = app.new_session({'name': 'Agent à supprimer', 'model': 'fixture-code', 'planMode': False}, start=False)
app.start_session(session['id'])
app.prompt(session['id'], 'Réponse synthétique.')
app.notify('fixture:action', 'Autorisation ponctuelle nécessaire · recette', project_id='atelier', kind='action')
app.notify('fixture:error', 'Connexion du moteur interrompue · recette', project_id='atelier', kind='error')
app.notify('fixture:verified', 'Recette indépendante réussie · exemple fictif', project_id='atelier', kind='success')
server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(app, 'feedback-fixture-nonce'))
server.daemon_threads = True
print('Feedback fixture ready on ' + str(args.port), flush=True)
try:
    server.serve_forever()
finally:
    app.shutdown()
    server.server_close()
    provider_patch.stop()
