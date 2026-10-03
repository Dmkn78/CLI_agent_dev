"""Opt-in private Telegram relay and short-lived pairing with the local workspace."""
import json
import os
import re
import secrets
import time
import threading
import urllib.error
import urllib.request

from .store import now, redact
from .telegram_vault import load_token, save_token
from .prompt_format import duplica_prompt


IMPORTANT_EVENTS = {'user_required', 'bug_observed', 'agent_continued', 'verification_finished',
                    'task_completed', 'recovery', 'error', 'start'}
PAIRING_SECONDS = 300


class TelegramRelay:
    def __init__(self, duplica, transport=None) -> None:
        self.duplica = duplica
        self.transport = transport or self._request
        self.closed = threading.Event()
        self.thread = None
        self.connection = None
        self.connection_lock = threading.RLock()
        self.disconnecting = False
        self.last_error = None
        self.last_poll_at = None
        self.vault = duplica.directory / 'telegram-token.bin'
        if self.vault.is_file() and not os.environ.get('DUPLICA_TELEGRAM_BOT_TOKEN'):
            try:
                os.environ['DUPLICA_TELEGRAM_BOT_TOKEN'] = load_token(self.vault)
                os.environ['DUPLICA_TELEGRAM_CHAT_ID'] = duplica.settings().get('telegramChatId', '')
            except ValueError:
                pass

    def status(self) -> dict:
        settings = self.duplica.settings()
        return {'enabled': settings.get('telegramEnabled', False),
                'configured': bool(os.environ.get('DUPLICA_TELEGRAM_BOT_TOKEN') and os.environ.get('DUPLICA_TELEGRAM_CHAT_ID')),
                'running': bool(self.thread and self.thread.is_alive()),
                'botUsername': settings.get('telegramBotUsername'),
                'projectId': settings.get('telegramProjectId'),
                'workSandbox': settings.get('telegramWorkSandbox', 'read-only'),
                'workModel': settings.get('telegramWorkModel', ''),
                'lastError': self.last_error, 'lastPollAt': self.last_poll_at,
                'pairingPending': bool(self.connection), 'disconnecting': self.disconnecting}

    def connect(self, changes: dict) -> dict:
        with self.connection_lock:
            return self._connect(changes)

    def _connect(self, changes: dict) -> dict:
        if self.status()['running'] or self.status()['configured'] or self.disconnecting:
            raise ValueError('Dissocie le bot actuel avant d’en connecter un autre.')
        token = changes.get('botToken', '')
        if not isinstance(token, str) or not re.fullmatch(r'\d+:[A-Za-z0-9_-]{20,}', token):
            raise ValueError('Entre le token fourni par BotFather.')
        project = self.duplica.app.project(changes.get('projectId', 'atelier'))
        self.connection = {'token': token, 'projectId': project['id']}
        try:
            bot = self.transport('getMe', {})
            if not isinstance(bot.get('username'), str) or not re.fullmatch(r'[A-Za-z0-9_]{5,32}', bot['username']):
                raise ValueError('Identité du bot invalide.')
            webhook = self.transport('getWebhookInfo', {})
        except Exception:
            self.connection = None
            raise ValueError('Le bot ne répond pas. Vérifie son token et la connexion.') from None
        if isinstance(webhook, dict) and webhook.get('url'):
            self.connection = None
            raise ValueError('Ce bot est déjà relié à un autre service par webhook. Crée un bot dédié dans BotFather.')
        self.connection['username'] = bot['username']
        self.connection['offset'] = (self.duplica.settings().get('telegramOffset', 0)
            if bot['username'] == self.duplica.settings().get('telegramBotUsername') else 0)
        self.last_error = None
        return self.renew()

    def renew(self) -> dict:
        with self.connection_lock:
            if not self.connection:
                raise ValueError('Entre le token du bot pour commencer l’association.')
            self.connection.update(code=secrets.token_urlsafe(24), id=secrets.token_urlsafe(16),
                                   expires=time.monotonic() + PAIRING_SECONDS)
            return {'botUsername': self.connection['username'], 'pairingCode': self.connection['code'],
                    'pairingId': self.connection['id'], 'projectId': self.connection['projectId'],
                    'expiresAt': int((time.time() + PAIRING_SECONDS) * 1000),
                    'deepLink': 'https://t.me/' + self.connection['username'] + '?start=' + self.connection['code']}

    def cancel_pairing(self) -> dict:
        with self.connection_lock:
            self.connection = None
        return {'cancelled': True}

    def pair(self, changes: dict = None) -> dict:
        with self.connection_lock:
            result = self._pair(changes or {})
        if result['connected']:
            self.start()
        return result

    def _pair(self, changes: dict) -> dict:
        connection = self.connection
        if not connection:
            raise ValueError('Association terminée ou annulée.')
        if changes.get('pairingId', connection['id']) != connection['id']:
            raise ValueError('Ce QR code a été remplacé. Utilise le nouveau code.')
        if time.monotonic() > connection['expires']:
            return {'connected': False, 'expired': True}
        updates = self.transport('getUpdates', {'timeout': 0, 'allowed_updates': ['message'],
                                 'offset': connection['offset']})
        if time.monotonic() > connection['expires']:
            return {'connected': False, 'expired': True}
        for update in updates:
            if update['update_id'] < connection['offset']:
                continue
            message = update.get('message', {})
            chat, sender = message.get('chat', {}), message.get('from', {})
            if (chat.get('type') == 'private' and chat.get('id') == sender.get('id') and
                    isinstance(message.get('text'), str) and
                    secrets.compare_digest(message['text'].strip().encode(), ('/start ' + connection['code']).encode())):
                save_token(self.vault, connection['token'])
                os.environ['DUPLICA_TELEGRAM_BOT_TOKEN'] = connection['token']
                os.environ['DUPLICA_TELEGRAM_CHAT_ID'] = str(chat['id'])
                self.duplica.store.update('duplicaSettings', 'global', telegramChatId=str(chat['id']),
                    telegramProjectId=connection['projectId'], telegramBotUsername=connection['username'],
                    telegramEnabled=True, telegramWorkSandbox='read-only', telegramWorkModel='',
                    telegramSessionId=None, telegramSteering=None, telegramPairedAt=now(),
                    telegramOffset=update['update_id'] + 1)
                self.connection = None
                self.last_error = None
                return {'connected': True}
        if updates:
            connection['offset'] = max(entry['update_id'] for entry in updates) + 1
        return {'connected': False}

    def configure(self, changes: dict) -> dict:
        with self.connection_lock:
            if not self.status()['configured'] or self.disconnecting:
                raise ValueError('Associe d’abord ton compte Telegram.')
            updated = {}
            if 'projectId' in changes:
                updated['telegramProjectId'] = self.duplica.app.project(changes['projectId'])['id']
                if updated['telegramProjectId'] != self.duplica.settings().get('telegramProjectId'):
                    updated.update(telegramSessionId=None, telegramWorkSandbox='read-only')
            if 'workSandbox' in changes:
                if changes['workSandbox'] not in ('read-only', 'workspace-write'):
                    raise ValueError('Choisis lecture seule ou écriture dans le projet.')
                updated['telegramWorkSandbox'] = changes['workSandbox']
            if 'workModel' in changes:
                model = changes['workModel']
                if model and not any(entry['model'] == model for entry in self.duplica.app.provider.get('models', [])):
                    raise ValueError('Choisis un modèle du catalogue Codex.')
                updated['telegramWorkModel'] = model
            if 'enabled' in changes:
                if not isinstance(changes['enabled'], bool):
                    raise ValueError('Activation Telegram invalide.')
                updated['telegramEnabled'] = changes['enabled']
            self.duplica.store.update('duplicaSettings', 'global', **updated)
        if changes.get('enabled'):
            self.start()
        return self.status()

    def disconnect(self) -> dict:
        with self.connection_lock:
            if self.disconnecting:
                raise ValueError('La dissociation est déjà en cours.')
            self.disconnecting = True
            self.connection = None
            self.duplica.store.update('duplicaSettings', 'global', telegramEnabled=False)
            worker = self.thread
        try:
            if worker and worker.is_alive():
                worker.join(timeout=16)
                if worker.is_alive():
                    raise ValueError('Le relais termine sa requête. Réessaie la dissociation dans quelques secondes.')
            with self.connection_lock:
                self.vault.unlink(missing_ok=True)
                os.environ.pop('DUPLICA_TELEGRAM_BOT_TOKEN', None)
                os.environ.pop('DUPLICA_TELEGRAM_CHAT_ID', None)
                self.duplica.store.update('duplicaSettings', 'global', telegramChatId='', telegramBotUsername=None,
                    telegramProjectId=None, telegramOffset=0, telegramSessionId=None, telegramSteering=None,
                    telegramWorkSandbox='read-only', telegramWorkModel='')
                for message in self.duplica.store.all('duplicaTelegram'):
                    if message['status'] in ('pending', 'sending'):
                        self.duplica.store.update('duplicaTelegram', message['id'], status='cancelled')
                self.last_error = self.last_poll_at = None
        finally:
            with self.connection_lock:
                self.disconnecting = False
        return self.status()

    def enqueue_reply(self, delivery_id: str, text: str, recipient: dict = None) -> None:
        with self.connection_lock:
            current_recipient = self.recipient()
            if self.status()['enabled'] and (recipient is None or recipient == current_recipient):
                self.duplica.store.put('duplicaTelegram', {'id': 'reply:' + delivery_id, 'text': redact(text),
                    'recipient': current_recipient, 'status': 'pending', 'createdAt': now()})

    def recipient(self) -> dict:
        return {'chatId': os.environ.get('DUPLICA_TELEGRAM_CHAT_ID', ''),
                'botUsername': self.duplica.settings().get('telegramBotUsername')}

    def start(self) -> None:
        with self.connection_lock:
            if (not self.connection and not self.disconnecting and not self.closed.is_set() and
                    self.status()['enabled'] and self.status()['configured'] and not self.status()['running']):
                self.thread = threading.Thread(target=self._run, name='duplica-telegram', daemon=True)
                self.thread.start()

    def enqueue(self, event: dict) -> None:
        if not self.status()['enabled'] or event['type'].removeprefix('duplica.') not in IMPORTANT_EVENTS:
            return
        title = event['data'].get('title') or event['type'].removeprefix('duplica.')
        detail = event['data'].get('detail', {})
        text = 'Duplica · ' + title + '\n' + json.dumps(event['data'], ensure_ascii=False)[:2800]
        markup = None
        request_id = event['data'].get('requestId')
        if request_id and detail.get('approvalId'):
            approval = next((approval for approval in self.duplica.store.all('approval') if approval['id'] == detail['approvalId']), None)
            if approval and approval['method'] != 'item/tool/requestUserInput':
                markup = {'inline_keyboard': [[{'text': 'Autoriser', 'callback_data': 'approve:' + request_id},
                                                {'text': 'Refuser', 'callback_data': 'deny:' + request_id}]]}
        self.duplica.store.put('duplicaTelegram', {'id': event['id'], 'text': redact(text), 'markup': markup,
                'recipient': self.recipient(), 'status': 'pending', 'createdAt': now()})

    def handle_update(self, update: dict) -> str:
        callback = update.get('callback_query')
        message = callback.get('message', {}) if callback else update.get('message', {})
        sender = callback.get('from', {}) if callback else message.get('from', {})
        allowed_chat = os.environ.get('DUPLICA_TELEGRAM_CHAT_ID', '')
        if message.get('chat', {}).get('type') != 'private' or str(message.get('chat', {}).get('id')) != allowed_chat or str(sender.get('id')) != allowed_chat:
            return 'ignored'
        raw = message.get('text', '').strip()
        if callback:
            command, _, argument = str(callback.get('data', '')).partition(':')
            raw = '/' + command + ' ' + argument
        command, _, arguments = raw.partition(' ')
        command = command.split('@', 1)[0].casefold()
        core = self.duplica
        if command == '/status':
            snapshot = core.snapshot()
            return 'Duplica : ' + snapshot['settings']['status'] + '\n' + json.dumps(snapshot['counts'], ensure_ascii=False)
        if command == '/project':
            if arguments:
                project = core.app.project(arguments.strip())
                self.configure({'projectId': project['id']})
                return 'Discussion Duplica · ' + project['name']
            return 'Choisis le projet :\n' + '\n'.join('/project ' + project['id'] + ' · ' + project['name'] for project in core.store.all('project'))
        if command == '/work':
            settings = core.settings()
            if not arguments.strip():
                return 'Confie une mission avec /work suivi du résultat attendu. Les permissions se règlent dans Atelier · Duplica · Telegram.'
            if not settings.get('telegramProjectId'):
                return 'Choisis le projet avec /project.'
            models = core.app.provider.get('models', [])
            model = settings.get('telegramWorkModel') or next((entry['model'] for entry in models if entry.get('isDefault')), '')
            result = core.work_on_project({'projectId': settings['telegramProjectId'], 'goal': arguments.strip(),
                'model': model, 'sandbox': settings.get('telegramWorkSandbox', 'read-only')})
            core.store.update('duplicaSettings', 'global', telegramSessionId=result['sessionId'])
            return 'Mission confiée à Duplica · ' + result['sessionId'] + '. Suis son avancement dans Atelier · Suivi ou avec /status.'
        if command in ('/pause', '/stop'):
            core.control(command[1:])
            return 'Duplica ' + ('en pause.' if command == '/pause' else 'arrêté.')
        if command == '/current':
            if arguments:
                session = core.store.get('session', arguments)
                if not core.supervised(session):
                    raise ValueError('Choisis un agent déjà supervisé.')
                core.store.update('duplicaSettings', 'global', telegramSessionId=session['id'])
            return 'Agent courant : ' + str(core.settings().get('telegramSessionId') or 'non choisi. Utiliser /current identifiant_agent')
        if command in ('/approve', '/deny'):
            core.resolve_request(arguments.strip(), accepted=command == '/approve')
            return 'Décision appliquée à cette demande uniquement.'
        if command == '/answer':
            request_id, _, answer = arguments.partition(' ')
            core.resolve_request(request_id, answer=answer, accepted=True, remember=True)
            return 'Réponse enregistrée et transmise.'
        if command == '/screenshot':
            observation = core.computer.observe('platform')
            # Captures are private data; this command explicitly requests transmission.
            screenshot = observation.get('screenshot')
            if screenshot:
                core.store.put('duplicaTelegram', {'id': observation['id'], 'text': 'Capture Atelier · ' + observation['createdAt'],
                     'screenshot': screenshot, 'recipient': self.recipient(), 'status': 'pending', 'createdAt': now()})
            return 'Capture demandée.'
        if command == '/logs':
            return '\n'.join(event['ts'] + ' ' + event['type'] for event in core.snapshot()['timeline'][:15]) or 'Aucune action Duplica.'
        session_id = core.settings().get('telegramSessionId')
        if command == '/continue':
            if not session_id:
                return 'Choisis un agent de travail avec /current identifiant_agent.'
            core.resume_mission(session_id)
            return 'Reprise demandée depuis l’état conservé.'
        if command.startswith('/') and command not in ('/chat', '/instruct'):
            return 'Écris pour discuter avec Duplica. Commandes : /work /project /status /pause /stop /current /approve /deny /answer /screenshot /logs /continue'
        if not raw:
            return 'Message vide.'
        if command != '/instruct':
            project_id = core.settings().get('telegramProjectId')
            if not project_id:
                return 'Choisis le projet de discussion avec /project.'
            core.discussion.send({'projectId': project_id, 'text': arguments if command == '/chat' else raw}, source='telegram')
            return 'Message reçu par Duplica. Sa réponse arrive ici et dans Atelier.'
        if not session_id:
            return 'Choisis un agent de travail avec /current identifiant_agent.'
        session = core.store.get('session', session_id)
        raw = arguments
        context = next((context for context in core.store.all('duplicaContext') if context['id'] == session['projectId']), {})
        core.save_context({'projectId': session['projectId'], 'project': (context.get('project', '') + '\nInstruction Telegram utilisateur : ' + raw)[-16000:]})
        # Natural language steering never silently grants new computer/command permissions.
        if core.supervised(session) and session['status'] == 'ready':
            core.app.prompt(session_id, duplica_prompt('Prends en compte cette instruction explicite de l’utilisateur.',
                [('user_request', '# Instruction utilisateur\n\n' + raw)]))
            return 'Instruction mémorisée et transmise.'
        core.store.update('duplicaSettings', 'global', telegramSteering={'sessionId': session_id, 'text': raw})
        return 'Instruction mémorisée. Elle sera transmise quand cet agent sera prêt.'

    def flush(self) -> None:
        for message in self.duplica.store.all('duplicaTelegram'):
            if message['status'] != 'pending' or not self.duplica.settings().get('telegramEnabled'):
                continue
            if message.get('recipient') != self.recipient():
                self.duplica.store.update('duplicaTelegram', message['id'], status='cancelled')
                continue
            # Mark before sending: an ambiguous network outcome must never cause a duplicate decision/message.
            self.duplica.store.update('duplicaTelegram', message['id'], status='sending')
            try:
                if message.get('screenshot'):
                    payload = {'chat_id': os.environ['DUPLICA_TELEGRAM_CHAT_ID'], 'photo': message['screenshot']['path'], 'caption': message['text']}
                    result = self.transport('sendPhoto', payload)
                else:
                    payload = {'chat_id': os.environ['DUPLICA_TELEGRAM_CHAT_ID'], 'text': message['text'][:4000]}
                    if message.get('markup'):
                        payload['reply_markup'] = message['markup']
                    result = self.transport('sendMessage', payload)
                self.duplica.store.update('duplicaTelegram', message['id'], status='sent', messageId=result.get('message_id'), sentAt=now())
            except Exception:
                self.duplica.store.update('duplicaTelegram', message['id'], status='uncertain', error='Envoi Telegram non confirmé. Consulter le journal local.')

    def _run(self) -> None:
        try:
            self._poll()
        finally:
            with self.connection_lock:
                self.thread = None
                # A quick pause/resume can race the previous worker's last iteration.
                self.start()

    def _poll(self) -> None:
        while not self.closed.is_set() and self.duplica.settings().get('telegramEnabled'):
            try:
                self.flush()
                if self.closed.is_set() or not self.duplica.settings().get('telegramEnabled'):
                    return
                settings = self.duplica.settings()
                updates = self.transport('getUpdates', {'offset': settings.get('telegramOffset', 0), 'timeout': 10,
                                                        'allowed_updates': ['message', 'callback_query']})
                self.last_poll_at, self.last_error = now(), None
                if self.closed.is_set() or not self.duplica.settings().get('telegramEnabled'):
                    return
                for update in updates:
                    if self.closed.is_set() or not self.duplica.settings().get('telegramEnabled'):
                        return
                    # Persist the cursor before mutation; updates are not replayed after a crash.
                    if update['update_id'] < self.duplica.settings().get('telegramOffset', 0):
                        continue
                    self.duplica.store.update('duplicaSettings', 'global', telegramOffset=update['update_id'] + 1)
                    try:
                        response = self.handle_update(update)
                    except Exception as error:
                        response = redact(str(error))
                    if response != 'ignored':
                        if update.get('callback_query'):
                            self.transport('answerCallbackQuery', {'callback_query_id': update['callback_query']['id']})
                        self.transport('sendMessage', {'chat_id': os.environ['DUPLICA_TELEGRAM_CHAT_ID'], 'text': response[:4000]})
                        self.duplica.event('telegram_command', {'updateId': update['update_id'], 'source': 'user:allowlisted-private-chat'})
            except Exception:
                self.last_error = 'Telegram ne répond pas. Vérifie la connexion et que ce bot n’est pas utilisé par un autre service.'
                if self.closed.wait(10):
                    return

    def _request(self, method: str, payload: dict):
        key = self.connection['token'] if self.connection else os.environ['DUPLICA_TELEGRAM_BOT_TOKEN']
        url = 'https://api.telegram.org/bot' + key + '/' + method
        if method == 'sendPhoto':
            from pathlib import Path
            from uuid import uuid4
            boundary = 'duplica' + uuid4().hex
            file = Path(payload.pop('photo'))
            chunks = []
            for name, value in payload.items():
                chunks.append(('--' + boundary + '\r\nContent-Disposition: form-data; name="' + name + '"\r\n\r\n' + str(value) + '\r\n').encode())
            chunks.append(('--' + boundary + '\r\nContent-Disposition: form-data; name="photo"; filename="capture.png"\r\nContent-Type: image/png\r\n\r\n').encode() + file.read_bytes() + b'\r\n')
            content = b''.join(chunks) + ('--' + boundary + '--\r\n').encode()
            mime = 'multipart/form-data; boundary=' + boundary
        else:
            content = json.dumps(payload).encode()
            mime = 'application/json'
        try:
            request = urllib.request.Request(url, data=content, headers={'Content-Type': mime}, method='POST')
            with urllib.request.urlopen(request, timeout=15) as response:
                result = json.load(response)
            if not result.get('ok'):
                raise ValueError('Requête Telegram refusée.')
            return result['result']
        except (urllib.error.URLError, ValueError, KeyError):
            # Never include the bot URL, which contains the credential, in logs or API errors.
            raise ValueError('Telegram indisponible ou requête refusée.') from None

    def close(self) -> None:
        self.closed.set()
        worker = self.thread
        if worker and worker is not threading.current_thread():
            worker.join(timeout=2)
