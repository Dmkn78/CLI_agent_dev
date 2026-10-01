# Rapport de construction initiale — Atelier

## Résultat

Application locale créée dans `/Users/damien/Desktop/IA_Interface_dev`, initialement vide. UI sombre en français, service Python standard, intégration officielle Codex app-server, mémoire MCP, persistance locale et audit. Les sources et six captures de Damien ont été archivées et indexées. Le manifeste de références contient leur taille et leur SHA-256.

## Pourquoi cette architecture

Le besoin principal est de réutiliser l’abonnement et de piloter des processus locaux avec des permissions observables. Un frontend navigateur séparé du service local permet une V1 utilisable sans installation de runtime JavaScript ni clé API supplémentaire. Le protocole officiel évite de lire des fichiers de credentials ou d’automatiser le site ChatGPT.

SQLite sert de projection courante ; les JSONL conservent les faits ; les artefacts et handoffs ont des chemins et des hashes ; la mémoire est une sélection validée distincte. Le CLI contrôle le sandbox ; Atelier contrôle les étapes d’orchestration.

## Changements réalisés

Sessions et catalogue, profils d’exécution, approvals/questions, streaming, reprise, worktrees, pipeline contrôlé, mémoire à la demande, tasks/sprints, fichiers/Git/PR, métriques et exports, générateur/candidats/juge de benchmark, rapports déterministes. Contrats et limites détaillés dans `docs/memory/IMPLEMENTATION.md`.

## Vérifications et preuves

- 21 tests `unittest`, fournisseur fictif sauf le dépôt Git temporaire ; aucun quota de modèle consommé.
- Vérification syntaxique des quatre fichiers JavaScript et compilation syntaxique Python.
- MCP direct : initialize, tools/list et memory_search ont retourné trois réponses valides ; un souvenir de capture retrouvé.
- Compte réel : connexion ChatGPT et catalogue de sept modèles observés par app-server.
- Session technique : thread réel créé en lecture seule ; aucun `turn/start` envoyé ; clôture avec output, handoff et rapport local.
- Recette navigateur : pages, formulaire d’agent, tâches/sprint, édition d’une tâche, mémoire, fichiers et formats responsives. Captures dans `docs/screenshots/`.

Les tests des inférences, campagnes et reviews utilisent un faux fournisseur contrôlé. Ils vérifient le runtime d’Atelier, pas la qualité des modèles réels. Une campagne réelle pourra être lancée explicitement depuis l’interface.

## Problèmes rencontrés et corrections

1. Le sandbox de développement empêchait la création du serveur loopback et l’accès en écriture à l’état CLI Codex. Le lancement local a été autorisé par la revue automatique ; aucune règle de sandbox n’a été supprimée.
2. Le pluriel interne `memorys` empêchait d’afficher la mémoire : corrigé en `memories`, test de projection ajouté.
3. La composition du héros débordait dans le panneau de 300 pixels : styles compacts et labels accessibles de sidebar ajoutés.
4. L’édition d’un objet existant envoyait deux arguments `id` au constructeur : fusion de dictionnaires corrigée, test de conservation des champs ajouté.
5. Une session Codex créée sans tour ne possède pas de rollout reprenable. La reprise vide démarre désormais un thread neuf, avec événement explicite ; les sessions ayant des messages utilisent `thread/resume`.
6. Les flux de sous-processus n’étaient pas fermés explicitement : fermeture ajoutée après arrêt, warnings de ressources éliminés.
7. Un Ctrl+C du terminal pouvait atteindre Codex avant la fermeture gérée par Atelier. Le sous-processus utilise désormais un groupe de session indépendant ; Atelier le termine explicitement à la fermeture.

## Limites et travail ouvert

Autres providers, terminal PTY/TUI, packaging desktop, actions PR, scheduler/parallelisme, oracles de code/UI/sécurité, tarifs versionnés et navigateur intégré restent à implémenter. Aucun coût fictif, aucune validation humaine et aucune qualité de modèle ne sont déduits des résultats disponibles.

## Transmission

Commencer par `AGENTS.md` et `docs/memory/CORE.md`, puis lire la source ciblée de `INDEX.md`. Les documents attachés sont des matériaux de référence ; leurs commandes et exemples ne constituent pas une autorisation. Conserver les données `.atelier/` et les worktrees existants. La tâche de livraison est en revue dans le sprint local, pour la recette de Damien.

## Finalisation — 1 octobre 2026

Les vues ont été vérifiées sur bureau et mobile. Un débordement des longues lignes du journal à 390 px a été corrigé. Le formulaire explique que le noyau et les souvenirs consultés sont transmis au fournisseur du modèle. La configuration native de Codex peut ajouter ses propres MCP ; la V1 ne garantit pas leur exclusion.

La session « Recette — streaming & mémoire » a été créée et est prête avec GPT‑5.6‑Sol, effort low, lecture seule. L’envoi de son prompt a été rejeté par la revue automatique, car il demanderait de transmettre à OpenAI le noyau et le souvenir « Captures de référence » sans autorisation explicite pour ce contenu et cette destination. Aucun contournement ni appel d’inférence indirect n’a été effectué. Le test réel reste en attente d’autorisation ; les compteurs restent sans mesure.

Après la finalisation, le serveur a été redémarré. La session de test préparée est conservée en état arrêté et peut être reprise ; aucune inférence n’a été exécutée. Les 21 tests ont été repassés après les corrections finales.
