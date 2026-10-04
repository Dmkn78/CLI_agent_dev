# Rapport NovaFactory et Atelier

Analyse pour Damien, le 3 octobre 2026. Objet : ce que les vidéos permettent de reprendre pour l’interface des agents, comment NovaFactory suit la consommation, et pourquoi Atelier ne donne pas encore la même lecture.

**La priorité est de fiabiliser et réunir les mesures que nous avons déjà.** Atelier possède les terminaux, le choix des modèles par rôle, les tokens, les quotas Codex, des tarifs officiels et un harnais de travail. Les écarts les plus utiles à corriger sont l’attribution parent/sous-agents, le coût des terminaux natifs, les catégories de cache et le lien entre une tâche, ses livrables et ses preuves. Une copie installée différente du code courant peut aussi expliquer le décalage visuel.

Le meilleur ajout visible serait **un détail compact par mission : qui a travaillé, avec quel modèle et effort, combien chaque rôle a consommé, ce qui manque dans la mesure, et quel résultat a été effectivement vérifié**. Les vidéos ne justifient pas de multiplier systématiquement les agents ou de choisir automatiquement un modèle moins cher.

## Périmètre et sources

Sept sous-agents **GPT‑6.1 Sol**, un par vidéo distincte, ont lu les transcriptions intégralement. L’archive contient huit fichiers : les deux transcriptions du Jour 5 sont identiques octet pour octet, avec le même SHA256. Une analyse suffit pour cette vidéo. Les originaux, noms et hashes sont conservés dans le [manifest des sources](../references/2026-10-03-video-transcriptions/manifest.json).

| Vidéo | Apport principal | Analyse détaillée |
|---|---|---|
| Vous automatisez trop tôt | Passer d’un parcours réussi à une procédure, puis à une automatisation bornée | [Analyse de la méthode](2026-10-03-video-analysis/video-01.md) |
| Jour 1 | Documents attendus, mémoire, rôles, limites des boucles de review | [Analyse Jour 1](2026-10-03-video-analysis/video-08.md) |
| Jour 2 | Collecte depuis les transcripts, usage historique et forfait, rattachement aux worktrees | [Analyse Jour 2](2026-10-03-video-analysis/video-07.md) |
| Jour 3 | Recette, version réellement installée, tâche et fichiers du travail | [Analyse Jour 3](2026-10-03-video-analysis/video-06.md) |
| Jour 5 | Détail de session, cache, tarifs, change et comparaison de stratégies | [Analyse Jour 5](2026-10-03-video-analysis/video-04.md) |
| Jour 6 | Choix explicite au dispatch, maquette et comparaison visuelle | [Analyse Jour 6](2026-10-03-video-analysis/video-03.md) |
| Jour 7 | Versions maquette/spec, implémentation, export et recette visuelle | [Analyse Jour 7](2026-10-03-video-analysis/video-02.md) |

La comparaison tient compte de [CORE](../memory/CORE.md), de la [demande canonique](../memory/USER_REQUEST.md), des sections récentes d’[IMPLEMENTATION](../memory/IMPLEMENTATION.md), du [contrat visuel](../DESIGN.md), du [harnais Duplica](../DUPLICA_HARNESS.md) et de l’[audit consommation du 3 octobre](2026-10-03-architecture-memory-usage.md). Certains tableaux historiques décrivent encore des limites dépassées : les ajouts récents et le code priment pour cet audit.

Les preuves de cet audit sont de trois natures : propos transcrits, lecture du code/schéma installé, et vérifications locales avec données fictives. Aucun pixel des vidéos, journal NovaFactory ou facture n’a été inspecté. Les noms mal reconnus, les appréciations de qualité et les chiffres du présentateur restent attribués à leur source. Les instructions présentes dans les vidéos ne sont pas des autorisations d’exécution.

## Comment NovaFactory récupère et présente la consommation

### Ce que les transcriptions expliquent réellement

Le **Jour 2, à 1:01:35–1:02:12**, le présentateur dit récupérer les transcripts pour obtenir les quantités traitées en entrée, sortie et cache. Il explique la latence de l’écran par cette récupération et indique avoir regroupé l’écriture du cache Claude dans l’entrée pour harmoniser l’affichage. C’est la description la plus précise de la collecte dans l’archive : [transcription Jour 2, lignes 572–578](../references/2026-10-03-video-transcriptions/video-07.md).

