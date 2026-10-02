import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from server.app import Application
from server.native_usage import NativeUsage, read_cli_rollout, read_native_rollout


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

    def rollout(self, identifier, source='cli', usage=True, parent=None):
        timestamp = datetime.now(timezone.utc).isoformat()
        directory = self.reader.directory / datetime.now(timezone.utc).strftime('%Y/%m/%d')
        directory.mkdir(parents=True, exist_ok=True)
        records = [{'type': 'session_meta', 'payload': {'id': identifier, 'cwd': str(self.root), 'timestamp': timestamp,
                    'source': source, 'base_instructions': 'PRIVATE TEXT DO NOT IMPORT'}},
                   {'type': 'turn_context', 'payload': {'model': 'fixture-native'}}]
        if parent:
            records[0]['payload']['parent_thread_id'] = parent
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

    def append_events(self, path, events):
        records = path.read_bytes().split(b'\n{"incomplete":')[0]
        path.write_bytes(records + b'\n' + ('\n'.join(json.dumps(event) for event in events) + '\n').encode())

    def lifecycle(self, event, timestamp):
        return {'type': 'event_msg', 'timestamp': timestamp, 'payload': {'type': event, 'text': 'PRIVATE RESPONSE'}}

    def test_native_activity_requires_explicit_events_and_preserves_observed_duration(self):
        path = self.rollout('first')
        self.assertEqual(read_native_rollout(path)['activityStatus'], 'unknown')
        self.append_events(path, [self.lifecycle('task_started', '2026-10-02T10:00:00Z'),
                                 self.lifecycle('task_complete', '2026-10-02T10:00:08Z')])
        observed = read_cli_rollout(path)
        self.assertEqual(observed['activityStatus'], 'completed')
        self.assertEqual(observed['lastTurnDurationMs'], 8000)
        self.assertNotIn('PRIVATE', json.dumps(observed))
        self.append_events(path, [self.lifecycle('task_started', '2026-10-02T10:01:00Z')])
        self.assertEqual(read_cli_rollout(path)['activityStatus'], 'running')
        self.assertIsNone(read_cli_rollout(path)['lastTurnDurationMs'])
        self.append_events(path, [self.lifecycle('turn_aborted', '2026-10-02T10:01:05Z')])
        self.assertEqual(read_cli_rollout(path)['activityStatus'], 'interrupted')

    def test_dashboard_imports_only_descendants_of_an_associated_cli_terminal(self):
        self.register('terminal')
        self.rollout('parent')
        child = self.rollout('child', {'subagent': {'other': 'fixture'}}, parent='parent')
        self.rollout('grandchild', {'subagent': {'thread_spawn': {'parent_thread_id': 'child'}}})
        self.rollout('unrelated', {'subagent': {'other': 'fixture'}}, parent='outside-atelier')
        self.append_events(child, [self.lifecycle('task_started', '2026-10-02T10:00:00Z')])
        self.assertIsNone(read_cli_rollout(child))
        self.reader.refresh()
        children = self.app.store.all('nativeSubagent')
        self.assertEqual({agent['id'] for agent in children}, {'child', 'grandchild'})
        self.assertEqual(self.app.store.get('nativeSubagent', 'child')['activityStatus'], 'running')
        self.assertEqual(self.app.store.get('nativeSubagent', 'child')['terminalId'], 'terminal')
        self.assertNotIn('PRIVATE', json.dumps(children))
        self.assertEqual({candidate['id'] for candidate in self.reader.choices('terminal')}, {'parent'})

    def test_ambiguous_parents_do_not_claim_subagents_before_explicit_binding(self):
        self.register('one')
        self.register('two')
        self.rollout('first')
        self.rollout('second')
        self.rollout('child', {'subagent': {'thread_spawn': {'parent_thread_id': 'first'}}})
        self.reader.refresh()
        self.assertEqual(self.app.store.all('nativeSubagent'), [])
        self.reader.bind('one', 'first')
        self.assertEqual(self.app.store.get('nativeSubagent', 'child')['terminalId'], 'one')

    def test_closed_terminal_preserves_completed_child_but_does_not_report_running_child(self):
        self.register('terminal')
        self.rollout('parent')
        active = self.rollout('active', {'subagent': {'other': 'fixture'}}, parent='parent')
        completed = self.rollout('completed', {'subagent': {'other': 'fixture'}}, parent='parent')
        self.append_events(active, [self.lifecycle('task_started', '2026-10-02T10:00:00Z')])
        self.append_events(completed, [self.lifecycle('task_complete', '2026-10-02T10:00:01Z')])
        self.reader.refresh()
        self.reader.register({'id': 'terminal', 'projectId': 'atelier', 'runtime': 'codex', 'event': 'closed'})
        self.reader.last_scan = 0
        self.reader.refresh()
        self.assertEqual(self.app.store.get('nativeSubagent', 'active')['activityStatus'], 'unknown')
        self.assertEqual(self.app.store.get('nativeSubagent', 'completed')['activityStatus'], 'completed')

    def test_missing_rollout_does_not_leave_a_child_running_forever(self):
        self.register('terminal')
        self.rollout('parent')
        child = self.rollout('child', {'subagent': {'other': 'fixture'}}, parent='parent')
        self.append_events(child, [self.lifecycle('task_started', '2026-10-02T10:00:00Z')])
        self.reader.refresh()
        child.unlink()
        self.reader.last_scan = 0
        self.reader.refresh()
        self.assertEqual(self.app.store.get('nativeSubagent', 'child')['activityStatus'], 'unknown')

    def test_message_text_cannot_forge_a_lifecycle_event(self):
        path = self.rollout('first', usage=False)
        self.append_events(path, [{'type': 'response_item', 'payload': {'type': 'task_started'}},
                                 {'type': 'event_msg', 'payload': {'type': 'agent_message', 'text': 'task_complete'}}])
        self.assertEqual(read_native_rollout(path)['activityStatus'], 'unknown')

    def test_stale_terminal_heartbeat_does_not_reanimate_a_previous_running_turn(self):
        self.register('terminal')
        root = self.rollout('parent')
        child = self.rollout('child', {'subagent': {'other': 'fixture'}}, parent='parent')
        event = self.lifecycle('task_started', '2026-10-02T10:00:00Z')
        self.append_events(root, [event])
        self.append_events(child, [event])
        stale = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        self.app.store.update('nativeSession', 'terminal', updatedAt=stale)
        self.reader.refresh()
        self.assertEqual(self.app.store.get('nativeSession', 'terminal')['activityStatus'], 'unknown')
        self.assertEqual(self.app.store.get('nativeSubagent', 'child')['activityStatus'], 'unknown')
