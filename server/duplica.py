"""Native user proxy: scoped supervision, independent verification, and bounded recovery."""
import json
import threading
import time
from dataclasses import asdict
from datetime import datetime, timezone

from .computer import ComputerController, DesktopBridge, ObservationChanged
from .duplica_backend import CodexBackend, PlatformAgentBackend
from .duplica_memory import CONTEXT_FILES, DuplicaMemory
from .duplica_policy import DEFAULT_PERMISSIONS, approval_verdict, known_answer, validate_permissions
from .duplica_verification import MissionVerifier, validate_recipe
from .duplica_telegram import TelegramRelay
from .duplica_discussion import DuplicaDiscussion
from .store import now, redact, uid


class Duplica:
    def __init__(self, app) -> None:
        self.app, self.store = app, app.store
        self.directory = self.store.root / 'duplica'
        self.memory = DuplicaMemory(self.directory)
        self.bridge = DesktopBridge()
        self.computer = ComputerController(self.bridge, self.directory / 'screenshots', lambda facts: self.event('computer_action', facts))
        self.verifier = MissionVerifier(app, self.computer, self.directory / 'reports')
        self.lock = threading.RLock()
        self.wake = threading.Event()
        self.closed = threading.Event()
        self.worker = None
        self.generation = 0
        self.last_watchdog = {}
        self.native_agents = {}
        self.manual_checks = set()
        self.telegram = TelegramRelay(self)
        self.discussion = DuplicaDiscussion(self)
        existing = self.store.all('duplicaSettings')
        if not existing:
            self.store.put('duplicaSettings', {'id': 'global', 'status': 'off', 'globalEnabled': False,
                'permissions': dict(DEFAULT_PERMISSIONS), 'interactionMode': 'auto', 'watchdogSeconds': 120,
                'telegramEnabled': False, 'createdAt': now()})
        elif existing[0]['status'] == 'active':
            self.store.update('duplicaSettings', 'global', status='paused', recoveryRequired=True)
            self.event('recovery', {'reason': 'Serveur redémarré. Réactivation explicite, aucun effet externe rejoué.'})
        for mission in self.store.all('duplicaMission'):
            if mission['status'] in ('testing', 'correcting', 'supervising'):
                self.store.update('duplicaMission', mission['id'], status='interrupted', reason='Redémarrage ; inspecter puis reprendre.')
        for request in self.store.all('duplicaRequest'):
            if request['status'] == 'pending':
                self.store.update('duplicaRequest', request['id'], status='expired')
        self.memory.sync(self.store)
        self.telegram.start()

    def settings(self) -> dict:
        return self.store.get('duplicaSettings', 'global')

    def event(self, name: str, facts: dict = None, session: dict = None) -> dict:
        event = self.store.event('duplica.' + name, {'actor': 'duplica', **(facts or {})},
                                 session['id'] if session else None, session['projectId'] if session else None)
        self.memory.append_event(event)
        self.telegram.enqueue(event)
        return event

    def configure(self, changes: dict) -> dict:
        with self.lock:
            settings = self.settings()
            updated = dict(settings)
            if 'permissions' in changes:
                updated['permissions'] = {**settings['permissions'], **validate_permissions(changes['permissions'])}
            if 'interactionMode' in changes:
                if changes['interactionMode'] not in ('auto', 'computer', 'backend'):
                    raise ValueError('Mode d’intervention Duplica invalide.')
                updated['interactionMode'] = changes['interactionMode']
            if 'watchdogSeconds' in changes:
                timeout = int(changes['watchdogSeconds'])
                if not 30 <= timeout <= 3600:
                    raise ValueError('Le watchdog accepte 30 à 3600 secondes.')
                updated['watchdogSeconds'] = timeout
            if 'telegramEnabled' in changes:
                if not isinstance(changes['telegramEnabled'], bool):
                    raise ValueError('Activation Telegram invalide.')
                updated['telegramEnabled'] = changes['telegramEnabled']
            updated['updatedAt'] = now()
            self.store.put('duplicaSettings', updated)
            self.event('configured', {'permissions': updated['permissions'], 'interactionMode': updated['interactionMode']})
            self.memory.write(self.directory / 'global' / 'context' / 'PERMISSIONS.md', updated['permissions'])
            self._sync()
            self.telegram.start()
            return updated

    def control(self, action: str, global_enabled=None) -> dict:
        if action not in ('start', 'pause', 'stop', 'take_control'):
            raise ValueError('Commande Duplica inconnue.')
        if global_enabled is not None and not isinstance(global_enabled, bool):
            raise ValueError('Activation globale invalide.')
        with self.lock:
            self.generation += 1
            self.computer.cancel()
            self.verifier.cancel()
            updates = {'status': {'start': 'active', 'pause': 'paused', 'stop': 'off', 'take_control': 'manual'}[action],
                       'updatedAt': now(), 'recoveryRequired': False}
            if global_enabled is not None:
                updates['globalEnabled'] = global_enabled
            result = self.store.update('duplicaSettings', 'global', **updates)
            self.event(action, {'source': 'user', 'globalEnabled': result['globalEnabled']})
            self._sync()
            if action == 'start':
                self._start_worker()
            return result

    def set_scope(self, kind: str, target_id: str, enabled) -> dict:
        if kind not in ('project', 'session', 'workflow', 'task') or enabled is not None and not isinstance(enabled, bool):
            raise ValueError('Portée de supervision invalide.')
        target = self.store.get(kind, target_id)
        with self.lock:
            result = self.store.put('duplicaScope', {'id': kind + ':' + target_id, 'kind': kind, 'targetId': target_id,
                 'projectId': target_id if kind == 'project' else target['projectId'], 'enabled': enabled, 'updatedAt': now()})
            self.generation += 1
            self.computer.cancel()
            self.verifier.cancel()
            self.event('scope_changed', {'kind': kind, 'targetId': target_id, 'enabled': enabled, 'source': 'user'})
            self._sync()
            return result

    def supervised(self, session: dict) -> bool:
        if self.settings()['status'] != 'active' or session.get('role') in ('benchmark', 'judge', 'generator', 'duplica'):
            return False
        enabled = self.settings()['globalEnabled']
        scopes = {scope['id']: scope['enabled'] for scope in self.store.all('duplicaScope')}
        for key in ('project:' + session['projectId'], 'workflow:' + str(session.get('parentId')),
                    'task:' + str(session.get('taskId')), 'session:' + session['id']):
            if scopes.get(key) is not None:
                enabled = scopes[key]
        # Benchmark children are never recruited by a global supervisor.
        if session.get('parentId') in {benchmark['id'] for benchmark in self.store.all('benchmark')}:
            return False
        return bool(enabled)

    def work_on_project(self, changes: dict) -> dict:
        project = self.app.project(changes['projectId'])
        goal = str(changes.get('goal', '')).strip()
        session = None
        if goal:
            if changes.get('sessionId'):
                session = self.store.get('session', changes['sessionId'])
                if session['projectId'] != project['id'] or session.get('parentId') or session.get('executionMode') == 'chat':
                    raise ValueError('Choisis un agent de travail de ce projet.')
            else:
                catalog = self.app.provider.get('models', [])
                model = next((entry for entry in catalog if entry['model'] == changes.get('model')), None)
                if not model:
                    raise ValueError('Choisis un modèle découvert dans Connexions.')
                sandbox = changes.get('sandbox', 'read-only')
                session = self.app.new_session({'projectId': project['id'], 'name': 'Mission Duplica', 'mission': goal,
                    'model': model['model'], 'effort': model['defaultReasoningEffort'], 'sandbox': sandbox,
                    'planMode': sandbox != 'workspace-write', 'duplicaEnabled': True})
            self.save_mission({'sessionId': session['id'], 'goal': goal, 'recipe': changes.get('recipe', {}),
                               'startMission': True, 'autoVerify': True})
        if not any(scope['id'] == 'project:' + project['id'] and scope['enabled'] is True for scope in self.store.all('duplicaScope')):
            self.set_scope('project', project['id'], True)
        if self.settings()['status'] != 'active':
            self.control('start')
        return {'projectId': project['id'], 'sessionId': session['id'] if session else None, 'status': 'active'}

    def save_context(self, changes: dict) -> dict:
        project_id = changes.get('projectId')
        if project_id:
            self.app.project(project_id)
        context_id = project_id or 'global'
        previous = next((context for context in self.store.all('duplicaContext') if context['id'] == context_id), {})
        context = {**previous, 'id': context_id, 'projectId': project_id, 'source': 'user', 'updatedAt': now()}
        for key in CONTEXT_FILES:
            if key in changes:
                if not isinstance(changes[key], str) or len(changes[key]) > 16000:
                    raise ValueError('Contexte invalide ou trop long : ' + key)
                context[key] = redact(changes[key])
        self.store.put('duplicaContext', context)
        self.memory.write_context(context)
        self.event('context_saved', {'contextId': context_id, 'source': 'user'})
        self._sync()
        return context

    def save_decision(self, changes: dict) -> dict:
        questions, answer = changes.get('questions'), changes.get('answer')
        if not isinstance(questions, list) or not 1 <= len(questions) <= 20 or not all(
                isinstance(question, str) and 0 < len(question.strip()) <= 2000 for question in questions):
            raise ValueError('Saisis les formulations exactes de la question (1 à 20).')
        if not isinstance(answer, str) or not answer.strip() or len(answer) > 8000:
            raise ValueError('Réponse obligatoire, limitée à 8 000 caractères.')
        project_id = changes.get('projectId')
        if project_id:
            self.app.project(project_id)
        decision = {'id': uid('decision'), 'projectId': project_id, 'questions': questions,
                    'answer': redact(answer), 'source': 'user:explicit-answer', 'active': True, 'createdAt': now()}
        self.store.put('duplicaDecision', decision)
        self.event('decision_saved', {'decisionId': decision['id'], 'projectId': project_id, 'source': decision['source']})
        self._sync()
        return decision

    def save_mission(self, changes: dict) -> dict:
        session = self.store.get('session', changes['sessionId'])
        if session.get('parentId') or session.get('executionMode') == 'chat' or session['status'] == 'closed':
            raise ValueError('La recette s’attache à un agent de travail indépendant, non clôturé.')
        goal = str(changes.get('goal') or session.get('mission', '')).strip()
        if not goal or len(goal) > 20000:
            raise ValueError('Objectif de mission obligatoire (20 000 caractères maximum).')
        recipe = validate_recipe(changes.get('recipe', {}), session['workingPath'])
        maximum = int(changes.get('maxContinuations', 3))
        if not 0 <= maximum <= 10:
            raise ValueError('Choisis 0 à 10 relances maximum.')
        previous = next((mission for mission in self.store.all('duplicaMission') if mission['sessionId'] == session['id']), None)
        mission = {'id': previous['id'] if previous else uid('mission'), 'sessionId': session['id'], 'projectId': session['projectId'],
                   'configurationId': uid('criteria'),
                   'goal': goal, 'recipe': recipe, 'maxContinuations': maximum, 'continuations': 0,
                   'status': 'supervising', 'createdAt': previous['createdAt'] if previous else now(),
                   'updatedAt': now(), 'autoVerify': changes.get('autoVerify', True) is True, 'source': 'user:mission-definition'}
        if previous and (previous['recipe'] != recipe or previous['goal'] != goal):
            for bug in self.store.all('duplicaObservation'):
                if bug['missionId'] == previous['id'] and bug['status'] == 'open':
                    self.store.update('duplicaObservation', bug['id'], status='superseded',
                                      reason='Critères redéfinis explicitement par l’utilisateur.', supersededAt=now())
        mission['startRequested'] = changes.get('startMission') is True
        mission['started'] = False
        self.store.put('duplicaMission', mission)
        self.set_scope('session', session['id'], True)
        self.event('mission_configured', {'missionId': mission['id'], 'goal': goal, 'source': mission['source']}, session)
        self.memory.write(self.directory / 'projects' / session['projectId'] / 'context' / 'REQUIREMENTS.md',
                          '# Objectif\n\n' + goal + '\n\n# Critères exécutables\n\n' + json.dumps(recipe, ensure_ascii=False, indent=2))
        self._sync()
        return mission

    def hold_task(self, session_id: str) -> bool:
        session = self.store.get('session', session_id)
        return self.supervised(session) and any(mission['sessionId'] == session_id and mission['status'] in (
            'supervising', 'testing', 'correcting', 'needs_evidence', 'waiting_user') for mission in self.store.all('duplicaMission'))

    def request(self, key: str, title: str, session: dict, detail: dict) -> dict:
        existing = next((request for request in self.store.all('duplicaRequest') if request['key'] == key and request['status'] == 'pending'), None)
        if existing:
            return existing
        request = {'id': uid('question'), 'key': key, 'title': title, 'sessionId': session['id'],
                   'projectId': session['projectId'], 'detail': redact(detail), 'createdAt': now(), 'status': 'pending'}
        self.store.put('duplicaRequest', request)
        self.app.notify(request['id'], title, session['id'], session['projectId'], request['detail'])
        self.event('user_required', {'requestId': request['id'], 'title': title, 'detail': request['detail']}, session)
        return request

    def resolve_request(self, request_id: str, answer: str = '', accepted: bool = False, remember: bool = False) -> dict:
        with self.lock:
            request = self.store.get('duplicaRequest', request_id)
            if request['status'] != 'pending':
                raise ValueError('Cette demande est déjà résolue ou périmée.')
            session = self.store.get('session', request['sessionId'])
            detail = request['detail']
            if detail.get('approvalId'):
                approval = self.store.get('approval', detail['approvalId'])
                if approval['method'] == 'item/tool/requestUserInput':
                    questions = approval['params'].get('questions', [])
                    if not answer.strip():
                        raise ValueError('Une réponse est nécessaire.')
                    if len(questions) != 1:
                        raise ValueError('Réponds aux questions séparément dans la session.')
                    self.app.approve(approval['id'], 'accept', {questions[0]['id']: answer})
                    if remember:
                        self.save_decision({'projectId': session['projectId'], 'questions': [questions[0]['question']], 'answer': answer})
                else:
                    self.app.approve(approval['id'], 'accept' if accepted else 'decline')
            elif detail.get('category'):
                if accepted and self.settings()['permissions'].get(detail['category']) == 'deny':
                    raise ValueError('Cette permission est interdite. Modifie d’abord la politique si tu souhaites déléguer cette recette.')
                if accepted and detail['category'] not in ('unknown', 'destructive_system_operation'):
                    # A one-time grant belongs to this exact mission/check, never to agent-originated commands.
                    mission = self.store.get('duplicaMission', detail['missionId'])
                    self.store.update('duplicaMission', mission['id'], grants=list(set(mission.get('grants', []) + [detail['category']])))
                else:
                    self.set_scope('session', session['id'], False)
            self.store.update('duplicaRequest', request_id, status='resolved', accepted=accepted, answer=redact(answer), resolvedAt=now())
            self.event('user_answer', {'requestId': request_id, 'accepted': accepted, 'source': 'user'}, session)
            self._sync()
            return {'ok': True}

    def tick(self) -> None:
        if self.settings()['status'] != 'active':
            return
        with self.lock:
            scheduled = list(self.manual_checks)
            self.manual_checks.clear()
        for mission_id in scheduled:
            self.verify_mission(mission_id)
        for original in self.store.all('session'):
            if self.closed.is_set():
                return
            if not self.supervised(original):
                continue
            backend = CodexBackend(self.app, original['id']) if original.get('runtime', 'codex') == 'codex' else PlatformAgentBackend(self.app, original['id'])
            session = backend.observe()
            mission = next((mission for mission in self.store.all('duplicaMission') if mission['sessionId'] == session['id']), None)
            if mission and mission.get('startRequested') and not mission.get('started') and mission['status'] == 'supervising' and session['status'] == 'ready':
                self.store.update('duplicaMission', mission['id'], started=True)
                self.store.update('session', session['id'], mission=mission['goal'])
                backend.send_message(mission['goal'] + '\nContexte utilisateur validé :\n' + self._context_for(session['projectId']))
                session = backend.observe()
            steering = self.settings().get('telegramSteering')
            if steering and steering['sessionId'] == session['id'] and session['status'] == 'ready':
                self.store.update('duplicaSettings', 'global', telegramSteering=None)
                backend.send_message('Instruction explicite de l’utilisateur : ' + steering['text'])
                session = backend.observe()
            self._watchdog(session)
            for approval in self.store.all('approval'):
                if approval['sessionId'] == session['id']:
                    self._approval(backend, session, approval)
            session = backend.observe()
            if session['status'] == 'waiting_plan':
                self.request('plan:' + session['id'] + ':' + str(session.get('currentRequestId')), 'Plan à valider', session,
                             {'reason': 'La validation du plan reste explicite dans la session.'})
            if session['status'] == 'ready' and session.get('lastTurnStatus') == 'completed':
                mission = next((mission for mission in self.store.all('duplicaMission') if mission['sessionId'] == session['id']), None)
                if mission and mission.get('autoVerify') and mission['status'] not in ('completed', 'interrupted') and mission.get('lastVerifiedRequest') != session.get('currentRequestId'):
                    self.verify_mission(mission['id'])
        self._expire_requests()

    def _approval(self, backend, session: dict, approval: dict) -> None:
        with self.lock:
            if not self.supervised(session) or not any(current['id'] == approval['id'] for current in self.store.all('approval')):
                return
            if any(request['status'] == 'pending' and request['key'] == 'computer:' + approval['id'] for request in self.store.all('duplicaRequest')):
                return
            permissions = self.settings()['permissions']
            answers, sources = {}, []
            if approval['method'] == 'item/tool/requestUserInput':
                for question in approval['params'].get('questions', []):
                    answer, evidence = known_answer(question.get('question', ''), self.store.all('duplicaDecision'), session['projectId'])
                    if answer is None:
                        break
                    answers[question['id']] = answer
                    sources.extend(evidence)
                questions = approval['params'].get('questions', [])
                if not questions or len(answers) != len(questions) or permissions['answer_known_question'] != 'auto':
                    self.request('approval:' + approval['id'], 'Réponse utilisateur nécessaire', session,
                                 {'approvalId': approval['id'], 'questions': questions, 'reason': 'Aucune réponse explicite non contradictoire enregistrée.'})
                    return
                verdict = {'category': 'answer_known_question', 'mode': 'auto', 'source': sources, 'reason': 'Questions reconnues dans les décisions utilisateur.'}
            else:
                verdict = asdict(approval_verdict(approval, session, permissions))
                if verdict['mode'] == 'ask':
                    self.request('approval:' + approval['id'], 'Autorisation ponctuelle nécessaire', session,
                                 {'approvalId': approval['id'], 'verdict': verdict, 'params': approval['params']})
                    return
            generation = self.generation
        decision = 'decline' if verdict['mode'] == 'deny' else 'accept'
        mode = self.settings()['interactionMode']
        use_computer = mode == 'computer' or mode == 'auto' and self.bridge.available()
        try:
            if use_computer:
                if permissions['computer_control'] != 'auto' or permissions['keyboard_mouse'] != 'auto':
                    raise ValueError('Activer les permissions de contrôle du PC pour intervenir dans l’interface.')
                self._gui_response(approval, decision, answers, generation)
            else:
                with self.lock:
                    if generation != self.generation or not self.supervised(session):
                        return
                    if answers:
                        backend.respond(approval['id'], answers)
                    else:
                        backend.approve(approval['id'], decision)
            self.event('question_answered' if answers else 'permission_resolved',
                       {'approvalId': approval['id'], 'decision': decision, 'answers': answers,
                        'verdict': verdict, 'channel': 'computer' if use_computer else 'backend'}, session)
        except ValueError as error:
            self.request('computer:' + approval['id'], 'Intervention à vérifier', session,
                         {'approvalId': approval['id'], 'reason': str(error)})

    def _gui_response(self, approval: dict, decision: str, answers: dict, generation: int) -> None:
        observation = self.computer.observe('platform')
        deadline = time.monotonic() + 5
        while observation.get('modalOpen') and time.monotonic() < deadline:
            if generation != self.generation or self.closed.wait(0.2):
                raise ValueError('Le contrôle a été repris.')
            observation = self.computer.observe('platform')
        if observation.get('modalOpen'):
            raise ValueError('Une fenêtre de configuration est ouverte. Ferme-la puis traite la demande visible.')
        if not any(control.get('approvalId') == approval['id'] for control in observation.get('controls', [])) and not observation.get('url', '').endswith('#duplica'):
            navigation = [control for control in observation.get('controls', []) if control.get('action') == 'duplica-open']
            if not navigation:
                navigation = [control for control in observation.get('controls', []) if control.get('action') == 'navigate' and control.get('view') == 'duplica']
            if len(navigation) != 1 or generation != self.generation:
                raise ValueError('La vue Duplica n’est pas accessible dans cette fenêtre.')
            if not navigation[0].get('visible', True):
                observation = self.computer.act(observation['id'], {'kind': 'scroll_to', 'index': navigation[0]['index']})
            observation = self.computer.act(observation['id'], {'kind': 'click', 'index': navigation[0]['index']})
        for question_id, answer in answers.items():
            observation, control = self._wait_control(observation, approval['id'], 'questionId', question_id, generation)
            observation = self._click_approval(observation, control, approval['id'], 'questionId', question_id, generation)
            if generation != self.generation:
                return
            observation = self.computer.act(observation['id'], {'kind': 'type_text', 'text': answer})
        observation, control = self._wait_control(observation, approval['id'], 'decision', 'answer' if answers else decision, generation)
        self._click_approval(observation, control, approval['id'], 'decision', 'answer' if answers else decision, generation)
        deadline = time.monotonic() + 4
        while any(current['id'] == approval['id'] for current in self.store.all('approval')) and time.monotonic() < deadline:
            if self.closed.wait(0.1) or generation != self.generation:
                raise ValueError('Intervention interrompue ; résultat à observer.')
        if any(current['id'] == approval['id'] for current in self.store.all('approval')):
            raise ValueError('Le clic n’a pas résolu la demande ; aucun deuxième clic automatique.')

    def _wait_control(self, observation: dict, approval_id: str, field: str, expected: str, generation: int) -> tuple:
        deadline = time.monotonic() + 8
        while generation == self.generation and not self.closed.is_set():
            if time.monotonic() > deadline:
                raise ValueError('Le contrôle attendu n’est pas devenu accessible. Ouvre Duplica ou la session et traite la demande.')
            candidates = [control for control in observation.get('controls', []) if control.get('approvalId') == approval_id and
                          control.get(field) == expected and control.get('enabled')]
            if len(candidates) > 1:
                raise ValueError('Plusieurs contrôles correspondent à cette demande. Intervention humaine requise.')
            if len(candidates) == 1:
                if candidates[0].get('visible', True):
                    return observation, candidates[0]
                observation = self.computer.act(observation['id'], {'kind': 'scroll_to', 'index': candidates[0]['index']})
                continue
            self.closed.wait(0.3)
            observation = self.computer.observe('platform')
        raise ValueError('Le contrôle a été repris.')

    def _click_approval(self, observation: dict, control: dict, approval_id: str, field: str, expected: str, generation: int) -> dict:
        try:
            return self.computer.act(observation['id'], {'kind': 'click', 'index': control['index']})
        except ObservationChanged:
            # Only this typed, pre-input rejection permits one fresh observation and retry.
            observation = self.computer.observe('platform')
            observation, control = self._wait_control(observation, approval_id, field, expected, generation)
            return self.computer.act(observation['id'], {'kind': 'click', 'index': control['index']})

    def verify_mission(self, mission_id: str) -> dict:
        with self.lock:
            mission = self.store.get('duplicaMission', mission_id)
            session = self.store.get('session', mission['sessionId'])
            if not self.supervised(session) or session['status'] != 'ready' or mission['status'] == 'testing':
                raise ValueError('La mission doit être supervisée et l’agent prêt pour la recette.')
            permissions = self.settings()['permissions']
            needed = ['workspace_read', 'run_tests']
            if mission['recipe'].get('build'):
                needed.append('run_build')
            if mission['recipe'].get('application'):
                needed.append('run_local_application')
            if mission['recipe'].get('gui'):
                needed += ['computer_control', 'keyboard_mouse', 'browser_control']
            for category in needed:
                mode = permissions[category]
                if mode == 'deny' or mode != 'auto' and category not in mission.get('grants', []):
                    self.store.update('duplicaMission', mission_id, status='waiting_user', reason='Permission requise : ' + category)
                    self.request('verify:' + mission_id + ':' + category, 'Autoriser la recette : ' + category, session,
                                 {'category': category, 'mode': mode, 'missionId': mission_id, 'reason': 'Exécuter la recette exacte enregistrée pour cette mission.'})
                    return {'pending': True}
            if mission['recipe'].get('gui') and not self.bridge.available():
                self.store.update('duplicaMission', mission_id, status='needs_evidence', reason='Ouvrir Atelier desktop pour la recette interface.')
                return {'pending': True}
            generation = self.generation
            self.store.update('duplicaMission', mission_id, status='testing', reason=None)
            self.event('verification_started', {'missionId': mission_id}, session)
        result = self.verifier.verify(mission, session)
        with self.lock:
            self.store.put('duplicaVerification', result)
            if self.store.get('duplicaMission', mission_id).get('configurationId') != mission.get('configurationId'):
                self.event('verification_superseded', {'missionId': mission_id, 'verificationId': result['id'],
                           'reason': 'Critères redéfinis pendant la recette ; résultat conservé sans valider la nouvelle définition.'}, session)
                self._sync()
                return result
            if generation != self.generation or result['cancelled'] or not self.supervised(session):
                self.store.update('duplicaMission', mission_id, status='interrupted', reason='Recette interrompue par reprise de contrôle.')
                self._sync()
                return result
            self.store.update('duplicaMission', mission_id, verificationId=result['id'], lastVerifiedRequest=session.get('currentRequestId'),
                              grants=[], updatedAt=now())
            if result['passed']:
                self.store.update('duplicaMission', mission_id, status='completed', completedAt=now(), reason=None)
                for bug in self.store.all('duplicaObservation'):
                    if bug['missionId'] == mission_id and bug['status'] == 'open':
                        self.store.update('duplicaObservation', bug['id'], status='resolved', retestId=result['id'], resolvedAt=now())
                self.event('task_completed', {'missionId': mission_id, 'verificationId': result['id'],
                           'reason': 'Critères de fichiers, build, tests et parcours interface vérifiés indépendamment.'}, session)
                self.app.notify(mission_id + ':completed', 'Duplica : mission vérifiée', session['id'], session['projectId'], result['artifact'])
            else:
                failures = [check for check in result['checks'] if check['status'] == 'fail']
                if failures and not any(check['status'] == 'not_run' for check in result['checks']):
                    bug = self._bug(mission, session, result, failures)
                    self._continue(mission, session, bug['report'])
                else:
                    self.store.update('duplicaMission', mission_id, status='needs_evidence', reason='La recette comporte des contrôles non exécutés.')
                    self.request('evidence:' + mission_id + ':' + result['id'], 'Preuves de recette manquantes', session,
                                 {'verificationId': result['id'], 'reason': 'Contrôle non exécuté. Inspecter l’accès aux fichiers, les outils et la définition de recette.',
                                  'checks': [check for check in result['checks'] if check['status'] == 'not_run']})
            self.event('verification_finished', {'missionId': mission_id, 'verificationId': result['id'], 'passed': result['passed']}, session)
            self._sync()
            self.app.task_queue.wake.set()
            return result

    def schedule_verification(self, mission_id: str) -> dict:
        mission = self.store.get('duplicaMission', mission_id)
        session = self.store.get('session', mission['sessionId'])
        with self.lock:
            if not self.supervised(session) or session['status'] != 'ready':
                raise ValueError('Réactive la supervision de cette mission et attends que l’agent soit prêt.')
            self.manual_checks.add(mission_id)
            self._start_worker()
            return {'queued': True}

    def _bug(self, mission: dict, session: dict, result: dict, failures: list) -> dict:
        bug_id = uid('bug')
        report = ('BUG ' + bug_id + '\n\nContexte : ' + mission['goal'] + '\n\nRésultat attendu : tous les critères de recette passent.' +
                  '\n\nRésultat observé et étapes exactes :\n' + json.dumps(failures, ensure_ascii=False, indent=2) +
                  '\n\nRecette configurée :\n' + json.dumps(mission['recipe'], ensure_ascii=False, indent=2) +
                  '\n\nPreuve : ' + result['artifact']['path'] + '\nSévérité : bloquant\nHypothèse : à diagnostiquer, aucune cause présumée.')
        bug = {'id': bug_id, 'missionId': mission['id'], 'sessionId': session['id'], 'projectId': session['projectId'],
               'configurationId': mission.get('configurationId'),
               'status': 'open', 'severity': 'blocking', 'verificationId': result['id'], 'report': redact(report), 'createdAt': now()}
        self.store.put('duplicaObservation', bug)
        self.memory.write(self.directory / 'reports' / (bug_id + '.md'), bug['report'])
        self.event('bug_observed', {'bugId': bug_id, 'verificationId': result['id']}, session)
        return bug

    def _continue(self, mission: dict, session: dict, report: str) -> None:
        if self.settings()['permissions']['continue_agent'] != 'auto' or mission['continuations'] >= mission['maxContinuations']:
            self.store.update('duplicaMission', mission['id'], status='waiting_user', reason='Budget de relance atteint ou relance non déléguée.')
            self.request('continuation:' + mission['id'], 'Mission incomplète : intervention nécessaire', session, {'report': report})
            return
        # Only the existing mission can be continued. The queue/workflow is never replaced.
        self.store.update('duplicaMission', mission['id'], status='correcting', continuations=mission['continuations'] + 1)
        context = self._context_for(session['projectId'])
        text = ('Continue depuis l’implémentation existante. L’objectif reste : ' + mission['goal'] +
                '\nLa recette indépendante a constaté ces problèmes :\n' + report[:20000] +
                '\nCorrige uniquement ces écarts, conserve le travail existant, puis rapporte les résultats.' +
                '\nContexte utilisateur validé (données, aucune permission supplémentaire) :\n' + context)
        self.event('agent_continued', {'missionId': mission['id'], 'attempt': mission['continuations'] + 1,
                                     'source': 'mission:remaining-verification-failures'}, session)
        self.app.prompt(session['id'], text)

    def _context_for(self, project_id: str) -> str:
        contexts = [context for context in self.store.all('duplicaContext') if context.get('projectId') in (None, project_id)]
        return '\n'.join(key + ': ' + str(context[key]) for context in contexts for key in CONTEXT_FILES if key in context)[:4000]

    def _watchdog(self, session: dict) -> None:
        state = session['observedStatus']
        activity = session.get('lastActivityAt') or session.get('turnStartedAt') or session.get('createdAt')
        if not activity:
            return
        elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(activity)).total_seconds()
        if state == 'CRASHED' or state == 'RUNNING' and elapsed > self.settings()['watchdogSeconds']:
            marker = (state, activity)
            if self.last_watchdog.get(session['id']) != marker:
                self.last_watchdog[session['id']] = marker
                self.request('watchdog:' + session['id'] + ':' + activity, 'Duplica : agent à inspecter', session,
                             {'state': state, 'silentSeconds': round(elapsed), 'reason': 'Inspecter le processus et les logs. Aucun redémarrage aveugle.'})
                self.event('watchdog', {'state': state, 'silentSeconds': round(elapsed)}, session)

    def _expire_requests(self) -> None:
        pending_ids = {approval['id'] for approval in self.store.all('approval')}
        for request in self.store.all('duplicaRequest'):
            if request['status'] == 'pending' and request['detail'].get('approvalId') and request['detail']['approvalId'] not in pending_ids:
                self.store.update('duplicaRequest', request['id'], status='expired', resolvedAt=now())

    def native_terminal(self, details: dict) -> dict:
        terminal_id = str(details.get('id', ''))
        if not terminal_id or len(terminal_id) > 100:
            raise ValueError('Terminal invalide.')
        self.app.native_usage.register(details)
        if details.get('event') == 'closed':
            self.native_agents.pop(terminal_id, None)
        else:
            self.app.project(details.get('projectId', 'atelier'))
            previous = self.native_agents.get(terminal_id, {})
            self.native_agents[terminal_id] = {**previous, **{key: details.get(key) for key in ('id', 'projectId', 'runtime', 'pid', 'title', 'state')}}
            if details.get('event') in ('opened', 'activity'):
                self.native_agents[terminal_id]['lastActivityAt'] = now()
        return {'ok': True}

    def computer_action(self, changes: dict) -> dict:
        with self.lock:
            settings = self.settings()
            if settings['status'] != 'active' or settings['permissions']['computer_control'] != 'auto' or settings['permissions']['keyboard_mouse'] != 'auto':
                raise ValueError('Réactive Duplica et autorise le contrôle du PC avant cette action.')
            if changes.get('action', {}).get('kind') == 'open_url' and settings['permissions']['browser_control'] != 'auto':
                raise ValueError('Le contrôle du navigateur local n’est pas délégué.')
            generation = self.generation
        result = self.computer.act(changes['snapshotId'], changes['action'])
        if generation != self.generation:
            raise ValueError('Le contrôle a été repris pendant cette action. Observe son résultat.')
        return result

    def resume_mission(self, session_id: str) -> dict:
        session = self.store.get('session', session_id)
        mission = next((mission for mission in self.store.all('duplicaMission') if mission['sessionId'] == session_id), None)
        if not mission or mission['status'] == 'completed':
            raise ValueError('Aucune mission incomplète à reprendre pour cet agent.')
        if session['status'] not in ('ready', 'stopped', 'failed'):
            raise ValueError('L’agent travaille déjà ou attend une décision.')
        self.set_scope('session', session_id, True)
        self.store.update('duplicaMission', mission['id'], status='supervising', lastVerifiedRequest=None, reason=None)
        if self.settings()['status'] != 'active':
            self.control('start')
        if session['status'] in ('stopped', 'failed'):
            self.store.update('duplicaMission', mission['id'], startRequested=True, started=False)
            self.app.resume(session_id)
        else:
            self.app.prompt(session_id, 'Reprise explicitement demandée par l’utilisateur. Continue depuis l’état existant. Objectif : ' + mission['goal'] +
                            '\nConsulte le contexte et les preuves conservées, ne recommence pas de zéro.')
        self._sync()
        return {'ok': True}

    def snapshot(self) -> dict:
        settings = self.settings()
        agents = []
        for session in self.store.all('session'):
            observed = PlatformAgentBackend(self.app, session['id']).observe()
            observed.pop('messages', None)
            observed['supervised'] = self.supervised(session)
            agents.append(observed)
        events = [event for event in self.store.latest_events(500) if event['type'].startswith('duplica.')][:100]
        missions = self.store.all('duplicaMission')
        return {'settings': settings, 'scopes': self.store.all('duplicaScope'), 'agents': agents,
                'nativeAgents': list(self.native_agents.values()), 'missions': missions,
                'contexts': self.store.all('duplicaContext'), 'decisions': self.store.all('duplicaDecision'),
                'requests': [request for request in self.store.all('duplicaRequest') if request['status'] == 'pending'],
                'observations': self.store.all('duplicaObservation'), 'verifications': self.store.all('duplicaVerification'),
                'timeline': events, 'computer': self.computer.capabilities(), 'telegram': self.telegram.status(),
                'discussion': self.discussion.snapshot(),
                'counts': {'supervised': sum(agent['supervised'] for agent in agents),
                           'running': sum(agent['observedStatus'] == 'RUNNING' for agent in agents),
                           'waiting': sum(agent['observedStatus'] in ('WAITING_INPUT', 'WAITING_PERMISSION', 'WAITING_USER') for agent in agents),
                           'blocked': sum(agent['observedStatus'] in ('CRASHED', 'FAILED') for agent in agents),
                           'testing': sum(mission['status'] == 'testing' for mission in missions),
                           'completed': sum(mission['status'] == 'completed' for mission in missions)}}

    def _sync(self) -> None:
        self.memory.sync(self.store)
        self.wake.set()

    def _start_worker(self) -> None:
        if not self.worker or not self.worker.is_alive():
            self.worker = threading.Thread(target=self._run, name='duplica-supervisor', daemon=True)
            self.worker.start()
        self.wake.set()

    def _run(self) -> None:
        while not self.closed.is_set():
            self.wake.wait(1)
            self.wake.clear()
            try:
                self.tick()
            except Exception as error:
                self.event('error', {'message': redact(str(error))})
                # Stop the supervisor on an unexpected failure instead of repeating effects.
                self.control('pause')

    def close(self) -> None:
        self.closed.set()
        self.discussion.close()
        self.telegram.close()
        self.computer.cancel()
        self.verifier.cancel()
        self.bridge.closed = True
        self.wake.set()
        if self.worker and self.worker is not threading.current_thread():
            self.worker.join(timeout=3)
