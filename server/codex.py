"""Newline-delimited JSON-RPC adapter to the official local Codex app-server."""
import json
import os
import queue
import shutil
import subprocess
import threading
from .process_environment import agent_environment


class CodexError(RuntimeError):
    pass


class CodexClient:
    def __init__(self, callback=None, executable=None, config=None):
        self.callback = callback or (lambda message: None)
        self.pending = {}
        self.lock = threading.RLock()
        self.write_lock = threading.Lock()
        self.counter = 0
        self.closing = False
        self.stderr = []
        executable = executable or os.environ.get('ATELIER_CODEX_EXECUTABLE') or shutil.which('codex')
        if not executable:
            raise CodexError('Codex CLI est absent. Installe-le puis connecte ton compte avec « codex login ».')
        command = (executable if isinstance(executable, list) else [executable]) + ['app-server', '--listen', 'stdio://', '-c', 'features.multi_agent=false']
        for key, value in (config or {}).items():
            command.extend(['-c', key + '=' + json.dumps(value)])
        self.process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding='utf-8', bufsize=1, start_new_session=True, env=agent_environment(),
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        threading.Thread(target=self._read_errors, daemon=True).start()
        threading.Thread(target=self._read, daemon=True).start()
        try:
            self.rpc('initialize', {'clientInfo': {'name': 'atelier_agents', 'title': 'Atelier', 'version': os.environ.get('ATELIER_VERSION', '0.1.0')}}, timeout=20)
            self.send({'method': 'initialized', 'params': {}})
        except Exception:
            self.close()
            raise

    def _read_errors(self):
        for line in self.process.stderr:
            self.stderr.append(line.strip())
            self.stderr = self.stderr[-12:]

    def _read(self):
        try:
            for line in self.process.stdout:
                try:
                    message = json.loads(line)
                except ValueError:
                    continue
                if 'method' not in message and 'id' in message:
                    with self.lock:
                        waiting = self.pending.get(message['id'])
                    if waiting:
                        waiting.put(message)
                else:
                    try:
                        self.callback(message)
                    except Exception as exc:
                        self.stderr.append('Event handler: ' + str(exc))
        finally:
            error = {'error': {'message': 'Codex s’est arrêté. ' + ' '.join(self.stderr[-3:])}}
            with self.lock:
                for waiting in self.pending.values():
                    waiting.put(error)
            self.callback({'method': 'atelier/disconnected', 'params': {
                'message': 'Processus local fermé.' if self.closing else error['error']['message'], 'expected': self.closing}})

    def send(self, message):
        with self.write_lock:
            if self.process.poll() is not None:
                raise CodexError('Codex est arrêté. ' + ' '.join(self.stderr[-3:]))
            self.process.stdin.write(json.dumps(message) + '\n')
            self.process.stdin.flush()

    def rpc(self, method, params=None, timeout=45):
        with self.lock:
            self.counter += 1
            id = self.counter
            waiting = queue.Queue()
            self.pending[id] = waiting
        try:
            self.send({'id': id, 'method': method, 'params': params or {}})
            try:
                response = waiting.get(timeout=timeout)
            except queue.Empty:
                raise CodexError('Délai dépassé pour ' + method)
            if 'error' in response:
                raise CodexError(response['error'].get('message', str(response['error'])))
            return response.get('result', {})
        finally:
            with self.lock:
                self.pending.pop(id, None)

    def respond(self, id, result):
        self.send({'id': id, 'result': result})

    def unsupported(self, id):
        self.send({'id': id, 'error': {'code': -32601, 'message': 'Ce type de demande nécessite un client compatible.'}})

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
                try:
                    stream.close()
                except (OSError, ValueError):
                    pass
