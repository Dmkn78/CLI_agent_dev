"""Independent, configured checks. Agent declarations are never test evidence."""
import hashlib
import json
import os
import subprocess
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

from .computer import ComputerUnavailable, ObservationChanged
from .duplica_policy import project_path
from .store import now, redact, uid
from .process_environment import agent_environment


def validate_recipe(recipe: dict, workspace: str) -> dict:
    if not isinstance(recipe, dict):
        raise ValueError('Définition de recette invalide.')
    if not isinstance(recipe.get('requirements', []), list) or len(recipe.get('requirements', [])) > 30:
        raise ValueError('Maximum 30 critères vérifiables.')
    requirements = []
    for requirement in recipe.get('requirements', []):
        if not isinstance(requirement, dict) or not isinstance(requirement.get('path'), str):
            raise ValueError('Chaque critère vérifie un fichier et éventuellement son contenu.')
        project_path(workspace, requirement['path'])
        requirements.append({'path': requirement['path'], 'contains': str(requirement.get('contains', ''))[:4000]})
    normalized = {'requirements': requirements}
    for stage in ('build', 'tests', 'application'):
        command = recipe.get(stage)
        if command is not None and (not isinstance(command, list) or not 1 <= len(command) <= 40 or
                not all(isinstance(argument, str) and 0 < len(argument) <= 4000 and '\x00' not in argument for argument in command)):
            raise ValueError('Une commande de recette est une liste d’arguments, sans shell : ' + stage)
        if command and Path(command[0]).name.casefold() in ('cmd', 'cmd.exe', 'powershell', 'powershell.exe', 'pwsh', 'pwsh.exe', 'sh', 'bash'):
            raise ValueError('Les recettes n’acceptent pas de shell intermédiaire.')
        normalized[stage] = command
    normalized['buildNotApplicable'] = recipe.get('buildNotApplicable') is True
    steps = recipe.get('gui', [])
    if not isinstance(steps, list) or len(steps) > 40:
        raise ValueError('Maximum 40 étapes de recette interface.')
    normalized['gui'] = []
    for step in steps:
        if not isinstance(step, dict) or step.get('kind') not in ('open_url', 'click', 'double_click', 'type_text', 'press_key', 'scroll', 'expect'):
            raise ValueError('Étape de recette interface inconnue.')
        cleaned = {key: step[key] for key in ('kind', 'label', 'text', 'key', 'deltaY', 'url') if key in step}
        if step['kind'] == 'open_url':
            address = urlparse(str(step.get('url', '')))
            if address.scheme != 'http' or address.hostname not in ('localhost', '127.0.0.1', '::1') or address.username or address.password:
                raise ValueError('La recette navigateur doit cibler une application HTTP locale.')
        if step['kind'] in ('click', 'double_click') and not str(step.get('label', '')).strip():
            raise ValueError('Une étape de clic désigne le libellé exact du contrôle.')
        if step['kind'] == 'expect' and not str(step.get('text', '')).strip():
            raise ValueError('Le résultat interface attendu est obligatoire.')
        if len(json.dumps(cleaned)) > 9000:
            raise ValueError('Étape interface trop longue.')
        normalized['gui'].append(cleaned)
    return normalized


