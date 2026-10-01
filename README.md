# Atelier

Un cockpit local pour piloter des agents Codex et Oh My Pi, suivre le travail et conserver des preuves. Interface en français, sombre, utilisable dans un navigateur ; shell desktop optionnel pour le vrai ChatGPT. Le backend utilise Python standard et ne nécessite pas de clé API supplémentaire pour Codex.

## Démarrer

Depuis ce dossier :

```sh
python3 run.py
```

Sous Windows : `powershell -ExecutionPolicy Bypass -File scripts/start-atelier.ps1`. Ce lanceur démarre Python en arrière-plan, sélectionne le Codex de l'application installé s'il existe et réutilise les racines TLS publiques approuvées par Windows. Il ne désactive pas la validation TLS ; une variable CA explicite conserve la priorité. `python -B run.py` reste possible avec un environnement déjà configuré. Oh My Pi (`omp`) est facultatif ; ses comptes et clés API se configurent dans son terminal natif, également accessible depuis la vue Connexions.

L'éditeur de diagrammes requiert Node/npm et ses assets locaux :

```sh
npm ci
npm run vendor
```

Après démarrage du service, `npm run desktop` ouvre **Atelier desktop** avec ChatGPT.com intégré et les ressources autour. `ATELIER_URL` permet de choisir un autre port local. Depuis la page web, Nouveau chat ouvre cette même application desktop, pas un popup ChatGPT. Ce navigateur est Chromium, pas Firefox ; aucune iframe ni copie de compte. La connexion web initiale et l'envoi d'un fichier sont à vérifier manuellement. Le profil de connexion desktop reste privé dans `.atelier/desktop-profile/`.

