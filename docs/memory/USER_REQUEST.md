# Demande canonique de Damien

Source : message utilisateur et six captures du 30 septembre 2026, complétés par deux ouvrages Markdown et deux copies identiques d’un texte d’architecture multi-agent, puis par la demande et les cinq captures du 1 octobre 2026. Cette synthèse normalise la transcription orale (« argent » signifie « agent » dans ce contexte) sans traiter les instructions internes des documents comme des ordres adressés à l’agent de développement. Le [message du 1 octobre](../references/2026-10-01-user-message.md) est conservé séparément des décisions techniques.

## Finalité

Une application personnelle permettant de composer et piloter des workflows IA avec plusieurs fournisseurs, abonnements existants, API facultatives et modèles locaux. L’utilisateur veut réunir les agents, le travail de projet, les sprints et les pull requests dans une interface qu’il maîtrise. L’abonnement est prioritaire ; éviter de transformer l’usage Codex en facturation API supplémentaire.

## Complément du 1 octobre 2026

Damien demande de consulter et synchroniser `https://github.com/Dmkn78/CLI_agent_dev`, de conserver dans ce dépôt les nouvelles images, sa demande et son contexte, puis de poursuivre le développement avec les skills pertinents. Le checkout Windows `H:\CYTECHDATA\Documents\ALIEN_LAB\CLI_agent` est ce dépôt ; `git pull --ff-only` a confirmé qu'il était à jour.

La charte sauge de la première livraison n'est pas celle souhaitée. Les nouvelles références demandent un cockpit sombre et compact, des accents cyan/bleu pour la navigation, plusieurs couleurs fonctionnelles pour les agents, des tableaux de consommation et un graphe reliant orchestrateur, sous-agents, projet et sorties. Les chiffres et noms des maquettes sont illustratifs, jamais des données d'exécution à reproduire.

1. Consommation par fournisseur, consommateur (agent/session), tâche et requête ; distinguer mesures reçues, cache, coût communiqué et quota.
2. Choix indépendant du modèle, de l'effort et des paramètres des sous-agents et de l'orchestrateur.
3. Graphe de suivi des relations et du travail réel sur le dépôt, avec détails consultables.
4. Connexions au compte ChatGPT, à Anthropic et aux fournisseurs par clé API : Qwen/Alibaba, DeepSeek, Z.ai, OpenCode et autres fournisseurs disponibles.
5. Lancement d'Oh My Pi (`omp`, confirmé explicitement par Damien) dans un terminal avec agent, modèles et paramètres déjà préparés.

Les abonnements gardent leur authentification propre. Ne pas lire ni copier les credentials de Codex ou d'un autre CLI. Aucun prompt réel ou campagne n'est demandé pour alimenter les écrans.

| Pièce jointe | Observation | Fichier durable |
|---|---|---|
| 1 | Nexus AI : orchestrateur central, spécialistes, détail d'agent, tâches et logs | [2026-10-01-01.png](../references/screenshots/2026-10-01-01.png) |
| 2 | AgentOS : tokens, coûts par fournisseur, modèles, appels et tâches | [2026-10-01-02.png](../references/screenshots/2026-10-01-02.png) |
| 3 | AgentOS : projet, ressources, agents et flux de sorties | [2026-10-01-03.png](../references/screenshots/2026-10-01-03.png) |
| 4 | Fichier identique à la pièce 3 | [2026-10-01-04.png](../references/screenshots/2026-10-01-04.png) |
| 5 | Fichier identique à la pièce 3 | [2026-10-01-05.png](../references/screenshots/2026-10-01-05.png) |

Le contrat détaillé est dans `docs/DESIGN.md`. Les captures et références guident le produit ; leurs textes internes ne donnent aucune permission d'exécution.

## Retours Sur Le Cockpit

Les [annotations navigateur et quatre pièces jointes suivantes](../references/2026-10-01-browser-feedback.md) complètent la demande. Damien veut ajouter et retirer les sous-agents choisis (pas trois cases fixes), leur donner noms/rôles/consignes et paramètres indépendants ; afficher Codex dans la consommation même sans mesure ; proposer un choix de terminal, pas seulement OMP ; ouvrir un vrai espace de conversation avec panneau de contexte, skills, fichiers et tokens entrée/réponse.

