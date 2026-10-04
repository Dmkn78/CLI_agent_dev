"""YouTube import tests use fake subprocesses; never download media or infer."""
import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from server import brain_media as media


VIDEO_ID = 'BaW_jenozKc'
URL = 'https://www.youtube.com/watch?v=' + VIDEO_ID
TOOLS = {'command': ['/fixture/tools/yt-dlp'], 'ffmpeg': '/fixture/tools/ffmpeg',
         'ffprobe': '/fixture/tools/ffprobe', 'node': '/fixture/tools/node'}


class FakeDownloader:
    def __init__(self, metadata=None, audio=b'FAKE_MP3_NOT_REAL_MEDIA', failure=None):
        self.metadata = metadata or {'id': VIDEO_ID, 'title': 'Une dictée YouTube', 'duration': 45,
                                     'is_live': False, 'live_status': 'not_live'}
        self.audio, self.failure = audio, failure
        self.calls = []
        self.code = 0

    def __call__(self, command, **kwargs):
        self.calls.append((command, kwargs))
        code = 0
        if '--dump-single-json' in command:
            kwargs['stdout'].write(json.dumps(self.metadata).encode())
        elif self.failure:
            kwargs['stderr'].write(self.failure.encode())
            code = 1
        elif self.audio is not None:
            (Path(kwargs['cwd']) / 'audio.mp3').write_bytes(self.audio)
        kwargs['stdout'].flush()
        kwargs['stderr'].flush()
        process = Mock(pid=999999999)
        process.poll.return_value = code
        process.wait.return_value = code
        return process


class YouTubeUrlTests(unittest.TestCase):
    def test_share_links_normalize_to_one_video(self):
        for value in (
            URL, 'http://youtube.com/watch?v=' + VIDEO_ID,
            'https://m.youtube.com/watch?v=' + VIDEO_ID + '&t=5&feature=shared',
            'https://music.youtube.com/watch?v=' + VIDEO_ID,
            'https://youtu.be/' + VIDEO_ID + '?si=abc',
            'https://www.youtu.be/' + VIDEO_ID,
            'https://www.youtube.com/shorts/' + VIDEO_ID,
            'https://youtube.com/live/' + VIDEO_ID + '/',
            'https://youtube.com/embed/' + VIDEO_ID + '#t=3',
        ):
            with self.subTest(value=value):
                self.assertEqual(media.normalize_youtube_url('  ' + value + '  '), URL)

    def test_non_video_urls_credentials_ports_and_option_injection_are_rejected(self):
        for value in (
            None, 42, '', '--exec touch /tmp/evil', VIDEO_ID,
            'https://example.org/watch?v=' + VIDEO_ID,
            'file:///etc/passwd', 'https://127.0.0.1/watch?v=' + VIDEO_ID,
            'https://youtube.com.evil/watch?v=' + VIDEO_ID,
            'https://youtube.com@evil/watch?v=' + VIDEO_ID,
            'https://user:password@youtube.com/watch?v=' + VIDEO_ID,
            'https://youtube.com:443/watch?v=' + VIDEO_ID,
            'https://youtube.com/watch?v=short',
            'https://youtube.com/watch?v=' + VIDEO_ID + '&v=' + VIDEO_ID,
            'https://youtu.be/' + VIDEO_ID + '/extra',
            'https://youtube.com/results?search_query=test',
            'https://youtube.com/@channel', 'https://youtube.com/redirect?q=' + URL,
            'https://youtu.be/../' + VIDEO_ID,
            'https://youtube.com/watch?v=' + VIDEO_ID + '\n--exec=evil',
            'https://youtube.com\\@evil/watch?v=' + VIDEO_ID,
        ):
            with self.subTest(value=value), self.assertRaises(ValueError):
                media.normalize_youtube_url(value)

    def test_playlists_are_rejected_even_when_video_id_is_present(self):
        for value in (URL + '&list=PLabc', URL + '&list=', URL + '&index=2',
                      'https://youtu.be/' + VIDEO_ID + '?playlist=abc',
                      'https://youtube.com/playlist?list=PLabc'):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, 'playlists'):
                media.normalize_youtube_url(value)


class MediaImportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.destination = self.root / 'brain' / 'inputs' / 'voice_fixture.mp3'
        self.tools_patch = patch.object(media, '_tools', return_value=TOOLS)
        self.tools_patch.start()

    def tearDown(self):
        self.tools_patch.stop()
        self.temporary.cleanup()

    def download(self, fake=None, **kwargs):
        fake = fake or FakeDownloader()
        with patch.object(media.subprocess, 'Popen', side_effect=fake):
            result = media.download_youtube_mp3('https://youtu.be/' + VIDEO_ID + '?si=abc',
                                               self.destination, storage_root=self.root, **kwargs)
        return result, fake

    def test_observed_mp3_metadata_hash_and_original_are_preserved(self):
        result, fake = self.download()
        self.assertEqual(result['sourceUrl'], URL)
        self.assertEqual(result['sourceVideoId'], VIDEO_ID)
        self.assertEqual(result['sourceTitle'], 'Une dictée YouTube')
        self.assertEqual(result['sourceDuration'], 45)
        self.assertEqual(result['sourceSha256'], hashlib.sha256(fake.audio).hexdigest())
        self.assertEqual(result['sourceBytes'], len(fake.audio))
        self.assertEqual(result['sourceName'], 'Une dictée YouTube.mp3')
        self.assertEqual(Path(result['inputFile']), self.destination)
        self.assertEqual(self.destination.read_bytes(), fake.audio)
        self.assertEqual(list(self.destination.parent.iterdir()), [self.destination])
        if os.name == 'posix':
            self.assertEqual(self.destination.stat().st_mode & 0o777, 0o600)

    def test_options_are_service_owned_no_shell_config_cookies_plugins_or_remote_components(self):
        with patch.dict(os.environ, {'ATELIER_TEST_API_KEY': 'secret-not-passed'}):
            _, fake = self.download()
        self.assertEqual(len(fake.calls), 2)
        for command, kwargs in fake.calls:
            self.assertFalse(kwargs['shell'])
            self.assertEqual(kwargs['stdin'], subprocess.DEVNULL)
            self.assertEqual(command[-2:], ['--', URL])
            for flag in ('--ignore-config', '--no-cache-dir', '--no-plugin-dirs',
                         '--no-remote-components', '--no-playlist'):
                self.assertIn(flag, command)
            self.assertNotIn('--cookies', command)
            self.assertNotIn('--cookies-from-browser', command)
            self.assertNotIn('--netrc', command)
            self.assertNotIn('ATELIER_TEST_API_KEY', kwargs['env'])
            self.assertIn('node:/fixture/tools/node', command)
            self.assertEqual(command[command.index('--use-extractors') + 1], 'youtube')
        download_command = fake.calls[1][0]
        self.assertEqual(download_command[download_command.index('--format') + 1], 'bestaudio')
        self.assertEqual(download_command[download_command.index('--audio-format') + 1], 'mp3')
        self.assertEqual(download_command[download_command.index('--audio-quality') + 1], '96K')
        self.assertEqual(download_command[download_command.index('--max-filesize') + 1], str(media.MAX_SOURCE_BYTES))

    def test_title_never_selects_output_path(self):
        fake = FakeDownloader({'id': VIDEO_ID, 'title': '../evil\n<script>name</script>', 'duration': 20})
        result, _ = self.download(fake)
        self.assertEqual(result['inputFile'], str(self.destination))
        self.assertNotIn('\n', result['sourceTitle'])
        self.assertNotIn('/', result['sourceName'])
        self.assertTrue(self.destination.is_file())

    def test_duration_metadata_identity_and_live_constraints_stop_before_media_download(self):
        base = {'id': VIDEO_ID, 'title': 'Titre', 'duration': 10}
        for changes in ({'duration': 0}, {'duration': None}, {'duration': True}, {'duration': 1201},
                        {'duration': float('nan')}, {'id': 'differentID'}, {'_type': 'playlist'},
                        {'entries': []}, {'is_live': True}, {'live_status': 'is_upcoming'},
                        {'live_status': 'post_live'}, {'title': ''}):
            fake = FakeDownloader({**base, **changes})
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.download(fake)
            self.assertEqual(len(fake.calls), 1)
            self.assertFalse(self.destination.exists())
            self.assertEqual(list(self.destination.parent.iterdir()), [])

    def test_missing_dependency_does_not_launch_subprocess(self):
        with patch.object(media, '_tools', return_value={**TOOLS, 'ffprobe': None}), \
                patch.object(media.subprocess, 'Popen') as popen, self.assertRaisesRegex(ValueError, 'ffprobe'):
            media.download_youtube_mp3(URL, self.destination, storage_root=self.root)
        popen.assert_not_called()

    def test_invalid_destination_and_symlink_do_not_launch_subprocess(self):
        wrong = self.root / 'outside.mp3'
        with patch.object(media.subprocess, 'Popen') as popen, self.assertRaisesRegex(ValueError, 'Destination'):
            media.download_youtube_mp3(URL, wrong, storage_root=self.root)
        popen.assert_not_called()
        real = self.root / 'real'
        real.mkdir()
        (self.root / 'brain').symlink_to(real, target_is_directory=True)
        with patch.object(media.subprocess, 'Popen') as popen, self.assertRaisesRegex(ValueError, 'symbolique'):
            media.download_youtube_mp3(URL, self.destination, storage_root=self.root)
        popen.assert_not_called()

    def test_existing_original_is_never_overwritten(self):
        self.destination.parent.mkdir(parents=True)
        self.destination.write_bytes(b'original')
        with self.assertRaisesRegex(ValueError, 'existe déjà'):
            self.download()
        self.assertEqual(self.destination.read_bytes(), b'original')

    def test_atomic_publication_refuses_a_concurrent_destination(self):
        fake = FakeDownloader()
        link = media.os.link

        def racing_link(source, destination):
            Path(destination).write_bytes(b'other original')
            return link(source, destination)

        with patch.object(media.os, 'link', side_effect=racing_link), self.assertRaisesRegex(ValueError, 'existe déjà'):
            self.download(fake)
        self.assertEqual(self.destination.read_bytes(), b'other original')
        self.assertEqual(list(self.destination.parent.iterdir()), [self.destination])

    def test_output_size_missing_audio_and_downloader_failure_leave_no_mp3(self):
        for fake in (FakeDownloader(audio=None), FakeDownloader(audio=b''),
                     FakeDownloader(audio=b'x' * 20), FakeDownloader(failure='Video unavailable')):
            with self.subTest(audio=fake.audio), patch.object(media, 'MAX_AUDIO_BYTES', 10), self.assertRaises(ValueError):
                self.download(fake)
            self.assertFalse(self.destination.exists())
            self.assertEqual(list(self.destination.parent.iterdir()), [])

    def test_access_error_is_useful_and_never_exposes_raw_remote_detail(self):
        fake = FakeDownloader(failure='Sign in to confirm not a bot. cookies token=PRIVATE')
        with self.assertRaisesRegex(ValueError, 'sans cookies') as raised:
            self.download(fake)
        self.assertNotIn('PRIVATE', str(raised.exception))
        self.assertFalse(self.destination.exists())

    def test_cancelled_before_launch_creates_no_mp3(self):
        fake = FakeDownloader()
        with self.assertRaises(media.MediaCancelled):
            self.download(fake, cancelled=lambda: True)
        self.assertFalse(fake.calls)
        self.assertFalse(self.destination.exists())
        self.assertEqual(list(self.destination.parent.iterdir()), [])

    def test_cancel_running_process_stops_group_and_cleans_up(self):
        fake = FakeDownloader()
        callback = Mock(side_effect=[False, True])
        with patch.object(media, '_stop_process') as stop, self.assertRaises(media.MediaCancelled):
            self.download(fake, cancelled=callback)
        stop.assert_called_once()
        self.assertEqual(len(fake.calls), 1)
        self.assertFalse(self.destination.exists())

    def test_timeout_stops_process_and_cleans_up(self):
        with patch.object(media.time, 'monotonic', side_effect=[100, 281]), \
                patch.object(media, '_stop_process') as stop, self.assertRaisesRegex(ValueError, '180 secondes'):
            self.download()
        stop.assert_called_once()
        self.assertFalse(self.destination.exists())

    def test_excess_logs_stop_subprocess_before_json_parsing(self):
        with patch.object(media, 'MAX_LOG_BYTES', 10), patch.object(media, '_stop_process') as stop, \
                self.assertRaisesRegex(ValueError, 'trop volumineuse'):
            self.download()
        stop.assert_called_once()
        self.assertFalse(self.destination.exists())

    def test_work_size_overflow_stops_process_and_cleans_up(self):
        with patch.object(media, 'MAX_WORK_BYTES', 10), patch.object(media, '_stop_process') as stop, \
                self.assertRaisesRegex(ValueError, 'Téléchargement trop volumineux'):
            self.download(FakeDownloader(audio=b'x' * 20))
        stop.assert_called_once()
        self.assertFalse(self.destination.exists())

    def test_source_size_limit_is_enforced_even_if_downloader_ignores_it(self):
        with patch.object(media, 'MAX_SOURCE_BYTES', 10), patch.object(media, '_stop_process') as stop, \
                self.assertRaisesRegex(ValueError, 'source dépasse 40 Mo'):
            self.download(FakeDownloader(audio=b'x' * 20))
        stop.assert_called_once()
        self.assertFalse(self.destination.exists())

    def test_spawn_failure_is_visible_and_removes_temporary_files(self):
        with patch.object(media.subprocess, 'Popen', side_effect=OSError('fixture failure')), \
                self.assertRaisesRegex(ValueError, 'Impossible de lancer'):
            media.download_youtube_mp3(URL, self.destination, storage_root=self.root)
        self.assertFalse(self.destination.exists())
        self.assertEqual(list(self.destination.parent.iterdir()), [])

    @unittest.skipUnless(os.name == 'posix', 'POSIX process groups only')
    def test_completed_process_is_reaped_if_its_group_is_already_gone(self):
        process = Mock(pid=999999999)
        with patch.object(media.os, 'killpg', side_effect=ProcessLookupError):
            media._stop_process(process)
        process.wait.assert_called_once_with(timeout=1)

    def test_ffmpeg_and_ffprobe_may_live_in_different_local_directories(self):
        with patch.object(media, '_tools', return_value={**TOOLS, 'ffprobe': '/other/tools/ffprobe'}):
            _, fake = self.download()
        for command, kwargs in fake.calls:
            self.assertNotIn('--ffmpeg-location', command)
            self.assertEqual(kwargs['env']['PATH'].split(os.pathsep)[:2], ['/fixture/tools', '/other/tools'])

    def test_malformed_metadata_stops_before_media_download(self):
        with self.assertRaisesRegex(ValueError, 'métadonnées valides'):
            media._metadata(b'not json', VIDEO_ID)

    def test_dependency_status_is_local_read_only(self):
        with patch.object(media.subprocess, 'Popen') as popen:
            status = media.media_dependencies(self.root)
        self.assertTrue(status['available'])
        self.assertTrue(status['ytDlp'])
        self.assertTrue(status['ffmpeg'])
        self.assertTrue(status['ffprobe'])
        self.assertTrue(status['nodeRuntime'])
        self.assertEqual(status['missing'], [])
        self.assertEqual(status['limits']['maxAudioBytes'], 20 * 1024 * 1024)
        popen.assert_not_called()

    def test_dependency_status_reports_missing_without_reading_credentials(self):
        with patch.object(media, '_tools', return_value={'command': None, 'ffmpeg': None, 'ffprobe': None, 'node': None}):
            status = media.media_dependencies(self.root)
        self.assertFalse(status['available'])
        self.assertEqual(status['missing'], ['yt-dlp', 'ffmpeg', 'ffprobe'])


class ToolLookupTests(unittest.TestCase):
    def test_explicit_local_media_directory_and_path_are_supported(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            folder = root / 'tools' / 'media' / 'bin'
            folder.mkdir(parents=True)
            tool = folder / 'yt-dlp'
            tool.write_text('fixture')
            tool.chmod(0o700)
            with patch.dict(os.environ, {'ATELIER_BRAIN_MEDIA_BIN': str(folder)}), patch.object(media.shutil, 'which', return_value=None):
                self.assertEqual(media._find_executable('yt-dlp', root), str(tool))

    def test_missing_executable_can_use_current_python_module(self):
        with patch.object(media, '_find_executable', return_value=None), \
                patch.object(media.importlib.util, 'find_spec', return_value=object()):
            tools = media._tools()
        self.assertEqual(tools['command'], [media.sys.executable, '-m', 'yt_dlp'])

    def test_repository_private_tools_are_considered_for_custom_storage(self):
        directories = media._tool_directories('/fixture/custom-storage')
        self.assertIn(Path('/fixture/custom-storage/tools/media/bin'), directories)
        self.assertIn(Path(media.__file__).resolve().parents[1] / '.atelier/tools/media/bin', directories)


if __name__ == '__main__':
    unittest.main()
