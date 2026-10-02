# État de l’implémentation — Duplica, 2 octobre 2026

## Accès Windows à Atelier

Le [correctif de lancement](../audit/2026-10-02-atelier-windows-launcher.md)
ajoute `scripts/open-atelier.ps1` et `scripts/install-atelier-shortcuts.ps1`.
Les raccourcis **Atelier** existent dans le menu Démarrer et sur le bureau du
poste de Damien. Le service local est réutilisé après contrôle du dossier,
et Electron réaffiche sa fenêtre unique. Le fournisseur de certificats est
chargé depuis le PowerShell courant si nécessaire ; aucune politique Windows
n'est modifiée.

Deux ouvertures réelles ont été vérifiées : même serveur sur 4317 et même
fenêtre **Atelier · Agents & projets**, laissée sur **Canaux d’agents → Plan
avant action**. Duplica reste en pause, aucune session active. C'est l'état
observé lors de la recette, pas une garantie de processus toujours actifs.
Le projet et ses dépendances restent requis ; pas d'exécutable autonome livré.

## Discussion, Telegram et retours UX

Le complément [duplica-ux](../audit/2026-10-02-duplica-ux.md) décrit l'état le
plus récent : discussion durable par projet et partagée avec Telegram,
Travailler pour moi limité au projet choisi, UI charbon chaud/arrondie,
compteurs et abonnement proches des sessions. Le composant de consommation
a été réellement développé en partie par Duplica avec GPT-6-Luna, contrôlé
indépendamment puis relu et intégré.

Telegram propose une création/association guidée par code privé de cinq
minutes et un coffre DPAPI Windows ; aucun bot réel n'est encore configuré.
Ses messages libres discutent désormais avec Duplica ; `/instruct` dirige
explicitement un agent choisi. Les secrets du relais sont exclus des
processus des agents et des recettes. Les TUI restent non automatisés ;
seuls les compteurs Codex CLI sont lus via leurs journaux, avec association
unique ou explicite, sans importer les conversations.

Les sprints ouvrent un tableau filtré et présélectionnent le sprint lors
d'une création de tâche ; dates et projet sont validés côté serveur. Le
nonce HTTP est renouvelé après refus avant exécution, sans rejouer les
résultats incertains. La TODO `task_18c4e845ba7b` suit ce correctif.
Validation : 94 tests backend, 93 réussis et 1 saut Windows ; calculs et
recettes navigateur/UX/workbench/manager réussis. Electron : sept PTY et
compteurs, resize/drag/mobile réussis ; Duplica fictif réalise deux corrections
et trois vérifications par vrais clics/clavier. Détails et limites dans
le rapport. Aucun resize n'est envoyé après la sortie du terminal. La TODO
des sprints/reconnexion est **En revue** ; le backend local est relancé.
Le terminal utilisateur est préservé. La fenêtre desktop déjà ouverte charge
les anciens scripts jusqu'à son prochain lancement ; le navigateur local
permet de consulter immédiatement la nouvelle interface.

## Duplica Agent

Duplica est intégré à `Application`, au cockpit, aux sessions, workflows et
TODO. Un indicateur reste dans la barre principale ; la vue manager réunit les
missions, états observés, demandes, recettes, décisions et preuves. La mémoire
globale/projet, les décisions exactes et les permissions sont persistantes sous
`.atelier/duplica/`. Le service est désactivé par défaut ; global → projet →
workflow → tâche → agent définit l'héritage, avec Pause/Stop/reprise de contrôle
comme barrière générale. Les campagnes de benchmark restent exclues.

Le backend Codex réutilise `app-server`, les sessions existantes et `on-request`.
Une question connue est résolue depuis une réponse explicitement enregistrée,
avec sa source ; une question inconnue ou contradictoire demande l'utilisateur.
Les commandes sont classifiées prudemment, avec contrôle du dossier ; les
profils de plan et lecture seule empêchent l'approbation automatique d'écriture.

Le `ComputerController` utilise le shell Electron : captures réelles, contrôles
observés, clics, double clics, défilement et clavier. Les observations expirent
et se consomment une seule fois ; un contrôle changé avant clic autorise une
nouvelle observation bornée, un résultat incertain ne se rejoue pas. Il couvre
Atelier et un navigateur HTTP local isolé. Les GUI externes, Excel et les TUI
natifs ne sont pas automatisés par ce contrôleur ; les PTY remontent uniquement
PID, ouverture/fermeture et activité de sortie.

