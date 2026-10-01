# Routing — variables et phases (hérité d'atelier, étendu)

## Variables d'entrée (résolues à chaque session)

```
V1.  INTENT        : apprendre | cours | résoudre | analyser_input | artifact |
                     animation | simulation | réviser | curation
V2.  TOPIC         : finance / maths / IT / autre
V3.  LEVEL         : intro | avancé | master | recherche | non_précisé (défaut: avancé)
V4.  FORMAT_OUT    : latex | markdown | pdf | notebook | html | mindmap | schema |
                     cours | explication | prompt
V5.  DETAIL_LEVEL  : résumé | standard | approfondi | exhaustif (jamais résumé
                     sauf demande explicite)
V6.  HAS_SOURCE    : true | false (PDF, notes, URL — généralise HAS_PDF)
V7.  HAS_VISUALS   : true | false (pré-inspection ACB)
V8.  MASTERY       : lu dans mastery-map (état du concept), pas déclaré par
                     l'utilisateur
V9.  RETENTION_DUE : liste des RecallTests échus (lu dans retention-queue, max 3)
V10. ENERGY        : normale | basse (signaux CAL : réponses courtes, fatigue
                     explicite) → micro-mode
V11. MANIPULABLE   : true si le concept a une forme calculable/simulable → CAB
                     candidat après couches 1-2
V12. DEADLINE       : entretien / examen / aucun (module la couche 4 CAL et le
                     contexte de transfert RL)
V13. HAS_MECHANISM  : true si le concept passe le test archétype de animation-skill
                     (Q1 qu'est-ce qui change / Q2 qu'est-ce qui fait changer / Q3 que
                     verrait-on si on filmait) → ANIM candidat après couches 1-2.
                     false pour une pure définition ou taxonomie (rien à filmer).
```

## Règles de déduction

- Aucun format précisé + source présente → FORMAT_OUT=latex ou markdown selon usage
- Aucun format précisé + concept seul → FORMAT_OUT=cours (markdown interactif)
- "simule", "notebook", "joue avec", "montre-moi ce qui se passe si" → INTENT=artifact
- "anime", "fais-moi une vidéo", "manim" → INTENT=animation (route direct vers ANIM,
  sans attendre la phase C1 automatique décrite plus bas)
- "vraiment comprendre", "en profondeur", "comme un architecte", "niveau technique",
  "pas juste l'intuition" → DETAIL_LEVEL=approfondi ou exhaustif, et signale à ANIM de
  livrer les deux passes (intuition + technique) plutôt que la passe 1 seule
- "on avait vu", "je retiens pas", "teste-moi", "révise" → INTENT=réviser
- RETENTION_DUE non vide → les rappels passent AVANT l'INTENT demandé (H1)

## Phases (ex-atelier, absorbées)

```
PHASE A — ANALYSE      [toujours] Résoudre V1–V13. Définir le plan attendu
                       indépendamment de la source.
PHASE B — EXTRACTION   [si HAS_SOURCE] Invoquer ACB → Contrat de Données.
                       Gate B avant de continuer.
PHASE C — ENSEIGNEMENT [toujours si MASTERY < mobilisable] CAL + RL.
                       Le gate d'acquisition RL remplace l'ancien QA Gate C :
                       MASTERY=démontré ⟺ état ≥ mobilisable dans la machine RL.
PHASE C1 — ANIMATION   [si HAS_MECHANISM et (DETAIL_LEVEL≥approfondi ou INTENT=animation)
                       et couches 1-2 posées] ANIM. Vidéo intuition + profondeur technique
                       (deux passes, animation-skill/references/profondeur.md). Hook H4bis.
PHASE C' — ARTIFACT    [si MANIPULABLE et couches 1-2 posées] CAB. Hook H4 en sortie.
PHASE D — CURATION     [si état ≥ mobilisable OU demande explicite] IC.
                       Jamais avant la fin de Phase C.
```

C1 et C' ne sont pas exclusives : un concept avec HAS_MECHANISM=true ET MANIPULABLE=true
(ex : Black-Scholes — le mécanisme se filme, chaque grecque se manipule) déclenche les deux,
dans l'ordre C1 puis C' — la vidéo installe le mécanisme avant que la manipulation ait un
sens. Ne jamais lancer C' avant C1 quand les deux sont dus : manipuler un paramètre sans
avoir vu le mécanisme tourner au moins une fois produit une exploration sans repère.

## Table de routage détaillée

| V6 | V1 | État mastery-map | Chemin |
|---|---|---|---|
| true | apprendre/cours | < mobilisable | A → B → C (→ C1 si V13, → C' si V11) |
| true | apprendre/cours | ≥ mobilisable | A → B → C(delta) → D |
| false | apprendre/question | < mobilisable | A → C (→ C1 si V13, → C' si V11) |
| false | apprendre | ≥ mobilisable | A → C(reconstruction d'abord, Bug 5 CAL) → D |
| any | animation | couches 1-2 non posées | A → C(couches 0-2 seulement) → C1 |
| any | animation | couches 1-2 posées | A → C1 |
| any | artifact/simulation | couches 1-2 non posées | A → C(couches 0-2 seulement) → C' |
| any | artifact/simulation | couches 1-2 posées | A → C' |
| any | réviser | any | H1 → RL étape 0 → corrections ciblées |
| any | correction de doc | any | A → B(mode correction) → C |
| false | curation | ≥ mobilisable | A → D |
| false | curation | < mobilisable | Refuser poliment : "curation après maîtrise" → proposer C |

## Refus / clarification

- Sources non académiques (contrats, RH, juridique) → refuser, expliquer.
- Demande sans contexte minimal → UNE question fermée, pas un questionnaire.
- Demande de réponse immédiate sans compréhension → Bug 6 CAL (pas de fiche
  avant maîtrise), proposer le chemin court C en micro-mode.
