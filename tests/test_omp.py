import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from server.omp import OmpClient, OmpError, discover_models
from server.omp_session import OmpSession, workspace_file
from server.terminal import prepare_omp


class FakeOmp:
    def __init__(self, cwd, directory, callback, *args):
        self.callback = callback
        self.frames = []
        self.tools = []
        self.process = SimpleNamespace(poll=lambda: None)
    def rpc(self, command, payload=None, **kwargs):
        self.frames.append((command,payload))
        if command == 'get_state':
            return {'sessionId':'omp-fixture','dumpTools':[{'name':t['name']} for t in self.tools]}
        if command == 'set_host_tools': self.tools = payload['tools']
        return {}
    def send(self, frame): self.frames.append(frame)
    def close(self): pass


class OmpTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.events = []
        self.session = {'id':'agent-fixture','model':'provider/fixture','runtime':'omp','effort':'off',
                        'workingPath':str(self.root),'sandbox':'workspace-write'}
        self.patch = patch('server.omp_session.OmpClient', FakeOmp)
        self.patch.start()
        self.bridge = OmpSession(self.session, self.root, '', self.events.append)
    def tearDown(self):
        self.bridge.close()
        self.patch.stop()
        self.directory.cleanup()
    def tool_call(self, name, arguments, request='tool-fixture'):
        self.bridge.on_frame({'type':'host_tool_call','id':request,'toolName':name,'arguments':arguments})
    def test_write_needs_approval_and_rejects_stale_file(self):
        path = self.root / 'file.txt'
        path.write_text('original',encoding='utf-8')
        self.tool_call('atelier_write', {'path':'file.txt','content':'updated'})
        self.assertEqual(path.read_text(),'original')
        self.assertEqual(self.events[-1]['method'],'item/fileChange/requestApproval')
        path.write_text('user change',encoding='utf-8')
        self.bridge.respond('tool-fixture',{'decision':'accept'})
        self.assertEqual(path.read_text(),'user change')
        self.assertTrue(self.bridge.client.frames[-1]['isError'])
    def test_approved_write_and_decline(self):
        self.tool_call('atelier_write',{'path':'new.txt','content':'ok'})
        self.bridge.respond('tool-fixture',{'decision':'accept'})
        self.assertEqual((self.root/'new.txt').read_text(),'ok')
        self.tool_call('atelier_write',{'path':'new.txt','content':'bad'},'second')
        self.bridge.respond('second',{'decision':'decline'})
        self.assertEqual((self.root/'new.txt').read_text(),'ok')
    def test_read_only_does_not_offer_or_execute_write(self):
        session = dict(self.session,sandbox='read-only')
        bridge = OmpSession(session,self.root,'',self.events.append)
        self.assertEqual([tool['name'] for tool in bridge.client.tools],['atelier_read'])
        bridge.handle_tool({'id':'attempt','toolName':'atelier_write','arguments':{'path':'new.txt','content':'bad'}})
        self.assertFalse((self.root/'new.txt').exists())
        self.assertTrue(bridge.client.frames[-1]['isError'])
    def test_project_boundaries_and_credential_directories(self):
        for relative in ('../outside.txt','.env.local','.git/config','.codex/auth.json','.aws/credentials',
                         '.GIT/config','.Codex/auth.json','.ENV.local'):
            with self.assertRaises(ValueError): workspace_file(self.root,relative)
        self.tool_call('bash',{'path':'normal.txt','command':'anything'})
        self.assertTrue(self.bridge.client.frames[-1]['isError'])
    def test_stream_usage_deduplicates_and_never_logs_thinking(self):
        self.bridge.turn_id = 'turn-fixture'
        self.bridge.on_frame({'type':'message_update','messageId':'m','assistantMessageEvent':{'type':'thinking_delta','delta':'PRIVATE'}})
        frame = {'type':'message_end','messageId':'m','message':{'role':'assistant','content':[{'type':'text','text':'ok'},{'type':'thinking','thinking':'PRIVATE'}],
                'usage':{'input':10,'output':2,'cacheRead':3,'cacheWrite':1,'totalTokens':16}}}
        self.bridge.on_frame(frame)
        self.bridge.on_frame(frame)
        self.assertEqual(self.bridge.total['totalTokens'],16)
        self.assertEqual(self.bridge.total['inputTokens'],14)
        self.assertNotIn('PRIVATE',json.dumps(self.events))
        self.bridge.on_frame({'type':'prompt_result','status':'completed','sessionSettled':True})
        self.bridge.on_frame({'type':'session_settled'})
        self.assertEqual(len([e for e in self.events if e['method']=='turn/completed']),1)
    def test_native_commands_and_tool_configuration_changes_rejected(self):
        with self.assertRaises(OmpError): self.bridge.rpc('turn/start',{'input':[{'text':'/config'}]})
        self.bridge.client.tools.append({'name':'bash'})
        with self.assertRaises(OmpError): self.bridge.rpc('turn/start',{'input':[{'text':'normal mission'}]})
    def test_cancelled_write_cannot_be_approved(self):
        self.tool_call('atelier_write',{'path':'new.txt','content':'ok'})
        self.bridge.on_frame({'type':'host_tool_cancel','targetId':'tool-fixture'})
        with self.assertRaises(ValueError): self.bridge.respond('tool-fixture',{'decision':'accept'})
        self.assertFalse((self.root/'new.txt').exists())
    def test_catalog_is_discovered_not_a_static_model_list(self):
        result = SimpleNamespace(returncode=0,stdout=json.dumps({'models':[{'selector':'vendor/model','provider':'vendor','id':'model','name':'Custom','thinking':['low','high']}]}))
        with patch('server.omp.shutil.which',return_value='omp'), patch('server.omp.subprocess.run',return_value=result):
            models = discover_models(self.root)['models']
        self.assertEqual(models[0]['model'],'vendor/model')
        self.assertEqual([e['reasoningEffort'] for e in models[0]['supportedReasoningEfforts']],['off','low','high'])
    def test_terminal_arguments_are_literal_and_no_inference_is_started(self):
        models = [{'model':'vendor/model','supportedReasoningEfforts':[{'reasoningEffort':'off'}]}]
        with patch('server.terminal.shutil.which',return_value='omp'):
            plan = prepare_omp("project'; Write-Output 'unexpected",{'model':'vendor/model','role':'dev; whoami'},models)
            self.assertIn('--no-title',plan['argv'])
            self.assertEqual(plan['argv'][plan['argv'].index('--approval-mode')+1],'always-ask')
            self.assertNotIn('--auto-approve',plan['argv'])
            self.assertNotIn('--print',plan['argv'])
            if os.name == 'nt': self.assertIn("project''; Write-Output ''unexpected",plan['script'])
            with self.assertRaises(ValueError): prepare_omp(self.root,{'model':'vendor/model','sandbox':'workspace-write'},models)


class OmpTransportTests(unittest.TestCase):
    def test_jsonl_ready_response_and_errors_without_provider(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            script = root / 'fake_omp.py'
            script.write_text("import json,sys\nprint(json.dumps({'type':'ready'}),flush=True)\nfor line in sys.stdin:\n frame=json.loads(line)\n print(json.dumps({'type':'response','id':frame['id'],'success':frame['type']!='invalid','error':'fixture refusal','data':{'sessionId':'fixture'}}),flush=True)\n",encoding='utf-8')
            client = OmpClient(root,root,executable=[sys.executable,str(script)])
            try:
                self.assertEqual(client.rpc('get_state')['sessionId'],'fixture')
                with self.assertRaises(OmpError): client.rpc('invalid')
            finally:
                client.close()


if __name__ == '__main__': unittest.main()
