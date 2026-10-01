# Patterns par format — conventions de construction

## Notebook (.ipynb) — le format par défaut

- Stack : numpy, scipy, matplotlib, ipywidgets. Pas de dépendance exotique.
- Structure standard : voir workflow.md rubrique 7.
- Sliders ipywidgets pour toute variable de la rubrique 3 ; bornes = plages du
  contrat ; `continuous_update=False` sur les calculs lourds.
- Livrer aussi le `.py` équivalent (extraction des cellules) pour exécution hors Jupyter.
- Chaque expérience = 1 cellule markdown (PRÉDICTION + question) + 1 cellule code.

## Animation (Manim / matplotlib.animation)

- Manim pour le mathématique (transformations, espaces, morphismes continus) ;
  matplotlib.animation (`FuncAnimation`) pour les dynamiques simples.
- Une animation montre UNE transition (ex : rotation→étirement→rotation), pas
  un cours entier. Durée cible : 15-45 s.
- Toujours : pause/étape par étape possible, labels persistants, le .py source
  livré à côté du .mp4/.gif.
- Une animation reste passive → l'encadrer : prédiction avant visionnage,
  question après ("qu'est-ce qui changerait si [paramètre] ?").

## HTML single-file interactif

- Zéro dépendance réseau : JS vanilla + canvas/SVG, tout inline.
- Idéal pour : champs de vecteurs (S1), mini-jeux (S6), exploration tactile.
- Panneau latéral fixe : table variable→signification (rubrique 4) toujours
  visible pendant la manipulation.
- Boutons "preset piège" : un clic place les variables sur le réglage qui casse
  l'intuition naïve.

## Mini-jeu conceptuel

- Structure à tours : état → décision de l'utilisateur → conséquence → feedback.
- Le score DOIT mesurer la compréhension (ex : PnL décomposé), pas la dextérité.
- Mode replay à seed fixée : rejouer le même scénario avec une autre politique —
  c'est la comparaison qui enseigne.
- Fin de partie = debrief automatique : "voilà les 3 décisions qui t'ont coûté
  le plus, et le mécanisme derrière chacune."

## Dashboard multi-vues

- 2-4 panneaux MAX, tous liés aux mêmes sliders (une manipulation → toutes les
  vues bougent ensemble : c'est le lien entre représentations qui enseigne).
- Ex Markowitz : nuage + frontière | poids en barres | matrice de corrélation.
- Chaque panneau titré par ce qu'il montre en langage ordinaire, pas par le nom
  technique ("Où va ton argent" plutôt que "Poids optimaux w*").

## Carte heuristique / graphe causal

- mermaid (dans .md) ou HTML si interactif.
- Nœuds = concepts avec leur état mastery-map (couleur) ; flèches labellisées
  par le mécanisme ("nécessite", "généralise", "même maths que").
- Usage : fin de parcours (vue de ce qui est acquis) ou début (carte avant
  tunnel, règle CAL 3). Pas un artifact de compréhension en soi — toujours
  couplé à autre chose.

## Checklist de livraison (tous formats)

```
☐ Contrat 10 rubriques rempli et joint
☐ Code exécuté de bout en bout, seeds fixées
☐ Cas limites de la rubrique 8 reproduits
☐ Table variable→signification visible dans l'artifact lui-même
☐ ≥1 PRÉDICTION demandée avant la première manipulation
☐ Le piège mis en scène (preset ou cellule dédiée)
☐ Questions post-manipulation posées à l'utilisateur en fin de livraison
☐ Fichiers nommés YYYY-MM-DD_artifact_<concept>.<ext>, .py source inclus
```