Une mission conserve une recette explicite : fichiers attendus, tests, build
(ou absence de compilation déclarée), commande d'application et parcours GUI
avec résultat visible. Duplica exécute les tests lui-même, lance son processus
d'application, utilise la GUI, écrit les rapports/captures, demande les
corrections puis reteste, avec 0 à 10 relances. Le résultat `Vérifiée` dépend de
tous ces contrôles ; les TODO restent **En revue**, pour validation humaine.
Un outil ou fichier inaccessible produit `non exécuté` et une demande, sans
relance de code. Une redéfinition des critères ne transforme pas une ancienne
observation en correction validée. Les actions GUI sont auditées avec captures.

Le watchdog signale silence/crash sans redémarrage aveugle. Après redémarrage,
état et preuves restent conservés, Duplica passe en pause et la mission se
reprend explicitement. Telegram est un relais facultatif, activé par l'utilisateur
et configuré dans l'environnement ; il accepte un seul compte en conversation
privée, conserve l'offset et transmet les événements importants. Aucun bot réel
n'a été configuré ou contacté pendant cette livraison.

Les empreintes SHA-256 des rapports, sorties de commande et artefacts de session
portent sur les octets UTF-8 réellement écrits, sans conversion de fins de ligne.

Validation du 2 octobre : **83 tests backend, 82 réussis et 1 saut symlink
Windows** ; syntaxe JS/CJS et calculs cockpit vérifiés. Recette navigateur Duplica
et régression du cockpit aux largeurs 1600/900/390/300, sans erreur JS ni
débordement global. Recette Electron avec fournisseur fictif : permission et
réponse CSV par vrais clics/saisie, deux relances, trois vérifications, deux bugs
résolus après retest. Recette réelle **GPT-6-Luna** : défaut contrôlé, une
relance/correction, deux vérifications, tests et parcours GUI réussis. Le modèle
réel n'a demandé ni permission ni réponse : ces branches sont prouvées par la
recette fictive, pas attribuées artificiellement au modèle réel.
Régression desktop : navigateur isolé, PTY echo/fin, sept terminaux, déplacement,
redimensionnement, onglets et affichage compact vérifiés. Les métadonnées Duplica
partent après l'attachement des flux natifs pour préserver le démarrage du PTY.

Les détails, commandes et preuves privées sont dans le
[rapport Duplica](../audit/2026-10-02-duplica.md). L'inférence de préférences en
langage naturel, le contrôle Windows externe et les autres backends spécifiques
restent à développer. Une recette qui réussit ne prouve pas tous les workflows
possibles ni un fonctionnement continu de plusieurs heures.

## État précédent : workbench

La plateforme intègre Codex app-server et Oh My Pi RPC. Le cockpit charbon/cyan suit sessions, workflows et consommation observée. Le workbench ajoute vrai navigateur ChatGPT optionnel, canvas de conception, notifications, quotas natifs, durées de tours, rapports compacts et plan soumis à validation. Voir le [rapport courant](../audit/2026-10-01-workbench.md), le [rapport chat/équipes précédent](../audit/2026-10-01-chat-teams-todo.md) et les [retours utilisateur](../references/2026-10-01-workbench-feedback.md). Le test synthétique autorisé GPT-6-Luna a réussi ; cela ne prouve pas l'accès à tous les modèles ni la qualité d'une implémentation.

## Couverture de la demande

