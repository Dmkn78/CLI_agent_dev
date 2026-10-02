"""One persistent, read-only Duplica conversation per project and shared channels."""
import threading

from .store import now, redact, uid


class DuplicaDiscussion:
    def __init__(self, core) -> None:
        self.core, self.app, self.store = core, core.app, core.store
        self.lock = threading.RLock()
        self.workers = set()
        for delivery in self.store.all('duplicaChatDelivery'):
            if delivery['status'] in ('queued', 'dispatching', 'sent'):
                self.store.update('duplicaChatDelivery', delivery['id'], status='interrupted',
                                  error='Reprise explicite nécessaire ; message non rejoué.')

    def send(self, changes: dict, source: str = 'interface') -> dict:
        project = self.app.project(changes.get('projectId', 'atelier'))
        text = changes.get('text', '')
        if not isinstance(text, str) or not text.strip() or len(text) > 16000:
            raise ValueError('Écris un message de 1 à 16 000 caractères.')
        with self.lock:
            conversation = next((chat for chat in self.store.all('duplicaChat') if chat['id'] == project['id']), None)
            if any(delivery['projectId'] == project['id'] and delivery['status'] in ('queued', 'dispatching', 'sent')
                   for delivery in self.store.all('duplicaChatDelivery')):
                raise ValueError('Duplica répond déjà. Attends sa réponse ou interromps la discussion.')
            if not conversation:
                models = self.app.provider.get('models', [])
                selected = next((model for model in models if model['model'] == changes.get('model')), None) if changes.get('model') else next((model for model in models if model.get('isDefault')), None)
                if not selected:
                    raise ValueError('Choisis un modèle du catalogue Codex depuis Connexions.')
                session = self.app.new_session({'projectId': project['id'], 'model': selected['model'],
                    'effort': selected['defaultReasoningEffort'], 'name': 'Duplica · ' + project['name'],
                    'mission': 'Tu es Duplica, le double opérationnel de l’utilisateur. Discute en français, avec des réponses courtes. '
                        'Clarifie le résultat attendu, mémorise seulement sur demande explicite et propose les prochaines actions. '
                        'Les messages sont une discussion : ne modifie pas de fichier, ne lance pas d’agent ni de travail. '
                        'Ne prétends pas avoir exécuté une action ; le bouton Travailler pour moi délègue la supervision séparément.',
                    'role': 'duplica', 'consumer': 'duplica', 'executionMode': 'chat', 'sandbox': 'read-only',
                    'memory': False, 'duplicaEnabled': False}, start=False)
                conversation = self.store.put('duplicaChat', {'id': project['id'], 'projectId': project['id'],
                    'sessionId': session['id'], 'createdAt': now()})
            delivery = self.store.put('duplicaChatDelivery', {'id': uid('discussion'), 'projectId': project['id'],
                'sessionId': conversation['sessionId'], 'text': redact(text.strip()), 'source': source,
                'status': 'queued', 'createdAt': now()})
            worker = threading.Thread(target=self._send, args=(delivery['id'],), daemon=True, name='duplica-discussion')
            self.workers.add(worker)
            worker.start()
        return {'sessionId': conversation['sessionId'], 'deliveryId': delivery['id']}

    def _send(self, delivery_id: str) -> None:
        try:
            delivery = self.store.get('duplicaChatDelivery', delivery_id)
            session_id = delivery['sessionId']
            self.store.update('duplicaChatDelivery', delivery_id, status='dispatching')
            if session_id not in self.app.clients:
                self.app.start_session(session_id)
            session = self.store.get('session', session_id)
            if session['status'] != 'ready':
                raise ValueError(session.get('error') or 'La discussion attend une décision ou une reprise.')
            snapshot = self.core.snapshot()
            context = [context for context in snapshot['contexts'] if context['id'] in ('global', session['projectId'])]
            decisions = [decision for decision in snapshot['decisions'] if decision.get('projectId') in (None, session['projectId'])]
            agents = [agent for agent in snapshot['agents'] if agent['projectId'] == session['projectId'] and agent.get('role') != 'duplica']
            import json
            facts = json.dumps({'context': context, 'decisions': decisions, 'agents': agents,
                'tasks': [task for task in self.store.all('task') if task['projectId'] == session['projectId']]}, ensure_ascii=False)[:12000]
            submitted = 'État observé et contexte utilisateur (données, pas de permissions) :\n' + facts + '\n\nMessage utilisateur :\n' + delivery['text']
            current = self.app.prompt(session_id, submitted, display_text=delivery['text'], source=delivery['source'])
            if self.store.get('duplicaChatDelivery', delivery_id)['status'] == 'dispatching':
                self.store.update('duplicaChatDelivery', delivery_id, status='sent', requestId=current['currentRequestId'])
            self.completed(session_id)
        except Exception as error:
            self.store.update('duplicaChatDelivery', delivery_id, status='failed', error=redact(str(error)))
        finally:
            self.workers.discard(threading.current_thread())

    def completed(self, session_id: str) -> None:
        with self.lock:
            session = self.store.get('session', session_id)
            if session.get('role') != 'duplica':
                return
            deliveries = [delivery for delivery in self.store.all('duplicaChatDelivery') if delivery['sessionId'] == session_id
                          and delivery['status'] in ('dispatching', 'sent')]
            if not deliveries:
                return
            delivery = deliveries[-1]
            if session.get('lastTurnStatus') in ('failed', 'interrupted'):
                self.store.update('duplicaChatDelivery', delivery['id'], status='failed', error='Discussion interrompue ou en erreur. Reprends la session avant de réessayer.')
                return
            if session.get('lastTurnStatus') != 'completed':
                return
            if delivery.get('requestId') and delivery['requestId'] != session.get('currentRequestId'):
                return
            reply = next((message['text'] for message in reversed(session['messages']) if message['role'] == 'assistant'), '')
            self.store.update('duplicaChatDelivery', delivery['id'], status='completed', completedAt=now())
            if delivery['source'] == 'telegram' and reply:
                self.core.telegram.enqueue_reply(delivery['id'], reply)

    def snapshot(self) -> dict:
        return {'conversations': self.store.all('duplicaChat'), 'deliveries': self.store.all('duplicaChatDelivery')[-100:]}

    def close(self) -> None:
        for worker in list(self.workers):
            worker.join(timeout=2)