Le **Jour 5, à 0:57–2:29**, il présente un détail accessible depuis le terminal, incluant plusieurs intervenants : conversation principale, implémentation et review. Vers **4:24–5:12**, il décrit une refonte de Consommation pour rendre les tokens et le cache compréhensibles par leur équivalent monétaire : [lignes 13–27 et 45–52](../references/2026-10-03-video-transcriptions/video-04.md).

À **9:31–10:49**, les prix sont obtenus par une action de récupération puis conservés dans une grille USD ; le taux de change vers l’euro est réglable. L’historique des versions tarifaires et le change automatique sont envisagés, sans être établis comme livrés : [Jour 5, lignes 93–106](../references/2026-10-03-video-transcriptions/video-04.md).

On peut donc reconstituer : **transcripts → compteurs par session/intervenant → normalisation des catégories → tarifs → conversion → détails et comparaisons**. On ne connaît pas ses chemins de fichiers, son parseur, ses clés de déduplication, ni la règle exacte d’inclusion des enfants dans les totaux parents. Le Jour 5 signale même des relevés impossibles et une couverture OpenCode encore incomplète. Il faut reprendre l’expérience de lecture sans prétendre disposer de son collecteur.

### Quatre valeurs à séparer dans Atelier

| Valeur | Ce qu’elle répond | Limite à afficher |
|---|---|---|
| Tokens observés | Combien le fournisseur déclare avoir traité pour les appels couverts | Champ, source, date et couverture ; cumul et dernier appel distincts |
| Équivalent API | Combien ces catégories représenteraient avec une grille de prix choisie | Estimation, tarif/version, route et devise ; ce n’est pas une facture |
| Quota de compte | Quelle fraction d’une fenêtre du compte est utilisée et quand elle se réinitialise | Compte partagé, bucket et fenêtre ; pas un pourcentage propre à la session |
| Dépense réelle | Quel montant a effectivement été facturé | Seulement si une facture ou donnée de facturation est fournie/importée |

Les centaines de dollars annoncées dans les vidéos sont fréquemment des **équivalents API couverts par des abonnements déjà payés**. Le Jour 5 le précise à **11:47–12:36, lignes 115–122**. Il ne faut donc ni les appeler dépenses supplémentaires, ni annoncer une économie financière égale à ce montant. Un token en cache reste une mesure de traitement ; son tarif peut différer de l’entrée neuve.

### Calcul et catégories de cache

Pour notre convention interne où l’entrée comprend toutes ses catégories :

```text
entrée ordinaire = entrée totale − cache lu − cache écrit
équivalent USD = (entrée ordinaire × tarif entrée
                  + cache lu × tarif lecture
                  + cache écrit × tarif écriture
                  + sortie × tarif sortie) / 1 000 000
```

Les catégories doivent être connues, disjointes et normalisées selon le fournisseur. Pour OpenAI, la documentation précise que l’écriture du cache utilise son propre tarif, plutôt qu’un supplément ajouté à l’entrée ordinaire. Le cache réutilise un préfixe du contexte ; ce n’est pas simplement « un fichier déjà ouvert ». [Documentation officielle du prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).

Dans Atelier, **ne pas ajouter une seconde fois le cache au total**, ni le raisonnement à la sortie lorsqu’il y est déjà inclus. Ne pas assimiler une valeur absente à zéro. Ne pas présenter le cumul de toute une discussion comme la taille actuelle de son contexte. Les prix particuliers d’une requête longue doivent dépendre de cette requête, plutôt que de la somme de plusieurs appels plus courts.

## Ce qui existe déjà dans Atelier

