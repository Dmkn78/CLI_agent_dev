"""Isolated browser fixture: synthetic YouTube MP3, local ASR and local LLM."""
import argparse
import hashlib
import json
import signal
import sys
import threading
import time
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from run import make_handler
from server.app import Application
from server.store import uid
from test_brain import BrainApiFixture
import server.brain as brain_module

MP3 = b'ID3\x04\x00\x00\x00\x00\x00\x00SYNTHETIC_YOUTUBE_MP3_FIXTURE'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4362)
    args = parser.parse_args()
    data = ROOT / '.atelier' / 'brain-youtube-fixture' / uid('run')
    data.mkdir(parents=True)
    vault = data / 'my_brain'
    vault.mkdir()
    api = ThreadingHTTPServer(('127.0.0.1', 0), BrainApiFixture)
    api.daemon_threads = True
    api.base = 'http://127.0.0.1:' + str(api.server_port)
    api.calls, api.override = [], None
    api.transcript = 'Cette vidéo conserve ma mémoire dans obsidienne. Toutes les idées restent présentes.'
    api.received, api.release = threading.Event(), threading.Event()
    api.release.set()
    threading.Thread(target=api.serve_forever, daemon=True).start()
    downloads = []

    def fake_download(url, destination, cancelled=None, storage_root=None):
        downloads.append(url)
        # Keeps the real downloading state observable without contacting YouTube.
        deadline = time.monotonic() + 2
        while time.monotonic() < deadline:
            if cancelled and cancelled():
                raise ValueError('Téléchargement fictif annulé.')
            time.sleep(.02)
        destination.write_bytes(MP3)
        return {'inputFile': str(destination), 'sourceUrl': url, 'sourceVideoId': url.rsplit('=', 1)[-1],
                'sourceTitle': 'Vidéo YouTube synthétique', 'sourceDuration': 12,
                'sourceName': 'Vidéo YouTube synthétique.mp3', 'sourceBytes': len(MP3),
                'sourceSha256': hashlib.sha256(MP3).hexdigest()}

    brain_module.download_youtube_mp3 = fake_download
    brain_module.media_dependencies = lambda storage_root=None: {
        'available': True, 'ytDlp': True, 'ffmpeg': True, 'ffprobe': True, 'nodeRuntime': True,
        'missing': [], 'limits': {'maxAudioBytes': 20*1024*1024, 'maxDurationSeconds': 1200}}
    app = Application(ROOT, data / 'state')
    app.provider.update(installed=True, connected=True, models=[], plan='Fournisseur fictif')
    app.discover = lambda: app.provider
    app.brain.save({'projectId': 'atelier', 'baseUrl': api.base + '/v1',
                    'sttUrl': api.base + '/v1/audio/transcriptions', 'sttModel': 'fixture-asr-local',
                    'vaultPath': str(vault), 'permission': 'read-only'})
    app.brain.discover('atelier')
    app.brain.save({'projectId': 'atelier', 'model': 'fixture-brain-local'})

    class Handler(make_handler(app, 'brain-youtube-fixture')):
        def do_GET(self):
            if self.path == '/api/fixture/proof':
                if self.allowed(api=True):
                    self.reply({'fixture': True, 'downloads': downloads,
                                'asrCalls': sum(path.endswith('/audio/transcriptions') for path, _ in api.calls),
                                'llmCalls': sum(path.endswith('/chat/completions') for path, _ in api.calls)})
                return
            super().do_GET()

    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    server.daemon_threads = True
    evidence = ROOT / '.atelier' / 'brain-youtube-evidence'
    evidence.mkdir(exist_ok=True)
    info = {'fixture': True, 'url': 'http://127.0.0.1:' + str(server.server_port) + '/',
            'apiUrl': api.base, 'dataPath': str(data), 'vaultPath': str(vault),
            'mp3Hex': MP3.hex(), 'transcript': api.transcript}
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