| Demande | Version actuelle | Limite / suite |
|---|---|---|
| Création d’agents | Catalogues/efforts Codex et OMP, mission, rôle, permissions, tâche, skills, dossier/worktree | OMP sans shell ni MCP de réserve ; autres adaptateurs à ajouter |
| Plusieurs fenêtres | Grille d’agents, 1 à 3 sessions côte à côte, streaming structuré | Terminal PTY/TUI complet à ajouter |
| Sprints et tâches | CRUD local, affectation, priorités, file TODO des agents lancés, bail tâche/dossier, fin → En revue | Dépendances, scheduler par sous-tâche et budgets à ajouter ; Terminé reste humain |
| Git/worktrees | Lecture Git, sélection d’un worktree, création de branche et worktree local | Aucun cleanup ou merge automatique |
| Pull requests | Lecture avec `gh`, état de review/checks et lien vers GitHub ; dépôt CLI_agent_dev identifié | Création/merge dans le produit à ajouter |
| Second cerveau | Souvenirs projet/utilisateur, budget combiné 4 000 caractères, recherche lexicale MCP à la demande, provenance | Promotion assistée de logs et embeddings à ajouter si utiles |
| Bibliothèque de skills | Bibliothèque du projet, sélection de `SKILL.md`, validation des chemins | Pas de chargement automatique de tous les skills personnels |
| Tokens et graphes | Mesures par fournisseur/consommateur/tâche/modèle/requête, CSV ; quotas du compte Codex, tarifs saisis/sourcés et estimation USD | Factures, tarifs publics automatiques, devises et comptes multiples non importés |
| Connexions | Codex/ChatGPT ; fournisseurs OAuth/API découverts par OMP et login dans son terminal natif | Aucun secret dans le formulaire web ; succès d’inférence non vérifié |
| Terminaux | PTY node-pty/xterm integre au desktop : Codex, Claude Code, OMP, clavier, resize, onglets fermables ; sessions structurees conservees | Pas de tokens/historique/temps de tour importes du PTY ; Claude en plan, OMP outils de lecture, lancement explicite sans prompt |
| Chat/contexte | Vrai ChatGPT dans shell desktop optionnel, ressources/consignes/copie/drag ; conversations CLI distinctes avec contexte observé | Login/upload ChatGPT à valider humainement ; Chromium, pas Firefox ; profils SQL/CIW à ajouter ; pas de tokens/historique du site importés |
| Fichiers | Navigation, source numérotée, images, lecture seule, contrôle des chemins | Écriture/édition et diff IDE à ajouter |
| Multi-agent | 1 à 8 sous-agents ajoutables/supprimables, noms/rôles/consignes/modèles indépendants, review/synthèse facultatives ; max 20 tâches, graphe et handoffs | Séquentiel ; reconfiguration pour nouveau lancement ; worktrees par sous-tâche/parallélisme/budgets à ajouter |
| Modèles Codex/ChatGPT | Catalogue paginé `includeHidden=true`, entrées étendues identifiées ; TODO réelle prioritaire ajoutée | TODO ouverte : écart offre ChatGPT/catalogue Codex et accès effectif non vérifié |
| Rapports et audit | JSONL par agent, JSON canonique, résumé MD/YAML, durées natives, hash et UNVERIFIED | Attestations de tests/runtime indépendants à ajouter |
| Architecture éditable | Pages, diagramme LogicFlow, déplacement/liens, ressources, agents existants, explication et JSON proposé/importé | Pas encore un scheduler n8n ; liens inertes, pas de déclenchement ou injection de ressource implicite |
| Plan et notifications | Diagnostic en lecture seule par défaut, validation humaine avant implémentation ; cloche liée à la session | Le modèle peut échouer à reproduire : inconnue conservée ; preuve de test rouge/vert requise, jamais présumée |
| Processus et connexion | PID du fournisseur Atelier, erreurs de retry visibles, inventaire Windows partiel, CA Windows scoped | Tous les CLI externes et leur activité non attribuables ; nouvel OAuth à vérifier humainement |
| Benchmarks | 1 à 50 candidats, jeu JSON hashé, répétitions, générateur proposant des cas, oracle exact ou juge modèle distinct, exports | Oracles exécutables de code, navigateur, sécurité/alignement et recette humaine structurée à ajouter |
| Maintenabilité | Sources archivées, quinze captures utilisateur dont trois identiques, hashes, annotations navigateur, demande canonique, architecture, design, audits et tests | Captures marquées inline sans chemin : texte conservé, aucun binaire prétendu archivé |

## Points techniques à connaître

