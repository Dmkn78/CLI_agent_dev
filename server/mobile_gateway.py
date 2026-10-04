"""Explicit, authenticated mobile bridge for Atelier's loopback HTTP service.

The bridge owns a separate revocable key. It never exposes Atelier's local nonce,
uses no Codex credentials and proxies only a finite set of application routes.
No backend redirect or remote upstream is followed.
"""
import argparse
import hashlib
import html
import http.client
import ipaddress
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import signal
import socket
import stat
import threading
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qsl, urlsplit

TAILSCALE_NETWORK = ipaddress.ip_network('100.64.0.0/10')
MAX_BODY = 1024 * 1024
MAX_RESPONSE = 16 * 1024 * 1024
MAX_APK = 128 * 1024 * 1024
KEY_PATTERN = re.compile(r'[A-Za-z0-9_-]{43}')
GET_ROUTES = {
    '/api/state': set(), '/api/files': {'project', 'path'},
    '/api/files/search': {'project', 'path', 'q'},
    '/api/events': {'after', 'session'}, '/api/git': {'project'},
    '/api/worktrees': {'project'}, '/api/pull-requests': {'project'},
    '/api/skills': {'project'}, '/api/sessions/context': {'id'},
    '/api/memory/export': {'id', 'format'}, '/api/commands': {'project'},
    '/api/image': {'project', 'path'}, '/api/attachments/content': {'project', 'id'},
}
POST_ROUTES = frozenset({
    '/api/sessions', '/api/sessions/prompt', '/api/sessions/interrupt',
    '/api/sessions/plan', '/api/sessions/resume', '/api/sessions/remove',
    '/api/sessions/restore', '/api/sessions/context', '/api/sessions/work',
    '/api/sessions/report', '/api/approvals', '/api/save',
    '/api/workflows', '/api/workflows/plan', '/api/cancel',
    '/api/memory/search', '/api/notifications/read', '/api/duplica/discussion',
    '/api/providers/refresh', '/api/providers/limits',
    '/api/channels', '/api/channels/participants', '/api/channels/options',
    '/api/channels/remove-participant', '/api/channels/messages',
    '/api/channels/start', '/api/channels/stop', '/api/channels/prepare-task',
})
STATIC_FILES = {'/mobile/app.js': 'app.js', '/mobile/style.css': 'style.css'}


class GatewayError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def validate_listen(value):
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        raise ValueError('Écoute : indique une IPv4 Tailscale ou 127.0.0.1.')
    if address.version != 4 or not (address == ipaddress.ip_address('127.0.0.1') or address in TAILSCALE_NETWORK):
        raise ValueError('Écoute publique, LAN et wildcard interdite ; utilise Tailscale ou 127.0.0.1.')
    return str(address)


def validate_backend(value):
    try:
        parsed = urlsplit(value)
        port = parsed.port or 80
    except ValueError:
        raise ValueError('Adresse backend invalide.')
    if (parsed.scheme != 'http' or parsed.hostname not in ('127.0.0.1', 'localhost')
            or parsed.username is not None or parsed.password is not None
            or parsed.path not in ('', '/') or parsed.query or parsed.fragment
            or not 1 <= port <= 65535):
        raise ValueError('Le backend doit être une URL HTTP loopback sans chemin ni credentials.')
    # Never resolve a caller-provided hostname or pass its authority upstream.
    return '127.0.0.1', port


def validate_public_origin(value):
    if not value:
        return None
    try:
        parsed = urlsplit(value)
        port = parsed.port
        address = ipaddress.ip_address(parsed.hostname) if parsed.hostname else None
    except ValueError:
        address = None
        try:
            parsed = urlsplit(value)
            port = parsed.port
        except ValueError:
            raise ValueError('Origine publique invalide.')
    hostname = parsed.hostname or ''
    ts_hostname = bool(re.fullmatch(r'[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.ts\.net', hostname))
    ts_ip = bool(address and address.version == 4 and address in TAILSCALE_NETWORK)
    if (parsed.username is not None or parsed.password is not None or parsed.query or parsed.fragment
            or parsed.path not in ('', '/') or not parsed.netloc
            or (port is not None and not 1 <= port <= 65535)
            or not ((parsed.scheme == 'https' and ts_hostname) or (parsed.scheme in ('http', 'https') and ts_ip))):
        raise ValueError('Origine publique : URL Tailscale explicite (*.ts.net en HTTPS ou IPv4 Tailscale).')
    return parsed.scheme + '://' + parsed.netloc.lower()


