"""Bounded agent discussions that exchange public replies before planning."""
import copy
import math
import re
import threading
import time
from dataclasses import dataclass, field
from typing import Protocol

from .store import Store, now, redact, uid


class ChannelConnections(Protocol):
    def configuration(self, submitted: dict) -> dict: ...


class ChannelApplication(Protocol):
    store: Store
    api_connections: ChannelConnections

    def project(self, project_id: str) -> dict: ...
    def model_configuration(self, submitted: dict) -> dict: ...
    def channel_reply(self, participant: dict, public_messages: list[dict], purpose: str) -> dict: ...
    def upsert(self, kind: str, submitted: dict) -> dict: ...


@dataclass
class _ChannelRun:
    id: str
    cancelled: threading.Event = field(default_factory=threading.Event)
    thread: threading.Thread | None = None
    reply_workers: set[threading.Thread] = field(default_factory=set)
    finished: bool = False


class _DiscussionStopped(Exception):
    pass


MAX_CHANNELS = 100
MAX_PARTICIPANTS = 8
MAX_DISCUSSION_ROUNDS = 6
MAX_MESSAGE_CHARACTERS = 16000
MAX_HISTORY_MESSAGES = 512
MAX_HISTORY_CHARACTERS = 240000
MAX_CONTEXT_CHARACTERS = 32000
MAX_RECORDED_ROUNDS = 140
REPLY_TIMEOUT_SECONDS = 240
REPLY_POLL_SECONDS = 0.05
SHUTDOWN_JOIN_SECONDS = 2
PARTICIPANT_ROLES = frozenset(('agent', 'consultant', 'orchestrator', 'duplica'))
CONFIGURATION_FIELDS = frozenset(('runtime', 'provider', 'model', 'effort', 'connectionId', 'protocol'))
PUBLIC_MESSAGE_FIELDS = ('id', 'channelId', 'participantId', 'author', 'role', 'text', 'createdAt', 'roundId', 'sequence')
PRIVATE_TEXT = re.compile(
    r'</?(?:analysis|think|thinking|reasoning|tool_call|tool_result|function_call)(?:\s[^>]*)?>'
    r'|<\|(?:channel|im_start|im_sep)\|>'
    r'|["\'](?:analysis|reasoning|thinking|tool_calls|tool_results)["\']\s*:'
    r'|["\'](?:role|channel)["\']\s*:\s*["\'](?:analysis|tool|function)["\']',
    re.IGNORECASE,
)


