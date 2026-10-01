# QA Gates — Critères de Qualité Inter-Phases

Les QA Gates sont des points de blocage entre phases.
Leur rôle est de garantir que la profondeur est préservée à chaque transition.
Ils ne peuvent pas être sautés, même si l'utilisateur demande d'aller vite.

---

## QA Gate B — Après ACB, Avant CAL

**Question centrale :** Le Contrat de Données est-il assez riche pour que CAL
puisse enseigner sans manque structurel ?

### Critères Obligatoires

| Critère | Seuil minimum | Action si échoue |
|---|---|---|
| Nombre de concepts distincts | ≥ 3 avec définitions complètes | Re-extraire les sections pauvres |
| Formules (si sujet mathématique/financier) | ≥ 1 avec `derivation_steps[]` non vide | Demander à ACB de ré-analyser les pages de calcul |
| Exemples | ≥ 1 avec `steps[]` complet (≥ 3 étapes) | Re-extraire les exemples avec le prompt enrichi |
| Figures (si HAS_VISUALS=true) | ≥ 1 avec description ≥ 50 mots | Re-décrire la figure avec zoom 3x |
| `plan_coverage.missing_concepts` | Documenté (vide est acceptable si le PDF couvre tout) | Vérifier que la liste est honnête |
| Contenu non résumé | Aucun champ `text` de moins de 3 mots pour un concept non trivial | Signaler et demander re-extraction |

### Critères Secondaires (signaler sans bloquer)

- Moins de 2 connexions dans `connections[]` pour un sujet avec > 4 concepts → noter
- Aucune annotation manuscrite transcrite alors que le PDF en contenait → noter
- Moins de 2 surlignages dans `highlights_interpreted[]` alors que le PDF est annoté → noter

### Protocole si Gate B Bloque

```
1. Identifier précisément le(s) critère(s) échoués
2. Formuler une instruction de re-extraction ciblée :
   "ACB : la section [X] sur [concept Y] contient seulement [N] mots.
    Re-analyser la page [P] avec reasoning_effort=high et extraire :
    [liste des éléments manquants]."
3. Relancer ACB sur les pages concernées uniquement (pas tout le PDF)
4. Vérifier le Contrat mis à jour
5. Maximum 2 itérations. Si toujours insuffisant après 2 passes :
   → Signaler à l'utilisateur : "Le PDF ne contient pas assez de détails sur [X].
     Je compléterai depuis mes connaissances en Phase C."
   → Passer à Phase C avec le Contrat partiel + note explicite
```

---

## QA Gate C — Après CAL, Avant IC

**Question centrale :** La compréhension est-elle suffisamment ancrée pour
que la curation de sources soit utile (et non prématurée) ?

### Signal de Maîtrise (MASTERY → démontré)

L'un de ces signaux suffit pour ouvrir Phase D :

| Signal | Description |
|---|---|
| Trigger TYPE A réussi | L'utilisateur classifie correctement le concept dans sa famille |
| Trigger TYPE B réussi | L'utilisateur trace la structure A→B→C sans aide |
| Trigger TYPE C satisfaisant | Verbalisation correcte, même incomplète |
| Trigger TYPE D correct | Prédiction correcte d'un comportement |
| Trigger TYPE E cohérent | Reconstruction partielle fidèle |
| Demande explicite | "Qu'est-ce que je devrais lire là-dessus ?" |

### MASTERY reste "en_cours" si

- Aucun trigger n'a été proposé
- Le trigger a été proposé mais la réponse est incorrecte ou absente
- L'utilisateur a demandé plusieurs réexplications du même concept
- Un bug cognitif (CAL/bugs.md) est encore actif et non résolu

### Protocole si Gate C ne s'ouvre pas

```
1. Ne pas mentionner Phase D à l'utilisateur
2. Continuer Phase C sur les concepts non maîtrisés
3. Proposer un trigger TYPE A ou B sur le concept le plus récent
4. Attendre la réponse avant de réévaluer MASTERY
```

### Ce que Gate C vérifie aussi

- Tous les `missing_concepts` du Contrat ont été couverts par CAL depuis
  ses propres connaissances (ou explicitement reportés à une session future)
- Aucune formule n'a été présentée sans justification de sa dérivation
- Au moins un ancrage réel/P&L a été établi pour les sujets finance/quant

---

## Règles Transversales

**Pas de gate contournable :** Même si l'utilisateur dit "passe directement
aux lectures" ou "skip l'explication", Gate C s'applique. On peut formuler
la réponse comme : "Je vais d'abord fixer les bases rapidement, puis on
passe aux sources — ça prend 5 minutes."

**Les gates ne bloquent pas indéfiniment :** Si après 2 itérations le contenu
reste insuffisant (Gate B) ou si après 2 triggers l'utilisateur ne répond
pas (Gate C), l'orchestrateur passe quand même à la phase suivante avec une
note explicite sur ce qui est incomplet.

**Les gates produisent un log :** Chaque gate évalue et produit une note
interne que l'orchestrateur garde en mémoire pour la session courante :
"Gate B : passed / Gate C : pending / MASTERY : en_cours".