- Backend Python standard et CLI ; canvas LogicFlow bundlé via Node/esbuild, shell Electron optionnel. Versions épinglées dans package-lock ; `npm ci` puis `npm run vendor` nécessaires au canvas.
- Le serveur n’écoute que sur `127.0.0.1`. Les API exigent un nonce par lancement ; Host et Origin sont vérifiés. Les données privées sont dans `.atelier/`, ignorées par Git.
- `codex app-server`, MCP mémoire et `omp --mode rpc` sont les interfaces réelles. Le frontend n’automatise pas ChatGPT et ne copie pas les credentials. Les comptes OMP sont indépendants des comptes Codex.
- OMP n’active que les outils hôtes de fichiers ; l’écriture est confirmée dans Atelier et revalidée avant application. Les outils shell/MCP/délégation sont absents. Le protocole v1 est supporté ; les frames fragmentées non prises en charge échouent explicitement. Les fichiers de session OMP restent privés dans `.atelier/`.
- Le catalogue local n’est pas une entitlement garantie. Un tour réussi doit confirmer l’accès réel pour la requête.
- Une session sans aucun message n’a pas forcément de rollout Codex. À sa reprise, Atelier recrée un thread vide en conservant l’identifiant local et la trace. Avec des messages, il appelle `thread/resume`.
- Le MCP mémoire Codex est requis lorsqu’il est activé : sa panne fait échouer le démarrage. OMP ne reçoit que le noyau, sans réserve MCP.
- Les workflows utilisent un seul worktree, séquentiellement. Aucun orchestrateur secondaire natif n’est lancé.
- La file TODO ne démarre que pour un agent de travail explicitement lancé avec `startWork` ou activé par l'utilisateur. Les nouvelles tâches réveillent les abonnés compatibles. Échec/interruption arrête la file ; redémarrage libère les baux sans reprendre le travail. Même dossier : un seul propriétaire automatique ; les actions manuelles hors file restent à isoler.
- Le chat n'envoie pas de mission au démarrage et ne prend pas le backlog. Les fichiers de contexte sont relatifs au projet et bornés à 8 fichiers / 64 Ko chacun / 40 000 caractères. Le panneau montre le dernier appel et les instructions réellement transmises, pas une reconstruction complète du contexte interne du fournisseur.
- La configuration native du CLI reste applicable aux benchmarks. Le mode sans mémoire désactive le noyau et MCP Atelier, pas tout l’environnement du fournisseur. Lors de la recette réelle, des MCP natifs (`codex_apps`, `cua_repl`, `node_repl`) étaient présents. Une table `mcp_servers={}` ne les supprimait pas ; cet override inefficace a été retiré. La V1 ne prétend donc pas filtrer tous les outils du fournisseur.
- 50 tests signifie 50 candidats maximum. La génération et les reviews distinctes ajoutent des inférences et du quota.
- Les coûts facturés et les équivalents API ne sont pas inventés. Les graphes n’utilisent que les mesures reçues.
- Le rapport de clôture est déterministe et ne consomme pas d’inférence supplémentaire. Il montre les preuves d’outils et les déclarations de l’agent comme des objets distincts.

## Vérifications Actuelles

55 tests backend executes : 54 reussis, 1 saut symlink Windows. Syntaxe JS/CJS
et calculs verifies. Recettes navigateur, workbench et desktop fictif : navigateur
isole, bounds, masque au survol, fermeture, vrai processus PTY avec echo clavier
et sortie/fin observes. Aucun login ChatGPT, upload reel ou inference dans cette
livraison. Details et limites : audit desktop-terminals.

La navigation entiere et les ressources se masquent/restaurent ; le chat dispose
de back/forward/reload/home et focus. Le site utilise un WebContentsView isole,
pas un iframe. Le bouton depuis un navigateur ouvre Atelier desktop avec le chat
dans cette fenetre ; le popup externe ChatGPT a ete retire. Le profil web prive
est persistant ; connexion humaine initiale requise. Recherche et apercus ont
ete revises, les liens de memoire/tache corriges, et l'ajout de projet a un
selecteur natif de dossier. La palette par defaut est anthracite.

Vue Code : grille de PTY par defaut, une a trois colonnes, deplacement entre
colonnes, hauteurs ajustees par separateur, agrandissement/restauration et
fermeture separee. Onglets en option. Sept panneaux simultanes testes avec
processus PowerShell fictifs, sans chevauchement, drag et resize observes.
Sous 800 pixels, panneaux empiles et page defilante. Les sorties/processus ne
sont pas recrees lors d'un changement de vue ; preferences de mode/colonnes
locales, position/tailles detaillees en memoire seulement.

Un evenement `account/updated` partiel sans `authMode` ne deconnecte plus Codex.
Les vues Connexions et Consommation partagent le rendu des quotas ; Connexions
distingue explicitement Codex, OMP et le site web. Aucune connexion fictive n'est
affichee pour masquer le besoin de connexion independante OMP.

