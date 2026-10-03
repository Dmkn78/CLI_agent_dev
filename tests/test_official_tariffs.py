import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from server.official_tariffs import OfficialTariffs, parse_prices
from server.store import Store


OPENAI = '''### Standard pricing data
| Model | Short context input | Short context cached input | Short context cache writes | Short context output | Long context input | Long context cached input | Long context cache writes | Long context output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fixture-exact | $2.00 | $0.10 | $2.50 | $10.00 | $4.00 | $0.20 | $5.00 | $15.00 |

### Batch pricing data
| Model | Input | Cached input | Output |
| --- | --- | --- | --- |
| fixture-exact | $1 | $.05 | $5 |
'''
ANTHROPIC = '''## Model pricing
| Model | Base input tokens | 5m cache writes | 1h cache writes | Cache hits and refreshes | Output tokens |
| --- | --- | --- | --- | --- | --- |
| Claude Fixture 4.5 | $3 / MTok | $3.75 / MTok | $6 / MTok | $0.30 / MTok | $15 / MTok |

## Other prices
'''


class OfficialPricingTests(unittest.TestCase):
    def test_standard_only_and_context_variants(self):
        items = parse_prices(OPENAI, 'openai')
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['model'], 'fixture-exact')
        self.assertEqual(items[0]['input'], 2)
        self.assertEqual(items[0]['longOutput'], 15)
        self.assertEqual(items[0]['contextThreshold'], 272000)
        self.assertEqual(items[0]['tier'], 'standard')
        self.assertTrue(items[0]['source'].startswith('https://developers.openai.com/'))

    def test_anthropic_cache_and_canonical_id(self):
        item = parse_prices(ANTHROPIC, 'anthropic')[0]
        self.assertEqual(item['model'], 'claude-fixture-4-5')
        self.assertEqual(item['cache'], .3)
        self.assertEqual(item['cacheWrite'], 3.75)
        self.assertEqual(item['cacheWriteHour'], 6)

    def test_unrecognized_page_never_invents_tariff(self):
        for body in ('<html>blocked</html>', '| Model | Something |\n| fixture | $1 |'):
            with self.assertRaises(ValueError):
                parse_prices(body, 'openai')

    def test_failed_refresh_preserves_verified_source_and_exposes_error(self):
        with tempfile.TemporaryDirectory() as directory:
            store = Store(Path(directory))
            store.put('officialPriceSource', {'id':'openai', 'checkedAt':'2026-10-03T00:00:00Z', 'entries':[{'model':'fixture-exact','input':2}]})
            pricing = OfficialTariffs(store)
            with patch('server.official_tariffs.fetch_prices', side_effect=OSError('fixture offline')):
                pricing._refresh()
            snapshot = pricing.snapshot()
            self.assertFalse(snapshot['refreshing'])
            self.assertEqual(snapshot['entries'][0]['input'], 2)
            self.assertEqual(snapshot['sources'][0]['error'], 'fixture offline')
            self.assertEqual(snapshot['sources'][0]['checkedAt'], '2026-10-03T00:00:00Z')
            self.assertEqual(len(snapshot['sources']), 2)

    def test_cached_refresh_never_fetches_or_spawns_work(self):
        with tempfile.TemporaryDirectory() as directory:
            store = Store(Path(directory))
            import time
            for provider in ('openai', 'anthropic'):
                store.put('officialPriceSource', {'id':provider, 'checkedEpoch':time.time(), 'entries':[]})
            pricing = OfficialTariffs(store)
            with patch('server.official_tariffs.threading.Thread') as thread:
                pricing.refresh()
            thread.assert_not_called()
