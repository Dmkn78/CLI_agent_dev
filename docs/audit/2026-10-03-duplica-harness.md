# Duplica : runner et délégation parallèle — 3 octobre 2026

Duplica peut désormais confier un objectif à une équipe de plateforme, décomposer
le travail, exécuter plusieurs tâches indépendantes, puis faire vérifier et
corriger les écarts. Le développement a été réparti entre trois sous-agents
(moteur, skills/découverte et QA) ; l’agent principal a développé le runner,
l’intégration Duplica, la reprise, les permissions de recette et l’interface.

La [demande](../references/2026-10-03-duplica-harness-request.md) et le
[contrat du harnais](../DUPLICA_HARNESS.md) sont conservés. Les autres chats
actifs du dépôt ont été identifiés avec `list_threads` ; leurs fichiers
My Brain, mobile et Prisme ont été préservés. Cette observation dans Codex
ne les inscrit pas automatiquement comme agents Atelier.

## Causes et résultat

Le bouton de travail créait une seule session. La discussion restait en
lecture seule, sans délégation. Le workflow promettait plusieurs spécialistes
mais planifiait des tâches séquentielles et attendait chaque agent dans une
boucle. Le catalogue de skills pouvait aussi devenir vide : son scan atteignait
500 dossiers dans un bundle `build/` avant de rencontrer la bibliothèque.

`DuplicaRunner` persiste les objectifs et prend les TODO compatibles sans
fabriquer de travail. Il utilise le moteur d’équipe : 1 à 8 workers, 1 à 20
mini-tâches par plan, dépendances validées et compatibilité des fichiers/dossiers.
Les tâches qui touchent les mêmes chemins ou dont le périmètre d’écriture reste
inconnu sont sérialisées. La concurrence est prouvée par des barrières dans les
tests, indépendamment du nombre de spécialistes configurés.

Les étapes conservent tâche, session, statut et horodatages. Les workers reçoivent
aussi l’objectif, le contexte et les preuves de bug, même si le planner ne les
reprend pas dans sa consigne. Review, audit et synthèse restent distincts de la
recette indépendante. La sélection du modèle et de l’effort reste explicite et
provient du catalogue ; le runner Codex n’adopte pas implicitement les autres
fournisseurs du cockpit.

Le suivi affiche le plan, les tâches/agents observés et les preuves. Le lancement
propose le parallélisme, la poursuite des TODO, le profil de permissions et une
recette. La reprise conserve le même run, le modèle, l’effort et le sandbox.
Les longues missions sont réduites à un aperçu avec accès aux consignes complètes.
Le dossier reste réservé à la vérification entre fin technique et résultat de
recette. Les TODO restent **En revue**, même quand la recette est vérifiée.

## Permissions, preuves et reprise

`on-request`, `read-only`/`workspace-write`, le périmètre projet et la profondeur
de délégation contrôlée sont conservés. Les sessions enfants sont lancées par
Atelier, sans arbres natifs incontrôlés. L’héritage des portées existant reste
global → projet → workflow → tâche → session ; un réglage explicite plus précis
remplace le parent. Retirer la portée effective du workflow arrête son runner.

Les permissions ponctuelles de recette sont liées au run, au workflow et à la
configuration de critères. Une ancienne demande ne peut autoriser une recette
redéfinie. Changer les critères supersède les anciens bugs ; seule une recette
de la même configuration peut résoudre leur observation. Une ancienne
vérification ne libère pas la réservation d’un nouveau cycle. Pause, arrêt,
reprise de contrôle, redémarrage et callbacks tardifs n’entraînent aucun replay
silencieux. Les clients construits tardivement et les événements après clôture
ne rouvrent pas une session fermée.

