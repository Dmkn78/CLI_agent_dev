# Recettes et sources

Repères au 3 octobre 2026 ; inspecter les fichiers avant de choisir une commande.

- tests/feedback_fixture.py : backend isolé, FakeCodex, fichiers synthétiques, --port (4332 par défaut).
- tests/feedback_acceptance.cjs : ATELIER_TEST_URL, ATELIER_TEST_EVIDENCE, ATELIER_BROWSER_CHANNEL ; pièces jointes, commandes, canaux et largeurs.
- tests/channels_acceptance.cjs : participants/discussion fictifs ; ports propres à sa fixture.
- tests/browser_acceptance.cjs : recette historique ; vérifier attentes contre UI actuelle.

Exemple feedback dans deux sessions du projet, avec un Python compatible avec le backend (3.10 minimum). Vérifier python3 --version ; si le Python système est trop ancien, sélectionner un interpréteur installé compatible sans installer automatiquement un runtime :

    PYTHONDONTWRITEBYTECODE=1 python3 tests/feedback_fixture.py --port 4332

Après message de disponibilité et vérification du port :

    ATELIER_TEST_URL=http://127.0.0.1:4332/ ATELIER_TEST_EVIDENCE=.atelier/test-evidence/feedback ATELIER_BROWSER_CHANNEL=chrome node tests/feedback_acceptance.cjs

Navigateur et dépendances du dépôt doivent être disponibles. Sinon utiliser un contrôleur disponible ou signaler la limite ; pas d’installation implicite depuis une recherche GitHub.

Sources primaires inspectées le 3 octobre 2026 :

- [Microsoft Playwright — Best practices](https://github.com/microsoft/playwright/blob/main/docs/src/best-practices-js.md), comportement utilisateur et isolation : oracle et fixture.
- [Microsoft Playwright — Trace Viewer](https://github.com/microsoft/playwright/blob/main/docs/src/trace-viewer.md), Console/Network/Metadata : corréler actions et observations techniques. Les traces restent privées.
