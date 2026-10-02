"""Replay the channel GUI recipe in hidden Electron windows with isolated data."""
import json
import os
import subprocess
import sys
import threading
import time
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from run import make_handler
from server.app import Application
from server.process_environment import agent_environment
from server.store import uid


def main():
    directory = ROOT / '.atelier' / 'channel-consolidation-evidence' / uid('gui_recipe')
    directory.mkdir(parents=True)
    app = Application(ROOT, directory / 'data')
    app.discover = lambda: app.provider
    app.channels.create({'name': 'Plan avant action', 'topic': 'Fixture de navigation, sans participant.'})
    server = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(app, 'channels-recipe-fixture-nonce'))
    server.daemon_threads = True
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    origin = 'http://127.0.0.1:' + str(server.server_port) + '/'
    electron = ROOT / 'node_modules' / 'electron' / 'dist' / ('electron.exe' if os.name == 'nt' else 'electron')
    stats_path = directory / 'desktop-stats.json'
    stop_path = directory / 'desktop-stop'
    desktop = None
    try:
        environment = {**agent_environment(), 'ATELIER_RECIPE_URL': origin,
                       'ATELIER_RECIPE_PROFILE': str(directory / 'desktop-profile'),
                       'ATELIER_RECIPE_STATS': str(stats_path),
                       'ATELIER_RECIPE_STOP': str(stop_path),
                       'ATELIER_RECIPE_TRACE': str(directory / 'desktop-trace.json')}
        environment.pop('ELECTRON_RUN_AS_NODE', None)
        with (directory / 'desktop.log').open('wb') as desktop_log:
            desktop = subprocess.Popen([str(electron), str(ROOT / 'tests' / 'channels_recipe_window.cjs')],
                cwd=ROOT, stdin=subprocess.DEVNULL, stdout=desktop_log, stderr=subprocess.STDOUT,
                env=environment, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
            deadline = time.monotonic() + 15
            while not app.duplica.bridge.available():
                if desktop.poll() is not None or time.monotonic() >= deadline:
                    raise RuntimeError('Le contrôleur Electron de fixture n’est pas disponible ; voir desktop.log.')
                time.sleep(.1)
            recipe = {'requirements': [{'path': path, 'contains': ''} for path in (
                'server/channels.py', 'server/api_connections.py', 'tests/test_channels.py',
                'docs/audit/2026-10-02-duplica-channels-consolidation.md')],
                'build': ['node', '--check', 'web/channels.js'],
                'tests': [sys.executable, '-B', '-m', 'unittest', 'discover', '-s', 'tests', '-v'],
                'application': None, 'buildNotApplicable': False,
                'gui': [{'kind': 'open_url', 'url': origin + '#channels'},
                        {'kind': 'expect', 'text': 'Canaux d’agents'},
                        {'kind': 'expect', 'text': 'Plan avant action'},
                        {'kind': 'click', 'label': 'Connexions'},
                        {'kind': 'expect', 'text': 'API locales & distantes'}]}
            verification = app.duplica.verifier.verify(
                {'id': 'fixture-channel-recipe', 'recipe': recipe},
                {'id': 'fixture-only', 'projectId': 'atelier', 'workingPath': str(ROOT)})
            stop_path.write_text('stop\n', encoding='utf-8')
            desktop.wait(timeout=5)
        stats = json.loads(stats_path.read_text(encoding='utf-8'))
        passed = verification['passed'] and desktop.returncode == 0 and stats == {
            'staleRejections': 1, 'mouseDowns': 1, 'movedControl': True}
        result = {'passed': passed, 'verification': verification['artifact'], 'desktop': stats,
                  'checks': [{'stage': check['stage'], 'status': check['status']} for check in verification['checks']],
                  'fixtureDirectory': str(directory), 'source': 'isolated-channel-recipe'}
        (directory / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
        return 0 if passed else 1
    finally:
        if desktop and desktop.poll() is None:
            desktop.terminate()
            desktop.wait(timeout=5)
        server.shutdown()
        server.server_close()
        worker.join(timeout=2)
        app.shutdown()
        app.store.db.close()


if __name__ == '__main__':
    raise SystemExit(main())
