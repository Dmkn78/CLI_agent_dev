# Consolidation des canaux Atelier — 2 octobre 2026

La validation finale sur fournisseurs fictifs et Electron isolé réussit :
128 tests backend, dont 127 réussis et un symlink ignoré sous Windows, syntaxe
JS valide et parcours Canaux → Connexions réussi. Le bouton Connexions était
hors écran à la hauteur de recette et la barre latérale fixe ne défilait pas ;
elle permet désormais le défilement vertical. Le refus d’un contrôle déplacé
avant clic déclenche une seule nouvelle observation, puis un seul clic réel.

Le premier passage avait conservé le moteur des canaux, ajouté un test de course
au démarrage et renforcé le refus des actions natives : 122 tests, dont
121 réussis. Les commandes et anomalies de ce passage restent documentées
ci-dessous comme historique. Une exception asynchrone de benchmark observée
lors d’une exécution intermédiaire n’est pas déclarée résolue par cette livraison.

## Périmètre et changements

Consignes et contexte lus : `AGENTS.md`, `docs/memory/CORE.md`,
`docs/memory/INDEX.md`, le rapport `2026-10-02-agent-channels.md`, la section canaux
de `IMPLEMENTATION.md` et le passage de travail `2026-10-02-duplica-channels-handoff.md`.
Au premier passage, l’état courant du lancement décrit n’avait pas été interrogé
ni modifié. Lors de la finalisation, l’arrêt du service et du processus natif
a été constaté. Les documents lus ne créent pas de permissions.

Examen ciblé : `server/channels.py`, `server/channel_runtime.py`,
`server/api_connections.py`, les chemins de discussion dans `server/app.py`,
les adaptateurs natifs et `server/process_environment.py`, leurs tests et la
recette navigateur existante. Les nombreux changements préexistants sont
conservés.

Le premier passage a modifié `tests/test_api_connections.py` et ce rapport.
La correction suivante ajoute la nouvelle observation bornée dans
`server/duplica_verification.py`, ses six tests dans
`tests/test_duplica_verification.py` et la recette Electron
`tests/channels_recipe_{acceptance.py,window.cjs}`. La validation finale corrige
le défilement de `web/style.css` et la fixture : rendu des fenêtres cachées actif,
fermeture par signal de fichier local et traces conservées même après échec.
Le moteur des discussions et les adaptateurs de modèles restent ceux examinés
au premier passage. Les sorties privées sont conservées dans
`.atelier/channel-consolidation-evidence/` ; `IMPLEMENTATION.md` décrit la correction.

- Ajout de `test_stopping_before_native_client_start_does_not_leak_the_late_client` :
  deux événements forcent l’arrêt après création de la session isolée et avant
  son démarrage. Après libération, la session reste fermée, le client est fermé
  et retiré, aucun `turn/start` ni message public n’est produit et l’état
  « Arrêt en cours » se termine. Le test utilise explicitement `FakeCodex`.
- Renforcement de `test_channel_uses_fresh_native_context_and_closes_each_turn` :
  le fournisseur fictif demande une commande, un changement de fichiers, des
  permissions et une question utilisateur. Les quatre demandes de chaque tour
  sont refusées, aucune approbation n’est créée et leurs paramètres privés ne
  figurent pas dans les événements.

La fuite de client suspectée au démarrage différé n’est pas reproduite : le
`finally` du runtime de canal ferme et retire le client. Aucune correction du
runtime n’est justifiée par ce scénario.

## Invariants vérifiés

Les résultats ci-dessous portent sur les fournisseurs fictifs et les serveurs
HTTP locaux de test, avec bases temporaires. Ils ne prouvent pas une inférence
native réelle ni le comportement de serveurs externes.

