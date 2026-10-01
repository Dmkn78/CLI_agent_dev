# Chat, Équipes Et TODO, 1 Octobre 2026

## Demande Et Références

Suite aux annotations navigateur de Damien : sous-agents non composables, Codex
absent en consommation vide, terminal limité à OMP, tâches sans prise en charge,
mode chat/contexte manquant. Complément explicite : ajouter les modèles Codex /
ChatGPT manquants à la TODO. [Retours et captures](../references/2026-10-01-browser-feedback.md),
[demande canonique](../memory/USER_REQUEST.md). Quatre originaux copiés sans
modification ; hashes/tailles dans le manifest, quinze captures utilisateur au total.
Les captures de pages sont des observations, jamais des permissions d'exécution.

Skills effectivement chargés : `engineering-workflow`, `clean-code-workflow`,
`coding-rules`, `openai-docs` pour vérifier le contrat natif Codex. Pas de délégation
à un agent ni d'inférence réelle nécessaire pour cette évolution.

## Livraison

- Ajout/retrait de 1 à 8 sous-agents, noms/rôles/consignes, moteur/modèle/effort et
  permissions indépendantes. Vérification et synthèse désactivables. Reconfigurer
  ouvre un nouveau lancement avec les choix précédents ; l'historique n'est pas modifié.
- Chat en lecture seule, liste de conversations, panneau contexte, instructions
  transmises, noyau mémoire, skills et fichiers de projet choisis. Tokens du dernier
  appel entrée/réponse/cache, total et fenêtre uniquement si reçus. Brouillon/fichiers
  estimés localement à caractères/4, jamais assimilés à facturation ou contexte natif complet.
- Travail sur les TODO au lancement explicite, affectation par agent, prise exclusive
  tâche/dossier, priorité/date, réveil sur nouvelles tâches. Résultat technique En revue,
  jamais Terminé automatiquement. Échec/interruption restitue la tâche et arrête la file.
  Redémarrage : baux libérés et activation manuelle requise. Un workflow prend une
  TODO compatible ; un agent indépendant peut poursuivre la file.
- Terminal natif Codex ou OMP, configuration et commande consultables, lancement
  confirmé. Codex garde `on-request`, sandbox explicite et délégation désactivée.
  OMP reste lecture seule / `always-ask`. Aucun prompt envoyé à l'ouverture ; aucune
  consommation de terminal externe importée.
- Fournisseur Codex présent en consommation même vide : valeurs inconnues, pas
  de tokens/coûts inventés. Catalogue Codex paginé incluant les entrées masquées,
  identifiées comme catalogue étendu ; aucun modèle ou effort hardcodé.
- TODO réelle créée en priorité haute, « Completer le catalogue Codex / ChatGPT ».
  Elle reste ouverte pour vérifier les écarts d'offre et l'accès effectif.

## Vérifications

`PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -v` : 43 exécutés,
42 réussis, 1 saut Windows de création de symlink faute de privilège dédié. Traversée
et fichiers sensibles déjà vérifiés avant ce saut. Fournisseurs fictifs uniquement.
`node --check` sur les JS ; tests purs de consommation/CSV/inspecteur.

Playwright/Chrome, serveur de recette isolé 4320 : quatre sous-agents, retrait et
reconfiguration, rôles facultatifs, chat/fichiers/skills/modèle, brouillon effacé après
envoi, tokens reçus, affectation d'une TODO et passage En revue, aperçus Codex/OMP.
Dix vues plus chat, largeurs 1600/900/390/300, zéro erreur JS et aucun débordement
global ; graphe mobile non coupé. Preuves privées `.atelier/browser-evidence/`,
explicitement fictives. Aucun lancement interactif de terminal ni prompt réel.

Défauts découverts/corrigés pendant recette : chemins de skills Windows normalisés,
onglets débordant à 300 px, brouillon conservé par un rafraîchissement concurrent,
configuration d'une session arrêtée après redémarrage sans verrou initialisé.

Service réel redémarré sur 4317 après contrôle : aucune session, aucun workflow ou
benchmark actif. Métadonnées uniquement : 11 entrées Codex découvertes, dont 6
masquées, contre les 5 visibles avant correctif. Aucune inférence ni création de
session réelle. La TODO modèles demeure À faire, priorité haute.

## Inconnues Et Limites

Catalogue != accès effectif ; ChatGPT web != Codex. La TODO ne promet pas tous les
modèles du compte ni une liste universelle. Aucun credential lu/copier/transféré.
La fenêtre et la compaction ne sont pas exposées intégralement. Fichiers de contexte
relatifs au projet, pas à `/mnt/data` ; 8 fichiers, 64 Ko chacun, 40 000 caractères.
Skills : références de fichiers accessibles, pas injection de toute la bibliothèque.

Le bail couvre les travaux automatiques, pas les prompts manuels ou benchmarks.
Scheduler par sous-tâche, dépendances, budgets tokens et parallélisme contrôlé restent
ouverts. Les étapes d'équipe sont séquentielles, rôles configurés != agents actifs.
Les capacités de shell/écriture restent celles des adaptateurs documentés. Aucune
recette d'inférence OAuth/API réelle n'a été réalisée ; elle exige un lancement autorisé.
Les journaux et données `.atelier/` restent privés, les worktrees conservés.

## Contrat Technique Vérifié

La [documentation primaire Codex App Server](https://learn.chatgpt.com/docs/app-server)
documente `model/list`, sa pagination et `includeHidden`. Vérification locale par
`codex app-server generate-json-schema` sans inférence : `ModelListParams` expose
`includeHidden`, la notification d'usage expose `last`, `total` et
`modelContextWindow` facultatif. `codex --help` confirme les options de terminal.
Ces métadonnées ne garantissent ni entitlement ni approbation humaine du produit.
