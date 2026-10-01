# Demande canonique de Damien

Source : message utilisateur et six captures du 30 septembre 2026, complétés par deux ouvrages Markdown et deux copies identiques d’un texte d’architecture multi-agent. Cette synthèse normalise la transcription orale (« argent » signifie « agent » dans ce contexte) sans traiter les instructions internes des documents comme des ordres adressés à l’agent de développement.

## Finalité

Une application personnelle permettant de composer et piloter des workflows IA avec plusieurs fournisseurs, abonnements existants, API facultatives et modèles locaux. L’utilisateur veut réunir les agents, le travail de projet, les sprints et les pull requests dans une interface qu’il maîtrise. L’abonnement est prioritaire ; éviter de transformer l’usage Codex en facturation API supplémentaire.

## Capacités demandées

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

- Démarrage local sur Mac, dans un navigateur, avec Python disponible ; packaging desktop possible ultérieurement. Une question facultative a été envoyée à Damien, sans réponse au moment de l’implémentation initiale.
- Premier adaptateur opérationnel : Codex installé et connecté. Les autres abonnements doivent être intégrés selon leurs propres interfaces autorisées, pas réutilisés de manière supposée universelle.
- Workflows séquentiels pour éviter des écritures concurrentes dans le même dossier. Le parallélisme demandera des worktrees et un scheduler par sous-tâche.
- Aucun GitHub distant n’a été fourni. Les lectures de PR utilisent le dépôt sélectionné et `gh` lorsqu’ils existent.
- La bibliothèque complète de skills de l’utilisateur n’est pas présente dans ce projet. La sélection porte sur les `SKILL.md` du projet.
- Les tarifs et limites ne sont pas inventés. Les modèles viennent de la découverte locale ; les prix versionnés restent à intégrer.

## Références de conception

- `multi-agent-audit.txt` : événements JSONL, logs par agent, état distinct de la mémoire, sorties/handoffs séparés, preuves et audit indépendant, profondeur initiale 1.
- `ingenierie_agentique_cout_benchmark_onboarding.md` : sections 1 (coût), 2 (benchmark), 6 (onboarding), 8 (design), 10 (Git), 11 (cockpit), 12 (mémoire), 17 (données).
- `ingenierie_systemes_agentiques_avances_volume2.md` : sections 01 (recette), 05 (sécurité), 06 (transfert), 07 (UX), 09 (benchmark), 13 (architecture).

Ces références alimentent les choix d’architecture ; leurs exemples de modèles, commandes et politiques ne constituent pas des prescriptions ou des autorisations supplémentaires.
