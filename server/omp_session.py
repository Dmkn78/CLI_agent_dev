"""Translate OMP events and expose only project-scoped host tools."""
import hashlib
import json
from pathlib import Path

from .omp import OmpClient, OmpError
from .store import redact, uid

EXCLUDED_PARTS = {'.git', '.atelier', '.codex', '.aws', '.ssh', 'node_modules', '__pycache__'}
MAX_FILE_BYTES = 512 * 1024


def workspace_file(root, relative):
    root = Path(root).resolve()
    path = (root / relative).resolve()
    try:
        parts = path.relative_to(root).parts
    except ValueError:
        raise ValueError('Chemin hors du projet.')
    if not parts or any(p.casefold() in EXCLUDED_PARTS or p.casefold().startswith('.env') for p in parts):
        raise ValueError('Chemin exclu des outils Atelier.')
    return path


class OmpSession:
    def __init__(self, session, directory, instructions, callback):
        self.session = session
        self.callback = callback
        self.pending_writes = {}
        self.seen_messages = set()
        self.turn_id = None
        self.turn_error = None
        self.interrupted = False
        self.planning = bool(session.get('planMode'))
        self.total = dict((session.get('usage') or {}).get('total') or {})
        self.last = {}
        self.client = OmpClient(session['workingPath'], directory, self.on_frame, session['model'],
                                session['effort'], instructions)
        self.process = self.client.process
        try:
            state = self.client.rpc('get_state')
            if state.get('dumpTools'):
                raise OmpError('Des outils natifs OMP sont encore actifs. Session refusée pour conserver le périmètre Atelier.')
            tools = [self.tool('atelier_read', 'Read a project file or list a project directory.',
                               {'path': {'type': 'string'}}, ['path'])]
            if session['sandbox'] == 'workspace-write':
                tools.append(self.tool('atelier_write', 'Replace a project text file after user approval.',
                                        {'path': {'type': 'string'}, 'content': {'type': 'string'}}, ['path', 'content']))
            self.client.rpc('set_host_tools', {'tools': tools})
            if session.get('threadId'):
                self.client.rpc('open_session', {'sessionDir': str(directory)})
            self.state = self.client.rpc('get_state')
            if any(t.get('name') not in ('atelier_read', 'atelier_write') for t in self.state.get('dumpTools', [])):
                raise OmpError('Outils hors du périmètre Atelier détectés.')
            self.client.rpc('set_auto_compaction', {'enabled': False})
        except Exception:
            self.close()
            raise

    @staticmethod
    def tool(name, description, properties, required):
        return {'name': name, 'label': name, 'description': description, 'loadMode': 'essential',
                'parameters': {'type': 'object', 'properties': properties, 'required': required, 'additionalProperties': False}}

    def emit(self, method, params):
        self.callback({'method': method, 'params': params})

    def rpc(self, method, params=None):
        params = params or {}
        if method in ('thread/start', 'thread/resume'):
            return {'thread': {'id': self.state['sessionId']}}
        if method == 'turn/interrupt':
            self.interrupted = True
            self.pending_writes.clear()
            self.client.rpc('abort')
            return {}
        if method != 'turn/start':
            raise OmpError('Commande non prise en charge par OMP : ' + method)
        state = self.client.rpc('get_state')
        if any(t.get('name') not in ('atelier_read', 'atelier_write') for t in state.get('dumpTools', [])):
            raise OmpError('La configuration OMP a changé. Requête refusée.')
        self.turn_id = uid('turn')
        self.turn_error = None
        self.interrupted = False
        self.last = {}
        prompt = params['input'][0]['text']
        if prompt.lstrip().startswith('/'):
            raise OmpError('Les commandes natives OMP sont réservées au terminal. Envoie une mission textuelle dans Atelier.')
        if params.get('outputSchema'):
            prompt += '\nReturn only valid JSON matching this schema:\n' + json.dumps(params['outputSchema'])
        result = self.client.rpc('prompt', {'message': prompt})
        if result.get('agentInvoked') is False:
            self.complete()
        return {'turn': {'id': self.turn_id}}

    def on_frame(self, frame):
        kind = frame.get('type')
        if kind == 'agent_start':
            self.emit('turn/started', {'turn': {'id': self.turn_id}})
        elif kind == 'message_update':
            event = frame.get('assistantMessageEvent', {})
            if event.get('type') == 'text_delta':
                self.emit('item/agentMessage/delta', {'itemId': frame.get('messageId'), 'delta': event.get('delta', '')})
        elif kind == 'message_end':
            message = frame.get('message', {})
            if message.get('role') != 'assistant':
                return
            text = '\n'.join(c.get('text', '') for c in message.get('content', []) if c.get('type') == 'text')
            self.emit('item/completed', {'item': {'type': 'agentMessage', 'id': frame.get('messageId'), 'text': text}})
            if message.get('stopReason') == 'error':
                self.turn_error = {'message': redact(message.get('errorMessage', 'Erreur du fournisseur OMP.'))}
            message_id = frame.get('messageId')
            if message_id not in self.seen_messages and message.get('usage'):
                self.seen_messages.add(message_id)
                self.add_usage(message['usage'])
        elif kind == 'host_tool_call':
            self.handle_tool(frame)
        elif kind == 'host_tool_cancel':
            self.pending_writes.pop(frame.get('targetId'), None)
            self.emit('atelier/approvalExpired', {'requestId': frame.get('targetId')})
        elif kind == 'prompt_result':
            if frame.get('status') == 'error':
                self.turn_error = frame.get('error') or {'message': 'Requête OMP échouée.'}
            if frame.get('status') == 'aborted':
                self.interrupted = True
            if frame.get('sessionSettled', True):
                self.complete()
        elif kind == 'session_settled' and self.turn_id:
            self.complete()
        elif kind in ('rpc_frame_error', 'rpc_chunk'):
            self.turn_error = {'message': 'Trame OMP trop volumineuse pour ce client. Requête non vérifiée.'}
            self.complete()
        elif kind == 'extension_ui_request' and frame.get('method') in ('confirm', 'select', 'input', 'editor'):
            self.client.send({'type': 'extension_ui_response', 'id': frame['id'], 'cancelled': True})
        elif kind == 'atelier_disconnected':
            self.emit('atelier/disconnected', {'expected': frame.get('expected'), 'message': 'Processus OMP fermé.'})

    def add_usage(self, usage):
        observed = {}
        if 'input' in usage:
            observed['inputTokens'] = usage['input'] + usage.get('cacheRead', 0) + usage.get('cacheWrite', 0)
        for source, target in (('output', 'outputTokens'), ('cacheRead', 'cachedInputTokens'), ('cacheWrite', 'cacheWriteTokens')):
            if source in usage:
                observed[target] = usage[source]
        if 'totalTokens' in usage:
            observed['totalTokens'] = usage['totalTokens']
        elif 'inputTokens' in observed and 'outputTokens' in observed:
            observed['totalTokens'] = observed['inputTokens'] + observed['outputTokens']
        for key, count in observed.items():
            self.total[key] = self.total.get(key, 0) + count
            self.last[key] = self.last.get(key, 0) + count
        self.emit('thread/tokenUsage/updated', {'tokenUsage': {'total': self.total, 'last': self.last}})

    def complete(self):
        if not self.turn_id:
            return
        turn_id, self.turn_id = self.turn_id, None
        self.emit('turn/completed', {'turn': {'id': turn_id, 'status': 'interrupted' if self.interrupted else
                                            'failed' if self.turn_error else 'completed', 'error': self.turn_error}})

    def tool_result(self, request_id, text, error=False):
        self.client.send({'type': 'host_tool_result', 'id': request_id, 'isError': error,
                          'result': {'content': [{'type': 'text', 'text': text}]}})

    def handle_tool(self, frame):
        try:
            arguments = frame.get('arguments') or {}
            relative = arguments.get('path', '')
            if not isinstance(relative, str):
                raise ValueError('Chemin invalide.')
            if frame['toolName'] == 'atelier_read' and not relative:
                path = Path(self.session['workingPath']).resolve()
            else:
                path = workspace_file(self.session['workingPath'], relative)
            if frame['toolName'] == 'atelier_read':
                if path.is_dir():
                    text = '\n'.join(p.name + ('/' if p.is_dir() else '') for p in sorted(path.iterdir())
                                     if p.name.casefold() not in EXCLUDED_PARTS and not p.name.casefold().startswith('.env') and not p.is_symlink())[:20000]
                else:
                    if path.stat().st_size > MAX_FILE_BYTES:
                        raise ValueError('Fichier trop volumineux.')
                    text = redact(path.read_text(encoding='utf-8'))
                self.tool_result(frame['id'], text)
                self.emit('item/completed', {'item': {'type': 'mcpToolCall', 'tool': 'atelier_read', 'path': relative, 'success': True}})
            elif frame['toolName'] == 'atelier_write' and self.session['sandbox'] == 'workspace-write' and not self.planning:
                content = arguments.get('content')
                if not isinstance(content, str) or len(content.encode('utf-8')) > MAX_FILE_BYTES:
                    raise ValueError('Contenu invalide ou trop volumineux.')
                previous = path.read_bytes() if path.exists() else None
                self.pending_writes[frame['id']] = (relative, content, hashlib.sha256(previous).hexdigest() if previous is not None else None)
                self.callback({'id': frame['id'], 'method': 'item/fileChange/requestApproval',
                               'params': {'path': relative, 'content': redact(content), 'reason': 'Remplacement du fichier dans le projet.'}})
            else:
                raise ValueError('Outil ou permission non autorisé.')
        except (ValueError, OSError, UnicodeError) as exc:
            self.tool_result(frame['id'], str(exc), True)

    def respond(self, request_id, result):
        pending = self.pending_writes.pop(request_id, None)
        if not pending:
            raise ValueError('Demande expirée ou annulée.')
        if result.get('decision') != 'accept':
            self.tool_result(request_id, 'Écriture refusée.', True)
            return
        relative, content, expected_hash = pending
        try:
            path = workspace_file(self.session['workingPath'], relative)
            current_hash = hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None
            if current_hash != expected_hash:
                raise ValueError('Le fichier a changé depuis la demande. Nouvelle approbation nécessaire.')
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding='utf-8')
            self.tool_result(request_id, 'Fichier enregistré : ' + relative)
            self.emit('item/completed', {'item': {'type': 'fileChange', 'path': relative, 'success': True,
                                                  'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}})
        except (ValueError, OSError) as exc:
            self.tool_result(request_id, str(exc), True)

    def unsupported(self, request_id):
        self.tool_result(request_id, 'Demande non prise en charge.', True)

    def close(self):
        self.pending_writes.clear()
        self.client.close()