| Capacité | État constaté dans le code courant | Écart utile |
|---|---|---|
| Sessions structurées Codex | `thread/tokenUsage/updated`, cumul session et différence depuis une baseline pour chaque tour utilisateur | Conserver tous les champs et distinguer tour utilisateur/appel d’inférence |
| Terminaux Codex natifs | Lecture ciblée de métadonnées, événements `token_count`, états et durées dans les rollouts ; association prudente ou explicite | Coût et couverture de l’équipe, reprise de sessions anciennes |
| Sous-agents natifs | Descendance explicite observée, modèles/tokens/états dans le tableau des agents | Mesures absentes de la projection générale Consommation |
| Sessions structurées OMP | Normalisation entrée/cache/sortie depuis les messages RPC | Conventions de cache, durée et périmètre à conserver pour le prix |
| Autres PTY et ChatGPT web | Ouverture et contrôle de surface distincts des sessions structurées | Pas de télémétrie universelle ; tokens inconnus là où ils ne sont pas transmis |
| Consommation | Comparaison fournisseur/session/tâche/modèle/requête, courbes et export CSV | Une lecture commune avec les mesures natives et leurs limites |
| Tarifs et quotas | Sources officielles OpenAI/Anthropic, cache 24 h, correspondance modèle ; quotas Codex | Prix historiques figés, EUR, couverture explicite et autres fournisseurs |
| Modèles et équipes | Catalogue dynamique, modèles/efforts indépendants par rôle ; Duplica parallèle et borné | Configuration demandée/observée, bilan par rôle et décisions de routage |
| Preuves | Plans, handoffs, rapports, recette indépendante et acceptation humaine distincte | Dossier de tâche immédiatement accessible depuis le terminal |

Sources de code : [collecte structurée](../../server/app.py), [compteurs natifs](../../server/native_usage.py), [adaptateur OMP](../../server/omp_session.py), [projection Consommation](../../web/cockpit.js), [compteurs proches des sessions](../../web/session_usage.js), [estimation](../../web/workbench.js), [tarifs officiels](../../server/official_tariffs.py).

## Pourquoi nous n’avons pas encore la même lecture

### 1 Les sous-agents sont observés mais pas réunis dans Consommation

`NativeUsage._refresh_subagents` conserve les descendants explicites du terminal (`server/native_usage.py`, lignes 191–215), et `dashboardAgents` les présente (`web/agent_dashboard.js`, lignes 52–58). Pourtant `consumptionRecords` ne parcourt que les requêtes, les terminaux natifs et les résidus des sessions structurées (`web/cockpit.js`, lignes 103–121).

**Vérification fictive :** un parent mesuré à 100 tokens et un enfant mesuré à 500 produisent une seule ligne de consommation, celle du parent. La ligne enfant manque. Cela prouve la lacune de projection ; le total réel d’une équipe exige en plus de savoir si le parent est exclusif ou comprend déjà des enfants. L’ajout doit porter une règle de périmètre, avec déduplication par identité native, avant de sommer.

### 2 Le coût du terminal natif cherche des requêtes structurées

Le terminal appelle `sessionUsageChip` avec sa `nativeSession` (`web/terminal.js`, lignes 183–190). `sessionEquivalentCost` cherche uniquement dans `state.requests` (`web/session_usage.js`, lignes 69–75), tandis que `sessionCostModal` cherche uniquement dans `state.sessions` (`web/workbench.js`, lignes 123–125).

**Vérification fictive :** un terminal disposant de compteurs complets, mais sans requête structurée, rend « Coût non communiqué ». Les compteurs peuvent donc être présents sans chemin de calcul vers le détail économique. Il faut un même lecteur de mesures pour les sessions structurées, les terminaux et les enfants, avec raison explicite lorsque le prix reste impossible.

### 3 Deux champs reçus ne sont pas projetés par requête

Le schéma généré par le **Codex installé sur ce Mac, version 0.157.1**, expose `cacheWriteInputTokens` et `reasoningOutputTokens`. La méthode `update_request_usage` ne conserve que cinq clés, dont `cacheWriteTokens`, mais pas ces deux champs (`server/app.py`, lignes 636–648). L’écriture du cache reçue sous son nom Codex est donc perdue dans cette projection. La session brute peut encore la contenir.

**Vérification locale de la méthode actuelle :** les deux champs présents dans l’entrée disparaissent de la requête. Dans un exemple à tarifs volontairement fictifs, cette perte fait passer l’équivalent de **2,725 USD à 2,525 USD**. Le chiffre illustre le défaut, sans mesurer une session réelle. Le raisonnement absent de la ventilation ne signifie pas qu’il faut l’ajouter au total : il faut le conserver comme détail quand sa convention est connue.

### 4 Un cumul de tour peut déclencher un tarif de contexte long