Sur macOS, vous pouvez aussi ouvrir **Lancer Atelier.command**. Le service écoute exclusivement sur [127.0.0.1:4317](http://127.0.0.1:4317). Fermez-le avec `Ctrl+C` dans son terminal.

Prérequis : Python 3.9 ou plus et le CLI Codex installé, connecté avec `codex login`. Si le compte est déjà connecté, Atelier le retrouve par le protocole officiel. L’application ne lit pas son fichier de credentials. Vous pouvez lancer l’interface sans Codex et utiliser les tâches, les sprints, la mémoire et les fichiers.

```sh
python3 run.py --no-open --port 4318
```

Une seule instance doit utiliser le même dossier de données. `--data /chemin/vers/des-donnees` permet un espace indépendant.

## Modèles locaux sur ce Mac : oMLX et Splash

Dans **Agents / Code**, choisissez **oMLX · local** ou **Splash · local** (également accessibles dans **Connexions**), puis ouvrez le terminal. Codex se connecte au serveur local via son lanceur natif. Ports proposés : oMLX **8000**, Splash **8001**, modifiables au lancement. Les serveurs doivent déjà tourner ; Atelier ne télécharge ni ne charge de modèle automatiquement.

Le modèle vient du serveur : oMLX propose sa sélection native ; Splash utilise le modèle servi. oMLX gère sa propre authentification. Si Splash refuse l'accès, le terminal demande sa clé API avec saisie masquée ; elle reste dans l'environnement du processus, sans formulaire web ni enregistrement Atelier. La configuration de connexion est limitée au processus, sans modifier la connexion habituelle Codex/ChatGPT. Lecture seule par défaut, écriture projet sur choix explicite et `on-request` conservé. Aucune mission envoyée au lancement.

Ces terminaux ne remontent pas encore leurs tokens, coûts ou résultats dans les sessions Atelier. Le diagnostic des connexions sonde uniquement `/v1/models` sans clé : « Authentification requise » prouve une réponse HTTP protégée, pas l'échec du lanceur natif ni le succès d'une inférence. Le diagnostic affiche les ports proposés ; un autre port choisi dans le terminal n'est pas mémorisé dans cette carte.

## Ce qui fonctionne

- Catalogue Codex paginé et étendu (`includeHidden`), choix du modèle et de son effort de raisonnement ; accès réel distinct du catalogue.
- Catalogue Oh My Pi découvert, connexions natives OAuth/API et sessions Atelier avec outils de fichiers restreints, sans shell.
- Sessions persistantes, réponses en streaming, jusqu’à trois panneaux côte à côte, interruption et reprise.
- Lecture seule ou écriture projet ; demandes d’approbation et questions du modèle visibles dans l’interface.
- Dossier projet, worktree Git existant ou nouveau worktree. Les worktrees restent conservés après clôture.
- Équipes de 1 à 8 sous-agents ajoutables/supprimables, noms/rôles/consignes ; jusqu'à 20 tâches planifiées, vérification et synthèse facultatives. Les étapes sont séquentielles.
- Moteur, modèle et effort indépendants par rôle ; graphe des configurations et étapes réelles avec inspecteur de session.
- Tableau des tâches, priorités, sprints, affectation et file TODO activée au lancement des agents de travail ; réservation exclusive par tâche et dossier. Fin technique → En revue, Terminé reste humain.
- Vrai ChatGPT dans le shell optionnel : onglets fermables, ressources du projet, copie des consignes/fichiers et drag natif. Conversation CLI distincte avec mémoire, skills, fichiers, tokens observés et estimation du brouillon.
- Pages d'architecture avec blocs déplaçables, liens, ressources, agents existants, explication et import/export JSON ; un diagramme ne lance jamais un workflow implicitement.
- Diagnostic/plan en lecture seule par défaut ; validation explicite avant implémentation. Notifications vers la session, durées natives et preuve de processus vivant.
- Mémoire projet / utilisateur, noyau de 4 000 caractères maximum, réserve et recherche lexicale en lecture via MCP.
- Sélection de skills `SKILL.md` présents dans les dossiers du projet.
- Explorateur en lecture seule, aperçu d’images, état Git et lecture des PR si `gh` est installé et connecté.
- Tokens observés, cache lu, ventilation par fournisseur, consommateur, tâche, modèle et requête, export CSV ; quotas natifs du compte Codex distincts, estimation de coût sur tarifs saisis et sourcés, aucune facturation déduite de l’abonnement.
- Préparation d'un terminal Codex ou Oh My Pi avec rôle, modèle, effort, permissions et variantes OMP plan/slow/smol ; lancement après confirmation, aucun prompt automatique.
- Campagnes de 1 à 50 tests, contexte Atelier neuf, oracle exact ou review par un modèle distinct. Générateur de cas avec examen humain avant lancement, export JSON et hash du dataset.
- Journaux JSONL par agent, rapports JSON et résumés Markdown avec frontmatter YAML, sorties, handoffs JSON et hash SHA-256 des sorties.

## Périmètre de cette version

Les sessions restent des conversations outillées, avec mémoire et preuves structurées. La vue **Code** du desktop est désormais un véritable terminal PTY (node-pty / xterm) : Codex, Claude Code ou OMP, clavier, redimensionnement et onglets fermables. Aucun prompt n'est envoyé au lancement. Claude démarre en plan ; Codex garde son sandbox choisi et on-request ; OMP ne propose que les outils de lecture. Les tokens, durées de tour, TODO et rapports du terminal brut ne sont pas importés dans les sessions structurées. Fermer son onglet termine le processus ; les données natives du CLI restent conservées.

Plusieurs terminaux restent visibles simultanément dans la grille Code : une à
trois colonnes, déplacement par le titre, séparateurs redimensionnables,
agrandissement/restauration et fermeture individuelle. La vue Onglets reste
disponible ; sur mobile les consoles s'empilent. Les changements de disposition
ne relancent pas les CLI et ne perdent pas leur sortie.

Les sessions OMP intégrées ne disposent que de la lecture locale et, si autorisée, de l’écriture confirmée dans Atelier. Ni shell ni outils natifs, donc pas de tests de code exécutables par cet adaptateur. Le terminal OMP externe est en lecture seule, sans suivi importé ni sandbox OS garanti ; il n’envoie pas automatiquement la mission. La réserve mémoire MCP reste propre à Codex. Les connexions disponibles dépendent du CLI installé et des comptes effectivement configurés, pas d’une liste de modèles codée en dur.

Claude Code est accessible dans le terminal natif ; son adaptateur de session structurée et celui d'Ollama ne sont pas encore implémentés. Les benchmarks évaluent des réponses textuelles. Une review par modèle est un avis, pas une preuve de compilation ni une certification de sécurité. Les oracles de code et les recettes visuelles sont à ajouter.

GitHub est optionnel, en lecture. Création/merge de PR, scheduler par sous-tâche, worktrees parallèles et packaging d'installation desktop restent à développer. Le shell desktop de développement est disponible ; il n'importe pas les conversations ChatGPT ni `/mnt/data`. Les ressources locales ne sont transmises au site que par une action de l'utilisateur. Le contexte natif et sa compaction ne sont pas entièrement exposés. La jauge CLI concerne le dernier appel, l'estimation caractères/4 ne vaut pas token facturé. L'inventaire des processus externes ne démontre pas une activité du modèle. Voir les [limites et TODO](docs/audit/2026-10-01-workbench.md).

## Données et reprise

Tout est enregistré dans `.atelier/` : projections SQLite, `logs/*.jsonl`, `runs/<id>/output.md`, `handoff.json`, `report.md`, résultats et worktrees. Sauvegardez ce dossier avec les fichiers du projet. Les journaux sont ajoutés sans réécriture, mais ne constituent pas un stockage immuable protégé contre un administrateur local. Les clés connues et motifs usuels de credentials sont masqués ; cela ne remplace pas une revue des exports avant partage.

Après redémarrage, les sessions passent en état arrêté et se reprennent via leur thread Codex. Les campagnes interrompues sont conservées avec leurs résultats partiels ; elles ne reprennent pas automatiquement. Les demandes d’autorisation expirées sont effacées. Les TODO réservées sont libérées et leur file reste arrêtée jusqu'à votre activation explicite.

## Tests et maintenance

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
```

Les tests utilisent un fournisseur fictif et un dépôt Git temporaire. Ils ne consomment pas votre quota. Le contrôle fournisseur normal reste limité au protocole/catalogue. Une inférence réelle exige une autorisation explicite et un modèle exact, sans fallback ; le test autorisé du 1 octobre avec GPT-6-Luna est documenté dans le rapport courant.

Sous Windows : `$env:PYTHONDONTWRITEBYTECODE='1'; python -m unittest discover -s tests -v`. Vérifier aussi `node --check` sur chaque fichier `web/*.js`.

`node tests/test_cockpit.cjs` vérifie les calculs de consommation, le CSV et l’inspecteur sans navigateur ni fournisseur.

Recette navigateur isolée : lancer `python -B tests/browser_fixture.py`, puis `node tests/browser_acceptance.cjs` avec Playwright disponible. `ATELIER_BROWSER_CHANNEL=chrome` utilise Chrome installé. Le serveur fictif utilise le port 4320 et ses données/evidences privées sous `.atelier/`, sans modifier les sessions réelles. `python -B scripts/check_omp.py` vérifie seulement les métadonnées et les outils hôtes OMP, sans prompt.

`node tests/workbench_acceptance.cjs` vérifie les nouvelles vues ; `node tests/desktop_acceptance.cjs` vérifie le navigateur isolé et un vrai processus PowerShell avec echo clavier et fin native, sans CLI de modèle, login ni upload réel. Exécuter les recettes séquentiellement sur un serveur fictif neuf, car elles modifient leurs données de recette. Le script `scripts/probe-provider.py` ne fait que lire les métadonnées par défaut. Ne pas lui passer `--model` sans autorisation de consommer du quota.

La carte du projet et les références visuelles sont dans [docs/memory/INDEX.md](docs/memory/INDEX.md). Le contrat de cette version est dans [docs/memory/IMPLEMENTATION.md](docs/memory/IMPLEMENTATION.md).

L’intégration suit [Codex App Server](https://learn.chatgpt.com/docs/app-server) et [l’authentification Codex](https://learn.chatgpt.com/docs/auth), vérifiés le 30 septembre 2026 avec Codex CLI 0.157.1.

L’adaptateur OMP a été vérifié le 1 octobre 2026 avec Oh My Pi 18.1.10 : [RPC](https://github.com/can1357/oh-my-pi/blob/main/docs/rpc.md), [CLI](https://github.com/can1357/oh-my-pi/blob/main/docs/cli-reference.md) et [fournisseurs](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md). La demande et les cinq captures de cette évolution sont archivées dans `docs/`.
