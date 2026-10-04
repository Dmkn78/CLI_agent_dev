# Consommation Codex automatique — 3 octobre 2026

## Demande

Damien demande une lecture automatique de la consommation de son abonnement
Codex dans Atelier, sans devoir cliquer sur Actualiser. Après avoir évoqué
cinq ou dix minutes, il privilégie dix minutes et demande des subagents pour
accélérer la mise en place.

## Changements

- Un poller côté service local lit `account/rateLimits/read` toutes les
  600 secondes après la fin de la dernière tentative. La première lecture
  accompagne la découverte Codex. La lecture manuelle reste possible et
  repousse la prochaine échéance.
- La boucle ne dépend pas de la vue Consommation ni d'une fenêtre précise.
  Les demandes simultanées partagent le même appel en cours. Le mode
  `--no-discovery` reste sans collecte automatique tant qu'aucune découverte
  ou lecture explicite n'est demandée.
- Les erreurs conservent les dernières valeurs et la date de la dernière
  mesure réussie. La boucle réessaie à l'échéance suivante ; une connexion
  native la réveille et un client Codex arrêté peut être recréé.
- Le panneau partagé Consommation/Connexions indique la cadence, la date
  de dernière mesure et les erreurs même si une ancienne mesure est disponible.
- Le poller est arrêté avec le service. Aucun tour de modèle, campagne,
  changement de permissions ni import de credentials n'est ajouté.

Fichiers : `server/account_limits.py`, intégration dans `server/app.py`, rendu
dans `web/workbench.js`. Trois subagents ont travaillé sur le backend, l'UI
et la review indépendante ; l'agent principal a intégré la mémoire et lancé
les vérifications globales.

## Vérifications

- Suite backend complète : `PYTHONDONTWRITEBYTECODE=1 /opt/homebrew/bin/python3.12 -m unittest discover -s tests -v` : **423 tests, 421 réussis, 2 ignorés**, en 78,5 secondes. Journal : `.atelier/codex-quota-refresh-evidence/backend-local-network.log`.
  La première exécution sous le sandbox échouait sur la liaison des serveurs
  HTTP fictifs à `127.0.0.1` ; la relance autorisée pour ces serveurs locaux
  réussit. Les dernières gardes contre les réponses périmées ont ensuite été
  vérifiées par les douze tests dédiés et les seize tests Workbench ci-dessous.
  Le Python système 3.9 est trop ancien pour le projet ; Python 3.12 est utilisé.
- Douze nouveaux tests backend réussis, avec horloge simulée pour vérifier
  exactement 600 secondes sans attendre dix minutes. Ils couvrent cadence,
  concurrence manuel/automatique, tentative manuelle qui remplace une échéance,
  échec et reprise, découverte/reconnexion, notifications natives, réponses
  périmées après déconnexion, push natif pendant un RPC et arrêt pendant une
  lecture. Journal : `.atelier/codex-quota-refresh-evidence/account-limits.log`.
- Seize tests Workbench existants réussis sur l'intégration finale. Journal :
  `.atelier/codex-quota-refresh-evidence/workbench.log`.
- `node --check` réussi pour `web/workbench.js` et la nouvelle recette CJS ;
  suites `tests/test_cockpit.cjs` et `tests/test_session_usage.cjs` réussies.
  `git diff --check` réussi.
- Recette Electron réussie sur le service et son véritable scheduler avec
  fournisseur fictif strict. La cadence est accélérée à deux secondes dans
  cette fixture ; l'UI reçoit le contrat de production à 600 secondes.
  Les valeurs passent automatiquement de 25 à 42 %, une erreur garde 42 % et
  la même date, puis la reprise affiche 61 % pendant la navigation sur une
  autre vue. Les erreurs sont échappées. Aucun POST manuel de quotas n'est
  envoyé avant le clic de test ; le bouton Actualiser fonctionne toujours.
  Vues Connexions/Consommation, largeurs 1400/900/390/300 px, aucune erreur JS
  ni débordement global. Captures inspectées visuellement et résultat dans
  `.atelier/browser-evidence/quota-refresh/browser-result.json`.

Les tests utilisent des fournisseurs fictifs ; aucune inférence réelle ni
lecture du quota d'un compte réel n'a été nécessaire pour cette recette.

## Activation et limites

Le correctif est livré dans les sources du projet. Le contrôle des processus
en lecture seule confirme l'Atelier installé sous `/Applications/Atelier.app`,
son service embarqué et cinq terminaux Codex enfants de cette application.
Cette instance ne recharge pas le backend à chaud. Elle a été conservée afin
de ne pas fermer ces terminaux pendant la validation.

Après fermeture de cette instance, `Lancer Atelier.command` dans le projet
démarre les sources actuelles et active ce correctif. Aucun bundle installé,
paquet publié ou correctif antérieur en attente n'est remplacé par cette
intervention. Une réouverture de l'application installée seule garde son
ancien runtime.

Les données affichées restent les limites communiquées par Codex, pour le
compte entier ; ce ne sont ni des tokens de session ni une facture. Une
indisponibilité de Codex reste visible. La collecte s'arrête avec le service
local et ne peut pas interroger le compte quand Atelier est fermé.
