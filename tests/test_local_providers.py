import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
from urllib.error import HTTPError

from server.terminal import prepare_local
from server.local_providers import local_providers

spec = importlib.util.spec_from_file_location('local_agent', Path(__file__).resolve().parents[1] / 'scripts/local-agent.py')
local_agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local_agent)


class LocalProviderTests(unittest.TestCase):
    def test_local_launches_preserve_permissions_and_do_not_send_prompt(self):
        with patch('shutil.which', side_effect=lambda name: '/bin/' + name):
            for runtime, port in [('omlx', 8000), ('splash', 8001)]:
                for sandbox in ('read-only', 'workspace-write'):
                    plan = prepare_local('/tmp/project', {'runtime': runtime, 'sandbox': sandbox})
                    self.assertEqual(plan['argv'][-4:], ['--port', str(port), '--sandbox', sandbox])
                    environment = {}
                    command = local_agent.launch_command(runtime, port, sandbox, environment)
                    separator = command.index('--')
                    args = command[separator + 1:]
                    self.assertEqual(args[:4], ['--sandbox', sandbox, '--ask-for-approval', 'on-request'])
                    self.assertIn('features.multi_agent=false', args)
                    self.assertNotIn('--model', command)
                    self.assertNotIn('--prompt', command)
                    if runtime == 'splash':
                        self.assertEqual(environment['SPLASH_PORT'], '8001')

    def test_local_launch_rejects_invalid_ports_permissions_and_missing_cli(self):
        with patch('shutil.which', return_value='/bin/fake'):
            for port in (True, 0, 65536, '8000; echo wrong', 'http://remote'):
                with self.assertRaises(ValueError):
                    prepare_local('/tmp', {'runtime': 'omlx', 'port': port})
            with self.assertRaises(ValueError):
                prepare_local('/tmp', {'runtime': 'splash', 'sandbox': 'danger-full-access'})
        with patch('shutil.which', return_value=None):
            with self.assertRaises(ValueError):
                prepare_local('/tmp', {'runtime': 'omlx'})

    def test_protected_server_is_not_reported_as_authenticated(self):
        opener = MagicMock()
        opener.open.side_effect = HTTPError('http://127.0.0.1', 401, 'Unauthorized', {}, None)
        with patch('server.local_providers.build_opener', return_value=opener):
            result = local_providers(probe=True)
        self.assertTrue(all(p['status'] == 'auth_required' and not p['connected'] for p in result))
        self.assertEqual([call.args[0] for call in opener.open.call_args_list],
                         ['http://127.0.0.1:8000/v1/models', 'http://127.0.0.1:8001/v1/models'])

    def test_splash_secret_only_reaches_process_environment(self):
        opener = MagicMock()
        opener.open.side_effect = HTTPError('http://127.0.0.1', 401, 'Unauthorized', {}, None)
        environment = {}
        with patch.object(local_agent, 'build_opener', return_value=opener), patch.object(local_agent.getpass, 'getpass', return_value='test-secret'):
            local_agent.splash_auth(8001, environment)
        with patch('shutil.which', return_value='/bin/fake'):
            command = local_agent.launch_command('splash', 8001, 'read-only', environment)
        self.assertEqual(environment['SPLASH_API_KEY'], 'test-secret')
        self.assertNotIn('test-secret', ' '.join(command))


if __name__ == '__main__':
    unittest.main()
