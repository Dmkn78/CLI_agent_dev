"""Deterministic agent, real subprocess tests, and real Electron input for acceptance."""
import json
import argparse
import csv
import subprocess
import signal
import sys
import tempfile
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'tests'))
from server.app import Application
from server.store import uid
from run import make_handler
from test_application import FakeCodex
from server.codex import CodexClient

parser = argparse.ArgumentParser(description='Recette Duplica : fournisseur fictif par défaut.')
parser.add_argument('--real-model', help='Inférence réelle explicitement demandée, modèle exact découvert obligatoire.')
parser.add_argument('--contribution', action='store_true', help='Contribution produit bornée, avec modèle réel explicitement autorisé.')
args = parser.parse_args()
if args.contribution and not args.real_model:
    parser.error('--contribution exige --real-model, sans fournisseur fictif.')

DIRECTORY = ROOT / '.atelier' / 'duplica-e2e' / uid('run')
WORKSPACE = DIRECTORY / 'workspace'
if args.real_model:
    WORKSPACE = Path(tempfile.mkdtemp(prefix='duplica-synthetic-'))
WORKSPACE.mkdir(parents=True, exist_ok=True)
if args.real_model and sys.platform == 'win32':
    # The temporary folder otherwise inherits OWNER RIGHTS only: files created by
    # CodexSandboxOffline would be unreadable to the fixture's original account.
    # Grant that account inherited access only to this newly created synthetic folder.
    if not WORKSPACE.resolve().is_relative_to(Path(tempfile.gettempdir()).resolve()) or not WORKSPACE.name.startswith('duplica-synthetic-'):
        raise ValueError('Dossier synthétique hors du répertoire temporaire.')
    identity = subprocess.run(['whoami', '/user', '/fo', 'csv', '/nh'], capture_output=True, text=True, check=True)
    identity_sid = next(csv.reader(identity.stdout.splitlines()))[1]
    subprocess.run(['icacls', str(WORKSPACE), '/grant', '*' + identity_sid + ':(OI)(CI)M'], capture_output=True, check=True)


class DemoCodex(FakeCodex):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.received = {}
        self.condition = threading.Condition()

    def rpc(self, method, params=None, **kwargs):
        if method != 'turn/start':
            return super().rpc(method, params, **kwargs)
        self.calls.append((method, params))
        self.turn_count += 1
        turn_id = 'demo_turn_' + str(self.turn_count)
        self.callback({'method': 'turn/started', 'params': {'turn': {'id': turn_id}}})
        threading.Thread(target=self.perform, args=(turn_id, self.turn_count), daemon=True).start()
        return {'turn': {'id': turn_id}}

    def request(self, request_id, method, parameters):
        self.callback({'id': request_id, 'method': method, 'params': parameters})
        with self.condition:
            if not self.condition.wait_for(lambda: request_id in self.received or self.closed, timeout=40):
                raise ValueError('La réponse Duplica n’est pas arrivée.')
            if self.closed:
                raise ValueError('Fournisseur fictif arrêté.')
            return self.received[request_id]

    def perform(self, turn_id, count):
        try:
            if count == 1:
                permission = self.request(101, 'item/commandExecution/requestApproval', {'command': 'npm test', 'cwd': str(WORKSPACE), 'reason': 'Exécuter les tests locaux fictifs'})
                if permission.get('decision') != 'accept':
                    raise ValueError('Permission refusée.')
                answer = self.request(102, 'item/tool/requestUserInput', {'questions': [{'id': 'format', 'question': 'Quel format doit utiliser l’export ?'}]})
                if answer.get('answers', {}).get('format', {}).get('answers') != ['CSV']:
                    raise ValueError('La mémoire utilisateur n’a pas fourni CSV.')
                (WORKSPACE / 'export.html').write_text('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Export de recette Duplica</title><style>body{font:18px system-ui;background:#15171b;color:#e8edf4;padding:40px}button,input{font:inherit;padding:12px;margin:10px}</style><h1>Export CSV</h1><label>Nom du fichier <input aria-label="Nom du fichier"></label><button onclick="document.querySelector(\'#result\').textContent=\'Erreur export\'">Exporter</button><p id="result">Prêt à exporter</p></html>', encoding='utf-8')
                tests = WORKSPACE / 'tests'
                tests.mkdir()
                (tests / 'test_export.py').write_text('import unittest\nfrom pathlib import Path\nclass ExportTests(unittest.TestCase):\n def test_implementation_exists(self):\n  self.assertIn("Export CSV", Path("export.html").read_text(encoding="utf-8"))\n', encoding='utf-8')
            elif count == 2:
                (WORKSPACE / 'receipt.txt').write_text('CSV', encoding='utf-8')
            else:
                path = WORKSPACE / 'export.html'
                path.write_text(path.read_text(encoding='utf-8').replace('Erreur export', 'Export réussi'), encoding='utf-8')
            text = 'Implementation complete.'
            self.callback({'method': 'item/completed', 'params': {'item': {'id': 'demo_message_' + str(count), 'type': 'agentMessage', 'text': text}}})
            self.callback({'method': 'turn/completed', 'params': {'turn': {'id': turn_id, 'status': 'completed'}}})
        except Exception as error:
            self.callback({'method': 'turn/completed', 'params': {'turn': {'id': turn_id, 'status': 'failed', 'error': {'message': str(error)}}}})

    def respond(self, request_id, result):
        super().respond(request_id, result)
        with self.condition:
            self.received[request_id] = result
            self.condition.notify_all()

    def close(self):
        super().close()
        with self.condition:
            self.condition.notify_all()


