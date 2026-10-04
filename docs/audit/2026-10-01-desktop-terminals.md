# Livraison Desktop Et Terminaux

## Perimetre

Sept retours utilisateur, neuf captures archivees avec hashes. Skills appliques :
engineering-workflow, clean-code-workflow, coding-rules et openai-docs pour les
frontieres d'authentification. Aucun sous-agent ou modele reel lance pour la recette.

## Changements

- Vue Code distincte des sessions outillees : node-pty 1.1.0, xterm 6.0.0 et
  addon-fit 0.11.0, assets locaux generes par vendor.cjs.
- IPC reserve au renderer local. Plan terminal genere par le backend : arguments
  litteraux, repertoire projet valide, modele/effort du catalogue, on-request
  Codex, aucun prompt automatique. Claude Code demarre en plan ; OMP conserve
  ses outils de lecture et demandes d'accord. Max huit terminaux par fenetre.
- Clavier, resize, sortie ANSI, fin native, PID, selection et fermeture d'onglet.
  Fermer termine le processus. Quitter Atelier desktop termine ses PTY ; les
  sessions structurees du backend et leurs artefacts restent distincts.
- ChatGPT dans WebContentsView : navigation, ressources redimensionnables et
  repliables, focus, fermeture. Sandbox, contextIsolation, pas de Node/preload
  pour le site distant. Profil prive persistant, connexion humaine une fois.
- Ouverture explicite d'Atelier desktop depuis le web, instance unique, aucun
  popup externe comme substitution au chat integre.
- Navigation globale repliable ; recherche arrondie avec resultat utile et
  raccourci de l'OS ; selecteur de dossier natif ; apercus notifications/cout au
  survol ; diagnostic de CLI externes relegue aux connexions ; gris anthracite.
- Authentifications Codex / OMP / web distinguees. Correction d'un logout
  errone lors d'un evenement partiel account/updated. Quotas rendus par la meme
  fonction dans Connexions et Consommation.

## Preuves

- Backend : 55 tests, 54 verts, 1 symlink Windows saute faute de privilege.
- Syntaxe de JS/CJS et tests cockpit : verts.
- Audit npm des dependances de production : aucune vulnerabilite signalee.
- Recette Chrome : sous-agents, contexte, tokens fictifs, TODO, catalogue,
  terminal de configuration, projets et dix vues a quatre tailles : verte.
- Recette workbench : canvas/pointer, pages/revisions, fermeture, quotas,
  recherche memoire/tache, notifications et ressources a quatre tailles : verte.
- Recette Electron : site about:blank isole, bounds, masque au survol,
  navigation/repli/focus/fermeture ; processus PowerShell concret avec
  ATELIER_PTY_READY, saisie terminal-test, ECHO:terminal-test et exit : verte.
  Commande fixe de fixture, ni Codex ni Claude ni requete de modele.
- Preuves locales privees : .atelier/browser-evidence/. Ne pas publier les
  profils desktop, cookies, journaux ou donnees de l'utilisateur.

## Limites

Login ChatGPT, fournisseur OAuth et transfert volontaire de fichiers doivent
etre verifies humainement. Aucune session web n'est deduite de l'auth Codex.
Les fenetres d'authentification demandees par le site peuvent rester des popups
natifs ; la conversation principale est integree. Chromium, pas Firefox.
Le terminal brut n'importe pas ses tokens, durees de tour, backlog ou rapports ;
ces fonctions restent celles des sessions structurees. Les connexions MCP
natives propres aux CLI restent applicables. Pas de bypass ajoute, mais un
terminal interactif expose le controle natif a l'utilisateur et ne constitue
pas un sandbox OS pour Claude/OMP.

## Activation

Precision suivante livree : grille de terminaux natifs, une a trois colonnes,
drag des titres entre colonnes, separateurs a la souris/clavier, agrandissement,
restauration, fermeture et onglets alternatifs. Deux references supplementaires
archivees. Sept processus fictifs verifies simultanement, sans chevauchement,
avec drag et resize reels ; aucune inference. Details : terminal-grid-feedback.

Le service 4317 n'a pas encore ete redemarre : le controle de securite a refuse
l'arret force tant que l'utilisateur n'autorise pas l'interruption de sa session
connectee Nouvelle conversation. Demande de confirmation envoyee. Les tests
utilisent exclusivement un service fictif distinct ; la livraison sur le disque
n'est pas une preuve d'activation des nouveaux endpoints du service existant.

## Sources Primaires

- [node-pty](https://github.com/microsoft/node-pty) : ConPTY et integration.
- [Electron WebContents](https://www.electronjs.org/docs/latest/api/web-contents) : historique natif.
- [Electron dialog](https://www.electronjs.org/docs/latest/api/dialog) : selection de dossier.
- [Claude CLI](https://code.claude.com/docs/en/cli-reference) : demarrage interactif et permission-mode plan.