class ChannelHub:
    def __init__(self, app: ChannelApplication) -> None:
        self.app, self.store = app, app.store
        self.lock = threading.RLock()
        self.workers: set[threading.Thread] = set()
        self._runs: dict[str, _ChannelRun] = {}
        self.closed = False
        # Restart never replays a provider request, including an unfinished plan.
        with self.lock:
            for channel in self.store.all('channel'):
                if channel.get('status') == 'running':
                    channel.update(status='interrupted', runId=None,
                                   error='Serveur redémarré ; reprise explicite nécessaire.')
                    for round_record in channel['rounds']:
                        if round_record['status'] == 'running':
                            round_record.update(status='interrupted', completedAt=now(),
                                                error=channel['error'])
                    self._save(channel)

    def snapshot(self) -> dict:
        with self.lock:
            channels = self.store.all('channel')
            snapshot = {
                'channels': [self._summary(channel) for channel in channels],
                'participants': [participant for channel in channels for participant in channel['participants']],
                'messages': [message for channel in channels for message in channel['messages']],
                'rounds': [round_record for channel in channels for round_record in channel['rounds']],
            }
            return snapshot

    def create(self, submitted: dict) -> dict:
        _check_fields(submitted, {'projectId', 'name', 'topic', 'maxRounds'})
        project_id = _identifier(submitted.get('projectId', 'atelier'), 'Projet')
        project = self.app.project(project_id)
        name = _public_text(submitted.get('name', 'Discussion d’agents'), 100, 'Nom')
        topic = _public_text(submitted.get('topic'), MAX_MESSAGE_CHARACTERS, 'Sujet')
        max_rounds = submitted.get('maxRounds', 2)
        if type(max_rounds) is not int or not 1 <= max_rounds <= MAX_DISCUSSION_ROUNDS:
            raise ValueError('Choisis entre 1 et 6 tours de discussion.')
        with self.lock:
            self._require_open()
            if len(self.store.all('channel')) >= MAX_CHANNELS:
                raise ValueError('La limite de 100 canaux est atteinte.')
            channel = {
                'id': uid('channel'), 'projectId': project['id'], 'name': name, 'topic': topic,
                'maxRounds': max_rounds, 'status': 'draft', 'sequence': 0, 'runCount': 0,
                'runId': None, 'plan': None, 'planParticipantId': None, 'preparedTaskId': None, 'error': None,
                'createdAt': now(), 'participants': [], 'messages': [], 'rounds': [],
            }
            self._save(channel)
            self._event('channel.created', channel)
            return self._summary(channel)

    def add_participant(self, channel_id: str, submitted: dict) -> dict:
        _check_fields(submitted, {'name', 'role', 'sessionId', 'configuration', 'sandbox', 'memory', 'workEnabled'}
                      | CONFIGURATION_FIELDS)
        with self.lock:
            channel = self._editable(channel_id)
            channel_id = channel['id']
            if len(channel['participants']) >= MAX_PARTICIPANTS:
                raise ValueError('Un canal accepte au maximum 8 participants.')
            role = submitted.get('role', 'agent')
            if not isinstance(role, str) or role not in PARTICIPANT_ROLES:
                raise ValueError('Rôle de participant invalide.')
            if submitted.get('sandbox', 'read-only') != 'read-only':
                raise ValueError('Les discussions restent en lecture seule.')
            if submitted.get('memory', False) is not False or submitted.get('workEnabled', False) is not False:
                raise ValueError('Les discussions n’activent ni mémoire privée ni travail.')
            configuration, source = self._configuration(channel, submitted)
            if configuration.get('protocol') == 'systemone' and role != 'consultant':
                raise ValueError('Un modèle SystemOne peut uniquement être consultant.')
            default_name = source.get('name') if source else role.capitalize()
            participant = {
                'id': uid('participant'), 'channelId': channel_id, 'projectId': channel['projectId'],
                'name': _public_text(submitted.get('name', default_name), 100, 'Nom'),
                'role': role, 'configuration': configuration, 'sandbox': 'read-only',
                'memory': False, 'workEnabled': False, 'createdAt': now(),
            }
            if source:
                participant['sourceSessionId'] = source['id']
            channel['participants'].append(participant)
            channel.update(status='draft', plan=None, planParticipantId=None, preparedTaskId=None, error=None)
            self._save(channel)
            self._event('channel.participant_added', channel, participantId=participant['id'])
            return copy.deepcopy(participant)

    def remove_participant(self, channel_id: str, participant_id: str) -> dict:
        participant_id = _identifier(participant_id, 'Participant')
        with self.lock:
            channel = self._editable(channel_id)
            if not any(participant['id'] == participant_id for participant in channel['participants']):
                raise ValueError('Participant introuvable dans ce canal.')
            channel['participants'] = [participant for participant in channel['participants']
                                       if participant['id'] != participant_id]
            channel.update(status='draft', plan=None, planParticipantId=None, preparedTaskId=None, error=None)
            self._save(channel)
            self._event('channel.participant_removed', channel, participantId=participant_id)
            return {'ok': True, 'participantId': participant_id}

    def post_message(self, channel_id: str, submitted: dict) -> dict:
        _check_fields(submitted, {'text'})
        text = _public_text(submitted.get('text'), MAX_MESSAGE_CHARACTERS, 'Message public')
        with self.lock:
            channel = self._editable(channel_id)
            _check_history_capacity(channel, [text])
            message = self._message(channel, text)
            channel['messages'].append(message)
            channel.update(status='draft', plan=None, planParticipantId=None, preparedTaskId=None, error=None)
            self._save(channel)
            self._event('channel.user_message', channel, messageId=message['id'])
            return copy.deepcopy(message)

    def prepare_task(self, channel_id: str) -> dict:
        with self.lock:
            channel = self._editable(channel_id)
            channel_id = channel['id']
            if channel['status'] != 'ready_for_review' or not channel.get('plan'):
                raise ValueError('Le canal doit avoir un plan prêt à relire.')
            plan_round = next(record for record in reversed(channel['rounds'])
                              if record['purpose'] == 'plan' and record['status'] == 'completed')
            existing_id = plan_round.get('preparedTaskId') or channel.get('preparedTaskId')
            if existing_id:
                return self.store.get('task', existing_id)
            # Provenance also recovers a task created just before a server interruption.
            task = next((task for task in self.store.all('task')
                         if task.get('channelId') == channel_id and task.get('channelPlanRoundId') == plan_round['id']), None)
            if not task:
                task = self.app.upsert('task', {
                    'projectId': channel['projectId'], 'title': 'Plan · ' + channel['name'],
                    'description': channel['topic'] + '\n\n' + channel['plan'], 'status': 'review',
                    'channelId': channel_id, 'channelPlanRoundId': plan_round['id'],
                })
            channel['preparedTaskId'] = plan_round['preparedTaskId'] = task['id']
            self._save(channel)
            self._event('channel.task_prepared', channel, taskId=task['id'], roundId=plan_round['id'])
            return copy.deepcopy(task)

    def start(self, channel_id: str) -> dict:
        with self.lock:
            channel = self._editable(channel_id)
            channel_id = channel['id']
            if not channel['participants']:
                raise ValueError('Ajoute au moins un participant au canal.')
            planner = _select_planner(channel['participants'])
            if not planner:
                raise ValueError('Ajoute un agent, un orchestrateur ou Duplica pour construire le plan.')
            required_rounds = channel['maxRounds'] + 1
            if len(channel['rounds']) + required_rounds > MAX_RECORDED_ROUNDS:
                raise ValueError('Historique des tours rempli ; crée un nouveau canal.')
            _check_history_capacity(channel, [''] * (len(channel['participants']) * channel['maxRounds'] + 1))
            run = _ChannelRun(uid('channel_run'))
            channel.update(status='running', runId=run.id, runCount=channel['runCount'] + 1,
                           plan=None, planParticipantId=planner['id'], preparedTaskId=None,
                           error=None, cancellationError=None, startedAt=now())
            self._save(channel)
            self._runs[channel_id] = run
            run.thread = threading.Thread(target=self._run, args=(channel_id, run), daemon=True,
                                          name='channel-' + channel_id)
            self.workers.add(run.thread)
            self._event('channel.started', channel, runId=run.id)
            try:
                run.thread.start()
            except Exception as error:
                run.cancelled.set()
                self.workers.discard(run.thread)
                self._runs.pop(channel_id)
                channel.update(status='failed', runId=None, error=_public_error(error), completedAt=now())
                self._save(channel)
                raise ValueError('Le traitement du canal n’a pas pu démarrer.') from error
            return self._summary(channel)

    def stop(self, channel_id: str) -> dict:
        channel_id = _identifier(channel_id, 'Canal')
        with self.lock:
            self._require_open()
            channel = self.store.get('channel', channel_id)
            run = self._runs.get(channel_id)
            if not run or channel['status'] != 'running':
                raise ValueError('Aucune discussion active à interrompre.')
            run.cancelled.set()
            channel.update(status='stopped', runId=None, stoppedAt=now(),
                           error='Discussion interrompue ; reprise explicite nécessaire.')
            self._interrupt_rounds(channel, 'stopped')
            self._save(channel)
            self._event('channel.stopped', channel)
            summary = self._summary(channel)
        self._cancel_provider(channel_id)
        return summary

    def close(self) -> None:
        with self.lock:
            if self.closed:
                return
            self.closed = True
            active_ids = list(self._runs)
            workers = set(self.workers)
            for channel_id, run in self._runs.items():
                run.cancelled.set()
                workers.update(run.reply_workers)
                channel = self.store.get('channel', channel_id)
                if channel['status'] == 'running':
                    channel.update(status='interrupted', runId=None,
                                   error='Serveur arrêté ; reprise explicite nécessaire.')
                    self._interrupt_rounds(channel, 'interrupted')
                    self._save(channel)
        for channel_id in active_ids:
            self._cancel_provider(channel_id)
        deadline = time.monotonic() + SHUTDOWN_JOIN_SECONDS
        for worker in workers:
            if worker is not threading.current_thread():
                worker.join(timeout=max(0, deadline - time.monotonic()))

    def _run(self, channel_id: str, run: _ChannelRun) -> None:
        try:
            with self.lock:
                channel = self._active_channel(channel_id, run)
                participants = copy.deepcopy(channel['participants'])
                max_rounds = channel['maxRounds']
                planner = _select_planner(participants)
            for number in range(1, max_rounds + 1):
                self._round(channel_id, run, participants, number, 'discussion')
            self._round(channel_id, run, [planner], max_rounds + 1, 'plan')
        except _DiscussionStopped:
            pass
        except Exception as error:
            with self.lock:
                if self._is_active(channel_id, run):
                    channel = self.store.get('channel', channel_id)
                    message = _public_error(error)
                    channel.update(status='failed', runId=None, error=message, completedAt=now())
                    for round_record in channel['rounds']:
                        if round_record['runId'] == run.id and round_record['status'] == 'running':
                            round_record.update(status='failed', error=message, completedAt=now())
                    self._save(channel)
                    self._event('channel.failed', channel)
            run.cancelled.set()
            self._cancel_provider(channel_id)
        finally:
            with self.lock:
                run.finished = True
                self.workers.discard(threading.current_thread())
                self._release_finished_run(channel_id, run)

    def _round(self, channel_id: str, run: _ChannelRun, participants: list[dict], number: int,
               purpose: str) -> None:
        with self.lock:
            channel = self._active_channel(channel_id, run)
            public_messages = _public_messages(channel['messages'])
            round_record = {
                'id': uid('channel_round'), 'channelId': channel_id, 'runId': run.id,
                'number': number, 'purpose': purpose, 'status': 'running', 'startedAt': now(),
                'participantIds': [participant['id'] for participant in participants],
                'snapshotSequence': channel['sequence'],
                'contextMessageIds': [message['id'] for message in public_messages],
                'messageIds': [], 'error': None,
            }
            channel['rounds'].append(round_record)
            self._save(channel)
            topic = channel['topic']
        replies = self._collect_replies(channel_id, run, participants, public_messages, topic, purpose)
        with self.lock:
            channel = self._active_channel(channel_id, run)
            _check_history_capacity(channel, [reply['text'] for reply in replies])
            round_record = next(record for record in channel['rounds'] if record['id'] == round_record['id'])
            for participant, reply in zip(participants, replies):
                message = self._message(channel, reply['text'], participant, round_record['id'])
                for key in ('usage', 'sessionId'):
                    if key in reply:
                        message[key] = reply[key]
                channel['messages'].append(message)
                round_record['messageIds'].append(message['id'])
            round_record.update(status='completed', completedAt=now())
            if purpose == 'plan':
                channel.update(status='ready_for_review', runId=None, completedAt=now(),
                               plan=replies[0]['text'], planParticipantId=participants[0]['id'])
            self._save(channel)
            self._event('channel.plan_ready' if purpose == 'plan' else 'channel.round_completed',
                        channel, roundId=round_record['id'])

    def _collect_replies(self, channel_id: str, run: _ChannelRun, participants: list[dict],
                         public_messages: list[dict], topic: str, purpose: str) -> list[dict]:
        condition = threading.Condition()
        results: dict[str, tuple[dict | None, str | None]] = {}

        def request_reply(participant: dict) -> None:
            reply, error_message = None, None
            try:
                with self.lock:
                    self._active_channel(channel_id, run)
                # Each provider gets a separate copy; callback mutations cannot reach peers.
                public_participant = {key: copy.deepcopy(value) for key, value in participant.items()
                                      if key != 'sourceSessionId'}
                public_participant.update(topic=topic, runId=run.id)
                response = self.app.channel_reply(public_participant, copy.deepcopy(public_messages), purpose)
                reply = _public_reply(response, participant.get('sourceSessionId'))
            except _DiscussionStopped:
                error_message = 'Discussion interrompue.'
            except Exception as error:
                error_message = _public_error(error)
            finally:
                with condition:
                    results[participant['id']] = (reply, error_message)
                    condition.notify_all()
                with self.lock:
                    run.reply_workers.discard(threading.current_thread())
                    self._release_finished_run(channel_id, run)

        for participant in participants:
            with self.lock:
                self._active_channel(channel_id, run)
                worker = threading.Thread(target=request_reply, args=(participant,), daemon=True,
                                          name='channel-reply-' + participant['id'])
                run.reply_workers.add(worker)
                try:
                    worker.start()
                except Exception:
                    run.reply_workers.discard(worker)
                    raise
        deadline = time.monotonic() + REPLY_TIMEOUT_SECONDS
        with condition:
            while True:
                if run.cancelled.is_set() or self.closed:
                    raise _DiscussionStopped()
                failures = [participant['name'] + ' : ' + results[participant['id']][1]
                            for participant in participants if participant['id'] in results and results[participant['id']][1]]
                if failures:
                    raise ValueError('Tour en échec. ' + ' ; '.join(failures))
                if len(results) == len(participants):
                    break
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise ValueError('Délai du tour dépassé ; interruption et reprise explicite nécessaires.')
                condition.wait(timeout=min(REPLY_POLL_SECONDS, remaining))
        if run.cancelled.is_set() or self.closed:
            raise _DiscussionStopped()
        return [results[participant['id']][0] for participant in participants]

    def _configuration(self, channel: dict, submitted: dict) -> tuple[dict, dict | None]:
        source = None
        if submitted.get('sessionId') is not None:
            if 'configuration' in submitted or CONFIGURATION_FIELDS.intersection(submitted):
                raise ValueError('Clone une session ou choisis une configuration, pas les deux.')
            source = self.store.get('session', _identifier(submitted['sessionId'], 'Session'))
            if source.get('projectId') != channel['projectId']:
                raise ValueError('La session à cloner doit appartenir au même projet.')
            configuration = {key: source[key] for key in CONFIGURATION_FIELDS if key in source}
        else:
            configuration = submitted.get('configuration', {})
            _check_fields(configuration, CONFIGURATION_FIELDS)
            if 'configuration' in submitted and CONFIGURATION_FIELDS.intersection(submitted):
                raise ValueError('Choisis une seule source de configuration.')
            configuration = dict(configuration or {key: submitted[key] for key in CONFIGURATION_FIELDS if key in submitted})
        runtime = configuration.get('runtime', 'codex')
        if not isinstance(runtime, str) or runtime not in ('codex', 'omp', 'api'):
            raise ValueError('Moteur de discussion non pris en charge.')
        validator = self.app.api_connections.configuration if runtime == 'api' else self.app.model_configuration
        validated = validator(configuration)
        if not isinstance(validated, dict) or validated.get('runtime') != runtime:
            raise ValueError('Configuration du fournisseur invalide.')
        public_configuration = {key: validated[key] for key in CONFIGURATION_FIELDS if key in validated}
        for key in ('model', 'provider', 'effort'):
            public_configuration[key] = _identifier(public_configuration.get(key), key.capitalize(), 512)
        if runtime == 'api':
            public_configuration['connectionId'] = _identifier(public_configuration.get('connectionId'), 'Connexion')
            if public_configuration.get('protocol') not in ('openai', 'systemone'):
                raise ValueError('Protocole de discussion non pris en charge.')
        elif 'connectionId' in public_configuration or 'protocol' in public_configuration:
            raise ValueError('Une configuration native ne possède pas de connexion API.')
        return public_configuration, source

    def _editable(self, channel_id: str) -> dict:
        self._require_open()
        channel_id = _identifier(channel_id, 'Canal')
        channel = self.store.get('channel', channel_id)
        if channel_id in self._runs and channel['status'] != 'running':
            raise ValueError('Arrêt en cours : attends la fin de l’appel fournisseur avant de reprendre ou modifier le canal.')
        if channel_id in self._runs or channel['status'] == 'running':
            raise ValueError('La discussion répond encore ; attends ou interromps le canal.')
        return channel

    def _summary(self, channel: dict) -> dict:
        summary = _channel_summary(channel)
        run = self._runs.get(channel['id'])
        summary['isStopping'] = bool(run and run.cancelled.is_set())
        return summary

    def _require_open(self) -> None:
        if self.closed:
            raise ValueError('Les canaux sont fermés.')

    def _is_active(self, channel_id: str, run: _ChannelRun) -> bool:
        if self.closed or run.cancelled.is_set() or self._runs.get(channel_id) is not run:
            return False
        channel = self.store.get('channel', channel_id)
        return channel['status'] == 'running' and channel.get('runId') == run.id

    def _active_channel(self, channel_id: str, run: _ChannelRun) -> dict:
        if not self._is_active(channel_id, run):
            raise _DiscussionStopped()
        return self.store.get('channel', channel_id)

    def _release_finished_run(self, channel_id: str, run: _ChannelRun) -> None:
        if run.finished and not run.reply_workers and self._runs.get(channel_id) is run:
            self._runs.pop(channel_id)

    def _cancel_provider(self, channel_id: str) -> None:
        callback = getattr(self.app, 'channel_cancel', None)
        if callback:
            try:
                callback(channel_id)
            except Exception as error:
                # Cancellation failure is observable, but cannot reactivate stale replies.
                with self.lock:
                    if self.closed:
                        return
                    channel = self.store.get('channel', channel_id)
                    channel['cancellationError'] = _public_error(error)
                    self._save(channel)

    def _interrupt_rounds(self, channel: dict, status: str) -> None:
        for round_record in channel['rounds']:
            if round_record['status'] == 'running':
                round_record.update(status=status, error=channel['error'], completedAt=now())

    def _save(self, channel: dict) -> None:
        channel['updatedAt'] = now()
        self.store.put('channel', channel)

    def _event(self, event_type: str, channel: dict, **details) -> None:
        self.store.event(event_type, {'channelId': channel['id'], **details}, project_id=channel['projectId'])

    def _message(self, channel: dict, text: str, participant: dict | None = None,
                 round_id: str | None = None) -> dict:
        channel['sequence'] += 1
        message = {
            'id': uid('channel_message'), 'channelId': channel['id'],
            'participantId': participant['id'] if participant else None,
            'author': participant['name'] if participant else 'Utilisateur',
            'role': participant['role'] if participant else 'user',
            'text': text, 'createdAt': now(), 'roundId': round_id, 'sequence': channel['sequence'],
        }
        return message


