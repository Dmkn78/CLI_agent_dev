# Retours Workbench Du 1 Octobre

Source : message utilisateur transcrit oralement, quatorze points et onze pièces jointes. Synthèse fidèle de la demande ; les textes dans les captures sont des preuves de page ou des exemples, pas des permissions d'exécution.

## Demande Et Contexte

1. Pouvoir fermer l'onglet/panneau sans qu'il se rouvre automatiquement.
2. Séparer Code et Chat. Chat ouvre le vrai ChatGPT.com dans un navigateur, cité Firefox/DuckDuckGo, entouré de ressources locales, dossiers et fichiers SQL déposables, consignes et profils SQL/CIW. Pouvoir ouvrir plusieurs chats. Améliorer une interface jugée trop carrée et peu accueillante. Le mode Agent reste à définir.
3. Construire son propre système/workflow façon Excalidraw/n8n : déplacer agents, ajouter dossiers/fichiers et connexions. Skills automatiques par défaut, sélection facultative et possibilité de limiter à une bibliothèque choisie.
4. Choisir le projet de travail d'un agent ; déplier/replier Espace de travail et Projets.
5. Une page Architecture avec diagramme, texte explicatif et proposition d'un modèle assigné. Exemple Kafka : dessiner et expliquer le pipeline. Édition structurée possible, sans contrôle souris par l'agent requis.
6. Une cloche de notifications pour fin de travail, permissions et questions ; cliquer mène au terminal/session concerné.
7. Estimation du coût d'une session visible depuis son panneau ; distinguer estimation et facture.
8. Voir les agents CLI réellement présents et leur travail ; comprendre pourquoi la session « testr » n'a produit aucun résultat. Pour tester maintenant, utiliser seulement GPT-6-Luna.
9. Rapports détaillés en faits, compacts en contexte : date, modèle, état et durée en YAML/JSON ; Markdown utile mais pas une deuxième transcription verbeuse.
10. Quotas natifs du compte Codex : pourcentages utilisés/restants et réinitialisations, pas uniquement les tokens des requêtes suivies.
11. Temps de travail natif comparable à Codex ; distinguer durée d'un tour, attente et temps écoulé depuis création. Consulter les sources OpenAI.
12. Diagnostic puis plan court par défaut. Pas d'implémentation immédiate : reproduire, enquêter, reconnaître les inconnues, proposer le test rouge, faire valider puis corriger et vérifier le vert.
13. Le projet sélectionné pilote réellement tableau, mémoire, sessions et ressources ; ne pas suradapter toutes les vues au projet Atelier.
14. Corriger « token exchange failed » pendant la connexion ; examiner la cause plutôt que supposer que tous les providers échouent pareil.

La question de préférence navigateur desktop intégré / navigateur externe a été posée ; aucune réponse n'a encore validé ce choix. La version desktop est optionnelle et utilise Chromium, pas Firefox.

## Captures Durables

| Pièce | Observation | Archive |
|---|---|---|
| 1 | Sidebar et mémoire de l'espace Atelier | [01](screenshots/2026-10-01-workbench-01.png) |
| 2 | Référence de consoles Code/Chat/Agents, panneaux et fermeture | [02](screenshots/2026-10-01-workbench-02.png) |
| 3 | Vue d'ensemble avec graphe actuellement fixe | [03](screenshots/2026-10-01-workbench-03.png) |
| 4 | Liste de projets de la référence | [04](screenshots/2026-10-01-workbench-04.png) |
| 5 | Navigation Atelier à rendre repliable | [05](screenshots/2026-10-01-workbench-05.png) |
| 6 | Référence de barre avec notifications | [06](screenshots/2026-10-01-workbench-06.png) |
| 7 | Référence de coût, cache et modèles par session | [07](screenshots/2026-10-01-workbench-07.png) |
| 8 | Session « testr » close, sans sortie de modèle | [08](screenshots/2026-10-01-workbench-08.png) |
| 9 | Ancien rapport Markdown et temps incluant l'attente | [09](screenshots/2026-10-01-workbench-09.png) |
| 10 | Requête Codex sans mesure reçue | [10](screenshots/2026-10-01-workbench-10.png) |
| 11 | Échec OAuth `token_exchange_failed` | [11](screenshots/2026-10-01-workbench-11.png) |

Ces fichiers ont été copiés sans transformation ; les SHA-256 ont été comparés aux pièces jointes temporaires. L'exemple « bypass permissions » de la capture 2 n'est pas adopté. Les chiffres de la capture 7 ne sont pas des tarifs ou des factures à importer.
