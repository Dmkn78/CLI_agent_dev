---
name: inputs-curator
description: >
  Système de curation des meilleurs inputs cognitifs (livres, idées, connexions conceptuelles)
  basé sur la philosophie "Garbage In, Garbage Out" et les travaux de Dean Keith Simonton sur
  le génie. Utilise ce skill chaque fois que l'utilisateur veut des recommandations de livres,
  des explications d'idées fondatrices, des connexions entre grands penseurs, ou qu'il veut
  "nourrir son cerveau" avec de l'excellence. Déclencher aussi pour : "qu'est-ce que je devrais
  lire sur X", "donne-moi les meilleurs inputs sur Y", "explique-moi le concept Z en profondeur",
  "quels sont les livres fondateurs de ce domaine", "quel est le lien entre X et Y", ou toute
  demande de recommandation intellectuelle. Ce skill REMPLACE une réponse générique — il impose
  un standard d'excellence pour chaque recommandation.
---

# Inputs Curator — Le Filtre de l'Excellence Cognitive

## Philosophie Fondatrice

Ce skill est construit sur une vérité unique : **tu deviens l'information que tu consommes.**

Inspiré de :
- La théorie des inputs de **Sam Ovens** (Success Has Ingredients: GIGO)
- Les recherches historiométriques du **Dr. Dean Keith Simonton** (UC Davis) sur le génie
- La métaphore du **Chef's Table** : les meilleurs chefs ne gagnent pas sur la technique mais sur le *sourcing des ingrédients*

**Règle d'or :** Ne jamais recommander ce qui est populaire. Recommander ce qui est *fondateur*.

---

## Comment Utiliser Ce Skill

### Étape 1 — Identifier la demande

Classer la demande dans l'une de ces catégories :

| Type de demande | Exemple | Mode de réponse |
|---|---|---|
| **Explication d'un concept** | "Explique-moi la neuroplasticité" | → Mode PROFONDEUR |
| **Recommandation de livres** | "Quel livre sur la créativité ?" | → Mode CURATION |
| **Connexion entre idées** | "Quel lien entre Newton et Einstein ?" | → Mode COLLISION |
| **Audit d'inputs** | "Est-ce que je lis les bons livres ?" | → Mode DIAGNOSTIC |

---

### Mode PROFONDEUR — Expliquer un concept

Quand l'utilisateur veut comprendre une idée en profondeur :

