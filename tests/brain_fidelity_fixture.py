"""Source-first browser fixture: private data and fake local providers only."""
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


class FidelityApi(BrainApiFixture):
    def do_POST(self):
        raw = self.rfile.read(int(self.headers['Content-Length']))
        if self.path.endswith('/audio/transcriptions'):
            self.server.calls.append((self.path, raw))
            self.respond({'text': 'Audio fictif : Je ne partage pas 12 notes. Je garde les détails.'})
            return
        body = json.loads(raw)
        self.server.calls.append((self.path, body))
        time.sleep(.04)
        original = json.loads(body['messages'][-1]['content'])['transcription']
        if original.startswith('Réécriture risquée') or original.startswith('Audio fictif'):
            proposed = 'Je partage 120 notes. Tout est prêt et je recommande cette méthode.'
        else:
            proposed = original.replace('obsidienne', 'Obsidian')
        result = {'title': 'Sujet détecté dans la source fictive',
                  'description': 'La source exprime des idées personnelles à conserver sans les réécrire.',
                  'content_types': ['reflection', 'self-advice'], 'language': 'fr',
                  'text': proposed, 'topics': ['mémoire'], 'tags': ['fixture-fidelity'],
                  'entities': [], 'uncertainties': [],
                  # Deliberately false declarations must never become UI proof.
                  'corrections': [{'from': 'FAUSSE DÉCLARATION', 'to': 'INVENTÉE',
                                   'reason': 'Déclaration du fournisseur fictif, sans rapport avec les textes.'}]}
        self.respond({'choices': [{'finish_reason': 'stop', 'message': {
            'content': json.dumps(result, ensure_ascii=False)}}],
            'usage': {'prompt_tokens': 14, 'completion_tokens': 30, 'total_tokens': 44}})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4365)
    args = parser.parse_args()
    data = ROOT / '.atelier' / 'brain-fidelity-fixture' / uid('run')
    vault = data / 'my_brain'
    sources = data / 'Fidélité dossier'
    vault.mkdir(parents=True)
    sources.mkdir()
    timestamp = datetime(2026, 8, 1, 23, 30, tzinfo=timezone.utc).timestamp()
    for index in range(23):
        parent = sources / 'Notes' / ('A' if index % 2 else 'B')
        parent.mkdir(parents=True, exist_ok=True)
        file = parent / f'Note {index:02d}.txt'
        file.write_text(f'Fichier {index:02d} : Je classe une idée dans obsidienne. Je conserve mes hésitations et tous les détails de cette dictée.', encoding='utf-8')
        os.utime(file, (timestamp, timestamp))
    bad = sources / 'Notes' / 'Fichier refusé.pdf'
    bad.write_bytes(b'FAKE_UNSUPPORTED_FILE')
    os.utime(bad, (timestamp, timestamp))
    audio = data / 'Audio de référence.wav'
    audio.write_bytes(b'FAKE_AUDIO_NO_NATIVE_INFERENCE')
    api = ThreadingHTTPServer(('127.0.0.1', 0), FidelityApi)
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

    class Handler(make_handler(app, 'brain-fidelity-fixture')):
        def do_GET(self):
            if self.path == '/api/fixture/proof':
                if self.allowed(api=True):
                    self.reply({'fixture': True,
                                'asrCalls': sum(path.endswith('/audio/transcriptions') for path, _ in api.calls),
                                'llmCalls': sum(path.endswith('/chat/completions') for path, _ in api.calls)})
                return
            super().do_GET()

    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    server.daemon_threads = True
    evidence = ROOT / '.atelier' / 'brain-fidelity-evidence'
    evidence.mkdir(exist_ok=True)
    info = {'fixture': True, 'url': 'http://127.0.0.1:' + str(server.server_port) + '/',
            'dataPath': str(data), 'vaultPath': str(vault), 'sourcesPath': str(sources),
            'audioPath': str(audio), 'sourceTimeZone': 'Europe/Paris', 'totalFiles': 24}
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
