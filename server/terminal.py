"""Prepare local terminal launches without shell-interpolated user arguments."""
import base64
import json
import os
import shlex
import shutil
import subprocess


def powershell_literal(value):
    literal = str(value)
    # PowerShell treats typographic apostrophes as string delimiters too.
    for apostrophe in ("'", '\u2018', '\u2019'):
        literal = literal.replace(apostrophe, apostrophe + apostrophe)
    return "'" + literal + "'"


def terminal_plan(cwd, command, sandbox, runtime):
    if os.name == 'nt':
        script = 'Set-Location -LiteralPath ' + powershell_literal(cwd) + '\n& ' + ' '.join(powershell_literal(argument) for argument in command)
    else:
        script = 'cd ' + shlex.quote(str(cwd)) + '\n' + shlex.join(command)
    return {'cwd': str(cwd), 'argv': command, 'script': script, 'display': script,
            'sandbox': sandbox, 'runtime': runtime, 'tracked': False}


def prepare_codex(cwd, settings, models):
    executable = os.environ.get('ATELIER_CODEX_EXECUTABLE') or shutil.which('codex')
    if not executable:
        raise ValueError('Codex est absent du PATH.')
    model = next((entry for entry in models if entry['model'] == settings.get('model')), None)
    if not model or settings.get('effort') not in [entry['reasoningEffort'] for entry in model.get('supportedReasoningEfforts', [])]:
        raise ValueError('Choisis un modèle et un effort du catalogue Codex.')
    sandbox = settings.get('sandbox', 'read-only')
    if sandbox not in ('read-only', 'workspace-write'):
        raise ValueError('Profil de permissions invalide.')
    instructions = 'Rôle: ' + str(settings.get('role', 'developer')) + '. Périmètre: ' + str(cwd) + '. Ne lance pas de sous-agent. Attends la mission de l’utilisateur.'
    command = [executable, '--model', model['model'], '--sandbox', sandbox, '--ask-for-approval', 'on-request',
               '-c', 'model_reasoning_effort=' + json.dumps(settings['effort']), '-c', 'features.multi_agent=false',
               '-c', 'developer_instructions=' + json.dumps(instructions, ensure_ascii=False)]
    return terminal_plan(cwd, command, sandbox, 'codex')


def prepare_claude(cwd, settings):
    executable = shutil.which('claude')
    if not executable:
        raise ValueError('Claude Code est absent du PATH.')
    if settings.get('sandbox', 'read-only') != 'read-only':
        raise ValueError('Claude Code : mode plan uniquement dans ce parcours initial.')
    return terminal_plan(cwd, [executable, '--permission-mode', 'plan'], 'read-only', 'claude')


def prepare_opencode(cwd, settings):
    executable = shutil.which('opencode')
    if not executable:
        raise ValueError('OpenCode est absent du PATH.')
    if settings.get('sandbox', 'read-only') != 'read-only':
        raise ValueError('OpenCode : mode plan uniquement dans ce parcours initial.')
    return terminal_plan(cwd, [executable, '--agent', 'plan'], 'read-only', 'opencode')


def prepare_omp(cwd, settings, models):
    executable = shutil.which('omp')
    if not executable:
        raise ValueError('Oh My Pi est absent du PATH.')
    command = [executable, '--no-title', '--no-extensions', '--no-lsp', '--approval-mode', 'always-ask']
    login_provider = settings.get('loginProvider')
    if login_provider:
        if not isinstance(login_provider, str) or not all(c.isalnum() or c in '-_.' for c in login_provider):
            raise ValueError('Identifiant de fournisseur invalide.')
        command += ['--no-tools', '/login ' + login_provider]
    else:
        catalog = {m['model']: m for m in models}
        model = settings.get('model')
        if model not in catalog:
            raise ValueError('Choisis un modèle disponible dans le catalogue OMP.')
        effort = settings.get('effort', 'off')
        if effort not in [e['reasoningEffort'] for e in catalog[model]['supportedReasoningEfforts']]:
            raise ValueError('Effort non pris en charge par ce modèle OMP.')
        command += ['--model', model, '--thinking', effort]
        for role in ('plan', 'slow', 'smol'):
            selected = settings.get(role)
            if selected:
                if selected not in catalog:
                    raise ValueError('Modèle de rôle absent du catalogue OMP.')
                command += ['--' + role, selected]
        # Terminal mode has no OS sandbox: expose reading tools only.
        if settings.get('sandbox', 'read-only') != 'read-only':
            raise ValueError('Le terminal OMP propose la lecture seule. Utilise les sessions Atelier pour les écritures approuvées.')
        command += ['--tools', 'read,grep,glob', '--no-skills', '--no-rules']
        role = str(settings.get('role', 'researcher'))
        command += ['--append-system-prompt', 'Rôle: ' + role + '. Périmètre: ' + str(cwd) +
                    '. Lecture seule. Ne lance aucun sous-agent. Attends la mission de l’utilisateur.']
    return terminal_plan(cwd, command, 'read-only', 'omp')


def launch_terminal(plan):
    if os.name == 'nt':
        encoded = base64.b64encode(plan['script'].encode('utf-16-le')).decode('ascii')
        process = subprocess.Popen(['powershell.exe', '-NoProfile', '-NoExit', '-EncodedCommand', encoded],
                                   cwd=plan['cwd'], creationflags=subprocess.CREATE_NEW_CONSOLE)
        return {'opened': True, 'pid': process.pid}
    terminal = shutil.which('x-terminal-emulator') or shutil.which('xterm')
    if terminal:
        process = subprocess.Popen([terminal, '-e', 'sh', '-c', plan['script']], cwd=plan['cwd'])
        return {'opened': True, 'pid': process.pid}
    if shutil.which('osascript'):
        escaped = json.dumps(plan['script'])
        subprocess.run(['osascript', '-e', 'tell application "Terminal" to do script ' + escaped], check=True)
        return {'opened': True}
    raise ValueError('Aucun terminal compatible détecté. La commande préparée reste disponible.')
