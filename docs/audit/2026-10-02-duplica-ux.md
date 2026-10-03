# Duplica — discussion, Telegram et simplification

Damien demande de discuter avec Duplica dans Atelier et via Telegram, de choisir
le projet et de lui confier du travail. Il demande aussi une interface plus
simple, des panneaux arrondis, les tokens et l'abonnement par session. Son
dernier retour ajoute les sprints et les erreurs « Session locale requise ».
La TODO réelle `task_18c4e845ba7b` suit ces deux corrections.
Elle est passée **En revue** après les vérifications, pour validation humaine.

Skills appliqués : engineering-workflow, clean-code-workflow, coding-rules et
code-quality. Les références jointes ont été traitées comme des données de
conception. Aucun commit, push, bot réel ou campagne n'a été lancé.

## Comportement livré

- Duplica arrive sur **Discussion** : sélection du projet, historique durable,
  formulaire central et un bouton **Travailler pour moi**. **Suivi** conserve
  le manager et ses preuves ; permissions, pause, arrêt et reprise du contrôle
  sont accessibles dans le menu ⋯. Palette charbon chaud, accent terracotta,
  boutons compacts et rayons de 12 à 20 px.
- Une conversation Codex en lecture seule par projet, séparée des agents de
  travail. Le contexte et l'état observé accompagnent le message sans devenir
  des permissions. Les livraisons sont persistantes et ne sont pas rejouées
  au redémarrage. Une session en erreur propose une reprise explicite.
- **Travailler pour moi** choisit un agent du projet ou en crée un avec modèle
  découvert et permissions explicites. Il active uniquement le projet choisi.
  Sans recette complète, la mission demande des preuves ; aucune validation
  n'est déduite de la réponse de l'agent.
- Telegram : création guidée via BotFather, champ local masqué, code de cinq
  minutes et association à un seul expéditeur privé. Le token est chiffré avec
  DPAPI pour le compte Windows du service, exclu des états publics et des
  environnements des agents, terminaux et recettes. La configuration par
  environnement est également conservée.
- `/project` sélectionne la discussion ; les messages libres et `/chat`
  partagent son historique et renvoient la réponse sur Telegram. `/instruct`
  reste une instruction explicite à l'agent supervisé choisi avec `/current`.
  Les décisions, demandes de permissions, captures et commandes existantes
  gardent leur politique. L'offset Telegram demeure persistant.
- Les sessions outillées, la discussion et les PTY affichent tokens
  entrée/réponse/cache/total, abonnement communiqué et quota du compte partagé.
  Le cache n'est pas ajouté au total. Les journaux CLI Codex apportent des
  compteurs natifs : association automatique seulement pour une correspondance
  unique dossier/heure de démarrage, association manuelle en cas d'ambiguïté.
  Les conversations et credentials des journaux ne sont pas importés.
- **Voir les tâches** ouvre le tableau filtré par sprint ; une nouvelle tâche
  présélectionne ce sprint. Modifier une tâche sans sprint préserve ce choix.
  Le serveur valide les dates et le rattachement au même projet.
- Le frontend renouvelle le nonce HTTP local après le refus exact avant
  exécution, puis rejoue une fois la requête refusée. Les appels concurrents
  partagent le renouvellement. Aucun retry après un timeout ou résultat incertain.
  Les toasts identiques sont regroupés pour éviter l'empilement de la capture.

