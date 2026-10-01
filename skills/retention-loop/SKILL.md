---
name: retention-loop
description: >
  Boucle de rétention active. Charger avec cognitive-adaptive-learning pour TOUTE
  session d'apprentissage. Transforme une compréhension passive en connaissance
  retenue : reconstruction obligatoire, correction ciblée, ancrage, transfert,
  rappel différé. Déclencher aussi quand l'utilisateur dit "je comprends mais je
  retiens pas", "je l'ai déjà vu mais...", "teste-moi", "fais-moi réviser", ou
  quand des rappels sont échus dans retention-queue. NE PAS déclencher seul pour
  une première explication (→ cognitive-adaptive-learning la fait, ce skill la gate).
---

# Retention Loop — de la compréhension à la rétention

Ce skill étend CAL. Il ne réexplique pas COMMENT enseigner (couches, triggers,
bugs → voir CAL). Il impose QUAND un concept est acquis et CE QUI DOIT SE PASSER
avant, pendant et après pour que ça tienne.

## Machine d'acquisition (états par concept, persistés dans mastery-map)

exposé → reconstruit → appliqué → mobilisable → consolidé (⇄ fragile)
Avancement UNIQUEMENT sur production de l'utilisateur. Jamais sur acquiescement.

## Workflow obligatoire (7 étapes)

### 0. RAPPELS ÉCHUS D'ABORD
Si des rappels sont échus (fournis par l'orchestrateur, hook H1) : ouvrir la
session par les RecallTests échus (max 3) AVANT tout nouveau contenu.
Barème : réussi / partiel / raté. Raté → l'état du concept régresse d'un cran
+ micro-correction ciblée (≤8 lignes) sur le critère échoué, pas de
réexplication complète.

### 1. DIAGNOSTIC INITIAL (avant d'expliquer)
Résoudre : niveau actuel (lire mastery-map : tout prérequis < mobilisable ⇒
le signaler et le poser d'abord ou le marquer [hypothèse: supposé acquis]) ;
objectif d'usage (entretien / cours / projet — détermine la couche 4 CAL et le
contexte de transfert) ; blocage probable (taxonomie CAL).
Sortie : 2-3 lignes max, puis on enseigne. Pas un questionnaire.

### 2. EXPLICATION COURTE (format contraint)
Appliquer CAL couches 0-2 avec ce gabarit STRICT (≤20 lignes hors schéma) :
définition simple (chaque terme déjà posé) ; intuition (1 analogie NON
décorative : elle doit prédire un comportement, sinon la couper) ; exemple
concret chiffré minimal ; contre-exemple (ce que le concept N'est PAS) ;
lien avec UN concept déjà ≥ mobilisable.
Puis STOP. Interdiction de continuer avant l'étape 3.

### 3. RECONSTRUCTION ACTIVE [GATE → reconstruit]
Exiger UNE production (varier) : "explique-le en 3 phrases, tes mots" /
"donne un exemple à toi" / "explique-le à un débutant" / "qu'est-ce que tu
confonds encore ?".
SONDE ANTI-ACQUIESCEMENT : si réponse type "ok", "logique", "compris" en
<15 mots sans production → NE PAS AVANCER. Répondre : "Possible. Vérifions en
20 secondes : [question de reconstruction minimale]." Une validation rapide est
une ABSENCE de signal.

### 4. CORRECTION COGNITIVE
Étiqueter chaque défaut : définition | intuition | confusion_entre_notions |
prérequis_manquant | raisonnement_incomplet | stratégie_de_départ |
illusion_de_compréhension. Corriger UNIQUEMENT ce qui bloque le critère en
cours. Toujours : nommer ce qui est JUSTE d'abord, puis le défaut précis,
puis re-demander UNE micro-reconstruction. Signaler à l'orchestrateur (hook H3).

### 5. APPLICATION + RECONNAISSANCE [GATES → appliqué, → mobilisable]
a) Mini-exercice NON isomorphe à l'exemple de l'étape 2. → appliqué si réussi.
b) Reconnaissance : 2-3 mini-situations dont UNE seule appelle le concept.
   "Dans lesquelles est-il le bon outil, à quel signal ?"
c) Confusion classique : UNE question qui force la distinction (eigen vs
   singular, duration vs maturité...).
→ mobilisable si b) et c) réussis.

### 6. ANCRAGE + TRANSFERT (une fois mobilisable, pas avant)
a) RetentionCard (§Formats) — la fiche vient APRÈS la maîtrise (Bug 6 CAL).
b) Transfert : le MÊME concept dans 1-2 contextes différents, avec le signal
   de reconnaissance dans chacun. Terminer par : "Prédis : où ce concept
   apparaîtrait dans [3e contexte] ?"
c) Si le concept est manipulable : proposer un artifact de consolidation
   (→ concept-artifact-builder).

### 7. CLÔTURE — SessionDebrief + RecallTests [jamais sauté]
Produire le SessionDebrief + 1 RecallTest par concept touché. Planification :
J+1, J+3, J+7, J+21 (décalés si raté). Remettre à l'orchestrateur (hook H5)
pour écriture mastery-map + retention-queue.

## Formats

RetentionCard (≤15 lignes) : CONCEPT / IDÉE CLÉ (1 phrase) / IMAGE (celle
produite ou adoptée EN session, pas une générique) / FORMULE (chaque symbole
nommé) / SIGNAL D'USAGE ("tu le reconnais quand...") / PIÈGE (la confusion
classique + comment la lever) / RAPPEL (1 question, réponse non incluse).

RecallTest : {concept, question, réponse_attendue (1-3 lignes), indice (1 seul),
piège_à_éviter, due: J+n, historique: [dates+résultats]}.

SessionDebrief (≤15 lignes) : COMPRIS (concepts + état atteint) / FRAGILE
(≥2 corrections + critère ouvert) / ERREUR COGNITIVE PRINCIPALE / MEILLEUR
ANCRAGE / EXERCICE À REFAIRE (variation, pas répétition) / RAPPELS PLANIFIÉS.

## Planification espacée

| Événement | Effet |
|---|---|
| Concept atteint mobilisable | RecallTest créé, due J+1 |
| Rappel réussi | J+1 → J+3 → J+7 → J+21 → consolidé (sortie de queue) |
| Rappel partiel | Même échéance +2 j, indice consommé |
| Rappel raté | État régresse d'un cran, retour J+1 |
| 2 réussites différées (≥J+3 et ≥J+7) | État consolidé dans mastery-map |

## Interdits

- Avancer la machine d'états sur un acquiescement.
- Générer une fiche avant l'état mobilisable.
- Clore une session sans SessionDebrief.
- Réexpliquer entièrement un concept déjà exposé : reconstruire d'abord
  (Bug 5 CAL), corriger le delta seulement.
- Plus de 2 concepts nouveaux par session (CAL).
- Plus d'une question à la fois ; pas d'analogie décorative ; pas de liste >7 items.
