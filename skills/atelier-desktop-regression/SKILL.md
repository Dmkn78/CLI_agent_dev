---
name: atelier-desktop-regression
description: Tester le shell Electron Atelier, navigateur intégré et terminaux PTY avec interactions visibles, isolation et preuves. Pour zoom, onglets, images CLI, permissions, resize et arrêt ; ne promet pas le contrôle automatique d’autres applications du PC.
---

# Recette desktop et terminaux

Lire [contrats et repères desktop](references/desktop.md). Définir fenêtre et parcours autorisés. Une recette navigateur seule ne valide ni WebContentsView, ni PTY, ni dialogue natif.

Utiliser fixture et profil de recette isolés. Pour PTY, employer un processus bénin local émettant une sortie et répondant au clavier ; aucun modèle réel nécessaire pour grille, onglets et fermeture. Ne pas modifier le profil ChatGPT ni lire/copier les credentials CLI. Garder on-request et permissions explicites.

## Interagir et prouver

- Observer fenêtre réelle, sélection, dimensions, panneaux et modal. Tester par clic/clavier/survol ; un appel IPC ou evaluate est un test de contrat, à identifier séparément.
- Zoom : augmenter/diminuer/restaurer, observer le contenu ciblé et valeur native si disponible. Le chat intégré doit changer effectivement et les contrôles rester accessibles.
- Onglets : plusieurs onglets isolés, renommage, sélection et fermeture/réouverture ; titre conservé sans écrasement par premier message.
- PTY : saisie/sortie, resize et dimensions reçues, consoles multiples, focus et fin effective du processus fermé. Une animation n’atteste pas une sortie CLI.
- Images CLI : petite image synthétique, sélection/collage/dépôt selon contrôles disponibles, chemin/arguments reçus par lanceur fictif. « Fichier transmis » et « image comprise par Codex » restent distincts ; seul un test réel autorisé prouve le second.
- Permissions : arguments effectifs sandbox/approbation et assertions locales ; un prompt « lecture seule » ne suffit pas. Ne jamais retirer sandbox pour rendre un test vert. L’aide CLI prouve une option disponible, pas son enforcement sur ce PC.
- Vue distante : isolation et limites du shell sans login/dépôt réel non autorisé. Profil web, authentification Codex et état backend sont distincts.

Sans outil de contrôle PC, la recette Electron couvre les fenêtres Atelier ; les applications externes restent non vérifiées. Le ComputerController local impose observation fraîche et génération ; après effet incertain, observer avant retry.

Conserver avant/après, sortie PTY utile, arguments, état d’arrêt et environnement. Après correction, même déclencheur. Rapporter preuve visuelle, assertions, modèle réel non testé et recette humaine restante séparément. Conserver .atelier/ ; arrêter uniquement les processus lancés pour la recette.
