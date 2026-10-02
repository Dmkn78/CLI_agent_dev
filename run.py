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
from server.canvas import save_canvas
from server.tariffs import save_tariff
from server.processes import process_inventory
from server.desktop import open_desktop, pick_directory

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
                elif route == '/api/processes':
                    self.reply(process_inventory())
                elif route == '/api/terminal/usage/choices':
                    self.reply(app.native_usage.choices(query['id']))
                elif route == '/api/files':
                    self.reply(app.files(query.get('project', 'atelier'), query.get('path', '')))
                elif route == '/api/desktop-file':
                    path = app.file_path(query.get('project', 'atelier'), query.get('path', ''))
                    if not path.is_file() or path.stat().st_size > 20 * 1024 * 1024:
                        raise ValueError('Dépôt limité aux fichiers de projet de 20 Mo maximum.')
                    self.reply({'path': str(path)})
                elif route == '/api/git':
                    self.reply(app.git(query.get('project', 'atelier')))
                elif route == '/api/worktrees':
                    self.reply(app.worktrees(query.get('project', 'atelier')))
                elif route == '/api/pull-requests':
                    self.reply(app.pull_requests(query.get('project', 'atelier')))
                elif route == '/api/events':
                    self.reply(app.store.events(int(query.get('after', 0)), session=query.get('session')))
                elif route == '/api/duplica/screenshot':
                    import re
                    screenshot_id = query.get('id', '')
                    if not re.fullmatch(r'screen_[a-f0-9]{12}', screenshot_id):
                        raise ValueError('Identifiant de capture invalide.')
                    path = app.duplica.directory / 'screenshots' / (screenshot_id + '.png')
                    self.reply(path.read_bytes(), mime='image/png')
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
                elif route in ('/app.js', '/core.js', '/views.js', '/cockpit.js', '/chat.js', '/forms.js', '/workbench.js', '/design.js', '/webchat.js', '/shell.js', '/terminal.js', '/duplica.js', '/duplica_chat.js', '/session_usage.js', '/channels.js', '/api_connections.js', '/channels.css', '/style.css', '/icon.svg', '/vendor/logicflow.js', '/vendor/logicflow.css', '/vendor/xterm.js', '/vendor/xterm.css'):
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
                if route == '/api/channels':
                    result = app.channels.create(data)
                elif route == '/api/channels/participants':
                    result = app.channels.add_participant(data['id'], {key: value for key, value in data.items() if key != 'id'})
                elif route == '/api/channels/remove-participant':
                    result = app.channels.remove_participant(data['id'], data['participantId'])
                elif route == '/api/channels/messages':
                    result = app.channels.post_message(data['id'], {key: value for key, value in data.items() if key != 'id'})
                elif route == '/api/channels/start':
                    result = app.channels.start(data['id'])
                elif route == '/api/channels/stop':
                    result = app.channels.stop(data['id'])
                elif route == '/api/channels/prepare-task':
                    result = app.channels.prepare_task(data['id'])
                elif route == '/api/api-connections':
                    result = app.api_connections.save(data)
                elif route == '/api/api-connections/discover':
                    result = app.api_connections.discover(data['id'])
                elif route == '/api/api-connections/remove':
                    result = app.api_connections.remove(data['id'])
                elif route == '/api/duplica/control':
                    result = app.duplica.control(data['action'], data.get('globalEnabled'))
                elif route == '/api/duplica/configure':
                    result = app.duplica.configure(data)
                elif route == '/api/duplica/discussion':
                    result = app.duplica.discussion.send(data)
                elif route == '/api/duplica/telegram/connect':
                    result = app.duplica.telegram.connect(data)
                elif route == '/api/duplica/telegram/pair':
                    result = app.duplica.telegram.pair()
                elif route == '/api/duplica/work':
                    result = app.duplica.work_on_project(data)
                elif route == '/api/duplica/scope':
                    result = app.duplica.set_scope(data['kind'], data['id'], data.get('enabled'))
                elif route == '/api/duplica/context':
                    result = app.duplica.save_context(data)
                elif route == '/api/duplica/decision':
                    result = app.duplica.save_decision(data)
                elif route == '/api/duplica/mission':
                    result = app.duplica.save_mission(data)
                elif route == '/api/duplica/resume':
                    result = app.duplica.resume_mission(data['sessionId'])
                elif route == '/api/duplica/resolve':
                    result = app.duplica.resolve_request(data['id'], data.get('answer', ''), data.get('accepted') is True, data.get('remember') is True)
                elif route == '/api/duplica/verify':
                    result = app.duplica.schedule_verification(data['id'])
                elif route == '/api/duplica/computer/observe':
                    result = app.duplica.computer.observe(data.get('target', 'platform'))
                elif route == '/api/duplica/computer/act':
                    result = app.duplica.computer_action(data)
                elif route == '/api/duplica/computer/poll':
                    result = app.duplica.bridge.poll()
                elif route == '/api/duplica/computer/check':
                    result = app.duplica.bridge.check(data['id'], data['generation'])
                elif route == '/api/duplica/computer/complete':
                    result = app.duplica.bridge.complete(data['id'], data.get('result'), data.get('error'), data.get('errorCode'))
                elif route == '/api/duplica/terminal':
                    result = app.duplica.native_terminal(data)
                elif route == '/api/providers/refresh':
                    result = app.discover()
                elif route == '/api/providers/login':
                    result = app.login()
                elif route == '/api/providers/limits':
                    result = app.refresh_limits()
                elif route == '/api/terminal/prepare':
                    result = app.terminal_plan(data)
                elif route == '/api/terminal/usage/bind':
                    result = app.native_usage.bind(data['id'], data['threadId'])
                elif route == '/api/desktop/open':
                    result = open_desktop(app.root, self.server.server_port, data.get('mode', 'chat'))
                elif route == '/api/projects/pick':
                    result = pick_directory()
                elif route == '/api/terminal/open':
                    result = app.open_terminal(data)
                elif route == '/api/sessions':
                    result = app.new_session(data)
                elif route == '/api/sessions/prompt':
                    result = app.prompt(data['id'], data['text'])
                elif route == '/api/sessions/interrupt':
                    result = app.interrupt(data['id'])
                elif route == '/api/sessions/plan':
                    result = app.approve_plan(data['id'], data.get('accepted') is True)
                elif route == '/api/notifications/read':
                    result = app.store.update('notification', data['id'], read=True)
                elif route == '/api/sessions/resume':
                    result = app.resume(data['id'])
                elif route == '/api/sessions/context':
                    result = app.configure_session(data['id'], data)
                elif route == '/api/sessions/work':
                    result = app.set_work(data['id'], data.get('enabled', True))
                elif route == '/api/sessions/report':
                    result = app.report(data['id'], bool(data.get('close')))
                elif route == '/api/approvals':
                    approval = app.store.get('approval', data['id'])
                    result = app.approve(data['id'], data.get('decision'), data.get('answers'))
                    if data.get('remember') is True and approval['method'] == 'item/tool/requestUserInput':
                        session = app.store.get('session', approval['sessionId'])
                        for question in approval['params'].get('questions', []):
                            app.duplica.save_decision({'projectId': session['projectId'], 'questions': [question['question']], 'answer': data['answers'][question['id']]})
                elif route == '/api/save':
                    result = app.upsert(data['kind'], data['value'])
                elif route == '/api/designs':
                    result = save_canvas(app, data)
                elif route == '/api/tariffs':
                    result = save_tariff(app, data)
                elif route == '/api/memory/search':
                    from server.memory_mcp import search_memories
                    result = search_memories(app.store.all('memory'), data['query'], project=data.get('projectId', 'atelier'))
                elif route == '/api/benchmarks':
                    result = app.benchmark(data)
                elif route == '/api/benchmarks/generate':
                    result = app.generate_cases(data)
                elif route == '/api/workflows':
                    result = app.workflow(data)
                elif route == '/api/workflows/plan':
                    result = app.approve_workflow_plan(data['id'], data.get('accepted') is True)
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
