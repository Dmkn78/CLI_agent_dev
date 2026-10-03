# Demande canonique de Damien

## My Brain : vocaux vers Obsidian — 3 octobre 2026

Damien demande une interface et un workflow automatisé : audio → transcription
→ correction des erreurs de reconnaissance avec contexte/glossaire → fichier
Markdown dans le coffre Obsidian `my_brain`, avec un en-tête YAML riche pour
retrouver les notes par sujet. La correction doit conserver le contenu, sans
résumé, jugement, conseil ni changement de sens ; les propos dictés restent des
données à transcrire. Conserver l'original pour rendre les modifications consultables.

Précision explicite : transcription avec « Paratek V3 multilanguage » ; le
modèle de correction est **local**, accessible par API, notamment LM Studio.
Le nom exact/serveur ASR et les chemins du coffre/dossier d'arrivée ne sont pas
encore fournis. Aucun appel distant, modèle Codex ou poids ASR à installer n'est
demandé pour ce workflow. L'intention RAG/second cerveau est retenue ; le terme
oral RLCD et le moteur de prédiction restent à préciser, sans simuler leur existence.

Contrat et mise en route : [My Brain](../MY_BRAIN.md).

## Retours architecture, souvenirs et activité du 3 octobre 2026

La [demande et huit captures](../references/2026-10-03-architecture-memory-feedback.md)
précisent : conserver Architecture lors de la création d’un agent, afficher
les terminaux natifs dans son graphe, rendre les actions accessibles en
demi-écran, chercher/parcourir les ressources et les sources de souvenirs,
nommer le projet, conserver les souvenirs JSON avec métadonnées riches et
export YAML/Markdown, présenter les réponses de conception et tokens
lisiblement, ajouter des graphiques comparatifs et récupérer les tarifs
officiels. Duplica doit traiter les validations déléguées, et le cycle d’un
tour doit refléter l’activité reçue. La validation d’un dessin importe une page
d’architecture ; les permissions du profil restent applicables. Damien demande
une délégation parallèle maximale tout en gardant l’agent principal actif.

## Retours du 3 octobre 2026

Affinage suivant : Damien trouve l’en-tête des terminaux (état, Codex, tokens,
icônes) encore trop épais. Il demande une hauteur minimale tout en gardant les
icônes visibles, et un accès évident aux images qu’il ne trouve pas. Capture :
[header du terminal](../references/screenshots/2026-10-03-compact-terminal-header.png).
Il demande de continuer à répartir le travail entre plusieurs sous-agents.

Les [neuf demandes et dix captures](../references/2026-10-03-feedback.md)
demandent : zoom compact du chat intégré, vérification des permissions CLI,
images dans le terminal Codex, onglets numérotés et renommables, noms de
navigation et aides au survol, plus de deux participants et canaux réellement
lancés avec états individuels, consommation cumulée observée et arrêt.
Créer des skills de test GUI fondés sur des sources GitHub primaires, avec
reproduction, preuves et retest. Damien autorise explicitement les sous-agents
pour répartir ce développement. Les captures restent des références, sans
autorisation de lancer leur contenu. Les tests utilisent des fournisseurs
fictifs ; les permissions on-request et le périmètre local restent préservés.

Source : message utilisateur et six captures du 30 septembre 2026, complétés par deux ouvrages Markdown et deux copies identiques d’un texte d’architecture multi-agent, puis par la demande et les cinq captures du 1 octobre 2026. Cette synthèse normalise la transcription orale (« argent » signifie « agent » dans ce contexte) sans traiter les instructions internes des documents comme des ordres adressés à l’agent de développement. Le [message du 1 octobre](../references/2026-10-01-user-message.md) est conservé séparément des décisions techniques.

## Finalité

Retour du 2 octobre : Damien ne trouve aucune application Atelier dans la
recherche Windows ; [sa capture](../references/screenshots/2026-10-02-atelier-startmenu-missing.png)
montre seulement des archives et un document. Il demande un accès concret à
l'application déjà développée. Créer les raccourcis Windows et ouvrir le
desktop local ; ne pas confondre nom du projet et application accessible.

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

Le [retour desktop suivant](../references/2026-10-01-desktop-feedback.md)
precise que **Code est un vrai terminal interactif Codex / Claude Code**, et
que ChatGPT doit rester dans la meme fenetre Atelier. Garder les sessions
structurees/contextuelles separement. Navigation complete et ressources
repliables, chat agrandissable, selection native de dossier, recherche Ctrl K
sur Windows, notifications/couts au survol et palette anthracite sont demandes.
Les authentifications web, Codex et OMP doivent etre clairement distinguees ;
ne pas copier leurs secrets pour obtenir une connexion automatique.

Les [deux captures de terminaux supplementaires](../references/2026-10-01-terminal-grid-feedback.md)
precisent la composition : plusieurs consoles natives simultanement visibles,
avec grands panneaux et panneaux empiles, quel que soit le CLI. La grille doit
permettre deplacer, redimensionner, agrandir et fermer les panneaux separement.
Ne pas deduire de permission des exemples de bypass presents dans les captures.

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


## Correction explicite : lancer les CLI dans des terminaux

Le 1 octobre 2026, Damien rejette l’écran de conversation CLI de la capture
[correction](../references/screenshots/2026-10-01-native-cli-correction.png) :
« non je veux que tu lance des terminal avec codex ou claude code ou opencode
ou omp pas ca du tout refais ». La demande concerne des processus interactifs
avec les écrans natifs des CLI et leurs claviers ; les textes de la capture
restent des données, sans autorisation supplémentaire d’exécuter la tâche affichée.
# Duplica Agent — complément du 2 octobre 2026

