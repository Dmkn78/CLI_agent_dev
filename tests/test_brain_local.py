"""Native discovery/history boundaries and macOS browser folder selection."""
import json
import plistlib
import subprocess
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from server.brain_local import fluid_history, local_installation
from server.desktop import pick_directory
import test_brain as fixture


class FolderPickerTests(unittest.TestCase):
    def test_macos_browser_picker_selection_cancellation_failure_and_timeout(self):
        with patch('server.desktop.sys.platform', 'darwin'), patch('server.desktop.subprocess.run') as command:
            command.return_value = subprocess.CompletedProcess([], 0, '/tmp/Mon cerveau/\n', '')
            self.assertEqual(pick_directory(), {'path': '/tmp/Mon cerveau'})
            self.assertEqual(command.call_args.args[0][0], '/usr/bin/osascript')
            self.assertNotIn('shell', command.call_args.kwargs)
            command.return_value = subprocess.CompletedProcess([], 1, '', 'User canceled. (-128)')
            self.assertEqual(pick_directory(), {'path': None})
            command.return_value = subprocess.CompletedProcess([], 1, '', 'dialog unavailable')
            with self.assertRaisesRegex(ValueError, 'macOS'):
                pick_directory()
            command.side_effect = subprocess.TimeoutExpired([], 180)
            with self.assertRaisesRegex(ValueError, 'expirée'):
                pick_directory()


class FluidHistoryTests(unittest.TestCase):
    def test_raw_dictation_only_and_swift_timestamp(self):
        preferences = {'SaveTranscriptionHistory': True, 'TranscriptionHistoryEntries': json.dumps([
            {'id': 'voice-1', 'timestamp': 100, 'rawText': 'Mon obsidienne', 'processedText': 'A summary', 'windowTitle': 'Private window'}]).encode()}
        with patch('server.brain_local.fluid_preferences', return_value=preferences):
            self.assertEqual(fluid_history(), [{'id': 'voice-1', 'timestamp': 978307300, 'text': 'Mon obsidienne'}])
            preferences['SaveTranscriptionHistory'] = False
            with self.assertRaisesRegex(ValueError, 'Save Transcription History'):
                fluid_history()

    def test_discovery_only_reports_allowlisted_settings(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp)
            preferences = home / 'Library/Preferences/com.FluidApp.app.plist'
            preferences.parent.mkdir(parents=True)
            preferences.write_bytes(plistlib.dumps({'SelectedSpeechModel': 'parakeet-tdt', 'SaveTranscriptionHistory': True,
                'LocalAPIEnabled': False, 'LocalAPIPort': 49200, 'SavedProviders': {'private': 'never return'}}))
            with patch('server.brain_local.sys.platform', 'darwin'), patch('server.brain_local.Path.home', return_value=home), patch('server.brain_local.plistlib.loads', return_value={'CFBundleShortVersionString': 'fixture-version'}), patch('server.brain_local.Path.read_bytes', return_value=b'fixture'):
                result = local_installation()
            self.assertEqual(result['fluidVoice']['apiUrl'], 'http://127.0.0.1:49200/v1/transcribe')
            self.assertFalse(result['fluidVoice']['apiEnabled'])
            self.assertNotIn('never return', json.dumps(result))


