"""Persistent mission queue backed by Atelier workflows and independent evidence."""
import threading
from pathlib import Path

from .duplica_verification import MissionVerifier, validate_recipe
from .prompt_format import duplica_prompt, json_markdown
from .store import now, redact, uid


LIVE = {'queued', 'running', 'waiting_plan', 'waiting_tasks', 'testing', 'correcting', 'waiting_permission'}


class DuplicaRunner:
    def __init__(self, core):
        self.core, self.app, self.store = core, core.app, core.store
        self.lock = threading.RLock()
        self.verifiers = {}
        self.threads = set()
        for run in self.store.all('duplicaRun'):
            if run['status'] in LIVE:
                self.store.update('duplicaRun', run['id'], status='interrupted',
                                  reason='Serveur redémarré ; inspecter puis relancer explicitement.')
                self.release_verification(run)

    def launch(self, changes):
        project = self.app.project(changes['projectId'])
        if changes.get('resumeRunId'):
            return self.resume(changes['resumeRunId'], project, changes)
        configuration = self.app.model_configuration(changes)
        if configuration.get('runtime', 'codex') != 'codex':
            raise ValueError('Le runner Duplica utilise Codex app-server ; choisir un modèle Codex découvert.')
        sandbox = changes.get('sandbox', 'read-only')
        if sandbox not in ('read-only', 'workspace-write'):
            raise ValueError('Choisis lecture seule ou écriture projet.')
        limits = {}
        for name, default, minimum, maximum in (('maxParallel', 4, 1, 8), ('maxTasks', 12, 1, 20), ('maxContinuations', 3, 0, 10)):
            value = changes.get(name, default)
            try:
                integer = int(value)
            except (TypeError, ValueError, OverflowError):
                raise ValueError('Limite Duplica invalide : ' + name) from None
            if isinstance(value, bool) or str(value) != str(integer) or not minimum <= integer <= maximum:
                raise ValueError('Limite Duplica invalide : ' + name)
            limits[name] = integer
        continuous = changes.get('continuous', True)
        if not isinstance(continuous, bool):
            raise ValueError('Le suivi continu doit être un booléen.')
        goal = changes.get('goal', '')
        if not isinstance(goal, str) or len(goal) > 20000:
            raise ValueError('Objectif limité à 20 000 caractères.')
        recipe = validate_recipe(changes.get('recipe', {}), project['path'])
        tasks = changes.get('tasks')
        if tasks is not None:
            from .workflow_runtime import normalize_tasks
            tasks = normalize_tasks(tasks, limits['maxTasks'], project['path'])
            if not goal.strip():
                raise ValueError('Un plan explicite nécessite un objectif.')
        with self.lock:
            if any(run['projectId'] == project['id'] and run['status'] in LIVE for run in self.snapshot()):
                raise ValueError('Une mission Duplica tourne déjà sur ce projet. Inspecte son suivi.')
            run = dict(id=uid('duplica_run'), projectId=project['id'], goal=goal.strip(), **configuration,
                       sandbox=sandbox, **limits, continuous=continuous, recipe=recipe, tasks=tasks,
                       planMode=changes.get('planMode', True) is not False, status='queued', workflowId=None,
                       taskIds=[], workflowIds=[], continuations=0, createdAt=now(), updatedAt=now(),
                       configurationId=uid('criteria'), source='user:work-for-me', grants=[], validation='UNVERIFIED')
            if run['goal']:
                task = self.app.upsert('task', {'projectId': project['id'], 'title': run['goal'][:100],
                                              'description': run['goal'], 'priority': 'high'})
                run['pendingTaskId'] = task['id']
                run['taskIds'].append(task['id'])
            self.store.put('duplicaRun', run)
            self.core.set_scope('project', project['id'], True)
            self.core.event('run_created', {'runId': run['id'], 'maxParallel': run['maxParallel'],
                                          'model': run['model'], 'effort': run['effort']})
            self._dispatch(run)
            return self.store.get('duplicaRun', run['id'])

    def resume(self, run_id, project, changes):
        with self.lock:
            run = self.store.get('duplicaRun', run_id)
            if run['projectId'] != project['id'] or run['status'] in LIVE or run['status'] == 'completed':
                raise ValueError('Choisis une mission incomplète et inactive de ce projet.')
            if any(other['id'] != run_id and other['projectId'] == project['id'] and other['status'] in LIVE for other in self.snapshot()):
                raise ValueError('Une autre équipe Duplica travaille déjà sur ce projet.')
            updates = {'reason': None, 'updatedAt': now(), 'grants': []}
            if 'recipe' in changes:
                recipe = validate_recipe(changes['recipe'], project['path'])
                updates['recipe'] = recipe
                if recipe != run['recipe']:
                    updates['configurationId'] = uid('criteria')
                    for bug in self.store.all('duplicaObservation'):
                        if bug['missionId'] == run_id and bug['status'] == 'open':
                            self.store.update('duplicaObservation', bug['id'], status='superseded',
                                              reason='Recette redéfinie explicitement par l’utilisateur.', supersededAt=now())
            for request in self.store.all('duplicaRequest'):
                if request['status'] == 'pending' and request['detail'].get('runId') == run_id:
                    self.store.update('duplicaRequest', request['id'], status='expired')
            workflow = self.store.get('workflow', run['workflowId']) if run.get('workflowId') else None
            if workflow and workflow['status'] == 'completed':
                updates['status'] = 'running'
            else:
                task = self.store.get('task', run['activeTaskId']) if run.get('activeTaskId') else None
                if task and (task['status'] != 'todo' or task.get('claimedBy')):
                    raise ValueError('La tâche a changé ou reste réservée ; inspecte son état avant reprise.')
                updates.update(status='queued', pendingTaskId=task['id'] if task else run.get('pendingTaskId'), workflowId=None)
            resumed = self.store.update('duplicaRun', run_id, **updates)
            self.core.event('run_resumed', {'runId': run_id, 'source': 'user:explicit-resume'})
            self.core.wake.set()
            return resumed

    def enabled(self, run):
        settings = self.core.settings()
        if settings['status'] != 'active':
            return False
        keys = ('project:' + run['projectId'], 'workflow:' + str(run.get('workflowId')),
                'task:' + str(run.get('activeTaskId') or run.get('pendingTaskId')))
        scopes = {scope['id']: scope['enabled'] for scope in self.store.all('duplicaScope')}
        enabled = settings['globalEnabled']
        for key in keys:
            if scopes.get(key) is not None:
                enabled = scopes[key]
        return bool(enabled)

    def reserve_verification(self, run_id, workflow):
        """Called under the queue/store locks at the team's technical completion."""
        run = self.store.get('duplicaRun', run_id)
        task_id = workflow.get('claimedTaskId')
        if (not task_id or run['status'] not in LIVE or not self.enabled(run)
                or run['projectId'] != workflow['projectId'] or run['sandbox'] != workflow['sandbox']):
            return
        task = self.store.get('task', task_id)
        if task['status'] != 'review' or task.get('claimedBy'):
            return
        self.store.update('task', task_id, claimedBy=run_id, claimedWorkspace=workflow['workingPath'])
        self.store.update('duplicaRun', run_id, verificationLeaseTaskId=task_id, verificationLeaseWorkflowId=workflow['id'],
                          verificationLeaseConfigurationId=run['configurationId'])

    def release_verification(self, run):
        with self.app.task_queue.lock, self.store.lock:
            current = self.store.get('duplicaRun', run['id'])
            task_id = current.get('verificationLeaseTaskId')
            if (current.get('verificationLeaseWorkflowId') != run.get('workflowId') or
                    current.get('verificationLeaseConfigurationId') != run.get('configurationId')):
                return
            if task_id:
                task = self.store.get('task', task_id)
                if task.get('claimedBy') == run['id']:
                    self.store.update('task', task_id, claimedBy=None, claimedWorkspace=None)
                self.store.update('duplicaRun', run['id'], verificationLeaseTaskId=None, verificationLeaseWorkflowId=None,
                                  verificationLeaseConfigurationId=None)
        self.app.task_queue.wake.set()

    def _skill(self, name):
        path = Path(self.app.root) / 'skills' / name / 'SKILL.md'
        return path.read_text(encoding='utf-8')[:5000] if path.is_file() else ''

    def _dispatch(self, run, correction=None):
        """Only claim real TODOs; an occupied checkout waits without creating agents."""
        if not self.enabled(run):
            return
        correction = correction or run.get('correctionReport')
        pending = run.get('pendingTaskId')
        tasks = [task for task in self.store.all('task') if task['projectId'] == run['projectId']
                 and task['status'] == 'todo' and not task.get('claimedBy') and not task.get('assigneeId')
                 and (not pending or task['id'] == pending) and (pending or task['id'] not in run['taskIds'])]
        tasks.sort(key=lambda task: ({'high': 0, 'medium': 1, 'low': 2}.get(task.get('priority'), 1), task.get('createdAt', '')))
        workspace = str(Path(self.app.project(run['projectId'])['path']).resolve())
        if any(task.get('claimedBy') and task.get('claimedWorkspace') and
               str(Path(task['claimedWorkspace']).resolve()) == workspace for task in self.store.all('task')):
            self.store.update('duplicaRun', run['id'], status='waiting_tasks', reason='Dossier réservé par un agent existant.')
            return
        if any(session.get('workingPath') and str(Path(session['workingPath']).resolve()) == workspace
               and not session.get('parentId') and session.get('executionMode') != 'chat'
               and session['status'] in ('initializing', 'running', 'waiting', 'waiting_plan')
               and (session.get('sandbox') == 'workspace-write' or session.get('workEnabled'))
               for session in self.store.all('session')):
            self.store.update('duplicaRun', run['id'], status='waiting_tasks', reason='Un agent existant travaille déjà dans ce dossier.')
            return
        if not tasks:
            self.store.update('duplicaRun', run['id'], status='waiting_tasks',
                              reason='Aucune tâche compatible ; attente de nouveaux TODO.')
            return
        task = tasks[0]
        goal = task.get('description') or task['title']
        mission = duplica_prompt(
            'Réalise cet objectif avec l’équipe Atelier. Inspecte l’existant et les preuves ; '
            'décompose le travail en tâches concrètes. Indique les dépendances et les fichiers attribués '
            'pour permettre le parallélisme. La plateforme lance les agents ; aucune délégation native. '
            'Teste les interactions utiles (survol, clic, libellés, fenêtres étroites) avec les outils disponibles. '
            'Conserve les choix de l’utilisateur et signale les outils ou preuves manquants.',
            [('user_request', goal), ('user_context', self.core._context_for(run['projectId'])),
             ('harness', self._skill('duplica-mission-planner') + '\n' + self._skill('duplica-work-supervisor')),
             ('observations', correction or 'Aucune correction demandée.')])
        worker = {'model': run['model'], 'effort': run['effort'], 'sandbox': run['sandbox'],
                  'instructions': self._skill('duplica-worker-handoff')[:3500]}
        payload = {'projectId': run['projectId'], 'name': 'Duplica · ' + task['title'][:80],
                   'mission': mission, 'model': run['model'], 'effort': run['effort'], 'mode': 'orchestration',
                   'sandbox': run['sandbox'], 'maxTasks': run['maxTasks'], 'planMode': run['planMode'],
                   'startWork': True, 'taskId': task['id'], 'duplicaEnabled': True,
                   'duplicaRunId': run['id'],
                   'agents': {'workers': [dict(worker, name='Duplica ' + str(index + 1)) for index in range(run['maxParallel'])],
                              'reviewer': {'model': run['model'], 'effort': run['effort'], 'instructions': self._skill('duplica-quality-loop')[:4000]},
                              'auditor': {'model': run['model'], 'effort': run['effort'], 'instructions': self._skill('duplica-quality-loop')[:4000]}}}
        if run.get('tasks') and not correction:
            payload['tasks'] = run['tasks']
        # The queue claim is authoritative; a competing request may win between observation and launch.
        try:
            workflow = self.app.workflow(payload)
        except ValueError as error:
            if 'réservé' not in str(error):
                raise
            self.store.update('duplicaRun', run['id'], status='waiting_tasks', reason=str(error))
            return
        self.store.update('duplicaRun', run['id'], workflowId=workflow['id'],
                          workflowIds=run['workflowIds'] + [workflow['id']],
                          taskIds=list(dict.fromkeys(run['taskIds'] + [task['id']])), pendingTaskId=None,
                          activeTaskId=task['id'], activeGoal=goal, tasks=None, grants=[],
                          status='correcting' if correction else 'running', reason=None, updatedAt=now(),
                          validation='UNVERIFIED', verificationId=None)
        self.store.update('duplicaRun', run['id'], correctionReport=None)
        self.core.event('run_dispatched', {'runId': run['id'], 'workflowId': workflow['id'], 'taskId': task['id']})

    def tick(self):
        if self.core.settings()['status'] != 'active':
            return
        with self.lock:
            for run in self.snapshot():
                if run['status'] in LIVE and not self.enabled(run):
                    self._stop_run(run, 'scope')
                    continue
                if run['status'] in ('queued', 'waiting_tasks'):
                    self._dispatch(run)
                    continue
                if run['status'] not in ('running', 'correcting', 'waiting_plan', 'waiting_permission') or not run.get('workflowId'):
                    continue
                workflow = self.store.get('workflow', run['workflowId'])
                if workflow['status'] == 'waiting_plan':
                    mode = self.core.settings()['permissions']['approve_plan']
                    if mode == 'auto':
                        self.app.approve_workflow_plan(workflow['id'], True)
                        self.core.event('plan_resolved', {'runId': run['id'], 'workflowId': workflow['id'], 'source': 'permissions:approve_plan'})
                        self.store.update('duplicaRun', run['id'], status='running')
                    else:
                        self.store.update('duplicaRun', run['id'], status='waiting_plan', reason='Plan à valider dans le suivi de Duplica.')
                elif workflow['status'] in ('failed', 'cancelled', 'interrupted'):
                    self.store.update('duplicaRun', run['id'], status='failed' if workflow['status'] == 'failed' else 'interrupted',
                                      reason=workflow.get('error') or 'Équipe interrompue ; aucune relance automatique.')
                elif workflow['status'] == 'completed':
                    self._verify(run, workflow)
                elif run['status'] == 'waiting_plan':
                    self.store.update('duplicaRun', run['id'], status='running', reason=None)

    def _verify(self, run, workflow):
        recipe = run['recipe']
        if not recipe['requirements'] and not recipe.get('tests') and not recipe.get('gui'):
            self.release_verification(run)
            self.store.update('duplicaRun', run['id'], status='needs_evidence',
                              reason='Fin technique : définir une recette indépendante avant validation.')
            return
        categories = ['workspace_read'] + (['run_tests'] if recipe.get('tests') else []) + (['run_build'] if recipe.get('build') else [])
        if recipe.get('application'):
            categories.append('run_local_application')
        if recipe.get('gui'):
            categories += ['computer_control', 'keyboard_mouse', 'browser_control']
        permissions = self.core.settings()['permissions']
        missing = [category for category in categories if permissions[category] != 'auto' and category not in run.get('grants', [])]
        if missing:
            self.store.update('duplicaRun', run['id'], status='waiting_permission', reason='Permissions de recette : ' + ', '.join(missing))
            sessions = [session for session in self.store.all('session') if session.get('parentId') == workflow['id']]
            if sessions:
                for category in missing:
                    self.core.request('run-permission:' + run['id'] + ':' + category, 'Autoriser la recette Duplica', sessions[0],
                                      {'runId': run['id'], 'category': category, 'mode': permissions[category],
                                       'configurationId': run['configurationId'], 'workflowId': run['workflowId'],
                                       'reason': 'Recette explicitement configurée : ' + category})
            return
        if recipe.get('gui') and self.verifiers:
            self.store.update('duplicaRun', run['id'], status='running', reason='Attente du contrôleur PC utilisé par une autre recette.')
            return
        with self.app.task_queue.lock, self.store.lock:
            current = self.store.get('duplicaRun', run['id'])
            if not current.get('verificationLeaseTaskId'):
                workspace = str(Path(workflow['workingPath']).resolve())
                if any(task.get('claimedBy') and task.get('claimedBy') != run['id'] and task.get('claimedWorkspace') and
                       str(Path(task['claimedWorkspace']).resolve()) == workspace for task in self.store.all('task')):
                    self.store.update('duplicaRun', run['id'], status='running', reason='Attente du dossier réservé avant recette.')
                    return
                self.reserve_verification(run['id'], workflow)
        session = {'id': workflow['id'], 'projectId': run['projectId'], 'workingPath': workflow['workingPath']}
        mission = {**run, 'goal': run.get('activeGoal', run['goal'])}
        verifier = MissionVerifier(self.app, self.core.computer, self.core.directory / 'reports')
        self.verifiers[run['id']] = verifier
        self.store.update('duplicaRun', run['id'], status='testing', reason=None)
        generation = self.core.generation
        worker = threading.Thread(target=self._verify_result, args=(mission, session, verifier, generation), daemon=True, name='duplica-run-verifier')
        self.threads.add(worker)
        worker.start()

    def _verify_result(self, run, session, verifier, generation):
        try:
            result = verifier.verify(run, session)
            result.update(taskId=run.get('activeTaskId'), workflowId=run['workflowId'])
            with self.lock:
                self.store.put('duplicaVerification', result)
                current = self.store.get('duplicaRun', run['id'])
                if (generation != self.core.generation or current['status'] != 'testing' or result['cancelled']
                        or current['configurationId'] != run['configurationId'] or not self.enabled(current)):
                    if current['status'] == 'testing':
                        self.store.update('duplicaRun', run['id'], status='interrupted', reason='Périmètre ou contrôle modifié pendant la recette.')
                    return
                self.release_verification(run)
                self.store.update('duplicaRun', run['id'], verificationId=result['id'], grants=[], updatedAt=now())
                if result['passed']:
                    for bug in self.store.all('duplicaObservation'):
                        if bug['missionId'] == run['id'] and bug['status'] == 'open' and bug.get('configurationId') == run['configurationId']:
                            self.store.update('duplicaObservation', bug['id'], status='resolved', retestId=result['id'], resolvedAt=now())
                    self.store.update('duplicaRun', run['id'], status='waiting_tasks' if run['continuous'] else 'completed',
                                      validation='VERIFIED', continuations=0, reason=None)
                elif any(check['status'] in ('not_run', 'cancelled') for check in result['checks']):
                    self.store.update('duplicaRun', run['id'], status='needs_evidence', reason='Contrôles non exécutés ; voir les preuves.')
                else:
                    failures = [check for check in result['checks'] if check['status'] == 'fail']
                    bug = self.core._bug(run, session, result, failures)
                    if run['continuations'] >= run['maxContinuations'] or self.core.settings()['permissions']['continue_agent'] != 'auto':
                        self.store.update('duplicaRun', run['id'], status='waiting_user', reason='Budget de correction atteint ou relance non déléguée.')
                    else:
                        task = self.store.get('task', run['activeTaskId'])
                        if task.get('claimedBy') or task['status'] != 'review':
                            self.store.update('duplicaRun', run['id'], status='waiting_user', reason='La tâche a changé ; inspecter avant correction.')
                        else:
                            self.store.update('task', task['id'], status='todo', validation='UNVERIFIED')
                            current = self.store.update('duplicaRun', run['id'], status='correcting',
                                continuations=run['continuations'] + 1, pendingTaskId=task['id'], tasks=None,
                                correctionReport=bug['report'])
                            self._dispatch(current, correction=bug['report'])
                self.core.event('run_verified', {'runId': run['id'], 'verificationId': result['id'], 'passed': result['passed']})
                self.core.wake.set()
        except Exception as error:
            with self.lock:
                if self.store.get('duplicaRun', run['id'])['status'] == 'testing':
                    self.store.update('duplicaRun', run['id'], status='failed', reason=redact(str(error)))
        finally:
            self.release_verification(run)
            if self.verifiers.get(run['id']) is verifier:
                self.verifiers.pop(run['id'], None)
            self.threads.discard(threading.current_thread())

    def control(self, action):
        if action == 'start':
            return
        with self.lock:
            for verifier in list(self.verifiers.values()):
                verifier.cancel()
            for run in self.snapshot():
                if run['status'] not in LIVE:
                    continue
                self._stop_run(run, action)

    def _stop_run(self, run, action):
        verifier = self.verifiers.get(run['id'])
        if verifier:
            verifier.cancel()
        if run.get('workflowId'):
            workflow = self.store.get('workflow', run['workflowId'])
            if workflow['status'] not in ('completed', 'failed', 'cancelled', 'interrupted'):
                self.store.update('workflow', workflow['id'], status='cancelled')
                for session in self.store.all('session'):
                    if session.get('parentId') == workflow['id'] and session['status'] in ('running', 'waiting'):
                        self.app.interrupt(session['id'])
        self.release_verification(run)
        self.store.update('duplicaRun', run['id'], status='paused' if action == 'pause' else 'interrupted',
                          reason='Périmètre retiré.' if action == 'scope' else 'Contrôle repris. Relancer explicitement depuis le travail conservé.')

    def snapshot(self):
        return self.store.all('duplicaRun')

    def close(self):
        self.control('stop')
        for worker in list(self.threads):
            worker.join(timeout=2)
