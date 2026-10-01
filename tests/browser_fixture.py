"""Browser acceptance server. Fixture data only, never starts a real provider."""
import argparse
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from server.app import Application
from server.store import now
from run import make_handler
from test_application import FakeCodex

parser = argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=4320)
args = parser.parse_args()
app = Application(ROOT,ROOT / '.atelier' / 'browser-fixture')
models = [{'model':name,'displayName':name,'isDefault':i == 0,'defaultReasoningEffort':'medium',
           'supportedReasoningEfforts':[{'reasoningEffort':e} for e in ['low','medium','high']]} for i,name in enumerate(['fixture-code','fixture-review'])]
app.provider.update(connected=True,installed=True,models=models,authType='fixture',plan='Fournisseur fictif')
app.omp_provider.update(installed=True,connected=True,models=[{'model':'fixture/remote','displayName':'Fixture distant','provider':'fixture','modelId':'remote','defaultReasoningEffort':'off','supportedReasoningEfforts':[{'reasoningEffort':e} for e in ['off','low']]}],
                        loginProviders=[{'id':'anthropic','name':'Anthropic fixture','authenticated':False,'available':True}])
app.discover = lambda: app.provider
patcher = patch('server.app.CodexClient',FakeCodex)
patcher.start()
for kind in ('session','task','request','workflow','approval'):
    for value in app.store.all(kind): app.store.delete(kind,value['id'])
task = app.upsert('task',{'title':'Recette navigateur avec fournisseur fictif','description':'Vérification UI sans inférence','status':'review'})
workflow = app.workflow({'name':'Équipe de recette fictive','mode':'orchestration','model':'fixture-code','mission':'Réponds ok pour la recette UI.','taskId':task['id'],
                         'agents':{'planner':{'model':'fixture-review'},'reviewer':{'model':'fixture-review'},'workers':[{'model':'fixture-code'}],'synthesizer':{'model':'fixture-code'}}})
session = app.new_session({'name':'Session de recette fictive','model':'fixture-code','mission':'Recette uniquement','taskId':task['id']},start=False)
app.start_session(session['id'])
app.prompt(session['id'],'Réponds ok.')
server = ThreadingHTTPServer(('127.0.0.1',args.port),make_handler(app,'browser-fixture-nonce'))
server.daemon_threads = True
print('Browser fixture ready',flush=True)
try:
    server.serve_forever()
finally:
    app.shutdown()
    server.server_close()
    patcher.stop()