app = Application(ROOT, DIRECTORY / 'data')
app.store.update('project', 'atelier', path=str(WORKSPACE), name='Recette synthétique Duplica' if args.real_model else 'Recette Duplica fictive')
patcher = None
model, effort = 'fixture-duplica', 'medium'
if args.real_model:
    app.discovery = CodexClient(app.on_provider_event)
    models, cursor = [], None
    while True:
        page = app.discovery.rpc('model/list', {'includeHidden': True, **({'cursor': cursor} if cursor else {})})
        models.extend(page.get('data', []))
        cursor = page.get('nextCursor')
        if not cursor:
            break
    selected = next((entry for entry in models if entry['model'] == args.real_model), None)
    if not selected:
        app.shutdown()
        raise ValueError('Modèle demandé absent. Aucun remplacement, aucune inférence.')
    model = selected['model']
    effort = 'low' if any(entry['reasoningEffort'] == 'low' for entry in selected['supportedReasoningEfforts']) else selected['defaultReasoningEffort']
    app.provider.update(connected=bool(app.discovery.rpc('account/read', {'refreshToken': False}).get('account')), installed=True, models=models)
else:
    app.provider.update(connected=True, installed=True, models=[{'model': model, 'displayName': 'Fournisseur fictif Duplica',
        'isDefault': True, 'defaultReasoningEffort': effort, 'supportedReasoningEfforts': [{'reasoningEffort': effort}]}])
    patcher = patch('server.app.CodexClient', DemoCodex)
    patcher.start()
goal = 'Développer un export CSV utilisable'
if args.real_model:
    goal = ('Démonstration synthétique autorisée de Duplica dans ce dossier temporaire uniquement. Aucun secret, fichier personnel, réseau, Git ou sous-agent. '
        'Crée export.html, en français, avec h1 Export CSV, un input aria-label="Nom du fichier", un bouton visible de libellé exact Exporter et p id=result. '
        'Au PREMIER tour seulement, le clic doit volontairement afficher Erreur export, jamais Export réussi : c’est un défaut contrôlé pour prouver la détection indépendante. '
        'Ne crée pas encore receipt.txt au premier tour. Crée tests/test_export.py avec unittest vérifiant seulement que export.html existe et contient Export CSV. '
        'Le test lit le fichier en UTF-8 depuis le dossier courant. Ne lance pas les tests : Duplica les exécutera indépendamment. '
        'Termine ce premier tour. Lors des relances avec des preuves d’échec, corrige les écarts : crée receipt.txt contenant CSV et rends le bouton fonctionnel, '
        'il doit alors afficher exactement Export réussi. Conserve l’implémentation existante. Aucun fichier extérieur au dossier temporaire ne doit être lu ou modifié.')
contribution_recipe = None
if args.contribution:
    from usage_contribution import prepare_usage_contribution
    goal, contribution_recipe = prepare_usage_contribution(WORKSPACE)
session = app.new_session({'model': model, 'effort': effort, 'name': 'Compteurs confiés à Duplica' if args.contribution else 'Export supervisé', 'mission': goal,
                           'memory': False, 'sandbox': 'workspace-write', 'planMode': False}, start=False)
app.start_session(session['id'])
recipe = {'requirements': [{'path': 'export.html', 'contains': 'Export CSV'}, {'path': 'receipt.txt', 'contains': 'CSV'}],
          'tests': [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'], 'buildNotApplicable': True,
          'application': [sys.executable, '-m', 'http.server', '4329', '--bind', '127.0.0.1'],
          'gui': [{'kind': 'open_url', 'url': 'http://127.0.0.1:4329/export.html'},
                  {'kind': 'click', 'label': 'Nom du fichier'}, {'kind': 'type_text', 'text': 'export.csv'},
                  {'kind': 'click', 'label': 'Exporter'}, {'kind': 'expect', 'text': 'Export réussi'}]}
BaseHandler = make_handler(app, 'duplica-e2e-nonce')
if contribution_recipe:
    recipe = contribution_recipe


class DemoHandler(BaseHandler):
    def do_GET(self):
        if self.path == '/api/fixture':
            if self.allowed(api=True):
                self.reply({'sessionId': session['id'], 'recipe': recipe, 'directory': str(DIRECTORY), 'goal': goal,
                            'provider': 'contribution' if args.contribution else 'real' if args.real_model else 'fixture',
                            'model': model, 'workspace': str(WORKSPACE)})
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/fixture/shutdown':
            if self.allowed(api=True):
                self.reply({'ok': True})
                threading.Thread(target=server.shutdown, daemon=True).start()
        else:
            super().do_POST()


server = ThreadingHTTPServer(('127.0.0.1', 4328), DemoHandler)
server.daemon_threads = True
signal.signal(signal.SIGTERM, lambda *_: threading.Thread(target=server.shutdown, daemon=True).start())
print('Duplica acceptance ready · ' + ('real ' + model if args.real_model else 'fixture') + ' · ' + str(DIRECTORY), flush=True)
try:
    server.serve_forever()
finally:
    app.shutdown()
    app.store.db.close()
    server.server_close()
    if patcher:
        patcher.stop()
