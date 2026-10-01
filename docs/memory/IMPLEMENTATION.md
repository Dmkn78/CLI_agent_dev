# État de l’implémentation — cockpit et Oh My Pi, 1 octobre 2026

La plateforme intègre Codex app-server et Oh My Pi RPC. Le cockpit charbon/cyan suit les sessions et workflows réels, avec inspecteur et consommation par requête. Le compte Codex local, les catalogues et les métadonnées OMP ont été examinés sans inférence. Les parcours de session, benchmark, workflow et écriture OMP sont testés avec des fournisseurs fictifs ; leur qualité et l’accès effectif aux modèles restent à vérifier lors de lancements explicites de l’utilisateur. Voir le [rapport de cette évolution](../audit/2026-10-01-cockpit-providers.md).

## Couverture de la demande

| Demande | Version actuelle | Limite / suite |
|---|---|---|
| Création d’agents | Catalogues/efforts Codex et OMP, mission, rôle, permissions, tâche, skills, dossier/worktree | OMP sans shell ni MCP de réserve ; autres adaptateurs à ajouter |
| Plusieurs fenêtres | Grille d’agents, 1 à 3 sessions côte à côte, streaming structuré | Terminal PTY/TUI complet à ajouter |
| Sprints et tâches | CRUD local, priorités, dates, rattachement et états explicites | Scheduler/ressources et dépendances à ajouter |
| Git/worktrees | Lecture Git, sélection d’un worktree, création de branche et worktree local | Aucun cleanup ou merge automatique |
| Pull requests | Lecture avec `gh`, état de review/checks et lien vers GitHub ; dépôt CLI_agent_dev identifié | Création/merge dans le produit à ajouter |
| Second cerveau | Souvenirs projet/utilisateur, budget combiné 4 000 caractères, recherche lexicale MCP à la demande, provenance | Promotion assistée de logs et embeddings à ajouter si utiles |
| Bibliothèque de skills | Bibliothèque du projet, sélection de `SKILL.md`, validation des chemins | Pas de chargement automatique de tous les skills personnels |
| Tokens et graphes | Mesures par fournisseur/consommateur/tâche/modèle/requête, cache lu, historique de sessions distinct, CSV | Coûts facturés, tarifs datés, devises et comptes multiples par fournisseur non importés |
| Connexions | Codex/ChatGPT ; fournisseurs OAuth/API découverts par OMP et login dans son terminal natif | Aucun secret dans le formulaire web ; succès d’inférence non vérifié |
| Terminal OMP | Choix rôle, modèle, effort, plan/slow/smol, aperçu sûr et lancement confirmé | Terminal externe en lecture seule, pas de PTY ni télémétrie importée |
| Chat/navigateur | Conversation outillée Codex ; lien vers ChatGPT | Navigateur desktop embarqué et moteur local à ajouter ; aucun accès supposé à `/mnt/data` ChatGPT |
| Fichiers | Navigation, source numérotée, images, lecture seule, contrôle des chemins | Écriture/édition et diff IDE à ajouter |
| Multi-agent | Duo ou planificateur → 1 à 3 tâches → review → synthèse, configuration indépendante par rôle, graphe et handoffs | Séquentiel ; worktrees par sous-tâche, parallélisme et budgets tokens à ajouter |
| Rapports et audit | JSONL par agent, projections SQLite, rapports, outputs, handoffs, hash, UNVERIFIED explicite | Attestations de tests/runtime indépendants à ajouter |
| Benchmarks | 1 à 50 candidats, jeu JSON hashé, répétitions, générateur proposant des cas, oracle exact ou juge modèle distinct, exports | Oracles exécutables de code, navigateur, sécurité/alignement et recette humaine structurée à ajouter |
| Maintenabilité | Sources archivées, onze captures utilisateur dont trois identiques, hashes, demande canonique, architecture, design, audits et tests | Mettre ces fichiers à jour lors des prochaines évolutions |

## Points techniques à connaître