La recette exécute les commandes configurées dans de vrais processus et les
gestes GUI dans Electron. `hover` déplace réellement la souris, avec la même
protection d’observation que les clics. `guiNotApplicable: true` est un choix
explicite pour un résultat sans interface. Un contrôle non exécuté reste une
preuve manquante. Échec observable → bug et preuve → correction bornée → retest.
L’absence de recette bloque la validation sous **Preuves manquantes** ; elle ne
devient pas une réussite annoncée par le modèle.

Quatre skills sont injectés selon le rôle :
[planification](../../skills/duplica-mission-planner/SKILL.md),
[supervision](../../skills/duplica-work-supervisor/SKILL.md),
[handoff](../../skills/duplica-worker-handoff/SKILL.md) et
[qualité](../../skills/duplica-quality-loop/SKILL.md).
Le scan donne priorité à `skills/` et `.agents/skills` et exclut les artefacts
`build/dist` du parcours général. Le catalogue observé découvre les quatre
skills parmi 78 commandes ; les plafonds restent 500 dossiers et 80 entrées.

## Validation et preuves

- Commande backend canonique avec le runtime fourni dans `PATH` :
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v`.
  **322 tests exécutés, 320 réussis, 2 ignorés**, en 61,580 s.
  Log privé : `.atelier/duplica-full-backend-tests.log`.
- **26 nouveaux tests** de harnais/parallélisme/survol : barrières 8 tâches/4
  workers, dépendances, collisions, arrêt, clients/événements tardifs, correction
  et retest, reprise, permissions périmées et réservation pendant la recette.
- **80 fichiers JS/CJS** vérifiés avec `node --check`, **10 suites unitaires JS**
  réussies. Log : `.atelier/duplica-js-unit-tests.log`.
- Quatre skills validés avec `quick_validate.py`, 24 liens locaux résolus,
  cinq tests de découverte réussis ; deux régressions reproduites avant leur
  correction. `git diff --check` réussi.
- Recette Electron finale réussie à **1200, 800 et 390 px**, sans débordement ni
  erreur JS : validation du plan depuis l’UI, huit tâches, quatre agents fictifs
  simultanés, état En revue/Preuves manquantes, reprise du même run sans nouvelle
  équipe, vrai sous-processus de test et survol Architecture → recette vérifiée.
  Les hashes des preuves ont été contrôlés et les captures inspectées.

Preuve finale privée :
`.atelier/duplica-harness-e2e/run_94a1f549a02e/acceptance.json`, avec
`four-workers-active.png`, `plan-eight-tasks.png` et `runner-{1200,800,390}.png`.
Les fixtures et leur fenêtre Electron ont été fermées ; leurs données restent
conservées. La suite complète inclut les évolutions concurrentes présentes dans
le checkout lors de son exécution.

## Limites constatées

Les agents des tests utilisent le fournisseur fictif ; aucune inférence réelle
n’a été lancée. Le transport réel `codex app-server` en stdio et son catalogue
paginé `model/list(includeHidden=true)` ont été interrogés : **9 modèles**, sans
**GPT-6.1-Sol** demandé pour Duplica. Aucun modèle de remplacement n’a été utilisé.
La preuve est `.atelier/duplica-catalog-readiness.json`. L’exécution réelle avec
ce modèle reste à vérifier lorsqu’il est effectivement proposé par le CLI local.

Les déclarations de fichiers gouvernent le scheduler et les consignes ; elles
ne constituent pas une sandbox OS par fichier. Le contrôleur couvre Atelier
et le navigateur de recette local, pas les autres applications du PC. Les skills
n’ajoutent pas ces outils aux workers. La recette complète doit être définie et
les permissions nécessaires déléguées pour que la poursuite puisse vérifier puis
prendre l’objectif suivant. La recette humaine reste séparée.

Le Python système 3.9 échoue sur une annotation préexistante ; les validations
utilisent Python 3.12 du runtime fourni. Les changements sont dans les sources :
l’application installée n’a pas été remplacée ni son instance utilisateur arrêtée.
Ils seront chargés par un nouveau service source au prochain lancement.
