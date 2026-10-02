"""Release lifecycle tests use isolated data and never contact model providers."""
import json
import os
import queue
import re
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch

from server.runtime import memory_command

ROOT = Path(__file__).resolve().parents[1]


class ReleaseTests(unittest.TestCase):
    def test_memory_command_works_outside_install_directory(self):
        with patch.object(sys, 'frozen', True, create=True):
            self.assertEqual(memory_command(Path('data'), 'project')[1:],
                             ['--memory-mcp', '--data', 'data', '--project', 'project'])
        self.assertEqual(Path(memory_command(Path('data'), 'project')[1]), ROOT / 'server/memory_mcp.py')

    def test_service_starts_on_free_port_keeps_data_and_stops_with_parent(self):
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory) / 'workspace'
            workspace.mkdir()
            storage = Path(directory) / 'data'
            binary = os.environ.get('ATELIER_SERVICE_BINARY')
            command = [str(Path(binary).resolve())] if binary else [sys.executable, '-B', str(ROOT / 'run.py')]
            for attempt in range(2):
                process = subprocess.Popen([*command, '--no-open', '--no-discovery', '--desktop-managed', '--port', '0',
                                            '--data', str(storage), '--workspace', str(workspace)], cwd=directory,
                                           stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                           text=True, encoding='utf-8', env={**os.environ, 'PYTHONUTF8': '1'})
                lines = queue.Queue()
                def read_output():
                    for line in process.stdout:
                        lines.put(line)
                    lines.put(None)
                reader = threading.Thread(target=read_output, daemon=True)
                reader.start()
                try:
                    while True:
                        line = lines.get(timeout=40)
                        self.assertIsNotNone(line, 'Le service a quitté avant sa disponibilité.')
                        if line.startswith('{"atelierReady"'):
                            port = json.loads(line)['atelierReady']['port']
                            break
                    base = f'http://127.0.0.1:{port}'
                    with urllib.request.urlopen(base, timeout=5) as response:
                        html = response.read().decode()
                    token = re.search(r'name="atelier-token" content="([^"]+)"', html)[1]
                    self.assertNotIn('__ATELIER_VERSION__', html)
                    for resource in re.findall(r'<script src="([^"]+)"', html):
                        # Vendor assets are prepared by the release build, not required for source unit tests.
                        if '/vendor/' in resource and not (ROOT / 'web' / resource.lstrip('/')).exists():
                            continue
                        with urllib.request.urlopen(base + resource, timeout=5) as response:
                            self.assertEqual(response.status, 200, resource)
                    with self.assertRaises(urllib.error.HTTPError) as rejected:
                        urllib.request.urlopen(base + '/api/state', timeout=5)
                    self.assertEqual(rejected.exception.code, 403)
                    request = urllib.request.Request(base + '/api/state', headers={'X-Atelier-Token': token})
                    with urllib.request.urlopen(request, timeout=5) as response:
                        state = json.load(response)
                    self.assertEqual(state['projects'][0]['path'], str(workspace.resolve()))
                    self.assertEqual(state['sessions'], [])
                    self.assertEqual(state['providers'][0]['status'], 'unchecked')
                    if attempt == 0:
                        body = {'kind': 'project', 'value': {'id': state['projects'][0]['id'],
                                                           'name': 'Persisté', 'path': str(workspace)}}
                        request = urllib.request.Request(base + '/api/save', data=json.dumps(body).encode(),
                                                         headers={'X-Atelier-Token': token, 'Content-Type': 'application/json'})
                        with urllib.request.urlopen(request, timeout=5) as response:
                            self.assertEqual(response.status, 200)
                    else:
                        self.assertTrue(any(project['name'] == 'Persisté' for project in state['projects']))
                    process.stdin.close()
                    self.assertEqual(process.wait(timeout=15), 0)
                finally:
                    if process.poll() is None:
                        process.kill()
                        process.wait(timeout=5)
                    reader.join(timeout=5)
                    process.stdout.close()
                    process.stderr.close()
                    if not process.stdin.closed:
                        process.stdin.close()

    @unittest.skipUnless(os.environ.get('ATELIER_SERVICE_BINARY'), 'Binaire empaqueté fourni pendant la recette release.')
    def test_packaged_memory_mcp_is_an_independent_stdio_entrypoint(self):
        with tempfile.TemporaryDirectory() as directory:
            request = {'jsonrpc': '2.0', 'id': 1, 'method': 'initialize', 'params': {}}
            result = subprocess.run([os.environ['ATELIER_SERVICE_BINARY'], '--memory-mcp', '--data', directory,
                                     '--project', 'atelier'], input=json.dumps(request) + '\n',
                                    text=True, encoding='utf-8', capture_output=True, timeout=20)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)['result']['serverInfo']['name'], 'atelier-memory')


if __name__ == '__main__':
    unittest.main()