| Invariant | Preuve de comportement et constat |
|---|---|
| Premier tour : même état public | `test_public_round_barrier_isolation_and_orchestrator_plan` compare les entrées de deux participants, force un retour anticipé et vérifie qu’aucune réponse n’est publiée avant la barrière. Une mutation du contexte d’un callback ne touche pas son pair. |
| Tours suivants : échanges publics uniquement | Le même test vérifie les séquences de contexte `[1, 3, 5]`. `test_messages_validate_public_text_and_provider_metadata_is_filtered` exclut pensées, outils, usage et identifiants de session du contexte transmis au tour suivant. Le contexte borné et la mutation d’un snapshot sont également testés. |
| Copie : configuration seule | `test_clone_copies_configuration_without_work_session_context` vérifie l’absence de mission, messages, pensées et outils privés, ainsi que l’état inchangé de la session source. Une autre session de projet et un callback réutilisant la session source sont refusés. |
| Sessions natives isolées, sans actions | Deux sessions fraîches et fermées sont observées pour discussion et plan : lecture seule, mémoire et travail désactivés, répertoire distinct, `on-request`, thread éphémère et configuration sans shell/plugins/MCP. Le test renforcé vérifie les refus natifs. OMP expose zéro outil hôte et refuse une lecture de fichier fictive. |
| Arrêt : aucune publication tardive ou reprise prématurée | Les tests d’arrêt et de délai bloquent un callback, refusent modification et reprise tant qu’il reste vivant, puis vérifient l’absence de sa réponse tardive. Fermeture bornée, redémarrage sans replay automatique et échec du lancement d’un thread sont couverts. Le nouveau test couvre l’arrêt juste avant le démarrage natif. |
| Connexions et erreurs : aucune clé divulguée | Une clé fictive désignée par une variable `ATELIER_…API_KEY` apparaît seulement dans l’en-tête HTTP de la fixture ; elle est absente des snapshots/événements et retirée de l’environnement enfant. Les redirections sont refusées et le corps d’erreur HTTP n’est pas exposé. URLs avec identifiants ou paramètres et variables natives de credentials sont refusées. |
| Synthèse : tâche en revue idempotente | `test_prepare_task_is_idempotent_review_only_and_recovers_missing_link` vérifie une seule tâche `review` par plan, sa provenance et la récupération d’un lien perdu. Un nouveau plan peut préparer une autre tâche. Un plan échoué conserve les échanges publics sans préparer de tâche. |

Les autres cas couverts incluent réponses vides/privées, métadonnées non publiques,
consommation invalide, limites d’historique et de participants, champs inconnus,
permissions interdites, rôle consultant SystemOne et impossibilité pour celui-ci
de rédiger le plan. L’enregistrement d’une connexion reste hors ligne ; la
découverte lit un catalogue sans inférence.

## Commandes et résultats du premier passage

Toutes les commandes ont été exécutées depuis la racine du dépôt sous Windows.
`python -B` était disponible ; il n’a pas été nécessaire d’utiliser `python3` ni
de définir `PYTHONDONTWRITEBYTECODE`. Node a retourné `v24.17.0`.

| Commande | Résultat observé |
|---|---|
| `python -B -m unittest discover -s tests -v` avant ajout | Code 0 ; 121 tests en 24,378 s, `OK (skipped=1)`. |
| `python -B -m unittest discover -s tests -p test_channels.py -v` | Code 0 ; 16 tests en 1,021 s, `OK`, sans traceback. |
| `python -B -m unittest discover -s tests -p test_api_connections.py -v` après correction du fournisseur fictif | Code 0 ; 12 tests en 8,013 s, `OK`, sans traceback. Le dernier renforcement des refus natifs a ensuite été exécuté dans la suite finale. |
| `python -B -m unittest discover -s tests -v` sur l’état final des tests | Code 0 ; 122 tests en 27,499 s, `OK (skipped=1)`, sans traceback dans cette sortie. |
| `node --check web/channels.js` | Code 0, sortie vide. |
| `node --check web/api_connections.js` | Code 0, sortie vide. |
| `node --check tests/channels_acceptance.cjs` | Code 0, sortie vide ; contrôle de syntaxe seulement. |
| `node --check tests/test_cockpit.cjs` | Code 0, sortie vide. |
| `npm run test:ui` | Code 0 ; `Cockpit tests passed` (consommation inconnue/zéro, totaux partiels, comptabilité, filtre fournisseur, CSV et configuration de review). |

