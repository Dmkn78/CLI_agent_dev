---
name: concept-artifact-builder
description: >
  Construit des artifacts interactifs pour COMPRENDRE les concepts, pas les illustrer :
  simulations Python, notebooks, animations Manim/Matplotlib, mini-jeux conceptuels,
  dashboards, simulateurs de finance (Markowitz, duration, swap, Monte Carlo, market
  making, valeurs propres), cartes heuristiques, visualisations causales, scénarios
  "si je change cette variable, alors...". Déclencher pour : "fais-moi un notebook",
  "simule", "anime", "montre-moi ce qui se passe si", "je veux jouer avec le concept",
  "fais-moi un simulateur de X", ou quand l'orchestrateur route INTENT=artifact.
  NE PAS déclencher pour : expliquer un concept sans manipulation (→
  cognitive-adaptive-learning), mise en forme bureautique (→ docx/pptx/xlsx),
  trading en conditions réelles (→ trading-sim).
---

# Concept Artifact Builder — comprendre en manipulant

Un artifact réussi permet à l'utilisateur de dire, sans regarder :
"je comprends ce que fait chaque variable, je vois les conséquences, je vois le
lien avec la formule, je sais quand utiliser ce concept, je peux le réexpliquer."
Un artifact qui ne permet pas ça est décoratif → il ne se livre pas.

## Pré-condition (gate d'entrée)

Le code consolide, il ne devance pas (règle CAL). Vérifier que les couches 0-2
CAL sont posées (carte + définitions + intuition). Sinon : les poser en ≤10 lignes
en tête d'artifact, ou renvoyer d'abord vers CAL si le concept est entièrement neuf.

## Contrat d'artifact — 10 rubriques obligatoires

Chaque artifact est livré avec ce contrat rempli (détail dans references/workflow.md) :

```
1. CONCEPT VISÉ        — nom + domaine + où il se situe dans la chaîne de prérequis
2. INTUITION CIBLE     — LA phrase que la manipulation doit rendre évidente
3. VARIABLES           — chaque paramètre manipulable, avec sa plage
4. SIGNIFICATION       — chaque variable en langage ordinaire + son terme dans la formule
5. CONSÉQUENCES        — table "si X augmente → alors Y, parce que Z"
6. PIÈGES              — les fausses intuitions, avec le réglage qui les casse
7. CODE                — exécuté, seeds fixées, zéro erreur, tout labellisé
8. TEST                — comment vérifier que l'artifact fonctionne (cas limites connus)
9. QUESTIONS POST-MANIPULATION — 3-5 questions posées à l'utilisateur après usage
10. LIENS              — connexions avec les concepts voisins + contexte de transfert
    (exercice, entretien, cas réel)
```

## Protocole anti-passivité (non négociable)

- **Prédire avant d'exécuter** : chaque expérience commence par "PRÉDICTION :
  que se passe-t-il si [variable] double ? Réponds avant de lancer." (TYPE D CAL).
- **Comparer après** : prédiction vs résultat. Un écart = or pédagogique — le nommer.
- **Un concept par artifact** (max 2 si couplage inévitable, ex : duration+convexité).
- **Le piège est mis en scène** : un réglage précis où l'intuition naïve échoue,
  pas une note en bas de page.
- **Terminer par les questions post-manipulation** — posées, pas listées.

## Choix du format

| Besoin | Format | Stack |
|---|---|---|
| Explorer des paramètres | Notebook .ipynb + sliders | numpy/matplotlib/ipywidgets |
| Voir une transformation continue | Animation | manim (mathématique) / matplotlib.animation (simple) |
| Autonome, zéro install | HTML single-file interactif | JS vanilla + canvas, ou widget |
| Décision répétée sous incertitude | Mini-jeu conceptuel | HTML ou notebook à tours |
| Plusieurs vues simultanées liées | Dashboard | notebook multi-panneaux ou HTML |
| Structure d'un domaine | Carte heuristique / graphe causal | mermaid ou HTML |

Règles de code : exécuter TOUT avant livraison ; chaque figure titrée, axes
labellisés en langage ordinaire ; le .py source toujours livré à côté d'un rendu ;
en finance, montrer le P&L, pas seulement les trajectoires.

## Bibliothèque de simulateurs prêts à spécifier

`references/bibliotheque.md` contient les specs complètes (contrat 10 rubriques) :
valeurs propres, Markowitz, duration, swap de taux, Monte Carlo, market making.
Les utiliser comme base dès que le concept demandé s'en approche ; les adapter,
ne pas repartir de zéro.

## Workflow de livraison

```
1. Remplir le contrat (rubriques 1-6) AVANT d'écrire du code — c'est le cahier
   des charges pédagogique.
2. Construire (references/patterns.md pour les conventions par format).
3. Tester (rubrique 8) : reproduire ≥2 résultats connus (cas limites analytiques).
4. Livrer : artifact + contrat + la première prédiction demandée à l'utilisateur.
5. Après manipulation : poser les questions (rubrique 9), transmettre le résultat
   à l'orchestrateur (hook H4, puis retention-loop pour l'ancrage).
```

## Frontières

- Enseigner le concept → cognitive-adaptive-learning. Rétention/rappels →
  retention-loop. Mise en page de documents → skills bureautiques.
  Marché réel/paper trading → trading-sim.
- Cet artifact sert la compréhension : pas de code de production, pas de données
  payantes, pas de backtest réaliste.

## Ressources
- `references/workflow.md` — contrat détaillé, templates, critères de test
- `references/bibliotheque.md` — 6 simulateurs spécifiés (finance/maths)
- `references/patterns.md` — conventions par format (notebook, manim, HTML, jeu, dashboard)
