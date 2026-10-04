"""Read-only account refresh uses deterministic providers, never an inference."""
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

from server.account_limits import AccountLimitsRefresh
from server.app import Application
from server.codex import CodexError
from test_application import FakeCodex


class AccountLimitsSchedulerTests(unittest.TestCase):
    def test_ten_minute_cadence_without_wall_clock_wait(self):
        clock = [0]
        calls = []
        read = threading.Event()

        def sample():
            calls.append(clock[0])
            read.set()
            return len(calls)

        poller = AccountLimitsRefresh(sample, monotonic=lambda: clock[0])
        self.addCleanup(poller.join)
        self.addCleanup(poller.stop)
        poller.start()
        first = poller.thread
        poller.start()
        self.assertIs(poller.thread, first)
        with poller.condition:
            self.assertEqual(poller.next_at, 600)
            clock[0] = 599
            poller.condition.notify_all()
        self.assertFalse(read.wait(.03))
        with poller.condition:
            clock[0] = 600
            poller.condition.notify_all()
        self.assertTrue(read.wait(1))
        with poller.condition:
            self.assertTrue(poller.condition.wait_for(lambda: not poller.inflight, timeout=1))
            self.assertEqual(poller.next_at, 1200)
        self.assertEqual(calls, [600])

    def test_concurrent_manual_and_automatic_reads_share_a_result(self):
        entered = threading.Event()
        follower_waiting = threading.Event()
        release = threading.Event()
        results = []
        calls = []

        def sample():
            calls.append('account/rateLimits/read')
            entered.set()
            self.assertTrue(release.wait(2))
            return {'observed': 42}

        poller = AccountLimitsRefresh(sample)
        poller.next_at = 0
        automatic = threading.Thread(target=lambda: results.append(poller.refresh(scheduled=True)))
        automatic.start()
        self.assertTrue(entered.wait(1))
        original_wait = poller.condition.wait

        def waiting(*args, **kwargs):
            follower_waiting.set()
            return original_wait(*args, **kwargs)

        with patch.object(poller.condition, 'wait', side_effect=waiting):
            manual = threading.Thread(target=lambda: results.append(poller.refresh()))
            manual.start()
            self.assertTrue(follower_waiting.wait(1))
            release.set()
            automatic.join(1)
            manual.join(1)
        self.assertFalse(automatic.is_alive())
        self.assertFalse(manual.is_alive())
        self.assertEqual(calls, ['account/rateLimits/read'])
        self.assertEqual(results, [{'observed': 42}, {'observed': 42}])

    def test_manual_read_supersedes_a_timer_selected_before_it(self):
        calls = []
        clock = [600]
        poller = AccountLimitsRefresh(lambda: calls.append('read') or {'observed': True},
                                     monotonic=lambda: clock[0])
        poller.next_at = 600
        poller.refresh()
        poller.refresh(scheduled=True)
        self.assertEqual(calls, ['read'])
        self.assertEqual(poller.next_at, 1200)

    def test_failed_attempt_schedules_retry_and_stop_wakes_sleep(self):
        entered = threading.Event()

        def fail():
            entered.set()
            raise CodexError('Fournisseur fictif indisponible')

        poller = AccountLimitsRefresh(fail, monotonic=lambda: 0)
        self.addCleanup(poller.join)
        self.addCleanup(poller.stop)
        with self.assertRaises(CodexError):
            poller.refresh()
        self.assertEqual(poller.next_at, 600)
        poller.start()
        poller.stop()
        poller.join(1)
        self.assertFalse(poller.thread.is_alive())
        thread = poller.thread
        poller.start()
        self.assertIs(poller.thread, thread)


class LimitsCodex(FakeCodex):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fail_limits = False

    def rpc(self, method, params=None, **kwargs):
        self.calls.append((method, params))
        if method == 'account/read':
            return {'account': {'type': 'chatgpt', 'planType': 'fixture'}}
        if method == 'model/list':
            return {'data': [{'model': 'fixture'}]}
        if method == 'account/rateLimits/read':
            if self.fail_limits:
                raise CodexError('Quota fixture temporairement indisponible')
            return {'rateLimits': {'primary': {'usedPercent': 25}}}
        raise AssertionError('Unexpected provider operation: ' + method)


class AccountLimitsApplicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = Application(Path(self.temp.name))
        self.client_patch = patch('server.app.CodexClient', LimitsCodex)
        self.client_patch.start()

    def tearDown(self):
        self.app.shutdown()
        self.client_patch.stop()
        self.app.store.db.close()
        self.temp.cleanup()

    def discover(self):
        with patch('server.app.discover_models', return_value={'installed': False, 'models': []}), \
                patch('server.app.local_providers', return_value=[]):
            self.app.discover()

    def test_constructor_and_state_do_not_contact_provider(self):
        with patch('server.app.CodexClient') as constructor:
            self.app.state()
        constructor.assert_not_called()
        self.assertIsNone(self.app.account_limits.thread)
        self.assertEqual(self.app.provider['status'], 'unchecked')
        self.assertEqual(self.app.provider['limitsRefreshIntervalSeconds'], 600)

    def test_initial_discovery_starts_one_worker_and_keeps_failed_last_measure(self):
        with patch('server.app.now', return_value='fixture-success-time'):
            self.discover()
        thread = self.app.account_limits.thread
        sample = self.app.provider['limits']
        self.app.discovery.fail_limits = True
        with patch('server.app.now', return_value='fixture-failure-time'):
            self.discover()
        self.assertIs(self.app.account_limits.thread, thread)
        self.assertEqual(self.app.provider['limits'], sample)
        self.assertEqual(self.app.provider['limitsUpdatedAt'], 'fixture-success-time')
        self.assertIn('fixture', self.app.provider['limitsError'])
        methods = [method for method, _ in self.app.discovery.calls]
        self.assertEqual(methods.count('account/rateLimits/read'), 2)
        self.assertNotIn('turn/start', methods)
        self.assertTrue(all(params == {'refreshToken': False} for method, params in self.app.discovery.calls
                            if method == 'account/read'))

    def test_auto_read_recovers_dead_discovery_without_other_providers(self):
        self.discover()
        old = self.app.discovery
        old.closed = True
        with patch('server.app.discover_models') as omp:
            result = self.app.account_limits.refresh(scheduled=False)
        omp.assert_not_called()
        self.assertIsNot(self.app.discovery, old)
        self.assertTrue(self.app.provider['connected'])
        self.assertIsNone(result['error'])
        self.assertEqual(result['limits']['rateLimits']['primary']['usedPercent'], 25)
        self.assertEqual([method for method, _ in self.app.discovery.calls],
                         ['account/read', 'model/list', 'account/rateLimits/read'])

    def test_native_account_connection_requests_read_without_blocking_reader(self):
        self.discover()
        with patch.object(self.app.account_limits, 'request') as request:
            self.app.on_provider_event({'method': 'account/updated', 'params': {'authMode': 'chatgpt'}})
        request.assert_called_once_with()

    def test_logout_during_read_discards_the_previous_account_response(self):
        self.discover()
        entered = threading.Event()
        release = threading.Event()

        def blocked_read(*args, **kwargs):
            entered.set()
            if not release.wait(2):
                raise CodexError('Fixture did not release the read')
            return {'rateLimits': {'primary': {'usedPercent': 99}}}

        with patch.object(self.app.discovery, 'rpc', side_effect=blocked_read):
            worker = threading.Thread(target=self.app.refresh_limits)
            worker.start()
            try:
                self.assertTrue(entered.wait(1))
                self.app.on_provider_event({'method': 'account/updated', 'params': {'authMode': None}})
            finally:
                release.set()
                worker.join(1)
        self.assertFalse(worker.is_alive())
        self.assertFalse(self.app.provider['connected'])
        self.assertIsNone(self.app.provider['limits'])
        self.assertIsNone(self.app.provider['limitsUpdatedAt'])
        self.assertIsNone(self.app.provider['limitsError'])

    def test_native_push_during_read_remains_the_latest_measurement(self):
        self.discover()

        def read_with_push(*args, **kwargs):
            self.app.on_provider_event({'method': 'account/rateLimits/updated', 'params': {
                'rateLimits': {'primary': {'usedPercent': 72}}}})
            return {'rateLimits': {'primary': {'usedPercent': 25}}}

        with patch.object(self.app.discovery, 'rpc', side_effect=read_with_push):
            self.app.refresh_limits()
        self.assertEqual(self.app.provider['limits']['rateLimits']['primary']['usedPercent'], 72)

    def test_shutdown_closes_inflight_rpc_before_joining_worker(self):
        self.discover()
        entered = threading.Event()
        release = threading.Event()

        def blocked_read(*args, **kwargs):
            entered.set()
            if not release.wait(2):
                raise CodexError('Fixture read was not closed')
            raise CodexError('Fixture process closed')

        client = self.app.discovery

        def close_read():
            client.closed = True
            release.set()

        with patch.object(client, 'rpc', side_effect=blocked_read), patch.object(client, 'close', side_effect=close_read):
            self.app.account_limits.request()
            self.assertTrue(entered.wait(1))
            self.app.shutdown()
        self.assertTrue(release.is_set())
        self.assertFalse(self.app.account_limits.thread.is_alive())
        self.assertIsNone(self.app.provider['limitsError'])

    def test_shutdown_stops_worker_and_prevents_another_read(self):
        self.discover()
        client = self.app.discovery
        count = len(client.calls)
        self.app.shutdown()
        self.app.refresh_limits()
        self.assertTrue(client.closed)
        self.assertFalse(self.app.account_limits.thread.is_alive())
        self.assertEqual(len(client.calls), count)