Sorties privées conservées :

- `.atelier/channel-consolidation-evidence/backend-tests-final.txt` : suite finale.
- `.atelier/channel-consolidation-evidence/channels-tests.txt` et
  `api-runtime-tests.txt` : contrôles ciblés.
- `.atelier/channel-consolidation-evidence/backend-tests.txt` : exécution
  intermédiaire de 122 tests en 21,017 s. Malgré le code 0 et `OK (skipped=1)`,
  elle contient `sqlite3.ProgrammingError: Cannot operate on a closed database`
  dans un thread `_benchmark_run`, lors de la lecture nécessaire à
  `results.json` (`server/app.py:967`, puis `server/store.py:54`). C’est une
  anomalie observée hors du périmètre canaux ; l’origine précise de la course
  n’a pas été diagnostiquée ni corrigée. Son absence à la dernière exécution
  ne prouve pas sa disparition.

Le test symlink est ignoré par la suite sous Windows faute de privilège dédié ;
la suite indique que traversée de chemins et `.env` ont déjà été contrôlées dans
ce même cas.

Deux limites des premières tentatives sont explicites :

- La commande
  `python -B -m unittest tests.test_api_connections.ApiConnectionTests.test_stopping_before_native_client_start_does_not_leak_the_late_client -v`
  a échoué à l’import (`ModuleNotFoundError: test_application`). Elle n’a pas
  exécuté le scénario. La commande `discover -s tests` résout cet import.
- La première version du nouveau test omettait le remplacement de
  `server.app.CodexClient`. Ses premiers passages pouvaient donc atteindre le
  démarrage du client natif installé ; ils sont exclus des preuves de test à
  fournisseur fictif. Le lancement effectif du processus et ses échanges n’ont
  pas été tracés ni vérifiés. Aucun succès d’inférence n’est déclaré. Le test
  corrigé remplace explicitement le client et contrôle l’absence de `turn/start`
  après l’arrêt ; la suite finale est la preuve retenue.

## Prérequis LAYA et CLEF

La mission indique qu’aucun serveur ni matériel cible n’est configuré. Aucun
diagnostic matériel ni chargement de poids n’a été effectué ici.

Pour utiliser un consultant réel, il faut un serveur existant exposant le modèle
via l’API SystemOne `/v1/systemone`, son URL accessible depuis le service Atelier
et l’identifiant exact du modèle déclaré dans la connexion. La connexion utilise
le protocole `systemone`, le rôle `consultant` et un délai de 5 à 180 secondes.
L’authentification facultative doit être fournie au service par une variable
`ATELIER_…API_KEY` ; sa valeur ne doit pas être saisie dans la connexion.
Une API distante requiert HTTPS ; HTTP est accepté pour les endpoints locaux/LAN
prévus par le validateur.

Le serveur et le matériel doivent supporter le runtime et les poids retenus ;
leur capacité mémoire, latence et compatibilité restent à établir sur la cible.
L’adaptateur attend les réponses typées `next_step`, `risk` et
`missing_information`. Les avis sont consultatifs et portent sur un extrait
public d’au plus 1 800 caractères ; un LLM distinct rédige le plan. La qualité,
la calibration et la pertinence de LAYA/CLEF sur les tâches de Damien restent
non vérifiées. Aucun poids n’a été installé.

## Limites du premier passage

Au premier passage, la recette navigateur n’avait pas été relancée. Le contrôle
de syntaxe de `channels_acceptance.cjs` ne constituait pas une validation de
l’écran. La recette indépendante annoncée restait alors à effectuer ; sa
validation ultérieure est décrite ci-dessous.
Les parcours automatisés existants doivent utiliser `tests/channels_fixture.py`
et sa base unique dans `.atelier/channels-browser-fixture/`, avec fournisseurs
fictifs, jamais les tâches ou données du service utilisateur.