Le dernier test réel autorisé GPT-6-Luna a terminé en 3 725 ms avec réponse et mesures natives de tokens, après configuration du CA Windows. Connexion et quotas réellement lus, aucun secret copié. Le test n'établit pas la recette humaine du nouvel OAuth ni l'accès aux autres modèles. Le catalogue courant contient dix entrées à cette vérification (Codex 0.159.2) ; les nombres des livraisons précédentes sont historiques.

## Vérifications Précédentes

43 tests automatisés exécutés, 42 réussis et 1 saut de symlink Windows faute de privilège dédié. La traversée et les fichiers sensibles sont vérifiés avant ce saut. Couverture supplémentaire : catalogue étendu paginé, chat/contexte borné et reconfigurable, reprise du contexte après redémarrage, bail tâche/dossier et affectation, TODO existantes/futures, échec sans retry, sous-agents dynamiques et rôles facultatifs, terminal Codex sans bypass. Couverture précédente préservée. Vérification syntaxique de tous les fichiers JS.

Recette Playwright/Chrome avec fournisseur fictif : graphe/inspecteur, configuration de quatre sous-agents et retrait, reconfiguration, review/synthèse désactivées, chat avec fichiers/skills/modèle et tokens entrée/réponse, affectation TODO et passage En revue, préparation des terminaux Codex/OMP, Codex visible en consommation. Dix vues plus chat à 1600/900/390/300 pixels, sans erreur JS, débordement global ni nœuds coupés sur mobile. Captures/résultat privés sous `.atelier/browser-evidence/`. Aucun terminal interactif ni prompt réel lancé par cette recette.

Recette OMP 18.1.10 limitée aux métadonnées : démarrage sans outils natifs, enregistrement d’`atelier_read`, liste active conforme, catalogue et fournisseurs de login. Aucun secret lu ni inférence envoyée.

Recette réelle initiale : connexion ChatGPT détectée, 7 modèles découverts, création en lecture seule d’un thread Codex, clôture avec artefacts. Aucun prompt d’inférence réel envoyé. Le journal de cette session technique demeure dans `.atelier/logs/`.

La réussite des tests n’est pas présentée comme une approbation produit de Damien. Les données historiques ou fictives ne sont pas injectées dans son espace réel pour remplir le cockpit.

## Prochaines unités de travail

TODO prioritaire ajoutée à la demande explicite de Damien : compléter/vérifier les modèles Codex/ChatGPT manquants. La découverte étendue est corrigée, mais la tâche reste À faire tant que les écarts d'offre et l'accès réel ne sont pas établis sans réutilisation de credentials.

Après redémarrage de cette livraison : 11 entrées Codex, dont 6 masquées, contre 5 visibles avant correctif. Vérification limitée aux métadonnées, sans inférence. Les modèles absents ne sont pas ajoutés artificiellement.

1. Effectuer une recette réelle explicitement autorisée par moteur/fournisseur ; vérifier quotas et accès effectif sans supposer que le catalogue est une entitlement.
2. Valider le login/upload ChatGPT desktop et les CLI natifs humainement ;
   packaging distribue, profils SQL/CIW, observabilite du PTY et theme configurable restent ouverts.
3. Ajouter des oracles de benchmark exécutables : tests de code dans un workspace isolé, artefacts de build, captures/runtime UI et score de review explicitement séparé.
4. Introduire un scheduler par ressource et des worktrees par sous-tâche avant d’autoriser les écritures parallèles.
5. Ajouter une grille tarifaire/FX versionnée et une importation explicite des dépenses réelles.
6. Raccorder les actions GitHub et la recette humaine à des contrats d’acceptation et preuves référencées.
7. Faire évoluer les rapports en propositions de souvenirs que l’utilisateur valide ; éviter d’injecter tout le journal dans la mémoire.

Ces unités correspondent aux demandes initiales encore ouvertes. Aucune permission de publication, de merge ou d’action externe irréversible n’est déduite de cette roadmap.

## Historique : Test Réel Précédemment En Attente

