# Hooks de session — protocoles complets

Les hooks sont des points d'exécution obligatoires. Ils ne sont pas optionnels
et ne se négocient pas, même si l'utilisateur demande d'aller vite.

## H1 — Début de session

```
1. Lire memory/learning-profile.md → objectifs actifs, deadline, préférences.
2. Lire memory/mastery-map.md → états des concepts liés au sujet du jour.
3. Lire memory/retention-queue.md → extraire les rappels échus (due ≤ aujourd'hui),
   max 3, les plus anciens d'abord.
4. Si rappels échus : les poser AVANT tout nouveau contenu (RL étape 0).
   Barème : réussi / partiel / raté → reprogrammation selon la table RL.
5. Ouvrir en 2 lignes max : "Objectif actif : [X]. [N] rappels échus. On commence par ça."
```

Si les fichiers mémoire n'existent pas : les créer depuis les templates de
`references/memoire.md`, le signaler en une ligne, continuer.

## H2 — Après leçon (concept atteint l'état mobilisable)

```
1. RL génère la RetentionCard (format RL) — image mentale = celle produite ou
   validée par l'utilisateur EN session, jamais une générique.
2. RL génère 1 RecallTest, due J+1, inscrit dans retention-queue.
3. Proposer (pas imposer) une animation via ANIM si V13=true et/ou un artifact de
   consolidation via CAB si V11=true. Si les deux, proposer l'animation d'abord.
4. Mettre à jour mastery-map : état, critères validés, ancrage retenu.
```

Interdit : générer une fiche pour un concept < mobilisable (Bug 6 CAL).

## H3 — Après erreur (reconstruction fausse, exercice raté, confusion détectée)

```
1. Étiqueter : définition | intuition | confusion_entre_notions |
   prérequis_manquant | raisonnement_incomplet | stratégie_de_départ |
   illusion_de_compréhension (taxonomie RL/CAL).
2. Inscrire dans mastery-map : [date] [concept] confusion: <étiquette> — <1 ligne>.
3. Créer UN exercice correctif : même structure, habillage différent (non
   isomorphe), ciblé sur le critère échoué uniquement.
4. Si 2e échec sur la même confusion : signaler le pattern, proposer de reposer
   le prérequis plutôt que de réessayer.
```

## H4 — Après artifact (contrôle pédagogique de sortie CAB)

Vérifier — verdict binaire, retour à CAB si FAIL :

```
☐ Les 10 rubriques du contrat d'artifact sont présentes (concept, intuition,
  variables, signification, conséquences, pièges, code, test, questions, liens).
☐ ≥1 prédiction demandée AVANT exécution/manipulation (trigger TYPE D CAL).
☐ Chaque variable manipulable est nommée en langage ordinaire.
☐ Le lien variable → terme de la formule est explicite.
☐ Le piège conceptuel est mis en scène (un réglage qui casse l'intuition naïve).
☐ Code exécuté sans erreur, seeds fixées, axes labellisés.
☐ Les questions post-manipulation sont posées à l'utilisateur (pas juste listées).
```

Test final : l'utilisateur peut-il dire "je comprends ce que fait la variable,
je vois les conséquences, je vois le lien avec la formule, je sais quand utiliser
ce concept, je peux le réexpliquer sans regarder" ? Si un artifact est joli mais
ne permet pas ça, il est décoratif → FAIL.

## H4bis — Après animation (contrôle pédagogique de sortie ANIM)

Vérifier — verdict binaire, retour à ANIM si FAIL :

```
☐ La vidéo a deux passes : intuition puis profondeur technique (sauf
  `profondeur: intuition_seule` explicitement demandé dans l'AnimationBrief).
☐ scripts/check_pacing.py a tourné sur le script final et ne signale aucune
  méthode beat_* au-delà de 2,3 mots/seconde.
☐ Les planches d'audit (scripts/audit_frames.py) ont été PRODUITES ET OUVERTES —
  pas seulement générées. Une planche produite mais jamais regardée ne compte pas.
☐ La passe technique a au moins 3 des 6 propriétés de profondeur.md (vocabulaire
  exact, mécanisme réel, exemple chiffré, cas limite, comparaison, domaine de
  validité) — sinon c'est une passe 1 étirée, pas une passe 2.
☐ Si le concept est aussi MANIPULABLE (V11) : la vidéo renvoie vers l'artifact CAB
  plutôt que de simuler un curseur en scène.
```

Test final : si on lit la vidéo à vitesse normale (x1), chaque texte reste-t-il
affiché assez longtemps pour être lu confortablement ? C'est le test qui a détecté
le défaut d'origine de cette skill — des vidéos qu'il fallait ralentir à x0.25 pour
suivre. Un rythme qui échoue ce test à l'œil échoue le gate, même si
`check_pacing.py` n'a rien signalé (l'outil est conservateur par construction :
il peut manquer un cas, jamais l'inventer).

## H5 — Fin de session

```
1. SessionDebrief (format RL, ≤15 lignes) :
   ACQUIS / FRAGILE / ERREUR COGNITIVE PRINCIPALE / MEILLEUR ANCRAGE /
   EXERCICE À REFAIRE / RAPPELS PLANIFIÉS.
2. Écrire : mastery-map (états), retention-queue (nouveaux RecallTests +
   reprogrammations), session-debriefs.md (append).
3. Annoncer les prochains rappels avec dates concrètes.
4. Optionnel (proposer une fois, pas insister) : brancher le skill plateforme
   `schedule` pour servir les rappels automatiquement chaque matin.
```

Aucune session ne se clôt sans H5. Si l'utilisateur part brutalement, produire
le debrief quand même à la dernière réponse.
