# En-têtes de panneaux compacts — 3 octobre 2026

Les en-têtes des terminaux, des outils et du dashboard latéral prennent trop
de place. Les boutons héritaient d’un `min-height: 32px` incompatible avec une
barre fine. La correction CSS fixe les en-têtes à **24 px** et leurs boutons à
**18 × 18 px**, avec une surcharge explicite du minimum hérité. Les espacements,
icônes et compteurs sont réduits ; le focus visible reste à l’intérieur.

La recette Chrome avec transport desktop simulé passe à **1500, 900, 390 et
300 px**. Les quatorze en-têtes observés mesurent 24 px, dashboard latéral
compris ; boutons, titres et tokens restent dans leur surface. Les clics
physiques sur +, ⋯ et les tokens ouvrent les contrôles attendus. Échap les
ferme et restitue le focus. Déplacement, redimensionnement, zoom et
masquage/restauration des panneaux passent également. Aucun débordement global
ni erreur JavaScript.

La modification applicative concerne uniquement le CSS ; aucun test backend
n’a été relancé pour cette retouche. La recette utilise des données fictives,
sans inférence réelle.

Le lot est destiné à **`branch_dev_laptop`**. La livraison du commit, son push
et la mise à jour d’Atelier sur le PC sont demandés ; leurs résultats restent
à confirmer au moment de ce rapport.
