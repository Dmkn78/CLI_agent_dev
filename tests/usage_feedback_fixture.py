"""Offline browser fixture for usage and readable architecture replies."""
import sys
import tempfile
from pathlib import Path
from http.server import ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from server.app import Application
from run import make_handler

with tempfile.TemporaryDirectory(prefix='atelier-usage-fixture-') as directory:
    app = Application(ROOT, Path(directory))
    app.provider.update(connected=True, installed=True, authType='fixture', plan='Abonnement fictif', models=[])
    app.official_tariffs.refresh = lambda **kwargs: app.official_tariffs.snapshot()
    session = {'id':'usage-session','projectId':'atelier','name':'Architecture · fixture hors ligne','runtime':'codex','provider':'codex','model':'fixture-code','effort':'high','sandbox':'read-only','status':'ready','lastCompletedAt':'2026-10-03T11:00:00Z','createdAt':'2026-10-01T10:00:00Z','mission':'Présentation de recette uniquement','purpose':'architecture','messages':[],'usage':{'total':{'inputTokens':14400,'outputTokens':3600,'cachedInputTokens':9000,'totalTokens':18000}}}
    import json
    session['messages'] = [{'role':'agent','ts':'2026-10-03T11:00:00Z','text':json.dumps({'title':'Une architecture lisible','explanation':'## Proposition\n\nLe projet transmet la demande aux agents. Chaque résultat conserve ses preuves.\n\n- Vérifier le plan avant lancement\n- Conserver les sorties et les limites','graph':{'nodes':[{'id':'project','text':'Projet'},{'id':'agents','text':'Agents'},{'id':'proof','text':'Sorties & preuves'}],'edges':[{'sourceNodeId':'project','targetNodeId':'agents','text':'Mission'},{'sourceNodeId':'agents','targetNodeId':'proof','text':'Résultats'}]}})}]
    app.store.put('session', session)
    for index,(day,vendor,total) in enumerate([('01','codex',3000),('02','codex',7000),('03','codex',8000),('01','anthropic',1000),('02','anthropic',1500),('03','anthropic',4000)]):
        app.store.put('request',{'id':'fixture-'+str(index),'projectId':'atelier','sessionId':'usage-session' if vendor == 'codex' else 'anthropic-fixture','provider':vendor,'model':'fixture-code','consumer':'session','title':'Requête fictive '+str(index),'status':'completed','createdAt':'2026-10-'+day+'T10:00:00Z','completedAt':'2026-10-'+day+'T10:01:00Z','usage':{'inputTokens':int(total*.8),'outputTokens':int(total*.2),'cachedInputTokens':int(total*.5),'totalTokens':total}})
    app.discover = lambda: app.provider
    server = ThreadingHTTPServer(('127.0.0.1',4324),make_handler(app,'usage-fixture-nonce'))
    print('Usage fixture ready', flush=True)
    try: server.serve_forever()
    finally: server.server_close();app.shutdown()
