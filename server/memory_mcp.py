"""Small read-only MCP: retrieve selected memory instead of injecting the reserve."""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server.store import Store


def search_memories(memories, query, limit=5, project='atelier'):
    terms = set(re.findall(r'\w+', query.casefold()))
    hits = []
    for memory in memories:
        if memory.get('scope') != 'user' and memory.get('projectId') != project:
            continue
        text = ' '.join([memory['title'], memory['body'], ' '.join(memory.get('tags', [])),
                         memory.get('subject', ''), memory.get('why', ''), memory.get('context', ''),
                         memory.get('source', '')]).casefold()
        score = sum(3 if term in memory['title'].casefold() else 1 for term in terms if term in text)
        if score:
            hits.append((score, memory))
    return [dict(id=m['id'], title=m['title'], excerpt=m['body'][:600], source=m.get('source', ''), score=s)
            for s, m in sorted(hits, key=lambda hit: -hit[0])[:min(limit, 8)]]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', required=True)
    parser.add_argument('--project', required=True)
    args = parser.parse_args()
    store = Store(args.data)
    tools = [
        {'name': 'memory_search', 'description': 'Recherche lexicale à la demande dans la mémoire validée. Retourne des extraits courts et leur source.',
         'inputSchema': {'type': 'object', 'properties': {'query': {'type': 'string'}}, 'required': ['query']}},
        {'name': 'memory_read', 'description': 'Lit un souvenir choisi par son identifiant, avec sa provenance.',
         'inputSchema': {'type': 'object', 'properties': {'id': {'type': 'string'}}, 'required': ['id']}}
    ]
    for line in sys.stdin:
        try:
            request = json.loads(line)
            if 'id' not in request:
                continue
            method = request.get('method')
            if method == 'initialize':
                result = {'protocolVersion': request.get('params', {}).get('protocolVersion', '2024-11-05'),
                          'capabilities': {'tools': {}}, 'serverInfo': {'name': 'atelier-memory', 'version': '0.1.0'}}
            elif method == 'ping':
                result = {}
            elif method == 'tools/list':
                result = {'tools': tools}
            elif method == 'tools/call':
                params = request['params']
                arguments = params.get('arguments', {})
                if params['name'] == 'memory_search':
                    data = search_memories(store.all('memory'), arguments['query'], project=args.project)
                elif params['name'] == 'memory_read':
                    data = store.get('memory', arguments['id'])
                    if data.get('scope') != 'user' and data.get('projectId') != args.project:
                        raise ValueError('Souvenir hors du projet.')
                    data = dict(data, body=data['body'][:6000])
                else:
                    raise ValueError('Outil inconnu.')
                store.event('memory.retrieved', {'tool': params['name'], 'arguments': arguments}, project_id=args.project)
                result = {'content': [{'type': 'text', 'text': json.dumps(data, ensure_ascii=False)}]}
            else:
                print(json.dumps({'id': request['id'], 'jsonrpc': '2.0', 'error': {'code': -32601, 'message': 'Unknown method'}}), flush=True)
                continue
            print(json.dumps({'id': request['id'], 'jsonrpc': '2.0', 'result': result}), flush=True)
        except Exception as exc:
            if isinstance(locals().get('request'), dict) and 'id' in request:
                print(json.dumps({'id': request['id'], 'jsonrpc': '2.0', 'error': {'code': -32602, 'message': str(exc)}}), flush=True)


if __name__ == '__main__':
    main()
