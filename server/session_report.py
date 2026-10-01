"""Compact report: factual metadata and references, not a second transcript."""
import json
from datetime import datetime

from .store import now, redact


def build_report(session, events, handoff):
    tools = [event for event in events if event['type'] == 'item/completed' and
             event['data'].get('item', {}).get('type') in ('commandExecution', 'fileChange', 'mcpToolCall')]
    ended = session.get('closedAt') or now()
    elapsed = max(0, (datetime.fromisoformat(ended) - datetime.fromisoformat(session['createdAt'])).total_seconds())
    turns = {event['data']['turn']['id']: event['data']['turn'] for event in events
             if event['type'] == 'turn/completed' and event['data'].get('turn', {}).get('id')}
    durations = [turn['durationMs'] for turn in turns.values() if isinstance(turn.get('durationMs'), (int, float))]
    failures = [event['data'].get('error') for event in events if event['type'] == 'error' and event['data'].get('error')]
    results = []
    for event in tools[:80]:
        item = event['data']['item']
        results.append({key: item[key] for key in ('id', 'type', 'tool', 'status', 'exitCode', 'durationMs', 'path', 'success') if key in item})
    metadata = redact({
        'schema': 'atelier.session.v1', 'date': now(), 'sessionId': session['id'],
        'name': session['name'], 'projectId': session['projectId'], 'runtime': session.get('runtime', 'codex'),
        'model': session['model'], 'permissions': session['sandbox'],
        'status': session.get('lastTurnStatus') or session['status'], 'elapsedSeconds': round(elapsed, 2),
        'turnDurationMs': session.get('lastTurnDurationMs') if session.get('lastTurnDurationMs') is not None else durations[-1] if durations else None,
        'totalTurnDurationMs': sum(durations) if durations else session.get('totalTurnDurationMs'),
        'durationMeaning': 'Turn duration includes network retries and permission waits; elapsed includes idle time.',
        'requests': len([event for event in events if event['type'] == 'prompt.submitted']),
        'toolResults': len(tools), 'usage': session.get('usage'), 'error': session.get('lastTurnError') or session.get('transportError') or session.get('error') or (failures[-1] if failures else None),
        'validation': 'UNVERIFIED', 'output': handoff['output'], 'log': handoff['log'],
        'toolSummary': results, 'toolSummaryTruncated': len(tools) > len(results),
    })
    # JSON scalars are valid YAML scalars; nested data stays in the canonical JSON.
    fields = ('schema', 'date', 'sessionId', 'model', 'status', 'elapsedSeconds', 'turnDurationMs', 'validation')
    header = '\n'.join(key + ': ' + json.dumps(metadata[key], ensure_ascii=False) for key in fields)
    text = '---\n' + header + '\n---\n\n# ' + session['name'] + '\n\n'
    text += session.get('mission', '')[:1200] + '\n\n'
    text += f"{metadata['requests']} requêtes ; {len(tools)} résultats d’outils. Validation indépendante non effectuée.\n"
    text += 'Durée des tours : inclut réseau et permissions. Temps écoulé : inclut l’inactivité.\n\n'
    if metadata['error']:
        text += 'Erreur observée : ' + str(metadata['error'])[:1200] + '\n\n'
    text += 'Preuves complètes, non réinjectées dans ce résumé :\n'
    text += '- Métadonnées : report.json\n- Sortie : ' + handoff['output']['path'] + '\n'
    text += '- SHA-256 : ' + handoff['output']['sha256'] + '\n- Journal : ' + handoff['log'] + '\n'
    return metadata, redact(text)