- L’application n’a pas de dépendance d’exécution hors Python standard et les CLI explicitement installés.
- Le serveur n’écoute que sur `127.0.0.1`. Les API exigent un nonce par lancement ; Host et Origin sont vérifiés. Les données privées sont dans `.atelier/`, ignorées par Git.
- `codex app-server`, MCP mémoire et `omp --mode rpc` sont les interfaces réelles. Le frontend n’automatise pas ChatGPT et ne copie pas les credentials. Les comptes OMP sont indépendants des comptes Codex.
- OMP n’active que les outils hôtes de fichiers ; l’écriture est confirmée dans Atelier et revalidée avant application. Les outils shell/MCP/délégation sont absents. Le protocole v1 est supporté ; les frames fragmentées non prises en charge échouent explicitement. Les fichiers de session OMP restent privés dans `.atelier/`.
- Le catalogue local n’est pas une entitlement garantie. Un tour réussi doit confirmer l’accès réel pour la requête.
- Une session sans aucun message n’a pas forcément de rollout Codex. À sa reprise, Atelier recrée un thread vide en conservant l’identifiant local et la trace. Avec des messages, il appelle `thread/resume`.
- Le MCP mémoire Codex est requis lorsqu’il est activé : sa panne fait échouer le démarrage. OMP ne reçoit que le noyau, sans réserve MCP.
- Les workflows utilisent un seul worktree, séquentiellement. Aucun orchestrateur secondaire natif n’est lancé.
- La configuration native du CLI reste applicable aux benchmarks. Le mode sans mémoire désactive le noyau et MCP Atelier, pas tout l’environnement du fournisseur. Lors de la recette réelle, des MCP natifs (`codex_apps`, `cua_repl`, `node_repl`) étaient présents. Une table `mcp_servers={}` ne les supprimait pas ; cet override inefficace a été retiré. La V1 ne prétend donc pas filtrer tous les outils du fournisseur.
- 50 tests signifie 50 candidats maximum. La génération et les reviews distinctes ajoutent des inférences et du quota.
- Les coûts facturés et les équivalents API ne sont pas inventés. Les graphes n’utilisent que les mesures reçues.
- Le rapport de clôture est déterministe et ne consomme pas d’inférence supplémentaire. Il montre les preuves d’outils et les déclarations de l’agent comme des objets distincts.

## Vérifications

34 tests automatisés exécutés, 33 réussis et 1 saut de symlink Windows faute de privilège dédié. La traversée et les fichiers sensibles sont vérifiés avant ce saut. Couverture : protocoles fictifs Codex/OMP, corrélation, sessions, approbations et annulation, écritures périmées, confinement des chemins, exclusion du raisonnement, mémoire, Host/Origin/nonce, redémarrage, compteurs par requête, configurations indépendantes de workflow, benchmarks et worktree Git temporaire. Vérification syntaxique de tous les fichiers JS.

Recette Playwright avec fournisseur fictif : graphe et inspecteur, sessions indépendantes, modèles indépendants, ventilation de consommation, connexions et préparation du terminal. Dix vues à 1600/900/390/300 pixels, sans débordement global ni nœuds coupés sur mobile. Captures et résultat privés sous `.atelier/browser-evidence/`. Aucun terminal interactif ni prompt réel lancé par cette recette.

Recette OMP 18.1.10 limitée aux métadonnées : démarrage sans outils natifs, enregistrement d’`atelier_read`, liste active conforme, catalogue et fournisseurs de login. Aucun secret lu ni inférence envoyée.

Recette réelle initiale : connexion ChatGPT détectée, 7 modèles découverts, création en lecture seule d’un thread Codex, clôture avec artefacts. Aucun prompt d’inférence réel envoyé. Le journal de cette session technique demeure dans `.atelier/logs/`.

La réussite des tests n’est pas présentée comme une approbation produit de Damien. Les données historiques ou fictives ne sont pas injectées dans son espace réel pour remplir le cockpit.

## Prochaines unités de travail

1. Effectuer une recette réelle explicitement autorisée par moteur/fournisseur ; vérifier quotas et accès effectif sans supposer que le catalogue est une entitlement.
2. Décider du packaging desktop et du terminal PTY si l’expérience TUI complète est prioritaire.
3. Ajouter des oracles de benchmark exécutables : tests de code dans un workspace isolé, artefacts de build, captures/runtime UI et score de review explicitement séparé.
4. Introduire un scheduler par ressource et des worktrees par sous-tâche avant d’autoriser les écritures parallèles.
5. Ajouter une grille tarifaire/FX versionnée et une importation explicite des dépenses réelles.
6. Raccorder les actions GitHub et la recette humaine à des contrats d’acceptation et preuves référencées.
7. Faire évoluer les rapports en propositions de souvenirs que l’utilisateur valide ; éviter d’injecter tout le journal dans la mémoire.

Ces unités correspondent aux demandes initiales encore ouvertes. Aucune permission de publication, de merge ou d’action externe irréversible n’est déduite de cette roadmap.

## Test réel en attente

Un test unique de streaming et de recherche mémoire avec GPT‑5.6‑Sol a été préparé. La revue automatique a rejeté l’envoi, car il transmettrait à OpenAI le noyau et un extrait de mémoire du projet sans autorisation explicite pour ces données et cette destination. Aucun tour réel n’a été envoyé. Une demande d’autorisation a été présentée à Damien ; tant qu’il ne répond pas, le test reste non vérifié.

Le service a été redémarré après finalisation ; la session préparée reste conservée en état arrêté, reprenable.
