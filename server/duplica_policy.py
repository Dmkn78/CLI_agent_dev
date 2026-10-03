"""Explicit delegation rules. Observations and agent text never grant authority."""
import re
import shlex
import unicodedata
from dataclasses import dataclass
from pathlib import Path


DEFAULT_PERMISSIONS = {
    'workspace_read': 'auto', 'workspace_write': 'ask', 'run_tests': 'auto',
    'run_build': 'auto', 'run_local_application': 'ask', 'continue_agent': 'auto',
    'answer_known_question': 'auto', 'approve_plan': 'ask', 'approve_architecture': 'auto',
    'computer_control': 'ask', 'keyboard_mouse': 'ask', 'browser_control': 'ask',
    'install_project_dependencies': 'ask', 'git_status': 'auto', 'git_diff': 'auto',
    'git_commit': 'ask', 'git_push': 'ask', 'production_deploy': 'ask',
    'public_publish': 'ask', 'payment': 'ask', 'read_secrets': 'deny',
    'send_private_data': 'ask', 'destructive_system_operation': 'deny',
    'unknown': 'ask',
}
PRIVATE_PARTS = {'.atelier', '.duplica', '.git', '.codex', '.aws', '.ssh'}
SENSITIVE_CATEGORIES = {'git_push', 'production_deploy', 'public_publish', 'payment',
                        'read_secrets', 'send_private_data', 'unknown'}


@dataclass(frozen=True)
class PermissionVerdict:
    category: str
    mode: str
    reason: str
    source: str


def normalize_question(question: str) -> str:
    normalized = unicodedata.normalize('NFKC', question).casefold()
    return ' '.join(normalized.split()).strip(' ?.!')


def validate_permissions(changes: dict) -> dict:
    if not isinstance(changes, dict):
        raise ValueError('Les permissions doivent être un objet.')
    for category, mode in changes.items():
        if category not in DEFAULT_PERMISSIONS or mode not in ('auto', 'ask', 'deny'):
            raise ValueError('Permission Duplica invalide : ' + str(category))
        if category == 'destructive_system_operation' and mode != 'deny':
            raise ValueError('Les opérations système destructrices restent interdites.')
        if category in SENSITIVE_CATEGORIES and mode == 'auto':
            raise ValueError('Cette action sensible exige une décision ponctuelle : ' + category)
    return dict(changes)


def project_path(workspace: str, path: str) -> Path:
    root = Path(workspace).resolve()
    candidate = (root / path).resolve()
    try:
        parts = candidate.relative_to(root).parts
    except ValueError:
        raise ValueError('Action hors du dossier de travail.')
    if any(part.casefold() in PRIVATE_PARTS or part.casefold().startswith('.env') for part in parts):
        raise ValueError('Action sur un fichier privé exclu.')
    return candidate


def classify_command(command: str) -> str:
    # Compound commands are not classified from a benign-looking prefix.
    if not isinstance(command, str) or re.search(r'[;&|`$><\r\n]', command):
        return 'unknown'
    try:
        arguments = shlex.split(command, posix=True)
    except ValueError:
        return 'unknown'
    if not arguments:
        return 'unknown'
    if '/' in arguments[0] or '\\' in arguments[0] or ':' in arguments[0]:
        return 'unknown'
    executable = arguments[0].replace('\\', '/').rsplit('/', 1)[-1].lower().removesuffix('.exe')
    tail = arguments[1:]
    if executable == 'git':
        if tail == ['status'] or tail == ['status', '--short']:
            return 'git_status'
        if tail in (['diff'], ['diff', '--stat'], ['diff', '--check'], ['diff', '--cached']):
            return 'git_diff'
        if tail and tail[0] == 'push':
            return 'git_push'
        if tail and tail[0] == 'commit':
            return 'git_commit'
    if executable in ('python', 'python3', 'python3.12'):
        if tail == ['-m', 'unittest', 'discover', '-s', 'tests', '-v'] or tail == ['-m', 'pytest']:
            return 'run_tests'
    if executable in ('pytest',) and not tail:
        return 'run_tests'
    if executable == 'npm':
        if tail in (['test'], ['run', 'test']):
            return 'run_tests'
        if tail == ['run', 'build']:
            return 'run_build'
        if tail in (['ci'], ['install']):
            return 'install_project_dependencies'
    return 'unknown'


def approval_verdict(approval: dict, session: dict, permissions: dict) -> PermissionVerdict:
    method, parameters = approval['method'], approval.get('params', {})
    category = 'unknown'
    if method == 'item/commandExecution/requestApproval':
        try:
            cwd = Path(parameters.get('cwd') or session['workingPath']).resolve()
            if cwd != Path(session['workingPath']).resolve():
                return PermissionVerdict('unknown', 'ask', 'Commande dans un autre dossier.', 'scope:workspace')
        except (ValueError, TypeError):
            return PermissionVerdict('unknown', 'ask', 'Dossier de commande indéterminé.', 'scope:workspace')
        category = classify_command(parameters.get('command'))
    elif method == 'item/fileChange/requestApproval':
        changes = parameters.get('changes') or {}
        paths = list(changes) if isinstance(changes, dict) else []
        if not paths:
            return PermissionVerdict('workspace_write', 'ask', 'Les chemins modifiés ne sont pas établis.', 'scope:workspace')
        try:
            for path in paths:
                project_path(session['workingPath'], path)
        except (ValueError, TypeError):
            return PermissionVerdict('workspace_write', 'deny', 'Fichier hors périmètre ou privé.', 'scope:workspace')
        category = 'workspace_write'
    # A permissions grant may include network or arbitrary paths. Never infer it from its label.
    if category in ('workspace_write', 'install_project_dependencies', 'git_commit') and (
            session.get('sandbox') != 'workspace-write' or
            session.get('planMode') and session.get('planningStage') != 'implementation'):
        return PermissionVerdict(category, 'deny', 'Le profil de cette session interdit cette écriture.', 'session:sandbox')
    mode = permissions.get(category, DEFAULT_PERMISSIONS[category])
    return PermissionVerdict(category, mode, 'Politique explicite : ' + category + ' = ' + mode,
                             'permissions:' + category)


def known_answer(question: str, decisions: list, project_id: str) -> tuple:
    normalized = normalize_question(question)
    matches = [decision for decision in decisions if decision.get('active', True) and
               decision.get('projectId') in (None, project_id) and
               normalized in [normalize_question(text) for text in decision.get('questions', [])]]
    local = [decision for decision in matches if decision.get('projectId') == project_id]
    matches = local or matches
    if not matches or len({decision['answer'] for decision in matches}) != 1:
        return None, []
    return matches[-1]['answer'], [decision['id'] for decision in matches]


def agent_status(session: dict, approvals: list) -> str:
    pending = [approval for approval in approvals if approval['sessionId'] == session['id']]
    if pending:
        return 'WAITING_INPUT' if any(a['method'] == 'item/tool/requestUserInput' for a in pending) else 'WAITING_PERMISSION'
    if session.get('status') == 'waiting_plan':
        return 'WAITING_USER'
    if session.get('processAlive') is False and session.get('status') in ('running', 'waiting', 'ready'):
        return 'CRASHED'
    return {'running': 'RUNNING', 'initializing': 'RUNNING', 'waiting': 'WAITING_USER',
            'failed': 'FAILED', 'stopped': 'INTERRUPTED', 'closed': 'FINISHED',
            'ready': 'FINISHED' if session.get('lastTurnStatus') == 'completed' else 'IDLE'}.get(session.get('status'), 'IDLE')
