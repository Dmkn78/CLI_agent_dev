"""Independent contract and real browser demo for Duplica's bounded contribution."""
import shutil
import sys
from pathlib import Path


def prepare_usage_contribution(workspace: Path) -> tuple[str, dict]:
    node = shutil.which('node')
    if not node:
        raise ValueError('Node requis pour vérifier le composant de consommation.')
    checks = r'''const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={Number,esc:text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),compact:value=>value==null?'—':String(value)};
vm.createContext(context);vm.runInContext(fs.readFileSync('session_usage.js','utf8'),context);
const render=context.sessionUsageSummary;assert.equal(typeof render,'function');
const html=render({runtime:'codex',usage:{total:{inputTokens:120,outputTokens:30,cachedInputTokens:80,totalTokens:150}}},{plan:'plus',limits:{rateLimits:{primary:{usedPercent:25}}}});
for(const text of ['150 tokens','Entrée','120','Réponse','30','Cache','80','plus','25','compte'])assert.ok(html.includes(text),text);
assert.ok(render({runtime:'codex',usage:{total:{totalTokens:0}}},{plan:null}).includes('0 tokens'));
const missing=render({runtime:'codex',usage:null},{});assert.ok(missing.includes('—'));assert.ok(!missing.includes('0 tokens'));
const hostile=render({usage:{total:{totalTokens:'<img src=x>'}}},{plan:'<script>x</script>'});assert.ok(!hostile.includes('<script>'));assert.ok(!hostile.includes('<img'));
console.log('Usage component verified');
'''
    (workspace / 'check_usage.cjs').write_bytes(checks.encode('utf-8'))
    demo = '''<!doctype html><html lang="fr"><meta charset="utf-8"><title>Compteurs de session · recette Duplica</title>
<style>body{font:18px system-ui;background:#232321;color:#eee;padding:40px}#result{padding:24px;border-radius:18px;background:#30302d}.session-usage{display:flex;flex-wrap:wrap;gap:16px}</style>
<h1>Consommation de session</h1><div id="result">Chargement</div><script>function esc(text){return String(text??'').replaceAll('&','&amp;').replaceAll('<','&lt;')}function compact(value){return value==null?'—':String(value)}</script>
<script src="session_usage.js"></script><script>document.getElementById('result').innerHTML=sessionUsageSummary({runtime:'codex',usage:{total:{inputTokens:120,outputTokens:30,cachedInputTokens:80,totalTokens:150}}},{plan:'plus',limits:{rateLimits:{primary:{usedPercent:25}}}});</script></html>'''
    (workspace / 'usage.html').write_bytes(demo.encode('utf-8'))
    goal = ('Contribution demandée par l’utilisateur via Duplica. Dans ce dossier synthétique uniquement, crée session_usage.js. '
        'C’est un composant du produit Atelier qui sera relu et intégré après les tests de Duplica. Aucun réseau, Git, secret ou sous-agent. '
        'Crée seulement ce fichier, ne modifie pas check_usage.cjs ni usage.html et ne lance pas les tests : Duplica les exécutera. '
        'JavaScript navigateur sans dépendance ni import : function sessionUsageSummary(session, account) retourne une chaîne HTML avec classe session-usage. '
        'Les fonctions globales esc et compact existent. Lis session.usage.total avec champs inputTokens, outputTokens, cachedInputTokens, totalTokens. '
        'Affiche les libellés français Entrée, Réponse, Cache, et le total sous forme "150 tokens" pour 150. '
        'Un compteur absent, négatif ou non numérique doit afficher — ; zéro est un vrai zéro. Le cache fait déjà partie de l’entrée, ne le somme pas une seconde fois. '
        'Affiche l’abonnement via account.plan, si communiqué, et une ligne compacte du quota principal via '
        'account.limits.rateLimits.primary.usedPercent, ou le premier compte de rateLimitsByLimitId. '
        'Précise avec le mot "compte" que ce pourcentage est partagé et ne mesure pas cette session. Pas de coût ou quota inventé. '
        'Échappe tous les textes, même account.plan. Retourne du HTML sobre avec des spans, un small pour le compte ; pas de boutons. '
        'Une soixantaine de lignes suffit. Termine quand le fichier existe. En cas de relance Duplica, corrige depuis l’existant.')
    return goal, {'requirements': [{'path': 'session_usage.js', 'contains': 'function sessionUsageSummary'}],
        'tests': [node, 'check_usage.cjs'], 'buildNotApplicable': True,
        'application': [sys.executable, '-m', 'http.server', '4329', '--bind', '127.0.0.1'],
        'gui': [{'kind': 'open_url', 'url': 'http://127.0.0.1:4329/usage.html'}, {'kind': 'expect', 'text': '150 tokens'},
                {'kind': 'expect', 'text': 'Entrée'}, {'kind': 'expect', 'text': 'compte'}]}
