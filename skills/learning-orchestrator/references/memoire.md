# Mémoire d'apprentissage — formats et règles

Emplacement : `claude-learning-system/memory/` dans le dossier de travail
(les skills sont en lecture seule — la mémoire vit dans le dossier utilisateur).

## Règles d'écriture (toutes)

1. Items atomiques, datés `[YYYY-MM-DD]`, une ligne par fait.
2. Jamais de suppression silencieuse : un item invalidé passe en section
   `## Invalidés` avec la raison.
3. Écrire uniquement au H5 (ou H2/H3 pour mastery-map) — pas d'écriture au fil de l'eau.
4. Seuil de durabilité : on mémorise les états, confusions récurrentes (≥2),
   ancrages qui marchent, préférences explicites. Pas le contenu des cours.

## learning-profile.md

```markdown
# learning-profile — objectifs et préférences
## Objectifs actifs
- [2026-07-07] [objectif] Entretiens quant T4 2026 — priorités : calcul stocha, produits de taux
## Préférences validées
- [date] [pref] <observation confirmée ≥2 fois>
## Invalidés
```

Le profil cognitif détaillé vit dans CAL — ne pas le dupliquer ici.
Ici : seulement les objectifs, deadlines, et deltas observés vs le profil CAL.

## mastery-map.md

```markdown
# mastery-map — état de rétention par concept
## Actifs
- [2026-07-07] [maths/svd] état: mobilisable. Critères: 1✓ 2✓ 3✓ 4✓ 5✓ 6:0/2.
  Ancrage: "rotation-étirement-rotation". Prochain rappel: J+1.
- [2026-07-07] [maths/svd] confusion: confusion_entre_notions (eigen vs singular) — levée.
## Invalidés
```

États : exposé → reconstruit → appliqué → mobilisable → consolidé ⇄ fragile.
Transition uniquement sur production (règle RL). Non-usage 60 j → fragile.

## retention-queue.md

```markdown
# retention-queue — rappels différés planifiés
> Trié par due. Max 3 rappels servis par session (H1).
## Échus / à venir
- [due: 2026-07-10] [maths/svd] Q: "Eigen vs singular en 2 phrases + un cas où
  seule la SVD existe ?" | indice: forme de la matrice | piège: carré ≠
  diagonalisable | hist: 2026-07-07 créé
## Historique (purgé à la consolidation mensuelle)
```

Planification : mobilisable → J+1 → J+3 → J+7 → J+21 → consolidé (sortie de queue).
Partiel : même échéance +2 j, indice consommé. Raté : état régresse d'un cran,
retour J+1.

## session-debriefs.md

Append-only. Un bloc SessionDebrief (format RL) par session, daté.
Sert d'historique pour détecter les patterns (confusions récurrentes,
meilleurs ancrages par domaine).