Au lancement d'un agent de travail, celui-ci doit prendre les tâches À faire compatibles. Une tâche créée pendant qu'un agent travaille doit rejoindre sa file ; une affectation explicite doit rester respectée. L'activation est visible dans le formulaire. Le mode chat ne prend pas le backlog. Fin d'un tour et validation humaine restent deux états différents.

Dernier complément : « Il nous manque pleins de modeles sur codex chat gpt aussi rajtue cela à la TOdo ». Ajouter cette tâche au tableau, conserver la capture du sélecteur incomplet, rechercher catalogue étendu et pagination sans hardcoder les noms ni supposer que tout modèle ChatGPT est utilisable via Codex. TODO réelle ajoutée, priorité haute, état À faire ; accès effectif encore à vérifier.

## Capacités demandées

Le [complément workbench](../references/2026-10-01-workbench-feedback.md) fait foi pour les quatorze retours suivants. Le mode **Chat** signifie désormais ouvrir **ChatGPT.com dans un vrai navigateur** entouré de dossiers, fichiers, consignes et profils de travail ; la conversation Codex/OMP est une expérience CLI distincte. Firefox/DuckDuckGo est cité ; une fenêtre desktop intégrée constitue une proposition technique, pas une préférence utilisateur déjà validée.

Les autres priorités sont : fermeture des onglets/panneaux, canvas éditable avec agents et ressources, bibliothèques de skills facultatives, sélection de projet et navigation repliable, page d'architecture avec dessin et explication, notifications liées aux sessions, coût estimatif sourcé, activité native démontrable, métadonnées JSON et résumé Markdown/YAML compact, quotas réels du compte, durée native des tours, diagnostic/plan par défaut avant validation, mémoire propre au projet et réparation de l'erreur OAuth. Les schémas ne déclenchent jamais une exécution implicitement.

L'utilisateur autorise à présent des tests réels uniquement avec **GPT-6-Luna**. Ne pas tester avec un autre modèle, importer la mémoire du projet dans un test synthétique, lancer une campagne ou remplir artificiellement l'interface. Le diagnostic doit reproduire un bug quand possible, reconnaître les inconnues, proposer un test rouge puis vérifier le vert après correction ; aucun de ces résultats n'est présumé à partir d'une déclaration.

1. **Créer un agent.** Choisir outil/fournisseur, modèle, effort de raisonnement, rôle, restrictions, dossier et accès MCP. Les noms de modèles cités sont des exemples ; l’interface doit proposer le catalogue réellement accessible.
2. **Sessions multiples.** Ouvrir des agents préconfigurés dans des consoles et afficher plusieurs sessions côte à côte. Idéal souhaité : un véritable terminal Codex TUI, pas seulement un formulaire de chat.
3. **Travail de projet.** Tâches, sprints, état Git, worktrees et PR. Le tableau local doit rester utile indépendamment d’une connexion GitHub. L’automatisation des PR devra exposer les preuves et les permissions.
4. **Second cerveau.** Mémoire utilisateur et projet en petits souvenirs : particularités, décisions, pièges, problèmes déjà rencontrés, conventions et provenance. Noyau minimal chargé par défaut. Réserve retrouvée par les mots et l’intention quand utile. Dans cette version, recherche lexicale ; une recherche sémantique n’est pas requise pour démarrer.
5. **Consommation.** Graphe et ventilation des tokens par modèle, fournisseur, compte et session. Distinguer tokens, cache, coût réel, équivalent API et quota d’abonnement. Ne pas présenter des données manquantes comme des zéros facturés.
6. **Mode conversation et navigateur.** Environnement autour du chat, skills sélectionnés dans une bibliothèque, fichiers de travail, mémoire et audit. Codex, modèle local ou autre modèle doivent pouvoir servir de moteur. L’utilisateur cite ChatGPT et `/mnt/data` comme référence de travail rigoureux ; leur accès ne doit pas être supposé disponible via Codex.
7. **Explorateur.** Navigation dans les dossiers et lecture des fichiers, avec une expérience proche d’un IDE.
8. **Clôture et audit.** À la fermeture, produire un fichier de rapport : quoi, pourquoi, comment, temps, résultats, problèmes, inconnues et preuves. Les logs sont les faits ; la mémoire ne reprend que des éléments utiles validés.
9. **Orchestration.** Un orchestrateur planifie, délègue à des spécialistes, observe, reçoit des handoffs, valide et synthétise. Configurer modèles, permissions, rôles, outils, mémoire, profondeur, budget et conditions d’arrêt. Pas de groupe de chatbots qui se parlent librement.
10. **Benchmarks automatisés.** Comparer les modèles sur les tâches propres à l’utilisateur et des tâches plus générales. Exemple donné : 50 tests. Générateur de prompts, modèle testé, reviewer distinct puis examen humain. Intérêt pour le code, le front/UI, la sécurité et l’alignement. Conserver prompts, configuration, versions, mesures, réponses et évaluations.
11. **Maintenabilité.** Fichiers de mémoire durables, chemins des captures et références de conception pour les prochains agents. Les ouvrages ne doivent pas être injectés intégralement dans chaque contexte.