Un test unique de streaming et de recherche mémoire avec GPT‑5.6‑Sol a été préparé. La revue automatique a rejeté l’envoi, car il transmettrait à OpenAI le noyau et un extrait de mémoire du projet sans autorisation explicite pour ces données et cette destination. Aucun tour réel n’a été envoyé. Une demande d’autorisation a été présentée à Damien ; tant qu’il ne répond pas, le test reste non vérifié.

Le service a été redémarré après finalisation ; la session préparée reste conservée en état arrêté, reprenable.


## Canaux de préparation — 2 octobre 2026

Vue **Canaux d’agents** et connexions **API locales & distantes** livrées.
Canaux persistants par projet, jusqu’à 8 participants et 1 à 6 tours parallèles
avec état public identique, publication en fin de tour et synthèse à relire.
Les participants natifs utilisent des contextes frais de discussion ; copier
un agent existant copie sa configuration sans ses pensées, messages ni mission.
Arrêt, callback tardif ignoré, état Arrêt en cours et reprise explicite.

Codex app-server, OMP, Chat Completions et SystemOne sont adaptés. LAYA et CLEF
sont consultants de décisions typées via un serveur configuré ; un LLM rédige
le plan. Aucun poids n’est installé. Le transfert au chat Duplica est un brouillon ;
la tâche issue du plan reste En revue et sa création est idempotente.
Les clés des nouvelles API restent dans des variables du service et sont retirées
des environnements enfants. Les tokens absents ne sont pas estimés.

Preuves : 121 tests backend (120 réussis, 1 symlink ignoré), recette navigateur
avec quatre participants fictifs, persistance et quatre largeurs. L’inférence
native réelle et la qualité des consultants ne sont pas vérifiées. Détails :
[rapport](../audit/2026-10-02-agent-channels.md).
Le service local sur 4317 a été rechargé sans travail actif ; le canal réel
« Plan avant action » est conservé en brouillon, sans participant ni inférence.

Consolidation et recette Electron du 2 octobre : la navigation fixe défile
verticalement, ce qui rend Connexions accessible lorsque les entrées dépassent
la hauteur de fenêtre. La recette reprend une seule fois un clic explicitement
refusé avant émission, avec nouvelle observation et recherche du label ; elle
ne rejoue pas un résultat indéterminé. Validation isolée : 128 tests backend
(127 réussis, 1 symlink ignoré), syntaxe JS et parcours Canaux → Connexions
réussis, avec un rejet forcé puis un seul clic réel. Voir le
[rapport de consolidation](../audit/2026-10-02-duplica-channels-consolidation.md).
Les fenêtres cachées de test conservent leur rendu actif et leur fermeture est
confirmée. Cette validation ne constitue pas un état d’exécution de Duplica.

## Correction : Agents ouvre les CLI natifs

Retour du 1 octobre 2026 : la capture de conversation structurée ne correspond
pas au résultat demandé. Agents arrive désormais sur les vrais terminaux ;
Nouvel agent ouvre le lanceur natif, avec Codex, Claude Code, OpenCode et OMP.
Les anciennes sessions restent consultables via Sessions outillées. Desktop :
PTY intégrés en grille ; navigateur : terminal système avec le CLI choisi.
OpenCode est préparé avec `--agent plan`, sans prompt ni modèle artificiel ;
Claude Code utilise son mode plan. Ces profils natifs ne sont pas une sandbox OS.
Le profil d’écriture reste disponible uniquement pour Codex dans ce parcours.

Correction PowerShell : les apostrophes ASCII et typographiques sont échappées
sans modifier les arguments, y compris dans les consignes de démarrage. Le PTY
reçoit explicitement la taille du panneau après sa création ; un nouveau panneau
occupe la colonne la moins remplie. Electron renouvelle son jeton HTTP local
après un redémarrage serveur, uniquement après le refus avant exécution.

Validation : 57 tests backend, 56 réussis et 1 symlink ignoré sur Windows ;
recettes navigateur et desktop avec fournisseur fictif, sept PTY simultanés (CMD léger pour la recette Windows).
Codex et OMP réellement ouverts et laissés côte à côte, sans mission ni inférence.
Le premier démarrage Codex a échoué par allocation mémoire pendant les contrôles
concurrents ; le second affiche le TUI et reste actif. Claude Code n’est pas
détecté dans le PATH ; lancement réel d’OpenCode non vérifié. Rapport :
[CLI natifs](../audit/2026-10-01-native-cli-correction.md).
