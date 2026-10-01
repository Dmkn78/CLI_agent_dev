# Workflow d'artifact — contrat détaillé et templates

## Le contrat, rubrique par rubrique

### 1. CONCEPT VISÉ
Nom exact + domaine + position dans la chaîne : quels prérequis il suppose
(vérifier leur état dans mastery-map via l'orchestrateur), quels concepts il ouvre.

### 2. INTUITION CIBLE
UNE phrase, testable. Mauvais : "comprendre la SVD". Bon : "toute matrice est
une rotation, puis un étirement le long d'axes privilégiés, puis une rotation —
et les valeurs singulières SONT les facteurs d'étirement."
Toute la conception de l'artifact découle de cette phrase.

### 3. VARIABLES
Liste exhaustive des paramètres manipulables. Pour chacun : nom, plage, valeur
par défaut, granularité du slider. Maximum 4-5 variables exposées — au-delà,
l'utilisateur tourne des boutons sans comprendre. Les autres paramètres sont
fixés et commentés.

### 4. SIGNIFICATION
Table obligatoire :

| Variable | En langage ordinaire | Terme dans la formule | Unité/plage |
|---|---|---|---|

C'est cette table qui crée le lien manipulation → formalisme. Sans elle,
l'utilisateur "joue" sans encoder.

### 5. CONSÉQUENCES
Table causale, remplie AVANT de coder (elle sert aussi de test) :

| Si... | Alors... | Parce que (mécanisme) | Visible où |
|---|---|---|---|

Chaque ligne devient une expérience PRÉDIS → EXÉCUTE → COMPARE dans l'artifact.

### 6. PIÈGES
2-3 fausses intuitions documentées, chacune avec LE réglage qui la casse.
Format : "Intuition naïve : [X]. Réglage : [valeurs précises]. Ce qu'on observe :
[Y]. Pourquoi : [mécanisme]." Le piège principal est la dernière expérience de
l'artifact, jamais omise.

### 7. CODE
- Exécuté intégralement avant livraison. Zéro cellule en erreur, zéro warning
  non commenté. Seeds fixées (`np.random.seed(42)`).
- Définitions en commentaires : chaque symbole nommé à sa première apparition.
- Chaque figure : titre en langage ordinaire, axes labellisés, légende.
- Structure notebook standard :
  ```
  Cellule 0 — LA CARTE : concept, pourquoi il existe, ce qu'on va VOIR (≤10 lignes)
  Cellule 1 — Setup + définitions commentées
  Cellules 2..n — une expérience par ligne de la table CONSÉQUENCES,
                  chacune ouverte par "# PRÉDICTION : ..."
  Cellule n+1 — LE PIÈGE (le réglage qui casse l'intuition naïve)
  Cellule finale — questions post-manipulation + lien vers le concept suivant
  ```
- 8-15 cellules. Un notebook = un concept.

### 8. TEST
Avant livraison, reproduire ≥2 résultats connus analytiquement :
- cas limite (ex : zéro-coupon → duration = maturité ; corrélation=1 → frontière
  Markowitz dégénérée en droite)
- cas symétrique ou trivial (ex : matrice identité → valeurs propres 1,1)
Si le simulateur ne retrouve pas les cas connus, il est faux — ne pas livrer.

### 9. QUESTIONS POST-MANIPULATION
3-5 questions, ordonnées du mécanique au transfert :
1. Mécanisme : "Qu'est-ce qui se passe quand [variable] augmente, et pourquoi ?"
2. Formule : "Montre-moi dans la formule le terme responsable de ce que tu as vu."
3. Piège : "Ton intuition de départ sur [X] — où exactement se cassait-elle ?"
4. Transfert : "Dans [entretien/exercice/cas desk], à quel signal tu reconnais
   que ce concept est le bon outil ?"
5. Reconstruction : "Explique le concept en 3 phrases, sans regarder."
Les réponses alimentent retention-loop (critères 3-5 de la machine d'états).

### 10. LIENS
- Concepts voisins : "même mécanisme que [Y] dans [domaine Z]" (mode COLLISION IC).
- Confusion classique avec le concept frère (eigen/singular, duration/maturité,
  vol/variance...) — nommée, avec le critère de distinction.
- Contexte de transfert selon DEADLINE : question d'entretien type, exercice
  d'annale, ou cas desk.

## Anti-patterns (ce qui fait échouer le hook H4)

- Slider sans table de signification → boutons sans sens.
- Animation qu'on regarde sans prédire → démo, pas apprentissage.
- 8 variables exposées → surcharge, aucune n'est comprise.
- Piège absent ou en commentaire → l'intuition naïve survit.
- Code livré non exécuté → confiance détruite, artifact rejeté.
- Questions listées à la fin mais jamais posées → pas de production, pas d'encodage.
