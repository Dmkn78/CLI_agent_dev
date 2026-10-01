"""Explicit connectivity probe. No project context, files, tools or credentials copied."""
import argparse
import json
import sys
import threading
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from server.codex import CodexClient

parser = argparse.ArgumentParser()
parser.add_argument('--executable')
parser.add_argument('--model', help='Optional explicit real inference; exact discovered model required.')
args = parser.parse_args()
finished = threading.Event()
observed = {'errors': [], 'markerReceived': False}
client = None
workspace = None


def event(message):
    method, params = message.get('method'), message.get('params', {})
    if 'id' in message and method:
        client.unsupported(message['id'])
    if method == 'error':
        error = params.get('error') or {}
        observed['errors'].append({key: error.get(key) for key in ('message', 'additionalDetails')})
    elif method == 'item/completed' and params.get('item', {}).get('type') == 'agentMessage':
        observed['markerReceived'] = 'ATELIER_OK' in params['item'].get('text', '')
    elif method == 'turn/completed':
        turn = params['turn']
        observed.update(status=turn.get('status'), durationMs=turn.get('durationMs'))
        finished.set()
    elif method == 'thread/tokenUsage/updated':
        observed['usage'] = params.get('tokenUsage', {}).get('total')


try:
    client = CodexClient(event, executable=args.executable)
    account = client.rpc('account/read', {'refreshToken': False}).get('account')
    models, cursor = [], None
    while True:
        response = client.rpc('model/list', {'includeHidden': True, **({'cursor': cursor} if cursor else {})})
        models.extend(response.get('data', []))
        cursor = response.get('nextCursor')
        if not cursor:
            break
    result = {'connected': bool(account), 'modelCount': len(models), 'models': [entry['model'] for entry in models]}
    try:
        limits = client.rpc('account/rateLimits/read', {}, timeout=15)
        buckets = limits.get('rateLimitsByLimitId') or {'codex': limits.get('rateLimits')}
        result['limits'] = {identifier: {key: bucket.get(key) for key in ('primary', 'secondary')} for identifier, bucket in buckets.items() if bucket}
    except Exception as exc:
        result['limitsError'] = str(exc)
    if args.model:
        entry = next((entry for entry in models if entry['model'] == args.model), None)
        if not entry:
            raise ValueError('Le modèle exact demandé est absent du catalogue. Aucun modèle de remplacement lancé.')
        workspace = tempfile.TemporaryDirectory(prefix='atelier-connectivity-')
        directory = Path(workspace.name)
        response = client.rpc('thread/start', {'cwd': str(directory), 'model': args.model, 'sandbox': 'read-only',
                              'approvalPolicy': 'on-request', 'developerInstructions': 'Test de connexion synthétique. Aucun outil, aucune lecture de fichier, aucune délégation.'})
        effort = 'low' if any(e['reasoningEffort'] == 'low' for e in entry['supportedReasoningEfforts']) else entry['defaultReasoningEffort']
        turn = client.rpc('turn/start', {'threadId': response['thread']['id'], 'effort': effort,
                         'input': [{'type': 'text', 'text': 'Réponds seulement ATELIER_OK. Aucun outil.'}]})
        if not finished.wait(60):
            client.rpc('turn/interrupt', {'threadId': response['thread']['id'], 'turnId': turn['turn']['id']})
            finished.wait(5)
            observed['timeout'] = True
        result['probe'] = {'model': args.model, **observed}
    print(json.dumps(result, ensure_ascii=False))
finally:
    if client:
        client.close()
    if workspace:
        workspace.cleanup()