Nos objets `request` représentent les prompts/tours utilisateurs, qui peuvent englober plusieurs appels d’inférence. `estimateCost` choisit le palier long à partir de `usage.inputTokens` (`web/workbench.js`, ligne 88), sans connaître la répartition de ce cumul entre appels.

**Vérification fictive :** deux appels de 150 000 tokens d’entrée, sous un seuil fictif de 272 000, valent ensemble **0,24 USD** avec la grille du test. Leur cumul de 300 000 envoyé au calcul vaut **0,47 USD**, car il déclenche le palier long. Il faut tarifer à l’échelle où les règles s’appliquent ; si cette granularité manque, afficher une estimation limitée ou indéterminée plutôt qu’une précision trompeuse.

### 5 Le prix historique peut changer lors d’un rafraîchissement

Les sources tarifaires sont remplacées par leur dernière version (`server/official_tariffs.py`, lignes 109–118) et les estimations consultent les tarifs courants. Il manque un snapshot tarifaire rattaché au calcul historique. Un recalcul après changement de prix peut donc modifier un ancien résultat. Le tarif manuel est également remplacé pour le même projet/fournisseur/modèle.

À ajouter : identifiant et contenu du tarif utilisé, date de vérification, route/palier, taux de change, date du change et statut du calcul. Proposer séparément « estimation au tarif enregistré » et « recalcul au tarif actuel ». Pour une mesure ancienne sans tarif conservé, reconnaître l’impossibilité de reconstituer son prix exact.

### 6 La découverte native a une couverture bornée

Le scan lit deux dossiers journaliers UTC, au plus cent fichiers chacun, et le dernier mébioctet des gros journaux (`server/native_usage.py`, lignes 54–57 et 139–149). C’est utile pour limiter la collecte, mais pas une garantie d’exhaustivité des longues sessions reprises ou de l’historique. Une absence de nouvel événement, une association ambiguë et une session terminée sont trois situations différentes.

Amélioration proposée : suivre les identités déjà associées, des positions de lecture/checkpoints et les rotations, puis afficher la fraîcheur et le début de couverture. Le périmètre reste limité aux sessions explicitement liées au projet ; aucun besoin de copier tout l’historique conversationnel pour mesurer les tokens.

### 7 Le bundle installé diffère du projet courant

Comparaison en lecture seule de quatre assets : `web/session_usage.js`, `web/cockpit.js`, `web/workbench.js` et `web/terminal.js`. **Les quatre fichiers de `/Applications/Atelier.app/Contents/Resources/runtime/atelier-service/_internal/` ont un SHA256 différent de ceux du checkout.** Les hashes sont conservés dans les [preuves locales](2026-10-03-video-analysis/protocol-and-probes.json).

Cela établit une différence de copies, pas la version exacte qui sert une fenêtre ouverte : un service partagé peut avoir sa propre origine. Avant de conclure qu’une fonctionnalité est absente, le cockpit devrait afficher provenance du service, révision/build et révision de l’interface. La recette doit vérifier le bundle que Damien utilise. Cet audit n’a reconstruit, remplacé ni relancé l’application.

## Une possibilité native supplémentaire à étudier

