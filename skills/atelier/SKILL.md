---
name: atelier
description: "Orchestrateur du pipeline d'apprentissage. Analyse l'entrée, route vers academic-course-builder, cognitive-adaptive-learning-gpt, et inputs-curator dans le bon ordre avec contrôle qualité."
---

# Atelier — Orchestrateur du Pipeline d'Apprentissage

Ce skill coordonne trois skills spécialisés sans dupliquer leur logique.
Il décide qui fait quoi, dans quel ordre, avec quelles données, et vérifie
que chaque étape est assez profonde avant de passer à la suivante.

**Ce que ce skill fait :** analyser, router, contrôler, transmettre.
**Ce que ce skill ne fait pas :** extraire, enseigner, ni recommander.
Ces trois rôles appartiennent aux skills satellites.

---

## Skills Satellites

| Skill | Rôle | Fichier |
|---|---|---|
| `academic-course-builder` (ACB) | Extraction PDF → LaTeX compilé + contrat de données | `academic-course-builder/SKILL.md` |
| `cognitive-adaptive-learning-gpt` (CAL) | Enseignement séquencé adapté au profil cognitif | `cognitive-adaptive-learning-gpt/SKILL.md` |
| `inputs-curator` (IC) | Curation des sources fondatrices post-compréhension | `inputs-curator/SKILL.md` |

---

## Inputs Acceptés

| Type | Exemples | Variables résolues |
|---|---|---|
| PDF académique | Polycopié, slides, notes scannées | HAS_PDF=true, détecter HAS_VISUALS |
| Concept pur | "Explique-moi les CMS", "C'est quoi un swap ?" | TYPE=concept, HAS_PDF=false |
| Demande de cours | "Fais-moi un cours sur les options" | TYPE=cours, FORMAT_OUT=latex ou markdown |
| Question ciblée | "D'où vient cette formule ?" | TYPE=question, DETAIL=exhaustif |
| Correction | "Ce document est trop résumé, enrichis-le" | TYPE=correction |
| Prompt + PDF | PDF uploadé + "explique-moi la partie sur les taux" | HAS_PDF=true, TYPE=concept |

## Ce qui N'est Pas Accepté

- PDFs non académiques (contrats, RH, juridique) → refuser, expliquer
- Demandes sans contexte minimal identifiable → demander clarification
- Requêtes demandant une réponse immédiate sans compréhension → appliquer Bug 6 (CAL/bugs.md)

---

## Architecture en 4 Phases

Charger `references/phases.md` pour le détail d'exécution de chaque phase.

```
PHASE A — ANALYSE          [toujours — ne jamais sauter]
  Résoudre les 8 variables d'entrée.
  Définir le plan du cours attendu indépendamment du PDF.
  Choisir le chemin d'exécution.

PHASE B — EXTRACTION       [conditionnel : HAS_PDF=true OU TYPE=cours/correction]
  Invoquer ACB.
  Produire le Contrat de Données structuré (voir references/contrat.md).
  QA Gate B : vérifier profondeur avant de passer à Phase C.

PHASE C — ENSEIGNEMENT     [TOUJOURS — phase centrale obligatoire]
  Invoquer CAL avec le Contrat de Données ou la matière directe.
  Enseigner selon la séquence ou le schéma heuristique.
  QA Gate C : vérifier compréhension avant Phase D.

PHASE D — CURATION         [conditionnel : MASTERY=démontré OU demande explicite]
  Invoquer IC.
  Ne jamais déclencher avant la fin de Phase C.
```

---

## Résolution des Variables d'Entrée (Phase A)

```
V1. TYPE_INPUT   : pdf | text | prompt | concept | correction | question
V2. TOPIC        : (string) finance / maths / IT / autre
V3. LEVEL        : intro | avancé | master | recherche | non_précisé
V4. FORMAT_OUT   : latex | markdown | pdf | mindmap | schema | cours | explication | prompt
V5. DETAIL_LEVEL : résumé | standard | approfondi | exhaustif
V6. HAS_PDF      : true | false
V7. HAS_VISUALS  : true | false  (détecté par pré-inspection ACB Étape 0c)
V8. MASTERY      : non_évalué | en_cours | démontré
```

Règles de déduction si non explicité :
- Aucun format précisé + PDF présent → FORMAT_OUT=latex
- Aucun format précisé + concept seul → FORMAT_OUT=cours (markdown interactif)
- Aucun niveau précisé → LEVEL=avancé (par défaut pour cet utilisateur)
- DETAIL_LEVEL jamais = résumé sauf si l'utilisateur le demande explicitement

---

## Table de Routage

Basée sur les variables résolues, pas sur des cas énumérés.

