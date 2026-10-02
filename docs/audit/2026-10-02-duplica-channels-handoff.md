# Passage du travail à Duplica — canaux Atelier

Le 2 octobre 2026, Damien demande : « continue jsp laisse tourner duplica pour
le taff ». Cette demande autorise la poursuite locale du travail sur les canaux,
avec les permissions du projet. Les campagnes destinées à remplir l’interface
restent exclues.

## Mission lancée

Au premier lancement, Duplica intégré à Atelier supervisait une session Codex réelle avec GPT-6-Luna,
modèle découvert via `model/list`. La mission porte sur la consolidation des
canaux, de leurs adaptateurs et tests : isolation du contexte, barrière des
tours, arrêt, réponses tardives, erreurs sans divulgation et tâche en revue
idempotente. Les corrections doivent répondre à des écarts constatés, sans
modifier les travaux préexistants sans lien avec ces invariants.

Le catalogue précédent venait d’une autre installation Codex. Le service
inactif a été rechargé via `scripts/start-atelier.ps1`, qui utilise l’installation
de l’application et les racines TLS publiques Windows. Aucun credential n’a
été consulté. Le canal « Plan avant action » et les autres données sont conservés.

État observé au lancement, à distinguer de l’état courant :

- Session : `agent_67971a955df3`, statut `running`, processus vivant PID 14948.
- Requête : `request_e5f35e1b19cc`.
- Mission : `mission_23bae4a8776a`, démarrée, statut `supervising`.
- Duplica actif pour Atelier et cette session ; supervision globale désactivée.
- Profil Codex : `workspace-write`, `on-request`, modèle GPT-6-Luna.
- Aucun résultat de cette mission n’est déclaré réussi au seul lancement.

## Permissions et recette

Lecture/écriture projet, tests, syntaxe JS et continuation sont délégués.
Le contrôleur Duplica peut vérifier l’interface locale Atelier dans une fenêtre
de recette séparée. Le mode backend traite les demandes natives admissibles
sans naviguer dans la fenêtre principale de l’utilisateur. Les autorisations
sensibles, les commandes inconnues et la validation de plans restent explicites ;
la lecture de secrets et les opérations système destructrices restent interdites.

Après chaque fin technique, Duplica vérifiera indépendamment la présence des
fichiers et du rapport demandé, exécutera la suite backend, vérifiera la syntaxe
de `web/channels.js`, puis ouvrira les écrans du canal et des connexions locales.
Le budget est de trois relances de correction maximum, sans remplacement de
modèle. Le rapport attendu est
`docs/audit/2026-10-02-duplica-channels-consolidation.md`.

Les preuves de configuration et de lancement sont privées dans
`.atelier/channel-evidence/duplica-handoff.json`, les projections et les journaux
Duplica. Le statut courant se lit dans Atelier ou avec
`python -B .atelier/channel-evidence/duplica_handoff.py progress`.
Un redémarrage du service nécessite une reprise explicite ; aucun effet n’est
rejoué automatiquement.

Un suivi de cette conversation est actif toutes les quinze minutes :
`suivre-duplica-canaux-atelier`. Il observe cette seule mission, reste silencieux
pendant la progression normale et signale une fin vérifiée ou un blocage utile.
Il ne lance aucun autre agent et doit être désactivé après cette notification.

Le skill engineering-workflow a servi au cadrage de cette reprise. Elle utilise
les mécanismes de supervision existants ; aucun nouveau moteur n’a été ajouté.

## Correction explicite du modèle

Damien précise ensuite : « non gpt6.1 max sol pas luna ». Le tour GPT-6-Luna
a été interrompu, puis la même session et la même mission ont été configurées
avec **GPT-6.1-Sol, effort max**, valeurs présentes dans le catalogue découvert.
Le travail existant et la recette restent conservés.

État observé après reprise : session `agent_67971a955df3` en cours d’exécution,
processus vivant PID 24024, requête `request_cfdca8b159d4`, Duplica actif, aucune
erreur ni demande en attente. Le suivi de conversation et la mémoire validée
ont été actualisés avec ce choix, qui remplace le précédent pour les relances.

## Autorisation et validation ultérieures des tests

Damien indique : « je n'ai pas l'app et valide les test tests ». Cet accord porte
sur la recette Electron locale demandée hors sandbox, avec fenêtres cachées et
données fictives séparées. La politique `unknown = ask` n’est pas élargie.

Lors de cette reprise, le service sur 4317 et le processus natif de cette session
sont arrêtés ; leur ancien statut persisté ne prouve pas une exécution. Le test
a été réalisé directement, sans recréer de mission ou relancer d’inférence.
La validation finale réussit après correction du défilement de navigation :
128 tests backend (127 réussis, 1 ignoré), syntaxe JS et parcours Electron,
un rejet de contrôle déplacé puis un seul clic réel. Les échecs intermédiaires,
la fermeture de fixture et les artefacts sont documentés dans le
[rapport de consolidation](2026-10-02-duplica-channels-consolidation.md).
L’ancienne mission native n’a pas été artificiellement marquée terminée ;
son suivi reste suspendu et la préférence GPT-6.1-Sol / max est conservée.
