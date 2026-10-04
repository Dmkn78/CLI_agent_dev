"""Explicit HTTP connections for public chat and typed decision consultants."""
import json
import ipaddress
import math
import os
import re
import threading
import urllib.error
import urllib.request
from urllib.parse import urlsplit

from .store import now, uid

MAX_RESPONSE_BYTES = 2 * 1024 * 1024
MAX_PUBLIC_TEXT = 16000
PROTOCOLS = ('openai', 'systemone')
SERVER_KINDS = ('custom', 'lmstudio', 'omlx', 'splash')
DECISION_QUESTIONS = {
    'next_step': {'type': 'choice', 'instructions': 'Which step should the planning team take next?',
                  'criteria': {'clarify': 'Ask the user for missing requirements.',
                               'discuss': 'Compare alternatives and gather public evidence.',
                               'plan': 'Draft a concrete implementation plan.',
                               'review': 'Review the proposed plan before any action.'}},
    'risk': {'type': 'score', 'instructions': 'Assess the risk of the proposed action.',
             'criteria': ['Low impact and reversible', 'Requires verification', 'High impact or missing permission']},
    'missing_information': {'type': 'noul', 'instructions': 'Is essential information missing to plan the work?'},
}


def public_text(content: str) -> str:
    """Local runtimes may embed reasoning tags instead of using a separate field."""
    if not isinstance(content, str):
        raise ValueError('Le fournisseur doit retourner une réponse publique textuelle.')
    content = re.sub(r'<(think|analysis|reasoning)\b[^>]*>.*?</\1\s*>', '', content,
                     flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r'<(?:think|analysis|reasoning)\b[^>]*>.*$', '', content,
                     flags=re.IGNORECASE | re.DOTALL).strip()
    if not content or len(content) > MAX_PUBLIC_TEXT:
        raise ValueError('Réponse publique vide ou supérieure à 16 000 caractères.')
    return content


def normalize_usage(usage: object) -> dict | None:
    if not isinstance(usage, dict):
        return None
    observed = {}
    for targets in (('prompt_tokens', 'input_tokens', 'inputTokens'),
                    ('completion_tokens', 'output_tokens', 'outputTokens'),
                    ('total_tokens', 'totalTokens')):
        for source in targets:
            count = usage.get(source)
            if isinstance(count, int) and not isinstance(count, bool) and count >= 0:
                observed[targets[-1]] = count
                break
    return observed or None


def validate_endpoint(endpoint: object) -> str:
    if not isinstance(endpoint, str) or not endpoint.strip() or len(endpoint) > 2048:
        raise ValueError('Indique une URL de base HTTP ou HTTPS.')
    endpoint = endpoint.strip().rstrip('/')
    try:
        parsed = urlsplit(endpoint)
        port = parsed.port
    except ValueError:
        raise ValueError('Port de connexion invalide.')
    if (parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password
            or parsed.query or parsed.fragment or '\\' in endpoint or re.search(r'[\s\x00-\x1f]', endpoint)
            or port == 0):
        raise ValueError('URL invalide : sans identifiant, paramètre ni fragment.')
    # Preserve user-entered LAN/local endpoints. Remote credentials require TLS.
    host = parsed.hostname.casefold()
    is_local = host == 'localhost'
    try:
        address = ipaddress.ip_address(host)
        is_local = any(address in ipaddress.ip_network(network) for network in
                       ('127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
                        '100.64.0.0/10', '::1/128', 'fc00::/7', 'fe80::/10'))
    except ValueError:
        pass
    if parsed.scheme == 'http' and not is_local:
        raise ValueError('Utilise HTTPS pour une API distante, HTTP pour localhost ou le réseau local.')
    return endpoint


