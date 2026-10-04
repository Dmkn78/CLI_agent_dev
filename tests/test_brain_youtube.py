"""Queued YouTube workflow using fake download, ASR and correction only."""
import hashlib
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer

import test_brain as fixtures
from run import make_handler


class YoutubeBrainTests(unittest.TestCase):
    tearDown = fixtures.BrainTests.tearDown
    configured = fixtures.BrainTests.configured
    wait = fixtures.BrainTests.wait

    def setUp(self):
        dependencies = {'available': True, 'ytDlp': True, 'ffmpeg': True, 'ffprobe': True,
                        'missing': [], 'limits': {'maxAudioBytes': 20971520, 'maxDurationSeconds': 1200}}
        self.dependencies = patch('server.brain.media_dependencies', return_value=dependencies)
        self.dependencies.start()
        self.addCleanup(self.dependencies.stop)
        fixtures.BrainTests.setUp(self)

    def configure_audio(self):
        return self.configured(sttUrl=self.api.base + '/v1/audio/transcriptions',
                               sttModel='fixture-asr-local')

    def fake_download(self, url, destination, cancelled=None, storage_root=None):
        raw = b'SYNTHETIC_MP3_SOURCE'
        destination.write_bytes(raw)
        return {'inputFile': str(destination), 'sourceUrl': url, 'sourceVideoId': 'BaW_jenozKc',
                'sourceTitle': 'YouTube fixture', 'sourceDuration': 10,
                'sourceName': 'YouTube fixture.mp3', 'sourceBytes': len(raw),
                'sourceSha256': hashlib.sha256(raw).hexdigest()}

    def test_youtube_queue_transcribes_keeps_provenance_and_deduplicates(self):
        self.configure_audio()
        with patch('server.brain.download_youtube_mp3', side_effect=self.fake_download) as download:
            job = self.brain.submit_youtube({'url': 'https://youtu.be/BaW_jenozKc?si=test'})
            done = self.wait(job['id'])
            self.assertEqual(done['status'], 'review', done.get('error'))
            self.assertEqual(done['sourceType'], 'youtube')
            self.assertEqual(done['original'], self.api.transcript)
            self.assertIn("source: 'https://www.youtube.com/watch?v=BaW_jenozKc'", done['markdown'])
            self.assertEqual(done['configuration']['sttModel'], 'fixture-asr-local')
            self.assertNotIn('transcription_model:', done['markdown'])
            self.assertTrue(done['audioAvailable'])
            self.assertEqual(done['audioSuffix'], '.mp3')
            self.assertEqual(self.brain.audio(job['id']), (b'SYNTHETIC_MP3_SOURCE', '.mp3'))
            self.assertEqual(self.brain.submit_youtube({'url': done['sourceUrl']})['id'], job['id'])
            self.assertEqual(download.call_count, 1)
            self.assertEqual(list(self.vault.rglob('*.md')), [])

    def test_cancelled_download_cannot_publish_or_infer(self):
        self.configure_audio()
        received, release = threading.Event(), threading.Event()
        def blocked(*args, **kwargs):
            received.set()
            release.wait(timeout=3)
            self.assertTrue(kwargs['cancelled']())
            return self.fake_download(*args, **kwargs)
        with patch('server.brain.download_youtube_mp3', side_effect=blocked):
            job = self.brain.submit_youtube({'url': 'https://youtu.be/BaW_jenozKc'})
            self.assertTrue(received.wait(timeout=2))
            self.assertEqual(self.brain.job(job['id'])['status'], 'downloading')
            self.brain.cancel(job['id'])
            release.set()
            self.brain.pending.join()
            done = self.brain.job(job['id'])
            self.assertEqual(done['status'], 'cancelled')
            self.assertFalse(done.get('result'))
            self.assertFalse(any(path.endswith('/chat/completions') for path, _ in self.api.calls))
            self.assertTrue(done['audioAvailable'])
            self.brain.retry(job['id'])
            retried = self.wait(job['id'])
            self.assertEqual(retried['status'], 'review', retried.get('error'))

    def test_failure_is_visible_retry_reuses_retained_mp3(self):
        self.configure_audio()
        with patch('server.brain.download_youtube_mp3', side_effect=self.fake_download) as download:
            with patch.object(self.brain, '_transcribe', side_effect=ValueError('ASR indisponible')):
                job = self.brain.submit_youtube({'url': 'https://youtu.be/BaW_jenozKc'})
                failed = self.wait(job['id'])
            self.assertEqual(failed['status'], 'failed')
            self.assertTrue(failed['audioAvailable'])
            self.brain.retry(job['id'])
            done = self.wait(job['id'])
            self.assertEqual(done['status'], 'review', done.get('error'))
            self.assertEqual(download.call_count, 1)

    def test_changed_audio_and_symlinks_are_rejected_for_all_connectors(self):
        self.configure_audio()
        with patch('server.brain.download_youtube_mp3', side_effect=self.fake_download):
            done = self.wait(self.brain.submit_youtube({'url': 'https://youtu.be/BaW_jenozKc'})['id'])
        path = Path(done['inputFile'])
        path.write_bytes(b'Changed')
        with self.assertRaisesRegex(ValueError, 'changé'):
            self.brain.audio(done['id'])
        with self.assertRaisesRegex(ValueError, 'changé'):
            self.brain._transcribe(dict(done, configuration={**done['configuration'], 'sttProvider': 'fluidvoice'}))
        path.unlink()
        path.symlink_to(self.vault / 'outside.mp3')
        self.assertFalse(self.brain.job(done['id'])['audioAvailable'])
        with self.assertRaises(ValueError):
            self.brain.audio(done['id'])

    def test_audio_http_requires_local_nonce(self):
        self.configure_audio()
        with patch('server.brain.download_youtube_mp3', side_effect=self.fake_download):
            done = self.wait(self.brain.submit_youtube({'url': 'https://youtu.be/BaW_jenozKc'})['id'])
        server = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(self.app, 'fixture-token'))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = 'http://127.0.0.1:' + str(server.server_port) + '/api/brain/audio?id=' + done['id']
        try:
            with self.assertRaises(HTTPError) as error:
                urlopen(url)
            self.assertEqual(error.exception.code, 403)
            with urlopen(Request(url, headers={'X-Atelier-Token': 'fixture-token'})) as response:
                self.assertEqual(response.headers['Content-Type'], 'audio/mpeg')
                self.assertEqual(response.read(), b'SYNTHETIC_MP3_SOURCE')
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)