class MissionVerifier:
    def __init__(self, app, computer, directory: Path) -> None:
        self.app, self.computer, self.directory = app, computer, directory
        self.cancelled = threading.Event()
        self.process = None
        self.application = None

    def cancel(self) -> None:
        self.cancelled.set()
        process = self.process
        if process and process.poll() is None:
            process.terminate()
        self.close_application()

    def close_application(self) -> None:
        application = self.application
        self.application = None
        if application and application.poll() is None:
            application.terminate()
            try:
                application.wait(timeout=2)
            except subprocess.TimeoutExpired:
                application.kill()
                application.wait(timeout=2)

    def verify(self, mission: dict, session: dict) -> dict:
        self.cancelled.clear()
        recipe = mission['recipe']
        checks = []
        try:
            checks.append(self._requirements(recipe, session['workingPath']))
            for stage in ('build', 'tests'):
                if self.cancelled.is_set():
                    raise ValueError('Recette annulée par reprise de contrôle.')
                if recipe.get(stage):
                    checks.append(self._command(stage, recipe[stage], session['workingPath'], mission['id']))
                else:
                    checks.append({'stage': stage, 'status': 'pass' if stage == 'build' and recipe['buildNotApplicable'] else 'not_run',
                                   'detail': 'Sans compilation, selon la configuration utilisateur.' if stage == 'build' and recipe['buildNotApplicable'] else 'Commande non définie.'})
            if recipe.get('application'):
                self._start_application(recipe['application'], session['workingPath'], mission['id'])
            checks.append(self._gui(recipe))
        except (PermissionError, FileNotFoundError, ComputerUnavailable) as error:
            checks.append({'stage': 'runtime', 'status': 'cancelled' if self.cancelled.is_set() else 'not_run',
                           'detail': redact(str(error)), 'reason': 'Preuve inaccessible ou outil indisponible ; intervention nécessaire.'})
        except Exception as error:
            checks.append({'stage': 'runtime', 'status': 'cancelled' if self.cancelled.is_set() else 'fail', 'detail': redact(str(error))})
        finally:
            self.close_application()
        result = {'id': uid('verification'), 'missionId': mission['id'], 'sessionId': session['id'],
                  'projectId': session['projectId'], 'configurationId': mission.get('configurationId'), 'createdAt': now(), 'checks': checks,
                  'passed': bool(checks) and all(check['status'] == 'pass' for check in checks),
                  'cancelled': self.cancelled.is_set(), 'source': 'duplica:independent-verifier'}
        self.directory.mkdir(parents=True, exist_ok=True)
        report = self.directory / (result['id'] + '.json')
        content = json.dumps(redact(result), ensure_ascii=False, indent=2).encode('utf-8')
        report.write_bytes(content)
        result['artifact'] = {'path': str(report), 'sha256': hashlib.sha256(content).hexdigest()}
        return result

    def _requirements(self, recipe: dict, workspace: str) -> dict:
        if not recipe['requirements']:
            return {'stage': 'requirements', 'status': 'not_run', 'detail': 'Aucun critère de fichier vérifiable défini.'}
        outcomes = []
        for requirement in recipe['requirements']:
            path = project_path(workspace, requirement['path'])
            exists = path.is_file()
            passed = exists
            if exists and requirement['contains']:
                passed = path.stat().st_size <= 512000 and requirement['contains'] in path.read_text(encoding='utf-8')
            outcomes.append({'path': requirement['path'], 'passed': passed})
        return {'stage': 'requirements', 'status': 'pass' if all(outcome['passed'] for outcome in outcomes) else 'fail', 'files': outcomes}

    def _command(self, stage: str, command: list, workspace: str, mission_id: str) -> dict:
        self.directory.mkdir(parents=True, exist_ok=True)
        path = self.directory / (uid('command') + '.log')
        deadline = time.monotonic() + 60
        with path.open('wb') as stream:
            self.process = subprocess.Popen(command, cwd=workspace, stdout=stream, stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL, shell=False, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
                env={**agent_environment(), 'PYTHONDONTWRITEBYTECODE': '1'})
            try:
                while self.process.poll() is None:
                    if self.cancelled.wait(0.1) or time.monotonic() > deadline:
                        self.process.terminate()
                        try:
                            self.process.wait(timeout=2)
                        except subprocess.TimeoutExpired:
                            self.process.kill()
                            self.process.wait(timeout=2)
                        raise ValueError('Recette annulée ou délai de 60 secondes dépassé.')
                exit_code = self.process.returncode
            finally:
                self.process = None
        output = redact(path.read_bytes()[:64000].decode('utf-8', errors='replace'))
        content = output.encode('utf-8')
        path.write_bytes(content)
        return {'stage': stage, 'status': 'pass' if exit_code == 0 else 'fail', 'exitCode': exit_code,
                'command': command, 'output': output, 'artifact': {'path': str(path), 'sha256': hashlib.sha256(content).hexdigest()}}

    def _start_application(self, command: list, workspace: str, mission_id: str) -> None:
        path = self.directory / (uid('application') + '.log')
        with path.open('wb') as stream:
            self.application = subprocess.Popen(command, cwd=workspace, stdout=stream, stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL, shell=False, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0, env=agent_environment())
        if self.cancelled.wait(1):
            raise ValueError('Lancement d’application annulé.')
        if self.application.poll() is not None:
            raise ValueError('L’application de recette s’est arrêtée : ' + redact(path.read_bytes()[:8000].decode(errors='replace')))

    def _gui(self, recipe: dict) -> dict:
        if not recipe['gui'] or not any(step['kind'] == 'expect' for step in recipe['gui']):
            return {'stage': 'gui', 'status': 'not_run', 'detail': 'Définir un parcours avec un résultat visible attendu.'}
        observation = self.computer.observe('platform')
        performed = []
        for step in recipe['gui']:
            if self.cancelled.is_set():
                raise ValueError('Recette interface annulée.')
            if step['kind'] == 'expect':
                # A bounded fresh observation lets asynchronous UI rendering settle.
                deadline = time.monotonic() + 5
                while step['text'] not in observation.get('text', '') and time.monotonic() < deadline:
                    if self.cancelled.wait(0.3):
                        raise ValueError('Recette interface annulée.')
                    observation = self.computer.observe(observation['target'])
                passed = step['text'] in observation.get('text', '')
                performed.append({'step': step, 'passed': passed})
                if not passed:
                    return {'stage': 'gui', 'status': 'fail', 'steps': performed, 'expected': step['text'],
                            'observed': observation.get('text', ''), 'screenshot': observation.get('screenshot')}
                continue
            if step['kind'] in ('click', 'double_click'):
                observation, clicked = self._click(observation, step)
                if not clicked:
                    return {'stage': 'gui', 'status': 'fail', 'steps': performed, 'expected': step['label'],
                            'observed': 'Contrôle absent ou ambigu.', 'screenshot': observation.get('screenshot')}
            else:
                observation = self.computer.act(observation['id'], dict(step))
            performed.append({'step': step, 'passed': True})
        return {'stage': 'gui', 'status': 'pass', 'steps': performed, 'screenshot': observation.get('screenshot')}

    def _click(self, observation: dict, step: dict) -> tuple[dict, bool]:
        """Refresh once only when the adapter guarantees rejection before input."""
        for attempt in range(2):
            if self.cancelled.is_set():
                raise ValueError('Recette interface annulée.')
            controls = [control for control in observation.get('controls', [])
                        if control.get('label') == step['label'] and control.get('enabled')]
            if len(controls) != 1:
                return observation, False
            try:
                if not controls[0].get('visible', True):
                    observation = self.computer.act(observation['id'], {'kind': 'scroll_to', 'index': controls[0]['index']})
                    controls = [control for control in observation.get('controls', [])
                                if control.get('label') == step['label'] and control.get('enabled')]
                    if len(controls) != 1:
                        return observation, False
                if self.cancelled.is_set():
                    raise ValueError('Recette interface annulée.')
                return self.computer.act(observation['id'], {**step, 'index': controls[0]['index']}), True
            except ObservationChanged:
                if attempt:
                    raise
                if self.cancelled.is_set():
                    raise ValueError('Recette interface annulée.')
                observation = self.computer.observe(observation['target'])
