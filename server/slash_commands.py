"""Project prompt commands and discoverable skills, without implicit execution."""
import os
import re
from pathlib import Path

from .store import now, uid

MAX_COMMANDS = 80
MAX_COMMAND_CHARACTERS = 16000
COMMAND_NAME = re.compile(r'[a-z0-9][a-z0-9_-]{0,59}')


class SlashCommands:
    def __init__(self, app) -> None:
        self.app, self.store = app, app.store

    def catalog(self, project_id: str) -> list[dict]:
        from .app import IGNORED
        root = self.app.file_path(project_id)
        commands = [command for command in self.store.all('command') if command['projectId'] == project_id]
        names = {command['name'] for command in commands}
        excluded = {part.casefold() for part in IGNORED}
        roots = [root]
        agent_skills = root / '.agents' / 'skills'
        if agent_skills.is_dir() and not agent_skills.is_symlink() and not agent_skills.parent.is_symlink():
            roots.append(agent_skills)
        visited = 0
        for scan_root in roots:
            for directory, directories, files in os.walk(scan_root):
                visited += 1
                if visited > 500 or len(commands) >= MAX_COMMANDS:
                    break
                directories[:] = sorted(name for name in directories if name.casefold() not in excluded
                                        and not name.startswith('.') and not (Path(directory) / name).is_symlink())
                skill = Path(directory) / 'SKILL.md'
                if 'SKILL.md' not in files or skill.is_symlink():
                    continue
                name = re.sub(r'[^a-z0-9_-]+', '-', Path(directory).name.lower()).strip('-')[:60]
                if not COMMAND_NAME.fullmatch(name) or name in names:
                    continue
                names.add(name)
                commands.append({'id': 'skill:' + name, 'projectId': project_id, 'name': name,
                                 'description': 'Skill du projet', 'kind': 'skill', 'path': skill.relative_to(root).as_posix()})
        return sorted(commands, key=lambda command: command['name'])

    def save(self, submitted: dict) -> dict:
        project = self.app.project(submitted.get('projectId', 'atelier'))
        name, prompt = submitted.get('name', ''), submitted.get('prompt', '')
        if not isinstance(name, str) or not COMMAND_NAME.fullmatch(name):
            raise ValueError('Nom de commande : lettres minuscules, chiffres, tirets ou underscores (60 caractères).')
        if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > MAX_COMMAND_CHARACTERS:
            raise ValueError('Consigne de commande : 1 à 16 000 caractères.')
        existing = next((command for command in self.catalog(project['id']) if command['name'] == name), None)
        if existing and existing['kind'] == 'skill':
            raise ValueError('Ce nom appartient déjà à un skill du projet.')
        if not existing and len(self.catalog(project['id'])) >= MAX_COMMANDS:
            raise ValueError('La limite de 80 commandes est atteinte.')
        command = {'id': existing['id'] if existing else uid('command'), 'projectId': project['id'], 'name': name,
                   'description': str(submitted.get('description', ''))[:160], 'prompt': prompt.strip(),
                   'kind': 'prompt', 'updatedAt': now()}
        return self.store.put('command', command)

    def remove(self, project_id: str, identifier: str) -> dict:
        command = self.store.get('command', identifier)
        if command['projectId'] != project_id:
            raise ValueError('Commande d’un autre projet.')
        self.store.delete('command', identifier)
        return {'ok': True}

    def expand(self, project_id: str, text: str) -> str:
        match = re.match(r'^/([a-z0-9_-]+)(?:\s+([\s\S]*))?$', text.strip())
        if not match:
            return text
        name, arguments = match.group(1), match.group(2) or ''
        command = next((command for command in self.catalog(project_id) if command['name'] == name), None)
        if not command:
            raise ValueError('Commande /' + name + ' inconnue. Choisis une commande proposée ou crée-la.')
        if command['kind'] == 'skill':
            path = self.app.file_path(project_id, command['path'])
            if path.stat().st_size > 512 * 1024:
                raise ValueError('Skill trop volumineux.')
            contents = path.read_text(encoding='utf-8-sig')
            prompt = '## Skill explicitement choisi par l’utilisateur\n\n' + contents[:MAX_COMMAND_CHARACTERS]
            if len(contents) > MAX_COMMAND_CHARACTERS:
                prompt += '\n\nExtrait du skill tronqué ; source complète : ' + command['path']
        else:
            prompt = command['prompt'].replace('{args}', arguments)
        if command['kind'] == 'skill' or '{args}' not in command.get('prompt', ''):
            prompt += '\n\n## Demande\n\n' + arguments
        return '# Commande /' + name + '\n\nChoisie par l’utilisateur ; les permissions de cette discussion restent en vigueur.\n\n' + prompt