La documentation officielle confirme les notifications de tokens, les quotas par fenêtres et `account/usage/read` pour un bilan d’activité. Le catalogue/effort vient de `model/list`. [Documentation officielle Codex app-server](https://learn.chatgpt.com/docs/app-server).

Le **schéma local généré**, plus précis sur ce point que le passage documentaire consulté, accepte aussi un `threadId` pour `account/usage/read`. Sa réponse facultative `threadUsage` contient des groupes par modèle/effort et des champs `estimatedUsageCreditsMicros` et `estimatedUsageUsdMicros`. La description conditionne ces estimations à la disponibilité de la route de facturation. Extraits enregistrés dans les [preuves de protocole](2026-10-03-video-analysis/protocol-and-probes.json).

**Proposition :** explorer cette lecture pour une session déjà autorisée, avec détection de capacité, cache et traitement explicite des champs nuls. Si le service renvoie une estimation, l’afficher comme **estimation native du service**, séparée de notre équivalent API calculé. Les montants « micros » se convertissent dans leur propre unité ; les crédits n’ont pas un taux USD universel à inventer.

Ce point est une possibilité du protocole installé, **pas un succès sur le compte de Damien** : aucun appel de compte n’a été effectué. La disponibilité réelle, la couverture parent/enfants, les changements de modèle et la différence avec une facture restent à vérifier. Cette piste n’exige pas de lire/copier les credentials ni de passer l’usage sous abonnement à une API payante.

## Ce que je recommande d’ajouter à l’interface

| Priorité | Surface | Ajout concret et critère d’acceptation |
|---|---|---|
| P0 | Détail de consommation | Une source commune ; parent seul/équipe ; chaque enfant et tentative mesurée ; totaux réconciliés sans double compte |
| P0 | En-tête terminal compact | Un badge tokens/équivalent ouvrant un détail avec entrée ordinaire, cache lu/écrit, sortie, modèle et couverture ; hauteur minimale conservée |
| P0 | Détail économique | Chaque champ absent a un motif : mesure non reçue, association ambiguë, tarif absent, granularité insuffisante ou historique incomplet |
| P1 | Mission et rôles | Ventilation préparation, coordination, réalisation, review, corrections ; relances et coût du parcours complet |
| P1 | Lancement d’une tâche | Récapitulatif modèle exact, effort, rôle, outils, projet/worktree et permissions ; aucun héritage invisible du dernier modèle, aucune confirmation supplémentaire systématique |
| P1 | Réglages de consommation | Tarifs/version, USD original, EUR et change daté ; estimation native, équivalent calculé et dépense importée distincts |
| P1 | Quotas proches de la session | Bucket nommé, fenêtres reçues, pourcentage, reset et fraîcheur ; attribution explicite au compte partagé |
| P1 | Approbations de toute l’équipe | Liste commune des demandes avec agent, action, dossier et durée d’attente ; accès à la bonne session, avec limite explicite pour les PTY non instrumentés |
| P1 | Inspecteur de tâche | Résultat, spec, maquette validée, fichiers/diff du bon worktree, review et preuves ouvrables ; documents attendus/absents/non requis distingués |
| P1 | Supervision Duplica | Limites tokens/temps/relances et action choisie : avertir ou suspendre les nouvelles attributions ; mesures partielles et appels déjà actifs visibles |
| P2 | Comparaison de résultats | Sélection A/B explicite, résultat visible immédiatement, versions prompt/spec/maquette, configuration et critères ; score facultatif, jamais fabriqué |
| P2 | Mémoire et méthodes | Consultations observées, corrections et provenance ; session acceptée → proposition de procédure/skill → automatisation avec jalons humains |

Le détail peut vivre dans un panneau latéral ou un overlay discret. Garder les vrais PTY en grille, la charte sombre actuelle et le contrôle des panneaux demandé par Damien. NovaFactory sert à améliorer le parcours ; sa palette et sa mise en page ne remplacent pas nos préférences validées.

Un budget tokens observés ne garantit pas un plafond absolu : les remontées peuvent arriver après le travail, des appels sont déjà en cours et certaines surfaces restent non mesurées. Il faut expliquer la politique effectivement appliquée. Les limites de workers/tâches/continuations du harnais existent déjà ; on les complète au lieu de les reconstruire.

## Choix des agents et réduction de consommation

### Une spécification forte peut aider mais son coût compte

Le Jour 5 compare un grand modèle seul à une spécification produite par Astra puis confiée à un autre modèle. Les valeurs sont rapportées et arrondies ; la qualité est jugée visuellement, avec différences d’effort, permissions et interventions.

| Chemin rapporté | Équivalent annoncé | Lecture possible |
|---|---:|---|
| Astra directement | Environ 3 € | Référence exploratoire |
| Spec Astra 2,71 € + DeepSeek 0,13 € | 2,84 € | Gain annoncé faible sur une réalisation, avant corrections/review éventuelles |
| Spec Astra 2,71 € + Sol 0,88 € | 3,59 € | Plus cher que la référence Astra directe dans cet exemple |

Sources : **Jour 5, 1:39:16–1:40:09 et 1:44:40–1:45:36**, [lignes 881–888 et 929–937](../references/2026-10-03-video-transcriptions/video-04.md). Ce tableau n’est pas un benchmark contrôlé ni un classement des modèles. Une spec réutilisée peut amortir sa préparation ; cela suppose une qualité comparable et des coûts additionnels mesurés.

**Pour Atelier :** enregistrer le choix humain par phase et le comparer au modèle réellement observé. Montrer préparation + réalisation + reprises + review, et non uniquement le dernier worker. Préserver le modèle/effort explicitement demandé ; aucune substitution silencieuse sur la base des opinions du présentateur. Le runner Duplica est actuellement Codex : le catalogue multi-fournisseur du cockpit ne garantit pas le même harnais pour tous les moteurs.

### Réduire les reprises avant de chercher un modèle moins cher

Les pistes les plus solides dans les vidéos sont des méthodes : clarifier la demande, valider la maquette, borner les tâches, donner un contexte ciblé et faire une recette sur le résultat livré. Elles peuvent éviter du travail inutile, mais leur gain en tokens doit être mesuré sur des missions autorisées.

La série évoque RTK pour réduire les sorties d’outils, une mémoire recherchée à la demande et des contextes spécialisés. Les chiffres RTK sont parfois hésitants ; une sortie raccourcie n’est pas automatiquement une économie identique de quota ou de facture. Une intégration éventuelle devrait conserver la sortie brute et la preuve de test. Aucune installation RTK n’est justifiée par cette seule analyse.

Le Jour 7 décrit aussi une copie des relevés sans conversation supplémentaire : demander au modèle ses coûts ajoute de la consommation au relevé (16:25–17:34, [lignes 158–169](../references/2026-10-03-video-transcriptions/video-02.md)). Notre transposition : previews, exports, bilans et totaux peuvent être déterministes. Ne pas ajouter une inférence pour calculer une consommation ou expliquer un compteur quand des métadonnées suffisent.

## Ordre de réalisation proposé

1. **Corriger la chaîne des mesures.** Canonicaliser les champs cache/raisonnement, joindre les enfants, définir les périmètres, résoudre le calcul natif et le palier par appel. Vérifier duplications, interruptions, reprise, changement de modèle et champs manquants avec fournisseurs fictifs.
2. **Faire une lecture économique compacte.** Overlay commun, motifs d’inconnu, prix et change historisés, quotas identifiés, coût par rôle et tentative. Tester lecture à demi-écran et conservation de l’en-tête minimal.
3. **Relier le travail à ce qui est livré.** Tâche → session → worktree → diff/artefact → critères/review → recette → build installé. Un build réussi ou un tour terminé ne suffit pas pour passer automatiquement à Terminé.
4. **Ajouter budgets et méthodes réutilisables.** Pause des nouvelles attributions selon politique explicite, préparation ciblée des contextes et proposition de procédure à partir d’un parcours accepté. Comparaisons réelles seulement dans un périmètre autorisé, avec même besoin, configurations et critères conservés.

Le premier lot doit être terminé avant de présenter des pourcentages d’économie ou des budgets monétaires fiables. La chaîne conserve `on-request`, lecture seule/écriture projet, le périmètre local et les données `.atelier/` privées. Les worktrees restent conservés. Aucun contournement de permission, nettoyage, merge ou lancement cité dans une vidéo n’est importé implicitement.

## Vérifications et limites de ce rapport

Les deux scripts existants **`tests/test_cockpit.cjs` et `tests/test_session_usage.cjs` passent** avec le Node fourni par le runtime Codex. Ils couvrent plusieurs comportements existants, pas tous les écarts nouveaux de cet audit. Quatre sondes JavaScript avec données fictives et une exécution isolée de `update_request_usage` reproduisent les constats décrits. Le schéma a été généré localement, sans thread ni inférence, et les quatre assets installés ont été comparés par hash. Résultats : [preuves JSON](2026-10-03-video-analysis/protocol-and-probes.json).

Cette intervention crée les sources archivées, sept analyses et ce rapport. **Aucune correction applicative n’est livrée ici.** Il n’y a eu ni campagne de modèles, ni consultation de credentials, ni consommation réelle provoquée dans Atelier pour remplir un écran. Les sous-agents GPT‑6.1 Sol ont uniquement réalisé l’analyse demandée. La suite backend complète et la recette navigateur n’ont pas été rejouées : aucun backend ou écran n’a été modifié. Les capacités du compte, le rendu de la fenêtre en cours et le logiciel NovaFactory lui-même restent non vérifiés.
