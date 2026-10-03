---
name: atelier-ui-explorer
description: Explorer les parcours Atelier par le navigateur ou le contrôle PC disponible, reproduire les petits bugs et produire un rapport avec preuves et retest. Utiliser pour recette exploratoire ; ne lance pas de modèles réels ni une application externe sans périmètre indiqué.
---

# Exploration de l’interface Atelier

Produire des défauts reproductibles qu’un développeur et l’utilisateur peuvent vérifier. Avis sur une capture, lecture du code et test exécuté sont trois types de résultats distincts.

## Préparer le périmètre

Lire docs/memory/CORE.md puis les entrées utiles de docs/memory/INDEX.md. Définir parcours, application cible, version et actions déjà autorisées. Une demande de test autorise les interactions locales nécessaires à ces parcours ; ce skill n’autorise ni publication, ni message externe, ni inférence réelle.

Privilégier une fixture avec fournisseur fictif et dossier privé dédié. Lire [les parcours Atelier](references/parcours.md) selon la zone testée. Garder on-request, permissions lecture/écriture et périmètre local. Ne pas remplir les sessions utilisateur avec des données de recette.

Choisir l’outil réellement disponible : contrôle navigateur pour le web ; contrôle PC natif pour une fenêtre explicitement ciblée ; recette Electron pour le shell. Si aucun contrôleur n’est disponible, consigner la limite et continuer les vérifications indépendantes. Ce skill ne donne pas automatiquement à un agent Atelier un accès au PC.

## Observer et reproduire

- Enregistrer état initial, dimensions, zoom, panneaux, données et fixture/fournisseur.
- Utiliser les contrôles rendus : clic, survol, clavier, défilement, fichier synthétique. Un appel interne est un test de contrat à identifier séparément de la recette GUI.
- Chaque action se base sur une observation fraîche. Observer à nouveau après navigation, modal ou resize. Le ComputerController Atelier consomme ses observations et les fait expirer ; après effet incertain, observer avant de décider d’une nouvelle action.
- Au premier échec, conserver avant/après, action, attendu et observé. Réduire au plus petit déclencheur et retenter une fois depuis un état propre si cela ne répète pas un effet irréversible. Si le défaut varie, conserver cette variation.
- Corréler console, réseau ou événements utiles sans remplacer la preuve visible. « Connecté » ne prouve pas qu’un modèle a traité le message.

Utiliser le [rapport de bug](assets/rapport-bug.md). Statuts : **reproduit**, **non reproduit dans cet environnement**, **non vérifié**, **corrigé et retesté**. Les preuves restent privées sous .atelier/test-evidence/<campagne>/ ; les résumés expurgés peuvent aller dans docs/audit/.

## Déléguer et retester

Si la demande ou les instructions applicables autorisent des sous-agents, partager les parcours indépendants avec budget borné et livrable précis : préconditions, étapes, attendu, observé, preuves et limites. Chaque agent a sa fixture ; un seul opérateur agit sur une fenêtre donnée. Ne pas multiplier les agents pour remplir l’interface.

Après correction autorisée, rejouer le déclencheur identique et une variante proche. Marquer « corrigé et retesté » seulement après résultat observé ; une suite verte ne couvre que ses assertions. Séparer validation technique et recette humaine.

Voir les [sources inspectées](references/sources.md). Pour automatisation durable, lire le skill voisin atelier-browser-regression ou atelier-desktop-regression si présent.