class FluidPipelineTests(unittest.TestCase):
    setUp = fixture.BrainTests.setUp
    tearDown = fixture.BrainTests.tearDown
    configured = fixture.BrainTests.configured
    wait = fixture.BrainTests.wait
    submit = fixture.BrainTests.submit
    def test_fluid_audio_uses_native_json_path_and_not_openai_multipart(self):
        self.configured(sttProvider='fluidvoice', sttUrl=self.api.base+'/v1/transcribe')
        import base64
        # Byte fixture exercises the connector; real WAV preparation has its
        # own subprocess tests and must never depend on installed codecs here.
        def prepare(path, callback, **kwargs):
            return callback(str(path))['text']
        with patch('server.brain.transcribe_fluid_audio', side_effect=prepare):
            job = self.wait(self.brain.submit({'sourceType': 'audio', 'sourceName': 'dictée.wav',
                    'audioBase64': base64.b64encode(b'fake audio').decode()})['id'])
        self.assertEqual(job['status'], 'review')
        call = next(body for url, body in self.api.calls if url == '/v1/transcribe')
        self.assertEqual(json.loads(call), {'path': job['inputFile']})

    def test_fluid_watcher_future_raw_entries_unique_ids_auto_export_and_pause(self):
        self.configured(inputSource='fluidvoice', permission='vault-write', autoExport=True)
        old = {'id': 'old', 'timestamp': time.time()-30, 'text': 'Ne pas importer le passé.'}
        with patch('server.brain.fluid_history', return_value=[old]) as history:
            config = self.brain.watch('atelier', True)
            first = {'id': 'first', 'timestamp': time.time()+1, 'text': 'Mon obsidienne garde la mémoire.'}
            history.return_value = [old, first]
            self.brain._scan_fluid(config)
            config = self.brain.config('atelier')
            self.brain._scan_fluid(config)
            second = {**first, 'id': 'second', 'timestamp': time.time()+2}
            history.return_value.append(second)
            self.brain._scan_fluid(config)
            self.brain.watch('atelier', False)
            history.return_value.append({**first, 'id': 'paused'})
            self.brain._scan_fluid(config)
        jobs = self.app.store.all('brainJob')
        self.assertEqual(len(jobs), 2)  # same words, two distinct genuine dictations
        for job in jobs:
            result = self.wait(job['id'], statuses=('exported', 'failed'))
            self.assertEqual(result['status'], 'exported')
            self.assertEqual(result['original'], first['text'])
            self.assertEqual(result['sourceApplication'], 'Fluid Voice')
            self.assertNotIn('source_application:', result['markdown'])
            self.assertTrue(Path(result['exportPath']).is_file())

    def test_context_is_retrieved_without_manual_domain_or_glossary(self):
        self.configured()
        (self.vault/'projet.md').write_text('---\nentities: ["Obsidian"]\n---\n# Mémoire\n\nMon projet de mémoire utilise Obsidian.')
        (self.vault/'cuisine.md').write_text('# Cuisine\n\nUne soupe avec des légumes.')
        job = self.wait(self.submit('Mon obsidienne garde la mémoire du projet.')['id'])
        self.assertEqual([s['path'] for s in job['contextSources']], ['projet.md'])
        data = json.loads(self.api.calls[-1][1]['messages'][-1]['content'])
        self.assertEqual(data['context'], '')
        self.assertEqual(data['glossary'], '')
        self.assertEqual(data['nearbyNotes'][0]['path'], 'projet.md')
        self.assertIn("related_notes:\n  - '[[projet]]'", job['markdown'])
        self.brain.save({'autoContext': False})
        job = self.wait(self.submit('Une autre dictée sur mon projet et ma mémoire.')['id'])
        self.assertEqual(job['contextSources'], [])

    def test_explicit_watch_resume_keeps_cursor_and_imports_pause_gap_once(self):
        self.configured(inputSource='fluidvoice')
        old = {'id': 'old', 'timestamp': time.time()-30, 'text': 'Ancienne dictée.'}
        with patch('server.brain.fluid_history', return_value=[old]) as history, patch.object(self.brain.watcher, 'start'):
            started = self.brain.watch('atelier', True)
            self.brain.watch('atelier', False)
            during = {'id': 'during', 'timestamp': time.time()+1, 'text': 'Une dictée pendant la mise à jour.'}
            history.return_value = [old, during]
            resumed = self.brain.watch('atelier', True, resume=True)
            self.assertEqual(resumed['fluidSince'], started['fluidSince'])
            self.brain._scan_fluid(resumed)
            self.brain._scan_fluid(self.brain.config('atelier'))
            self.brain.watch('atelier', False)
        jobs = self.app.store.all('brainJob')
        self.assertEqual([job['sourceEntryId'] for job in jobs], ['during'])
        self.assertEqual(self.wait(jobs[0]['id'])['original'], during['text'])

    def test_english_clips_do_not_share_context_through_pronouns_or_auxiliaries(self):
        # Reproduce the Sintel/Tears of Steel regression: unrelated dialogue
        # shares "you", which must not transfer a fantasy tag into robot speech.
        self.configured()
        sintel = 'You have been searching for a dragon. You should be careful.'
        tears = 'You can build robots. They will not know what you are doing.'
        (self.vault / 'sintel.md').write_text('---\ntags: ["fantasy-setting"]\n---\n# Sintel\n\n' + sintel)
        (self.vault / 'tears.md').write_text('# Tears of Steel\n\n' + tears)
        config = self.brain.config('atelier')
        for transcript, own in ((tears, 'tears.md'), (sintel, 'sintel.md')):
            with self.subTest(transcript=transcript):
                self.assertEqual([note['path'] for note in self.brain._context_sources(config, transcript)], [own])
        common_only = 'You have been there and they will not be doing that for you.'
        self.assertEqual(self.brain._context_sources(config, common_only), [])

    def test_english_robot_vocabulary_stays_relevant_and_prompt_limits_metadata_to_transcript(self):
        self.configured()
        (self.vault / 'robots.md').write_text('# Robot maintenance\n\nThe robot controller monitors the encoder.')
        (self.vault / 'sintel.md').write_text('---\ntags: ["fantasy-setting"]\n---\n# Sintel\n\nYou have found a dragon.')
        job = self.wait(self.submit('You can repair the robot controller, but you must not damage its encoder.')['id'])
        self.assertEqual([note['path'] for note in job['contextSources']], ['robots.md'])
        request = self.api.calls[-1][1]
        data = json.loads(request['messages'][-1]['content'])
        self.assertEqual([note['path'] for note in data['nearbyNotes']], ['robots.md'])
        self.assertNotIn('fantasy-setting', json.dumps(data))
        self.assertIn('Toutes les métadonnées sont déduites de la transcription seule', request['messages'][0]['content'])
