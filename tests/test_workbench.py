import json
import tempfile
import unittest
import time
from pathlib import Path
from unittest.mock import patch

from server.app import Application
from test_application import FakeCodex
from server.canvas import save_canvas, validate_graph
from server.tariffs import save_tariff


class WorkbenchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = Application(Path(self.temp.name))
        self.patcher = patch('server.app.CodexClient', FakeCodex)
        self.patcher.start()

    def tearDown(self):
        self.app.shutdown()
        self.patcher.stop()
        self.app.store.db.close()
        self.temp.cleanup()

    def session(self, **options):
        session = self.app.new_session({'model': 'fixture', **options}, start=False)
        self.app.start_session(session['id'])
        return session

    def test_retry_error_is_visible_without_claiming_completion(self):
        session = self.session()
        self.app.on_event(session['id'], {'method': 'error', 'params': {
            'willRetry': True, 'error': {'message': 'Reconnecting 2/5',
            'additionalDetails': 'invalid peer certificate: UnknownIssuer'}}})
        current = self.app.store.get('session', session['id'])
        self.assertIn('UnknownIssuer', current['transportError'])
        self.assertTrue(current['retrying'])
        self.assertIsNone(current.get('lastTurnStatus'))
        self.assertEqual(len(self.app.store.all('notification')), 1)

    def test_default_plan_is_read_only_and_requires_explicit_approval(self):
        session = self.session(sandbox='workspace-write')
        client = self.app.clients[session['id']]
        self.assertEqual(client.calls[0][1]['sandbox'], 'read-only')
        self.app.prompt(session['id'], 'Corrige le bug.')
        current = self.app.store.get('session', session['id'])
        self.assertEqual(current['status'], 'waiting_plan')
        turn = next(params for method, params in client.calls if method == 'turn/start')
        self.assertEqual(turn['sandboxPolicy']['type'], 'readOnly')
        with self.assertRaises(ValueError):
            self.app.prompt(session['id'], 'Implémente sans validation.')
        self.app.approve_plan(session['id'], True)
        turn = [params for method, params in client.calls if method == 'turn/start'][-1]
        self.assertEqual(turn['sandboxPolicy']['type'], 'workspaceWrite')
        self.assertEqual(self.app.store.get('session', session['id'])['planningStage'], 'implementation')

    def test_report_has_compact_machine_metadata_and_no_duplicated_transcript(self):
        session = self.session(planMode=False)
        self.app.prompt(session['id'], 'Une mission')
        self.app.on_event(session['id'], {'method': 'turn/completed', 'params': {
            'turn': {'id': 'native', 'status': 'completed', 'durationMs': 1234}}})
        report = self.app.report(session['id'])
        self.assertTrue(report['content'].startswith('---\n'))
        metadata = report['metadata']
        self.assertEqual(metadata['turnDurationMs'], 1234)
        self.assertEqual(metadata['validation'], 'UNVERIFIED')
        self.assertNotIn('## Production', report['content'])
        saved = json.loads(Path(report['jsonArtifact']['path']).read_text(encoding='utf-8'))
        self.assertEqual(saved, metadata)

    def test_discovery_events_retain_login_failures_and_limit_updates(self):
        self.app.on_provider_event({'method': 'account/login/completed', 'params': {
            'success': False, 'error': 'token_exchange_failed'}})
        self.assertIn('token_exchange_failed', self.app.provider['loginError'])
        self.app.on_provider_event({'method': 'account/rateLimits/updated', 'params': {
            'rateLimits': {'limitId': 'codex', 'primary': {'usedPercent': 42}}}})
        self.assertEqual(self.app.provider['limits']['rateLimits']['primary']['usedPercent'], 42)

    def test_todo_plan_holds_claim_until_approval_then_requests_review(self):
        task = self.app.upsert('task', {'title': 'Un bug'})
        session = self.session(startWork=True)
        for _ in range(200):
            if self.app.store.get('session', session['id'])['status'] == 'waiting_plan':
                break
            time.sleep(.01)
        self.assertEqual(self.app.store.get('task', task['id'])['status'], 'running')
        self.assertEqual(self.app.store.get('task', task['id'])['claimedBy'], session['id'])
        self.app.approve_plan(session['id'], True)
        for _ in range(200):
            if self.app.store.get('task', task['id'])['status'] == 'review':
                break
            time.sleep(.01)
        self.assertEqual(self.app.store.get('task', task['id'])['status'], 'review')

    def test_canvas_is_inert_bounded_project_scoped_and_revision_checked(self):
        graph = {'nodes': [{'id':'n','type':'rect','x':20,'y':40,'text':'Kafka'}], 'edges':[]}
        document = save_canvas(self.app, {'graph':graph,'title':'Conception'})
        updated = save_canvas(self.app, {**document,'explanation':'Pipeline'})
        self.assertEqual(updated['revision'], 2)
        with self.assertRaises(ValueError):
            save_canvas(self.app, document)
        with self.assertRaises(ValueError):
            validate_graph({'nodes':graph['nodes'],'edges':[{'sourceNodeId':'n','targetNodeId':'absent'}]})
        with self.assertRaises(ValueError):
            validate_graph({'nodes':[{'id':'n','type':'html','x':20,'y':40}], 'edges':[]})
        self.assertEqual(self.app.store.all('session'), [])

    def test_canvas_rejects_malformed_nodes_and_long_edge_ids(self):
        with self.assertRaises(ValueError):
            validate_graph({'nodes':['invalid'],'edges':[]})
        node={'id':'n','type':'rect','x':20,'y':40}
        with self.assertRaises(ValueError):
            validate_graph({'nodes':[node],'edges':[{'id':'e'*101,'sourceNodeId':'n','targetNodeId':'n'}]})

    def test_workflow_waits_for_human_plan_and_stops_cleanly(self):
        workflow=self.app.workflow({'mode':'duo','model':'fixture','mission':'Corrige un bug'})
        for _ in range(200):
            current=self.app.store.get('workflow',workflow['id'])
            if current['status'] == 'waiting_plan':
                break
            time.sleep(.01)
        self.assertEqual(current['status'],'waiting_plan')
        self.assertEqual([step['role'] for step in current['steps']],['Planification'])
        self.app.shutdown()
        self.assertFalse(self.app.workflow_threads)

    def test_tariff_requires_finite_prices_and_provenance(self):
        tariff={'projectId':'atelier','model':'fixture','provider':'codex','input':1,'cache':.1,'output':2,'source':'Manual fixture, 2026-10-01'}
        self.assertEqual(save_tariff(self.app,tariff)['currency'],'USD')
        with self.assertRaises(ValueError):
            save_tariff(self.app,{**tariff,'input':'nan'})
        with self.assertRaises(ValueError):
            save_tariff(self.app,{**tariff,'source':''})


if __name__ == '__main__':
    unittest.main()
