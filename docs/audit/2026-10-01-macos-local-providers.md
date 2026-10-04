# Atelier sur le Mac — lancement et serveurs locaux

Date : 1 octobre 2026. Demande : lancer le repo pour la recette humaine et permettre la connexion à oMLX et Splash sur cet ordinateur.

## Résultat

- Serveur Atelier courant actif sur `http://127.0.0.1:4317` ; fenêtre Electron ouverte en Code et page Connexions affichée dans le navigateur Codex.
- Serveurs existants identifiés : oMLX sur 8000, Splash sur 8001. Catalogue sans authentification : HTTP 401 pour les deux. Aucun service modèle redémarré, aucun modèle téléchargé/chargé pour la recette.
- Boutons oMLX/Splash dans Agents/Code et Connexions. Codex lancé par les outils natifs ; modèle du serveur, hôte loopback, port modifiable, lecture seule par défaut, écriture projet explicite, on-request et délégation désactivée. Aucun prompt automatique.
- Authentification oMLX gérée par son lanceur. Splash peut demander sa clé dans le terminal avec saisie masquée, sans stockage Atelier ; environnement privé au processus. Aucun secret Codex inspecté ni copié, aucune configuration globale Codex écrite.
- Dépendances verrouillées installées ; Electron téléchargé depuis sa distribution officielle ; assets LogicFlow/xterm générés. npm ci n'avait pas exécuté le téléchargement Electron, effectué ensuite via son script officiel.

## Défauts trouvés et corrigés

1. Ancien serveur encore actif : remplacé après contrôle de ses sessions (clôturée/arrêtée, aucun workflow actif). Les données privées restent conservées.
2. Helper PTY macOS fourni sans droit d'exécution : correction dans scripts/vendor.cjs. Échec posix_spawnp reproduit avec echo simple, puis PTY validé après correction.
3. Recette desktop supposait le dossier browser-evidence déjà créé : elle le crée maintenant.

## Vérification

`PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v` : 61 tests, tous réussis. Quatre tests ajoutés pour localité, ports/profils interdits, transmission de la clé seulement via environnement et commandes sans mission avec permissions conservées.

Syntaxe de web/*.js, desktop/*.cjs et scripts/*.cjs contrôlée avec Node. tests/test_cockpit.cjs réussi. Recette tests/desktop_acceptance.cjs réussie avec fournisseur fictif : ports oMLX/Splash, permissions, browser isolé, echo/exit, resize, sept panneaux sans chevauchement, drag, zoom, onglets, mobile et fermeture. Preuves privées dans `.atelier/browser-evidence/desktop-result.json` et captures terminal-*-fixture.png. Ces captures sont fictives et ne prouvent pas l'accès à un modèle réel.

La page Connexions réelle affiche les deux lanceurs installés, leurs adresses et l'authentification requise. Le catalogue OMP existant découvre aussi des modèles oMLX sur ce Mac ; cela ne prouve pas une inférence réussie.

## Limites

Connexion authentifiée et inférence oMLX/Splash : non vérifiées, laissées à la recette humaine. Les terminaux natifs ne remontent pas de tokens/coûts dans les sessions structurées. Le diagnostic affiche 8000/8001 ; les ports modifiés au lancement ne sont pas persistés. Les versions des lanceurs installés ont été inspectées pour leur forwarding des arguments ; compatibilité avec d'autres versions non garantie. Login/upload ChatGPT non testés. Aucun quota consommé par un prompt de test.
