"""Read native counters and explicit lifecycle events, never transcripts or authentication."""
import json
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .store import now

TOKEN_FIELDS = {'input_tokens': 'inputTokens', 'output_tokens': 'outputTokens',
                'cached_input_tokens': 'cachedInputTokens', 'total_tokens': 'totalTokens',
                'reasoning_output_tokens': 'reasoningOutputTokens', 'cache_write_input_tokens': 'cacheWriteTokens'}
NATIVE_HEARTBEAT_MAX_AGE_SECONDS = 30


def counts(raw: dict) -> dict | None:
    if not isinstance(raw, dict):
        return None
    counters = {target: raw[source] for source, target in TOKEN_FIELDS.items()
                if isinstance(raw.get(source), int) and not isinstance(raw[source], bool) and raw[source] >= 0}
    return counters or None


def read_native_rollout(path: Path, counters: bool = True) -> dict | None:
    with path.open('rb') as stream:
        first = stream.readline(1024 * 1024)
        try:
            record = json.loads(first)
        except ValueError:
            return None
        if not isinstance(record, dict):
            return None
        metadata = record.get('payload', {})
        if not isinstance(metadata, dict) or record.get('type') != 'session_meta':
            return None
        source = metadata.get('source')
        spawn = source.get('subagent') if isinstance(source, dict) else None
        spawn = spawn.get('thread_spawn', {}) if isinstance(spawn, dict) else {}
        parent_id = metadata.get('parent_thread_id') or (spawn.get('parent_thread_id') if isinstance(spawn, dict) else None)
        is_child = isinstance(source, dict) and 'subagent' in source and isinstance(parent_id, str) and bool(parent_id)
        if source != 'cli' and not is_child:
            return None
        result = {key: metadata.get(key) for key in ('id', 'cwd', 'timestamp')}
        result.update(source='codex:local-rollout', sourceKind='subagent' if is_child else 'cli', usage=None,
                      parentThreadId=parent_id if is_child else None, activityStatus='unknown')
        if is_child:
            for target, key in (('name', 'agent_nickname'), ('role', 'agent_role')):
                field = metadata.get(key) or (spawn.get(key) if isinstance(spawn, dict) else None)
                if isinstance(field, str):
                    result[target] = field[:80]
        if not counters:
            return result
        size = path.stat().st_size
        if size > 1024 * 1024:
            stream.seek(size - 1024 * 1024)
            stream.readline()
        for line in stream:
            try:
                event = json.loads(line)
            except (ValueError, UnicodeError):
                continue
            if not isinstance(event, dict):
                continue
            payload = event.get('payload', {})
            if not isinstance(payload, dict):
                continue
            if event.get('type') == 'turn_context':
                result['model'] = payload.get('model')
            if event.get('type') != 'event_msg':
                continue
            event_type = payload.get('type')
            timestamp = event.get('timestamp')
            if event_type in ('task_started', 'task_complete', 'turn_aborted'):
                result['activityStatus'] = {'task_started': 'running', 'task_complete': 'completed', 'turn_aborted': 'interrupted'}[event_type]
                result['activityObservedAt'] = timestamp
                if event_type == 'task_started':
                    result['turnStartedAt'] = timestamp
                    result['lastCompletedAt'] = None
                    result['lastTurnDurationMs'] = None
                else:
                    result['lastCompletedAt'] = timestamp
                    try:
                        elapsed = datetime.fromisoformat(timestamp.replace('Z', '+00:00')) - datetime.fromisoformat(result['turnStartedAt'].replace('Z', '+00:00'))
                        if elapsed.total_seconds() >= 0:
                            result['lastTurnDurationMs'] = round(elapsed.total_seconds() * 1000)
                    except (KeyError, ValueError, TypeError, AttributeError):
                        pass
            if event_type != 'token_count':
                continue
            info = payload.get('info')
            if isinstance(info, dict):
                total, last = counts(info.get('total_token_usage') or {}), counts(info.get('last_token_usage') or {})
                if total:
                    result['usage'] = {'total': total, 'last': last, 'modelContextWindow': info.get('model_context_window')}
                    result['observedAt'] = event.get('timestamp')
            limits = payload.get('rate_limits')
            if isinstance(limits, dict):
                result['plan'] = limits.get('plan_type')
                result['limits'] = {'rateLimits': {key: {'usedPercent': window.get('used_percent'),
                    'windowDurationMins': window.get('window_minutes'), 'resetsAt': window.get('resets_at')}
                    for key in ('primary', 'secondary') if isinstance(window := limits.get(key), dict)}}
    return result


