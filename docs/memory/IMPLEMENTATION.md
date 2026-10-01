# État de l’implémentation — workbench, 1 octobre 2026

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
| Terminaux | Choix Codex/OMP, rôle/modèle/effort, sandbox Codex explicite, variantes OMP, aperçu et confirmation | Externe non suivi ; OMP lecture seule ; aucun prompt automatique, pas de PTY intégré |
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

52 tests backend exécutés : 51 réussis, 1 saut symlink Windows. Syntaxe JS/CJS et calculs vérifiés. Recettes navigateur précédente et workbench réussies ; recette desktop fictive réussie avec isolation du navigateur, bounds, masque de modal et fermeture. Aucun login ChatGPT ou upload réel automatisé. Audit npm : aucune vulnérabilité signalée au contrôle. Voir le rapport courant pour la matrice et les limites.

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
2. Décider du packaging desktop et du terminal PTY si l’expérience TUI complète est prioritaire.
3. Ajouter des oracles de benchmark exécutables : tests de code dans un workspace isolé, artefacts de build, captures/runtime UI et score de review explicitement séparé.
4. Introduire un scheduler par ressource et des worktrees par sous-tâche avant d’autoriser les écritures parallèles.
5. Ajouter une grille tarifaire/FX versionnée et une importation explicite des dépenses réelles.
6. Raccorder les actions GitHub et la recette humaine à des contrats d’acceptation et preuves référencées.
7. Faire évoluer les rapports en propositions de souvenirs que l’utilisateur valide ; éviter d’injecter tout le journal dans la mémoire.

Ces unités correspondent aux demandes initiales encore ouvertes. Aucune permission de publication, de merge ou d’action externe irréversible n’est déduite de cette roadmap.

## Historique : Test Réel Précédemment En Attente

Un test unique de streaming et de recherche mémoire avec GPT‑5.6‑Sol a été préparé. La revue automatique a rejeté l’envoi, car il transmettrait à OpenAI le noyau et un extrait de mémoire du projet sans autorisation explicite pour ces données et cette destination. Aucun tour réel n’a été envoyé. Une demande d’autorisation a été présentée à Damien ; tant qu’il ne répond pas, le test reste non vérifié.

Le service a été redémarré après finalisation ; la session préparée reste conservée en état arrêté, reprenable.
