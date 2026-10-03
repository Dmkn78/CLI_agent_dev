"""Public provider pricing, separate from the model catalogue and account billing."""
import re
import threading
import time
import urllib.parse
import urllib.request

from .store import now

SOURCES = {
    'openai': ('https://developers.openai.com/api/docs/pricing.md', 'https://developers.openai.com/api/docs/pricing'),
    'anthropic': ('https://docs.anthropic.com/en/docs/about-claude/pricing.md', 'https://platform.claude.com/docs/en/about-claude/pricing'),
}
ALLOWED_HOSTS = {'developers.openai.com', 'platform.openai.com', 'docs.anthropic.com', 'platform.claude.com'}


def price(value):
    match = re.search(r'\$\s*([0-9]+(?:\.[0-9]+)?)', value)
    return float(match.group(1)) if match else None


def parse_prices(body, provider):
    """Only the standard text-token table; schema changes fail closed."""
    section = body.split('### Standard pricing data', 1)[-1] if provider == 'openai' else body.split('## Model pricing', 1)[-1]
    lines = section.splitlines()
    header = None
    rows = []
    for line in lines:
        if not line.strip().startswith('|'):
            if rows:
                break
            continue
        cells = [cell.strip() for cell in line.strip().strip('|').split('|')]
        if header is None:
            if cells[0].lower() == 'model':
                header = [cell.lower() for cell in cells]
            continue
        if all(re.fullmatch(r'[-: ]+', cell) for cell in cells):
            continue
        if len(cells) != len(header):
            raise ValueError('Structure de la table tarifaire modifiée.')
        values = dict(zip(header, cells))
        if provider == 'openai':
            model = re.sub(r'\s*\([^)]*\)', '', cells[0]).strip(' `')
            if not re.fullmatch(r'[a-z0-9][a-z0-9._-]+', model):
                continue
            short = 'short context input' in values
            item = dict(model=model, input=price(values.get('short context input' if short else 'input', '')),
                        cache=price(values.get('short context cached input' if short else 'cached input', '')),
                        output=price(values.get('short context output' if short else 'output', '')),
                        cacheWrite=price(values.get('short context cache writes', '')))
            if short:
                item.update(longInput=price(values.get('long context input', '')), longCache=price(values.get('long context cached input', '')),
                            longOutput=price(values.get('long context output', '')), longCacheWrite=price(values.get('long context cache writes', '')),
                            contextThreshold=272000)
        else:
            name = re.match(r'Claude\s+([A-Za-z]+)\s+([0-9]+(?:\.[0-9]+)?)', cells[0])
            if not name:
                continue
            # Canonical model IDs only; no substitution for unknown versions.
            model = 'claude-' + name[1].lower() + '-' + name[2].replace('.', '-')
            item = dict(model=model, input=price(values.get('base input tokens', '')), cache=price(values.get('cache hits and refreshes', '')),
                        output=price(values.get('output tokens', '')), cacheWrite=price(values.get('5m cache writes', '')),
                        cacheWriteHour=price(values.get('1h cache writes', '')))
        if item['input'] is None or item['output'] is None:
            continue
        rows.append({**item, 'provider':provider, 'currency':'USD', 'unit':'millionTokens', 'tier':'standard',
                     'source':SOURCES[provider][1], 'checkedAt':now()})
    if not rows:
        raise ValueError('Aucun tarif standard reconnu dans la source officielle.')
    return rows


def fetch_prices(provider):
    request = urllib.request.Request(SOURCES[provider][0], headers={'User-Agent':'Atelier/1.0 official-pricing-read'})
    with urllib.request.urlopen(request, timeout=12) as response:
        if urllib.parse.urlparse(response.geturl()).hostname not in ALLOWED_HOSTS:
            raise ValueError('Redirection hors source officielle refusée.')
        body = response.read(2_000_001)
        if len(body) > 2_000_000:
            raise ValueError('Source tarifaire trop volumineuse.')
    return parse_prices(body.decode('utf-8'), provider)


class OfficialTariffs:
    def __init__(self, store):
        self.store = store
        self.lock = threading.RLock()
        self.refreshing = False
        self.attempted = 0

    def snapshot(self):
        with self.lock:
            sources = self.store.all('officialPriceSource')
            return {'sources':sources, 'entries':[entry for source in sources for entry in source.get('entries', [])],
                    'refreshing':self.refreshing, 'refreshHours':24}

    def refresh(self, force=False):
        with self.lock:
            sources = self.store.all('officialPriceSource')
            last_success = min((source.get('checkedEpoch', 0) for source in sources), default=0)
            if self.refreshing or time.time()-self.attempted < 60 or (not force and len(sources) == 2 and time.time()-last_success < 86400):
                return self.snapshot()
            self.attempted = time.time()
            self.refreshing = True
        threading.Thread(target=self._refresh, daemon=True, name='official-pricing').start()
        return self.snapshot()

    def _refresh(self):
        try:
            for provider in SOURCES:
                old = next((source for source in self.store.all('officialPriceSource') if source['id'] == provider), {})
                try:
                    entries = fetch_prices(provider)
                    item = dict(id=provider, source=SOURCES[provider][1], entries=entries, checkedAt=now(), checkedEpoch=time.time(), error=None)
                except Exception as error:
                    item = {**old, 'id':provider, 'source':SOURCES[provider][1], 'error':str(error)[:300], 'attemptedAt':now()}
                self.store.put('officialPriceSource', item)
        finally:
            with self.lock:
                self.refreshing = False
