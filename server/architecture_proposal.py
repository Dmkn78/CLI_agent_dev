"""Architecture proposals are local documents, never code implementation grants."""
import json

from .canvas import save_canvas, validate_graph


def is_architecture(session):
    if session.get('purpose') == 'architecture':
        return True
    # Compatibility with the original drawing form, which omitted its purpose.
    mission = session.get('mission', '')
    return (session.get('name', '').startswith('Conception · ') and
            all(token in mission for token in ('"graph"', '"nodes"', '"edges"', 'Ne modifie aucun fichier')))


def import_proposal(app, session, actor):
    messages = [message for message in session.get('messages', []) if message.get('role') == 'assistant']
    if not messages:
        raise ValueError('Aucune proposition d’architecture à importer.')
    text = messages[-1].get('text', '').strip()
    if text.startswith('```') and text.endswith('```'):
        text = text.split('\n', 1)[-1].rsplit('```', 1)[0].strip()
    try:
        proposal = json.loads(text)
    except (ValueError, TypeError):
        raise ValueError('La proposition doit contenir un document JSON valide : title, explanation, graph.')
    if not isinstance(proposal, dict):
        raise ValueError('La proposition d’architecture doit être un objet JSON.')
    graph = validate_graph(proposal.get('graph'))
    if not graph['nodes']:
        raise ValueError('La proposition est vide. Demande un dessin avec des blocs avant de l’importer.')
    document = save_canvas(app, {'projectId': session['projectId'], 'title': proposal.get('title'),
                                'explanation': proposal.get('explanation', ''), 'graph': graph})
    app.store.update('design', document['id'], sourceSessionId=session['id'],
                     sourceRequestId=session.get('currentRequestId'), validatedBy=actor)
    return app.store.get('design', document['id'])
