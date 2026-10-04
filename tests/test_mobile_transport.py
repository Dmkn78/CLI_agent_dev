"""Phone-to-gateway-to-Application contract tests. All model calls are fake."""
import json
import tempfile
import threading
import time
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

from run import make_handler
from server.app import Application
from server.mobile_gateway import KeyStore, MobileGateway, create_server
from test_application import FakeCodex


ROOT = Path(__file__).resolve().parents[1]


class MobileTransportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'readme.txt').write_text('Lecture réelle du fichier de test.\n', encoding='utf-8')
        (self.root / '.env').write_text('PRIVATE_FIXTURE=not-for-phone', encoding='utf-8')
        self.app = Application(self.root)
        self.app.provider.update(installed=True, connected=True, models=[{
            'model': 'fixture-mobile-transport', 'displayName': 'Fournisseur fictif',
            'isDefault': True, 'defaultReasoningEffort': 'medium',
            'supportedReasoningEfforts': [{'reasoningEffort': 'medium'}]}])
        self.patcher = patch('server.app.CodexClient', FakeCodex)
        self.patcher.start()
        self.backend = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(self.app, 'N' * 43))
        self.backend.daemon_threads = True
        self.keys = KeyStore(self.root / 'phone-key')
        self.key = self.keys.key()
        gateway = MobileGateway(ROOT, 'http://127.0.0.1:' + str(self.backend.server_port), self.keys)
        self.phone = create_server(gateway, port=0)
        self.url = 'http://127.0.0.1:' + str(self.phone.server_port)
        self.threads = []
        for server in (self.backend, self.phone):
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            self.threads.append(thread)
        self.opener = build_opener(ProxyHandler({}))

    def tearDown(self):
        for server in (self.phone, self.backend):
            server.shutdown()
            server.server_close()
        for thread in self.threads:
            thread.join(timeout=2)
        self.app.shutdown()
        self.app.store.db.close()
        self.patcher.stop()
        self.temp.cleanup()

    def request(self, route, data=None):
        request = Request(self.url + route, data=None if data is None else json.dumps(data).encode(),
                          headers={'Authorization': 'Bearer ' + self.key, 'Content-Type': 'application/json'})
        with self.opener.open(request, timeout=4) as response:
            return json.load(response)

    def wait_status(self, id, status):
        for _ in range(200):
            session = self.app.store.get('session', id)
            if session['status'] == status:
                return session
            time.sleep(.01)
        self.fail('La session fictive n’a pas atteint ' + status)

    def test_catalog_files_prompt_and_plan_use_existing_backend_permissions(self):
        state = self.request('/api/state')
        self.assertEqual(state['providers'][0]['models'][0]['model'], 'fixture-mobile-transport')
        self.assertEqual(self.request('/api/files?project=atelier&path=readme.txt')['content'],
                         'Lecture réelle du fichier de test.\n')
        for path in ('../outside', '.env'):
            from urllib.parse import urlencode
            with self.assertRaises(HTTPError) as rejected:
                self.request('/api/files?' + urlencode({'project': 'atelier', 'path': path}))
            self.assertEqual(rejected.exception.code, 400)
        session = self.request('/api/sessions', {'projectId': 'atelier', 'name': 'Contrat mobile fictif',
                                                'model': 'fixture-mobile-transport', 'effort': 'medium',
                                                'sandbox': 'workspace-write', 'memory': False, 'planMode': True})
        self.wait_status(session['id'], 'ready')
        client = self.app.clients[session['id']]
        self.assertEqual(client.calls[0][1]['approvalPolicy'], 'on-request')
        self.request('/api/sessions/prompt', {'id': session['id'], 'text': 'Établis le plan fictif.'})
        planned = self.wait_status(session['id'], 'waiting_plan')
        turn = next(params for method, params in client.calls if method == 'turn/start')
        self.assertEqual(turn['sandboxPolicy'], {'type': 'readOnly'})
        self.assertEqual(turn['approvalPolicy'], 'on-request')
        self.assertEqual(planned['usage']['total']['totalTokens'], 15)
        self.request('/api/sessions/plan', {'id': session['id'], 'requestId': planned['currentRequestId'], 'accepted': False})
        self.wait_status(session['id'], 'ready')
        self.assertEqual(len([method for method, _ in client.calls if method == 'turn/start']), 1)

    def test_approval_reply_is_delivered_once_and_revocation_blocks_existing_phone(self):
        session = self.app.new_session({'name': 'Approval fixture', 'model': 'fixture-mobile-transport',
                                        'memory': False, 'planMode': False}, start=False)
        self.app.start_session(session['id'])
        self.app.on_event(session['id'], {'id': 71, 'method': 'item/commandExecution/requestApproval',
                                         'params': {'command': 'fixture', 'reason': 'Fictif'}})
        approval = self.request('/api/state')['approvals'][0]
        self.request('/api/approvals', {'id': approval['id'], 'decision': 'decline'})
        self.assertEqual(self.app.clients[session['id']].answers, [(71, {'decision': 'decline'})])
        self.assertEqual(self.request('/api/state')['approvals'], [])
        with self.assertRaises(HTTPError):
            self.request('/api/approvals', {'id': approval['id'], 'decision': 'decline'})
        self.assertEqual(len(self.app.clients[session['id']].answers), 1)
        self.keys.rotate()
        with self.assertRaises(HTTPError) as rejected:
            self.request('/api/state')
        self.assertEqual(rejected.exception.code, 401)
        self.key = self.keys.key()
        self.assertEqual(len(self.request('/api/state')['sessions']), 1)


if __name__ == '__main__':
    unittest.main()
