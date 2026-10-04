# Agents : vrais terminaux CLI

Demande : remplacer le parcours de conversation structurée par un lancement
interactif de Codex, Claude Code, OpenCode ou OMP dans le dossier du projet.

## Résultat

Agents affiche les terminaux par défaut ; Nouvel agent ouvre le lanceur natif.
Les boutons des quatre CLI présélectionnent le moteur. Aucun prompt automatique.
Le desktop utilise les PTY existants et la grille, avec fermeture, déplacement,
redimensionnement et agrandissement. Depuis le navigateur, le choix ouvre le
terminal système ; le desktop reste accessible pour la grille intégrée.
Les anciennes sessions sont accessibles explicitement via Sessions outillées.

OpenCode démarre avec `--agent plan` selon la [documentation officielle](https://opencode.ai/docs/cli/).
Claude Code démarre en mode plan ; ces modes restent soumis aux permissions
natives et ne constituent pas une isolation OS. Codex conserve `on-request`,
lecture seule ou écriture projet explicite. Aucun catalogue de modèle statique,
secret ou compte copié. Aucun logiciel supplémentaire installé.

Les arguments PowerShell échappent désormais aussi les apostrophes typographiques.
Un test exécuté sous Windows vérifie la conservation exacte de l’argument et
l’absence d’exécution d’un fragment `$()` ou `;`. La taille réelle de xterm est
renvoyée au PTY après sa création, pour éviter de perdre le premier resize.
Les nouveaux panneaux occupent la colonne la moins remplie après une fermeture.
Electron peut renouveler son jeton local après redémarrage serveur : seul un
refus HTTP 403 avant exécution déclenche une unique nouvelle tentative.

## Preuves et limites

- Backend : `PYTHONDONTWRITEBYTECODE=1 python -B -m unittest discover -s tests -v`,
  57 tests, 56 réussis et 1 symlink ignoré sur Windows.
- Syntaxe des fichiers JS/CJS et tests de calcul cockpit réussis ; `git diff --check`
  sans erreur.
- Recette navigateur Chrome avec fournisseur fictif : parcours des quatre CLI,
  modèle natif OpenCode, sessions, équipes, chat, contextes et viewports validés.
- Recette Electron : sept processus CMD fictifs, clavier/echo/fin, tailles,
  drag entre colonnes, zoom, onglets, mobile et fermeture vérifiés.
- Activation locale : l’ancienne instance 4317 servait encore le précédent code.
  Remplacée après lecture du statut : aucune mission en cours. Données conservées.
  Un doublon lancé pendant le diagnostic a été arrêté.
- Lancement réel : Codex et OMP ouverts dans deux PTY, interfaces natives observées,
  côte à côte, sans mission ni inférence. PID de coque observés : 28680 et 4628.
  Captures et métadonnées privées : `.atelier/browser-evidence/terminals-real-start.*`.
  Le premier démarrage Codex a échoué par allocation mémoire pendant les contrôles
  concurrents ; le démarrage suivant est actif. Une erreur initiale de quoting
  PowerShell a été reproduite puis corrigée avant ce lancement réussi.
- La dernière recette à sept PowerShell a rencontré une saturation mémoire/CLR
  avec les deux CLI réels ouverts. Le fournisseur fictif desktop utilise désormais
  CMD sous Windows (sh ailleurs), avec le même protocole clavier/echo/fin ; les
  lancements réels continuent à utiliser PowerShell.
- Claude Code absent du PATH constaté ; lancement réel d’OpenCode non vérifié.
  La disponibilité du choix dans le lanceur ne prouve pas une connexion fournisseur.
- Les PTY ne sont pas des sessions app-server suivies : consommation et rapports
  structurés ne sont pas inventés à partir de leur texte.

Skills utilisés : engineering-workflow pour le routage, clean-code-workflow
pour la reprise du parcours complet, coding-rules pour les conventions locales.
