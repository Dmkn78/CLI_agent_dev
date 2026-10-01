"""Executable inventory only. A live PID does not prove a model turn is running."""
import json
import os
import subprocess


def process_inventory():
    if os.name != 'nt':
        return {'processes': [], 'note': 'Inventaire externe disponible uniquement sous Windows pour cette version.'}
    command = "@(Get-Process -Name codex,claude,omp -ErrorAction SilentlyContinue | Select-Object Id,ProcessName) | ConvertTo-Json -Compress"
    try:
        result = subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', command],
                                capture_output=True, text=True, timeout=8, creationflags=subprocess.CREATE_NO_WINDOW)
        values = json.loads(result.stdout or '[]')
        if isinstance(values, dict):
            values = [values]
        return {'processes': [{'pid': value['Id'], 'name': value['ProcessName'], 'activity': 'unknown'} for value in values],
                'note': 'Exécutables reconnus seulement. Les CLI lancés via Node/Bun et leur activité ne sont pas attribuables avec ce relevé.'}
    except (OSError, ValueError, subprocess.TimeoutExpired) as exc:
        return {'processes': [], 'note': 'Inventaire indisponible : ' + str(exc)}
