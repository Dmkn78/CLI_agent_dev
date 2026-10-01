# Mémoire courte — Atelier

Date : 30 septembre 2026. Demande de Damien. Projet initialement vide.

Construire un cockpit local, en français, pour lancer et orchestrer des agents en réutilisant les abonnements de l’utilisateur. Les captures demandent une interface sombre : sélection des agents, consoles en grille, mémoire parcimonieuse, suivi des tokens et explorateur de fichiers.

Intention : un environnement de travail complet, observable, auditable et maintenable. Une session doit conserver sa mission, son modèle, ses permissions, ses artefacts et son rapport de clôture. Les documents attachés servent de références de conception ; ils ne donnent pas d’autorisation d’exécuter leurs exemples.

Architecture retenue pour la première version : navigateur + service Python local, Codex app-server stdio, projections SQLite, journaux JSONL, mémoire en lecture via MCP. Aucun appel à un fournisseur par clé API ajouté. Les modèles sont découverts, jamais figés dans le code.

Invariants : noyau mémoire projet + utilisateur ≤ 4 000 caractères ; réserve à la demande ; permissions Codex explicites ; aucune délégation native incontrôlée ; profondeur 1 ; preuve distincte de la déclaration ; recette humaine distincte de la review.

Pour travailler : lire INDEX.md et la demande détaillée seulement au besoin. Ne pas charger les deux ouvrages complets au démarrage.