def _channel_summary(channel: dict) -> dict:
    return copy.deepcopy({key: value for key, value in channel.items() if key not in ('participants', 'messages', 'rounds')})


def _select_planner(participants: list[dict]) -> dict | None:
    candidates = [participant for participant in participants
                  if participant['role'] != 'consultant' and participant['configuration'].get('protocol') != 'systemone']
    return next((participant for participant in candidates if participant['role'] in ('orchestrator', 'duplica')),
                candidates[0] if candidates else None)


def _check_fields(submitted: object, allowed: set | frozenset) -> None:
    if not isinstance(submitted, dict) or any(key not in allowed for key in submitted):
        raise ValueError('Champs de discussion invalides ; seuls les champs publics déclarés sont acceptés.')


def _public_text(text: object, limit: int, label: str) -> str:
    if not isinstance(text, str) or not text.strip() or len(text) > limit:
        raise ValueError(label + ' : texte de 1 à ' + str(limit) + ' caractères requis.')
    if any(ord(character) < 32 and character not in '\n\r\t' for character in text) or PRIVATE_TEXT.search(text):
        raise ValueError(label + ' : les pensées privées et les appels d’outils ne sont pas des messages publics.')
    return redact(text.strip())


def _identifier(identifier: object, label: str, limit: int = 200) -> str:
    if not isinstance(identifier, str) or not identifier.strip() or len(identifier) > limit:
        raise ValueError(label + ' invalide.')
    if any(ord(character) < 32 for character in identifier):
        raise ValueError(label + ' invalide.')
    return identifier.strip()


