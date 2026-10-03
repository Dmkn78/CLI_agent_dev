"""Manual browser acceptance server. Synthetic provider, no Codex inference."""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import fake_codex
from prisme.http_server import PrismeServer


base_document = fake_codex.generated_document


def acceptance_document(pages: list[dict]) -> dict:
    document = base_document(pages)
    document["title"] = "Mon cours, devenu interactif"
    document["subtitle"] = "Recette avec un fournisseur fictif, sans inférence."
    chapter = document["chapters"][0]
    chapter["title"] = "Le paramètre change la forme"
    chapter["intro"] = "Une relation associe une valeur de départ à une valeur d’arrivée. Ici, chaque unité de x ajoute a unités à y. Déplace le curseur pour comparer les effets de plusieurs coefficients, puis relie ton observation à l’écriture y = ax."
    chapter["intuition"] = "Le paramètre est un levier : une petite modification change tout un ensemble de résultats."
    chapter["proof"] = [{"title": "Comparer deux valeurs", "body": "Si x augmente de Δx, alors y augmente de aΔx. La même variation de x produit une variation de y proportionnelle au coefficient a."}]
    chapter["lab"]["title"] = "Une formule que tu peux toucher."
    chapter["lab"]["description"] = "Déplace le coefficient. La droite, les valeurs et la relation changent ensemble."
    chapter["lab"]["html"] = """<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
body{font:14px system-ui;padding:12px;margin:0!important;color:#e8e9e3;background:#151718}svg{width:100%;height:clamp(90px,45vh,240px);display:block}line{stroke:#ffffff20}path{stroke:#c6d9a6;fill:none;stroke-width:3}text{fill:#aab5a2;font-size:12px}label{display:block;margin-top:12px}input{width:100%;accent-color:#c6d9a6}output{color:#c6d9a6;float:right}p{color:#aab5a2}
</style></head><body><svg viewBox="0 0 400 260" role="img" aria-label="Graphe de y égale a fois x"><line x1="40" y1="220" x2="370" y2="220"/><line x1="40" y1="15" x2="40" y2="220"/><line x1="40" y1="120" x2="370" y2="120"/><text x="20" y="24">y</text><text x="373" y="238">x</text><text x="15" y="224">0</text><path id="curve"/><circle id="point" r="5" fill="#c6d9a6"/></svg><label>Coefficient a <output id="value">1</output><input type="range" min="0" max="2" step="0.1" value="1" aria-label="Coefficient a"></label><p id="relation"></p><script>
const slider=document.querySelector('input');function draw(){const a=Number(slider.value);document.querySelector('#curve').setAttribute('d','M40 220 L370 '+(220-100*a));document.querySelector('#point').setAttribute('cx',205);document.querySelector('#point').setAttribute('cy',220-50*a);document.querySelector('#value').textContent=a.toFixed(1);document.querySelector('#relation').textContent='Pour x = 1, y = '+a.toFixed(1)+'. Pour x = 2, y = '+(2*a).toFixed(1)+'.';}slider.addEventListener('input',draw);draw();
</script></body></html>"""
    second = copy.deepcopy(chapter)
    second["title"] = "Passer de l’observation à l’explication"
    second["intro"] = "La deuxième section vérifie que le laboratoire change au bon moment. Ce texte et cette expérience sont des fixtures de recette : la production utilisera le contenu renvoyé par le modèle à partir de tes propres documents."
    second["lab"]["title"] = "Comparer deux scénarios."
    second["lab"]["description"] = "Une nouvelle section active une nouvelle expérience."
    document["chapters"].append(second)
    return document


if __name__ == "__main__":
    fake_codex.generated_document = acceptance_document
    data = ROOT / ".prisme" / "acceptance-data"
    fixtures = ROOT / ".prisme" / "acceptance-fixtures"
    fixtures.mkdir(parents=True, exist_ok=True)
    (fixtures / "mon-cours.txt").write_text("Les relations linéaires\n\nUne relation y = ax associe deux quantités. Le paramètre a est le coefficient de proportionnalité.\n\nPour x = 1, y = a. Pour x = 2, y = 2a. À chaque augmentation Δx correspond une augmentation aΔx.\n\nReconstruire : comparer deux valeurs pour expliquer le rôle du coefficient.\n", encoding="utf-8")
    server = PrismeServer(("127.0.0.1", 8732), ROOT, data, client_factory=fake_codex.FakeCodexFactory())
    print("Recette fictive : http://127.0.0.1:8732", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
