"""Computer observation/action boundary with expiring, single-use observations."""
import base64
import hashlib
import threading
import time
from pathlib import Path
from typing import Callable, Protocol

from .store import now, uid


class ComputerAdapter(Protocol):
    def available(self) -> bool: ...
    def request(self, operation: str, target: str, payload: dict) -> dict: ...
    def cancel(self) -> None: ...


class ObservationChanged(ValueError):
    """Adapter guarantees validation failed before any input was sent."""


class ComputerUnavailable(ValueError):
    """An observation or input result is unavailable; do not repeat an uncertain action."""


class DesktopBridge:
    """The local Electron process owns capturePage and real mouse/keyboard input."""
    def __init__(self) -> None:
        self.condition = threading.Condition()
        self.pending = {}
        self.last_seen = 0.0
        self.generation = 0
        self.closed = False

    def available(self) -> bool:
        return not self.closed and time.monotonic() - self.last_seen < 12

    def request(self, operation: str, target: str, payload: dict) -> dict:
        with self.condition:
            if not self.available():
                raise ComputerUnavailable('Atelier desktop doit être ouvert pour observer et manipuler cette interface.')
            request_id = uid('computer')
            job = dict(id=request_id, operation=operation, target=target, payload=payload,
                       generation=self.generation, leased=False, result=None, error=None, errorCode=None)
            self.pending[request_id] = job
            self.condition.notify_all()
            deadline = time.monotonic() + 12
            while job['result'] is None and not job['error'] and time.monotonic() < deadline:
                self.condition.wait(min(0.2, max(0, deadline - time.monotonic())))
            self.pending.pop(request_id, None)
            if job['error'] or job['result'] is None:
                if job['errorCode'] == 'stale_observation':
                    raise ObservationChanged(job['error'])
                if not job['error']:
                    raise ComputerUnavailable('Le contrôleur du PC ne répond pas ; résultat indéterminé, aucun replay.')
                raise ValueError(job['error'])
            return job['result']

    def poll(self) -> dict:
        with self.condition:
            self.last_seen = time.monotonic()
            job = next((job for job in self.pending.values() if not job['leased'] and not job['error']), None)
            if not job:
                return {'job': None}
            job['leased'] = True
            return {'job': {key: job[key] for key in ('id', 'operation', 'target', 'payload', 'generation')}}

    def check(self, request_id: str, generation: int) -> dict:
        with self.condition:
            job = self.pending.get(request_id)
            return {'allowed': bool(job and not job['error'] and generation == self.generation and job['leased'])}

    def complete(self, request_id: str, result: dict, error: str = None, error_code: str = None) -> dict:
        with self.condition:
            job = self.pending.get(request_id)
            if job and job['generation'] == self.generation and not job['error']:
                job['result'], job['error'] = result, error
                job['errorCode'] = error_code
                self.condition.notify_all()
            return {'ok': True}

    def cancel(self) -> None:
        with self.condition:
            self.generation += 1
            for job in self.pending.values():
                job['error'] = 'Contrôle repris ou supervision suspendue. Action annulée.'
            self.condition.notify_all()


class ComputerController:
    def __init__(self, adapter: ComputerAdapter, directory: Path, audit: Callable[[dict], None] = None) -> None:
        self.adapter = adapter
        self.directory = directory
        self.snapshots = {}
        self.lock = threading.RLock()
        self.audit = audit

    def capabilities(self) -> dict:
        return {'available': self.adapter.available(), 'adapter': 'electron',
                'screen': True, 'mouse': True, 'keyboard': True, 'localBrowser': True,
                'externalDesktop': False, 'targets': ['platform', 'local-browser']}

    def observe(self, target: str = 'platform') -> dict:
        if target not in ('platform', 'local-browser'):
            raise ValueError('Fenêtre non prise en charge par ce contrôleur.')
        with self.lock:
            result = self.adapter.request('observe', target, {})
            return self._remember(target, result)

    def act(self, snapshot_id: str, action: dict) -> dict:
        with self.lock:
            snapshot = self.snapshots.pop(snapshot_id, None)
            if not snapshot or time.monotonic() - snapshot['clock'] > 20:
                raise ValueError('Observation périmée. Observe la fenêtre avant cette action.')
            if action.get('kind') not in ('click', 'double_click', 'type_text', 'press_key', 'scroll', 'scroll_to', 'open_url'):
                raise ValueError('Action PC inconnue.')
            result = self.adapter.request('act', snapshot['target'], {'observation': snapshot['native'], 'action': action})
            observation = self._remember(result.get('target', snapshot['target']), result)
            if self.audit:
                self.audit({'action': action, 'target': snapshot['target'], 'snapshotId': snapshot_id,
                            'before': snapshot.get('screenshot'), 'after': observation.get('screenshot'),
                            'source': 'computer:observed-action'})
            return observation

    def cancel(self) -> None:
        self.adapter.cancel()
        # No lock here: an in-flight bridge wait must be cancellable immediately.
        self.snapshots.clear()

    def _remember(self, target: str, result: dict) -> dict:
        if not isinstance(result, dict) or not isinstance(result.get('observationId'), str):
            raise ValueError('Le contrôleur a renvoyé une observation invalide.')
        screenshot = None
        if result.get('png'):
            content = base64.b64decode(result.pop('png'), validate=True)
            if not content.startswith(b'\x89PNG\r\n\x1a\n') or len(content) > 700000:
                raise ValueError('Capture PNG invalide ou trop volumineuse.')
            self.directory.mkdir(parents=True, exist_ok=True)
            screenshot = dict(id=uid('screen'), sha256=hashlib.sha256(content).hexdigest())
            path = self.directory / (screenshot['id'] + '.png')
            path.write_bytes(content)
            screenshot['path'] = str(path)
        snapshot_id = uid('snapshot')
        observation = {**result, 'id': snapshot_id, 'target': target, 'createdAt': now(), 'screenshot': screenshot}
        self.snapshots = {key: snap for key, snap in self.snapshots.items() if time.monotonic() - snap['clock'] <= 20}
        self.snapshots[snapshot_id] = {'target': target, 'clock': time.monotonic(), 'native': result['observationId'], 'screenshot': screenshot}
        return observation
