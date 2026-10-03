"""Browser fixture for My Brain. All sources, notes and APIs are synthetic."""
import argparse
import json
import signal
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server.app import Application
from server.store import uid
from run import make_handler
from test_brain import BrainApiFixture


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4354)
    args = parser.parse_args()
    data = ROOT / '.atelier' / 'brain-browser-fixture' / uid('run')
    data.mkdir(parents=True)
    vault, inbox = data / 'my_brain', data / 'voice-inbox'
    vault.mkdir()
    inbox.mkdir()
    (vault / 'projet.md').write_text('---\ntopics: ["Obsidian", "mémoire"]\n---\n# Projet second cerveau\n\nLes notes gardent les idées du projet.', encoding='utf-8')
    api = ThreadingHTTPServer(('127.0.0.1', 0), BrainApiFixture)
    api.daemon_threads = True
    api.base = 'http://127.0.0.1:' + str(api.server_port)
    api.calls, api.override = [], None
    api.transcript = 'Mon obsidienne garde ma mémoire. RLCD est ambigu.'
    api.received, api.release = threading.Event(), threading.Event()
    api.release.set()
    threading.Thread(target=api.serve_forever, daemon=True).start()
    app = Application(ROOT, data / 'state')
    app.provider.update(installed=True, connected=True, models=[], plan='Fournisseur fictif')
    app.discover = lambda: app.provider
    server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(app, 'brain-browser-fixture'))
    server.daemon_threads = True
    evidence = ROOT / '.atelier' / 'brain-browser-evidence'
    evidence.mkdir(exist_ok=True)
    info = {'fixture': True, 'url':'http://127.0.0.1:'+str(server.server_port)+'/',
            'apiUrl':api.base, 'vaultPath':str(vault), 'inputPath':str(inbox), 'dataPath':str(data)}
    (evidence / 'fixture.json').write_text(json.dumps(info, indent=2), encoding='utf-8')
    def stop(*_):
        threading.Thread(target=server.shutdown, daemon=True).start()
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    print(json.dumps(info), flush=True)
    try:
        server.serve_forever()
    finally:
        app.shutdown()
        server.server_close()
        api.shutdown()
        api.server_close()


if __name__ == '__main__':
    main()
