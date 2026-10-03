"""Structured, user-validated memories and safe local source discovery."""
import json
import os
from pathlib import Path
import re

from .store import redact

SCHEMA = 'atelier.memory/v1'


def normalize_memory(obj, project):
    obj.setdefault('scope', 'project')
    obj.setdefault('tags', [])
    obj.setdefault('kind', 'fait')
    obj.setdefault('core', False)
    obj.setdefault('body', '')
    obj.setdefault('source', '')
    if obj['scope'] not in ('project', 'user'):
        raise ValueError('Portée invalide.')
    if not isinstance(obj['tags'], list) or any(not isinstance(tag, str) for tag in obj['tags']):
        raise ValueError('Les mots-clés doivent être une liste de textes.')
    for field, default, maximum in [('subject', obj['title'], 300), ('author', 'Utilisateur', 200),
                                    ('why', '', 4000), ('context', '', 12000), ('occurredAt', '', 100)]:
        value = obj.get(field, default)
        if not isinstance(value, str) or len(value) > maximum:
            raise ValueError('Métadonnée de souvenir invalide : ' + field)
        obj[field] = value.strip() or default
    if obj['occurredAt']:
        from datetime import date
        date.fromisoformat(obj['occurredAt'])
    for field in ('body', 'source', 'title'):
        if not isinstance(obj[field], str):
            raise ValueError('Le souvenir doit contenir des textes.')
    obj['schemaVersion'] = SCHEMA
    obj['validationStatus'] = 'user_validated'
    obj['project'] = {key: project[key] for key in ('id', 'name', 'path')}
    source = obj['source'].strip()
    obj['source'] = source
    obj['provenance'] = {'kind': 'url' if re.match(r'^https?://', source) else 'reference' if source else 'manual',
                         'reference': source, 'projectId': project['id']}
    return obj


def memory_document(obj, project=None):
    """Compatibility projection: legacy records are exported without rewriting them."""
    return {'schema': SCHEMA, 'header': {
        'id': obj['id'], 'title': obj['title'], 'subject': obj.get('subject') or obj['title'],
        'kind': obj.get('kind', 'fait'), 'scope': obj.get('scope', 'project'),
        'project': obj.get('project') or project or {'id': obj.get('projectId')},
        'author': obj.get('author') or None, 'why': obj.get('why', ''),
        'occurred_at': obj.get('occurredAt') or None, 'created_at': obj.get('createdAt'),
        'updated_at': obj.get('updatedAt'), 'validation': obj.get('validationStatus', 'legacy_unspecified'),
        'tags': obj.get('tags', []), 'core': bool(obj.get('core')),
        'provenance': obj.get('provenance') or {'kind': 'reference' if obj.get('source') else 'manual',
                                               'reference': obj.get('source', '')}},
        'content': {'summary': obj['body'], 'context': obj.get('context', '')}}


def persist_memory(store, obj):
    """One atomic UTF-8 JSON file per saved memory, inside private application data."""
    if not re.fullmatch(r'[A-Za-z0-9_-]+', obj['id']):
        raise ValueError('Identifiant de souvenir invalide.')
    directory = store.root / 'memory'
    directory.mkdir(exist_ok=True)
    target = directory / (obj['id'] + '.json')
    temporary = target.with_suffix('.json.tmp')
    with store.lock:
        temporary.write_text(json.dumps(memory_document(obj), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(target)


def export_memory(app, id, format='json'):
    obj = app.store.get('memory', id)
    project = app.project(obj.get('projectId', 'atelier'))
    document = memory_document(obj, {key: project[key] for key in ('id', 'name', 'path')})
    if format == 'json':
        content = json.dumps(document, ensure_ascii=False, indent=2) + '\n'
        extension, media = 'json', 'application/json'
    elif format == 'markdown':
        # JSON values are also valid YAML scalars/arrays/objects; avoid ambiguous dates and quoting.
        header = '\n'.join(key + ': ' + json.dumps(value, ensure_ascii=False) for key, value in document['header'].items())
        content = '---\n' + header + '\n---\n\n# ' + obj['title'].replace('\n', ' ') + '\n\n' + obj['body'] + '\n'
        if obj.get('context'):
            content += '\n## Contexte\n\n' + obj['context'] + '\n'
        extension, media = 'md', 'text/markdown'
    else:
        raise ValueError('Format mémoire invalide.')
    return {'content': content, 'filename': obj['id'] + '.' + extension, 'mediaType': media}


def search_project_files(app, project_id, query='', relative=''):
    """Search names, not contents. Stay in the selected project and omit private paths."""
    root = app.file_path(project_id, '')
    base = app.file_path(project_id, relative)
    if not base.is_dir():
        raise ValueError('Choisis un dossier du projet.')
    needle = str(query).strip().casefold()
    entries, examined, directories, truncated = [], 0, 0, False
    for directory, dirs, files in os.walk(base, followlinks=False):
        directories += 1
        safe_dirs = []
        for name in sorted(dirs):
            candidate = Path(directory) / name
            if candidate.is_symlink():
                continue
            try:
                app.file_path(project_id, str(candidate.relative_to(root)))
            except ValueError:
                continue
            safe_dirs.append(name)
        dirs[:] = safe_dirs
        for name in sorted(files):
            examined += 1
            candidate = Path(directory) / name
            if candidate.is_symlink():
                continue
            path = candidate.relative_to(root).as_posix()
            try:
                app.file_path(project_id, path)
            except ValueError:
                continue
            if needle in path.casefold():
                entries.append({'name': name, 'path': path, 'directory': False})
            if len(entries) >= 50 or examined >= 5000:
                truncated = True
                break
        if truncated or directories >= 300:
            truncated = True
            break
    return {'projectId': project_id, 'path': relative, 'entries': entries, 'truncated': truncated}
