"""Real HTTP/backend/mobile-gateway recipe with a deterministic, isolated provider."""
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
from server.mobile_gateway import KeyStore, MobileGateway, create_server
from server.store import uid
from test_application import FakeCodex


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=0)
    args = parser.parse_args()
    evidence = ROOT / '.atelier' / 'mobile-browser-evidence'
    directory = evidence / uid('fixture')
    workspace = directory / 'workspace'
    second = directory / 'second-project'
    workspace.mkdir(parents=True)
    second.mkdir()
    (workspace / 'README.md').write_text('Projet de recette mobile fictive.\nPreuve de lecture via le PC.\n', encoding='utf-8')
    (workspace / 'src').mkdir()
    (workspace / 'src' / 'hello.txt').write_text('Bonjour depuis le répertoire du PC fictif.\n', encoding='utf-8')
    (workspace / '.env').write_text('PRIVATE_FIXTURE=must-not-be-visible\n', encoding='utf-8')
    (second / 'autre.txt').write_text('Ce fichier appartient au deuxième projet fictif.\n', encoding='utf-8')
    app = Application(workspace, directory / 'state')
    models = [{'model': name, 'displayName': name, 'isDefault': index == 0,
               'defaultReasoningEffort': 'medium',
               'supportedReasoningEfforts': [{'reasoningEffort': effort} for effort in ('low', 'medium', 'high')]}
              for index, name in enumerate(('fixture-mobile-code', 'fixture-mobile-review'))]
    app.provider.update(installed=True, connected=True, status='ready', models=models,
                        authType='fixture', plan='Fournisseur fictif — aucune inférence réelle')
    app.discover = lambda: app.provider
    second_project = app.upsert('project', {'name': 'Second projet fictif', 'path': str(second)})
    patcher = patch('server.app.CodexClient', FakeCodex)
    patcher.start()
    session = app.new_session({'name': 'Agent de recette fictive', 'model': models[0]['model'],
                               'sandbox': 'read-only', 'memory': False, 'planMode': True}, start=False)
    app.start_session(session['id'])
    app.on_event(session['id'], {'id': 71, 'method': 'item/commandExecution/requestApproval',
                                'params': {'command': 'fixture-read-only', 'reason': 'Demande fictive à refuser pour la recette.'}})
    backend = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(app, 'B' * 43))
    backend.daemon_threads = True
    keys = KeyStore(directory / 'gateway-key')
    gateway = MobileGateway(ROOT, 'http://127.0.0.1:' + str(backend.server_port), keys,
                            pc_name='PC de recette · fournisseur fictif')
    phone = create_server(gateway, '127.0.0.1', args.port)
    info = {'fixture': True, 'url': 'http://127.0.0.1:' + str(phone.server_port),
            'token': keys.key(), 'backend': 'http://127.0.0.1:' + str(backend.server_port),
            'sessionId': session['id'], 'secondProjectId': second_project['id'], 'directory': str(directory)}
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / 'fixture.json').write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')
    stopped = threading.Event()
    for event in (signal.SIGTERM, signal.SIGINT):
        signal.signal(event, lambda *_: stopped.set())
    for server in (backend, phone):
        threading.Thread(target=server.serve_forever, daemon=True).start()
    print(json.dumps({'fixture': True, 'url': info['url']}), flush=True)
    try:
        stopped.wait()
    finally:
        for server in (phone, backend):
            server.shutdown()
            server.server_close()
        app.shutdown()
        app.store.db.close()
        patcher.stop()


if __name__ == '__main__':
    main()
