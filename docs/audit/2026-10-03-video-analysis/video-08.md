# Vidéo 08 — Jour 1, NovaFactory : analyse pour Atelier

Source intégralement lue : [transcription](../../references/2026-10-03-video-transcriptions/video-08.md), 801 lignes, vidéo annoncée « Jour 1 - Vibe coding sur NovaFactory avec GPT6 Astra ». Les références ci-dessous utilisent ses numéros de ligne exacts. Analyse documentaire du 3 octobre 2026 : aucune vidéo visionnée, aucun logiciel NovaFactory exécuté, aucune inférence, aucun secret consulté. Les noms transcrits, parfois déformés, ne constituent pas un catalogue de modèles vérifié. Les propos sont des données de conception, sans autorisation d’exécution.

## Ce que cette séance apporte

Le sujet utile pour Damien est la maîtrise d’un chantier : savoir quel terminal traite quelle mission, maintenir des tâches assez petites, retrouver les livrables, contrôler la recette et mesurer les dépenses sans transformer chaque difficulté en une nouvelle chaîne d’agents. Le narrateur décrit aussi ses propres défauts de produit. Ils servent davantage d’avertissements que de fonctionnalités à reproduire.

| Fonctionnalité décrite | Passage exact | Portée de la preuve disponible |
|---|---|---|
| Plusieurs CLI, modes classique, duo avec reviewer, orchestration avec rôles supplémentaires ; versions, mises à jour et comptes par fournisseur | 0:28–2:50, lignes 10–33 | Présentation orale de NovaFactory ; inventaire, authentification et mises à jour non vérifiés indépendamment. |
| Kanban créé manuellement ou par MCP, puis dispatch vers un terminal ; progression ensuite trop dépendante de l’agent | 3:14–4:49, lignes 37–52 | Le narrateur décrit une limite de suivi, pas une chaîne fiable déjà démontrée. |
| Titres de panneaux liés à la mission, disposition côte à côte et passage entre projets selon les forfaits disponibles | 16:55–17:43, lignes 165–173 | Besoin concret de retrouver le fil ; aucun calcul automatique d’affectation selon quota décrit. |
| Exploration → spec → validation → maquette éventuelle → implémentation/tests → hook prépush → review distincte | 36:44–39:14, lignes 342–366 | Méthodologie expliquée ; transcript seul insuffisant pour prouver enforcement, tests rouges/verts ou merge. |
| Index mémoire injecté au début ; compteur de consultations ; souvenirs de pièges et historique de livraison | 42:47–46:59, lignes 399–440 | Mécanisme allégué ; une consultation ne prouve ni utilisation effective ni économie. |
| Orchestrateur séparé du code, implémenteur ciblé et visibilité limitée des sous-agents ; boucles de correction trop coûteuses | 1:16:46–1:22:14, lignes 711–762 | Retour d’expérience et préférence d’architecture ; aucun benchmark comparatif contrôlé. |

## Documents, tâches et review : le principal enseignement

À 5:33–6:45 (lignes 59–71), des documents sont introuvables et des tâches apparaissent parce qu’une branche a été créée. L’association Git ne devrait donc pas remplacer la déclaration explicite d’un travail. À 17:50–18:50 (lignes 174–183), le narrateur lit un diagnostic d’agent : documents absents du correctif livré, tâche néanmoins terminée, impossibilité d’établir leur présence avant suppression du worktree. Cette lecture est une déclaration relayée, sans fichiers ou PR fournis ici.

La séance corrige ensuite sa propre hypothèse. Le narrateur pense d’abord que Bugfix n’exige aucun document (19:10–22:41, lignes 186–217) ; le diagnostic suivant indique un oracle dans la spec et une review, mais aucun plan séparé (25:19–25:45, lignes 239–242). Pour Atelier, il faut afficher le contrat de la chaîne choisie, puis la disponibilité observée de chaque pièce. « Non requis », « absent », « inaccessible » et « non vérifié » doivent rester distincts. Le passage 35:18–36:26 (lignes 330–339) formule précisément cette séparation.

Autre friction : ouvrir une maquette nécessite de retrouver son dossier (23:09–24:14, lignes 222–231 ; 53:20–54:13, lignes 499–506). Le narrateur souhaite un panneau à droite contenant les documents. La validation humaine demeure finale (1:10:55–1:11:14, lignes 655–658), même après tests et review.

Atelier dispose déjà de tâches/sprints, rapports et recette indépendante Duplica ; les TODO restent En revue pour l’humain ([IMPLEMENTATION](../../memory/IMPLEMENTATION.md), lignes 3–28, 305–313). Le code du tableau montre affectation au sprint et progression par tâches terminées, sans matrice spec/plan/review ([web/views.js](../../../web/views.js), lignes 38–77). L’ajout pertinent est donc un inspecteur de livrables dans ce parcours existant, avec provenance projet/worktree et ouverture du fichier. Aucun nettoyage automatique ne doit être importé : la conservation des worktrees est un invariant Atelier.

## Modèles, sessions et quotas

