# Corrections des retours Atelier — 3 octobre 2026

Demande de Damien : [neuf points et dix captures durables](../references/2026-10-03-feedback.md).
Développement réparti entre trois sous-agents : canaux, desktop et création des
skills ; intégration, navigation et validation globale par l’agent principal.
Les modifications préexistantes du checkout ont été conservées.

## Changements

| Point | Résultat dans les sources |
|---|---|
| Zoom | Contrôles compacts − / pourcentage / + du chat, 25–200 %, indépendants du zoom global. Le facteur desktop multiplie les deux ; l’échelle est réappliquée en sélection d’onglet. |
| Permissions | Les options natives Codex restent --sandbox read-only/workspace-write et --ask-for-approval on-request ; le formulaire explicite leur transmission. Claude/OpenCode restent en plan, OMP en outils de lecture. |
| Images | Sélecteur natif et collage d’image dans le formulaire Codex ; chemins validés PNG/JPEG/WebP, 12 fichiers, 8 Mo/fichier et 32 Mo cumulés. Arguments --image séparés et chemins cités par le préparateur shell. |
| Terminal existant | Menu Nouveau terminal avec images : conserve projet/modèle/effort/permissions et ouvre une nouvelle session ; le terminal existant reste intact. Les images s’attachent au prompt initial, pas par injection arbitraire dans un TUI actif. |
| Chats | Noms numérotés Chat 1, Chat 2, etc., renommage explicite dans les onglets. Le titre reçu du site reste distinct et n’écrase plus ce nom. |
| Navigation | Les libellés du panneau sont restaurés à toute largeur ; infobulles visibles immédiatement au survol/focus de la maison, dossier, outils, connexions et bouton d’épinglage. Escape les masque ; le navigateur natif est masqué si nécessaire. |
| Participants | Le backend acceptait déjà huit participants. Une recette par vrais clics vérifie huit invitations, sauvegarde des modèles/efforts et rechargement. |
| Canaux | Envoyer et lancer enregistre puis démarre explicitement la discussion si des participants sont configurés. Sans participant, message explicite pour inviter. Un message envoyé pendant une discussion reste signalé pour le prochain lancement. |
| Observabilité | État individuel connexion/réponse/terminé/erreur, session Codex ou appel API reçu, horodatage, erreurs de transport et contributions publiques cliquables. Aucun raisonnement privé inventé ni transmis. |
| Tokens et arrêt | Sommes des requêtes observées plutôt que des seules réponses publiées ; consommation reçue sur erreur/arrêt conservée, données partielles annotées. Arrêt visible et absence de publication tardive vérifiée. |
| Skills | Quatre procédures réutilisables de test applicatif, sources GitHub/Electron primaires, rapports de reproduction et retest ; [rapport dédié](2026-10-03-testing-skills.md). |

Un caractère `}` isolé préexistant dans web/terminal.js empêchait son chargement
syntaxique : corrigé pendant l’intégration. L’asset local vendor/qrcode.js absent
a été restauré depuis la même application Atelier déjà installée. Ce fichier
généré reste ignoré par Git et produit normalement par npm run vendor.
En mode de recette uniquement, le service de mise à jour est un EventEmitter
fictif ; les erreurs de démarrage sont imprimées au lieu d’ouvrir une boîte
native bloquante. Le mode normal conserve electron-updater.

## Vérifications et preuves

- Backend : PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v,
  avec Python 3.12 du runtime dans le PATH : **175 exécutés, 173 réussis,
  2 ignorés**. Journal privé .atelier/feedback-backend-tests.log.
- Tests ciblés canaux/adaptateurs : 32 réussis ; images CLI : 4 réussis.
  Ces cas font partie de la suite complète, ils ne s’ajoutent pas à son total.
- Sept suites tests/test_*.cjs réussies (cockpit, espaces agents, ressources
  Duplica, panneaux flottants, consommation, mises à jour, panneaux workspace).
- Syntaxe node --check des 65 fichiers JS/CJS alors présents : réussie.
  Les fichiers retouchés après ce passage sont revérifiés individuellement.
- tests/navigation_feedback_acceptance.cjs : vrais survols/clavier, labels et
  projets visibles, 1500/900/390/300, pas de débordement ni erreur JS.
  Preuves .atelier/navigation-feedback-evidence/{result.json,tools-*.png}.
- tests/chat_terminal_feedback_desktop_acceptance.cjs : zoom du WebContentsView
  jusqu’à 25 %, raccourci indépendant, facteurs combinés, Chat 1/2, renommage
  préservé malgré titre web, picker/collage et settings images du PTY fictif.
  Preuves .atelier/chat-terminal-feedback-evidence/{result.json,named-chat-zoom.png,codex-image-attachments.png}.
- tests/channels_feedback_acceptance.cjs : huit invitations, persistance,
  lancement, activité individuelle, 135 tokens **fictifs**, interruption sans
  réponse tardive, quatre largeurs. Preuves .atelier/channel-feedback-evidence/{result.json,eight-participants.png}.
- Captures de navigation, chats et pièces jointes inspectées visuellement.
  La recette canaux est rendue par Electron dans une fenêtre web de test ;
  les recettes navigation/chat utilisent le vrai shell desktop en mode fictif.

Le premier passage backend échouait sur l’ouverture de sockets interdite par
le sandbox de développement. Il a été rejoué hors sandbox avec serveurs locaux
fictifs. Une erreur d’asset QR manquant a ensuite été corrigée avant le passage
vert. Les premières recettes navigation ont aussi identifié une attente de
focus sans transition entre deux itérations ; le parcours utilise désormais
deux vrais Tab depuis Accueil. Aucun résultat déduit d’un test non exécuté.

## Sources et limites

Les [options CLI officielles](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
confirment --image et --sandbox ; le --help du CLI installé les confirme aussi.
La [documentation app-server](https://learn.chatgpt.com/docs/app-server) décrit
model/list et les événements de cycle de vie. Les modèles/efforts restent
découverts, pas codés statiquement. Leur présence au catalogue ne garantit pas
une inférence réussie pour le compte.

Pas d’inférence réelle ni de login/upload ChatGPT pendant cette livraison.
L’enforcement du sandbox OS n’est pas prouvé par les seuls arguments CLI ;
la tentative locale sans inférence exige un profil natif supplémentaire. Les
protections restent actives, sans ajout de contournement. Les champs d’activité
montrent des faits de transport et réponses publiques ; les pensées privées
ne sont pas accessibles. Les nouveaux skills ne créent pas un accès PC absent.

Les noms des onglets et leur zoom restent dans la session desktop courante ;
le compteur de numérotation est conservé localement. Pas de restauration des
onglets fermés ni de synchronisation de leurs noms avec le titre du site.
Les profils et données .atelier/ sont préservés. Les fixtures créées pour les
recettes sont arrêtées après vérification ; aucun processus utilisateur arrêté.
Les corrections sont dans le checkout source. L’application installée sous
/Applications et les installateurs publiés n’ont pas été remplacés/republiés.