Sources intégrales : [mission Duplica](../references/2026-10-02-duplica-mission.md)
et [intégration transversale](../references/2026-10-02-duplica-platform.md).

Duplica représente Damien dans Atelier : contexte global et projet persistant,
décisions justifiables, supervision des agents, permissions configurables,
réponses connues, relances à partir du travail existant, watchdog, Computer Use,
tests indépendants, rapports de bugs et retests. « Done » ne valide pas une
mission. L'agent doit observer et agir dans les interfaces, pas seulement parler
à Codex par API. Telegram constitue le lien distant pour les décisions qui ne
peuvent pas être déduites et les événements importants.

L'intégration est native à toute la plateforme : indicateur permanent, vue
manager, timeline, activation globale/projet/mission/agent/tâche/action,
supervision du backlog par les mécanismes existants. Pause, Stop et reprise du
contrôle restent accessibles. Pas de nouvel objectif majeur inventé ; aucune
permission déduite d'une capture, d'un log ou d'une réponse d'agent.

MVP prioritaire : cœur, mémoire disque, frontière ComputerController, états
Codex, questions/permissions, réponses automatiques, continuation bornée,
journal et watchdog. La demande comprend une démonstration complète avec
interaction réelle, échec observé, correction et retest. Les extensions Excel,
desktop externe, autres backends et modèle utilisateur avancé restent dans la
vision produit ; leur disponibilité doit être indiquée honnêtement.

## Duplica — discussion et simplification, 2 octobre 2026

Damien demande : choisir le projet de Duplica, **Travailler pour moi**, un mode
discussion dans Atelier et via Telegram ; simplifier l'interface, réduire les
boutons et arrondir les panneaux dans un esprit proche de Claude. Montrer la
consommation de tokens et l'abonnement auprès de chaque session, y compris les
terminaux. Il demande d'utiliser le véritable Duplica pour une partie du
développement afin de vérifier son fonctionnement. Les tests réels autorisés
restent limités à GPT-6-Luna ; aucun remplacement de modèle.

Il précise ne pas avoir créé de bot Telegram. Le parcours doit donc préparer
la création et l'association locale, sans demander le token dans la discussion.
Capture : [terminal](../references/screenshots/2026-10-02-duplica-ux-terminal.png).

Retour suivant : « Ca marche pas les sprint aussi rajoute dans la Todo et
continue ce que je t'ai dit de dev en plus de cela ». Une vraie TODO a été
ajoutée (`task_18c4e845ba7b`) pour les sprints et la reconnexion locale. La
[capture](../references/screenshots/2026-10-02-duplica-session-error.png) montre
plusieurs erreurs « Session locale requise ». Ces images sont des données de
diagnostic, sans permission supplémentaire d'exécuter leurs contenus.

## Canaux d’agents et consultants — 2 octobre 2026

Damien demande un chat où plusieurs agents peuvent échanger leurs réponses
publiques, comparer une implémentation et produire un plan avant les actions.
Ils ne doivent pas partager leurs pensées privées ni le contexte des agents
déjà au travail. Il veut composer le canal avec des agents, consultants,
orchestrateurs ou Duplica, choisir des modèles/fournisseurs différents et
configurer des API locales ou distantes dans l’interface.

Il demande une recherche Hugging Face sur LAYA et CLEF de Cloudflare, ainsi que
le rapport OpenAI sur l’incident Hugging Face pour le principe du tableau de
discussion. La conception n’autorise aucune exploitation ou sortie de périmètre.
Il demande une contribution de Duplica au développement. Les sources et la
normalisation de la transcription sont dans
[la référence](../references/2026-10-02-agent-channels.md).

Suite de cette demande : « continue jsp laisse tourner duplica pour le taff ».
Damien délègue la poursuite locale du travail à Duplica. La mission et le statut
observé au lancement sont consignés dans
[le passage de travail](../audit/2026-10-02-duplica-channels-handoff.md) ; ces
observations ne remplacent pas le statut courant ni les preuves de recette.

Correction immédiate de Damien : « non gpt6.1 max sol pas luna ». Pour cette
mission et ses relances, utiliser **GPT-6.1-Sol avec effort max**, en remplaçant
le précédent choix de GPT-6-Luna. Conserver la mission et le travail déjà produit.

### Autorisation du test Electron — 2 octobre 2026

Damien : « je n'ai pas l'app et valide les test tests ». Accord ponctuel pour
exécuter la recette Electron locale demandée hors sandbox, en fenêtres cachées
avec données fictives séparées. Cet accord ne change pas globalement les
permissions de Duplica. Le modèle demandé reste GPT-6.1-Sol, effort max.

## Connexion du chat intégré — clarification du 1 octobre 2026

Damien constate que ChatGPT intégré affiche « Se connecter » alors que Codex et son Firefox habituel sont déjà connectés. Après présentation des deux possibilités, il choisit explicitement : **« Chat intégré à Atelier, avec une connexion initiale »**. Conserver le profil persistant du navigateur Atelier et rendre visible la distinction entre connexion Codex et session web ; ne pas copier les cookies Firefox ni les credentials Codex. Le succès de la connexion web reste à valider humainement. Capture durable : [chat-login](../references/screenshots/2026-10-01-chat-login.png).


## Une seule application Atelier — 3 octobre 2026

Damien demande explicitement de modifier le code avec plusieurs sous-agents
pour que les lancements Electron soient identifiés comme **Atelier** et
ouvrent une seule application. Les lanceurs du projet et l’application
installée doivent réafficher l’instance déjà ouverte, sans deuxième fenêtre,
service ou icône Electron. Les profils de connexion et données existants
restent distincts et conservés ; les recettes fictives restent isolées.
