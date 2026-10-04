"""HTTP adapter and native channel tests, using only deterministic providers."""
import json
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

from server.api_connections import ApiConnections, api_base_url, public_text, validate_endpoint
from server.app import Application
from run import make_handler
from test_application import FakeCodex
from test_omp import FakeOmp
from server.omp_session import OmpSession
from server.process_environment import agent_environment


class FixtureApi(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def respond(self, body, status=200):
        content = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        self.server.requests.append((self.path, None, self.headers.get('Authorization')))
        override = getattr(self.server, 'get_response_overrides', {}).get(self.path)
        if override is not None:
            self.respond(*override)
        elif self.path == '/redirect/v1/models':
            self.send_response(302)
            self.send_header('Location', self.server.base + '/v1/models')
            self.end_headers()
        else:
            self.respond({'data': [{'id': 'fixture-local'}]})

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        self.server.requests.append((self.path, body, self.headers.get('Authorization')))
        if self.server.response_override is not None:
            self.respond(self.server.response_override, self.server.status_override)
        elif self.path.endswith('/systemone'):
            self.respond({'model': 'fixture-decision', 'answers': {
                'next_step': {'choice': 'review', 'confidence': .9},
                'risk': {'score': 1.1}, 'missing_information': {'noul': .25}},
                'usage': {'input_tokens': 18}})
        else:
            self.respond({'choices': [{'message': {'role': 'assistant',
                'content': '<think>private fixture thought</think>Public fixture plan',
                'reasoning_content': 'private separate field'}}],
                'usage': {'prompt_tokens': 11, 'completion_tokens': 5, 'total_tokens': 16}})


class ApiConnectionTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.app = Application(Path(self.directory.name))
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), FixtureApi)
        self.server.base = 'http://127.0.0.1:' + str(self.server.server_port)
        self.server.requests, self.server.response_override, self.server.status_override = [], None, 200
        self.worker = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.worker.start()

    def tearDown(self):
        self.app.shutdown()
        self.server.shutdown()
        self.server.server_close()
        self.worker.join(timeout=2)
        self.app.store.db.close()
        self.directory.cleanup()

    def connection(self, protocol='openai', **changes):
        return self.app.api_connections.save({'name': 'Fixture API', 'baseUrl': self.server.base + '/v1',
            'protocol': protocol, 'modelIds': 'fixture-local' if protocol == 'openai' else 'fixture-decision', **changes})

    def participant(self, connection):
        return {'role': 'consultant' if connection['protocol'] == 'systemone' else 'agent',
                'configuration': self.app.api_connections.configuration({'connectionId': connection['id'],
                    'model': connection['models'][0]['model']})}

    def test_save_is_offline_and_discovery_is_only_a_catalog(self):
        connection = self.connection()
        self.assertEqual(self.server.requests, [])
        self.assertEqual(connection['status'], 'configured')
        discovered = self.app.api_connections.discover(connection['id'])
        self.assertEqual(discovered['catalogSource'], 'discovered')
        self.assertEqual(self.server.requests[0][0], '/v1/models')
        self.assertEqual(len(self.server.requests), 1)

    def test_chat_extracts_public_content_and_received_usage(self):
        connection = self.connection()
        reply = self.app.api_connections.reply(self.participant(connection),
            [{'author': 'Vous', 'text': 'Prepare a plan'}], 'discussion', 'Public replies only')
        self.assertEqual(reply['text'], 'Public fixture plan')
        self.assertNotIn('private', json.dumps(reply))
        self.assertEqual(reply['usage'], {'inputTokens': 11, 'outputTokens': 5, 'totalTokens': 16})
        body = self.server.requests[-1][1]
        self.assertNotIn('tools', body)
        self.assertEqual([message['role'] for message in body['messages']], ['system', 'user'])
        saved = self.app.store.get('apiConnection', connection['id'])
        self.assertTrue(saved['lastReplyAt'])
        self.assertEqual(saved['lastReplyModel'], 'fixture-local')

    def test_chat_refuses_tool_calls_and_malformed_public_output(self):
        connection = self.connection()
        for message in ({'content': 'Plan', 'tool_calls': [{'id': 'private-tool'}]},
                        {'content': '<think>Only private thinking</think>'}, {'content': {'analysis': 'private'}}):
            self.server.response_override = {'choices': [{'message': message}]}
            with self.subTest(message=message), self.assertRaises(ValueError):
                self.app.api_connections.reply(self.participant(connection), [], 'discussion', 'Public only')

    def test_systemone_is_an_advisory_consultant(self):
        connection = self.connection('systemone')
        participant = self.participant(connection)
        reply = self.app.api_connections.reply(participant, [{'author': 'Vous', 'text': 'Plan'}], 'discussion', 'Public only')
        self.assertIn('Relire le plan', reply['text'])
        self.assertIn('90%', reply['text'])
        self.assertIn('n’autorise aucune action', reply['text'])
        self.assertEqual(reply['usage'], {'inputTokens': 18})
        self.assertEqual(self.server.requests[-1][0], '/v1/systemone')
        with self.assertRaises(ValueError):
            self.app.api_connections.reply(participant, [], 'plan', 'Public only')
        self.assertEqual(len(self.server.requests), 1)

    def test_systemone_refuses_missing_or_invalid_answers(self):
        connection = self.connection('systemone')
        self.server.response_override = {'answers': {'next_step': {'choice': 'execute', 'confidence': 1}}}
        with self.assertRaises(ValueError):
            self.app.api_connections.reply(self.participant(connection), [], 'discussion', 'Public only')
        with self.assertRaises(ValueError):
            ApiConnections._decision_text({'next_step': {'choice': 'plan', 'confidence': 1.5},
                'risk': {'score': 0}, 'missing_information': {'noul': .1}})

    def test_explicit_environment_credential_is_not_persisted_or_returned(self):
        connection = self.connection(credentialEnvironment='ATELIER_FIXTURE_API_KEY')
        with patch.dict('os.environ', {'ATELIER_FIXTURE_API_KEY': 'fixture-sensitive-key'}):
            self.app.api_connections.discover(connection['id'])
            self.assertNotIn('ATELIER_FIXTURE_API_KEY', agent_environment())
        self.assertEqual(self.server.requests[0][2], 'Bearer fixture-sensitive-key')
        snapshot = json.dumps(self.app.api_connections.snapshot())
        self.assertNotIn('fixture-sensitive-key', snapshot)
        self.assertNotIn('fixture-sensitive-key', str(self.app.store.latest_events()))
        with self.assertRaises(ValueError):
            self.connection(credentialEnvironment='CODEX_API_KEY')

    def test_redirect_and_http_error_body_are_not_exposed(self):
        connection = self.connection(baseUrl=self.server.base + '/redirect/v1')
        with self.assertRaises(ValueError):
            self.app.api_connections.discover(connection['id'])
        self.assertEqual(len(self.server.requests), 1)
        connection = self.connection()
        self.server.response_override, self.server.status_override = {'error': 'credential or reasoning private-body'}, 401
        with self.assertRaisesRegex(ValueError, 'HTTP 401') as captured:
            self.app.api_connections.reply(self.participant(connection), [], 'discussion', 'Public only')
        self.assertNotIn('private-body', str(captured.exception))

    def test_endpoint_validation_and_missing_usage(self):
        for endpoint in ('https://user:secret@example.com', 'file:///tmp', 'http://example.com',
                         'https://example.com?key=secret', 'http://127.0.0.1:99999',
                         'http://127.attacker.example/v1', 'http://192.168.attacker.example/v1',
                         'http://[invalid]/v1'):
            with self.subTest(endpoint=endpoint), self.assertRaises(ValueError):
                validate_endpoint(endpoint)
        self.assertEqual(validate_endpoint('http://192.168.1.10:8000/v1/'), 'http://192.168.1.10:8000/v1')
        self.assertEqual(public_text('Final <analysis>private</analysis> response'), 'Final  response')
        connection = self.connection()
        self.server.response_override = {'choices': [{'message': {'content': 'Public'}}]}
        reply = self.app.api_connections.reply(self.participant(connection), [], 'discussion', 'Public only')
        self.assertIsNone(reply['usage'])

    def test_base_url_accepts_origins_and_pasted_routes_without_double_v1(self):
        for suffix in ('', '/', '/v1/', '/v1/models', '/v1/chat/completions'):
            with self.subTest(suffix=suffix):
                connection = self.connection(baseUrl=self.server.base + suffix)
                self.assertEqual(connection['baseUrl'], self.server.base + '/v1')
                self.app.api_connections.discover(connection['id'])
                self.assertEqual(self.server.requests[-1][0], '/v1/models')
        self.assertEqual(api_base_url(self.server.base + '/proxy/v1/models'), self.server.base + '/proxy/v1')
        self.assertEqual(api_base_url(self.server.base + '/proxy/api/v1/models', 'lmstudio'), self.server.base + '/proxy/v1')
        self.assertEqual(validate_endpoint('http://[::1]:8000/v1/'), 'http://[::1]:8000/v1')
        self.assertEqual(validate_endpoint('http://100.100.1.2:8000/v1'), 'http://100.100.1.2:8000/v1')

    def test_lmstudio_catalog_excludes_embedding_using_native_metadata_not_names(self):
        self.server.get_response_overrides = {
            '/v1/models': ({'data': [{'id': name} for name in
                ('fixture-alias', 'fixture-embedding', 'chat-with-embedding-in-name', 'opaque-model')]}, 200),
            '/api/v1/models': ({'models': [
                {'type': 'llm', 'key': 'fixture-local', 'display_name': 'Local LLM',
                 'loaded_instances': [{'id': 'fixture-alias'}]},
                {'type': 'embedding', 'key': 'fixture-embedding', 'loaded_instances': []},
                {'type': 'llm', 'key': 'chat-with-embedding-in-name', 'loaded_instances': []}]}, 200)}
        connection = self.connection(serverKind='lmstudio')
        discovered = self.app.api_connections.discover(connection['id'])
        self.assertEqual([request[0] for request in self.server.requests], ['/v1/models', '/api/v1/models'])
        self.assertTrue(all(request[1] is None for request in self.server.requests))
        self.assertEqual([model['model'] for model in discovered['models']],
                         ['fixture-alias', 'chat-with-embedding-in-name', 'opaque-model'])
        self.assertEqual(discovered['models'][0]['displayName'], 'Local LLM')
        self.assertTrue(discovered['models'][0]['loaded'])
        self.assertEqual(discovered['models'][-1]['modelType'], 'unknown')
        self.assertEqual(discovered['excludedModels'][0]['model'], 'fixture-embedding')
        self.assertEqual(discovered['catalogMetadata'], 'lmstudio')
        self.assertTrue(discovered['catalogReadAt'])
        self.assertIsNone(discovered['lastReplyAt'])
        with self.assertRaises(ValueError):
            self.app.api_connections.configuration({'connectionId': connection['id'], 'model': 'fixture-embedding'})

    def test_catalog_types_are_read_only_metadata_and_discovery_deduplicates(self):
        self.server.get_response_overrides = {'/v1/models': ({'data': [
            {'id': 'fixture-chat', 'type': 'vlm', 'state': 'loaded', 'max_model_len': 4096},
            {'id': 'fixture-chat', 'type': 'vlm'},
            {'id': 'fixture-vector', 'type': 'embeddings'},
            {'id': 'fixture-ranker', 'model_type': 'reranker'}]}, 200)}
        discovered = self.app.api_connections.discover(self.connection()['id'])
        self.assertEqual(len(discovered['models']), 1)
        self.assertEqual(discovered['models'][0]['contextWindow'], 4096)
        self.assertEqual(discovered['models'][0]['modelType'], 'chat')
        self.assertTrue(discovered['models'][0]['loaded'])
        self.assertEqual(len(discovered['excludedModels']), 2)
        self.assertEqual(discovered['catalogMetadata'], 'provider')
        self.assertEqual(len(self.server.requests), 1)

    def test_missing_lmstudio_native_catalog_preserves_unknown_models(self):
        self.server.get_response_overrides = {'/api/v1/models': ({'error': 'private credential body'}, 404)}
        discovered = self.app.api_connections.discover(self.connection(serverKind='lmstudio')['id'])
        self.assertEqual(discovered['status'], 'catalog_ready')
        self.assertEqual(discovered['models'][0]['modelType'], 'unknown')
        self.assertEqual(discovered['catalogMetadata'], 'unknown')
        self.assertNotIn('private credential', json.dumps(discovered))

    def test_editing_timeout_preserves_observed_catalog_and_reply_receipt(self):
        connection = self.connection()
        discovered = self.app.api_connections.discover(connection['id'])
        self.app.api_connections.reply(self.participant(discovered), [], 'discussion', 'Public only')
        edited = self.app.api_connections.save({'id': connection['id'], 'name': 'Edited API', 'timeout': 30})
        self.assertEqual(edited['catalogSource'], 'discovered')
        self.assertEqual(edited['catalogReadAt'], discovered['catalogReadAt'])
        self.assertTrue(edited['lastReplyAt'])
        changed = self.app.api_connections.save({'id': connection['id'], 'baseUrl': self.server.base + '/other/v1'})
        self.assertEqual(changed['catalogSource'], 'declared')
        self.assertIsNone(changed['catalogReadAt'])
        self.assertIsNone(changed['lastReplyAt'])

    def test_invalid_catalog_does_not_create_success_receipt(self):
        self.server.get_response_overrides = {'/v1/models': ({'data': [{'id': 'bad\nmodel'}]}, 200)}
        connection = self.connection()
        with self.assertRaises(ValueError):
            self.app.api_connections.discover(connection['id'])
        saved = self.app.store.get('apiConnection', connection['id'])
        self.assertEqual(saved['status'], 'error')
        self.assertIsNone(saved['catalogReadAt'])
        self.assertEqual(saved['models'], connection['models'])

    def test_channel_uses_fresh_native_context_and_closes_each_turn(self):
        clients = []
        class TrackedCodex(FakeCodex):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                clients.append(self)
            def rpc(self, method, params=None, **kwargs):
                if method == 'turn/start':
                    for requested in ('item/commandExecution/requestApproval', 'item/fileChange/requestApproval',
                                      'item/permissions/requestApproval', 'item/tool/requestUserInput'):
                        self.callback({'id': requested, 'method': requested,
                                       'params': {'private': 'PRIVATE_NATIVE_TOOL_REQUEST'}})
                return super().rpc(method, params, **kwargs)
        with patch('server.app.CodexClient', TrackedCodex):
            original = self.app.new_session({'name': 'Existing worker', 'model': 'fixture-model',
                'mission': 'private original mission', 'sandbox': 'workspace-write'}, start=False)
            self.app.store.update('session', original['id'], messages=[{'role': 'assistant', 'text': 'private original messages'}])
            channel = self.app.channels.create({'name': 'Test', 'topic': 'Public task', 'maxRounds': 1})
            self.app.channels.add_participant(channel['id'], {'sessionId': original['id'], 'role': 'duplica'})
            self.app.channels.start(channel['id'])
            for _ in range(500):
                current = self.app.store.get('channel', channel['id'])
                if current['status'] != 'running':
                    break
                time.sleep(.01)
            self.assertEqual(current['status'], 'ready_for_review', current.get('error'))
            sessions = [session for session in self.app.store.all('session') if session.get('consumer') == 'channel']
            self.assertEqual(len(sessions), 2)
            for session in sessions:
                self.assertEqual(session['status'], 'closed')
                self.assertFalse(session['memory'])
                self.assertFalse(session['workEnabled'])
                self.assertEqual(session['sandbox'], 'read-only')
                self.assertNotEqual(session['workingPath'], str(Path(self.directory.name)))
                self.assertNotIn('private original', json.dumps(session))
            prepared = self.app.channels.prepare_task(channel['id'])
            self.assertEqual(prepared['status'], 'review')
            self.assertEqual(self.app.channels.prepare_task(channel['id'])['id'], prepared['id'])
            self.assertEqual(self.app.store.get('session', original['id'])['sandbox'], 'workspace-write')
            self.assertFalse(self.app.store.all('approval'))
            self.assertNotIn('PRIVATE_NATIVE_TOOL_REQUEST', json.dumps(self.app.store.latest_events()))
            for client in clients:
                self.assertEqual(len(client.answers), 4)
                self.assertTrue(all(answer == 'unsupported' for _, answer in client.answers))
                self.assertFalse(client.configuration['features.shell_tool'])
                self.assertFalse(client.configuration['features.plugins'])
                self.assertEqual(client.configuration['mcp_servers'], {})
                parameters = next(parameters for method, parameters in client.calls if method == 'thread/start')
                self.assertEqual(parameters['approvalPolicy'], 'on-request')
                self.assertEqual(parameters['sandbox'], 'read-only')
                self.assertTrue(parameters['ephemeral'])

    def test_stopping_before_native_client_start_does_not_leak_the_late_client(self):
        entered_start, release_start = threading.Event(), threading.Event()
        original_start = self.app.start_session
        clients = []

        class TrackedCodex(FakeCodex):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                clients.append(self)

        def delayed_start(identifier):
            entered_start.set()
            if not release_start.wait(2):
                raise RuntimeError('Démarrage fictif non libéré.')
            original_start(identifier)

        channel = self.app.channels.create({'name': 'Stop pendant démarrage', 'topic': 'État public', 'maxRounds': 1})
        self.app.channels.add_participant(channel['id'], {
            'name': 'Agent fictif', 'configuration': {'runtime': 'codex', 'model': 'fixture-model'}})
        with patch('server.app.CodexClient', TrackedCodex), patch.object(self.app, 'start_session', delayed_start):
            self.app.channels.start(channel['id'])
            try:
                self.assertTrue(entered_start.wait(2))
                sessions = [session for session in self.app.store.all('session')
                            if session.get('consumer') == 'channel']
                self.assertEqual(len(sessions), 1)
                session_id = sessions[0]['id']
                self.app.channels.stop(channel['id'])
                self.assertEqual(self.app.store.get('session', session_id)['status'], 'closed')
            finally:
                release_start.set()
            deadline = time.monotonic() + 3
            while time.monotonic() < deadline and self.app.channels.snapshot()['channels'][0]['isStopping']:
                time.sleep(.01)
            self.assertFalse(self.app.channels.snapshot()['channels'][0]['isStopping'])

        self.assertEqual(self.app.store.get('session', session_id)['status'], 'closed')
        self.assertNotIn(session_id, self.app.clients)
        self.assertTrue(all(client.closed for client in clients))
        self.assertFalse(any(method == 'turn/start' for client in clients for method, _ in client.calls))
        self.assertFalse(self.app.channels.snapshot()['messages'])

    def test_omp_discussion_exposes_no_host_tool_and_refuses_file_reads(self):
        root = Path(self.directory.name)
        (root / 'private.txt').write_text('PRIVATE_OMP_FILE', encoding='utf-8')
        session = {'id':'fixture-discussion', 'model':'fixture/local', 'effort':'off',
                   'workingPath':str(root), 'sandbox':'read-only', 'discussionOnly':True}
        events = []
        with patch('server.omp_session.OmpClient', FakeOmp):
            bridge = OmpSession(session, root, 'Discussion only', events.append)
            try:
                self.assertEqual(bridge.client.tools, [])
                bridge.on_frame({'type':'host_tool_call','id':'read-fixture','toolName':'atelier_read',
                                 'arguments':{'path':'private.txt'}})
                self.assertNotIn('PRIVATE_OMP_FILE', json.dumps(bridge.client.frames))
                self.assertTrue(bridge.client.frames[-1]['isError'])
            finally:
                bridge.close()

    def test_http_routes_accept_public_payload_and_require_local_nonce(self):
        platform = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(self.app, 'fixture-nonce'))
        worker = threading.Thread(target=platform.serve_forever, daemon=True)
        worker.start()
        base = 'http://127.0.0.1:' + str(platform.server_port)
        def post(route, body, token='fixture-nonce'):
            request = urllib.request.Request(base+'/api/'+route, json.dumps(body).encode(),
                headers={'Content-Type':'application/json','X-Atelier-Token': token})
            with urllib.request.urlopen(request, timeout=5) as response:
                return json.load(response)
        try:
            with self.assertRaises(urllib.error.HTTPError) as captured:
                post('channels', {'name':'Test','topic':'Public'}, token='wrong')
            self.assertEqual(captured.exception.code, 403)
            captured.exception.close()
            channel = post('channels', {'name':'Test','topic':'Public'})
            participant = post('channels/participants', {'id':channel['id'],'name':'Agent',
                'configuration': {'runtime':'codex','model':'fixture'}})
            self.assertEqual(participant['sandbox'], 'read-only')
            posted = post('channels/messages', {'id':channel['id'],'text':'Public question'})
            self.assertEqual(posted['text'], 'Public question')
            with urllib.request.urlopen(base+'/channels.css') as response:
                self.assertEqual(response.status, 200)
        finally:
            platform.shutdown()
            platform.server_close()
            worker.join(timeout=2)


if __name__ == '__main__':
    unittest.main()
