import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from server.app import Application
from server.native_usage import NativeUsage, read_cli_rollout


class NativeUsageTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.app = Application(self.root)
        self.reader = NativeUsage(self.app, self.root / 'sessions')

    def tearDown(self):
        self.app.shutdown()
        self.app.store.db.close()
        self.temporary.cleanup()

    def rollout(self, identifier, source='cli', usage=True):
        timestamp = datetime.now(timezone.utc).isoformat()
        directory = self.reader.directory / datetime.now(timezone.utc).strftime('%Y/%m/%d')
        directory.mkdir(parents=True, exist_ok=True)
        records = [{'type': 'session_meta', 'payload': {'id': identifier, 'cwd': str(self.root), 'timestamp': timestamp,
                    'source': source, 'base_instructions': 'PRIVATE TEXT DO NOT IMPORT'}},
                   {'type': 'turn_context', 'payload': {'model': 'fixture-native'}}]
        if usage:
            records.append({'type': 'event_msg', 'timestamp': timestamp, 'payload': {'type': 'token_count', 'info': {
                'total_token_usage': {'input_tokens': 120, 'cached_input_tokens': 80, 'output_tokens': 30, 'total_tokens': 150},
                'last_token_usage': {'total_tokens': 15}, 'model_context_window': 1000},
                'rate_limits': {'plan_type': 'plus', 'primary': {'used_percent': 25, 'window_minutes': 300}}}})
        path = directory / (identifier + '.jsonl')
        path.write_bytes(('\n'.join(json.dumps(record) for record in records) + '\n{"incomplete":').encode())
        return path

    def register(self, identifier):
        self.reader.register({'id': identifier, 'projectId': 'atelier', 'runtime': 'codex', 'event': 'opened', 'pid': 42})

    def test_native_counters_preserve_totals_and_ignore_transcripts_and_partial_lines(self):
        path = self.rollout('first')
        observed = read_cli_rollout(path)
        self.assertEqual(observed['usage']['total']['totalTokens'], 150)
        self.assertEqual(observed['usage']['total']['cachedInputTokens'], 80)
        self.assertEqual(observed['limits']['rateLimits']['primary']['usedPercent'], 25)
        self.assertNotIn('PRIVATE', json.dumps(observed))
        self.assertIsNone(read_cli_rollout(self.rollout('desktop', 'vscode')))

    def test_one_unambiguous_cli_session_is_linked_and_persisted_without_double_counting(self):
        self.register('terminal-one')
        self.rollout('first')
        self.reader.refresh()
        saved = self.app.store.get('nativeSession', 'terminal-one')
        self.assertEqual(saved['nativeThreadId'], 'first')
        self.assertEqual(saved['usage']['total']['totalTokens'], 150)
        self.assertEqual(saved['association'], 'unique-workspace-start')

    def test_concurrent_terminals_require_explicit_binding(self):
        self.register('one')
        self.register('two')
        self.rollout('first')
        self.rollout('second')
        self.reader.refresh()
        self.assertFalse(any(session.get('nativeThreadId') for session in self.app.store.all('nativeSession')))
        self.reader.bind('one', 'first')
        with self.assertRaises(ValueError):
            self.reader.bind('two', 'first')
        self.reader.register({'id': 'omp', 'runtime': 'omp', 'projectId': 'atelier'})
        with self.assertRaises(ValueError):
            self.reader.bind('omp', 'second')

    def test_no_count_is_reported_before_an_observed_token_event(self):
        self.register('one')
        self.rollout('empty', usage=False)
        self.reader.refresh()
        self.assertIsNone(self.app.store.get('nativeSession', 'one')['usage'])