Le service utilisateur n’a pas été redémarré et ses terminaux n’ont pas été
fermés. Aucun sous-agent, campagne réelle, publication, push ou déploiement n’a
été lancé dans ce travail. Aucune lecture de credentials natifs ou secrets n’a
été demandée aux outils. L’omission de mock dans le premier essai est signalée
ci-dessus pour ne pas la confondre avec une validation native autorisée.

Skills utilisés : `engineering-workflow` et `clean-code-workflow` pour le périmètre
et les petits cycles, `clean-code-concurrency` pour les entrelacements d’arrêt,
`clean-code-tests` pour les scénarios observables et l’isolation des fournisseurs.

## Validation après autorisation explicite des tests

Damien précise : « je n'ai pas l'app et valide les test tests ». Cet accord
autorise le test Electron demandé hors sandbox, sans changement global des
permissions. À cette reprise, le service sur 4317 et l’ancienne session native
ne sont plus actifs. La commande a donc été exécutée directement par Codex dans
une fixture séparée ; aucune nouvelle mission ou inférence n’a été lancée.

La recette force un déplacement du bouton entre observation et contrôle. Le
premier clic est refusé avant émission ; la cible est observée à nouveau et
le vrai clic doit ouvrir Connexions. Six tests unitaires couvrent cette reprise,
le défilement, les résultats indéterminés, la limite de reprise, les labels
absents/ambigus et l’annulation. Aucun résultat indéterminé n’est rejoué.

Deux essais réellement exécutés ont échoué avant la correction de navigation :

- `gui_recipe_6e63ba601355` : suite backend réussie, recette GUI refusée puis
  arrêt Electron non confirmé dans les cinq secondes. Aucun succès global déclaré.
- `gui_recipe_72201c2cae0c` : fermeture confirmée après correction de la fixture,
  mais deux rejets avant clic et zéro clic réel. Les traces montrent Connexions
  à `y=781`, puis `y=789`, toujours hors viewport après `scroll_to`.

Après ajout de `overflow-y: auto` à la barre latérale, la même recette réussit :

- `$env:PYTHONDONTWRITEBYTECODE = '1'` puis
  `python -B tests/channels_recipe_acceptance.py` : code 0.
- Vérification indépendante : fichiers, `node --check web/channels.js`,
  suite backend et cinq étapes GUI réussis. Suite : 128 tests en 31,315 s,
  `OK (skipped=1)`, aucun traceback dans cette sortie.
- Electron : exactement un rejet avant clic, un clic réel, déplacement forcé
  observé et arrêt du processus confirmé avec code 0. Fenêtres cachées, serveur
  loopback à port éphémère, profil et base fictive séparés.
- `node --check desktop/computer.cjs` et
  `node --check tests/channels_recipe_window.cjs` : code 0.

Preuves privées finales :
`.atelier/channel-consolidation-evidence/gui_recipe_e5b448fcfba5/result.json`,
`desktop-stats.json`, `desktop-trace.json` et
`data/duplica/reports/verification_fd5eb1b3c964.json`.
Le SHA-256 du rapport est vérifié :
`08a9fe6fcb3d59cb10b8fd68a8693d223e4c17a494e4163d69a000157dd3595b`.
La capture finale `screen_a088ba4abf26.png` montre Connexions accessible dans
la barre défilée et a été inspectée visuellement.

Cette preuve valide le code et la recette isolée ; elle ne modifie pas le statut
persisté de l’ancienne mission native et ne prétend pas que Duplica est actif.
L’inférence native des canaux, les serveurs LAYA/CLEF, leur qualité et la recette
humaine du produit restent hors de cette validation. Le suivi automatique de
l’ancienne session reste suspendu. Skills de la finalisation :
`engineering-workflow`, `clean-code-tests` et `coding-rules`.