def read_cli_rollout(path: Path, counters: bool = True) -> dict | None:
    observed = read_native_rollout(path, counters)
    return observed if observed and observed['sourceKind'] == 'cli' else None


class NativeUsage:
    def __init__(self, app, directory: Path | None = None) -> None:
        self.app, self.store = app, app.store
        self.directory = directory or Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'sessions'
        self.lock = threading.RLock()
        self.last_scan = 0
        self.candidates = {}

    def register(self, details: dict) -> None:
        terminal_id = details['id']
        with self.lock:
            previous = next((terminal for terminal in self.store.all('nativeSession') if terminal['id'] == terminal_id), {})
            project = self.app.project(details.get('projectId', 'atelier'))
            terminal = {**previous, **{key: details.get(key) for key in ('id', 'pid', 'runtime', 'title', 'model')},
                'projectId': project['id'], 'workingPath': project['path'], 'updatedAt': now()}
            terminal.setdefault('createdAt', now())
            terminal['status'] = 'closed' if details.get('event') == 'closed' else 'open'
            self.store.put('nativeSession', terminal)

    def refresh(self) -> None:
        with self.lock:
            if time.monotonic() - self.last_scan < 3:
                return
            self.last_scan = time.monotonic()
            sessions = self.store.all('nativeSession')
            if not any(session.get('runtime') == 'codex' for session in sessions):
                return
            discovered = {}
            for offset in (0, 1):
                day = datetime.now(timezone.utc) - timedelta(days=offset)
                folder = self.directory / day.strftime('%Y/%m/%d')
                try:
                    paths = sorted(folder.glob('*.jsonl'), key=lambda path: path.stat().st_mtime, reverse=True)[:100]
                    for path in paths:
                        if path.is_symlink():
                            continue
                        metadata = read_native_rollout(path, counters=False)
                        if metadata and isinstance(metadata['id'], str) and metadata.get('cwd'):
                            discovered[metadata['id']] = {**metadata, '_path': path}
                except (OSError, ValueError):
                    continue
            candidates = {identifier: candidate for identifier, candidate in discovered.items() if candidate['sourceKind'] == 'cli'}
            self.candidates = candidates
            observed_children = set()
            claimed = {session.get('nativeThreadId') for session in sessions if session.get('nativeThreadId')}
            for session in sessions:
                if session.get('runtime') != 'codex':
                    continue
                linked = candidates.get(session.get('nativeThreadId'))
                if not linked and not session.get('nativeThreadId'):
                    matches = [candidate for candidate in candidates.values() if candidate['id'] not in claimed and
                               self._same_workspace(candidate['cwd'], session['workingPath']) and
                               self._near_start(candidate['timestamp'], session['createdAt'])]
                    competing = [other for other in sessions if other['id'] != session['id'] and other.get('runtime') == 'codex'
                                 and not other.get('nativeThreadId') and self._same_workspace(other['workingPath'], session['workingPath'])
                                 and self._near_start(other['createdAt'], session['createdAt'])]
                    if len(matches) == 1 and not competing:
                        linked = matches[0]
                        claimed.add(linked['id'])
                        session['nativeThreadId'] = linked['id']
                        session['association'] = 'unique-workspace-start'
                if linked:
                    try:
                        observed = read_cli_rollout(linked['_path'])
                        if not self._has_recent_heartbeat(session) and observed['activityStatus'] == 'running':
                            observed['activityStatus'] = 'unknown'
                        self.store.update('nativeSession', session['id'], nativeThreadId=session['nativeThreadId'],
                            association=session.get('association'), usage=observed['usage'], model=observed.get('model') or session.get('model'),
                            accountPlan=observed.get('plan'), accountLimits=observed.get('limits'), observedAt=observed.get('observedAt'),
                            usageSource=observed['source'], activityStatus=observed['activityStatus'],
                            activityObservedAt=observed.get('activityObservedAt'), turnStartedAt=observed.get('turnStartedAt'),
                            lastCompletedAt=observed.get('lastCompletedAt'), lastTurnDurationMs=observed.get('lastTurnDurationMs'))
                        observed_children.update(self._refresh_subagents(session, linked['id'], discovered))
                    except (OSError, ValueError, TypeError):
                        continue
            # A vanished rollout is not evidence that its last running turn is still active.
            for child in self.store.all('nativeSubagent'):
                if child['id'] not in observed_children and child.get('activityStatus') == 'running':
                    self.store.update('nativeSubagent', child['id'], activityStatus='unknown')

    def _refresh_subagents(self, terminal: dict, thread_id: str, discovered: dict) -> set:
        observed_ids, parents = set(), {thread_id}
        pending = [candidate for candidate in discovered.values() if candidate['sourceKind'] == 'subagent']
        # Observe only explicit descendants of a terminal associated with Atelier.
        while pending:
            children = [candidate for candidate in pending if candidate.get('parentThreadId') in parents and candidate['id'] not in parents]
            if not children:
                break
            for candidate in children:
                pending.remove(candidate)
                parents.add(candidate['id'])
                try:
                    observed = read_native_rollout(candidate['_path'])
                    if not observed:
                        continue
                    child = {key: observed.get(key) for key in ('id', 'name', 'role', 'parentThreadId', 'model', 'usage',
                        'activityStatus', 'activityObservedAt', 'turnStartedAt', 'lastCompletedAt', 'lastTurnDurationMs', 'observedAt')}
                    child.update(projectId=terminal['projectId'], terminalId=terminal['id'], source=observed['source'], status='observed')
                    if not self._has_recent_heartbeat(terminal) and child['activityStatus'] == 'running':
                        child['activityStatus'] = 'unknown'
                    self.store.put('nativeSubagent', child)
                    observed_ids.add(child['id'])
                except (OSError, ValueError, TypeError):
                    continue
        return observed_ids

    @staticmethod
    def _has_recent_heartbeat(terminal: dict) -> bool:
        if terminal.get('status') != 'open':
            return False
        try:
            elapsed = datetime.now(timezone.utc) - datetime.fromisoformat(terminal['updatedAt'].replace('Z', '+00:00'))
            return 0 <= elapsed.total_seconds() <= NATIVE_HEARTBEAT_MAX_AGE_SECONDS
        except (KeyError, ValueError, TypeError, AttributeError):
            return False

    def choices(self, terminal_id: str) -> list:
        self.refresh()
        terminal = self.store.get('nativeSession', terminal_id)
        if terminal.get('runtime') != 'codex':
            raise ValueError('L’association des compteurs natifs est disponible pour Codex CLI.')
        return [{key: candidate.get(key) for key in ('id', 'timestamp')} for candidate in self.candidates.values()
                if self._same_workspace(candidate['cwd'], terminal['workingPath'])]

    def bind(self, terminal_id: str, thread_id: str) -> dict:
        with self.lock:
            if thread_id not in {candidate['id'] for candidate in self.choices(terminal_id)}:
                raise ValueError('Choisis une session Codex de ce projet, observée localement.')
            if any(session['id'] != terminal_id and session.get('nativeThreadId') == thread_id for session in self.store.all('nativeSession')):
                raise ValueError('Cette session est déjà liée à un autre terminal.')
            self.store.update('nativeSession', terminal_id, nativeThreadId=thread_id, association='user')
            self.last_scan = 0
            self.refresh()
            return self.store.get('nativeSession', terminal_id)

    @staticmethod
    def _same_workspace(first: str | os.PathLike[str], second: str | os.PathLike[str]) -> bool:
        first_workspace = os.path.normcase(os.path.realpath(os.fspath(first)))
        second_workspace = os.path.normcase(os.path.realpath(os.fspath(second)))
        return first_workspace == second_workspace

    @staticmethod
    def _near_start(first: str, second: str) -> bool:
        try:
            return abs((datetime.fromisoformat(first.replace('Z', '+00:00')) - datetime.fromisoformat(second)).total_seconds()) < 15
        except (ValueError, TypeError, AttributeError):
            return False
