"""Long-file transcription uses mocked local subprocesses and HTTP callbacks."""
import json
import os
import subprocess
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import Mock, patch

from server import brain_audio as audio


TOOLS = {'ffmpeg': '/fixture/ffmpeg', 'ffprobe': '/fixture/ffprobe'}


class FakeAudioTools:
    def __init__(self, duration=301, probe=None, fail=False, bad_wav=False):
        self.duration, self.probe = duration, probe
        self.fail, self.bad_wav = fail, bad_wav
        self.calls = []

    def __call__(self, command, **kwargs):
        self.calls.append((command, kwargs))
        if command[0] == TOOLS['ffprobe']:
            body = self.probe if self.probe is not None else {'format': {'duration': str(self.duration)}}
            kwargs['stdout'].write(json.dumps(body).encode())
        else:
            segment = Path(command[-1])
            if self.bad_wav:
                segment.write_bytes(b'INVALID WAV')
            else:
                with wave.open(str(segment), 'wb') as output:
                    output.setnchannels(1)
                    output.setsampwidth(2)
                    output.setframerate(16000)
                    output.writeframes(b'\x00\x00' * 160)
        kwargs['stdout'].flush()
        kwargs['stderr'].flush()
        process = Mock(pid=999999999)
        process.poll.return_value = int(self.fail)
        process.wait.return_value = int(self.fail)
        return process


class FluidAudioTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.source = self.root / 'brain' / 'inputs' / 'voice_fixture.mp3'
        self.source.parent.mkdir(parents=True)
        self.source.write_bytes(b'FAKE MP3 SOURCE RETAINED')
        self.patch_tools = patch.object(audio.brain_media, '_tools', return_value=TOOLS)
        self.patch_tools.start()

    def tearDown(self):
        self.patch_tools.stop()
        self.temporary.cleanup()

    def transcribe(self, fake=None, request=None, **kwargs):
        fake = fake or FakeAudioTools()
        request = request or Mock(return_value={'text': 'Texte ASR.'})
        with patch.object(audio.subprocess, 'Popen', side_effect=fake):
            result = audio.transcribe_fluid_audio(self.source, request, storage_root=self.root, **kwargs)
        return result, fake, request

    def assert_original_only(self):
        self.assertEqual(self.source.read_bytes(), b'FAKE MP3 SOURCE RETAINED')
        self.assertEqual(list(self.source.parent.iterdir()), [self.source])

    def test_short_file_also_uses_pcm_wav_and_exact_api_limit_is_segmented(self):
        for duration, segments in ((20, 1), (300, 2)):
            with self.subTest(duration=duration):
                result, fake, request = self.transcribe(FakeAudioTools(duration))
                self.assertEqual(result, '\n'.join(['Texte ASR.'] * segments))
                self.assertEqual(len(fake.calls), 1 + segments)
                self.assertEqual(request.call_count, segments)
                for call in request.call_args_list:
                    self.assertEqual(Path(call.args[0]).suffix, '.wav')
                    self.assertNotEqual(Path(call.args[0]), self.source)
                self.assert_original_only()

    def test_long_file_segments_are_sequential_bounded_private_and_original_is_retained(self):
        paths = []

        def request(path):
            paths.append(Path(path))
            self.assertTrue(Path(path).is_file())
            self.assertFalse(Path(path).is_relative_to(self.source.parent))
            self.assertEqual(list(Path(path).parent.glob('*.wav')), [Path(path)])
            if os.name == 'posix':
                self.assertEqual(Path(path).stat().st_mode & 0o777, 0o600)
                self.assertEqual(Path(path).parent.stat().st_mode & 0o777, 0o700)
            return {'text': 'Partie ' + str(len(paths))}

        result, fake, _ = self.transcribe(FakeAudioTools(601), request)
        self.assertEqual(result, 'Partie 1\nPartie 2\nPartie 3')
        conversions = [command for command, _ in fake.calls if command[0] == TOOLS['ffmpeg']]
        self.assertEqual([command[command.index('-ss') + 1] for command in conversions], ['0', '240', '480'])
        self.assertEqual([command[command.index('-t') + 1] for command in conversions], ['240.000000', '240.000000', '121.000000'])
        for command in conversions:
            self.assertEqual(command[command.index('-ac') + 1], '1')
            self.assertEqual(command[command.index('-ar') + 1], '16000')
            self.assertEqual(command[command.index('-c:a') + 1], 'pcm_s16le')
            self.assertEqual(command[command.index('-i') + 1], str(self.source))
            self.assertIn('-n', command)
            self.assertEqual(command[command.index('-protocol_whitelist') + 1], 'file')
        self.assertTrue(all(not path.exists() for path in paths))
        self.assert_original_only()

    def test_subprocess_no_shell_no_stdin_or_secret_environment(self):
        with patch.dict(os.environ, {'ATELIER_TEST_API_KEY': 'secret-not-passed'}):
            _, fake, _ = self.transcribe()
        for _, kwargs in fake.calls:
            self.assertFalse(kwargs['shell'])
            self.assertEqual(kwargs['stdin'], subprocess.DEVNULL)
            self.assertNotIn('ATELIER_TEST_API_KEY', kwargs['env'])
            self.assertEqual(kwargs['start_new_session'], os.name == 'posix')

    def test_unknown_invalid_and_overlong_duration_never_calls_asr(self):
        for probe in ({}, {'format': {'duration': None}}, {'format': {'duration': True}},
                      {'format': {'duration': 'NaN'}}, {'format': {'duration': '-1'}},
                      {'format': {'duration': '1201'}}):
            request = Mock()
            with self.subTest(probe=probe), self.assertRaisesRegex(ValueError, 'Durée audio'):
                self.transcribe(FakeAudioTools(probe=probe), request)
            request.assert_not_called()
            self.assert_original_only()

    def test_invalid_missing_and_oversized_sources_are_rejected_before_subprocess(self):
        for source in (self.source.parent / 'absent.mp3', self.source.parent):
            with self.subTest(source=source), patch.object(audio.subprocess, 'Popen') as popen, self.assertRaises(ValueError):
                audio.transcribe_fluid_audio(source, Mock(), storage_root=self.root)
            popen.assert_not_called()
        with patch.object(audio, 'MAX_AUDIO_BYTES', 1), self.assertRaisesRegex(ValueError, '20 Mo'):
            self.transcribe()
        link = self.source.parent / 'linked.mp3'
        link.symlink_to(self.source)
        with self.assertRaisesRegex(ValueError, 'symbolique'):
            audio.transcribe_fluid_audio(link, Mock(), storage_root=self.root)
        link.unlink()
        self.assert_original_only()

    def test_source_outside_storage_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'stockage privé'):
            audio.transcribe_fluid_audio(self.source, Mock(), storage_root=self.root / 'elsewhere')

    def test_missing_tools_never_attempt_inference_for_long_source(self):
        for missing in ('ffprobe', 'ffmpeg'):
            request = Mock()
            with self.subTest(missing=missing), patch.object(audio.brain_media, '_tools', return_value={**TOOLS, missing: None}), self.assertRaisesRegex(ValueError, missing):
                self.transcribe(request=request)
            request.assert_not_called()
            self.assert_original_only()

    def test_invalid_wav_and_tool_failure_never_call_asr(self):
        for fake in (FakeAudioTools(bad_wav=True), FakeAudioTools(fail=True)):
            request = Mock()
            with self.subTest(fake=fake), self.assertRaises(ValueError):
                self.transcribe(fake, request)
            request.assert_not_called()
            self.assert_original_only()

    def test_cancel_before_work_and_after_segment_prevents_next_asr_call(self):
        with self.assertRaises(audio.AudioCancelled):
            self.transcribe(cancelled=lambda: True)
        cancelled = False
        calls = []

        def request(path):
            nonlocal cancelled
            calls.append(path)
            cancelled = True
            return {'text': 'Cette réponse ne doit pas être publiée.'}

        with self.assertRaises(audio.AudioCancelled):
            self.transcribe(FakeAudioTools(601), request, cancelled=lambda: cancelled)
        self.assertEqual(len(calls), 1)
        self.assert_original_only()

    def test_cancel_during_subprocess_stops_private_process_group(self):
        started = False
        fake = FakeAudioTools()

        def launch(command, **kwargs):
            nonlocal started
            result = fake(command, **kwargs)
            started = True
            return result

        with patch.object(audio.brain_media, '_stop_process') as stop, self.assertRaises(audio.AudioCancelled):
            self.transcribe(launch, cancelled=lambda: started)
        stop.assert_called_once()
        self.assert_original_only()

    def test_timeout_excess_log_and_segment_size_stop_process_and_cleanup(self):
        checks = [patch.object(audio.time, 'monotonic', side_effect=[100, 100, 281]),
                  patch.object(audio, 'MAX_LOG_BYTES', 1), patch.object(audio, 'MAX_SEGMENT_BYTES', 1)]
        for check in checks:
            with self.subTest(check=check), check, patch.object(audio.brain_media, '_stop_process') as stop, self.assertRaises(ValueError):
                self.transcribe()
            stop.assert_called_once()
            self.assert_original_only()

    def test_total_transcript_limit_invalid_response_and_http_error_return_no_partial_text(self):
        for responses in ([{'text': 'a' * 9000}, {'text': 'b' * 9000}],
                          [{'text': ''}, {'text': ' '}], [{'text': None}], [{'text': 'nul\x00'}],
                          [{'text': 'a' * 16001}], [ValueError('HTTP local indisponible')]):
            request = Mock(side_effect=responses)
            with self.subTest(responses=str(responses)[:20]), self.assertRaises(ValueError):
                self.transcribe(request=request)
            self.assert_original_only()

    def test_silent_segment_preserves_text_from_the_other_segments(self):
        result, _, _ = self.transcribe(request=Mock(side_effect=[{'text': ''}, {'text': 'La voix revient.'}]))
        self.assertEqual(result, 'La voix revient.')
        self.assert_original_only()


if __name__ == '__main__':
    unittest.main()
