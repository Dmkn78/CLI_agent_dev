"""Recursive folder browser fixture; private files and fake local providers only."""
import argparse
import json
import os
import signal
import sys
import threading
import time
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from run import make_handler
from server.app import Application
from server.store import uid
from test_brain import BrainApiFixture


class FolderApi(BrainApiFixture):
    def do_POST(self):
        raw = self.rfile.read(int(self.headers['Content-Length']))
        if self.path.endswith('/audio/transcriptions'):
            self.server.calls.append((self.path, raw))
            if b'SYNTHETIC_BROKEN_AUDIO' in raw:
                self.respond({'error': 'ASR fixture rejects this file.'}, 422)
            else:
                self.respond({'text': 'Une mémoire audio pour obsidienne.'})
            return
        body = json.loads(raw)
        self.server.calls.append((self.path, body))
        time.sleep(.08)
        data = json.loads(body['messages'][-1]['content'])
        original = data['transcription']
        result = {'title': 'Sujet détecté par le modèle fictif',
                  'description': 'Une note décrit les idées conservées dans ce fichier de test.',
                  'content_types': ['daily-summary'], 'language': 'fr',
                  'text': original.replace('obsidienne', 'Obsidian'),
                  'topics': ['mémoire'], 'tags': ['fixture-folder'], 'entities': [],
                  'uncertainties': [], 'corrections': []}
        self.respond({'choices': [{'finish_reason': 'stop', 'message': {
            'content': json.dumps(result, ensure_ascii=False)}}],
            'usage': {'prompt_tokens': 14, 'completion_tokens': 30, 'total_tokens': 44}})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4363)
    args = parser.parse_args()
    data = ROOT / '.atelier' / 'brain-folder-fixture' / uid('run')
    vault = data / 'my_brain'
    sources = data / 'Dossier complet'
    vault.mkdir(parents=True)
    sources.mkdir()
    timestamp = datetime(2026, 8, 1, 23, 30, tzinfo=timezone.utc).timestamp()
    for index in range(26):
        parent = sources / ('Voix' if index % 2 else 'Notes') / ('Semaine A' if index % 3 else 'Semaine B')
        parent.mkdir(parents=True, exist_ok=True)
        name = '2026-07-14 - Bilan.txt' if index == 0 else f'Jour {index:02d}.txt'
        file = parent / name
        prefix = 'Résumé du 14 juillet : ' if index == 2 else ''
        file.write_text(prefix + f'Mémoire du fichier {index:02d} dans obsidienne. Conserver ce texte entier.', encoding='utf-8')
    (sources / 'Voix' / 'Audio valide.wav').write_bytes(b'SYNTHETIC_AUDIO_OK')
    (sources / 'Voix' / 'Audio invalide.wav').write_bytes(b'SYNTHETIC_BROKEN_AUDIO')
    (sources / 'Notes' / 'Format non pris en charge.pdf').write_bytes(b'SYNTHETIC_PDF')
    (sources / '.DS_Store').write_bytes(b'SYNTHETIC_HIDDEN')
    (sources / '.cache').mkdir()
    (sources / '.cache' / 'ignore.txt').write_text('Ne pas importer ce cache.', encoding='utf-8')
    manifests = []
    for file in sorted(sources.rglob('*')):
        if file.is_file():
            os.utime(file, (timestamp, timestamp))
            if not any(part.startswith('.') for part in file.relative_to(sources).parts):
                manifests.append({'relativePath': str(file.relative_to(sources.parent)),
                                  'sourceName': file.name, 'size': file.stat().st_size,
                                  'lastModified': int(timestamp*1000)})
    api = ThreadingHTTPServer(('127.0.0.1', 0), FolderApi)
    api.daemon_threads = True
    api.base = 'http://127.0.0.1:' + str(api.server_port)
    api.calls = []
    threading.Thread(target=api.serve_forever, daemon=True).start()
    app = Application(ROOT, data / 'state')
    app.provider.update(installed=True, connected=True, models=[], plan='Fournisseur fictif')
    app.discover = lambda: app.provider
    app.brain.save({'projectId': 'atelier', 'baseUrl': api.base + '/v1',
                    'sttUrl': api.base + '/v1/audio/transcriptions', 'sttModel': 'fixture-asr-local',
                    'vaultPath': str(vault), 'permission': 'read-only'})
    app.brain.discover('atelier')
    app.brain.save({'projectId': 'atelier', 'model': 'fixture-brain-local'})

    class Handler(make_handler(app, 'brain-folder-fixture')):
        def do_GET(self):
            if self.path == '/api/fixture/proof':
                if self.allowed(api=True):
                    self.reply({'fixture': True,
                                'asrCalls': sum(path.endswith('/audio/transcriptions') for path, _ in api.calls),
                                'llmCalls': sum(path.endswith('/chat/completions') for path, _ in api.calls)})
                return
            super().do_GET()

        def do_POST(self):
            if self.path == '/api/brain/import':
                time.sleep(.02)
            super().do_POST()

    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    server.daemon_threads = True
    evidence = ROOT / '.atelier' / 'brain-folder-evidence'
    evidence.mkdir(exist_ok=True)
    info = {'fixture': True, 'url': 'http://127.0.0.1:' + str(server.server_port) + '/',
            'apiUrl': api.base, 'dataPath': str(data), 'vaultPath': str(vault),
            'sourcesPath': str(sources), 'manifest': manifests,
            'sourceTimeZone': 'Europe/Paris', 'expectedNoteDate': '2026-08-02'}
    (evidence / 'fixture.json').write_text(json.dumps(info, indent=2, ensure_ascii=False), encoding='utf-8')

    def stop(*_):
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    print(json.dumps(info, ensure_ascii=False), flush=True)
    try:
        server.serve_forever()
    finally:
        app.shutdown()
        server.server_close()
        api.shutdown()
        api.server_close()


if __name__ == '__main__':
    main()
