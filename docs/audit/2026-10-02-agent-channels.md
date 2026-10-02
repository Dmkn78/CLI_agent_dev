# Livraison — canaux d’agents et API locales

Date : 2 octobre 2026. Demande :
[canaux et modèles de décisions](../references/2026-10-02-agent-channels.md).

## Parcours disponible

Dans **Canaux d’agents**, créer un canal de projet avec un sujet et 1 à 6 tours.
Inviter jusqu’à 8 participants avec les rôles Agent, Consultant, Orchestrateur
ou Duplica. Chaque participant choisit son fournisseur et son modèle, ou copie
uniquement la configuration d’une session existante du même projet. Cette
session poursuit sa mission et ne donne au canal ni ses messages ni sa mémoire.

Le lancement produit des propositions indépendantes, puis des discussions et une
synthèse publique. Le bouton Arrêter invalide le run et toute réponse tardive.
Une API HTTP peut encore terminer son appel côté serveur ; le canal affiche
Arrêt en cours et reste verrouillé jusqu’à la fin de ce callback. Aucun tour
ne reprend automatiquement après redémarrage.

Le plan est marqué **à relire**. Préparer une tâche crée une seule tâche
**En revue** par plan, avec provenance, jamais un travail lancé automatiquement.
Discuter du plan avec Duplica remplit un brouillon du chat individuel ; l’utilisateur
choisit son envoi. Les questions et désaccords restants font partie du plan.

Dans **Connexions → API locales & distantes**, configurer un nom, une URL de
base, un protocole, les modèles et le délai de réponse. Chat Completions utilise
`/v1/chat/completions` et peut lire `/v1/models` sans inférence. SystemOne utilise
`/v1/systemone`, avec modèles déclarés par le serveur. Une connexion enregistrée
n’est pas présentée comme testée. Une clé facultative est désignée par une
variable `ATELIER_…API_KEY` du service ; sa valeur n’est ni enregistrée dans SQLite
ni transmise aux processus enfants.

## Implémentation

- `server/channels.py` : projection locale atomique par canal, participants,
  messages publics séquencés, tours parallèles avec barrière, annulation,
  contrôle de reprise, synthèse, tâche en revue et limites d’historique.
- `server/channel_runtime.py` : nouveau contexte de discussion par réponse
  native. Codex conserve `on-request` et `read-only`, avec shell, plugins,
  connecteurs et recherche désactivés dans la configuration de discussion,
  aucune mémoire ou skill, répertoire de contexte séparé, thread éphémère.
  Les demandes d’outils sont refusées par Atelier. OMP expose zéro outil hôte
  dans ce mode et refuse toute tentative de lecture/écriture.
- `server/api_connections.py` : adaptateurs HTTP bornés, redirections refusées,
  erreurs sans contenu distant sensible, extraction du seul contenu public,
  retrait des balises de raisonnement de runtimes locaux. Le consultant
  SystemOne retourne un avis lisible sur prochaine étape, risque et information
  manquante ; cet avis n’exécute aucun changement et ne produit pas le plan.
- `run.py`, `server/app.py` : routes HTTP locales protégées par nonce, composition
  et état public. Les appels API enregistrent seulement les tokens effectivement
  reçus et leur durée observée ; les mesures absentes restent inconnues.
- `web/channels.js`, `web/channels.css`, `web/api_connections.js` : navigation,
  canal, invitations, transcript, statuts, plan, tâche en revue et connexions.
  Les consommateurs API sont attribués au participant dans Consommation.

La contribution du sous-agent `duplica_channels` de cette conversation couvre
le moteur du canal et ses tests. Cette délégation réelle est distincte du
superviseur Duplica intégré à Atelier ; elle ne prouve pas une exécution de
Duplica via un fournisseur configuré dans l’application.

## Vérifications exécutées

| Contrôle | Résultat |
|---|---|
| Suite backend, `PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -v` | 121 tests : 120 réussis, 1 symlink ignoré sous Windows |
| Tests spécifiques des canaux | 16 cas fictifs : isolation, barrière, arrêt, reprise, erreurs, bornes, SystemOne, tâche idempotente |
| Adaptateurs/API/runtime | 11 cas fictifs, dont HTTP réel vers serveurs de test locaux, nonce, erreurs, clés, pensée séparée, outils refusés et contexts natifs frais |
| Recette `channels_acceptance.cjs` | Réussite : 4 participants, 2 tours + plan, 10 messages publics, Codex/API/SystemOne fictifs, brouillon Duplica, tâche en revue unique, rechargement et 4 largeurs |
| Vérification visuelle | Captures inspectées à 1 500 et 390 pixels ; aucune largeur de document supérieure au viewport dans les 4 tailles testées |
| JavaScript | `node --check` sur les modules modifiés et la recette ; tests cockpit et compteurs de session réussis |
| Consommation du canal | Vérification navigateur : l’agent API et le consultant SystemOne apparaissent comme deux consommateurs distincts |
| Régression Duplica | `duplica_ux_acceptance.cjs` réussie sur fixture : discussion, scope projet, nonce périmé, sprints et quatre largeurs |
| Application locale rechargée | Écran et Connexions vérifiés sur 4317 ; canal réel « Plan avant action » conservé après rechargement, en brouillon, sans participant ni inférence |

Les premières tentatives de recette ont anticipé le rafraîchissement de l’état,
utilisé un sélecteur de label trop strict puis lu l’état avant son chargement
après rechargement. Les attentes ont été corrigées ; le parcours final complet
passe. Ces erreurs de recette ne sont pas présentées comme des tests réussis.

Preuves privées conservées : `.atelier/channel-evidence/backend-tests.txt`,
`browser-result.json`, captures `channels-*.png`, schémas Codex générés localement.
Les fixtures utilisent leur propre base `.atelier/channels-browser-fixture/`.
Aucune campagne réelle, installation de poids LAYA/CLEF ou clé native consultée.

Le serveur réel a été rechargé après vérification de son port, de son processus,
du workspace, de la base et de l’absence de sessions, workflows ou superviseur
actifs. Les données existantes sont conservées. Le canal « Plan avant action »
est prêt à recevoir les participants choisis par l’utilisateur ; aucun acteur
actif n’est créé pour remplir l’écran. Preuves supplémentaires :
`installed-result.json` et `channels-installed.png` dans le même dossier privé.
Deux lancements Chrome supplémentaires en sandbox ont été interrompus faute
de progression ; les vérifications ont ensuite réussi avec l’exécution du
navigateur autorisée par l’environnement.

## Limites explicites

Les adaptateurs livrés sont Codex app-server, OMP, Chat Completions et SystemOne.
Un autre protocole nécessite son adaptateur ou un pont compatible ; aucun accès
universel à tous les fournisseurs n’est déclaré. Les API distantes reçoivent les
messages publics quand l’utilisateur lance la discussion. Le canal reste local
et privé ; la publication d’un service externe n’est pas demandée.

LAYA/CLEF doivent déjà être servis par une API SystemOne configurée. Leur
chargement matériel, qualité de décision et calibration sur les tâches de Damien
ne sont pas vérifiés. L’avis typé porte sur un extrait de 1 800 caractères au
maximum. Le contexte natif du canal contient les 32 000 derniers caractères
publics ; la réserve privée et les journaux des sessions de travail restent séparés.
La configuration native et les garde-fous ont été vérifiés par fournisseurs
fictifs et schémas installés ; une recette d’inférence native réelle reste non faite.

Skills utilisés : engineering-workflow, clean-code-workflow, coding-rules et
openai-docs côté intégration ; clean-code-concurrency et code-quality ajoutés
par le sous-agent pour les verrous et annulations.
