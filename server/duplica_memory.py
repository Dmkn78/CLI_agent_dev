"""Private disk mirrors of user context, decisions, observations, and execution state."""
import json
import re
import threading
from pathlib import Path

from .store import redact


CONTEXT_FILES = {'user': 'USER.md', 'preferences': 'USER_PREFERENCES.md', 'project': 'PROJECT.md',
                 'requirements': 'REQUIREMENTS.md', 'permissions': 'PERMISSIONS.md',
                 'testing': 'TESTING.md', 'environment': 'ENVIRONMENT.md'}


class DuplicaMemory:
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self.lock = threading.RLock()

    def scope_directory(self, project_id: str = None) -> Path:
        if project_id is not None and not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}', project_id):
            raise ValueError('Identifiant de projet Duplica invalide.')
        return self.directory / 'projects' / project_id if project_id else self.directory / 'global'

    def write_context(self, context: dict) -> None:
        directory = self.scope_directory(context.get('projectId')) / 'context'
        for key, filename in CONTEXT_FILES.items():
            if key in context or not (directory / filename).exists():
                self.write(directory / filename, '# ' + key.capitalize() + '\n\n' + str(context.get(key, 'Non renseigné.')) + '\n')

    def write(self, path: Path, content) -> None:
        with self.lock:
            path.parent.mkdir(parents=True, exist_ok=True)
            text = content if isinstance(content, str) else json.dumps(content, ensure_ascii=False, indent=2)
            temporary = path.with_suffix(path.suffix + '.tmp')
            temporary.write_text(redact(text), encoding='utf-8')
            temporary.replace(path)

    def append_event(self, event: dict) -> None:
        with self.lock:
            path = self.directory / 'state' / 'EVENTS.jsonl'
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open('a', encoding='utf-8') as stream:
                stream.write(json.dumps(redact(event), ensure_ascii=False) + '\n')

    def sync(self, store) -> None:
        with self.lock:
            for project_id in [None] + [project['id'] for project in store.all('project')]:
                directory = self.scope_directory(project_id)
                decisions = [decision for decision in store.all('duplicaDecision') if decision.get('projectId') == project_id]
                content = '# Décisions validées par l’utilisateur\n\n'
                for decision in decisions:
                    content += ('## ' + decision['id'] + '\n\nQuestions reconnues :\n' +
                                '\n'.join('- ' + question for question in decision['questions']) +
                                '\n\nRéponse : ' + decision['answer'] + '\n\nSource : ' + decision['source'] +
                                '\nDate : ' + decision['createdAt'] + '\nActive : ' + str(decision.get('active', True)) + '\n\n')
                self.write(directory / 'context' / 'DECISIONS.md', content)
            self.write(self.directory / 'state' / 'CURRENT_STATE.json', {
                'settings': store.all('duplicaSettings'), 'scopes': store.all('duplicaScope'),
                'missions': store.all('duplicaMission'), 'pending': store.all('duplicaRequest')})
            bugs = store.all('duplicaObservation')
            self.write(self.directory / 'observations' / 'BUGS.md', '# Observations\n\n' +
                       '\n\n'.join('## ' + bug['id'] + '\n\n' + bug['report'] for bug in bugs))
            self.write(self.directory / 'state' / 'AGENTS.json', [
                {key: session.get(key) for key in ('id', 'name', 'projectId', 'role', 'model', 'mission', 'status', 'taskId',
                    'sandbox', 'createdAt', 'lastActivityAt', 'lastTurnStatus', 'workingPath', 'parentId')}
                for session in store.all('session')])
