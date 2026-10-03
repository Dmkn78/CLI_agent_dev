import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server.app import Application
from test_application import FakeCodex


PROPOSAL = {'title': 'Architecture proposée', 'explanation': 'Le projet et ses sorties.',
            'graph': {'nodes': [{'id': 'project', 'type': 'rect', 'x': 200, 'y': 150, 'text': 'Projet'}], 'edges': []}}


class ArchitectureFeedbackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = Application(Path(self.temp.name))
        self.patch = patch('server.app.CodexClient', FakeCodex)
        self.patch.start()

    def tearDown(self):
        self.app.shutdown()
        self.patch.stop()
        self.app.store.db.close()
        self.temp.cleanup()

    def proposal(self, text=None, **changes):
        session = self.app.new_session({'model': 'fixture', 'purpose': 'architecture',
            'sandbox': 'workspace-write', 'startWork': True, 'name': 'Conception · dessin', **changes}, start=False)
        self.app.start_session(session['id'])
        self.app.prompt(session['id'], 'Propose un dessin.')
        current = self.app.store.get('session', session['id'])
        messages = current['messages']
        messages[-1]['text'] = json.dumps(PROPOSAL) if text is None else text
        self.app.store.update('session', session['id'], messages=messages)
        return self.app.store.get('session', session['id'])

    def test_validation_imports_page_without_implementation_or_second_turn(self):
        session = self.proposal()
        self.assertEqual(session['sandbox'], 'read-only')
        self.assertFalse(session['workEnabled'])
        self.assertEqual(session['status'], 'waiting_plan')
        result = self.app.approve_plan(session['id'], True)
        self.assertEqual(result['design']['graph'], PROPOSAL['graph'] | {'nodes': [PROPOSAL['graph']['nodes'][0] | {'properties': {}}]})
        self.assertEqual(result['design']['sourceSessionId'], session['id'])
        self.assertEqual(self.app.clients[session['id']].turn_count, 1)
        self.assertEqual(self.app.store.get('session', session['id'])['status'], 'ready')
        with self.assertRaises(ValueError):
            self.app.approve_plan(session['id'], True)
        self.assertEqual(len(self.app.store.all('design')), 1)
        self.app.prompt(session['id'], 'Une seconde proposition.')
        self.assertEqual(self.app.store.get('session', session['id'])['status'], 'waiting_plan')

    def test_malformed_or_empty_proposal_keeps_pending_without_false_approval(self):
        bad_link = {'graph': {'nodes': PROPOSAL['graph']['nodes'], 'edges': [{'sourceNodeId': ['project'], 'targetNodeId': 'project'}]}}
        for text in ('pas de JSON', json.dumps({'graph': {'nodes': [], 'edges': []}}), json.dumps(bad_link)):
            session = self.proposal(text)
            with self.assertRaises(ValueError):
                self.app.approve_plan(session['id'], True)
            self.assertEqual(self.app.store.get('session', session['id'])['status'], 'waiting_plan')
        self.assertFalse(self.app.store.all('design'))
        self.assertFalse([event for event in self.app.store.events() if event['type'] == 'plan.approved'])

    def test_stale_validation_does_not_approve_current_proposal(self):
        session = self.proposal()
        with self.assertRaises(ValueError):
            self.app.approve_plan(session['id'], True, request_id='previous-request')
        self.assertEqual(self.app.store.get('session', session['id'])['status'], 'waiting_plan')
        self.assertFalse(self.app.store.all('design'))

    def test_legacy_drawing_session_repaired_before_new_message(self):
        session = self.app.new_session({'model': 'fixture', 'name': 'Conception · ancien dessin',
            'mission': 'Réponds {"graph":{"nodes":[],"edges":[]}}. Ne modifie aucun fichier.'}, start=False)
        self.app.store.update('session', session['id'], planningStage='implementation')
        self.app.start_session(session['id'])
        self.app.prompt(session['id'], 'Reprends le dessin.')
        current = self.app.store.get('session', session['id'])
        self.assertEqual(current['status'], 'waiting_plan')
        self.assertEqual(current['purpose'], 'architecture')
        self.assertEqual(current['sandbox'], 'read-only')

    def test_computer_required_does_not_fall_back_to_backend(self):
        session = self.proposal(duplicaEnabled=True)
        self.app.store.update('duplicaSettings', 'global', status='active', interactionMode='computer')
        self.app.duplica.configure({'permissions': {'computer_control': 'auto', 'keyboard_mouse': 'auto'}})
        with patch.object(self.app.duplica.computer, 'observe', side_effect=ValueError('Desktop indisponible')) as observe:
            self.app.duplica.tick()
            self.app.duplica.tick()
        self.assertEqual(observe.call_count, 2)
        self.assertFalse(self.app.store.all('design'))
        request = self.app.duplica.snapshot()['requests'][0]
        self.assertIn('Desktop indisponible', request['detail']['reason'])
        self.assertEqual(self.app.store.get('session', session['id'])['status'], 'waiting_plan')

    def test_uncertain_gui_validation_is_not_clicked_again(self):
        session = self.proposal(duplicaEnabled=True)
        self.app.store.update('duplicaSettings', 'global', status='active', interactionMode='computer')
        core = self.app.duplica
        core.configure({'permissions': {'computer_control': 'auto', 'keyboard_mouse': 'auto'}})
        control = {'action': 'approve-plan', 'objectId': session['id'], 'planRequestId': session['currentRequestId'],
                   'enabled': True, 'visible': True, 'index': 1}
        with patch.object(core.computer, 'observe', return_value={'id': 'fixture', 'controls': [control]}), \
                patch.object(core.computer, 'act', side_effect=ValueError('Résultat inconnu')) as act:
            core.tick()
            core.tick()
        self.assertEqual(act.call_count, 1)
        self.assertFalse(self.app.store.all('design'))

    def test_duplica_imports_supervised_drawing_once_and_audits_policy(self):
        session = self.proposal(duplicaEnabled=True)
        self.app.store.update('duplicaSettings', 'global', status='active', interactionMode='backend')
        self.app.duplica.tick()
        self.app.duplica.tick()
        self.assertEqual(len(self.app.store.all('design')), 1)
        self.assertEqual(self.app.store.all('design')[0]['validatedBy'], 'duplica')
        self.assertEqual(self.app.clients[session['id']].turn_count, 1)
        self.assertFalse(self.app.duplica.snapshot()['requests'])

    def test_duplica_pending_plan_can_be_resolved_and_expires_after_decision(self):
        session = self.proposal(duplicaEnabled=True)
        self.app.store.update('duplicaSettings', 'global', status='active', interactionMode='backend')
        self.app.duplica.configure({'permissions': {'approve_architecture': 'ask'}})
        self.app.duplica.tick()
        request = self.app.duplica.snapshot()['requests'][0]
        self.app.duplica.resolve_request(request['id'], accepted=True)
        self.assertEqual(len(self.app.store.all('design')), 1)
        self.assertFalse(self.app.duplica.snapshot()['requests'])

    def test_code_plan_delegation_keeps_read_only_sandbox(self):
        session = self.app.new_session({'model': 'fixture', 'sandbox': 'read-only', 'duplicaEnabled': True}, start=False)
        self.app.start_session(session['id'])
        self.app.prompt(session['id'], 'Diagnostique le problème.')
        self.app.store.update('duplicaSettings', 'global', status='active', interactionMode='backend')
        self.app.duplica.configure({'permissions': {'approve_plan': 'auto'}})
        self.app.duplica.tick()
        turns = [params for method, params in self.app.clients[session['id']].calls if method == 'turn/start']
        self.assertEqual(len(turns), 2)
        self.assertTrue(all(turn['approvalPolicy'] == 'on-request' and turn['sandboxPolicy']['type'] == 'readOnly' for turn in turns))

    def test_manual_task_moves_to_review_after_completed_turn_not_done(self):
        task = self.app.upsert('task', {'title': 'Mission affectée', 'status': 'running'})
        session = self.app.new_session({'model': 'fixture', 'planMode': False, 'taskId': task['id']}, start=False)
        self.app.store.update('task', task['id'], assigneeId=session['id'])
        self.app.start_session(session['id'])
        self.app.prompt(session['id'], 'Réalise cette mission.')
        self.assertEqual(self.app.store.get('task', task['id'])['status'], 'review')
        self.assertEqual(self.app.store.get('session', session['id'])['status'], 'ready')


if __name__ == '__main__':
    unittest.main()
