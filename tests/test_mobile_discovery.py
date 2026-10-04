import io
import json
import unittest
from urllib.error import HTTPError
from unittest.mock import patch

from server.mobile_discovery import NoRedirect, discover_services, listening_ports, probe_service


class Response(io.BytesIO):
    status = 200


class MobileDiscoveryTests(unittest.TestCase):
    def test_inventory_keeps_only_candidate_processes_and_loopback_sockets(self):
        output = '\n'.join(['p10', 'cpython3.12', 'n127.0.0.1:4317', 'n0.0.0.0:8000',
                            'n100.70.1.2:1234', 'p11', 'cFirefox', 'n127.0.0.1:9999',
                            'p12', 'catelier-service', 'n127.0.0.1:54321', 'p13', 'n127.0.0.1:4444'])
        self.assertEqual(listening_ports(output), [4317, 54321])

    def test_probe_returns_identity_without_nonce_or_extra_fields(self):
        nonce = 'private_nonce_fixture_12345'
        identity = {'workspace': '/workspace', 'dataPath': '/private/data', 'token': 'do-not-export'}
        with patch('server.mobile_discovery.build_opener') as factory:
            factory.return_value.open.side_effect = [Response(('<meta name="atelier-token" content="' + nonce + '">').encode()),
                                                     Response(json.dumps(identity).encode())]
            service = probe_service(54321)
            request = factory.return_value.open.call_args_list[1].args[0]
            self.assertEqual(request.get_header('X-atelier-token'), nonce)
        self.assertEqual(service, {'url': 'http://127.0.0.1:54321', 'workspace': '/workspace', 'dataPath': '/private/data'})
        self.assertNotIn(nonce, json.dumps(service))
        self.assertNotIn('token', service)

    def test_probe_rejects_invalid_ports_unrecognised_html_and_bad_identity(self):
        for port in (0, 65536, '4317', True):
            self.assertIsNone(probe_service(port))
        for content in (b'<h1>unrelated</h1>', b'x' * (256 * 1024 + 1)):
            with patch('server.mobile_discovery.build_opener') as factory:
                factory.return_value.open.return_value = Response(content)
                self.assertIsNone(probe_service(4317))
        with patch('server.mobile_discovery.build_opener') as factory:
            factory.return_value.open.side_effect = [Response(b'<meta name="atelier-token" content="fixture_nonce_123">'),
                                                     Response(b'{"workspace": "/one", "dataPath": null}')]
            self.assertIsNone(probe_service(4317))

    def test_discovery_is_bounded_deduplicated_and_does_not_follow_redirects(self):
        with patch('server.mobile_discovery.candidate_ports', return_value=list(range(4300, 4400))), \
             patch('server.mobile_discovery.probe_service', side_effect=lambda port: {'url': str(port)}) as probe:
            found = discover_services()
        self.assertEqual(len(found), 32)
        self.assertEqual(probe.call_count, 32)
        self.assertIn({'url': '4317'}, found)
        self.assertIsNone(NoRedirect().redirect_request(None, None, 302, '', {}, 'https://remote.invalid/'))

    def test_released_desktop_can_be_found_without_inventing_storage_identity(self):
        state = {'root': '/installed/workspace', 'projects': [], 'sessions': [], 'providers': []}
        with patch('server.mobile_discovery.build_opener') as factory:
            factory.return_value.open.side_effect = [
                Response(b'<title>Atelier</title><meta name="atelier-token" content="private_nonce_123">'),
                HTTPError('http://127.0.0.1:54321/api/desktop/service', 404, 'missing', {}, None),
                Response(json.dumps(state).encode()),
            ]
            self.assertEqual(probe_service(54321), {'url': 'http://127.0.0.1:54321', 'workspace': '/installed/workspace',
                                                  'dataPath': None, 'legacy': True})

    def test_nonce_rejection_never_triggers_legacy_fallback(self):
        with patch('server.mobile_discovery.build_opener') as factory:
            factory.return_value.open.side_effect = [
                Response(b'<title>Atelier</title><meta name="atelier-token" content="private_nonce_123">'),
                HTTPError('http://127.0.0.1:54321/api/desktop/service', 403, 'denied', {}, None),
            ]
            self.assertIsNone(probe_service(54321))
            self.assertEqual(factory.return_value.open.call_count, 2)


if __name__ == '__main__':
    unittest.main()