def api_base_url(endpoint: object, server_kind: str = 'custom') -> str:
    """Accept a server origin, a /v1 base or a pasted compatible route."""
    endpoint = validate_endpoint(endpoint)
    for suffix in ('/chat/completions', '/systemone', '/models'):
        if endpoint.endswith(suffix):
            endpoint = endpoint[:-len(suffix)]
            break
    # LM Studio's native /api/v1 uses a different chat schema. Keep our
    # inference on its OpenAI-compatible endpoint, including reverse proxies.
    if server_kind == 'lmstudio' and endpoint.endswith('/api/v1'):
        endpoint = endpoint[:-len('/api/v1')] + '/v1'
    return endpoint if endpoint.endswith('/v1') else endpoint + '/v1'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class ApiConnections:
    def __init__(self, app) -> None:
        self.app, self.store = app, app.store
        self.lock = threading.RLock()

    def snapshot(self) -> list[dict]:
        return self.store.all('apiConnection')

    def save(self, changes: dict) -> dict:
        with self.lock:
            identifier = changes.get('id') or uid('api')
            existing = self.store.get('apiConnection', identifier) if changes.get('id') else {}
            if existing:
                self._assert_idle(identifier)
            name = changes.get('name', existing.get('name', ''))
            if not isinstance(name, str) or not name.strip() or len(name) > 100:
                raise ValueError('Indique un nom de connexion de 1 à 100 caractères.')
            server_kind = changes.get('serverKind', existing.get('serverKind', 'custom'))
            if server_kind not in SERVER_KINDS:
                raise ValueError('Type de serveur non pris en charge.')
            endpoint = api_base_url(changes.get('baseUrl', existing.get('baseUrl')), server_kind)
            protocol = changes.get('protocol', existing.get('protocol', 'openai'))
            if protocol not in PROTOCOLS:
                raise ValueError('Protocole non pris en charge.')
            environment = changes.get('credentialEnvironment', existing.get('credentialEnvironment', ''))
            if not isinstance(environment, str) or len(environment) > 100 or (environment and not re.fullmatch(r'ATELIER_(?:[A-Z0-9_]+_)?API_KEY', environment)):
                raise ValueError('Utilise une variable ATELIER_…API_KEY (ex. ATELIER_LOCAL_API_KEY).')
            declared = changes.get('modelIds', [model['model'] for model in existing.get('models', [])])
            if isinstance(declared, str):
                declared = [entry.strip() for entry in re.split(r'[,\n]', declared) if entry.strip()]
            if not isinstance(declared, list) or len(declared) > 200 or any(
                    not isinstance(model, str) or not model.strip() or len(model) > 200
                    or re.search(r'[\x00-\x1f\x7f]', model) for model in declared):
                raise ValueError('Liste de modèles invalide (200 maximum).')
            if protocol == 'systemone' and not declared:
                raise ValueError('Indique l’identifiant du modèle servi par l’API de décisions.')
            timeout = changes.get('timeout', existing.get('timeout', 60))
            if isinstance(timeout, bool):
                raise ValueError('Délai invalide.')
            try:
                timeout = int(timeout)
            except (ValueError, TypeError):
                raise ValueError('Délai invalide.')
            if not 5 <= timeout <= 180:
                raise ValueError('Délai compris entre 5 et 180 secondes.')
            connection = {'id': identifier, 'name': name.strip(), 'baseUrl': endpoint,
                          'protocol': protocol, 'serverKind': server_kind,
                          'credentialEnvironment': environment, 'timeout': timeout,
                          'models': [self._model(model.strip()) for model in dict.fromkeys(declared)],
                          'excludedModels': [], 'catalogMetadata': 'unknown', 'catalogReadAt': None,
                          'lastReplyAt': None, 'lastReplyModel': None,
                          'catalogSource': 'declared', 'status': 'configured', 'error': None,
                          'createdAt': existing.get('createdAt', now()), 'updatedAt': now()}
            same_catalog = existing and all(connection[key] == existing.get(key, 'custom' if key == 'serverKind' else None)
                for key in ('baseUrl', 'protocol', 'serverKind', 'credentialEnvironment')) and (
                [model['model'] for model in connection['models']] == [model['model'] for model in existing.get('models', [])])
            if same_catalog:
                for key in ('models', 'excludedModels', 'catalogSource', 'catalogMetadata', 'catalogReadAt',
                            'lastReplyAt', 'lastReplyModel', 'status', 'error'):
                    if key in existing:
                        connection[key] = existing[key]
            self.store.put('apiConnection', connection)
            self.store.event('api.connection_saved', {'connectionId': identifier, 'protocol': protocol})
            return connection

    def remove(self, identifier: str) -> dict:
        with self.lock:
            self.store.get('apiConnection', identifier)
            self._assert_idle(identifier)
            self.store.delete('apiConnection', identifier)
            return {'ok': True}

    def discover(self, identifier: str) -> dict:
        with self.lock:
            self._assert_idle(identifier)
            connection = self.store.get('apiConnection', identifier)
            if connection['protocol'] != 'openai':
                raise ValueError('SystemOne utilise les identifiants déclarés par le serveur, sans catalogue standard.')
            try:
                response = self._request(connection, 'models')
                entries = response.get('data')
                if not isinstance(entries, list) or len(entries) > 200:
                    raise ValueError('Le serveur ne retourne pas un catalogue OpenAI valide.')
                native = {}
                metadata = 'provider'
                if connection.get('serverKind') == 'lmstudio':
                    try:
                        catalog = self._request(connection, 'models', native=True)
                        native_entries = catalog.get('models')
                        if not isinstance(native_entries, list) or len(native_entries) > 200:
                            raise ValueError('Catalogue natif non reconnu.')
                        for entry in native_entries:
                            key = entry.get('key') if isinstance(entry, dict) else None
                            if isinstance(key, str) and entry.get('type') in ('llm', 'embedding'):
                                native[key] = entry
                                for instance in entry.get('loaded_instances', []) if isinstance(entry.get('loaded_instances'), list) else []:
                                    instance_id = instance.get('id') if isinstance(instance, dict) else None
                                    if isinstance(instance_id, str):
                                        native[instance_id] = entry
                    except ValueError:
                        # Older LM Studio and compatible servers may lack the
                        # native catalog. Never infer a type from a model name.
                        pass
                    metadata = 'lmstudio' if native else 'unknown'
                models, excluded, seen = [], [], set()
                for entry in entries:
                    model = entry.get('id') if isinstance(entry, dict) else None
                    if (not isinstance(model, str) or not model.strip() or len(model) > 200
                            or model != model.strip() or re.search(r'[\x00-\x1f\x7f]', model)):
                        raise ValueError('Identifiant de modèle invalide dans le catalogue.')
                    if model in seen:
                        continue
                    seen.add(model)
                    detail = self._model(model, native.get(model, entry))
                    (excluded if detail['modelType'] in ('embedding', 'reranker') else models).append(detail)
                if not native:
                    metadata = 'provider' if any(model['modelType'] != 'unknown' for model in models + excluded) else 'unknown'
                return self.store.update('apiConnection', identifier, models=models, excludedModels=excluded,
                                         catalogSource='discovered', catalogMetadata=metadata, catalogReadAt=now(),
                                         status='catalog_ready', error=None, updatedAt=now())
            except ValueError as error:
                self.store.update('apiConnection', identifier, status='error', error=str(error), updatedAt=now())
                raise

    def configuration(self, changes: dict) -> dict:
        connection = self.store.get('apiConnection', changes.get('connectionId', ''))
        model = changes.get('model')
        if model not in [entry['model'] for entry in connection['models']]:
            raise ValueError('Choisis un modèle déclaré ou découvert pour cette connexion.')
        return {'runtime': 'api', 'provider': 'api:' + connection['id'], 'connectionId': connection['id'],
                'model': model, 'effort': 'off', 'protocol': connection['protocol']}

    def reply(self, participant: dict, messages: list[dict], purpose: str, instructions: str) -> dict:
        configuration = self.configuration(participant['configuration'])
        connection = self.store.get('apiConnection', configuration['connectionId'])
        transcript = '\n\n'.join(message['author'] + ' : ' + message['text'] for message in messages)
        if connection['protocol'] == 'systemone':
            if participant['role'] != 'consultant' or purpose == 'plan':
                raise ValueError('Un modèle de décisions participe comme consultant ; un LLM rédige le plan.')
            # LAYA has short encoder contexts. Keep the topic and the latest public proposal.
            state = transcript if len(transcript) <= 1800 else transcript[:400] + '\n[...]\n' + transcript[-1300:]
            response = self._request(connection, 'systemone', {'model': configuration['model'],
                'state': state, 'questions': DECISION_QUESTIONS})
            text = self._decision_text(response.get('answers'))
            if participant.get('roundMode') == 'auto':
                answers = response['answers']
                ready = answers['next_step']['choice'] in ('plan', 'review')
                text += '\n[[ATELIER:READY]]' if ready else '\n[[ATELIER:CONTINUE]]'
            if len(state) < len(transcript):
                text += '\nAvis sur un extrait : sujet et derniers messages publics.'
        else:
            response = self._request(connection, 'chat/completions', {'model': configuration['model'],
                'messages': [{'role': 'system', 'content': instructions}, {'role': 'user', 'content': transcript}],
                'stream': False, 'max_tokens': 2000})
            choices = response.get('choices')
            if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
                raise ValueError('Réponse Chat Completions invalide.')
            message = choices[0].get('message')
            if not isinstance(message, dict) or message.get('tool_calls'):
                raise ValueError('Le canal attend une réponse publique sans appel d’outil.')
            text = public_text(message.get('content'))
        self.store.update('apiConnection', connection['id'], lastReplyAt=now(), lastReplyModel=configuration['model'])
        return {'text': text, 'usage': normalize_usage(response.get('usage'))}

    def _request(self, connection: dict, suffix: str, body: dict | None = None, *, native: bool = False) -> dict:
        headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}
        environment = connection['credentialEnvironment']
        if environment:
            credential = os.environ.get(environment)
            if not credential or re.search(r'[\r\n]', credential):
                raise ValueError('La variable de clé configurée est absente ou invalide dans le service Atelier.')
            headers['Authorization'] = 'Bearer ' + credential
        base = api_base_url(connection['baseUrl'], connection.get('serverKind', 'custom'))
        if native:
            base = base[:-len('/v1')] + '/api/v1'
        request = urllib.request.Request(base + '/' + suffix, headers=headers,
                    data=json.dumps(body, ensure_ascii=False).encode('utf-8') if body is not None else None,
                    method='POST' if body is not None else 'GET')
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
        try:
            with opener.open(request, timeout=connection['timeout']) as response:
                raw = response.read(MAX_RESPONSE_BYTES + 1)
            if len(raw) > MAX_RESPONSE_BYTES:
                raise ValueError('Réponse de l’API trop volumineuse.')
            decoded = json.loads(raw)
            if not isinstance(decoded, dict):
                raise ValueError('Réponse de l’API : objet JSON attendu.')
            return decoded
        except urllib.error.HTTPError as error:
            error.close()
            hint = {401: 'Vérifie la variable de clé et l’authentification du serveur.',
                    403: 'La clé ou ce modèle ne dispose pas de l’accès demandé.',
                    404: 'Vérifie l’URL compatible /v1 et le modèle sélectionné.',
                    429: 'Le serveur limite les appels ; réessaie plus tard.',
                    503: 'Le serveur ou le modèle n’est pas encore disponible.'}.get(error.code, '')
            raise ValueError(('L’API a refusé la requête (HTTP ' + str(error.code) + '). ' + hint).strip()) from None
        except (urllib.error.URLError, TimeoutError, OSError):
            raise ValueError('API inaccessible ou délai dépassé. Vérifie l’URL et le serveur.') from None
        except (json.JSONDecodeError, UnicodeError):
            raise ValueError('La réponse de l’API n’est pas un JSON valide.') from None

    def _assert_idle(self, identifier: str) -> None:
        for channel in self.store.all('channel'):
            if channel.get('status') == 'running' and any(
                    participant.get('configuration', {}).get('connectionId') == identifier
                    for participant in channel.get('participants', [])):
                raise ValueError('Arrête le canal avant de modifier cette connexion.')

    @staticmethod
    def _model(identifier: str, metadata: dict | None = None) -> dict:
        metadata = metadata or {}
        kind = metadata.get('type', metadata.get('model_type'))
        kind = kind.casefold() if isinstance(kind, str) else ''
        kind = {'llm': 'chat', 'vlm': 'chat', 'chat': 'chat', 'embedding': 'embedding',
                'embeddings': 'embedding', 'reranker': 'reranker', 'rerank': 'reranker'}.get(kind, 'unknown')
        display = metadata.get('display_name', metadata.get('displayName', identifier))
        if not isinstance(display, str) or not display.strip() or len(display) > 200 or re.search(r'[\x00-\x1f\x7f]', display):
            display = identifier
        result = {'model': identifier, 'displayName': display, 'modelType': kind,
                  'defaultReasoningEffort': 'off', 'supportedReasoningEfforts': [{'reasoningEffort': 'off'}]}
        loaded = metadata.get('loaded_instances')
        if isinstance(loaded, list):
            result['loaded'] = bool(loaded)
        elif metadata.get('state') in ('loaded', 'not-loaded'):
            result['loaded'] = metadata['state'] == 'loaded'
        for key in ('max_context_length', 'max_model_len'):
            context = metadata.get(key)
            if isinstance(context, int) and not isinstance(context, bool) and context > 0:
                result['contextWindow'] = context
                break
        return result

    @staticmethod
    def _decision_text(answers: object) -> str:
        if not isinstance(answers, dict):
            raise ValueError('Réponse de décisions invalide : answers attendu.')
        next_step, risk, missing = (answers.get(key) for key in DECISION_QUESTIONS)
        if not all(isinstance(answer, dict) for answer in (next_step, risk, missing)):
            raise ValueError('Le consultant n’a pas répondu à toutes les questions typées.')
        choice = next_step.get('choice')
        if choice not in DECISION_QUESTIONS['next_step']['criteria']:
            raise ValueError('Choix du consultant hors du schéma.')
        def number(answer: dict, key: str, maximum: int) -> float:
            result = answer.get(key)
            if isinstance(result, bool) or not isinstance(result, (int, float)) or not math.isfinite(result) or not 0 <= result <= maximum:
                raise ValueError('Score ou probabilité du consultant invalide.')
            return float(result)
        confidence = number(next_step, 'confidence', 1)
        score = number(risk, 'score', 2)
        probability = number(missing, 'noul', 1)
        labels = {'clarify': 'Clarifier avec l’utilisateur', 'discuss': 'Comparer les propositions',
                  'plan': 'Préparer le plan', 'review': 'Relire le plan'}
        return ('Avis structuré du consultant :\nÉtape proposée : ' + labels[choice]
                + f' (confiance {confidence:.0%}).\nRisque : {score:.2f} / 2.'
                + f'\nInformation essentielle manquante : {probability:.0%}.'
                + '\nCet avis contribue à la discussion ; il n’autorise aucune action.')