| V6 HAS_PDF | V1 TYPE | V8 MASTERY | Chemin |
|---|---|---|---|
| true | cours / pdf | non_évalué | A → B → C |
| true | cours / pdf | démontré | A → B → C → D |
| false | concept / question | non_évalué | A → C |
| false | concept / question | démontré | A → C → D |
| false | cours | non_évalué | A → C (CAL génère le cours sans PDF) |
| any | correction | any | A → B(correction) → C |
| false | any | démontré | A → D (skip C si maîtrise déjà établie) |

**Règle de priorité absolue :**
Phase C (CAL) ne peut jamais être sautée si MASTERY ≠ démontré.
Phase D (IC) ne peut jamais précéder Phase C dans la même séquence.

---

## QA Gates — Contrôle Qualité Inter-Phases

Charger `references/qa_gates.md` pour les critères détaillés.

**QA Gate B (après ACB, avant CAL) :**
Bloquer si le Contrat de Données ne contient pas : au moins 1 définition,
au moins 1 formule avec dérivation (si sujet mathématique), au moins 1 exemple
avec étapes. Si insuffisant → retourner en Phase B avec instruction de
re-extraction approfondie.

**QA Gate C (après CAL, avant IC) :**
Bloquer si aucun trigger de production active (TYPE A-E) n'a reçu de réponse
satisfaisante de l'utilisateur. MASTERY reste "en_cours" tant que ce signal
n'est pas reçu. IC ne s'ouvre que sur MASTERY=démontré.

---

## Contrat de Données ACB → CAL

Charger `references/contrat.md` pour la spécification complète.

Le LaTeX compilé est le **livrable final utilisateur**, pas le medium de
communication inter-skill. Ce que CAL reçoit d'ACB est un objet structuré :

```json
{
  "topic": "string",
  "level": "string",
  "concepts": [
    {"name": "...", "definition": "...", "priority": "critical|important|body"}
  ],
  "formulas": [
    {"latex": "...", "description": "...", "derivation_steps": [...]}
  ],
  "examples": [
    {"statement": "...", "steps": [...], "result": "..."}
  ],
  "figures": [
    {"path": "...", "description": "...", "type": "..."}
  ],
  "connections": [
    {"from": "concept A", "to": "concept B", "relation": "nécessite|généralise|compose"}
  ],
  "highlights_interpreted": [
    {"color": "...", "text": "...", "type": "..."}
  ]
}
```

---

## Gestion des Formats de Sortie (Phase C / fin de pipeline)

| FORMAT_OUT demandé | Action |
|---|---|
| `latex` / `pdf` | CAL produit en LaTeX structuré ; ACB compile si PDF demandé |
| `markdown` | CAL produit en Markdown interactif avec schémas ASCII |
| `cours` | Séquence complète CAL (4 couches) + LaTeX si PDF fourni |
| `schema` / `mindmap` | CAL active `references/schema_heuristique.md` et `references/visualiseur.md` |
| `explication` | CAL mode conversation, pas de compilation LaTeX |
| `prompt` | CAL produit un prompt réutilisable encapsulant le concept appris |
| `correction` | ACB en mode correction → CAL vérifie profondeur → livraison enrichie |

---

## Règles Anti-Dérive

Ces règles protègent la cohérence et évitent la confusion du modèle.

1. **Pas de duplication de logique** — l'orchestrateur ne réimplémente jamais ce qu'un skill satellite fait déjà.
2. **Pas de branchement non défini** — toute décision de routage doit correspondre à une ligne de la Table de Routage ou être explicitement justifiée.
3. **Pas de saut de QA Gate** — même si l'utilisateur demande d'aller vite, les gates protègent la qualité de la chaîne.
4. **Pas de résumé** — l'orchestrateur hérite de la règle anti-résumé d'ACB : les données passées entre phases sont complètes, jamais condensées.
5. **Pas de Phase D avant Phase C** — la curation présuppose la compréhension. Cette règle ne se négocie pas.
6. **Pas d'état entre sessions** — chaque conversation repart de la Phase A. Les 8 variables sont résolues à chaque fois.

---

## Checklist d'Activation

```
☐ 1. Lire ce fichier en entier
☐ 2. Charger references/phases.md
☐ 3. Résoudre les 8 variables (Phase A)
☐ 4. Sélectionner le chemin dans la Table de Routage
☐ 5. Si HAS_PDF=true → invoquer ACB (Phase B) → vérifier QA Gate B
☐ 6. Invoquer CAL (Phase C) avec le Contrat de Données ou matière directe
☐ 7. Vérifier QA Gate C avant de proposer Phase D
☐ 8. Si MASTERY=démontré → invoquer IC (Phase D)
☐ 9. Produire le FORMAT_OUT selon la table de gestion des formats
```

---

## Ressources

- `references/phases.md` — détail d'exécution des 4 phases
- `references/contrat.md` — spécification du Contrat de Données ACB→CAL
- `references/qa_gates.md` — critères complets des QA Gates B et C