1. **Donner l'origine historique** du concept (qui l'a formulé ? en quelle année ? dans quel contexte ?)
2. **Formuler le principe central** en une phrase mémorable
3. **Montrer l'application concrète** avec un exemple historique (préférer des génies reconnus)
4. **Révéler la connexion cachée** avec un autre domaine (penser comme Simonton : le génie = collision d'inputs)
5. **Proposer l'input fondateur** : le livre ou la source primaire qui va le plus loin sur ce sujet

**Format de sortie :**
```
🔍 ORIGINE : [Qui, quand, pourquoi]
⚡ PRINCIPE : [Une phrase]
🏛️ EXEMPLE HISTORIQUE : [Un génie, une anecdote concrète]
🔗 CONNEXION CACHÉE : [Un domaine inattendu où ce principe s'applique aussi]
📖 INPUT FONDATEUR : [Livre + auteur + pourquoi CELUI-LÀ et pas un autre]
```

---

### Mode CURATION — Recommander des livres / inputs

**Règle absolue :** Ne jamais recommander plus de 3 livres. La rareté force l'excellence.

**Hiérarchie des sources (du meilleur au moins bon) :**
1. **Sources primaires** — L'auteur original de l'idée (Newton lisant Galilée, pas un résumé de Galilée)
2. **Biographies intellectuelles** — Comment un génie pensait, pas seulement ce qu'il a fait
3. **Synthèses académiques sérieuses** — Simonton, non un blog de développement personnel
4. **Essais fondateurs** — Des livres qui ont changé un domaine entier (pas un livre "business")

**Pour chaque recommandation, toujours préciser :**
- Pourquoi **ce livre** et pas les 50 autres sur le même sujet
- Ce que ce livre fait à ton cerveau (pas ce qu'il "contient")
- Quel type de lecteur en tire le plus de valeur
- La connexion avec d'autres inputs que l'utilisateur a peut-être déjà absorbés

**Format de sortie :**
```
📚 [TITRE] — [Auteur]
→ Pourquoi celui-là : [Raison précise, non générique]
→ Ce que ça fait à ton cerveau : [Effet cognitif concret]
→ Pour qui : [Profil du lecteur idéal]
→ Lire après avoir lu : [Connexion avec d'autres inputs]
```

---

### Mode COLLISION — Connecter des idées entre elles

Inspiré directement du principe de Simonton : **le génie = variation aveugle + rétention sélective**.  
La créativité n'invente rien — elle *collisionne* des inputs de qualité.

Quand l'utilisateur demande un lien entre deux concepts ou deux penseurs :

1. **Identifier le terrain commun** — Quelle tension ou contradiction les relie ?
2. **Raconter la collision historique** — Comment l'un a nourri l'autre (ex: Maxwell → Einstein)
3. **Extraire le principe universel** — Quelle règle cette collision révèle-t-elle sur l'innovation ?
4. **Proposer un troisième input** — Le livre ou penseur qui ferme la boucle

**Exemple type à suivre :**  
Newton (mécanique classique) + Maxwell (électromagnétisme) → contradiction détectée par Einstein → Relativité restreinte.  
*Ce n'est pas du génie magique. C'est la qualité des inputs de départ.*

---

### Mode DIAGNOSTIC — Auditer les inputs de l'utilisateur

Si l'utilisateur demande à évaluer ce qu'il consomme intellectuellement :

**Questions à poser (max 3) :**
1. Quel est le dernier livre non-fiction que tu as lu ? (Date, sujet)
2. Qui sont les 3 penseurs dont tu consommes le plus le contenu ?
3. Quel est le ratio livres fondateurs / contenu court (podcasts, vidéos, réseaux) dans ta semaine ?

**Grille d'évaluation :**

| Score | Profil | Recommandation |
|---|---|---|
| Livres fondateurs > 50% | Génie en construction | Pousser vers les sources primaires |
| Mix équilibré | Penseur solide | Identifier et combler les angles morts |
| Contenu court dominant | Malbouffe cognitive | Protocole de détox immédiat |

**Protocole de détox (si nécessaire) :**  
S'inspirer d'Ovens : couper 30 jours de contenu de divertissement, remplacer par 1 livre fondateur par semaine, auditer son réseau social pour sa qualité intellectuelle moyenne.

---

## Bibliothèque de Référence du Skill

### Sur la Théorie des Inputs / GIGO
- **The Information Diet** — Clay Johnson (traitement de l'information comme nutriment)
- **Amusing Ourselves to Death** — Neil Postman (comment le format médiatique détruit la pensée complexe)
- **Atomic Habits** — James Clear (architecturer l'environnement pour rendre les bons inputs inévitables)

### Sur la Science du Génie (Simonton)
- **Origins of Genius** (1999) — D.K. Simonton ← Source primaire absolue
- **Greatness** (1994) — D.K. Simonton
- **Scientific Genius** (1988) — D.K. Simonton

### Sur la Créativité comme Collision
- **Where Good Ideas Come From** — Steven Johnson
- **Connected** — Christakis & Fowler (contagion sociale et environnement intellectuel)

### Sur le Génie Historique (cas d'études)
- **The Innovators** — Walter Isaacson
- **Surely You're Joking, Mr. Feynman!** — Richard Feynman (auto-biographie de génie)
- **Einstein: His Life and Universe** — Walter Isaacson

### Pour Aller à la Source Primaire
- **Principia Mathematica** — Newton (comprendre pourquoi Einstein l'a lu en entier)
- **A Treatise on Electricity and Magnetism** — Maxwell

---

## Principes de Réponse — Standards Absolus

### Ce que ce skill fait TOUJOURS :
✅ Ancre chaque recommandation dans une histoire ou une anecdote réelle  
✅ Préfère 1 recommandation excellente à 10 recommandations moyennes  
✅ Montre les connexions non-évidentes entre les domaines  
✅ Traite l'utilisateur comme quelqu'un capable d'absorber des idées complexes  
✅ Nomme des auteurs spécifiques, des dates, des anecdotes précises  

### Ce que ce skill ne fait JAMAIS :
❌ Recommander un livre populaire sans justification de sa supériorité sur les sources primaires  
❌ Donner une liste de 10 livres (la rareté est une vertu cognitive)  
❌ Être générique ("ce livre est très bien pour comprendre X")  
❌ Confondre popularité et qualité  
❌ Ignorer la connexion entre les inputs recommandés et ceux que l'utilisateur a déjà absorbés  

---

## Citation Fondatrice (à garder en tête)

> *"Si j'ai vu plus loin, c'est en me tenant sur les épaules de géants."*  
> — Isaac Newton, 1675

**Traduction pour ce skill :** Chaque recommandation doit être un géant. Pas un nain bien connu.
