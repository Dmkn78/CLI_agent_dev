import math

from .store import now, uid


def save_tariff(app, data):
    app.project(data.get('projectId', 'atelier'))
    prices = {}
    for key in ('input', 'cache', 'output'):
        value = float(data[key])
        if not math.isfinite(value) or not 0 <= value <= 1000000:
            raise ValueError('Tarif invalide.')
        prices[key] = value
    if not str(data.get('source', '')).strip():
        raise ValueError('Indique la source et la date du tarif.')
    old = next((item for item in app.store.all('tariff') if all(item.get(key) == data.get(key) for key in ('projectId', 'model', 'provider'))), None)
    item = {'id': old['id'] if old else uid('tariff'), 'projectId': data['projectId'],
            'model': str(data['model'])[:150], 'provider': str(data['provider'])[:100],
            **prices, 'source': str(data['source'])[:500], 'currency': 'USD', 'updatedAt': now()}
    return app.store.put('tariff', item)
