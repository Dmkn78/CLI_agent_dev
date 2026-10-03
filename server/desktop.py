"""Explicit local desktop launches and native folder selection. No account copying."""
import os
import shutil
import subprocess
import sys
from pathlib import Path

from .process_environment import agent_environment


def open_desktop(root, port, mode):
    root = Path(root)
    if mode not in ('chat', 'code', 'project'):
        raise ValueError('Mode desktop invalide.')
    packaged = os.environ.get('ATELIER_DESKTOP_EXECUTABLE')
    binary = 'electron.exe' if os.name == 'nt' else 'Electron.app/Contents/MacOS/Electron' if sys.platform == 'darwin' else 'electron'
    executable = Path(packaged) if packaged else root / 'node_modules' / 'electron' / 'dist' / binary
    if not executable.is_file():
        raise ValueError('Shell desktop non installé. Exécute npm ci et npm run vendor.')
    env = {**agent_environment(), 'ATELIER_URL': f'http://127.0.0.1:{port}/'}
    env.pop('ELECTRON_RUN_AS_NODE', None)
    if not packaged and sys.platform == 'darwin':
        # Electron runs as a console-only Node bootstrap, then opens a branded
        # Atelier.app. The bootstrap cannot create another Dock application.
        node = env.get('ATELIER_NODE_EXECUTABLE') or shutil.which('node', path=env.get('PATH'))
        if not node:
            env['ELECTRON_RUN_AS_NODE'] = '1'
        arguments = [node or str(executable), str(root / 'scripts/launch-desktop.cjs'), '--atelier-' + mode]
    else:
        arguments = [str(executable), '--atelier-' + mode] if packaged else [str(executable), str(root / 'desktop/main.cjs'), '--atelier-' + mode]
    process = subprocess.Popen(arguments,
                               cwd=str(root), env=env, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    return {'opened': True, 'pid': process.pid, 'mode': mode}


def pick_directory():
    if os.name != 'nt':
        raise ValueError('Utilise le bouton Parcourir dans le shell desktop pour cet ordinateur.')
    script = "Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description='Choisir le dossier du projet Atelier'; if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }; $d.Dispose()"
    result = subprocess.run(['powershell.exe', '-NoProfile', '-STA', '-Command', script],
                            capture_output=True, text=True, timeout=180, creationflags=subprocess.CREATE_NO_WINDOW)
    if result.returncode:
        raise ValueError('Le sélecteur de dossier est indisponible. Utilise le shell desktop.')
    return {'path': result.stdout.strip() or None}