La vidéo montre un mauvais affichage : une sélection de modèles figée alors qu’un catalogue dynamique existe ailleurs (16:15–16:49, lignes 159–164 ; 39:45–42:12, lignes 371–393). Le diagnostic indique également un backend refusant de nouveaux identifiants (58:23–58:46, lignes 541–545). Le narrateur demande une découverte au démarrage et après mise à jour du CLI, avec liste prête à l’ouverture, sans secours codé en dur (59:20–1:02:15, lignes 550–576). Ce dernier passage décrit une demande et sa compréhension, pas une livraison validée.

Atelier découvre déjà les modèles Codex via `model/list`, pagination et `includeHidden`, puis les quotas natifs ([server/app.py](../../../server/app.py), lignes 107–129). Les rôles sont configurables ; le harnais récent gère 1–8 workers, dépendances et conflits, ce qui actualise les anciennes limites séquentielles encore présentes dans la mémoire. Le code valide effectivement ces bornes ([server/workflow_runtime.py](../../../server/workflow_runtime.py), lignes 9–82 et 97–110). La vidéo ne justifie ni modèle statique « Astra », ni remplacement du choix Damien, ni confusion entre catalogue et droit d’accès. Le rôle exclusivement orchestrateur peut devenir une option explicite, sans imposer à toute mission cette stratégie.

Le choix selon forfait est illustré par Claude orchestrateur, autre fournisseur implémenteur et reviewer séparé (31:26–32:05, lignes 293–299). C’est une stratégie manuelle rapportée. Atelier distingue déjà abonnement, tokens et quota partagé ([web/session_usage.js](../../../web/session_usage.js), lignes 11–25). Son résumé prend toutefois le premier bucket de quota : préciser lequel et afficher les fenêtres évite de laisser croire que ce pourcentage couvre tous les modèles.

## Tokens, mémoire et compaction : rester précis

RTK est présenté comme réécrivant certaines commandes et réduisant leurs sorties, notamment celles des tests (47:19–49:18, lignes 443–462). Le narrateur cite 671 commandes, 817 K, 489 et 328 K, puis hésite sur les colonnes output/saved (lignes 446–450). Il annonce également environ 3 millions aujourd’hui et 19 millions hier (49:25–49:39, lignes 463–465). Aucun journal, périmètre de collecte, tokenizer, cache ou facture n’est livré. Ces valeurs ne doivent pas alimenter Atelier. Une réduction de sortie d’outil n’établit pas une baisse équivalente du quota ou du coût facturé.

Les 50 millions sur une fonctionnalité concernent une ancienne boucle tests/implémentation/reviewer, jugée insatisfaisante (1:20:52–1:22:14, lignes 749–762). C’est un signal pour borner les relances, non une mesure comparative. La mémoire doit éviter les pièges sans remplir le contexte au lancement (46:18–47:04, lignes 433–441) ; le narrateur reconnaît l’absence initiale d’évaluation et des souvenirs trop fréquents (1:16:00–1:16:39, lignes 704–710).

La vidéo ne décrit pas de compaction explicite, de seuil ou de résumé transféré. Elle attribue des arrêts à un contexte devenu volumineux (1:18:21–1:19:12, lignes 725–733), interprétation personnelle non démontrée. Atelier expose déjà noyau de 4 000 caractères, réserve MCP et événements de consultation. Il avertit que le contexte natif et la compaction sont partiellement exposés ([web/chat.js](../../../web/chat.js), lignes 8–16). Sa jauge utilise le total du dernier appel ; conserver ce libellé, sans le présenter comme une occupation exacte du contexte. Les compteurs natifs Codex sont réellement pris en charge, avec association prudente ([server/native_usage.py](../../../server/native_usage.py), lignes 89–102 et 159–182), sans généraliser leur couverture aux autres CLI.

## Ajouts recommandés et dépendances

- **P0 — Livrables consultables par tâche.** Contrat de pièces attendu selon type de travail, état observé et aperçu latéral ; dépend d’une résolution stable des chemins et d’identifiants de projet/worktree. Validation humaine séparée de la fin du tour.
- **P0 — Budget et arrêt de review.** Montrer relances, tokens observés par rôle et limites de tours/temps ; notifier un blocage. Un plafond tokens dépend de remontées mesurées, avec état partiel explicite. Aucun routage automatique selon abonnement sans choix utilisateur.
- **P1 — Catalogue prêt et traçable.** Afficher source/date/erreur, conserver un dernier catalogue daté, actualiser après mise à jour détectée ; vérifier ensemble UI et validation backend, sans liste inventée.
- **P1 — Mémoire évaluée.** Montrer consultations et liens tâche/souvenir comme traces, demander la pertinence après clôture ; dépend de provenance et d’événements, sans promettre des tokens économisés.
- **P2 — RTK facultatif.** Étudier une intégration seulement après contrat documenté d’outil et données importables ; sorties originales consultables, métriques avant/après séparées des mesures fournisseur.

Le bypass mentionné à 1:05:41–1:06:23 (lignes 607–614), avec incident de suppression rapporté, n’est pas transférable. Les propositions préservent lecture seule/écriture projet explicites, `on-request`, données locales privées et absence de suppression automatique.