class KeyStore:
    """Private key file, read anew so an explicit revocation takes effect live."""
    def __init__(self, directory):
        location = Path(directory).absolute()
        if location.is_symlink() or location.parent.is_symlink():
            raise ValueError('Le stockage de la clé ne peut pas être un lien symbolique.')
        # Resolve OS aliases (for example /var -> /private/var on macOS) once.
        self.directory = location.parent.resolve() / location.name
        self.directory.mkdir(parents=True, exist_ok=True)
        os.chmod(self.directory, 0o700)
        self.path = self.directory / 'key'
        self.lock = threading.RLock()
        if not self.path.exists() and not self.path.is_symlink():
            try:
                self._create(self.path, secrets.token_urlsafe(32))
            except FileExistsError:
                pass
        self.key()

    @staticmethod
    def _create(path, key):
        fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), 0o600)
        try:
            os.write(fd, (key + '\n').encode('ascii'))
            os.fsync(fd)
        finally:
            os.close(fd)

    def key(self):
        with self.lock:
            if self.path.is_symlink():
                raise ValueError('Le fichier de clé ne peut pas être un lien symbolique.')
            fd = os.open(str(self.path), os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
            try:
                info = os.fstat(fd)
                if not stat.S_ISREG(info.st_mode) or info.st_size > 128 or info.st_nlink != 1:
                    raise ValueError('Fichier de clé invalide.')
                if hasattr(os, 'fchmod'):
                    os.fchmod(fd, 0o600)
                else:
                    os.chmod(self.path, 0o600)  # Windows: permissions inherited from the private user profile.
                key = os.read(fd, 128).decode('ascii').strip()
            finally:
                os.close(fd)
            if not KEY_PATTERN.fullmatch(key):
                raise ValueError('Clé mobile invalide ; utilise --revoke puis --pair.')
            return key

    def rotate(self):
        with self.lock:
            key = secrets.token_urlsafe(32)
            temporary = self.directory / ('.key-' + secrets.token_hex(8))
            try:
                self._create(temporary, key)
                os.replace(str(temporary), str(self.path))
            finally:
                temporary.unlink(missing_ok=True)
            return key


class _NonceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tokens = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and attrs.get('name') == 'atelier-token':
            self.tokens.append(attrs.get('content', ''))


class MobileGateway:
    def __init__(self, root, backend, keys, pc_name=None, public_origin=None, timeout=30):
        self.root = Path(root).resolve()
        self.backend_host, self.backend_port = validate_backend(backend)
        self.keys = keys
        self.pc_name = str(pc_name or socket.gethostname())[:100]
        self.public_origin = validate_public_origin(public_origin)
        self.timeout = timeout
        self._nonce = None
        self._nonce_lock = threading.RLock()

    @staticmethod
    def parse_target(target, method):
        if len(target) > 8192 or not target.startswith('/') or target.startswith('//') or '\\' in target:
            raise GatewayError('Chemin invalide.')
        parsed = urlsplit(target)
        if parsed.scheme or parsed.netloc or parsed.fragment or '%' in parsed.path or '..' in parsed.path:
            raise GatewayError('Chemin invalide.')
        if len(parsed.query) > 4096:
            raise GatewayError('Paramètres trop longs.')
        route = parsed.path
        if method == 'GET' and route in GET_ROUTES:
            try:
                query = parse_qsl(parsed.query, keep_blank_values=True, max_num_fields=12)
            except ValueError:
                raise GatewayError('Paramètres invalides.')
            if any(key not in GET_ROUTES[route] for key, _ in query) or len({key for key, _ in query}) != len(query):
                raise GatewayError('Paramètre non autorisé.')
        elif method == 'POST' and route in POST_ROUTES:
            if parsed.query:
                raise GatewayError('Paramètres dans l’URL interdits pour cette action.')
        elif route.startswith('/api/'):
            raise GatewayError('Cette action n’est pas disponible depuis le téléphone.', 404)
        elif parsed.query:
            raise GatewayError('Paramètres dans l’URL interdits.')
        return route

    @staticmethod
    def validate_body(route, body):
        if not isinstance(body, bytes) or not 1 <= len(body) <= MAX_BODY:
            raise GatewayError('Requête vide ou trop volumineuse.', 413)
        try:
            data = json.loads(body)
        except (ValueError, UnicodeDecodeError, RecursionError):
            raise GatewayError('Objet JSON invalide.')
        if not isinstance(data, dict):
            raise GatewayError('Un objet JSON est requis.')
        if route == '/api/save' and data.get('kind') not in ('project', 'task', 'memory', 'sprint'):
            raise GatewayError('Type de donnée non autorisé.')
        if route == '/api/cancel' and data.get('kind') != 'workflow':
            raise GatewayError('Seul un workflow peut être interrompu ici.')
        # Backend applies these invariants too. Reject unknown permission profiles
        # before forwarding, including specialist configurations in workflows.
        def check(value, depth=0):
            if depth > 30:
                raise GatewayError('Objet trop imbriqué.')
            if isinstance(value, dict):
                for key, item in value.items():
                    if key == 'sandbox' and item not in ('read-only', 'workspace-write'):
                        raise GatewayError('Choisis lecture seule ou écriture projet.')
                    if key == 'approvalPolicy' and item != 'on-request':
                        raise GatewayError('Les permissions restent on-request.')
                    if key in ('dangerouslyBypassApprovalsAndSandbox', 'bypassPermissions', 'dangerFullAccess'):
                        raise GatewayError('Contournement des permissions interdit.')
                    check(item, depth + 1)
            elif isinstance(value, list):
                for item in value:
                    check(item, depth + 1)
        check(data)
        return data

    def _request(self, method, target, body=None, nonce=None, limit=MAX_RESPONSE):
        connection = http.client.HTTPConnection(self.backend_host, self.backend_port, timeout=self.timeout)
        headers = {'Host': f'127.0.0.1:{self.backend_port}', 'Accept': 'application/json'}
        if nonce is not None:
            headers['X-Atelier-Token'] = nonce
        if body is not None:
            headers['Content-Type'] = 'application/json'
            headers['Content-Length'] = str(len(body))
        try:
            connection.request(method, target, body=body, headers=headers)
            response = connection.getresponse()
            length = response.getheader('Content-Length')
            if length is not None and (not length.isdecimal() or int(length) > limit):
                raise GatewayError('Réponse locale trop volumineuse.', 502)
            content = response.read(limit + 1)
            if len(content) > limit:
                raise GatewayError('Réponse locale trop volumineuse.', 502)
            if 300 <= response.status < 400:
                raise GatewayError('Redirection du backend refusée.', 502)
            return response.status, response.getheader('Content-Type', 'application/json'), content
        except (OSError, http.client.HTTPException):
            raise GatewayError('Atelier PC est inaccessible ; vérifie son port local.', 502)
        finally:
            connection.close()

    def _local_nonce(self, stale=None):
        with self._nonce_lock:
            if self._nonce and (stale is None or self._nonce != stale):
                return self._nonce
            status, _, content = self._request('GET', '/', limit=2 * MAX_BODY)
            if status != 200:
                raise GatewayError('La session locale Atelier est indisponible.', 502)
            parser = _NonceParser()
            try:
                parser.feed(content.decode('utf-8'))
            except (ValueError, UnicodeDecodeError):
                raise GatewayError('La session locale Atelier est invalide.', 502)
            if len(parser.tokens) != 1 or not KEY_PATTERN.fullmatch(parser.tokens[0]):
                raise GatewayError('Le nonce local Atelier est indisponible.', 502)
            self._nonce = parser.tokens[0]
            return self._nonce

    def forward(self, method, target, body=None):
        route = self.parse_target(target, method)
        if not route.startswith('/api/'):
            raise GatewayError('Route API requise.', 404)
        if method == 'POST':
            self.validate_body(route, body or b'')
        nonce = self._local_nonce()
        result = self._request(method, target, body, nonce)
        # This exact backend error is returned by allowed() BEFORE any action.
        # Never replay a timeout, a generic 403 or an indeterminate mutation.
        if result[0] == 403:
            try:
                expired = json.loads(result[2]) == {'error': 'Session locale requise.'}
            except (ValueError, UnicodeDecodeError):
                expired = False
            if expired:
                nonce = self._local_nonce(stale=nonce)
                result = self._request(method, target, body, nonce)
        mime = result[1].split(';', 1)[0].lower()
        if mime not in ('application/json', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'):
            raise GatewayError('Format de réponse locale refusé.', 502)
        return result

    def _file(self, path, limit):
        if path.is_symlink() or not path.resolve().is_relative_to(self.root):
            raise GatewayError('Fichier indisponible.', 404)
        try:
            fd = os.open(str(path), os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
            with os.fdopen(fd, 'rb') as stream:
                info = os.fstat(stream.fileno())
                if not stat.S_ISREG(info.st_mode) or info.st_size > limit:
                    raise GatewayError('Fichier trop volumineux.', 503)
                result = stream.read(limit + 1)
                if len(result) > limit:
                    raise GatewayError('Fichier trop volumineux.', 503)
                return result
        except OSError:
            raise GatewayError('Fichier indisponible.', 404)

    def release(self, apk=False):
        directory = self.root / 'build' / 'mobile'
        try:
            manifest = json.loads(self._file(directory / 'release.json', 8192))
            content = self._file(directory / 'Atelier-mobile.apk', MAX_APK)
        except GatewayError:
            raise
        except (ValueError, TypeError, UnicodeDecodeError):
            raise GatewayError('La mise à jour mobile est indisponible.', 503)
        if (not isinstance(manifest, dict)
                or type(manifest.get('versionCode')) is not int or manifest['versionCode'] < 1
                or not isinstance(manifest.get('versionName'), str) or not 1 <= len(manifest['versionName']) <= 80
                or type(manifest.get('size')) is not int or not 0 < manifest['size'] <= MAX_APK
                or not isinstance(manifest.get('sha256'), str) or not re.fullmatch(r'[a-f0-9]{64}', manifest['sha256'])
                or manifest.get('url') != '/mobile/atelier.apk'
                or len(content) != manifest['size']
                or not secrets.compare_digest(hashlib.sha256(content).hexdigest(), manifest['sha256'])):
            raise GatewayError('La mise à jour mobile n’est pas validée.', 503)
        if apk:
            return 200, 'application/vnd.android.package-archive', content
        return 200, 'application/json; charset=utf-8', json.dumps({key: manifest[key] for key in (
            'versionCode', 'versionName', 'sha256', 'size', 'url')}).encode('utf-8')

    def mobile_page(self, key):
        content = self._file(self.root / 'web' / 'mobile' / 'index.html', MAX_BODY).decode('utf-8')
        if '__ATELIER_MOBILE_TOKEN__' not in content:
            raise GatewayError('L’interface mobile est indisponible.', 503)
        content = content.replace('__ATELIER_MOBILE_TOKEN__', html.escape(key, quote=True))
        content = content.replace('__ATELIER_MOBILE_PC__', html.escape(self.pc_name, quote=True))
        return content.encode('utf-8')


def make_handler(gateway):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = 'HTTP/1.1'

        def setup(self):
            super().setup()
            self.connection.settimeout(15)

        def log_message(self, *_):
            pass  # Request paths, authorization and keys never enter logs.

        def reply(self, status, mime, content):
            self.send_response(status)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
            self.send_header('Connection', 'close')
            if status == 401:
                self.send_header('WWW-Authenticate', 'Bearer realm="Atelier mobile"')
            self.end_headers()
            self.close_connection = True
            if self.command != 'HEAD':
                self.wfile.write(content)

        def error(self, message, status):
            self.reply(status, 'application/json; charset=utf-8', json.dumps({'error': message}, ensure_ascii=False).encode())

        def allowed(self, authenticated):
            host = f'{self.server.server_address[0]}:{self.server.server_port}'
            hosts = {host}
            origins = {'http://' + host}
            if gateway.public_origin:
                hosts.add(urlsplit(gateway.public_origin).netloc)
                origins.add(gateway.public_origin)
            host_headers = self.headers.get_all('Host', [])
            if len(host_headers) != 1 or host_headers[0].lower() not in hosts:
                raise GatewayError('Host refusé.', 403)
            origin_headers = self.headers.get_all('Origin', [])
            if len(origin_headers) > 1 or (origin_headers and origin_headers[0] not in origins):
                raise GatewayError('Origin refusée.', 403)
            if authenticated:
                authorization = self.headers.get_all('Authorization', [])
                try:
                    key = gateway.keys.key()
                except (OSError, ValueError):
                    raise GatewayError('La clé mobile est indisponible.', 503)
                expected = 'Bearer ' + key
                if len(authorization) != 1 or not secrets.compare_digest(authorization[0].encode(), expected.encode()):
                    raise GatewayError('Appairage mobile requis ou révoqué.', 401)
                return key
            return None

        def dispatch(self):
            try:
                method = 'GET' if self.command == 'HEAD' else self.command
                route = gateway.parse_target(self.path, method)
                key = self.allowed(route not in STATIC_FILES)
                if self.headers.get_all('Transfer-Encoding'):
                    raise GatewayError('Transfert fragmenté interdit.')
                lengths = self.headers.get_all('Content-Length', [])
                if len(lengths) > 1 or (lengths and not lengths[0].isdecimal()):
                    raise GatewayError('Taille de requête invalide.')
                length = int(lengths[0]) if lengths else 0
                if method == 'POST':
                    if not 1 <= length <= MAX_BODY:
                        raise GatewayError('Requête vide ou trop volumineuse.', 413)
                    if self.headers.get('Content-Type', '').split(';', 1)[0].lower() != 'application/json':
                        raise GatewayError('Content-Type application/json requis.', 415)
                    body = self.rfile.read(length)
                    if len(body) != length:
                        raise GatewayError('Requête incomplète.')
                    self.reply(*gateway.forward(method, self.path, body))
                elif method == 'GET' and length:
                    raise GatewayError('Corps de requête inattendu.')
                elif route in ('/mobile/', '/mobile', '/') and method == 'GET':
                    self.reply(200, 'text/html; charset=utf-8', gateway.mobile_page(key))
                elif route in STATIC_FILES and method == 'GET':
                    filename = STATIC_FILES[route]
                    mime = mimetypes.guess_type(filename)[0] or 'text/plain'
                    self.reply(200, mime + '; charset=utf-8', gateway._file(gateway.root / 'web' / 'mobile' / filename, MAX_BODY))
                elif route in ('/mobile/release.json', '/mobile/atelier.apk') and method == 'GET':
                    self.reply(*gateway.release(apk=route.endswith('.apk')))
                elif route.startswith('/api/') and method == 'GET':
                    self.reply(*gateway.forward(method, self.path))
                else:
                    raise GatewayError('Route introuvable.', 404)
            except GatewayError as exc:
                self.error(str(exc), exc.status)
            except (OSError, UnicodeDecodeError, ValueError):
                self.error('La passerelle mobile est indisponible.', 503)

        do_GET = dispatch
        do_POST = dispatch
        do_HEAD = dispatch

        def unsupported(self):
            self.error('Méthode non autorisée.', 405)

        do_PUT = unsupported
        do_DELETE = unsupported
        do_PATCH = unsupported
        do_OPTIONS = unsupported
        do_CONNECT = unsupported
        do_TRACE = unsupported
    return Handler


def create_server(gateway, listen='127.0.0.1', port=4318):
    listen = validate_listen(listen)
    if type(port) is not int or not 0 <= port <= 65535:
        raise ValueError('Port de passerelle invalide.')
    server = ThreadingHTTPServer((listen, port), make_handler(gateway))
    server.daemon_threads = True
    return server


def main(argv=None):
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description='Atelier mobile — passerelle Tailscale explicite',
        epilog='Exemple : python3 scripts/mobile-gateway.py --backend http://127.0.0.1:4317 --listen 127.0.0.1 --public-origin https://pc.tailnet.ts.net ; puis tailscale serve --bg http://127.0.0.1:4318. Affiche la clé avec --pair, invalide les téléphones avec --revoke.')
    parser.add_argument('--backend', help='URL du service Atelier HTTP loopback (port affiché par Atelier).')
    parser.add_argument('--listen', default='127.0.0.1', help='127.0.0.1 avec Tailscale Serve, ou IPv4 Tailscale explicite.')
    parser.add_argument('--public-origin', help='URL Tailscale Serve exacte à autoriser (HTTPS *.ts.net).')
    parser.add_argument('--port', type=int, default=4318)
    parser.add_argument('--pc-name', help='Nom lisible de ce PC dans le téléphone.')
    parser.add_argument('--key-dir', type=Path, default=root / '.atelier' / 'mobile-gateway')
    action = parser.add_mutually_exclusive_group()
    action.add_argument('--pair', action='store_true', help='Afficher explicitement la clé privée, puis quitter.')
    action.add_argument('--revoke', action='store_true', help='Remplacer la clé ; révocation immédiate, puis quitter.')
    args = parser.parse_args(argv)
    try:
        keys = KeyStore(args.key_dir)
        if args.pair:
            print('Clé d’appairage Atelier mobile (à saisir uniquement dans ton APK) :\n' + keys.key())
            return 0
        if args.revoke:
            keys.rotate()
            print('Appairages révoqués. Utilise --pair pour afficher la nouvelle clé.')
            return 0
        if not args.backend:
            parser.error('--backend est requis pour démarrer la passerelle.')
        gateway = MobileGateway(root, args.backend, keys, args.pc_name, args.public_origin)
        server = create_server(gateway, args.listen, args.port)
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    origin = gateway.public_origin or f'http://{server.server_address[0]}:{server.server_port}'
    print('Atelier mobile : ' + origin + '/mobile/', flush=True)
    print('Clé privée conservée localement ; --pair pour l’afficher, --revoke pour révoquer.', flush=True)
    def stop(*_):
        threading.Thread(target=server.shutdown, daemon=True).start()
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        server.serve_forever()
    finally:
        server.server_close()
    return 0
