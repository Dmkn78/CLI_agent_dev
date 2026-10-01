#!/usr/bin/env python3
"""Atelier local web shell. Python 3.9+, no dependency, no remote listening."""
import argparse
import json
import mimetypes
import secrets
import signal
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from server.app import Application
from server.store import redact

ROOT = Path(__file__).resolve().parent


def make_handler(app, token):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            if args and str(args[1] if len(args) > 1 else '').startswith('5'):
                super().log_message(format, *args)

        def reply(self, data, status=200, mime='application/json; charset=utf-8'):
            body = json.dumps(data, ensure_ascii=False).encode() if not isinstance(data, bytes) else data
            self.send_response(status)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; script-src 'self'; connect-src 'self'; frame-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
            self.end_headers()
            self.wfile.write(body)

        def allowed(self, api=False):
            port = self.server.server_port
            hosts = {f'127.0.0.1:{port}', f'localhost:{port}'}
            if self.headers.get('Host') not in hosts:
                self.reply({'error': 'Host refusé.'}, 403)
                return False
            origin = self.headers.get('Origin')
            if origin and origin not in {f'http://{h}' for h in hosts}:
                self.reply({'error': 'Origin refusée.'}, 403)
                return False
            if api and self.headers.get('X-Atelier-Token') != token:
                self.reply({'error': 'Session locale requise.'}, 403)
                return False
            return True

        def do_GET(self):
            parsed = urlparse(self.path)
            route = parsed.path
            if not self.allowed(api=route.startswith('/api/')):
                return
            query = {k: v[0] for k, v in parse_qs(parsed.query).items()}
            try:
                if route == '/api/state':
                    state = app.state()
                    state['approvals'] = app.store.all('approval')
                    self.reply(redact(state))
                elif route == '/api/files':
                    self.reply(app.files(query.get('project', 'atelier'), query.get('path', '')))
                elif route == '/api/git':
                    self.reply(app.git(query.get('project', 'atelier')))
                elif route == '/api/worktrees':
                    self.reply(app.worktrees(query.get('project', 'atelier')))
                elif route == '/api/pull-requests':
                    self.reply(app.pull_requests(query.get('project', 'atelier')))
                elif route == '/api/events':
                    self.reply(app.store.events(int(query.get('after', 0)), session=query.get('session')))
                elif route == '/api/skills':
                    root = app.file_path(query.get('project', 'atelier'))
                    paths = []
                    import os
                    from server.app import IGNORED
                    for directory, dirs, files in os.walk(root):
                        dirs[:] = [d for d in dirs if d not in IGNORED and not d.startswith('.') and not (Path(directory) / d).is_symlink()]
                        if 'SKILL.md' in files:
                            paths.append((Path(directory) / 'SKILL.md').relative_to(root).as_posix())
                        if len(paths) >= 80:
                            break
                    self.reply(paths)
                elif route == '/api/sessions/context':
                    self.reply(app.session_context(query['id']))
                elif route == '/api/image':
                    path = app.file_path(query.get('project', 'atelier'), query.get('path', ''))
                    if path.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp') or path.stat().st_size > 10 * 1024 * 1024:
                        raise ValueError('Image non prise en charge.')
                    self.reply(path.read_bytes(), mime=mimetypes.guess_type(path.name)[0])
                elif route in ('/', '/index.html'):
                    content = (ROOT / 'web/index.html').read_text().replace('__ATELIER_TOKEN__', token)
                    self.reply(content.encode(), mime='text/html; charset=utf-8')
                elif route in ('/app.js', '/core.js', '/views.js', '/cockpit.js', '/chat.js', '/forms.js', '/style.css', '/icon.svg'):
                    path = ROOT / 'web' / route[1:]
                    self.reply(path.read_bytes(), mime=mimetypes.guess_type(path.name)[0] or 'text/plain')
                elif route == '/favicon.ico':
                    self.reply(b'', 204, 'image/x-icon')
                else:
                    self.reply({'error': 'Page introuvable.'}, 404)
            except (ValueError, KeyError, FileNotFoundError, PermissionError) as exc:
                self.reply({'error': str(exc)}, 400)
            except Exception:
                self.reply({'error': 'Le service a rencontré une erreur. Consulte le terminal du serveur.'}, 500)
                import traceback
                traceback.print_exc()

        def do_POST(self):
            if not self.allowed(api=True):
                return
            try:
                length = int(self.headers.get('Content-Length', 0))
                if length < 1 or length > 1024 * 1024:
                    raise ValueError('Requête vide ou trop volumineuse.')
                data = json.loads(self.rfile.read(length))
                route = urlparse(self.path).path
                if route == '/api/providers/refresh':
                    result = app.discover()
                elif route == '/api/providers/login':
                    result = app.login()
                elif route == '/api/terminal/prepare':
                    result = app.terminal_plan(data)
                elif route == '/api/terminal/open':
                    result = app.open_terminal(data)
                elif route == '/api/sessions':
                    result = app.new_session(data)
                elif route == '/api/sessions/prompt':
                    result = app.prompt(data['id'], data['text'])
                elif route == '/api/sessions/interrupt':
                    result = app.interrupt(data['id'])
                elif route == '/api/sessions/resume':
                    result = app.resume(data['id'])
                elif route == '/api/sessions/context':
                    result = app.configure_session(data['id'], data)
                elif route == '/api/sessions/work':
                    result = app.set_work(data['id'], data.get('enabled', True))
                elif route == '/api/sessions/report':
                    result = app.report(data['id'], bool(data.get('close')))
                elif route == '/api/approvals':
                    result = app.approve(data['id'], data.get('decision'), data.get('answers'))
                elif route == '/api/save':
                    result = app.upsert(data['kind'], data['value'])
                elif route == '/api/memory/search':
                    from server.memory_mcp import search_memories
                    result = search_memories(app.store.all('memory'), data['query'], project=data.get('projectId', 'atelier'))
                elif route == '/api/benchmarks':
                    result = app.benchmark(data)
                elif route == '/api/benchmarks/generate':
                    result = app.generate_cases(data)
                elif route == '/api/workflows':
                    result = app.workflow(data)
                elif route == '/api/cancel':
                    if data['kind'] not in ('benchmark', 'workflow'):
                        raise ValueError('Type invalide.')
                    app.store.update(data['kind'], data['id'], status='cancelled')
                    result = {'ok': True}
                else:
                    self.reply({'error': 'Route introuvable.'}, 404)
                    return
                self.reply(redact(result))
            except (ValueError, KeyError, TypeError) as exc:
                self.reply({'error': str(exc)}, 400)
            except Exception as exc:
                self.reply({'error': str(exc)}, 503)
    return Handler


def main():
    parser = argparse.ArgumentParser(description='Atelier — cockpit local d’agents IA')
    parser.add_argument('--port', type=int, default=4317)
    parser.add_argument('--no-open', action='store_true')
    parser.add_argument('--data', type=Path)
    args = parser.parse_args()
    app = Application(ROOT, args.data)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(app, secrets.token_urlsafe(32)))
    server.daemon_threads = True
    print(f'Atelier est disponible sur http://127.0.0.1:{args.port}', flush=True)
    print('Données locales : ' + str(app.store.root), flush=True)
    threading.Thread(target=app.discover, daemon=True).start()
    if not args.no_open:
        webbrowser.open(f'http://127.0.0.1:{args.port}')
    def stop(*_):
        threading.Thread(target=server.shutdown, daemon=True).start()
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        server.serve_forever()
    finally:
        app.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
