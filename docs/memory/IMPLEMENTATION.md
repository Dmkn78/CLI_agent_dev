# État de l’implémentation — livraison initiale, finalisée le 1 octobre 2026

La première version utilisable est disponible dans ce dossier. Elle constitue le socle du produit demandé, pas la réalisation de toutes ses extensions. Le compte Codex local a été découvert et un thread réel a été créé/clôturé sans inférence. Les parcours de modèle, de benchmark et de workflow sont testés avec un fournisseur fictif ; leur qualité sur des modèles réels reste à évaluer lors de campagnes explicitement lancées par l’utilisateur.

## Couverture de la demande

| Demande | Version actuelle | Limite / suite |
|---|---|---|
| Création d’agents | Catalogue/effort Codex, mission, rôle, permissions, tâche, skills, dossier/worktree et MCP | Adaptateurs des autres outils à ajouter |
| Plusieurs fenêtres | Grille d’agents, 1 à 3 sessions côte à côte, streaming structuré | Terminal PTY/TUI complet à ajouter |
| Sprints et tâches | CRUD local, priorités, dates, rattachement et états explicites | Scheduler/ressources et dépendances à ajouter |
| Git/worktrees | Lecture Git, sélection d’un worktree, création de branche et worktree local | Aucun cleanup ou merge automatique |
| Pull requests | Lecture avec `gh`, état de review/checks et lien vers GitHub | Pas de dépôt distant fourni ; création/merge à ajouter |
| Second cerveau | Souvenirs projet/utilisateur, budget combiné 4 000 caractères, recherche lexicale MCP à la demande, provenance | Promotion assistée de logs et embeddings à ajouter si utiles |
| Bibliothèque de skills | Sélection de `SKILL.md` dans les dossiers du projet | Bibliothèque personnelle complète non présente |
| Tokens et graphes | Usage réel par session/model, cache lu, regroupement des sessions par date de fin, CSV | Tarifs datés, devises, comptes/fournisseurs multiples à ajouter |
| Chat/navigateur | Conversation outillée Codex ; lien vers ChatGPT | Navigateur desktop embarqué et moteur local à ajouter ; aucun accès supposé à `/mnt/data` ChatGPT |
| Fichiers | Navigation, source numérotée, images, lecture seule, contrôle des chemins | Écriture/édition et diff IDE à ajouter |
| Multi-agent | Duo ou planificateur → 1 à 3 tâches → review → synthèse, profondeur 1, handoffs | Worktrees par sous-tâche, parallélisme, budgets et routing avancés à ajouter |
| Rapports et audit | JSONL par agent, projections SQLite, rapports, outputs, handoffs, hash, UNVERIFIED explicite | Attestations de tests/runtime indépendants à ajouter |
| Benchmarks | 1 à 50 candidats, jeu JSON hashé, répétitions, générateur proposant des cas, oracle exact ou juge modèle distinct, exports | Oracles exécutables de code, navigateur, sécurité/alignement et recette humaine structurée à ajouter |
| Maintenabilité | Sources archivées, six captures durables, contexte court, index, architecture, design, audit et tests | Mettre ces fichiers à jour lors des prochaines évolutions |

## Points techniques à connaître

- L’application n’a pas de dépendance d’exécution hors Python standard et les CLI explicitement installés.
- Le serveur n’écoute que sur `127.0.0.1`. Les API exigent un nonce par lancement ; Host et Origin sont vérifiés. Les données privées sont dans `.atelier/`, ignorées par Git.
- `codex app-server` et MCP sont les interfaces réelles. Le frontend n’automatise pas le site ChatGPT et ne copie pas les credentials.
- Le catalogue local n’est pas une entitlement garantie. Un tour réussi doit confirmer l’accès réel pour la requête.
- Une session sans aucun message n’a pas forcément de rollout Codex. À sa reprise, Atelier recrée un thread vide en conservant l’identifiant local et la trace. Avec des messages, il appelle `thread/resume`.
- Le MCP mémoire est requis lorsqu’il est activé : sa panne doit faire échouer le démarrage plutôt que produire une session silencieusement dépourvue de mémoire.
- Les workflows utilisent un seul worktree, séquentiellement. Aucun orchestrateur secondaire natif n’est lancé.
- La configuration native du CLI reste applicable aux benchmarks. Le mode sans mémoire désactive le noyau et MCP Atelier, pas tout l’environnement du fournisseur. Lors de la recette réelle, des MCP natifs (`codex_apps`, `cua_repl`, `node_repl`) étaient présents. Une table `mcp_servers={}` ne les supprimait pas ; cet override inefficace a été retiré. La V1 ne prétend donc pas filtrer tous les outils du fournisseur.
- 50 tests signifie 50 candidats maximum. La génération et les reviews distinctes ajoutent des inférences et du quota.
- Les coûts facturés et les équivalents API ne sont pas inventés. Les graphes n’utilisent que les mesures reçues.
- Le rapport de clôture est déterministe et ne consomme pas d’inférence supplémentaire. Il montre les preuves d’outils et les déclarations de l’agent comme des objets distincts.

## Vérifications

21 tests automatisés, sans inférence : JSON-RPC stdio, corrélation, cycle de session, permissions, erreurs, redaction de motifs connus, exclusion du raisonnement, mémoire/réserve, budget, filtres de projet, chemins/symlinks, Host/Origin/nonce, pagination des événements, redémarrage, édition d’objet existant, reprise vide/non vide, génération de dataset, juge distinct, workflow contrôlé et worktree Git réel temporaire.

Recette réelle initiale : connexion ChatGPT détectée, 7 modèles découverts, création en lecture seule d’un thread Codex, clôture avec artefacts. Aucun prompt d’inférence réel envoyé. Le journal de cette session technique demeure dans `.atelier/logs/`.

Le sprint local « V1 — Cockpit local » conserve une tâche de livraison en revue, afin de laisser la recette produit à Damien. La réussite des tests n’est pas présentée comme son approbation.

## Prochaines unités de travail

1. Choisir les autres outils à intégrer et vérifier pour chacun CLI, authentification par abonnement et protocole d’événements. Ne pas construire des providers fictifs.
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
