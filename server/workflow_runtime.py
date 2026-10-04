"""Validate a bounded task graph and schedule compatible work in batches."""
import re
from pathlib import Path, PurePosixPath


PRIVATE_PARTS = {'.atelier', '.duplica', '.git', '.codex', '.aws', '.ssh'}


def normalize_tasks(tasks, max_tasks=20, workspace=None):
    if not isinstance(max_tasks, int) or isinstance(max_tasks, bool) or not 1 <= max_tasks <= 20:
        raise ValueError('Choisis 1 à 20 tâches maximum.')
    if not isinstance(tasks, list) or not 1 <= len(tasks) <= max_tasks:
        raise ValueError('Le plan doit contenir 1 à ' + str(max_tasks) + ' tâches.')
    normalized = []
    identifiers = set()
    root = Path(workspace).resolve() if workspace is not None else None
    for index, task in enumerate(tasks):
        if not isinstance(task, dict):
            raise ValueError('Chaque tâche doit être un objet.')
        title, prompt = task.get('title'), task.get('prompt')
        if not isinstance(title, str) or not title.strip() or len(title) > 200:
            raise ValueError('Chaque tâche requiert un titre de 1 à 200 caractères.')
        if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 20000:
            raise ValueError('Chaque tâche requiert des consignes de 1 à 20 000 caractères.')
        identifier = task.get('id', 'task_' + str(index + 1))
        if not isinstance(identifier, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', identifier) or identifier in identifiers:
            raise ValueError('Les identifiants de tâche doivent être uniques et simples.')
        identifiers.add(identifier)
        files = task.get('files', [])
        dependencies = task.get('dependsOn', [])
        if not isinstance(files, list) or len(files) > 100 or not isinstance(dependencies, list) or len(dependencies) > max_tasks:
            raise ValueError('Fichiers et dépendances doivent être des listes bornées.')
        owned = []
        for value in files:
            if not isinstance(value, str) or not value.strip() or len(value) > 1000:
                raise ValueError('Chemin de tâche invalide.')
            value = value.replace('\\', '/')
            path = PurePosixPath(value)
            if (path.is_absolute() or '..' in path.parts or str(path) == '.' or
                    re.search(r'[:*?\x00-\x1f]', value) or any(
                        part.casefold() in PRIVATE_PARTS or part.casefold().startswith('.env') for part in path.parts)):
                raise ValueError('Un fichier de tâche doit rester dans le projet et hors des fichiers privés.')
            name = str(path)
            if root is not None:
                try:
                    resolved = (root / name).resolve().relative_to(root)
                except (ValueError, OSError, RuntimeError):
                    raise ValueError('Un fichier de tâche pointe hors du dossier de travail.')
                if not resolved.parts or any(part.casefold() in PRIVATE_PARTS or part.casefold().startswith('.env') for part in resolved.parts):
                    raise ValueError('Un fichier de tâche pointe vers un fichier privé.')
                name = resolved.as_posix()
            if name not in owned:
                owned.append(name)
        normalized.append({'id': identifier, 'title': title.strip(), 'prompt': prompt.strip(),
                           'files': owned, 'dependsOn': dependencies, 'index': index})
    for task in normalized:
        dependencies = []
        for dependency in task['dependsOn']:
            if isinstance(dependency, int) and not isinstance(dependency, bool):
                if not 0 <= dependency < len(normalized):
                    raise ValueError('Indice de dépendance introuvable (indices à partir de zéro).')
                dependency = normalized[dependency]['id']
            if not isinstance(dependency, str) or dependency not in identifiers or dependency == task['id']:
                raise ValueError('Dépendance de tâche introuvable ou vers elle-même.')
            if dependency not in dependencies:
                dependencies.append(dependency)
        task['dependsOn'] = dependencies
    visited, visiting = set(), set()
    graph = {task['id']: task['dependsOn'] for task in normalized}
    def visit(identifier):
        if identifier in visiting:
            raise ValueError('Le plan contient un cycle de dépendances.')
        if identifier in visited:
            return
        visiting.add(identifier)
        for dependency in graph[identifier]:
            visit(dependency)
        visiting.remove(identifier)
        visited.add(identifier)
    for identifier in graph:
        visit(identifier)
    return normalized


def files_conflict(left, right):
    """Unknown ownership conflicts with every writer, including directory overlap."""
    if not left or not right:
        return True
    for left_path in left:
        for right_path in right:
            a, b = left_path.casefold(), right_path.casefold()
            if a == b or a.startswith(b + '/') or b.startswith(a + '/'):
                return True
    return False


def next_batch(tasks, completed, worker_count, write_enabled=False):
    if not isinstance(worker_count, int) or isinstance(worker_count, bool) or not 1 <= worker_count <= 8:
        raise ValueError('Configure 1 à 8 sous-agents.')
    completed = set(completed)
    batch = []
    for task in tasks:
        if task['id'] in completed or not set(task['dependsOn']).issubset(completed):
            continue
        if write_enabled and any(files_conflict(task['files'], other['files']) for other in batch):
            continue
        batch.append(task)
        if len(batch) == worker_count:
            break
    return batch