def _check_history_capacity(channel: dict, texts: list[str]) -> None:
    size = sum(len(message['text']) for message in channel['messages']) + sum(len(text) for text in texts)
    if len(channel['messages']) + len(texts) > MAX_HISTORY_MESSAGES or size > MAX_HISTORY_CHARACTERS:
        raise ValueError('Historique public rempli ; crée un nouveau canal pour continuer.')


def _public_messages(messages: list[dict]) -> list[dict]:
    selected, size = [], 0
    for message in reversed(messages):
        if size + len(message['text']) > MAX_CONTEXT_CHARACTERS:
            break
        selected.append({key: copy.deepcopy(message[key]) for key in PUBLIC_MESSAGE_FIELDS})
        size += len(message['text'])
    return list(reversed(selected))


def _public_reply(response: object, source_session_id: str | None) -> dict:
    if not isinstance(response, dict):
        raise ValueError('Le fournisseur doit retourner une réponse publique structurée.')
    reply = {'text': _public_text(response.get('text'), MAX_MESSAGE_CHARACTERS, 'Réponse publique')}
    if response.get('sessionId') is not None:
        session_id = _identifier(response['sessionId'], 'Session de discussion')
        if session_id == source_session_id:
            raise ValueError('Une discussion ne peut pas réutiliser la session de travail clonée.')
        reply['sessionId'] = session_id
    if response.get('usage') is not None:
        usage = response['usage']
        if not isinstance(usage, dict):
            raise ValueError('Consommation du fournisseur invalide.')
        reply['usage'] = {
            key: amount for key, amount in usage.items()
            if key in ('inputTokens', 'outputTokens', 'totalTokens', 'cachedInputTokens', 'reasoningOutputTokens')
            and isinstance(amount, (int, float)) and not isinstance(amount, bool)
            and 0 <= amount <= 2 ** 63 - 1 and math.isfinite(amount)
        }
    return reply


def _public_error(error: Exception) -> str:
    message = str(error)
    if PRIVATE_TEXT.search(message):
        return 'Échec du fournisseur ; détails non publics masqués.'
    return redact(message[:1600]) or 'Le fournisseur n’a pas produit de réponse publique.'
