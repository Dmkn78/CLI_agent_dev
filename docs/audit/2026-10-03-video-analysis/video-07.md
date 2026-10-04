# Jour 2 — ce que NovaFactory apporte à Atelier

Analyse pour Damien, 3 octobre 2026. Source lue intégralement : [transcription vidéo 07](../../references/2026-10-03-video-transcriptions/video-07.md), 980 lignes, [vidéo originale](https://www.youtube.com/watch?v=_12NIwMnULk). Comparaison documentaire avec CORE, INDEX, USER_REQUEST, IMPLEMENTATION et DUPLICA_HARNESS ; aucune application modifiée, aucun fournisseur appelé. Les noms de modèles sont ceux de la transcription, parfois mal reconnus, sans correction spéculative.

**Conclusion :** reprendre surtout la séparation usage/forfait, la traçabilité session–tâche–worktree et un choix explicite du modèle par phase. Atelier possède déjà l’essentiel du cockpit, de la mémoire parcimonieuse et de la boucle de vérification. La vidéo apporte des problèmes concrets d’usage ; elle ne démontre ni un classement économique des modèles ni une intégration de quotas terminée.

Dans ce rapport, **démontré** signifie interaction ou résultat décrit pendant la démonstration, uniquement attesté par la transcription ; aucune capture n’a été vérifiée ici. **Déclaré** désigne explication, opinion ou bilan rapporté. **Inféré** désigne une proposition pour Atelier. **Inconnu** signifie absence de preuve exploitable.

## Interface et continuité du travail

À **0:28–1:22, lignes 9–17**, l’auteur parcourt l’historique pour comprendre les blocages de review. À **27:24–29:35, lignes 262–283**, il décrit des transcripts accessibles hors terminal, avec adaptations Codex/Claude/Grok ; il constate un défilement pénible et des extraits avant/après illisibles. **Démontré :** navigation et frictions racontées. **Inconnu :** exhaustivité des transcripts et fidélité des adaptateurs.

À **31:02–31:21, lignes 296–299**, il demande un diff rouge/vert numéroté, d’abord maquetté. À **57:39–59:04, lignes 538–549**, le diff ne retrouve pas tous les fichiers ; l’auteur suppose que les worktrees créés par les agents ne sont pas reliés aux onglets. Le défaut est **démontré**, sa cause **inférée par l’auteur**. Pour Atelier : afficher dossier effectif, worktree associé et origine de l’association avant le diff ; une association ambiguë doit rester explicite.

À **1:26:21–1:26:40, lignes 786–789**, ouvrir directement les artefacts depuis la session reste un souhait. À **1:00:03–1:00:15, lignes 557–559**, les statuts temps réel restent difficiles. Atelier dispose déjà des PTY en grille ; Damien demande de les conserver. Ajouter un inspecteur aux Sessions outillées est plus adapté que remplacer les terminaux natifs par le chat NovaFactory.

## Tâches, review et recette

À **3:03–3:35, lignes 33–38**, l’auteur rejette la création automatique d’une tâche pour chaque branche : elle remplit le tableau de travail utilitaire. À **8:39–9:00, lignes 87–91**, le parcours déclaré est roadmap → spec → plan → implémentation. À **1:35:24–1:35:57, lignes 857–861**, sprint, tâches et briefs sont présentés. **Inférence :** une tâche doit conserver besoin, critères, fichiers et décision de lancement ; créer une branche ne constitue pas un objectif.

À **0:07–2:25, lignes 6–27**, une implémentation de 4 h 21 et environ trois rejets sont rapportés ; le nombre est explicitement hésitant. La review révèle des assertions restées sur l’ancien contrat. À **1:42:25–1:43:33, lignes 920–931**, l’auteur décrit gates, corrections et hooks prépush ciblés front/back. **Déclaré :** blocage systématique du push et autonomie de correction ; les commandes et leur enforcement ne sont pas vérifiés ici.

À **1:14:02–1:14:18, lignes 673–676**, Playwright est utilisé pour examiner des captures. Cela ne prouve pas une recette exhaustive. Atelier distingue déjà worker, vérificateur et acceptation humaine, avec états **En revue** et **Preuves manquantes**. Priorité : rendre visible chaque rejet avec critère, preuve, correction et retest, plutôt que reconstruire une review générique ou assimiler tests verts et mission acceptée.

## Mémoire et contexte

À **17:47–18:45, lignes 174–184**, l’auteur recommande des procédures en skills et des références retrouvées à la demande pour limiter le contexte injecté. À **22:32–25:18, lignes 218–243**, il décrit l’entretien automatique, les souvenirs utiles contre les pièges et l’archivage des éléments faux après vérification. **Déclaré :** autonomie et suivi d’utilisation ; **inconnu :** mécanisme, critères et garanties de validation.

Atelier possède déjà un noyau utilisateur/projet limité à 4 000 caractères et une réserve MCP. L’apport serait un historique consultable des lectures, corrections et archivages, si ces événements sont effectivement observés. Préserver les décisions validées et leur provenance ; une déclaration d’agent ne devient pas mémoire certaine. À **1:00:47–1:01:10, lignes 564–568**, la sélection de connecteurs reste une question ouverte, sans solution prouvée à copier.

## Tokens, cache, abonnement et coûts

À **1:01:29–1:02:12, lignes 571–578**, l’auteur explique la latence de la vue usage : NovaFactory récupère les compteurs entrée/sortie/cache depuis les transcripts. Il distingue écriture et lecture du cache Claude, mais indique fusionner l’écriture avec l’entrée. **Déclaré**, sans schéma ni contrôle de double comptage. Pour Atelier, préserver les catégories natives, documenter toute normalisation et montrer fraîcheur/source ; le lecteur de transcripts NovaFactory ne remplace pas les événements app-server.

À **1:02:17–1:05:23, lignes 579–606**, il distingue les tokens historiques du reste du forfait et demande une étude de faisabilité, une maquette puis un workflow. À **1:29:24–1:32:25, lignes 806–831**, il valide la maquette après correction des hauteurs de cartes. **Démontré :** validation visuelle racontée ; **inconnu :** quotas réellement intégrés au produit livré. À **1:37:29–1:38:11, lignes 876–882**, des sondes sont déclarées faisables ; expiration du jeton Claude implique dernière relève connue/périmée. La lecture de fichiers d’identifiants évoquée ici n’est pas transposable : Atelier interdit de lire/copier les credentials Codex.

À **1:14:24–1:16:56, lignes 677–697**, les 100 millions de tokens quotidiens, les volumes hebdomadaires et les abonnements à 200/300 dollars sont rapportés dans un contexte de resets exceptionnels. L’auteur reconnaît ne pas comparer les mêmes tâches (**1:16:56–1:17:08, lignes 698–700**). Son classement des quotas reste une expérience personnelle ; aucune conversion tokens→pourcentage→dollars ni comparaison de rendement n’est démontrée.

À **53:14–55:21, lignes 495–515**, maquetter coûterait davantage au départ mais éviterait des reprises ; contexte long et cache auraient aussi un coût. Le seuil personnel d’autocompaction à 400k n’est pas une règle fournisseur validée. **Inférence :** afficher consommation de préparation, réalisation et correction séparément, avec alerte de contexte si une mesure native existe.

À **1:45:32–1:46:54, lignes 948–960**, RTK réduit les sorties d’outils, notamment tests et git log. Les chiffres oraux hésitent entre 1,2 et 1,8 million et ne permettent pas un calcul exact. **Déclaré :** économie importante ; **inconnu :** tokenizer, couverture, intégrité des preuves et effet facturé. Une réduction expérimentale devrait garder les sorties brutes consultables et mesurer entrée/sortie avant de parler d’économie.

## Choix des modèles et supervision

À **55:40–56:28, lignes 518–526**, Claude est décrit comme attendant ses workers, Codex comme continuant à travailler et consommant davantage. À **1:17:25–1:18:22, lignes 702–710**, le gros modèle prépare la spec tandis qu’un autre code ; justification : coût de sortie et qualité jugée comparable. À **1:40:05–1:41:33, lignes 899–912**, l’auteur passe de Fable à Opus pour superviser, avec vérification par un sous-agent « sonné ». Ce sont des préférences déclarées, sans benchmark contrôlé.

À **1:44:24–1:44:44, lignes 937–940**, fichiers communs et dépendances motivent la sérialisation. À **1:47:01–1:47:45, lignes 961–968**, lancement Grok et attente du superviseur sont racontés ; budget de 5 dollars et bilan par étape sont annoncés. **Inconnu :** application réelle du plafond, nature API/abonnement et rapport final, renvoyé au lendemain.

## Priorités adaptées à Atelier

1. **P1 : consolider l’observabilité existante.** Carte session avec modèle/effort, compte, tokens natifs, cache typé, quota et date de relève ; inconnues et estimations séparées. Atelier a déjà compteurs Codex CLI associés et quotas Codex, puis tarifs officiels sourcés au 3 octobre : éviter un nouveau tableau concurrent.
2. **P1 : relier preuves et surfaces de travail.** Session–tâche–worktree–artefact–review ; diff numéroté et chaîne rejet/correction/retest. Utiliser le harnais actuel, déjà parallèle et soumis aux réservations.
3. **P2 : préparer des configurations explicites par phase.** Planification, réalisation, vérification ; catalogue découvert, coût estimatif sourcé, limites de disponibilité. Aucun changement silencieux du choix Damien GPT-6.1-Sol/max, aucun routage fondé sur les opinions de la vidéo.
4. **P3 : expérimenter contexte et budgets.** Réduction des sorties et alertes bornées avec fournisseurs fictifs, conservation des preuves ; ne promettre un plafond monétaire qu’après définition et vérification de son enforcement.

Comparaison fondée sur `USER_REQUEST.md` lignes 157–167, `IMPLEMENTATION.md` lignes 1–26, 252–265, 350–388 et 539–547, `DUPLICA_HARNESS.md` lignes 37–72 et 89–103. Les tableaux historiques d’IMPLEMENTATION mentionnent encore des limites depuis dépassées ; les ajouts datés du 3 octobre et le contrat du harnais priment. Cette analyse ne vaut pas recette courante d’Atelier.
