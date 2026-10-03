"""Inert, bounded design documents. Drawing an edge never grants execution rights."""
import math

from .store import now, uid


def validate_graph(graph):
    if not isinstance(graph, dict) or not isinstance(graph.get('nodes'), list) or not isinstance(graph.get('edges'), list):
        raise ValueError('Le graphe attend nodes et edges.')
    if len(graph['nodes']) > 80 or len(graph['edges']) > 200:
        raise ValueError('Limite : 80 blocs, 200 liens.')
    nodes, edges, identifiers = [], [], set()
    for node in graph['nodes']:
        if not isinstance(node, dict):
            raise ValueError('Bloc invalide.')
        identifier = str(node.get('id', ''))
        if not identifier or len(identifier) > 100 or identifier in identifiers:
            raise ValueError('Identifiant de bloc invalide ou dupliqué.')
        identifiers.add(identifier)
        if node.get('type') not in ('rect', 'diamond', 'ellipse'):
            raise ValueError('Type de bloc non pris en charge.')
        coordinates = {key: node.get(key) for key in ('x', 'y')}
        if any(not isinstance(value, (int, float)) or not math.isfinite(value) or abs(value) > 100000 for value in coordinates.values()):
            raise ValueError('Position invalide.')
        text = node.get('text', '')
        if isinstance(text, dict):
            text = text.get('value', '')
        properties = node.get('properties') or {}
        if not isinstance(properties, dict):
            raise ValueError('Propriétés invalides.')
        nodes.append({'id': identifier, 'type': node['type'], **coordinates, 'text': str(text)[:300],
                      'properties': {key: str(properties[key])[:500] for key in ('kind', 'sessionId', 'path') if key in properties}})
    edge_ids = set()
    for edge in graph['edges']:
        if not isinstance(edge, dict):
            raise ValueError('Lien invalide.')
        source, target = edge.get('sourceNodeId'), edge.get('targetNodeId')
        identifier = str(edge.get('id') or uid('edge'))
        if not isinstance(source, str) or not isinstance(target, str) or source not in identifiers or target not in identifiers or identifier in edge_ids or len(identifier) > 100:
            raise ValueError('Lien invalide, orphelin ou dupliqué.')
        edge_ids.add(identifier)
        text = edge.get('text', '')
        if isinstance(text, dict):
            text = text.get('value', '')
        edges.append({'id': identifier, 'sourceNodeId': source, 'targetNodeId': target,
                      'type': 'polyline', 'text': str(text)[:200]})
    return {'nodes': nodes, 'edges': edges}


def save_canvas(app, data):
    project = app.project(data.get('projectId', 'atelier'))
    identifier = data.get('id') or uid('design')
    with app.store.lock:
        old = app.store.get('design', identifier) if data.get('id') else {}
        if old and (old['projectId'] != project['id'] or data.get('revision') != old['revision']):
            raise ValueError('Cette page a changé. Recharge-la avant de remplacer son contenu.')
        graph = validate_graph(data.get('graph'))
        for node in graph['nodes']:
            if node['properties'].get('path'):
                app.file_path(project['id'], node['properties']['path'])
            if node['properties'].get('sessionId'):
                session = app.store.get('session', node['properties']['sessionId'])
                if session['projectId'] != project['id']:
                    raise ValueError('Agent d’un autre projet.')
        document = {'id': identifier, 'projectId': project['id'], 'title': str(data.get('title') or 'Architecture')[:150],
                    'explanation': str(data.get('explanation', ''))[:12000], 'graph': graph,
                    'revision': old.get('revision', 0) + 1, 'updatedAt': now()}
        app.store.put('design', document)
        app.store.event('design.saved', {'id': identifier, 'revision': document['revision']}, project_id=project['id'])
        return document
