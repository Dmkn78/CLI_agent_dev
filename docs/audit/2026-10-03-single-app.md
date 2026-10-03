# Une seule application Atelier — 3 octobre 2026

## Demande

Damien demande de modifier le code avec plusieurs sous-agents afin que tous
les lancements soient identifiés comme Atelier et réaffichent une seule
application, au lieu d’ouvrir Atelier et Electron côte à côte.

## Diagnostic observé

- Le bundle installé sous `/Applications/Atelier.app` est la bêta
  `0.3.0-beta.1`. Son service appartient à cette application.
- Le lancement depuis les sources utilisait directement le bundle générique
  `node_modules/electron/dist/Electron.app`. `app.setName` existait déjà,
  mais ne remplaçait pas l’identité macOS de ce bundle.
- Le verrou natif dépend du répertoire `userData` : les profils de
  développement et d’installation distincts autorisaient deux instances.
- L’Electron présent durant le diagnostic utilisait un profil isolé de recette
  chat/terminal et n’avait plus de parent. Ce seul processus fictif orphelin
  a été arrêté après vérification de son chemin et de son profil.
- L’Atelier installé conserve une session prête avec la file de travail
  activée. Cette application et son service sont préservés.

## Changements

`desktop/identity.cjs` centralise le nom Atelier, les identifiants produit,
l’icône, le menu macOS et la gestion des ouvertures. Le verrou est acquis
avec le répertoire commun `appData/Atelier`, compatible avec l’ancienne
application installée. Les chemins privés `userData` et `sessionData` sont
rétablis avant la création des sessions Chromium. Aucun cookie, credential
ou contenu de profil n’est copié ou fusionné.

Une deuxième ouverture conserve la fenêtre et son service, restaure une
fenêtre minimisée et transmet un mode explicitement demandé. Un lancement
sans mode conserve la vue en cours. Une demande pendant le démarrage est
mise en attente jusqu’au chargement de la fenêtre.

Les recettes gardent leurs verrous/profils isolés et masquent leur entrée
dans le Dock macOS. L’empaquetage embarque l’icône Atelier dédiée.

`npm run desktop`, `Lancer Atelier.command`, `Ouvrir Atelier corrigé.command`
et l’ouverture macOS depuis le service passent par
`scripts/launch-desktop.cjs`. Le moteur source est préparé sous
`.atelier/desktop-runtime/` avec un bundle nommé Atelier, le même identifiant
produit et son icône. Le binaire interne conserve le nom Electron pour que
le runtime reste en mode source ; ce nom interne n’est pas le nom affiché
dans macOS. Sans Node dans le PATH, le bootstrap utilise uniquement le mode
console du moteur ; ce mode est retiré avant lancement de la fenêtre Atelier.

Le service source est démarré après le verrou, avec un port libre et un
Python 3.12+ détecté. Il s’arrête avec son parent. Un service de navigateur
existant n’est réutilisé que si `/api/desktop/service`, protégé par nonce,
Host et Origin, prouve la même racine et le même stockage. Un service
emprunté n’est jamais arrêté par la fenêtre. Les tests utilisent un stockage
spécifique et `--no-discovery`.

## Vérifications finales

- Neuf tests JS d’identité, de lancement et de service réussis. Syntaxe JS/CJS
  et zsh des fichiers concernés vérifiée.
- Suite backend complète avec Python 3.12 : 209 tests exécutés, 207 réussis
  et 2 ignorés. Journal privé `.atelier/one-app-backend-tests.log`. Le Python
  système 3.9 échouait au chargement ; le lanceur vérifie désormais Python
  3.12 minimum.
- Recette native indépendante réussie avec des profils temporaires et un
  serveur HTTP fictif, sans fournisseur de modèle. Pour une première
  instance nouvelle et une ancienne instance installée simulée, trois
  lancements donnent `[true, false, false]` : une fenêtre, un service, modes
  Code/Projet transmis et profils privés distincts.
- Preuve privée : `.atelier/desktop-identity-evidence/result.json`.
- Signature du bundle source v2 : `codesign --verify --deep --strict`
  réussit. Un premier marqueur écrit après signature rendait le bundle
  invalide ; il est désormais inclus dans les ressources avant signature.
- Recette intégrée `tests/source_desktop_acceptance.cjs` réussie sur le vrai
  lanceur/main/service, avec données isolées, fournisseurs non interrogés,
  aucune session structurée, PTY fictif avec écho et sortie, aucune erreur JS
  et port fermé après fermeture de l’application. Preuve privée :
  `.atelier/source-desktop-evidence/run-1791050782184/result.json`, capture
  `source-main.png`, pointeur `latest.json`.
- Réouverture réelle avec `Lancer Atelier.command` réussie : même application
  installée (PID 1971), même service (port 49508), mêmes sessions, aucun
  nouveau processus Atelier/Electron persistant ni nouvelle session. Preuve
  privée `.atelier/one-app-live-reopen.json`. L’inventaire macOS confirme
  Atelier actif et Electron arrêté.

## Livraison et limites

Les corrections sont livrées dans les sources et le lanceur du projet.
L’application installée déjà ouverte a été conservée pour maintenir sa file
de travail ; son bundle n’est pas remplacé à chaud. Le lanceur réaffiche
cette instance. Après sa fermeture, le lanceur du projet chargera les sources
actuelles. Une future distribution empaquetée inclura ces corrections lors
de sa reconstruction ; aucun nouvel installateur n’est publié ici.

La recette native a été exécutée sur macOS arm64. Les branches d’identité
Windows/Linux sont contrôlées par les tests unitaires ; cette correction
ne prétend pas à une nouvelle recette native sur ces deux systèmes.

Trois sous-agents ont travaillé sur l’identité, les lanceurs et la revue
indépendante. Le rapport, le contrat de la demande et l’implémentation
consignent les preuves séparément des déclarations. Un collage involontaire
du contrôle Finder a été identifié par son contenu puis déplacé du bureau
vers les preuves privées ; aucune donnée utilisateur n’a été supprimée.

## Sources techniques

- [Verrou et activation Electron](https://www.electronjs.org/docs/latest/api/app#apprequestsingleinstancelockadditionaldata)
- [Capture de userData par ProcessSingleton, Electron 44.5.1](https://github.com/electron/electron/blob/v44.5.1/shell/browser/api/electron_api_app.cc)

Les recettes sont distinctes d’une inférence ou d’une validation humaine de
connexion ChatGPT. Aucune release GitHub n’est publiée par cette correction.
