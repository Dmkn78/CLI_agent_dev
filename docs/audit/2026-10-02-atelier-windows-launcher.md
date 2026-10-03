# Atelier accessible sous Windows — 2 octobre 2026

Damien cherchait Atelier dans le menu Démarrer et ne trouvait que des ZIP.
Le desktop et le service existaient dans le projet, mais aucun raccourci Windows
n'avait été enregistré et le service était arrêté. La capture de départ est
conservée dans `docs/references/screenshots/2026-10-02-atelier-startmenu-missing.png`.

## Correction

- `scripts/open-atelier.ps1` démarre le service en arrière-plan si le port
  est libre, vérifie le nonce local et le dossier retourné par `/api/state`,
  puis demande l'ouverture du desktop. Un verrou borne les lancements
  simultanés ; un autre service ou projet sur le port est refusé.
- `scripts/install-atelier-shortcuts.ps1` crée deux liens **Atelier** pour
  l'utilisateur, dans le menu Démarrer et sur son bureau. Une entrée portant
  ce nom et appartenant à une autre application est conservée par refus.
  Le raccourci emploie l'interpréteur PowerShell courant, sans modifier la
  politique d'exécution.
- `scripts/start-atelier.ps1` charge explicitement le fournisseur de
  certificats du PowerShell courant si le lecteur Cert manque. Les racines
  exportées restent publiques et les variables CA explicites prioritaires.

Raccourcis réellement créés :

- `C:\Users\cytech\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Atelier.lnk`
- `H:\CYTECHDATA\Desktop\Atelier.lnk`

## Vérifications et preuves

Les trois scripts passent le parseur PowerShell sans erreur. Les liens relus
pointent vers `scripts/open-atelier.ps1`, avec le dossier de travail du projet
et une fenêtre PowerShell masquée. Le menu Démarrer ouvre réellement le desktop,
puis une seconde ouverture depuis le bureau conserve le même serveur
`127.0.0.1:4317` (PID 11928 observé) et une seule fenêtre Electron (identifiant
722466 observé), intitulée **Atelier · Agents & projets**.

La fenêtre a été sélectionnée et affichée avec le skill Computer Use. Deux clics
observés ouvrent **Canaux d’agents** ; la dernière capture de la conversation
montre **Plan avant action**, zéro participant, **Serveur local connecté** et
**Aucune session active**. `/api/state` confirme le dossier attendu, zéro session
active, Duplica en pause et le canal **Plan avant action**. Aucun prompt ou tour
de modèle n'est envoyé pour cette recette.

Les premiers essais ne sont pas considérés réussis : le serveur exécuté dans le
contexte restreint n'affichait pas de fenêtre, puis Windows PowerShell hérité
échouait sur le fournisseur Cert et des définitions de types incompatibles.
Ces erreurs restent dans `.atelier/launcher.log`. La correction choisit le
PowerShell courant et charge son fournisseur ; la recette finale utilise la
session Windows normale et les deux liens effectivement installés.

Skills utilisés : engineering-workflow pour la correction locale, coding-rules
pour les scripts, computer-use pour vérifier et afficher la vraie fenêtre.
Le backend Python et l'interface ne changent pas dans ce correctif. Les résultats
précédents des 128 tests et de la recette Electron restent dans le rapport de
consolidation ; ils ne sont pas présentés comme de nouveaux tests ici.

## Limites

Le projet, Python, PowerShell et les dépendances Node doivent rester à leurs
emplacements. Cette livraison ajoute des raccourcis au desktop existant ; elle
ne produit pas un installateur ou un exécutable autonome. L'indexation de la
recherche Démarrer peut être différée ; le lien du bureau et
`http://127.0.0.1:4317/#channels` donnent un accès direct. Les PID et identifiants
de fenêtre sont des preuves ponctuelles. Le lancement ne reprend aucune
mission arrêtée et aucun suivi périodique n'est réactivé.
