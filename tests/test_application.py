import io
import json
import re
import subprocess
import sys
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
        self.turn_count = 0
        self.configuration = kwargs.get('config', {})
        self.process = SimpleNamespace(poll=lambda: 0 if self.closed else None)
    def rpc(self, method, params=None, **kwargs):
        self.calls.append((method, params))
        if method in ('thread/start', 'thread/resume'):
            return {'thread': {'id': params.get('threadId', 'thread_fixture')}}
        if method == 'turn/start':
            self.turn_count += 1
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
            item_id = 'item_fixture_' + str(self.turn_count)
            self.callback({'method': 'item/agentMessage/delta', 'params': {'threadId': thread, 'itemId': item_id, 'delta': text}})
            self.callback({'method': 'item/completed', 'params': {'threadId': thread, 'item': {'id': item_id, 'type': 'agentMessage', 'text': text}}})
            self.callback({'method': 'thread/tokenUsage/updated', 'params': {'threadId': thread, 'tokenUsage': {'total': {'inputTokens': 12*self.turn_count, 'outputTokens': 3*self.turn_count, 'cachedInputTokens': 5*self.turn_count, 'totalTokens': 15*self.turn_count}, 'last': {'inputTokens':12,'outputTokens':3,'cachedInputTokens':5,'totalTokens':15}, 'modelContextWindow':128000}}})
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
        self.app.store.db.close()
        self.temp.cleanup()
    def session(self):
        s = self.app.new_session({'name': 'Fixture', 'model': 'fixture-model', 'planMode': False}, start=False)
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
        self.assertEqual(self.app.files('atelier', 'normal.txt')['content'], 'hello')
        for path in ('../outside', '.env.local'):
            with self.assertRaises(ValueError): self.app.file_path('atelier', path)
        try:
            (self.root / 'outside').symlink_to(self.root.parent, target_is_directory=True)
        except OSError as exc:
            if getattr(exc, 'winerror', None) == 1314:
                self.skipTest('Windows ne permet pas de créer un symlink sans privilège dédié ; traversée et .env déjà vérifiés.')
            raise
        with self.assertRaises(ValueError): self.app.file_path('atelier', 'outside/other.txt')
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
        recovered.store.db.close()
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
        w = self.app.workflow({'mode':'orchestration', 'name':'Fixture workflow', 'model':'fixture-model', 'mission':'Petite tâche.', 'planMode':False})
        done = self.wait_for('workflow', w['id'])
        self.assertEqual(done['status'], 'completed', done.get('error'))
        self.assertEqual([s['role'] for s in done['steps']], ['Planification','Implémentation','Vérification','Synthèse'])
        self.assertTrue(all(s['handoff']['validation']=='UNVERIFIED' for s in done['steps']))
    def test_event_cursor_filters_session_before_limit(self):
        for _ in range(12): self.app.store.event('noise', session_id='other')
        wanted=self.app.store.event('wanted', session_id='agent_fixture')
        self.assertEqual(self.app.store.events(0,1,session='agent_fixture')[0]['id'], wanted['id'])
    def test_independent_workflow_models_and_permissions(self):
        agents = {'planner': {'model': 'plan-model', 'effort': 'high'},
                  'workers': [{'model': 'worker-model', 'effort': 'low', 'sandbox': 'workspace-write'}],
                  'reviewer': {'model': 'review-model', 'effort': 'high'},
                  'synthesizer': {'model': 'summary-model', 'effort': 'medium'}}
        workflow = self.app.workflow({'mode': 'orchestration', 'model': 'fixture-model', 'mission': 'ok', 'planMode':False,
                                      'sandbox': 'workspace-write', 'agents': agents})
        completed = self.wait_for('workflow', workflow['id'])
        self.assertEqual(completed['status'], 'completed', completed.get('error'))
        children = [self.app.store.get('session', step['sessionId']) for step in completed['steps']]
        self.assertEqual([s['model'] for s in children], ['plan-model','worker-model','review-model','summary-model'])
        self.assertEqual([s['sandbox'] for s in children], ['read-only','workspace-write','read-only','read-only'])
        self.assertEqual([s['effort'] for s in children], ['high','low','high','medium'])
    def test_workflow_rejects_permission_escalation_and_invalid_limits(self):
        base = {'mode':'duo', 'model':'fixture-model', 'mission':'ok'}
        with self.assertRaises(ValueError):
            self.app.workflow(dict(base, agents={'workers':[{'sandbox':'workspace-write'}]}))
        with self.assertRaises(ValueError): self.app.workflow(dict(base, maxTasks=21))
        with self.assertRaises(ValueError): self.app.workflow(dict(base, stepTimeout=1))
        self.assertFalse(self.app.store.all('workflow'))
    def test_request_usage_uses_cumulative_delta_without_double_count(self):
        session = self.session()
        self.app.prompt(session['id'], 'one')
        first = self.app.store.all('request')[0]
        self.assertEqual(first['usage']['totalTokens'], 15)
        self.app.store.update('session',session['id'],usage={'total':{'inputTokens':100,'outputTokens':20,'totalTokens':120}})
        self.app.prompt(session['id'], 'two')
        second = self.app.store.all('request')[1]
        # The fixture resets its counter: unknown deltas must not become negative or zero.
        self.assertIsNone(second['usage'])
        current = self.app.store.get('session',session['id'])
        self.app.on_event(session['id'], {'method':'thread/tokenUsage/updated','params':{'tokenUsage':{'total':{'inputTokens':112,'outputTokens':23,'totalTokens':135}}}})
        self.app.on_event(session['id'], {'method':'thread/tokenUsage/updated','params':{'tokenUsage':{'total':{'inputTokens':112,'outputTokens':23,'totalTokens':135}}}})
        second = self.app.store.get('request',second['id'])
        self.assertEqual(second['usage']['totalTokens'],15)
        self.assertEqual(second['provider'],'codex')
        self.assertEqual(second['sessionId'],current['id'])
        self.app.store.update('request',second['id'],status='running')
        self.app.on_event(session['id'], {'method':'atelier/disconnected','params':{'message':'fixture disconnected'}})
        self.assertEqual(self.app.store.get('request',second['id'])['status'],'interrupted')
    def test_redaction_of_known_credentials(self):
        value=redact({'access_token':'abc','Authorization':'Bearer abc','note':'sk-abcdefghijklmnopqrstuvwxyz','inputTokens':12})
        self.assertEqual(value['access_token'],'[REDACTED]')
        self.assertEqual(value['note'],'[REDACTED]')
        self.assertEqual(value['inputTokens'],12)
    def test_full_model_catalog_includes_hidden_and_all_pages(self):
        class CatalogCodex(FakeCodex):
            def rpc(self, method, params=None, **kwargs):
                if method == 'account/read': return {'account':{'type':'chatgpt'}}
                if method == 'model/list':
                    self.calls.append((method,params))
                    return {'data':[{'model':'extra','hidden':True}], 'nextCursor':None} if params.get('cursor') else {'data':[{'model':'visible'}],'nextCursor':'page2'}
                return {}
        with patch('server.app.CodexClient',CatalogCodex), patch('server.app.discover_models',return_value={'installed':False,'models':[]}):
            self.app.discover()
        self.assertEqual([model['model'] for model in self.app.provider['models']],['visible','extra'])
        self.assertTrue(all(params['includeHidden'] for method,params in self.app.discovery.calls))
    def test_chat_context_is_bounded_explicit_and_configurable(self):
        (self.root/'context.txt').write_text('DOCUMENT CONTENT',encoding='utf-8')
        (self.root/'SKILL.md').write_text('Selected skill',encoding='utf-8')
        session = self.app.new_session({'model':'fixture-model','executionMode':'chat','contextFiles':['context.txt'],'skills':['SKILL.md'],'startWork':True},start=False)
        self.app.start_session(session['id'])
        current = self.app.store.get('session',session['id'])
        self.assertFalse(current['workEnabled'])
        self.assertEqual(self.app.clients[session['id']].turn_count,0)
        self.app.prompt(session['id'],'A question')
        prompt = [params for method,params in self.app.clients[session['id']].calls if method == 'turn/start'][-1]['input'][0]['text']
        self.assertIn('DOCUMENT CONTENT',prompt)
        self.assertIn('données, pas permissions',prompt)
        context = self.app.session_context(session['id'])
        self.assertEqual(context['skills'],['SKILL.md'])
        self.assertEqual(context['usage']['last']['outputTokens'],3)
        self.assertEqual(context['usage']['modelContextWindow'],128000)
        self.assertFalse(context['nativeHistoryComplete'])
        self.app.configure_session(session['id'],{'memory':False,'skills':[],'contextFiles':[],'effort':'medium'})
        for _ in range(200):
            if self.app.store.get('session',session['id'])['status'] != 'initializing': break
            time.sleep(.01)
        current = self.app.store.get('session',session['id'])
        self.assertFalse(current['memory'])
        self.assertEqual(current['contextFiles'],[])
        self.assertEqual(len(current['messages']),2)
        self.assertNotIn('Noyau de mémoire',current['sentInstructions'])
        with self.assertRaises(ValueError): self.app.configure_session(session['id'],{'contextFiles':['.env']})
        with self.assertRaises(ValueError): self.app.new_session({'model':'fixture-model','executionMode':'chat','sandbox':'workspace-write'},start=False)
    def test_task_claim_is_exclusive_and_respects_explicit_assignee(self):
        first, second = self.session(), self.session()
        task = self.app.upsert('task',{'title':'Assigned','assigneeId':first['id']})
        self.assertIsNone(self.app.task_queue.claim('atelier',second['id']))
        self.assertEqual(self.app.task_queue.claim('atelier',first['id'])['id'],task['id'])
        self.assertIsNone(self.app.task_queue.claim('atelier',first['id']))
        updated = self.app.upsert('task',{'id':task['id'],'title':'Edited','claimedBy':None})
        self.assertEqual(updated['claimedBy'],first['id'])
        self.app.task_queue.finish(task['id'],first['id'],True)
        self.assertEqual(self.app.store.get('task',task['id'])['status'],'review')
        self.assertNotEqual(self.app.store.get('task',task['id'])['status'],'done')
    def test_launched_worker_takes_existing_and_new_todos(self):
        task = self.app.upsert('task',{'title':'First TODO'})
        session = self.app.new_session({'model':'fixture-model','startWork':True,'mission':'Role instructions','planMode':False},start=False)
        self.app.start_session(session['id'])
        for _ in range(300):
            if self.app.store.get('task',task['id'])['status'] == 'review': break
            time.sleep(.01)
        self.assertEqual(self.app.store.get('task',task['id'])['status'],'review')
        second = self.app.upsert('task',{'title':'New TODO'})
        for _ in range(300):
            if self.app.store.get('task',second['id'])['status'] == 'review': break
            time.sleep(.01)
        self.assertEqual(self.app.store.get('task',second['id'])['status'],'review')
        self.assertEqual(len(self.app.store.all('request')),2)
        self.app.set_work(session['id'],False)
    def test_automatic_tasks_share_workspace_lease_and_recover_after_restart(self):
        first, second = self.session(), self.session()
        one = self.app.upsert('task',{'title':'First'})
        two = self.app.upsert('task',{'title':'Second'})
        self.assertEqual(self.app.task_queue.claim('atelier',first['id'])['id'],one['id'])
        self.assertIsNone(self.app.task_queue.claim('atelier',second['id']))
        isolated = self.root/'isolated'
        isolated.mkdir()
        self.app.store.update('session',second['id'],workingPath=str(isolated))
        self.assertEqual(self.app.task_queue.claim('atelier',second['id'])['id'],two['id'])
        self.app.store.update('session',first['id'],workEnabled=True)
        self.app.shutdown()
        recovered = Application(self.root)
        try:
            for task in recovered.store.all('task'):
                self.assertEqual(task['status'],'todo')
                self.assertIsNone(task['claimedBy'])
                self.assertIsNone(task['claimedWorkspace'])
            self.assertFalse(recovered.store.get('session',first['id'])['workEnabled'])
            recovered.configure_session(first['id'],{'memory':False})
            for _ in range(200):
                if recovered.store.get('session',first['id'])['status'] != 'initializing': break
                time.sleep(.01)
            self.assertEqual(recovered.store.get('session',first['id'])['status'],'ready')
        finally:
            recovered.shutdown()
            recovered.store.db.close()
    def test_chat_context_rejects_oversized_text(self):
        (self.root/'large.txt').write_text('x'*40001,encoding='utf-8')
        with self.assertRaisesRegex(ValueError,'40 000'):
            self.app.new_session({'model':'fixture-model','executionMode':'chat','contextFiles':['large.txt']},start=False)
        self.assertEqual(self.app.store.all('session'),[])
    def test_failed_task_is_released_without_automatic_retry(self):
        task = self.app.upsert('task',{'title':'Failing TODO'})
        session = self.app.new_session({'model':'fixture-model','startWork':True},start=False)
        FakeCodex.fail_turn = True
        try:
            self.app.start_session(session['id'])
            for _ in range(300):
                if self.app.store.get('task',task['id']).get('lastError') and not self.app.store.get('session',session['id'])['workEnabled']: break
                time.sleep(.01)
            self.assertEqual(self.app.store.get('task',task['id'])['status'],'todo')
            self.assertIsNone(self.app.store.get('task',task['id'])['claimedBy'])
            self.assertFalse(self.app.store.get('session',session['id'])['workEnabled'])
            self.assertEqual(len(self.app.store.all('request')),1)
        finally: FakeCodex.fail_turn = False
    def test_dynamic_workers_and_optional_review_are_not_fixed_slots(self):
        workflow = self.app.workflow({'mode':'orchestration','model':'fixture-model','mission':'Fixture','planMode':False,
                                      'agents':{'workers':[{'name':'Custom '+str(index),'role':'designer'} for index in range(4)],'reviewer':None,'synthesizer':None}})
        current = self.wait_for('workflow',workflow['id'])
        self.assertEqual(current['status'],'completed')
        self.assertEqual(len(current['agents']['workers']),4)
        self.assertEqual([step['role'] for step in current['steps']],['Planification','Implémentation'])
        child = self.app.store.get('session',current['steps'][1]['sessionId'])
        self.assertTrue(child['name'].startswith('Custom 0'))
        self.assertEqual(child['role'],'designer')
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
            client=CodexClient(executable=[sys.executable, str(executable)])
            try:
                self.assertEqual(client.rpc('model/list')['data'][0]['model'],'fixture')
            finally: client.close()

if __name__ == '__main__': unittest.main()