Le parcours de création du bot et la gestion du curseur suivent la
[documentation BotFather](https://core.telegram.org/bots/features#botfather) et
la [Bot API getUpdates](https://core.telegram.org/bots/api#getupdates).

## Une vraie partie développée par Duplica

Le bouton et les composants de supervision du produit ont réellement confié
le composant de consommation à **GPT-6-Luna**, découvert avec `model/list`,
sans modèle de remplacement. Le travail est limité à un dossier synthétique
temporaire. Duplica a exécuté indépendamment les contrôles JavaScript puis
ouvert la page de démonstration et constaté les libellés via le contrôleur
Electron, avec captures réelles et empreintes vérifiées sur les octets écrits.

Résultat : mission vérifiée, **1 vérification, 0 relance, 0 bug observé**. Ce
résultat ne remplace pas la démonstration précédente qui comportait des défauts
contrôlés, corrections et retests. Il prouve ici une contribution utile du
produit, pas une autonomie universelle.

Preuve privée : `.atelier/duplica-e2e/run_28586898aac2/acceptance.json`.
Source produite :
`C:\Users\cytech\AppData\Local\Temp\duplica-synthetic-33snebve\session_usage.js`.
SHA-256 source :
`8348344c3199993322c2c284c07fbd487243b2a994ce5a1121b223175049d056`.

Après revue, le fichier a été intégré dans `web/session_usage.js`, avec
correction du quota imbriqué `rateLimitsByLimitId`, validation des compteurs
entiers et couverture des valeurs absentes, zéro, cache et échappement HTML.
SHA-256 intégré :
`4cfe313db56041d5f4706f182dabe3992e64125d5933b961c4763f0244b7202a`.
La version intégrée inclut donc des corrections issues de la revue de code.

## Vérifications

| Vérification | Résultat observé |
|---|---|
| Backend `unittest discover -s tests -v` | 94 tests : 93 réussis, 1 symlink ignoré sur Windows |
| Syntaxe JavaScript/CJS | 27 fichiers valides ; nouveaux fichiers revérifiés après ajustements |
| Calculs consommation et composant | Réussite : inconnu/zéro, cache, quota partagé, échappement, CSV |
| Nouvelle recette UX | Deux conversations isolées par projet, persistance, travail limité au projet, nonce périmé + création unique, sprint/tâches, 1500/900/390/300 px |
| Recette navigateur existante | 10 vues et chat, quatre largeurs, configuration équipes, contexte, TODO, fournisseurs : réussite |
| Recette workbench | Drag réel, save/révision, fermetures, quotas, notifications, ressources, quatre largeurs : réussite |
| Recette manager Duplica | Mémoire, décisions, permissions, tâche supervisée et pause, quatre largeurs : réussite avec fixture neuve |
| Electron : PTY | Écho/clavier/sortie, sept panneaux, footers de consommation, drag/resize/zoom/onglets/mobile/fermeture : réussite |
| Electron : Duplica | Vrais clics/saisies, permission + réponse CSV, 2 corrections, 3 vérifications, 2 bugs résolus : réussite |
| Instance réelle après redémarrage | Discussion et sprints accessibles, catalogue disponible, aucune erreur JS ; contrôle en lecture seule, sans inférence |

Les preuves et captures sont privées : `.atelier/duplica-ux-evidence/`,
`.atelier/duplica-browser-evidence/`, `.atelier/browser-evidence/` et
`.atelier/duplica-test-evidence/ux-backend.log`.

Une première exécution concurrente a renvoyé
`ERR_INSUFFICIENT_RESOURCES`/`Failed to fetch` ; une sérialisation HTTP a aussi
renvoyé `MemoryError` pendant ces contrôles. Le workbench et le manager
ont ensuite réussi séparément avec fixture neuve. Les erreurs initiales ne
sont pas effacées des preuves. Les recettes attendent le rendu après
enregistrement et la réception asynchrone de l'IPC de resize. Le terminal ne
transmet plus de resize après son arrêt ; la recette vérifie le premier resize
avant de demander la sortie du processus. Les processus Electron fictifs
restants après échec ont été identifiés et fermés avant la nouvelle recette.
Les terminaux utilisateur sont restés ouverts.

Preuve finale Duplica fictive :
`.atelier/duplica-e2e/run_ce791ad656c5/acceptance.json`.
Preuve finale PTY : `.atelier/browser-evidence/desktop-result.json`.

Le backend local a été relancé avec cette version : discussion et compteurs
présents dans l'état réel, compte Codex connecté, Duplica désactivé au repos et
contrôleur desktop connecté. Le terminal utilisateur PID 6916 est resté vivant.
La fenêtre desktop déjà ouverte conserve ses anciens scripts ; la nouvelle
interface est immédiatement accessible dans le navigateur local et sera
chargée par le desktop à son prochain lancement. Elle n'a pas été rechargée
de force, car ses terminaux ne disposent pas de reprise du renderer.

## Limites

Damien n'a pas encore de bot : chiffrement réel DPAPI et transport fictif
vérifiés, mais aucun échange réel avec Telegram. La création du bot et la
configuration locale restent nécessaires. Le chiffrement n'empêche pas un
processus malveillant exécuté sous le même compte Windows d'utiliser DPAPI.

Les compteurs CLI sont vérifiés sur journaux synthétiques et schémas natifs
observés ; le rattachement à un CLI utilisateur actif n'est pas encore une
recette réelle. La découverte lit au maximum 100 journaux du jour et 100 de la
veille, avec une fin de fichier bornée à 1 Mo. Les anciens journaux et ceux
hors de cette fenêtre ne sont pas découverts automatiquement. Une session
reprise garde son total historique. Claude Code, OpenCode et OMP n'ont pas
d'import de consommation native dans ce parcours. Une mesure manquante reste
inconnue ; aucun coût d'abonnement par session n'est inventé.

Le contrôleur couvre Atelier et les pages locales de recette. Excel, les
applications Windows externes et l'interprétation des questions dans les TUI
natifs restent ouverts, comme dans le rapport précédent. La réussite des
tests ne constitue pas une validation humaine du produit.
