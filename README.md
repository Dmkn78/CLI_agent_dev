# Atelier

Un cockpit local pour piloter des agents Codex et Oh My Pi, suivre le travail et conserver des preuves. Interface en français, sombre, utilisable dans un navigateur. Aucun framework, service cloud ou clé API supplémentaire requis pour l’intégration Codex.

## Démarrer

Depuis ce dossier :

```sh
python3 run.py
```

Sous Windows : `python -B run.py`. Oh My Pi (`omp`) est facultatif ; ses comptes et clés API se configurent dans son terminal natif, également accessible depuis la vue Connexions.

Sur macOS, vous pouvez aussi ouvrir **Lancer Atelier.command**. Le service écoute exclusivement sur [127.0.0.1:4317](http://127.0.0.1:4317). Fermez-le avec `Ctrl+C` dans son terminal.

Prérequis : Python 3.9 ou plus et le CLI Codex installé, connecté avec `codex login`. Si le compte est déjà connecté, Atelier le retrouve par le protocole officiel. L’application ne lit pas son fichier de credentials. Vous pouvez lancer l’interface sans Codex et utiliser les tâches, les sprints, la mémoire et les fichiers.

```sh
python3 run.py --no-open --port 4318
```

Une seule instance doit utiliser le même dossier de données. `--data /chemin/vers/des-donnees` permet un espace indépendant.

## Ce qui fonctionne

- Catalogue réel Codex, choix du modèle et de son effort de raisonnement.
- Catalogue Oh My Pi découvert, connexions natives OAuth/API et sessions Atelier avec outils de fichiers restreints, sans shell.
- Sessions persistantes, réponses en streaming, jusqu’à trois panneaux côte à côte, interruption et reprise.
- Lecture seule ou écriture projet ; demandes d’approbation et questions du modèle visibles dans l’interface.
- Dossier projet, worktree Git existant ou nouveau worktree. Les worktrees restent conservés après clôture.
- Duo implémenteur / vérificateur ; workflow planificateur → 1 à 3 tâches → vérificateur → synthèse. Les étapes sont séquentielles.
- Moteur, modèle et effort indépendants par rôle ; graphe des configurations et étapes réelles avec inspecteur de session.
- Tableau des tâches, priorités, sprints et rattachement d’une session à une tâche. Les statuts de tâches restent une décision humaine.
- Mémoire projet / utilisateur, noyau de 4 000 caractères maximum, réserve et recherche lexicale en lecture via MCP.
- Sélection de skills `SKILL.md` présents dans les dossiers du projet.
- Explorateur en lecture seule, aperçu d’images, état Git et lecture des PR si `gh` est installé et connecté.
- Tokens observés, cache lu, ventilation par fournisseur, consommateur, tâche, modèle et requête, export CSV ; aucune facturation déduite de l’abonnement.
- Préparation d’un terminal Oh My Pi avec rôle, modèle, effort et variantes plan/slow/smol ; lancement après confirmation.
- Campagnes de 1 à 50 tests, contexte Atelier neuf, oracle exact ou review par un modèle distinct. Générateur de cas avec examen humain avant lancement, export JSON et hash du dataset.
- Journaux JSONL par agent, rapports Markdown, sorties, handoffs JSON et hash SHA-256 des sorties.

## Périmètre de cette version

Les sessions sont des conversations outillées Codex, avec un affichage de console structuré. Ce n’est pas encore un terminal PTY avec toute l’interface TUI de Codex.

Les sessions OMP intégrées ne disposent que de la lecture locale et, si autorisée, de l’écriture confirmée dans Atelier. Ni shell ni outils natifs, donc pas de tests de code exécutables par cet adaptateur. Le terminal OMP externe est en lecture seule, sans suivi importé ni sandbox OS garanti ; il n’envoie pas automatiquement la mission. La réserve mémoire MCP reste propre à Codex. Les connexions disponibles dépendent du CLI installé et des comptes effectivement configurés, pas d’une liste de modèles codée en dur.

Claude Code et Ollama sont détectés ; leurs adaptateurs de session ne sont pas encore implémentés. Les benchmarks évaluent des réponses textuelles. Une review par modèle est un avis, pas une preuve de compilation ni une certification de sécurité. Les oracles de code et les recettes visuelles sont à ajouter.

GitHub est optionnel, en lecture. Création/merge de PR, scheduler de ressources, worktrees par sous-tâche en parallèle et distribution desktop native restent à développer. ChatGPT s’ouvre dans son navigateur ; ni ses conversations ni son environnement `/mnt/data` ne sont fournis par Codex app-server.

## Données et reprise

Tout est enregistré dans `.atelier/` : projections SQLite, `logs/*.jsonl`, `runs/<id>/output.md`, `handoff.json`, `report.md`, résultats et worktrees. Sauvegardez ce dossier avec les fichiers du projet. Les journaux sont ajoutés sans réécriture, mais ne constituent pas un stockage immuable protégé contre un administrateur local. Les clés connues et motifs usuels de credentials sont masqués ; cela ne remplace pas une revue des exports avant partage.

Après redémarrage, les sessions passent en état arrêté et se reprennent via leur thread Codex. Les campagnes interrompues sont conservées avec leurs résultats partiels ; elles ne reprennent pas automatiquement. Les demandes d’autorisation expirées sont effacées.

## Tests et maintenance

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
```

Les tests utilisent un fournisseur fictif et un dépôt Git temporaire. Ils ne consomment pas votre quota. La recette avec le compte réel vérifie uniquement le protocole et le catalogue, sans inférence.

Sous Windows : `$env:PYTHONDONTWRITEBYTECODE='1'; python -m unittest discover -s tests -v`. Vérifier aussi `node --check` sur chaque fichier `web/*.js`.

`node tests/test_cockpit.cjs` vérifie les calculs de consommation, le CSV et l’inspecteur sans navigateur ni fournisseur.

Recette navigateur isolée : lancer `python -B tests/browser_fixture.py`, puis `node tests/browser_acceptance.cjs` avec Playwright disponible. `ATELIER_BROWSER_CHANNEL=chrome` utilise Chrome installé. Le serveur fictif utilise le port 4320 et ses données/evidences privées sous `.atelier/`, sans modifier les sessions réelles. `python -B scripts/check_omp.py` vérifie seulement les métadonnées et les outils hôtes OMP, sans prompt.

La carte du projet et les références visuelles sont dans [docs/memory/INDEX.md](docs/memory/INDEX.md). Le contrat de cette version est dans [docs/memory/IMPLEMENTATION.md](docs/memory/IMPLEMENTATION.md).

L’intégration suit [Codex App Server](https://learn.chatgpt.com/docs/app-server) et [l’authentification Codex](https://learn.chatgpt.com/docs/auth), vérifiés le 30 septembre 2026 avec Codex CLI 0.157.1.

L’adaptateur OMP a été vérifié le 1 octobre 2026 avec Oh My Pi 18.1.10 : [RPC](https://github.com/can1357/oh-my-pi/blob/main/docs/rpc.md), [CLI](https://github.com/can1357/oh-my-pi/blob/main/docs/cli-reference.md) et [fournisseurs](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md). La demande et les cinq captures de cette évolution sont archivées dans `docs/`.
