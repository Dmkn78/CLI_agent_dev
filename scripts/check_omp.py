"""Check OMP metadata and host-tool support without sending a model prompt."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from server.omp import OmpClient
from server.omp_session import OmpSession

directory = ROOT / '.atelier' / 'probes' / 'omp'
directory.mkdir(parents=True, exist_ok=True)
client = OmpClient(ROOT, directory)
try:
    state = client.rpc('get_state')
    print(json.dumps({'nativeTools': [t.get('name') for t in state.get('dumpTools', [])]}, ensure_ascii=False))
    tool = OmpSession.tool('atelier_read', 'Read a project file.', {'path': {'type': 'string'}}, ['path'])
    print(json.dumps({'hostTools': client.rpc('set_host_tools', {'tools': [tool]})}, ensure_ascii=False))
    print(json.dumps({'enabledTools': [t.get('name') for t in client.rpc('get_state').get('dumpTools', [])]}, ensure_ascii=False))
    providers = client.rpc('get_login_providers')
    print(json.dumps({'loginProviders': providers}, ensure_ascii=False))
finally:
    client.close()
