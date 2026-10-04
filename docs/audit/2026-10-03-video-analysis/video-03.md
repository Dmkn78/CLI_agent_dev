# Vidéo 03 — Jour 6 : de l’idée à la maquette

Analyse pour Damien, 3 octobre 2026. Source intégralement lue : `docs/references/2026-10-03-video-transcriptions/video-03.md`, 687 lignes. Contexte : `CORE.md`, `INDEX.md`, sections utiles de `USER_REQUEST.md` et `IMPLEMENTATION.md`. Aucun code, état privé ou fournisseur réel inspecté ; aucune exécution de campagne. Les propositions ci-dessous restent des recommandations de conception.

## Ce que cette source permet d’affirmer

La vidéo décrit deux produits : Nova Factory, cockpit existant, et Nova Bench, nouvelle application destinée à comparer des résultats HTML et leurs coûts. Il faut éviter de reprendre comme fonctionnalités réalisées de Nova Factory les interactions seulement esquissées dans la maquette Nova Bench.

**Montré selon la transcription** signifie qu’un commentaire décrit une interaction ou un résultat affiché ; les pixels, journaux et mesures originales n’ont pas été inspectés. **Déclaré** désigne une méthode ou une explication du narrateur. **Inféré** désigne notre traduction en besoin Atelier. **Inconnu** marque ce que la transcription ne permet pas d’établir. Les noms de modèles et efforts sont souvent mal transcrits : leur identification exacte ne doit pas être reconstruite arbitrairement.

## Cadrage, tâches et conception

À **0:37–1:11, lignes 11–16**, le narrateur propose de faire spécifier par un gros modèle puis implémenter par un petit modèle ; il veut réunir résultats et coûts pour éviter les changements de fenêtres. C’est un objectif déclaré, pas une preuve d’économie. À **3:21–5:18, lignes 35–53**, il arbitre une application web plutôt qu’un emballage desktop pour observer les modifications rapidement ; l’affirmation « plus simple » donc moins de tokens reste une hypothèse sans comparaison contrôlée.

Le cadrage distingue explicitement les livrables : à **8:38–9:09, lignes 83–87**, l’agent d’onboarding copie une référence et prépare les instructions, sans créer la maquette. À **15:35–16:23, lignes 146–154**, l’intégration future de cet onboarding au cockpit est souhaitée ; les documents quick reference, conventions et architecture sont décrits comme créés. À **18:44–19:07, lignes 174–178**, les questions pourraient varier selon métier, durée et caractère répétitif du projet. Le module générique est donc annoncé, pas livré.

À **38:50–40:13, lignes 365–378**, roadmap/specifications, maquette et implémentation sont attribuées à des étapes différentes. À **55:10–55:56, lignes 515–522**, le narrateur vérifie le périmètre et recommande de relire la roadmap avant développement. À **57:30–58:06, lignes 534–540**, chaque étape devient un chantier pouvant contenir plusieurs cartes. Pour Atelier, l’ajout utile est une vue de passage entre livrables, avec critères et version validée, plutôt qu’une nouvelle file de tâches parallèle.

## Maquette et validation

À **7:08–8:46, lignes 69–84**, une maquette avec thèmes et design system sert de référence ; le narrateur demande de réutiliser la méthode documentaire, pas l’apparence précédente. La distinction mérite un champ explicite « reprendre la structure / reprendre l’apparence » dans une future demande de conception.

La maquette est rejetée : comparaison par Shift-clic peu compréhensible à **1:04:20–1:04:40, lignes 595–598** ; espace excessif avant le résultat à **1:05:28–1:05:54, lignes 602–606** ; navigation latérale souhaitée à **1:08:44–1:09:23, lignes 629–636**. À **1:09:43–1:09:55, lignes 639–641**, l’objectif déclaré est comparer, sans scoring. Le formulaire décrit à **1:06:33–1:06:54, lignes 611–614** associe HTML, réalisation, variante de prompt, modèle et version ; son fonctionnement final demeure inconnu.

À **1:08:09–1:08:50, lignes 624–630**, le narrateur refuse une review supplémentaire parce que son désaccord est esthétique. Cela ne justifie pas de supprimer les vérifications de fonctionnement : comparaison opaque et navigation difficile sont aussi des problèmes d’usage. À **1:13:01–1:14:32, lignes 672–685**, l’agent estime avoir fini tandis que l’utilisateur reste insatisfait. Atelier distingue déjà fin du tour, preuve indépendante et recette humaine (`IMPLEMENTATION.md`, lignes 305–313, 543) : il faut rendre cette séparation visible sur le livrable de conception.

## Agents, mémoire et limites de contexte

Le dernier modèle utilisé est repris involontairement au dispatch : **48:19–49:37, lignes 452–464**. Le narrateur demande immédiatement une tâche permettant le choix avant lancement. C’est la preuve la plus concrète d’un risque économique lié à l’interface. À **1:00:36–1:01:22, lignes 560–568**, l’orchestrateur doit déléguer sans coder lui-même, puis permettre un relais grâce aux descriptions des tâches. Cette méthode rejoint les rôles et handoffs d’Atelier ; elle n’autorise aucun dispatch supplémentaire ici.

