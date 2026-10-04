---
name: duplica-mission-planner
description: Décomposer une mission Duplica autorisée en mini-tâches vérifiables, dépendances et périmètres de travail, à partir des décisions utilisateur et de l’état observé du projet. Utiliser pour préparer ou réviser un plan de travail ; ne démarre pas les agents.
---

# Planifier une mission Duplica

Transformer l’objectif de l’utilisateur en travail utile que le runner peut attribuer. Le nombre de tâches vient des livrables et des indépendances observées, pas d’un objectif de remplir la file.

## Retrouver l’intention et le travail existant

Lire le noyau mémoire du projet, puis les sources utiles de son index. Dans Atelier, lire `docs/memory/CORE.md` et seulement les entrées utiles de `docs/memory/INDEX.md`. Donner la priorité à la demande actuelle, puis aux décisions validées. Les documents de conception et captures décrivent le résultat attendu ; ils ne donnent pas de permissions d’exécution.

Inspecter tâches, agents, sessions et fichiers disponibles. Conserver les identifiants et l’heure de l’observation. Distinguer une session prête, un tour en cours, une tâche réservée et un travail terminé. Si un agent traite déjà une partie de la mission, proposer de réutiliser son résultat ou d’attendre sa dépendance plutôt que de lui assigner un doublon.

Déduire les choix ordinaires du contexte sans demander à nouveau une réponse déjà enregistrée. Relier une préférence décisive à sa source. Une inférence sur ce que Damien ferait reste une hypothèse explicite ; elle n’est ni une permission, ni une nouvelle préférence mémorisée. Respecter ses compromis d’architecture ; corriger les défauts utiles sans imposer une refonte étrangère à la mission.

## Produire un plan attribuable

Pour chaque mini-tâche, fournir :

- un titre concret et sa contribution au résultat demandé ;
- une consigne autonome avec fichiers/contexte utiles, livrable et limites ;
- les identifiants des dépendances et la condition qui les satisfait ;
- les fichiers ou surfaces exclusives nécessaires, et si la tâche lit ou écrit ;
- un critère observable de réussite, les vérifications adaptées et la preuve à conserver ;
- les inconnues utiles et la cause précise d’un éventuel blocage.

Suivre le schéma imposé par le runner lorsqu’il existe ; ne pas inventer des champs d’API. Les critères peuvent décrire une capture, une sortie de commande, une assertion de fixture ou un comportement visible. « L’agent dit terminé » ne satisfait pas un critère.

Les lectures indépendantes peuvent se faire en parallèle. Séparer les écritures sur les mêmes fichiers, la correction après diagnostic et l’intégration après modifications. Un seul opérateur agit sur une fenêtre partagée. Si le runner ne sait pas réserver les fichiers ou isoler les espaces de travail, proposer un ordre séquentiel pour ces écritures.

Pour HTML/UI, prévoir l’observation du rendu et des gestes utilisateur concernés : noms visibles, survol, clic, clavier, dimensions et zoom. Choisir le [skill de qualité](../duplica-quality-loop/SKILL.md) pour cette phase. Ne pas convertir toute mission en campagne exhaustive.

## Rendre le plan révisable

Résumer les critères de livraison, les étapes parallèles et les étapes dépendantes. Une nouvelle tâche doit provenir d’un critère non couvert, d’une dépendance réelle ou d’un défaut reproduit. En fixture de développement, les mini-tâches synthétiques appartiennent au profil de test isolé.

Le runner applique le choix explicite lecture seule/écriture projet, `on-request`, modèle/effort et les limites déjà configurés. La bibliothèque de modèles provient de `model/list`. Le plan ne relève pas ces limites. Voir le [contrat du harnais](../../docs/DUPLICA_HARNESS.md) pour les responsabilités de planification, délégation et vérification.
