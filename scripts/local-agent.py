"""Launch native local-server clients with process-scoped configuration only."""
import argparse
import getpass
import json
import os
import shutil
from urllib.error import HTTPError
from urllib.request import Request, ProxyHandler, build_opener


def launch_command(runtime, port, sandbox, environment):
    executable = shutil.which(runtime)
    if not executable or not shutil.which('codex'):
        raise ValueError('Lanceur local ou Codex absent du PATH.')
    instructions = f'Périmètre : {os.getcwd()}. Ne lance aucun sous-agent. Attends la mission de l’utilisateur.'
    arguments = ['--sandbox', sandbox, '--ask-for-approval', 'on-request',
                 '-c', 'features.multi_agent=false', '-c', 'web_search="disabled"',
                 '-c', 'developer_instructions=' + json.dumps(instructions, ensure_ascii=False)]
    if runtime == 'omlx':
        return [executable, 'launch', 'codex', '--host', '127.0.0.1', '--port', str(port), '--', *arguments]
    environment['SPLASH_PORT'] = str(port)
    return [executable, 'codex', '--', *arguments]


def splash_auth(port, environment):
    request = Request(f'http://127.0.0.1:{port}/status')
    if environment.get('SPLASH_API_KEY'):
        request.add_header('Authorization', 'Bearer ' + environment['SPLASH_API_KEY'])
    try:
        with build_opener(ProxyHandler({})).open(request, timeout=4):
            pass
    except HTTPError as exc:
        if exc.code not in (401, 403):
            raise
        key = getpass.getpass('Clé API du serveur Splash (masquée, non enregistrée) : ')
        if not key.strip():
            raise ValueError('Connexion annulée : clé vide.')
        environment['SPLASH_API_KEY'] = key


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('runtime', choices=('omlx', 'splash'))
    parser.add_argument('--port', type=int, required=True)
    parser.add_argument('--sandbox', choices=('read-only', 'workspace-write'), default='read-only')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('Port local invalide.')
    environment = dict(os.environ)
    command = launch_command(args.runtime, args.port, args.sandbox, environment)
    if args.runtime == 'splash':
        splash_auth(args.port, environment)
    print(f'Connexion à {args.runtime} sur 127.0.0.1:{args.port} · {args.sandbox} · on-request', flush=True)
    os.execvpe(command[0], command, environment)


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError) as exc:
        print('Connexion locale impossible : ' + str(exc))
        raise SystemExit(1)
