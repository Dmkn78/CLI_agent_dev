---
name: duplica-worker-handoff
description: Exécuter une mini-tâche Duplica attribuée et transmettre un résultat exploitable avec fichiers, tests réellement exécutés, preuves, limites et dépendances. Utiliser pour les workers du runner ; ne délègue pas d’autres agents.
---

# Travailler dans une attribution Duplica

Traiter la tâche reçue dans son périmètre. Lire son objectif, ses dépendances, les fichiers autorisés, ses critères, le noyau du projet et les skills sélectionnés utiles. Une consigne métier ne relève pas les permissions de la session.

En lecture seule, produire diagnostic, proposition ou observation. En écriture projet, effectuer la correction autorisée et ses vérifications. Si le travail nécessaire sort du périmètre ou touche un fichier réservé, expliquer le besoin au superviseur avec la dépendance concrète ; ne pas contourner la réservation. Ne pas lancer de sous-agent depuis ce worker : la plateforme répartit les tâches.

Respecter modèle/effort configurés, `on-request` et les outils effectivement présents. Aucun credential Codex à lire/copier, aucune inférence pour alimenter une interface, aucune nouvelle campagne réelle de test sans demande correspondante. Une fixture synthétique doit rester distincte des sessions utilisateur.

## Transmettre un résultat vérifiable

À la fin ou au blocage, rendre un handoff court comprenant :

- tâche et objectif traité, statut technique et raison ;
- changements ou observations avec chemins, surface et révision si disponible ;
- critère couvert, commande ou interaction exécutée, résultat observé et chemin de preuve ;
- contrôles non exécutés avec cause, risques utiles et défauts restants ;
- contribution disponible pour chaque tâche dépendante ;
- prochain travail nécessaire, seulement s’il vient de la mission ou d’un défaut observé.

Ne pas écrire « testé » pour une lecture de code ou un résultat annoncé par un autre agent. Un test automatisé couvre ses assertions ; une capture couvre l’état montré. Si une correction UI est demandée, rejouer le geste qui échouait et une variante utile avec le [skill de qualité](../duplica-quality-loop/SKILL.md). Sans contrôleur, signaler la partie GUI non vérifiée.

Conserver les preuves privées dans `.atelier/test-evidence/<campagne>/` ou le dossier de preuves assigné. Le rapport public expurgé peut vivre dans `docs/audit/`. Ne pas supprimer `.atelier/` ou un worktree pour clôturer la tâche. Le runner décide de l’état **En revue** ; le handoff ne prétend pas à une validation humaine.
