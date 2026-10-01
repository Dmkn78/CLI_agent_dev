# Phases d'Exécution — Détail

---

## PHASE A — Analyse de l'Entrée

**Objectif :** Résoudre les 8 variables. Ne rien assumer. Demander si ambigu.

### A1. Classifier le type d'entrée

```
Si fichier PDF présent dans /mnt/user-data/uploads/ → V6=true, V1=pdf
Si l'utilisateur demande "fais un cours sur X" sans PDF → V6=false, V1=cours
Si l'utilisateur pose une question sur un concept → V1=concept
Si l'utilisateur demande "améliore ce document / c'est trop résumé" → V1=correction
Si l'utilisateur demande "qu'est-ce que je devrais lire sur X" → V1=prompt pour IC direct
```

### A2. Extraire le topic et le niveau

- Le topic est toujours explicite ou déductible. Si ambigu → demander en une ligne.
- Le niveau par défaut est `avancé` pour cet utilisateur. Ne pas supposer introductif.

### A3. Définir le plan de cours attendu (OBLIGATOIRE même sans PDF)

Avant tout traitement : lister mentalement ce qu'un cours complet sur V2
doit contenir. Cette liste est le **référentiel de complétude** :
- si Phase B (ACB) produit un contrat qui manque des éléments de cette liste → Gate B bloque
- si Phase C (CAL) n'a pas couvert tous les éléments → noter les manques pour la suite

### A4. Résoudre FORMAT_OUT

```
Si "cours" ou "doc" ou "LaTeX" → FORMAT_OUT=latex
Si "explique-moi" ou conversation → FORMAT_OUT=explication
Si "schéma" ou "carte" ou "mind map" → FORMAT_OUT=schema
Si "prompt" ou "donne-moi un prompt" → FORMAT_OUT=prompt
Si non précisé + HAS_PDF=true → FORMAT_OUT=latex (défaut PDF)
Si non précisé + HAS_PDF=false → FORMAT_OUT=cours (défaut sans PDF)
```

### A5. Output de Phase A

Produire explicitement (en une réponse courte à l'utilisateur si utile) :
- Sujet détecté : [topic]
- Format de sortie : [FORMAT_OUT]
- Chemin d'exécution : A → [B →] C [→ D]
- Plan de cours attendu : [liste des concepts requis]

---

## PHASE B — Extraction (ACB)

**Condition :** HAS_PDF=true OU V1=correction OU V1=cours avec FORMAT_OUT=latex

**Objectif :** Produire le Contrat de Données (voir references/contrat.md).
Le LaTeX compilé est un livrable utilisateur secondaire — le Contrat est le
medium de communication vers Phase C.

### B1. Invoquer academic-course-builder

Transmettre :
- Chemin du PDF (si présent)
- V2 TOPIC — pour que l'Étape 0a d'ACB ait le référentiel de complétude
- V3 LEVEL — conditionne la profondeur attendue
- V5 DETAIL_LEVEL — toujours `exhaustif` par défaut dans ce pipeline

### B2. Recevoir l'output d'ACB

ACB produit :
- `course_output.tex` + `course_output.pdf` (livrable utilisateur)
- `assets/figures/` (images extraites)
- Le Contrat de Données JSON (voir références/contrat.md)

### B3. QA Gate B — Vérifications avant Phase C

```
VÉRIFIER :
☐ Le Contrat contient au moins 3 concepts distincts avec définitions
☐ Si sujet mathématique/financier : au moins 1 formule avec derivation_steps[]
☐ Au moins 1 exemple avec steps[] complets (pas juste statement + result)
☐ Si HAS_VISUALS=true : au moins 1 figure avec description non vide
☐ Aucun champ critique à null sans justification
☐ Le topic couvert correspond au plan défini en Phase A

SI UNE VÉRIFICATION ÉCHOUE :
→ Ne pas passer à Phase C
→ Retourner à ACB avec instruction précise : "La section [X] est insuffisante.
   Re-extraire en priorité : [liste des éléments manquants]."
→ Maximum 2 itérations de correction avant de signaler à l'utilisateur
```

---

## PHASE C — Enseignement (CAL)

**Condition :** TOUJOURS — seule phase obligatoire dans tous les chemins.

**Objectif :** Enseigner le contenu du Contrat (si Phase B) ou du concept
direct (si pas de Phase B) selon la méthode pédagogique de CAL.

### C1. Transmettre le Contrat à CAL

Si Phase B exécutée : CAL reçoit le Contrat de Données structuré.
Il ne relit pas le PDF — il travaille sur le Contrat.

Si Phase B non exécutée : CAL travaille directement sur le concept demandé
en Phase A, avec V2 TOPIC et V3 LEVEL comme seuls paramètres d'entrée.

### C2. Sélection de l'approche dans CAL

```
Si le topic est un instrument/produit/système composé de pièces → Schéma Heuristique
  (charger cognitive-adaptive-learning-gpt/references/schema_heuristique.md)

Si le topic est une procédure, une preuve, ou un calcul → Séquence Standard
  (Couches 0.5 → 1 → 2 → 3 → 4)

Si les deux s'appliquent → Combinaison :
  Schéma Heuristique pour la carte des composants
  Séquence Standard pour le mécanisme temporel/calculatoire
```

### C3. Ordre d'enseignement des concepts

Utiliser le champ `connections` du Contrat pour ordonner les concepts :
un concept ne peut être enseigné que si ses dépendances (`relation: "nécessite"`)
ont déjà été couvertes.

### C4. QA Gate C — Avant Phase D

```
VÉRIFIER :
☐ Chaque concept du plan (Phase A) a été abordé dans Phase C
☐ Au moins un trigger de production active (TYPE A-E) a reçu une réponse
☐ L'utilisateur a produit quelque chose (classification, verbalisation, prédiction)
☐ Aucun blocage cognitif non résolu (vérifier references/bugs.md si signal détecté)

SI MASTERY non démontré :
→ Ne pas proposer Phase D
→ Continuer Phase C sur les concepts non maîtrisés

SI MASTERY=démontré OU demande explicite de lectures :
→ Ouvrir Phase D
→ Passer le topic (V2) et les connexions inter-concepts à IC
```

---

## PHASE D — Curation (IC)

**Condition :** MASTERY=démontré OU demande explicite ("qu'est-ce que je dois lire ?")

**Objectif :** Identifier les sources fondatrices sur V2 TOPIC pour ancrer
la compréhension acquise en Phase C dans une bibliographie de référence.

### D1. Transmettre à inputs-curator

IC reçoit :
- V2 TOPIC
- Les concepts couverts en Phase C (pour cibler les recommandations)
- Le niveau V3 (pour calibrer la profondeur des sources)

### D2. Mode IC à activer

```
Si l'utilisateur veut comprendre les fondations théoriques → Mode PROFONDEUR
Si l'utilisateur veut un programme de lecture → Mode CURATION
Si l'utilisateur veut des connexions inter-domaines → Mode COLLISION
```

### D3. Règle de non-redondance

IC ne réexplique pas les concepts déjà couverts en Phase C.
Sa mission unique : pointer vers les sources primaires, les auteurs fondateurs,
et les connexions inattendues avec d'autres domaines.
