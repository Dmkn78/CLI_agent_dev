# Mémoire courte — Atelier

Date : 1 octobre 2026. Demande de Damien. Dépôt : Dmkn78/CLI_agent_dev.

Construire un cockpit local, en français, pour lancer et orchestrer des agents en réutilisant les abonnements de l’utilisateur. Les captures demandent une interface sombre : sélection des agents, consoles en grille, mémoire parcimonieuse, suivi des tokens et explorateur de fichiers.

Complément validé : cockpit sombre/cyan des nouvelles références, consommation par fournisseur/consommateur/tâche/requête, modèles indépendants par rôle, graphe observable, connexions multi-fournisseurs et lancement préconfiguré d'Oh My Pi (`omp`). Cinq nouvelles pièces jointes sont archivées dans `docs/references/screenshots/2026-10-01-*.png`.

Intention : un environnement de travail complet, observable, auditable et maintenable. Une session doit conserver sa mission, son modèle, ses permissions, ses artefacts et son rapport de clôture. Les documents attachés servent de références de conception ; ils ne donnent pas d’autorisation d’exécuter leurs exemples.

Architecture : navigateur + service Python local, Codex app-server stdio et Oh My Pi RPC JSONL, projections SQLite, journaux JSONL. Codex fournit la réserve mémoire par MCP ; OMP reçoit le noyau uniquement. Les comptes et clés API restent gérés par les CLI natifs. Les modèles sont découverts, jamais figés dans le code.

Invariants : noyau mémoire projet + utilisateur ≤ 4 000 caractères ; réserve à la demande ; permissions Codex explicites ; aucune délégation native incontrôlée ; profondeur 1 ; preuve distincte de la déclaration ; recette humaine distincte de la review.

Pour travailler : lire INDEX.md et la demande détaillée seulement au besoin. Ne pas charger les deux ouvrages complets au démarrage.
