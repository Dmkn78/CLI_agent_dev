"""Local server metadata only. Authentication and model selection stay native."""
import json
import shutil
from urllib.error import HTTPError
from urllib.request import ProxyHandler, build_opener


LOCAL_SERVERS = (('omlx', 'oMLX', 8000), ('splash', 'Splash', 8001))


def local_providers(probe=False):
    providers = []
    for runtime, name, port in LOCAL_SERVERS:
        entry = {'id': runtime, 'name': name, 'installed': bool(shutil.which(runtime)),
                 'port': port, 'url': f'http://127.0.0.1:{port}', 'connected': False,
                 'status': 'unchecked', 'nativeTerminal': True, 'supported': False}
        if probe:
            try:
                # Loopback only, no proxy, no credentials, no inference.
                with build_opener(ProxyHandler({})).open(entry['url'] + '/v1/models', timeout=2) as response:
                    listing = json.loads(response.read(1024 * 1024))
                entry.update(status='reachable', modelCount=len(listing.get('data', [])))
            except HTTPError as exc:
                entry.update(status='auth_required' if exc.code in (401, 403) else 'error',
                             error='Authentification requise dans le terminal natif.' if exc.code in (401, 403) else f'HTTP {exc.code}')
            except (OSError, ValueError) as exc:
                entry.update(status='unavailable', error='Serveur local inaccessible.')
        providers.append(entry)
    return providers