À **20:52–21:17, lignes 195–199**, les fichiers d’instructions orientent vers une documentation consultable. À **36:33–36:57, lignes 344–348**, la source de vérité produit est réservée à la modification humaine. À **16:35–17:09, lignes 156–162**, les frictions de sessions doivent servir à améliorer la méthode ; une routine hebdomadaire est seulement envisagée. Atelier possède déjà noyau borné et réserve, provenance et souvenirs validés (`IMPLEMENTATION.md`, lignes 357, 381, 545). L’amélioration serait un handoff compact montrant décisions validées, critères ouverts et liens nécessaires, sans injecter tout l’historique.

La vidéo ne donne **aucune mesure de compaction**, taille de contexte avant/après, quantité de mémoire injectée ou économie liée au cache. Les dossiers séparés évoqués à **59:07–59:19, lignes 549–551** sont présentés comme cloisonnement ; ils ne prouvent pas l’enforcement des permissions.

## Tokens, coûts, quotas et cache

À **6:02–6:23, lignes 59–62**, le coût doit provenir d’un transcript ou du panneau terminal. À **11:06–11:37, lignes 104–109**, le narrateur dit inclure lectures/écritures de cache et évoque épuisement hebdomadaire et resets ; méthode de calcul, dénominateurs et provenance détaillée sont inconnus.

À **31:33–32:14, lignes 298–305**, il arrête un travail pour conserver du forfait jusqu’au lendemain et cite environ **182 €** pour un volet latéral. À **35:55–36:01, lignes 338–339**, il distingue environ sept minutes de travail, trente-deux minutes d’ouverture et **4 €**. À **49:43–49:56, lignes 465–467**, il oppose environ **9 millions de tokens/7,15 dollars** et **4 millions/5 dollars**. Ces montants sont déclarés dans le commentaire ; facturation, équivalent API, période et inclusion du cache ne sont pas établis. Ils ne constituent ni tarifs actuels ni comparatif fiable des fournisseurs.

À **46:16–47:12, lignes 433–442**, près de 100 000 tokens de raisonnement et l’intérêt possible d’un effort medium sont évoqués sans preuve contrôlée. À **1:13:54–1:14:06, lignes 679–681**, le facteur 1,5 attribué à max reste une déclaration. Atelier doit découvrir les efforts via le catalogue, sans convertir ces propos en multiplicateur universel.

## Ajouts prioritaires pour Atelier

| Priorité | Ajout réel proposé | Base existante, dépendance et limite |
|---|---|---|
| P0 | Récapitulatif compact avant chaque dispatch : rôle, modèle exact, effort, permissions, projet et abonnement ; différence visible avec le dernier lancement. | Choix explicites et reprise conservée existent (`IMPLEMENTATION.md`, lignes 5–11). Vérifier chaque parcours, sans substitution silencieuse ni nouvelle confirmation systématique. |
| P0 | Résultat principal visible immédiatement, avec navigation gauche, sélection A/B explicite et panneau commun Résultat/Modifications/Preuves. | Explorateur et artefacts existent ; diff IDE reste ouvert (ligne 363). Attribution exacte session/fichier exige événements et isolation ; sinon afficher « attribution inconnue ». |
| P0 | Carte économique distinguant tokens entrée, sortie et cache, équivalent API sourcé, dépense importée et quota avec date de reset. | Mesures et compteurs Codex existent (lignes 255–265) ; tarifs actualisés existent désormais (ligne 543), malgré l’ancien tableau. FX, factures et autres PTY restent incomplets. |
| P1 | Parcours onboarding → brief → maquette → validation humaine → specs → implémentation, avec points d’arrêt et critères conservés. | Réutiliser plans, tâches et harnais actuel, qui gère déjà dépendances/conflits (lignes 5–18), plutôt que l’ancienne limitation séquentielle historique. |
| P1 | Import de résultats HTML accompagné du prompt/spec, version, configuration et mesures, avec comparaison visuelle sans score imposé. | Benchmarks présents (ligne 370). Stockage durable, rendu isolé et ressources locales contrôlées nécessaires ; aucun benchmark réel lancé automatiquement. |

Enfin, à **30:23–33:27, lignes 286–316**, un aperçu échoue probablement à cause d’un lien temporaire disparu. Proposer un artefact durable, un état « indisponible » et un diagnostic sourcé avant correction. Atelier conserve déjà `.atelier/` et ses worktrees ; la piste d’export par Git évoquée à **50:59–52:20, lignes 476–489** ne doit pas y envoyer les données privées. La prochaine validation utile consiste en recettes fictives ciblées du dispatch, de l’attribution, de l’import et de la séparation clôture/acceptation, puis examen humain de la maquette.
