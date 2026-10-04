"""Find running local Atelier services without starting one or exporting its nonce."""
import concurrent.futures
import json
import re
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def listening_ports(output):
    """Parse lsof machine output; process names only, never command arguments."""
    ports = set()
    candidate = False
    for line in output.splitlines():
        if line.startswith('p'):
            candidate = False
        elif line.startswith('c'):
            name = line[1:].lower()
            candidate = name.startswith('python') or name in ('atelier-service', 'atelier-service.exe')
        elif candidate and line.startswith('n'):
            match = re.fullmatch(r'n127\.0\.0\.1:(\d+)', line)
            if match and 1 <= int(match[1]) <= 65535:
                ports.add(int(match[1]))
    return sorted(ports)


def candidate_ports():
    """Read OS socket inventory. No scan of a network or unrelated remote machines."""
    try:
        if sys.platform == 'win32':
            command = [
                'powershell.exe', '-NoProfile', '-NonInteractive', '-Command',
                "$ids=@(Get-Process | Where-Object {$_.ProcessName -match '^(python.*|atelier-service)$'} | Select-Object -ExpandProperty Id); "
                "@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object {$_.LocalAddress -eq '127.0.0.1' -and $ids -contains $_.OwningProcess} | Select-Object -ExpandProperty LocalPort) | ConvertTo-Json -Compress",
            ]
            output = subprocess.run(command, capture_output=True, text=True, timeout=5, check=True).stdout
            value = json.loads(output or '[]')
            ports = value if isinstance(value, list) else [value]
            return sorted({p for p in ports if type(p) is int and 1 <= p <= 65535})
        output = subprocess.run(['lsof', '-n', '-P', '-iTCP', '-sTCP:LISTEN', '-Fpcn'],
                                capture_output=True, text=True, timeout=5, check=True).stdout
        return listening_ports(output)
    except (OSError, subprocess.SubprocessError, ValueError, TypeError):
        return []


def probe_service(port):
    if type(port) is not int or not 1 <= port <= 65535:
        return None
    origin = 'http://127.0.0.1:' + str(port)
    opener = build_opener(ProxyHandler({}), NoRedirect())
    try:
        with opener.open(origin + '/', timeout=1.5) as response:
            if response.status != 200:
                return None
            html = response.read(256 * 1024 + 1)
        if len(html) > 256 * 1024:
            return None
        match = re.search(rb'name="atelier-token" content="([A-Za-z0-9_-]{8,128})"', html)
        if not match:
            return None
        # The desktop bootstrap nonce is used locally only, never returned or saved.
        request = Request(origin + '/api/desktop/service', headers={'X-Atelier-Token': match[1].decode('ascii')})
        try:
            with opener.open(request, timeout=1.5) as response:
                content = response.read(16 * 1024 + 1)
                if response.status != 200 or len(content) > 16 * 1024:
                    return None
        except HTTPError as error:
            # Released desktop builds predate the service-identity endpoint.
            # Observe their existing state instead; never infer a private data path.
            if error.code != 404 or b'Atelier' not in html:
                return None
            request = Request(origin + '/api/state', headers={'X-Atelier-Token': match[1].decode('ascii')})
            with opener.open(request, timeout=1.5) as response:
                content = response.read(4 * 1024 * 1024 + 1)
                if response.status != 200 or len(content) > 4 * 1024 * 1024:
                    return None
            state = json.loads(content)
            if not isinstance(state, dict) or not isinstance(state.get('root'), str) or not state['root'] \
                    or any(not isinstance(state.get(key), list) for key in ('projects', 'sessions', 'providers')):
                return None
            return {'url': origin, 'workspace': state['root'], 'dataPath': None, 'legacy': True}
        identity = json.loads(content)
        if not isinstance(identity, dict) or any(not isinstance(identity.get(key), str) or not identity[key]
                                                  for key in ('workspace', 'dataPath')):
            return None
        return {key: identity[key] for key in ('workspace', 'dataPath')} | {'url': origin}
    except (OSError, URLError, HTTPError, ValueError, TypeError):
        return None


def discover_services():
    ports = [4317, *sorted(set(candidate_ports()) - {4317})][:32]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        return [service for service in executor.map(probe_service, ports) if service is not None]
