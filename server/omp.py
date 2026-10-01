"""Oh My Pi JSONL transport. Native credentials remain owned by OMP."""
import json
import queue
import shutil
import subprocess
import threading


class OmpError(RuntimeError):
    pass


class OmpClient:
    def __init__(self, cwd, session_dir, callback=None, model=None, effort='off', instructions='', executable=None):
        self.callback = callback or (lambda frame: None)
        self.pending = {}
        self.lock = threading.RLock()
        self.write_lock = threading.Lock()
        self.counter = 0
        self.closing = False
        self.errors = []
        self.ready = threading.Event()
        executable = executable or shutil.which('omp')
        if not executable:
            raise OmpError('Oh My Pi est absent du PATH.')
        command = (executable if isinstance(executable, list) else [executable]) + ['--mode', 'rpc', '--no-tools', '--no-extensions', '--no-lsp',
                   '--no-skills', '--no-rules', '--no-title', '--approval-mode', 'always-ask',
                   '--session-dir', str(session_dir)]
        if model:
            command += ['--model', model, '--thinking', effort]
        if instructions:
            command += ['--append-system-prompt', instructions]
        policy = session_dir / 'atelier-policy.json'
        policy.write_text(json.dumps({'tools': {'approval': {'atelier_read': 'allow', 'atelier_write': 'allow'}},
                                      'providers': {'cacheWarming': 'off'}, 'advisor': {'enabled': False}}), encoding='utf-8')
        command += ['--config', str(policy)]
        self.process = subprocess.Popen(command, cwd=cwd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                        stderr=subprocess.PIPE, text=True, encoding='utf-8', bufsize=1)
        threading.Thread(target=self._read, daemon=True).start()
        threading.Thread(target=self._read_errors, daemon=True).start()
        if not self.ready.wait(30) or self.process.poll() is not None:
            self.close()
            raise OmpError('OMP ne peut pas démarrer. Consulte son installation et ses permissions locales.')

    def _read_errors(self):
        for line in self.process.stderr:
            self.errors.append(line.strip())
            self.errors = self.errors[-5:]

    def _read(self):
        try:
            for line in self.process.stdout:
                try:
                    frame = json.loads(line)
                except ValueError:
                    continue
                if frame.get('type') == 'ready':
                    self.ready.set()
                elif frame.get('type') == 'response':
                    with self.lock:
                        waiting = self.pending.get(frame.get('id'))
                    if waiting:
                        waiting.put(frame)
                else:
                    self.callback(frame)
        finally:
            self.ready.set()
            with self.lock:
                for waiting in self.pending.values():
                    waiting.put({'success': False, 'error': 'Processus OMP fermé.'})
            self.callback({'type': 'atelier_disconnected', 'expected': self.closing})

    def send(self, frame):
        with self.write_lock:
            if self.process.poll() is not None:
                raise OmpError('Processus OMP fermé.')
            self.process.stdin.write(json.dumps(frame, ensure_ascii=False) + '\n')
            self.process.stdin.flush()

    def rpc(self, command, payload=None, timeout=45):
        with self.lock:
            self.counter += 1
            request_id = 'omp_' + str(self.counter)
            waiting = queue.Queue()
            self.pending[request_id] = waiting
        try:
            self.send(dict(payload or {}, type=command, id=request_id))
            try:
                response = waiting.get(timeout=timeout)
            except queue.Empty:
                raise OmpError('Délai dépassé pour OMP : ' + command)
            if not response.get('success'):
                raise OmpError(response.get('error', 'Commande OMP refusée.'))
            return response.get('data') or {}
        finally:
            with self.lock:
                self.pending.pop(request_id, None)

    def close(self):
        self.closing = True
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
        for stream in (self.process.stdin, self.process.stdout, self.process.stderr):
            if stream and not stream.closed:
                stream.close()


def discover_models(cwd):
    executable = shutil.which('omp')
    if not executable:
        return {'installed': False, 'models': [], 'error': 'Oh My Pi est absent du PATH.'}
    try:
        result = subprocess.run([executable, 'models', '--json', '--no-extensions'], cwd=cwd,
                                capture_output=True, text=True, encoding='utf-8', timeout=30)
        if result.returncode:
            raise OmpError('OMP ne peut pas lire son catalogue. Vérifie ses permissions et lance omp models dans un terminal.')
        catalog = json.loads(result.stdout)
        models = catalog.get('models', [])
        return {'installed': True, 'error': None, 'models': [dict(model=m['selector'], displayName=m.get('name') or m['id'],
                provider=m['provider'], modelId=m['id'], defaultReasoningEffort='off',
                supportedReasoningEfforts=[{'reasoningEffort': e} for e in ['off'] + (m.get('thinking') or [])])
                for m in models]}
    except (OSError, ValueError, subprocess.TimeoutExpired, OmpError) as exc:
        return {'installed': True, 'models': [], 'error': str(exc)}
