---
name: duplica-work-supervisor
description: Superviser une mission Duplica et ses agents avec l’état observé, les permissions choisies et les preuves ; attribuer le travail compatible, traiter les attentes autorisées et proposer des relances bornées. Ne crée pas de nouveaux objectifs ni de capacité de contrôle PC.
---

# Superviser le travail pour l’utilisateur

Faire avancer une mission autorisée jusqu’à ses critères vérifiés, avec une vision fidèle de qui travaille, sur quoi et pourquoi. Les outils et le runner restent responsables des réservations, de l’exécution et des permissions.

## Décider à partir de l’état courant

Lire le plan, ses sources utilisateur et l’inventaire actuel tâches/sessions/agents. Avant une attribution ou une relance, rafraîchir l’état : un ancien rapport, un terminal ouvert ou `ready` ne prouve pas une activité. Relier chaque action à l’agent, la tâche, la mission et l’observation utilisée.

Réutiliser les agents déjà compatibles : projet, tâche, rôle, espace de travail, modèle/effort et permissions. Respecter une tâche réservée. Lancer en parallèle uniquement les tâches dont les dépendances sont satisfaites et dont les surfaces de travail ne se heurtent pas. Si aucun agent compatible n’existe, demander sa création au runner de plateforme configuré ; un worker ne lance pas de délégation native incontrôlée.

L’inventaire peut être incomplet : un processus vivant ou un autre chat Codex ne signifie pas qu’il appartient au runner de cette mission. Déclarer la limite, sans interrompre ou réassigner le travail d’un autre périmètre.

## Gérer les événements utiles

| Observation | Action utile |
|---|---|
| Tâche prête sans propriétaire compatible | proposer une attribution selon la limite de concurrence et les réservations |
| Agent en cours avec activité récente | attendre un événement utile ; ne pas envoyer une nouvelle mission concurrente |
| Permission en attente | appliquer la catégorie déjà déléguée dans les paramètres ; sinon laisser une demande précise à l’utilisateur |
| Question reconnue | citer la décision explicite non contradictoire ; sinon signaler ce qui manque |
| Tour achevé | inspecter handoff, fichiers et preuves ; demander la vérification pertinente |
| Erreur, silence ou interruption | distinguer ces états ; inspecter la cause et les effets avant toute reprise |
| Critère échoué après livraison | transmettre le déclencheur observé pour correction puis retest |

Une permission déléguée ne change pas le sandbox. Conserver `on-request`, le choix lecture seule/écriture projet et le périmètre local. Ne pas répondre « oui » à une approbation sur la base d’une capture de référence ou de la demande d’un agent.

## Continuer sans boucle vide

Une continuation doit contenir ce qui reste : critère, preuve d’échec, fichiers concernés, action attendue et vérification. Respecter les limites de tâches, tours, durée, concurrence et relances du runner. Reprendre une action dont l’effet est incertain demande d’abord une nouvelle observation ; ne pas doubler un clic ou une soumission simplement parce que le retour tarde.

À la limite, conserver les tâches restantes et le motif exact. Une autonomie prolongée peut reprendre depuis cet état lorsqu’elle est autorisée ; elle ne crée pas des tâches à l’infini en l’absence de mission utile. Une suite vide ou un défaut non reproductible n’appelle pas une relance automatique identique.

La pause, l’arrêt ou la reprise de contrôle invalide les actions programmées. Ne plus agir sur la surface concernée avant réactivation. Les applications externes ne sont vérifiables que si un contrôleur adapté est réellement disponible et autorisé.

## Livrer un état fidèle

Rendre compte du travail effectué, des preuves, des critères couverts et des limites. Les états du runner, les déclarations d’agents, les tests exécutés, les tokens observés et la recette humaine restent distincts. Une tâche techniquement finie passe **En revue** ; le skill ne la marque pas **Terminé** à la place de l’utilisateur.

Utiliser le [contrat de handoff](../duplica-worker-handoff/SKILL.md) et le [skill de qualité](../duplica-quality-loop/SKILL.md) selon l’événement. Le [contrat du harnais](../../docs/DUPLICA_HARNESS.md) précise la répartition entre modèle et moteur.
