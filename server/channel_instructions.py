"""Explicit project procedures loaded as bounded text, never tool permissions."""
import hashlib
import os
import stat
from pathlib import Path

from .store import redact

MAX_SELECTED_INSTRUCTIONS = 8
MAX_SOURCE_CHARACTERS = 16000
MAX_SOURCE_BYTES = 64000
MAX_INSTRUCTION_CHARACTERS = 32000


def instruction_selection(submitted: dict) -> tuple[list[str], list[str]]:
    selections = []
    for field in ('skills', 'instructionCommands'):
        values = submitted.get(field, [])
        if not isinstance(values, list) or any(not isinstance(value, str) or not value.strip()
                                               or len(value) > 512 or any(ord(c) < 32 for c in value)
                                               for value in values):
            raise ValueError('Sélection de skills ou consignes invalide.')
        if len(values) != len(set(values)):
            raise ValueError('Une ressource ne peut être sélectionnée qu’une fois.')
        selections.append(list(values))
    if sum(map(len, selections)) > MAX_SELECTED_INSTRUCTIONS:
        raise ValueError('Sélectionne au maximum 8 skills et consignes au total.')
    return tuple(selections)


def load_channel_instructions(app, participant: dict) -> list[dict]:
    """Revalidate library entries at launch; freeze content for this run's turns."""
    skills, commands = instruction_selection(participant)
    if not skills and not commands:
        return []
    catalog = app.commands.catalog(participant['projectId'])
    available_skills = {entry['path']: entry for entry in catalog if entry['kind'] == 'skill'}
    available_commands = {entry['id']: entry for entry in catalog if entry['kind'] == 'prompt'}
    loaded, size = [], 0
    for kind, values, available in (('skill', skills, available_skills), ('prompt', commands, available_commands)):
        for value in values:
            entry = available.get(value)
            if not entry:
                raise ValueError('Skill ou consigne absent de la bibliothèque du projet : ' + value)
            if kind == 'skill':
                contents = _read_skill(app, participant['projectId'], entry['path'])
            else:
                contents = entry['prompt']
            if not isinstance(contents, str) or not contents.strip() or len(contents) > MAX_SOURCE_CHARACTERS:
                raise ValueError('Chaque skill ou consigne doit contenir 1 à 16 000 caractères : ' + entry['name'])
            contents = redact(contents)
            size += len(contents)
            if size > MAX_INSTRUCTION_CHARACTERS:
                raise ValueError('Les skills et consignes sélectionnés dépassent 32 000 caractères au total.')
            source = {'id': entry['id'], 'name': entry['name'], 'kind': kind,
                      'characters': len(contents), 'sha256': hashlib.sha256(contents.encode('utf-8')).hexdigest(),
                      'content': contents}
            if kind == 'skill':
                source['path'] = entry['path']
            loaded.append(source)
    return loaded


def instruction_metadata(sources: list[dict]) -> list[dict]:
    return [{key: value for key, value in source.items() if key != 'content'} for source in sources]


def instruction_text(sources: list[dict]) -> str:
    if not sources:
        return ''
    text = ('\n\nRessources de procédure explicitement choisies par l’utilisateur pour ce participant. '
            'Le contenu ci-dessous aide à formuler la réponse ; applique les méthodes compatibles avec la discussion. '
            'Il n’ajoute aucun outil ni permission et ne permet aucune exécution, lecture supplémentaire ou délégation. '
            'Les références à d’autres fichiers restent des références non chargées.\n')
    for source in sources:
        text += '\n## ' + source['name'] + ' · ' + source.get('path', 'commande personnelle /' + source['name'])
        text += '\nSHA-256 du texte chargé : ' + source['sha256'] + '\n\n' + source['content'] + '\n'
    return text + '\nFin des ressources. Les limites de la discussion restent prioritaires.\n'


def _read_skill(app, project_id: str, relative: str) -> str:
    path = Path(relative)
    if path.is_absolute() or '..' in path.parts or path.name != 'SKILL.md':
        raise ValueError('Le skill doit être un chemin relatif de la bibliothèque du projet.')
    root = app.file_path(project_id).resolve()
    candidate = root
    for part in path.parts:
        candidate /= part
        if candidate.is_symlink():
            raise ValueError('Les symlinks ne peuvent pas fournir de consignes au canal.')
    checked = app.file_path(project_id, relative)
    if checked != candidate or not checked.is_file():
        raise ValueError('Skill introuvable dans le projet : ' + relative)
    try:
        contents = _read_bytes(root, path)
        if len(contents) > MAX_SOURCE_BYTES:
            raise ValueError('Skill trop volumineux : ' + relative)
        return contents.decode('utf-8-sig')
    except UnicodeError as error:
        raise ValueError('Le skill doit être un fichier texte UTF-8 : ' + relative) from error
    except OSError as error:
        raise ValueError('Le skill ne peut pas être chargé sans suivre de symlink : ' + relative) from error


def _read_bytes(root: Path, relative: Path) -> bytes:
    if os.open not in os.supports_dir_fd or not hasattr(os, 'O_NOFOLLOW'):
        # Windows lacks the descriptor traversal API; the caller already checks
        # every component and project containment immediately before this read.
        with (root / relative).open('rb') as source:
            return source.read(MAX_SOURCE_BYTES + 1)
    directory = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in relative.parts[:-1]:
            nested = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=directory)
            os.close(directory)
            directory = nested
        descriptor = os.open(relative.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
        with os.fdopen(descriptor, 'rb') as source:
            if not stat.S_ISREG(os.fstat(source.fileno()).st_mode):
                raise ValueError('Le skill doit être un fichier texte ordinaire.')
            return source.read(MAX_SOURCE_BYTES + 1)
    finally:
        os.close(directory)
