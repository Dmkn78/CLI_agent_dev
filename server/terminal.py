"""Prepare local terminal launches without shell-interpolated user arguments."""
import base64
import json
import os
import shlex
import shutil
import subprocess


def powershell_literal(value):
    return "'" + str(value).replace("'", "''") + "'"


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
    if os.name == 'nt':
        script = 'Set-Location -LiteralPath ' + powershell_literal(cwd) + '\n& ' + ' '.join(powershell_literal(a) for a in command)
        display = script
    else:
        script = 'cd ' + shlex.quote(str(cwd)) + '\n' + shlex.join(command)
        display = script
    return {'cwd': str(cwd), 'argv': command, 'script': script, 'display': display,
            'sandbox': 'read-only', 'tracked': False}


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
