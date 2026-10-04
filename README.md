# Atelier

## Application Android

**Atelier mobile** dispose d’un APK local dans `build/mobile/Atelier-mobile.apk`.
Il connecte plusieurs PC via Tailscale, permet de parcourir les projets, envoyer
des prompts et piloter les sessions/équipes du backend, avec leurs permissions.
L’application détecte les versions de l’APK proposées par le PC connecté.
Installation, appairage et commandes : [guide Android](docs/MOBILE.md).
Les exécutions et les comptes IA restent sur les PC.

## Télécharger l’application

**Atelier `0.3.0-beta.1` est disponible**, publié le 3 octobre 2026 dans la
[release bêta](https://github.com/Dmkn78/CLI_agent_dev/releases/tag/v0.3.0-beta.1).

| Système | Téléchargement |
|---|---|
| Windows x64 | [Installateur `.exe`](https://github.com/Dmkn78/CLI_agent_dev/releases/download/v0.3.0-beta.1/Atelier-0.3.0-beta.1-win-x64.exe) |
| macOS Apple Silicon / arm64 | [Installateur `.dmg`](https://github.com/Dmkn78/CLI_agent_dev/releases/download/v0.3.0-beta.1/Atelier-0.3.0-beta.1-mac-arm64.dmg) |
| Linux x64 | [Application `.AppImage`](https://github.com/Dmkn78/CLI_agent_dev/releases/download/v0.3.0-beta.1/Atelier-0.3.0-beta.1-linux-x86_64.AppImage) |

Les sources de cette version sont sur
[`branch_dev_laptop`](https://github.com/Dmkn78/CLI_agent_dev/tree/branch_dev_laptop).
Le [tag v0.3.0-beta.1](https://github.com/Dmkn78/CLI_agent_dev/tree/v0.3.0-beta.1)
identifie le commit source validé des installateurs.
Cette bêta ne porte pas de certificat d’éditeur Windows/macOS et n’est pas
notarisée par Apple. La production Windows/macOS requiert les certificats et
la notarisation ; le cycle de mise à jour entre deux versions reste à valider.

L’installateur contient Chromium, le service Python et Codex. Aucun Node ou
Python à installer pour utiliser Atelier. Ouvrez Atelier, puis **Se connecter
avec ChatGPT**. Git reste nécessaire pour les fonctions Git ; les autres CLI
(Oh My Pi, Claude Code, OpenCode) et les outils propres aux projets restent optionnels.

**Connexions → Atelier** permet de choisir la vérification et le téléchargement
automatiques des mises à jour. L’installation se déclenche par **Installer et
redémarrer**, après arrêt des travaux actifs. Les données restent dans le profil
utilisateur, séparées du programme. Le [guide de livraison](docs/RELEASE.md)
précise les architectures, les signatures, les données et les commandes de build.
L'[aperçu du système](docs/SYSTEM.md) décrit les composants et les permissions.
Les installateurs et artefacts de release excluent les profils personnels,
credentials, journaux, demandes archivées et captures d’écran du développement.
Les trois builds natifs ont réussi. Sous Linux, la recette valide le desktop
décompacté et son PTY ; le lancement de l’AppImage lui-même reste à vérifier.

Les **Canaux d’agents** réunissent jusqu’à huit agents, consultants,
orchestrateurs ou Duplica autour d’un sujet. Choisis chaque modèle, lance des
tours de discussion, puis relis le plan. Seules les réponses publiques circulent ;
copier un agent existant copie ses réglages. Une tâche issue du plan reste **En revue**.

Dans **Connexions → API locales & distantes**, ajoute un serveur compatible
Chat Completions (`/v1/chat/completions`) ou SystemOne (`/v1/systemone`). LAYA et
CLEF participent via SystemOne comme consultants de décisions ; un LLM écrit
le plan. Les serveurs et leurs modèles doivent être disponibles séparément.
Pour une clé facultative, indique une variable du service telle que
`ATELIER_LOCAL_API_KEY`. Les détails et la recette sont dans
[le rapport des canaux](docs/audit/2026-10-02-agent-channels.md).

Un cockpit local pour piloter des agents Codex et Oh My Pi, suivre le travail et conserver des preuves. Interface en français, sombre, utilisable dans un navigateur ; shell desktop optionnel pour le vrai ChatGPT. Le backend utilise Python standard et ne nécessite pas de clé API supplémentaire pour Codex.

## Démarrer depuis les sources

Depuis ce dossier :

```sh
python3 run.py
```

Sous Windows : `powershell -ExecutionPolicy Bypass -File scripts/start-atelier.ps1`. Ce lanceur démarre Python en arrière-plan, sélectionne le Codex de l'application installé s'il existe et réutilise les racines TLS publiques approuvées par Windows. Il ne désactive pas la validation TLS ; une variable CA explicite conserve la priorité. `python -B run.py` reste possible avec un environnement déjà configuré. Oh My Pi (`omp`) est facultatif ; ses comptes et clés API se configurent dans son terminal natif, également accessible depuis la vue Connexions.

Pour ouvrir la fenêtre Windows directement, exécuter
`./scripts/open-atelier.ps1`. Le lanceur démarre le service local si nécessaire,
vérifie qu'il appartient à ce projet, puis ouvre ou réaffiche Atelier.
`./scripts/install-atelier-shortcuts.ps1` ajoute **Atelier** au menu Démarrer et
au bureau de l'utilisateur, avec la version de PowerShell utilisée pour cette
installation. Le dossier du projet, Python et les dépendances Node doivent
rester présents ; il s'agit
d'un accès au desktop local, sans installateur autonome. Aucun changement de
politique d'exécution n'est nécessaire pour ces deux scripts locaux.

L'éditeur de diagrammes requiert Node/npm et ses assets locaux :

```sh
npm ci
npm run vendor
```

`npm run desktop` ouvre **Atelier** et démarre son service local si nécessaire. Sur macOS, le lanceur prépare une copie du moteur avec le nom et l’icône Atelier. Si Atelier est déjà ouvert, depuis l’installation ou les sources, ce lancement réaffiche la même fenêtre avant de démarrer un autre service. `ATELIER_URL` permet de rejoindre explicitement un service local existant. Depuis la page web, Nouveau chat rejoint également cette application desktop. Le service démarré par l’application s’arrête avec elle ; un service externe réutilisé reste sous le contrôle de son lanceur.

ChatGPT.com est intégré avec les ressources autour. Ce navigateur est Chromium ; aucune iframe ni copie de compte. À la première ouverture du chat intégré, clique sur « Se connecter » et termine la connexion dans Atelier ; ce navigateur conserve ensuite sa propre session. La connexion Codex ou celle de Firefox ne connecte pas automatiquement ce profil web. L’envoi d’un fichier reste à vérifier manuellement. Le profil de développement reste privé dans `.atelier/desktop-profile/`, distinct du profil de l’application installée ; leurs données ne sont pas fusionnées.

Sur macOS, **Lancer Atelier.command** et **Ouvrir Atelier corrigé.command** utilisent le même lancement Atelier. Une application déjà ouverte garde sa fenêtre et sa session ; les sources modifiées seront chargées au prochain démarrage depuis ce lanceur. La commande `python3 run.py` reste le mode développeur dans le navigateur, avec un service sur [127.0.0.1:4317](http://127.0.0.1:4317) à fermer par `Ctrl+C` dans son terminal.

Prérequis depuis les sources : Python 3.12, utilisé par la CI, et le CLI Codex installé, connecté avec `codex login`. Si le compte est déjà connecté, Atelier le retrouve par le protocole officiel. L’application ne lit pas son fichier de credentials. Vous pouvez lancer l’interface sans Codex et utiliser les tâches, les sprints, la mémoire et les fichiers.

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

Les sessions restent des conversations outillées, avec mémoire et preuves structurées. La vue **Code** du desktop est un véritable terminal PTY (node-pty / xterm) : Codex, Claude Code, OpenCode ou OMP, clavier et redimensionnement. Aucun prompt n'est envoyé au lancement. Claude démarre en plan ; Codex garde son sandbox choisi et on-request ; OMP ne propose que les outils de lecture. Les tokens, durées de tour, TODO et rapports du terminal brut ne sont pas importés dans les sessions structurées. Fermer le panneau conserve le processus ; **Options → Arrêter le terminal** le termine. Les données natives du CLI restent conservées.

Plusieurs terminaux restent visibles simultanément dans la grille Code : une à
trois colonnes, déplacement par le titre, séparateurs redimensionnables,
agrandissement/restauration et fermeture individuelle. La vue Onglets reste
disponible ; sur mobile les consoles s'empilent. Les changements de disposition
ne relancent pas les CLI et ne perdent pas leur sortie.

Les sessions OMP intégrées ne disposent que de la lecture locale et, si autorisée, de l’écriture confirmée dans Atelier. Ni shell ni outils natifs, donc pas de tests de code exécutables par cet adaptateur. Le terminal OMP externe est en lecture seule, sans suivi importé ni sandbox OS garanti ; il n’envoie pas automatiquement la mission. La réserve mémoire MCP reste propre à Codex. Les connexions disponibles dépendent du CLI installé et des comptes effectivement configurés, pas d’une liste de modèles codée en dur.

Claude Code est accessible dans le terminal natif ; son adaptateur de session structurée et celui d'Ollama ne sont pas encore implémentés. Les benchmarks évaluent des réponses textuelles. Une review par modèle est un avis, pas une preuve de compilation ni une certification de sécurité. Les oracles de code et les recettes visuelles des benchmarks sont à ajouter ; Duplica dispose de ses propres recettes indépendantes.

GitHub est optionnel, en lecture. Création/merge de PR, scheduler par sous-tâche, worktrees parallèles restent à développer. Le shell desktop de développement est disponible ; il n'importe pas les conversations ChatGPT ni `/mnt/data`. Les ressources locales ne sont transmises au site que par une action de l'utilisateur. Le contexte natif et sa compaction ne sont pas entièrement exposés. La jauge CLI concerne le dernier appel, l'estimation caractères/4 ne vaut pas token facturé. L'inventaire des processus externes ne démontre pas une activité du modèle. Voir les [limites et TODO](docs/audit/2026-10-01-workbench.md).

## Données et reprise

Tout est enregistré dans `.atelier/` : projections SQLite, `logs/*.jsonl`, `runs/<id>/output.md`, `handoff.json`, `report.md`, résultats et worktrees. Sauvegardez ce dossier avec les fichiers du projet. Les journaux sont ajoutés sans réécriture, mais ne constituent pas un stockage immuable protégé contre un administrateur local. Les clés connues et motifs usuels de credentials sont masqués ; cela ne remplace pas une revue des exports avant partage.

Après redémarrage, les sessions passent en état arrêté et se reprennent via leur thread Codex. Les campagnes interrompues sont conservées avec leurs résultats partiels ; elles ne reprennent pas automatiquement. Les demandes d’autorisation expirées sont effacées. Les TODO réservées sont libérées et leur file reste arrêtée jusqu'à votre activation explicite.

## Tests et maintenance

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
```

Les tests utilisent un fournisseur fictif et un dépôt Git temporaire. Ils ne consomment pas votre quota. Le contrôle fournisseur normal reste limité au protocole/catalogue. Une inférence réelle exige une autorisation explicite et un modèle exact, sans fallback.

Sous Windows : `$env:PYTHONDONTWRITEBYTECODE='1'; python -m unittest discover -s tests -v`. Vérifier aussi `node --check` sur chaque fichier `web/*.js`.

`node tests/test_cockpit.cjs` vérifie les calculs de consommation, le CSV et l’inspecteur sans navigateur ni fournisseur.

Recette navigateur isolée : lancer `python -B tests/browser_fixture.py`, puis `node tests/browser_acceptance.cjs` avec Playwright disponible. `ATELIER_BROWSER_CHANNEL=chrome` utilise Chrome installé. Le serveur fictif utilise le port 4320 et ses données/evidences privées sous `.atelier/`, sans modifier les sessions réelles. `python -B scripts/check_omp.py` vérifie seulement les métadonnées et les outils hôtes OMP, sans prompt.

`node tests/workbench_acceptance.cjs` vérifie les nouvelles vues ; `node tests/desktop_acceptance.cjs` vérifie le navigateur isolé et un vrai processus PowerShell avec echo clavier et fin native, sans CLI de modèle, login ni upload réel. Exécuter les recettes séquentiellement sur un serveur fictif neuf, car elles modifient leurs données de recette. Le script `scripts/probe-provider.py` ne fait que lire les métadonnées par défaut. Ne pas lui passer `--model` sans autorisation de consommer du quota.

L'[aperçu du système](docs/SYSTEM.md) décrit l'architecture et les permissions.
Le [rapport de livraison](docs/audit/2026-10-02-desktop-release.md) distingue
les tests observés, la publication et les limites restantes.

L’intégration suit [Codex App Server](https://learn.chatgpt.com/docs/app-server) et [l’authentification Codex](https://learn.chatgpt.com/docs/auth), vérifiés le 30 septembre 2026 avec Codex CLI 0.157.1.

L’adaptateur OMP a été vérifié le 1 octobre 2026 avec Oh My Pi 18.1.10 : [RPC](https://github.com/can1357/oh-my-pi/blob/main/docs/rpc.md), [CLI](https://github.com/can1357/oh-my-pi/blob/main/docs/cli-reference.md) et [fournisseurs](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md).
## Duplica Agent

Ouvrir **Duplica Agent** dans la navigation ou le bouton permanent **Duplica**.
Choisir le projet, puis discuter avec Duplica. La conversation reste en lecture
seule et se conserve par projet. **Travailler pour moi** confie un résultat à
un agent existant ou nouveau, avec un choix explicite de permissions ; la
supervision est limitée au projet sélectionné. **Suivi** ouvre les missions,
recettes et preuves. **Mémoire du projet** conserve le contexte réutilisable.
Dans **Permissions**, choisir les actions déléguées ; les profils des agents
restent lecture seule ou écriture projet avec `on-request`.

Dans **Suivi**, créer une session outillée de travail, puis **Confier une mission** : objectif,
fichiers attendus, commande de tests, build et parcours interface. Cocher la
transmission immédiate pour démarrer l'objectif avec cet agent. Les actions de
recette sont données sous forme d'arguments JSON et d'étapes explicites :

```json
[
  {"kind": "open_url", "url": "http://127.0.0.1:8000"},
  {"kind": "click", "label": "Exporter"},
  {"kind": "expect", "text": "Export réussi"}
]
```

Le desktop Atelier est requis pour les captures, clics et saisies. Le mode
**Interface obligatoire** conserve les demandes en attente si la fenêtre n'est
pas disponible. Le mode automatique privilégie l'interface lorsqu'elle est
connectée ; sinon il utilise le backend, avec le canal enregistré dans la timeline.

Activer au niveau voulu : tous les projets, un projet, un workflow, un agent ou
une tâche. **Pause**, **Stop** et **Reprendre la main** coupent les interventions
Duplica sans fermer les agents. Les relances sont bornées. Une fin technique ne
valide rien : la recette indépendante doit réussir, et les TODO restent En revue.

Les fichiers privés sont conservés sous `.atelier/duplica/` : contexte,
décisions, événements JSONL, captures et rapports avec hashes. Après un
redémarrage, inspecter la timeline puis reprendre explicitement la mission.

Telegram est facultatif. Depuis **Connecter Telegram**, créer un bot avec
[@BotFather](https://core.telegram.org/bots/features#botfather) (`/newbot`),
saisir son token dans le champ local masqué, puis envoyer au bot le code
`/start` affiché. Cliquer sur **Vérifier la connexion** dans les cinq minutes.
Le token est chiffré avec DPAPI pour le compte Windows qui lance le service,
dans `.atelier/duplica/telegram-token.bin`. Il n'est pas transmis aux processus
des agents ni des recettes. Seul le compte ayant utilisé le code dans une
conversation privée est accepté.

`/project` liste les projets ; `/project identifiant` choisit la conversation.
Les messages libres et `/chat texte` rejoignent la discussion du projet dans
Atelier, et la réponse de Duplica revient sur Telegram. Pour une instruction
de travail, choisir un agent supervisé avec `/current`, puis `/instruct texte`.
Les permissions de l'agent s'appliquent toujours. Autres commandes :
`/status`, `/current identifiant_agent`, `/continue`, `/pause`, `/stop`,
`/screenshot`, `/logs`, `/approve identifiant_demande`, `/deny identifiant_demande`,
`/answer identifiant_demande réponse`.
La configuration par environnement reste possible avec
`DUPLICA_TELEGRAM_BOT_TOKEN` et `DUPLICA_TELEGRAM_CHAT_ID`, puis activation dans
Permissions. Aucun credential Codex n'est lu ou copié.

Le contrôleur actuel couvre Atelier et un navigateur local isolé. Le contrôle
des applications Windows externes, notamment Excel, nécessite un adaptateur
supplémentaire. Les terminaux natifs remontent leurs processus et activité,
sans prétendre déduire leurs questions ou la réussite d'une mission.
Les compteurs Codex CLI sont lus dans ses journaux natifs, sans importer la
conversation. Une correspondance unique avec le terminal est associée
automatiquement ; en cas d'ambiguïté, utiliser **Associer une session Codex**
en bas du panneau. Un premier tour doit avoir produit un journal natif.
Les tokens concernent toute cette session, y compris avant une reprise ;
l'abonnement et le quota sont ceux du compte partagé. Une mesure absente
reste inconnue. Claude Code, OpenCode et OMP n'ont pas d'import de compteurs
CLI dans ce parcours. Les sessions outillées conservent leurs mesures natives.

**Sprints** propose **Voir les tâches**, qui filtre le tableau et présélectionne
le sprint pour une nouvelle tâche. Le serveur valide les dates et empêche de
lier une tâche au sprint d'un autre projet. Après un redémarrage du service,
la session locale est renouvelée uniquement après un refus avant exécution ;
une action dont le résultat est incertain n'est pas rejouée.

Recettes reproductibles, sans modèle réel par défaut :

```powershell
python -B tests/browser_fixture.py
# Dans un autre terminal, avec Playwright disponible :
$env:ATELIER_BROWSER_CHANNEL='chrome'
node tests/duplica_browser_acceptance.cjs
# Avec une fixture neuve pour ce parcours :
node tests/duplica_ux_acceptance.cjs
```

Pour la démonstration avec vrais clics/clavier, lancer
`python -B tests/duplica_fixture.py`, puis `node tests/duplica_acceptance.cjs`.
Elle utilise les ports locaux 4328/4329 et conserve des données isolées sous
`.atelier/duplica-e2e/`. Le serveur fictif se ferme après la recette Electron.
`--real-model MODELE_EXACT` est une option explicite de ce serveur de test : elle
consomme du quota, exige le modèle découvert et une connexion native, et utilise
un dossier synthétique temporaire. Aucun remplacement de modèle. Sur Windows,
ce dossier donne accès hérité à son compte créateur pour permettre la lecture
des fichiers créés par le compte du sandbox ; cela ne modifie pas le projet.

Résultats, preuves et limites de la livraison :
[rapport Duplica du 2 octobre](docs/audit/2026-10-02-duplica.md).
La discussion, Telegram, les compteurs, les sprints et la contribution réelle
de Duplica sont documentés dans le [complément UX](docs/audit/2026-10-02-duplica-ux.md).
