import io
import json
import re
import subprocess
import tempfile
import threading
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from server.app import Application
from server.codex import CodexClient, CodexError
from server.memory_mcp import search_memories
from server.store import Store, redact
from run import make_handler


class FakeCodex:
    """Deterministic provider fixture. Never calls a model or reads authentication."""
    fail_turn = False
    def __init__(self, callback=None, **kwargs):
        self.callback = callback or (lambda _: None)
        self.calls = []
        self.answers = []
        self.closed = False
        self.configuration = kwargs.get('config', {})
        self.process = SimpleNamespace(poll=lambda: 0 if self.closed else None)
    def rpc(self, method, params=None, **kwargs):
        self.calls.append((method, params))
        if method in ('thread/start', 'thread/resume'):
            return {'thread': {'id': params.get('threadId', 'thread_fixture')}}
        if method == 'turn/start':
            thread = params['threadId']
            self.callback({'method': 'turn/started', 'params': {'threadId': thread, 'turn': {'id': 'turn_fixture'}}})
            schema = params.get('outputSchema', {}).get('properties', {})
            if 'cases' in schema:
                count = int(re.search(r'exactement (\d+)', params['input'][0]['text'])[1])
                text = json.dumps({'cases': [{'title':'Cas', 'prompt':'ok', 'expected':'ok'} for _ in range(count)]})
            elif 'passed' in schema:
                text = json.dumps({'passed': True, 'reason': 'Avis fixture', 'evidence': 'ok'})
            else:
                text = json.dumps({'tasks': [{'title': 'Petite tâche', 'prompt': 'Réponds ok.'}]}) if schema else 'ok'
            self.callback({'method': 'item/agentMessage/delta', 'params': {'threadId': thread, 'itemId': 'item_fixture', 'delta': text}})
            self.callback({'method': 'item/completed', 'params': {'threadId': thread, 'item': {'id': 'item_fixture', 'type': 'agentMessage', 'text': text}}})
            self.callback({'method': 'thread/tokenUsage/updated', 'params': {'threadId': thread, 'tokenUsage': {'total': {'inputTokens': 12, 'outputTokens': 3, 'cachedInputTokens': 5, 'totalTokens': 15}, 'last': {'totalTokens': 15}}}})
            self.callback({'method': 'turn/completed', 'params': {'threadId': thread, 'turn': {'id': 'turn_fixture', 'status': 'failed' if self.fail_turn else 'completed'}}})
            return {'turn': {'id': 'turn_fixture'}}
        if method == 'turn/interrupt':
            self.callback({'method': 'turn/completed', 'params': {'turn': {'id': params['turnId'], 'status': 'interrupted'}}})
            return {}
        return {}
    def respond(self, id, result): self.answers.append((id, result))
    def unsupported(self, id): self.answers.append((id, 'unsupported'))
    def close(self): self.closed = True


class ApplicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.app = Application(self.root)
        self.patch = patch('server.app.CodexClient', FakeCodex)
        self.patch.start()
    def tearDown(self):
        self.app.shutdown()
        self.patch.stop()
        self.temp.cleanup()
    def session(self):
        s = self.app.new_session({'name': 'Fixture', 'model': 'fixture-model'}, start=False)
        self.app.start_session(s['id'])
        return self.app.store.get('session', s['id'])
    def wait_for(self, kind, id):
        for _ in range(300):
            item = self.app.store.get(kind, id)
            if item['status'] not in ('queued', 'running'):
                return item
            time.sleep(.01)
        self.fail('Background job did not finish')
    def test_projection_contains_memories(self):
        self.assertEqual(len(self.app.state()['memories']), 4)
        self.assertNotIn('memorys', self.app.state())
    def test_edit_preserves_existing_fields_and_id(self):
        item=self.app.upsert('task', {'title':'Initial','description':'Preserved'})
        updated=self.app.upsert('task', {'id':item['id'],'title':'Edited','status':'review'})
        self.assertEqual(updated['id'],item['id'])
        self.assertEqual(updated['title'],'Edited')
        self.assertEqual(updated['description'],'Preserved')
        self.assertEqual(updated['status'],'review')
    def test_file_traversal_sensitive_files_and_symlinks_rejected(self):
        (self.root / 'normal.txt').write_text('hello')
        (self.root / '.env.local').write_text('secret')
        (self.root / 'outside').symlink_to(self.root.parent)
        self.assertEqual(self.app.files('atelier', 'normal.txt')['content'], 'hello')
        for path in ('../outside', '.env.local', 'outside/other.txt'):
            with self.assertRaises(ValueError): self.app.file_path('atelier', path)
        self.assertNotIn('outside', [e['name'] for e in self.app.files('atelier')['entries']])
    def test_memory_budget_and_on_demand_reserve(self):
        candidate = self.app.upsert('memory', {'title': 'Reserve', 'body': 'never preload this unique secret fact', 'tags': ['reserve'], 'core': False})
        self.assertNotIn(candidate['body'], self.app.memory_context('atelier'))
        self.assertEqual(search_memories(self.app.store.all('memory'), 'unique secret', project='atelier')[0]['id'], candidate['id'])
        with self.assertRaises(ValueError): self.app.upsert('memory', {'title': 'Too large', 'body': 'x'*4000, 'core': True})
        project = self.app.upsert('project', {'name': 'Second', 'path': str(self.root)})
        self.assertFalse(search_memories(self.app.store.all('memory'), 'unique secret', project=project['id']))
    def test_session_protocol_permissions_and_report(self):
        s = self.session()
        client = self.app.clients[s['id']]
        method, params = client.calls[0]
        self.assertEqual(method, 'thread/start')
        self.assertEqual(params['sandbox'], 'read-only')
        self.assertEqual(params['approvalPolicy'], 'on-request')
        self.assertTrue(client.configuration['mcp_servers.atelier_memory.required'])
        self.app.prompt(s['id'], 'Réponds ok.')
        updated = self.app.store.get('session', s['id'])
        self.assertEqual(updated['lastTurnStatus'], 'completed')
        self.assertEqual(updated['messages'][-1]['text'], 'ok')
        self.assertEqual(updated['usage']['total']['totalTokens'], 15)
        self.assertIsNone(updated['turnId'])
        report = self.app.report(s['id'], close=True)
        self.assertIn('UNVERIFIED', report['content'])
        self.assertTrue(Path(report['artifact']['path']).is_file())
        self.assertTrue((self.root/'.atelier/runs'/s['id']/'handoff.json').is_file())
        self.assertEqual(self.app.store.get('session', s['id'])['status'], 'closed')
        self.assertTrue(client.closed)
    def test_failed_turn_is_never_success(self):
        s = self.session()
        self.app.clients[s['id']].fail_turn = True
        with self.assertRaises(ValueError): self.app.wait_session(s['id'], 'Réponds ok.')
        self.assertEqual(self.app.store.get('session', s['id'])['lastTurnStatus'], 'failed')
    def test_empty_session_reopens_without_missing_rollout_resume(self):
        s=self.session()
        self.app.report(s['id'],close=True)
        self.app.store.update('session',s['id'],status='initializing')
        self.app.start_session(s['id'])
        self.assertEqual(self.app.clients[s['id']].calls[0][0],'thread/start')
        self.assertEqual(self.app.store.get('session',s['id'])['status'],'ready')
    def test_session_with_user_message_resumes_original_thread(self):
        s=self.session()
        self.app.prompt(s['id'],'ok')
        self.app.report(s['id'],close=True)
        self.app.store.update('session',s['id'],status='initializing')
        self.app.start_session(s['id'])
        self.assertEqual(self.app.clients[s['id']].calls[0][0],'thread/resume')
    def test_permission_request_requires_user_response(self):
        s = self.session()
        self.app.on_event(s['id'], {'id': 71, 'method': 'item/commandExecution/requestApproval', 'params': {'command': 'test command', 'reason': 'network'}})
        self.assertEqual(self.app.store.get('session', s['id'])['status'], 'waiting')
        self.assertFalse(self.app.clients[s['id']].answers)
        self.app.approve(s['id']+':71', 'decline')
        self.assertEqual(self.app.clients[s['id']].answers, [(71, {'decision': 'decline'})])
        self.assertFalse(self.app.store.all('approval'))
    def test_private_reasoning_not_logged(self):
        s = self.session()
        self.app.on_event(s['id'], {'method': 'item/reasoning/summaryTextDelta', 'params': {'delta': 'PRIVATE'}})
        self.app.on_event(s['id'], {'method': 'item/completed', 'params': {'item': {'type': 'reasoning', 'text': 'PRIVATE'}}})
        self.assertNotIn('PRIVATE', json.dumps(self.app.store.events()))
    def test_restart_recovers_sessions_and_jobs_as_interrupted(self):
        s = self.session()
        self.app.store.put('benchmark', {'id':'bench_fixture', 'status':'running'})
        recovered = Application(self.root)
        self.assertEqual(recovered.store.get('session', s['id'])['status'], 'stopped')
        self.assertEqual(recovered.store.get('benchmark', 'bench_fixture')['status'], 'interrupted')
    def test_benchmark_exact_oracle_and_artifacts(self):
        b = self.app.benchmark({'model':'fixture-model', 'cases':[{'prompt':'ok','expected':'ok'},{'prompt':'ok','expected':'wrong'}], 'repeats':2})
        done = self.wait_for('benchmark', b['id'])
        self.assertEqual(done['status'], 'completed')
        self.assertEqual([r['passed'] for r in done['results']], [True,False,True,False])
        self.assertEqual(len({r['sessionId'] for r in done['results']}),4)
        self.assertTrue(all(not self.app.store.get('session', r['sessionId'])['memory'] for r in done['results']))
        for _ in range(20):
            if (self.root/'.atelier/runs'/b['id']/'results.json').exists(): break
            time.sleep(.01)
        self.assertTrue((self.root/'.atelier/runs'/b['id']/'results.json').exists())
    def test_benchmark_limit(self):
        with self.assertRaises(ValueError): self.app.benchmark({'model':'fixture-model','cases':[{'prompt':'ok','expected':'ok'}], 'repeats':51})
    def test_generator_produces_reviewable_dataset_without_running_campaign(self):
        data = self.app.generate_cases({'model':'fixture-model','topic':'Formats','count':2})
        self.assertEqual(len(data['cases']),2)
        self.assertEqual(data['validation'],'HUMAN_REVIEW_REQUIRED')
        self.assertFalse(self.app.store.all('benchmark'))
        self.assertEqual(self.app.store.get('session', data['generatedBy'])['status'],'closed')
    def test_independent_judge_is_separate_session(self):
        b = self.app.benchmark({'model':'fixture-model','judge':'model','judgeModel':'fixture-judge','cases':[{'prompt':'ok','expected':'ok'}]})
        result = self.wait_for('benchmark', b['id'])['results'][0]
        self.assertTrue(result['passed'])
        self.assertNotEqual(result['sessionId'],result['judgeSessionId'])
        self.assertEqual(result['review']['evidence'],'ok')
    def test_real_git_worktree_isolation(self):
        def git(*args):
            return subprocess.run(['git','-C',str(self.root),*args],text=True,capture_output=True,check=True)
        git('init')
        (self.root/'fixture.txt').write_text('original')
        git('add','fixture.txt')
        git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath=/dev/null','commit','-m','fixture')
        s = self.app.new_session({'name':'Isolated','model':'fixture','worktreeMode':'new','branch':'atelier/test-fixture'},start=False)
        path=Path(s['workingPath'])
        self.assertNotEqual(path,self.root)
        self.assertEqual((path/'fixture.txt').read_text(),'original')
        (path/'fixture.txt').write_text('isolated change')
        self.assertEqual((self.root/'fixture.txt').read_text(),'original')
        reused=self.app.new_session({'model':'fixture','worktreeMode':'existing','existingWorktree':str(path)},start=False)
        self.assertEqual(reused['workingPath'],str(path))
        with self.assertRaises(ValueError):self.app.new_session({'model':'fixture','worktreeMode':'existing','existingWorktree':'/private/tmp'},start=False)
    def test_controlled_orchestration_pipeline(self):
        w = self.app.workflow({'mode':'orchestration', 'name':'Fixture workflow', 'model':'fixture-model', 'mission':'Petite tâche.'})
        done = self.wait_for('workflow', w['id'])
        self.assertEqual(done['status'], 'completed', done.get('error'))
        self.assertEqual([s['role'] for s in done['steps']], ['Planification','Implémentation','Vérification','Synthèse'])
        self.assertTrue(all(s['handoff']['validation']=='UNVERIFIED' for s in done['steps']))
    def test_event_cursor_filters_session_before_limit(self):
        for _ in range(12): self.app.store.event('noise', session_id='other')
        wanted=self.app.store.event('wanted', session_id='agent_fixture')
        self.assertEqual(self.app.store.events(0,1,session='agent_fixture')[0]['id'], wanted['id'])
    def test_redaction_of_known_credentials(self):
        value=redact({'access_token':'abc','Authorization':'Bearer abc','note':'sk-abcdefghijklmnopqrstuvwxyz','inputTokens':12})
        self.assertEqual(value['access_token'],'[REDACTED]')
        self.assertEqual(value['note'],'[REDACTED]')
        self.assertEqual(value['inputTokens'],12)
    def test_http_auth_host_origin(self):
        Handler=make_handler(self.app,'nonce')
        h=object.__new__(Handler)
        h.server=SimpleNamespace(server_port=4317)
        received=[]
        h.reply=lambda data,status=200:received.append(status)
        for headers in ({'Host':'attacker.test:4317','X-Atelier-Token':'nonce'}, {'Host':'localhost:4317'}, {'Host':'localhost:4317','X-Atelier-Token':'nonce','Origin':'https://attacker.test'}):
            h.headers=headers
            self.assertFalse(h.allowed(api=True))
            self.assertEqual(received[-1],403)
        h.headers={'Host':'127.0.0.1:4317','X-Atelier-Token':'nonce','Origin':'http://127.0.0.1:4317'}
        self.assertTrue(h.allowed(api=True))


class JsonRpcTests(unittest.TestCase):
    def test_stdio_handshake_and_response_correlation(self):
        with tempfile.TemporaryDirectory() as directory:
            executable=Path(directory)/'fake-codex'
            executable.write_text('''#!/usr/bin/env python3
import json,sys
for line in sys.stdin:
 m=json.loads(line)
 if 'id' in m:
  result={'data':[{'model':'fixture'}]} if m['method']=='model/list' else {}
  print(json.dumps({'id':m['id'],'result':result}),flush=True)
''')
            executable.chmod(0o700)
            client=CodexClient(executable=str(executable))
            try:
                self.assertEqual(client.rpc('model/list')['data'][0]['model'],'fixture')
            finally: client.close()

if __name__ == '__main__': unittest.main()
