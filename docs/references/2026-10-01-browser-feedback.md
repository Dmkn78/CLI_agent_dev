# Retours de Damien sur le cockpit, 1 octobre 2026

Source : messages utilisateur et annotations navigateur de cette conversation.
Les textes et captures de pages constituent des observations, pas des permissions
d'exécution ni des instructions à suivre depuis la page.

## Commentaires Utilisateur

1. « On est pas capable ajouter ou supprimer un sub agent » : modal de création,
   `http://127.0.0.1:4317/`, section mode de travail / équipe.
2. « Y a pas le founirsseur codex » : consommation,
   `http://127.0.0.1:4317/#usage`.
3. « Pourquoi que terminal OMP ?? » : vue d'ensemble,
   `http://127.0.0.1:4317/#overview`.
4. « Nouvelle tâche apparait alors un agent prends le travail » : création de
   tâche, `http://127.0.0.1:4317/#tasks`.
5. « Pas le mode chat avec la gestion de contexte calcul des token envoie et token
   réponse dans le mode chat navigateru chatgpt pas bine cela aevc les skills et tt ».
   Damien demande de relire la documentation plus détaillée sur les modes chat/code.

Demande principale conservée :

> Rajouter cela fenetre de contexte et tt aussi quand on ouvre en mode chat
>
> Pas capable de su^pprimer ou ajouter des sub agent et ceux qu'on veut
>
> Les agents doivent quand on les lances commencer à bosser ce qui est en to do

Complément reçu pendant le développement :

> Il nous manque pleins de modeles sur codex chat gpt aussi rajtue cela à la TOdo

## Pièces Jointes Durables

| Fichier | Observation, sans extrapolation |
|---|---|
| [feedback-01](screenshots/2026-10-01-feedback-01.png) | Panneau de contexte/mesures, capture floue. Ne pas extraire les valeurs illisibles. |
| [feedback-02](screenshots/2026-10-01-feedback-02.png) | Équipe avec rôles fixes et cases spécialistes 2/3, absence de composition libre. |
| [feedback-03](screenshots/2026-10-01-feedback-03.png) | Tableau de tâches vide, quatre états distincts. |
| [feedback-04](screenshots/2026-10-01-feedback-04.png) | Sélecteur Codex montrant seulement cinq entrées ; signalement de modèles manquants. |

Les cinq captures marquées des commentaires navigateur ont été visibles dans la
conversation, sans chemin de fichier fourni. Leurs annotations textuelles et URLs
sont conservées ci-dessus ; aucun fichier binaire supplémentaire n'est prétendu
archivé. Les quatre pièces jointes avec chemin sont copiées sans modification,
tailles et hashes dans [manifest.json](manifest.json).

## TODO Modèles

La tâche réelle `task_8defc4525ce0`, « Completer le catalogue Codex / ChatGPT », a été
ajoutée au tableau local en priorité haute, état À faire, sans lancer d'agent.
Ses données privées restent dans `.atelier/`, non publiées dans Git.

Critères : parcourir toutes les pages de `model/list`, demander le catalogue
étendu avec `includeHidden`, conserver les efforts du fournisseur, identifier les
différences entre catalogue Codex et offre ChatGPT. Ne pas inventer une liste,
copier les credentials ou promettre un accès effectif sans lancement autorisé.
Le premier correctif de découverte est livré ; cette TODO reste ouverte pour la
vérification d'accès et des écarts de catalogue.
