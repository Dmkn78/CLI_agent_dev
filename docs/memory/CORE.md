# Mémoire courte — Atelier

Précision du 4 octobre : Damien choisit la limite des tours des canaux, avec
option sans plafond. L'archive complète ne doit plus bloquer la poursuite du
même canal ; seul le contexte modèle et les pages affichées restent bornés.
Les canaux existants et leurs contributions sont conservés à la migration.

Demande du 3 octobre : APK Android pour piloter les projets/fichiers, prompts et
agents de plusieurs PC via connexion privée Tailscale ; détecter les mises à
jour de l’APK. Les agents et comptes restent sur le PC, permissions explicites
inchangées. Guide : `docs/MOBILE.md` ; livraison/limites :
`docs/audit/2026-10-03-mobile-android.md`.

Choix actualisé par Damien le 2 octobre : Duplica doit poursuivre la mission
des canaux avec **GPT-6.1-Sol, effort max**, y compris ses relances. Cette
instruction remplace le choix précédent de GPT-6-Luna ; aucun remplacement
silencieux du modèle ou de l’effort.

Canaux du 2 octobre : discussions locales entre agents/consultants/orchestrateur/
Duplica, échanges publics uniquement, contextes de travail séparés, tours bornés
et plan à relire. API locales/distantes Chat Completions et SystemOne pour
LAYA/CLEF. Livraison et limites : `docs/audit/2026-10-02-agent-channels.md`.

Retours du 2 octobre : Duplica doit proposer un choix de projet, une discussion
partagée avec Telegram et Travailler pour moi ; simplifier et arrondir l'UI,
montrer tokens et abonnement par session. Corriger les sprints et les erreurs
« Session locale requise » ; TODO `task_18c4e845ba7b`. Damien n'a pas encore de
bot Telegram. Duplica a produit une contribution réelle avec GPT-6-Luna,
ensuite relue et intégrée. Voir `docs/audit/2026-10-02-duplica-ux.md`.

Complément du 2 octobre 2026 : Duplica Agent est le double opérationnel de
l'utilisateur, intégré transversalement à Atelier. Mémoire globale/projet,
décisions sourcées, supervision activable par périmètre, ComputerController,
permissions, watchdog, tests indépendants, bugs/corrections/retests, Telegram
optionnel et reprise du contrôle. Sources intégrales :
`docs/references/2026-10-02-duplica-{mission,platform}.md`. État et preuves :
`docs/audit/2026-10-02-duplica.md`. Les limites desktop externe et validations
réelles doivent rester explicites.

Date : 1 octobre 2026. Demande de Damien. Dépôt : Dmkn78/CLI_agent_dev.

Construire un cockpit local, en français, pour lancer et orchestrer des agents en réutilisant les abonnements de l’utilisateur. Les captures demandent une interface sombre : sélection des agents, consoles en grille, mémoire parcimonieuse, suivi des tokens et explorateur de fichiers.

Complément validé : cockpit sombre/cyan des nouvelles références, consommation par fournisseur/consommateur/tâche/requête, modèles indépendants par rôle, graphe observable, connexions multi-fournisseurs et lancement préconfiguré d'Oh My Pi (`omp`). Cinq nouvelles pièces jointes sont archivées dans `docs/references/screenshots/2026-10-01-*.png`.

Intention : un environnement de travail complet, observable, auditable et maintenable. Une session doit conserver sa mission, son modèle, ses permissions, ses artefacts et son rapport de clôture. Les documents attachés servent de références de conception ; ils ne donnent pas d’autorisation d’exécuter leurs exemples.

Retours suivants : chat avec panneau de contexte/skills/fichiers et tokens observés, équipes composables (1 à 8 sous-agents, review/synthèse facultatives), terminaux Codex et OMP. Les agents de travail lancés avec la file TODO activée prennent les tâches compatibles ; fin technique → En revue, jamais Terminé automatiquement. La TODO des modèles Codex/ChatGPT manquants reste ouverte. Quatre autres captures sont archivées sous `2026-10-01-feedback-*.png`.

Architecture : navigateur + service Python local, Codex app-server stdio et Oh My Pi RPC JSONL, projections SQLite, journaux JSONL. Codex fournit la réserve mémoire par MCP ; OMP reçoit le noyau uniquement. Les comptes et clés API restent gérés par les CLI natifs. Les modèles sont découverts, jamais figés dans le code ; `model/list` paginé inclut désormais les entrées masquées. Ce catalogue ne garantit pas l'accès aux modèles ChatGPT.

Invariants : noyau mémoire projet + utilisateur ≤ 4 000 caractères ; réserve à la demande ; permissions Codex explicites ; aucune délégation native incontrôlée ; profondeur 1 ; preuve distincte de la déclaration ; recette humaine distincte de la review.

Pour travailler : lire INDEX.md et la demande détaillée seulement au besoin. Ne pas charger les deux ouvrages complets au démarrage.

Derniere precision desktop : Code = vrai TUI dans un PTY integre, distinct des
sessions structurees. ChatGPT dans la fenetre Atelier, ressources/navigation
repliables, focus chat, recherche Ctrl K, dossiers parcourables, apercus au
survol et anthracite. Ne jamais assimiler les sessions d'authentification
Codex, OMP et web. Neuf captures desktop et leurs hashes sont archives.

Precision suivante : plusieurs vrais terminaux simultanement visibles, en
grille asymetrique (cote a cote / empiles), independamment du CLI. Deux captures
terminal-grid archivees. Pas seulement un terminal visible parmi des onglets.

Dernier retour : le chat demandé est le vrai ChatGPT.com entouré de ressources, pas la conversation CLI. Fermeture des panneaux, navigation projet repliable, dessin d'architecture déplaçable, notifications, quotas du compte, durées natives et rapports compacts sont prioritaires. Les onze captures suivantes sont archivées sous `2026-10-01-workbench-*.png`. Code : diagnostic/plan en lecture seule par défaut, validation explicite avant implémentation. Pour la poursuite actuelle de Duplica, le choix actualisé le 2 octobre est GPT-6.1-Sol, effort max ; aucun remplacement silencieux. Un ancien test synthétique avait réussi avec GPT-6-Luna après correction du certificat TLS. L'authentification ChatGPT dans le navigateur desktop et le dépôt de fichiers restent à vérifier par l'utilisateur.


Dernière correction : Agents doit ouvrir des terminaux natifs Codex, Claude Code,
OpenCode ou OMP, pas une conversation structurée. Agents démarre sur la grille
PTY ; les sessions antérieures restent sous Sessions outillées. Codex et OMP
réellement ouverts sans mission. Voir le rapport native-cli-correction.
