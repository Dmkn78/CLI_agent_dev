"""The mobile transport is tested against a fake loopback provider, never Codex."""
import hashlib
import http.client
import json
import os
from pathlib import Path
import secrets
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch

from server.mobile_gateway import (GatewayError, KeyStore, MobileGateway,
    MAX_BODY, MAX_RESPONSE, create_server, validate_backend, validate_listen,
    validate_public_origin)


class FakeBackend:
    def __init__(self):
        self.nonce = secrets.token_urlsafe(32)
        self.nonce_reads = 0
        self.requests = []
        self.actions = []
        self.denial = None
        self.redirect = False
        self.large = False
        owner = self
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def send(self, body, status=200, mime='application/json'):
                self.send_response(status)
                self.send_header('Content-Length', str(len(body)))
                self.send_header('Content-Type', mime)
                self.end_headers()
                self.wfile.write(body)

            def do_GET(self):
                owner.requests.append(('GET', self.path, dict(self.headers)))
                if self.path == '/':
                    owner.nonce_reads += 1
                    self.send(f'<meta content="{owner.nonce}" name="atelier-token">'.encode(), mime='text/html')
                    return
                self.api()

            def do_POST(self):
                body = self.rfile.read(int(self.headers.get('Content-Length', '0')))
                owner.requests.append(('POST', self.path, dict(self.headers)))
                self.api(body)

            def api(self, body=None):
                if self.headers.get('X-Atelier-Token') != owner.nonce:
                    self.send(json.dumps({'error': 'Session locale requise.'}).encode(), 403)
                elif owner.denial:
                    self.send(json.dumps({'error': owner.denial}).encode(), 403)
                elif owner.redirect:
                    self.send(b'', 302)
                elif owner.large:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Content-Length', str(MAX_RESPONSE + 1))
                    self.end_headers()
                else:
                    if body is not None:
                        owner.actions.append(json.loads(body))
                    self.send(json.dumps({'ok': True, 'path': self.path}).encode())
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'

    def close(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()


class MobileGatewayTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        mobile = self.root / 'web/mobile'
        mobile.mkdir(parents=True)
        (mobile / 'index.html').write_text('<meta name="atelier-mobile-token" content="__ATELIER_MOBILE_TOKEN__"><meta name="atelier-mobile-pc" content="__ATELIER_MOBILE_PC__">')
        (mobile / 'app.js').write_text('/* public static file */')
        (mobile / 'style.css').write_text('body{color:white}')
        self.keys = KeyStore(self.root / '.atelier/mobile-gateway')
        self.backend = FakeBackend()
        self.gateway = MobileGateway(self.root, self.backend.url, self.keys, 'PC <un>')
        self.server = create_server(self.gateway, port=0)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.host = f'127.0.0.1:{self.server.server_port}'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.backend.close()
        self.temp.cleanup()

    def request(self, path='/api/state', method='GET', auth=True, headers=None, body=None):
        request_headers = {'Host': self.host}
        if auth:
            request_headers['Authorization'] = 'Bearer ' + self.keys.key()
        request_headers.update(headers or {})
        if isinstance(body, dict):
            request_headers['Content-Type'] = 'application/json'
            body = json.dumps(body).encode()
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=3)
        try:
            connection.request(method, path, body=body, headers=request_headers)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_initial_document_requires_pairing_and_has_separate_key(self):
        self.assertEqual(self.request('/mobile/', auth=False)[0], 401)
        status, headers, body = self.request('/mobile/')
        self.assertEqual(status, 200)
        self.assertIn(self.keys.key().encode(), body)
        self.assertNotIn(self.backend.nonce.encode(), body)
        self.assertIn(b'PC &lt;un&gt;', body)
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertIn("frame-ancestors 'none'", headers['Content-Security-Policy'])
        self.assertEqual(self.backend.requests, [])

    def test_static_assets_are_public_but_no_path_traversal(self):
        self.assertEqual(self.request('/mobile/app.js', auth=False)[0], 200)
        for path in ('/mobile/../index.html', '/mobile/%2e%2e/index.html', '/mobile/app.js?token=secret'):
            self.assertNotEqual(self.request(path, auth=False)[0], 200)
        self.assertEqual(self.request('/web/index.html')[0], 404)

    def test_only_explicit_host_and_origin(self):
        for headers in ({'Host': 'evil.example'}, {'Origin': 'http://evil.example'}, {'Origin': 'null'}):
            self.assertEqual(self.request(headers=headers)[0], 403)
        self.assertEqual(self.request(headers={'Origin': 'http://' + self.host})[0], 200)
        self.assertEqual(len(self.backend.requests), 2)

    def test_tailscale_serve_origin_and_no_forwarded_trust(self):
        self.gateway.public_origin = validate_public_origin('https://pc.private-tail.ts.net')
        self.assertEqual(self.request(headers={'Host': 'pc.private-tail.ts.net', 'Origin': self.gateway.public_origin})[0], 200)
        self.assertEqual(self.request(headers={'Host': 'evil.example', 'X-Forwarded-Host': self.host})[0], 403)
        self.assertEqual(self.request(headers={'Origin': 'https://other.private-tail.ts.net'})[0], 403)

    def test_invalid_key_or_query_key_does_not_touch_backend(self):
        self.assertEqual(self.request(headers={'Authorization': 'Bearer wrong'})[0], 401)
        self.assertEqual(self.request('/api/state?token=' + self.keys.key(), auth=False)[0], 400)
        self.assertEqual(self.backend.requests, [])

    def test_proxy_forwards_fixed_host_and_local_nonce_only(self):
        status, _, body = self.request('/api/files?project=atelier&path=docs%2Fmemory')
        self.assertEqual(status, 200)
        upstream = self.backend.requests[-1]
        self.assertEqual(upstream[2]['Host'], f'127.0.0.1:{self.backend.server.server_port}')
        self.assertEqual(upstream[2]['X-Atelier-Token'], self.backend.nonce)
        self.assertNotIn('Authorization', upstream[2])
        self.assertNotIn(self.backend.nonce.encode(), body)
        self.assertEqual(self.backend.nonce_reads, 1)
        self.request()
        self.assertEqual(self.backend.nonce_reads, 1)

    def test_exact_route_allowlist_and_duplicate_query(self):
        for path in ('/api/terminal/open', '/api/duplica/computer/act', '/api/desktop/service',
                     '/api/desktop-file', '/api/api-connections', '/api/providers/login', '/api/proxy?url=https://example.com'):
            self.assertEqual(self.request(path)[0], 404, path)
        self.assertEqual(self.request('/api/files?project=a&project=b')[0], 400)
        self.assertEqual(self.request('/api/files?url=http://127.0.0.1:80')[0], 400)
        self.assertEqual(self.backend.requests, [])

    def test_rejects_nonlocal_backend_and_wildcard_bind(self):
        for target in ('https://127.0.0.1:4317', 'http://example.com', 'http://100.64.0.1:4317',
                       'http://127.0.0.1@evil.com', 'http://user:pass@localhost:4317',
                       'http://127.0.0.1:4317/path', 'http://127.0.0.1:4317?x=1', 'http://[::1]:4317'):
            with self.assertRaises(ValueError, msg=target):
                validate_backend(target)
        for target in ('0.0.0.0', '192.168.1.1', '10.0.0.1', '::', '::1', 'example.com', '100.128.0.1'):
            with self.assertRaises(ValueError, msg=target):
                validate_listen(target)
        self.assertEqual(validate_backend('http://localhost:4317'), ('127.0.0.1', 4317))
        self.assertEqual(validate_listen('100.64.0.1'), '100.64.0.1')

    def test_public_origin_is_explicit_tailnet_only(self):
        for origin in ('http://pc.ts.net', 'https://example.com', 'https://pc.ts.net.evil.com',
                       'https://pc.ts.net/path', 'https://user@pc.ts.net', 'https://pc.ts.net?secret=1',
                       'http://192.168.1.2:4318', 'https://pc.ts.net:0'):
            with self.assertRaises(ValueError, msg=origin):
                validate_public_origin(origin)
        self.assertEqual(validate_public_origin('https://pc.tailnet.ts.net/'), 'https://pc.tailnet.ts.net')

    def test_expired_nonce_retries_only_before_execution(self):
        self.request()
        self.backend.nonce = secrets.token_urlsafe(32)
        status, _, _ = self.request('/api/sessions/prompt', 'POST', body={'id': 'fake', 'text': 'prompt fictif'})
        self.assertEqual(status, 200)
        self.assertEqual(len(self.backend.actions), 1)
        self.assertEqual(self.backend.nonce_reads, 2)
        self.assertEqual(sum(req[0] == 'POST' for req in self.backend.requests), 2)

    def test_generic_refusal_is_never_replayed(self):
        self.backend.denial = 'Dossier refusé.'
        self.assertEqual(self.request('/api/sessions/prompt', 'POST', body={'id': 'fake', 'text': 'fake'})[0], 403)
        self.assertEqual(sum(req[0] == 'POST' for req in self.backend.requests), 1)
        self.assertEqual(self.backend.nonce_reads, 1)

    def test_indeterminate_transport_is_never_replayed(self):
        nonce = secrets.token_urlsafe(32)
        with patch.object(self.gateway, '_local_nonce', return_value=nonce), patch.object(self.gateway, '_request', side_effect=GatewayError('Indéterminé.', 502)) as upstream:
            with self.assertRaises(GatewayError):
                self.gateway.forward('POST', '/api/sessions/prompt', b'{"id":"fake","text":"fake"}')
            self.assertEqual(upstream.call_count, 1)

    def test_write_permission_and_on_request_preserved(self):
        for body in ({'sandbox': 'danger-full-access'}, {'approvalPolicy': 'never'},
                     {'agents': {'workers': [{'sandbox': 'danger-full-access'}]}},
                     {'bypassPermissions': True}):
            self.assertEqual(self.request('/api/sessions', 'POST', body=body)[0], 400)
        self.assertEqual(self.backend.requests, [])
        body = {'sandbox': 'workspace-write', 'approvalPolicy': 'on-request', 'model': 'catalog-fictif'}
        self.assertEqual(self.request('/api/sessions', 'POST', body=body)[0], 200)
        self.assertEqual(self.backend.actions, [body])

    def test_save_and_cancel_are_restricted(self):
        self.assertEqual(self.request('/api/save', 'POST', body={'kind': 'session', 'value': {}})[0], 400)
        self.assertEqual(self.request('/api/cancel', 'POST', body={'kind': 'benchmark', 'id': 'fake'})[0], 400)
        self.assertEqual(self.backend.requests, [])
        self.assertEqual(self.request('/api/save', 'POST', body={'kind': 'task', 'value': {'title': 'Fictif'}})[0], 200)

    def test_request_body_limits_and_json_object(self):
        self.assertEqual(self.request('/api/sessions', 'POST', body=b'{}', headers={'Content-Length': str(MAX_BODY + 1), 'Content-Type': 'application/json'})[0], 413)
        self.assertEqual(self.request('/api/sessions', 'POST', body=b'[]', headers={'Content-Type': 'application/json'})[0], 400)
        self.assertEqual(self.request('/api/sessions', 'POST', body=b'{}', headers={'Content-Type': 'text/plain'})[0], 415)
        self.assertEqual(self.request('/api/sessions', 'POST', body=b'{}', headers={'Transfer-Encoding': 'chunked', 'Content-Type': 'application/json'})[0], 400)
        self.assertEqual(self.backend.requests, [])

    def test_upstream_bounds_and_redirects(self):
        self.backend.redirect = True
        self.assertEqual(self.request()[0], 502)
        self.backend.redirect = False
        self.backend.large = True
        self.assertEqual(self.request()[0], 502)
        self.assertEqual(sum(req[1] == '/api/state' for req in self.backend.requests), 2)

    def test_key_file_is_private_and_rotation_revokes_live(self):
        old_key = self.keys.key()
        self.assertEqual(self.keys.path.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.keys.directory.stat().st_mode & 0o777, 0o700)
        another_store = KeyStore(self.keys.directory)
        new_key = another_store.rotate()
        self.assertNotEqual(old_key, new_key)
        self.assertEqual(self.request(headers={'Authorization': 'Bearer ' + old_key})[0], 401)
        self.assertEqual(self.request()[0], 200)
        self.assertEqual(self.keys.key(), new_key)

    def test_symlink_key_is_refused(self):
        old_key = self.keys.key()
        self.keys.path.unlink()
        self.keys.path.symlink_to(self.root / 'external')
        with self.assertRaises(ValueError):
            KeyStore(self.keys.directory)
        self.assertEqual(self.request(auth=False, headers={'Authorization': 'Bearer ' + old_key})[0], 503)

    def make_release(self):
        directory = self.root / 'build/mobile'
        directory.mkdir(parents=True)
        content = 'APK fictif: jamais installé'.encode('utf-8')
        (directory / 'Atelier-mobile.apk').write_bytes(content)
        manifest = {'versionCode': 2, 'versionName': '1.0.1', 'size': len(content),
                    'sha256': hashlib.sha256(content).hexdigest(), 'url': '/mobile/atelier.apk'}
        (directory / 'release.json').write_text(json.dumps(manifest))
        return directory, content, manifest

    def test_release_authenticated_fixed_file_and_verified_digest(self):
        directory, content, manifest = self.make_release()
        self.assertEqual(self.request('/mobile/release.json', auth=False)[0], 401)
        status, _, body = self.request('/mobile/release.json')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), manifest)
        status, headers, body = self.request('/mobile/atelier.apk')
        self.assertEqual(status, 200)
        self.assertEqual(headers['Content-Type'], 'application/vnd.android.package-archive')
        self.assertEqual(body, content)
        self.assertEqual(self.request('/mobile/atelier.apk?path=/etc/passwd')[0], 400)
        self.assertEqual(self.request('/mobile/atelier.apk', method='HEAD')[2], b'')
        (directory / 'Atelier-mobile.apk').write_bytes(b'changed')
        self.assertEqual(self.request('/mobile/release.json')[0], 503)
        self.assertEqual(self.request('/mobile/atelier.apk')[0], 503)
        self.assertEqual(self.backend.requests, [])

    def test_missing_release_and_symlink_are_explicit(self):
        self.assertIn(self.request('/mobile/release.json')[0], (404, 503))
        directory, _, _ = self.make_release()
        (directory / 'Atelier-mobile.apk').unlink()
        (directory / 'Atelier-mobile.apk').symlink_to(self.root / 'web/mobile/index.html')
        self.assertIn(self.request('/mobile/atelier.apk')[0], (404, 503))

    def test_duplica_discussion_route_is_forwarded_without_computer_access(self):
        body = {'projectId': 'fixture', 'text': 'Discussion fictive en lecture seule', 'model': 'fixture-model'}
        self.assertEqual(self.request('/api/duplica/discussion', 'POST', body=body)[0], 200)
        self.assertEqual(self.backend.actions, [body])
        self.assertEqual(self.request('/api/duplica/computer/act', 'POST', body={'action': 'click'})[0], 404)
        self.assertEqual(self.backend.actions, [body])

    def test_http_method_allowlist(self):
        self.assertEqual(self.request('/api/state', 'DELETE')[0], 405)
        self.assertEqual(self.backend.requests, [])


if __name__ == '__main__':
    unittest.main()
