# Contrat de Données — ACB → CAL

Le Contrat de Données est l'objet structuré que `academic-course-builder`
produit à la fin de son exécution et que `cognitive-adaptive-learning-gpt`
reçoit comme input.

**Le LaTeX compilé est le livrable utilisateur. Le Contrat est le medium inter-skill.**
Ne jamais confondre les deux.

---

## Spécification Complète

```json
{
  "topic": "string — sujet principal extrait ou demandé",
  "level": "intro | avancé | master | recherche",
  "source_pdf": "chemin ou null si pas de PDF",
  "plan_coverage": {
    "expected_concepts": ["concept 1", "concept 2", "..."],
    "covered_concepts": ["concept 1", "..."],
    "missing_concepts": ["concept non trouvé dans le PDF"]
  },

  "concepts": [
    {
      "name": "nom du concept",
      "definition_canonical": "définition exacte issue du PDF ou de la littérature",
      "definition_plain": "reformulation en langage clair",
      "priority": "critical | important | body",
      "source": "surligné rouge | surligné bleu | non surligné escaladé | non surligné body",
      "page": 3
    }
  ],

  "formulas": [
    {
      "name": "nom ou identifiant de la formule",
      "latex": "formule LaTeX complète en notation $$...$$",
      "description": "ce que cette formule calcule ou exprime",
      "hypotheses": ["hypothèse 1", "hypothèse 2"],
      "derivation_steps": [
        {"step": 1, "latex": "...", "explanation": "pourquoi cette étape"},
        {"step": 2, "latex": "...", "explanation": "..."}
      ],
      "derivation_available": true
    }
  ],

  "examples": [
    {
      "title": "titre court de l'exemple",
      "origin": "pdf_original | generated",
      "statement": "énoncé complet",
      "given_data": {"variable": "valeur", "...": "..."},
      "steps": [
        {"step": 1, "action": "...", "calcul": "LaTeX si applicable", "result": "..."}
      ],
      "final_result": "résultat final",
      "interpretation": "ce que ce résultat signifie concrètement"
    }
  ],

  "figures": [
    {
      "id": "fig_001",
      "type": "graph | diagram | flowchart | table | schema | screenshot",
      "path": "assets/figures/page001_fig00.png | null si non extractible",
      "extraction_method": "embedded | crop | not_possible",
      "description": "description détaillée : axes, labels, valeurs, relations spatiales",
      "tikz_available": true,
      "tikz_code": "code TikZ reproductible ou null",
      "page": 5
    }
  ],

  "tables": [
    {
      "caption": "titre du tableau",
      "headers": ["col1", "col2"],
      "rows": [["val1", "val2"]],
      "note": "note sous le tableau ou null",
      "page": 7
    }
  ],

  "connections": [
    {
      "from": "concept A",
      "to": "concept B",
      "relation": "nécessite | généralise | est_composé_de | s_oppose_à | est_un_cas_de"
    }
  ],

  "highlights_interpreted": [
    {
      "color": "red | orange | yellow | blue | green",
      "text": "texte complet surligné",
      "type": "critical | important | reminder | definition | example",
      "context": "phrase précédente pour conserver le sens"
    }
  ],

  "handwriting": [
    {
      "text": "annotation manuscrite transcrite",
      "linked_to_concept": "nom du concept auquel elle se rattache",
      "location": "marge gauche | marge droite | au-dessus | en-dessous"
    }
  ]
}
```

---

## Règles de Production du Contrat (ACB)

1. `plan_coverage.missing_concepts` ne doit jamais être ignoré — si un concept
   attendu (défini en Phase A) n'est pas dans le PDF, le noter explicitement.
   CAL devra le couvrir depuis ses propres connaissances.

2. `derivation_steps` est obligatoire si `derivation_available=true`.
   Si la dérivation est partiellement visible → extraire ce qui est visible
   et noter les étapes manquantes comme `"explanation": "non visible sur le PDF"`.

3. `figures.description` doit être assez précise pour que CAL puisse en parler
   sans voir l'image. Axes, unités, valeurs clés, relations — tout.

4. `connections` est construit par inférence : si le PDF place deux concepts
   dans la même section ou utilise l'un pour définir l'autre, la connexion
   est réelle. Si la connexion est implicite mais évidente → l'inclure avec
   une note `"inferred": true`.

## Règles de Consommation du Contrat (CAL)

1. CAL ordonne les concepts selon `connections` — un concept avec des
   dépendances `nécessite` est enseigné après ses prérequis.

2. CAL utilise `plan_coverage.missing_concepts` pour compléter ce que le PDF
   n'a pas fourni — depuis ses connaissances propres, clairement labellisé.

3. CAL traite `highlights_interpreted` comme des signaux de priorité
   pédagogique, pas comme le seul contenu à enseigner.

4. Les `examples` du Contrat sont reproduits à l'identique dans l'enseignement.
   CAL peut en générer de nouveaux, clairement étiquetés `(Généré)`.

5. Les `figures` avec `path != null` sont intégrées visuellement dans la
   réponse si le contexte le permet. Sinon, CAL décrit la figure selon
   `description` et utilise un schéma ASCII ou TikZ de remplacement.
