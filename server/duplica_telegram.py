"""Opt-in Telegram relay. Credentials stay in service environment, private chat only."""
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


IMPORTANT_EVENTS = {'user_required', 'bug_observed', 'agent_continued', 'verification_finished',
                    'task_completed', 'recovery', 'error', 'start'}


class TelegramRelay:
    def __init__(self, duplica, transport=None) -> None:
        self.duplica = duplica
        self.transport = transport or self._request
        self.closed = threading.Event()
        self.thread = None
        self.connection = None
        self.vault = duplica.directory / 'telegram-token.bin'
        if self.vault.is_file() and not os.environ.get('DUPLICA_TELEGRAM_BOT_TOKEN'):
            try:
                os.environ['DUPLICA_TELEGRAM_BOT_TOKEN'] = load_token(self.vault)
                os.environ['DUPLICA_TELEGRAM_CHAT_ID'] = duplica.settings().get('telegramChatId', '')
            except ValueError:
                pass

    def status(self) -> dict:
        return {'enabled': self.duplica.settings().get('telegramEnabled', False),
                'configured': bool(os.environ.get('DUPLICA_TELEGRAM_BOT_TOKEN') and os.environ.get('DUPLICA_TELEGRAM_CHAT_ID')),
                'running': bool(self.thread and self.thread.is_alive()),
                'botUsername': self.duplica.settings().get('telegramBotUsername')}

    def connect(self, changes: dict) -> dict:
        if self.status()['running']:
            raise ValueError('Désactive Telegram dans les permissions avant de changer de bot.')
        token = changes.get('botToken', '')
        if not isinstance(token, str) or not re.fullmatch(r'\d+:[A-Za-z0-9_-]{20,}', token):
            raise ValueError('Entre le token fourni par BotFather.')
        project = self.duplica.app.project(changes.get('projectId', 'atelier'))
        self.connection = {'token': token, 'code': secrets.token_urlsafe(6), 'expires': time.monotonic() + 300,
                           'projectId': project['id']}
        try:
            bot = self.transport('getMe', {})
        except Exception:
            self.connection = None
            raise ValueError('Le bot ne répond pas. Vérifie son token et la connexion.') from None
        self.connection['username'] = bot['username']
        self.connection['offset'] = (self.duplica.settings().get('telegramOffset', 0)
            if bot['username'] == self.duplica.settings().get('telegramBotUsername') else 0)
        return {'botUsername': bot['username'], 'pairingCode': self.connection['code']}

    def pair(self) -> dict:
        connection = self.connection
        if not connection or time.monotonic() > connection['expires']:
            self.connection = None
            raise ValueError('Code de connexion expiré. Entre à nouveau le token du bot.')
        updates = self.transport('getUpdates', {'timeout': 0, 'allowed_updates': ['message'],
                                 'offset': connection['offset']})
        for update in updates:
            message = update.get('message', {})
            chat, sender = message.get('chat', {}), message.get('from', {})
            if (chat.get('type') == 'private' and chat.get('id') == sender.get('id') and
                    message.get('text', '').strip() == '/start ' + connection['code']):
                save_token(self.vault, connection['token'])
                os.environ['DUPLICA_TELEGRAM_BOT_TOKEN'] = connection['token']
                os.environ['DUPLICA_TELEGRAM_CHAT_ID'] = str(chat['id'])
                self.duplica.store.update('duplicaSettings', 'global', telegramChatId=str(chat['id']),
                    telegramProjectId=connection['projectId'], telegramBotUsername=connection['username'],
                    telegramOffset=max(entry['update_id'] for entry in updates) + 1)
                self.connection = None
                self.duplica.configure({'telegramEnabled': True})
                return {'connected': True}
        if updates:
            connection['offset'] = max(entry['update_id'] for entry in updates) + 1
        return {'connected': False}

    def enqueue_reply(self, delivery_id: str, text: str) -> None:
        if self.status()['enabled']:
            self.duplica.store.put('duplicaTelegram', {'id': 'reply:' + delivery_id, 'text': redact(text),
                'status': 'pending', 'createdAt': now()})

    def start(self) -> None:
        if self.status()['enabled'] and self.status()['configured'] and (not self.thread or not self.thread.is_alive()):
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
                                                  'status': 'pending', 'createdAt': now()})

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
                core.store.update('duplicaSettings', 'global', telegramProjectId=project['id'])
                return 'Discussion Duplica · ' + project['name']
            return 'Choisis le projet :\n' + '\n'.join('/project ' + project['id'] + ' · ' + project['name'] for project in core.store.all('project'))
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
                     'screenshot': screenshot, 'status': 'pending', 'createdAt': now()})
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
            return 'Commandes : /project /status /pause /stop /current /approve /deny /answer /screenshot /logs /continue'
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
            core.app.prompt(session_id, 'Instruction explicite de l’utilisateur : ' + raw)
            return 'Instruction mémorisée et transmise.'
        core.store.update('duplicaSettings', 'global', telegramSteering={'sessionId': session_id, 'text': raw})
        return 'Instruction mémorisée. Elle sera transmise quand cet agent sera prêt.'

    def flush(self) -> None:
        for message in self.duplica.store.all('duplicaTelegram'):
            if message['status'] != 'pending' or not self.duplica.settings().get('telegramEnabled'):
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
        while not self.closed.is_set() and self.duplica.settings().get('telegramEnabled'):
            try:
                self.flush()
                settings = self.duplica.settings()
                updates = self.transport('getUpdates', {'offset': settings.get('telegramOffset', 0), 'timeout': 10,
                                                        'allowed_updates': ['message', 'callback_query']})
                if self.closed.is_set() or not self.duplica.settings().get('telegramEnabled'):
                    return
                for update in updates:
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
        if self.thread and self.thread is not threading.current_thread():
            self.thread.join(timeout=2)