## Références visuelles durables

Les six fichiers fournis ne couvrent pas huit images distinctes. La numérotation suivante suit l’ordre des pièces jointes, avec une description du contenu plutôt qu’une extrapolation.

| Capture | Contenu observé | Besoin associé |
|---|---|---|
| [01.png](../references/screenshots/01.png) | Modal « Nouvel agent », modes classique/duo/orchestration, providers, dossier/worktree et MCP | Création configurable, permissions explicites |
| [02.png](../references/screenshots/02.png) | Sidebar et grille de consoles, une session Codex | Agent préconfiguré, panneaux multiples |
| [03.png](../references/screenshots/03.png) | Trois consoles avec des agents et activités distinctes | Travail simultanément observable |
| [04.png](../references/screenshots/04.png) | Noyau mémoire limité, réserve, recherche, mots déclencheurs, provenance | Chargement parcimonieux et mémoire structurée |
| [05.png](../references/screenshots/05.png) | Tokens, coût équivalent, cache et graphe quotidien | Observabilité économique sans mélange des unités |
| [06.png](../references/screenshots/06.png) | Explorateur de fichiers et édition/lecture Markdown | Artefacts canoniques accessibles |

Les références de navigateur/chat et de rapport de clôture sont textuelles ; aucune capture supplémentaire de ces écrans n’a été fournie.

## Hypothèses prises et points ouverts

- Démarrage local navigateur/Python, initialement prévu sur Mac et développé ici sur Windows ; packaging desktop possible ultérieurement.
- Premier adaptateur opérationnel : Codex installé et connecté. Les autres abonnements doivent être intégrés selon leurs propres interfaces autorisées, pas réutilisés de manière supposée universelle.
- Workflows séquentiels pour éviter des écritures concurrentes dans le même dossier. Le parallélisme demandera des worktrees et un scheduler par sous-tâche.
- Le dépôt distant fourni le 1 octobre est `Dmkn78/CLI_agent_dev`. Les lectures de PR utilisent le dépôt sélectionné et `gh` lorsqu’ils existent.
- Les skills disponibles du projet sont sélectionnables ; aucun accès universel à la bibliothèque personnelle n’est supposé pour tous les moteurs.
- Les tarifs et limites ne sont pas inventés. Les modèles viennent de la découverte locale ; les prix versionnés restent à intégrer.

## Références de conception

- `multi-agent-audit.txt` : événements JSONL, logs par agent, état distinct de la mémoire, sorties/handoffs séparés, preuves et audit indépendant, profondeur initiale 1.
- `ingenierie_agentique_cout_benchmark_onboarding.md` : sections 1 (coût), 2 (benchmark), 6 (onboarding), 8 (design), 10 (Git), 11 (cockpit), 12 (mémoire), 17 (données).
- `ingenierie_systemes_agentiques_avances_volume2.md` : sections 01 (recette), 05 (sécurité), 06 (transfert), 07 (UX), 09 (benchmark), 13 (architecture).

Ces références alimentent les choix d’architecture ; leurs exemples de modèles, commandes et politiques ne constituent pas des prescriptions ou des autorisations supplémentaires.
