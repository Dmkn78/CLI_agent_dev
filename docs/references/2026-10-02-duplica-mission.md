# MISSION — DÉVELOPPER « DUPLICA AGENT »

## 0. VISION

Ajouter au projet une nouvelle fonctionnalité appelée :

# DUPLICA AGENT

Duplica Agent est un **proxy numérique de l'utilisateur**.

Ce n'est PAS simplement :

- un chatbot ;
- un orchestrateur multi-agent ;
- un agent qui envoie quelques prompts à Codex ;
- un système de notifications.

L'objectif est beaucoup plus concret :

> Duplica Agent doit être capable de remplacer l'utilisateur devant son ordinateur pendant qu'un agent comme Codex travaille.

L'utilisateur donne :

- son objectif ;
- son contexte ;
- ses préférences ;
- ses contraintes ;
- ses habitudes de décision ;
- ce qu'il accepte ou refuse ;
- les informations du projet.

Puis Duplica Agent prend le relais.

```text
Utilisateur
     ↓
DUPLICA AGENT
     ↓
ordinateur de l'utilisateur
     ↓
Codex / Claude Code / autres agents
     ↓
applications / terminal / navigateur / GitHub / Excel / IDE
```

L'idée fondamentale est :

> Duplica Agent doit faire ce qu'aurait fait l'utilisateur s'il était resté devant son PC.

---

# 1. DUPLICA AGENT = DOUBLE OPÉRATIONNEL DE L'UTILISATEUR

Duplica Agent représente l'utilisateur.

Il doit progressivement connaître :

```text
ce que veut l'utilisateur
ce qu'il ne veut pas
ses objectifs
ses préférences
ses règles
ses décisions passées
le contexte du projet
les compromis acceptables
ses méthodes de travail
les comportements attendus
```

Il doit pouvoir répondre à une question comme :

```text
"Que voudrait probablement l'utilisateur dans cette situation ?"
```

en utilisant le contexte fourni.

Il ne doit PAS inventer arbitrairement cette réponse.

Toute décision importante doit pouvoir être reliée à :

- une instruction utilisateur ;
- une préférence enregistrée ;
- une décision passée ;
- une contrainte du projet ;
- ou une règle explicite.

---

# 2. IL DOIT ÊTRE TRÈS CURIEUX

Lors de la configuration initiale d'une mission, Duplica Agent ne doit pas se contenter d'un prompt vague.

Il doit activement chercher à comprendre l'utilisateur.

Il peut lui demander par exemple :

```text
Quel résultat final veux-tu exactement ?

Qu'est-ce qui est prioritaire ?

Qu'est-ce qui est interdit ?

Que dois-je faire si Codex hésite entre deux solutions ?

Puis-je installer des dépendances ?

Puis-je modifier l'architecture ?

Puis-je créer des branches Git ?

Puis-je commit automatiquement ?

Puis-je ouvrir et manipuler les applications ?

Quels tests veux-tu absolument ?

Qu'est-ce qui te ferait considérer que le résultat est mauvais ?

Quelles décisions puis-je prendre sans toi ?

Dans quels cas dois-je obligatoirement te contacter ?
```

Il doit être **très curieux avant et pendant le travail**.

L'objectif n'est cependant pas de bloquer constamment l'utilisateur avec des questions.

Principe :

```text
Au début :
maximum de compréhension utile.

Pendant l'exécution :
maximum d'autonomie.
```

Une fois qu'une réponse a été donnée, elle doit être persistée.

Ne jamais reposer inutilement la même question.

---

# 3. MÉMOIRE PERSISTANTE DE L'UTILISATEUR

Créer par exemple :

```text
.duplica/
├── context/
│   ├── USER.md
│   ├── USER_PREFERENCES.md
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── DECISIONS.md
│   ├── PERMISSIONS.md
│   ├── TESTING.md
│   └── ENVIRONMENT.md
│
├── state/
│   ├── CURRENT_STATE.md
│   ├── TASK.json
│   ├── AGENTS.json
│   └── EVENTS.jsonl
│
├── observations/
│   ├── BUGS.md
│   ├── UX_ISSUES.md
│   └── NOTES.md
│
├── screenshots/
├── reports/
└── logs/
```

Le disque constitue la mémoire persistante.

Ne pas dépendre uniquement de la fenêtre de contexte du LLM.

---

# 4. FONCTION LA PLUS IMPORTANTE : PRENDRE LE CONTRÔLE DU PC

Cette capacité est CENTRALE.

Duplica Agent ne doit pas uniquement communiquer avec Codex par API.

Il doit pouvoir agir directement sur l'ordinateur de l'utilisateur comme le ferait un humain.

Il doit pouvoir, selon les outils disponibles :

```text
voir l'écran
comprendre l'interface
déplacer la souris
cliquer
double-cliquer
faire défiler
utiliser le clavier
écrire du texte
utiliser les raccourcis clavier
ouvrir une application
fermer une fenêtre
changer de fenêtre
cliquer sur des boutons
valider des dialogues
répondre aux demandes d'autorisation
ouvrir un terminal
exécuter des commandes
lire leur résultat
ouvrir un navigateur
naviguer dans un site
utiliser un IDE
utiliser GitHub
ouvrir Excel
manipuler une application locale
tester une interface utilisateur
```

Duplica Agent doit donc disposer d'une véritable couche :

```text
ComputerController
```

avec éventuellement :

```text
ComputerController
├── ScreenObserver
├── MouseController
├── KeyboardController
├── TerminalAdapter
├── BrowserAdapter
├── FilesystemAdapter
├── GitAdapter
├── GitHubAdapter
├── DesktopAdapter
└── ApplicationAdapter
```

Utiliser les technologies de Computer Use disponibles dans l'environnement.

L'architecture ne doit pas être dépendante d'une seule technologie.

---

# 5. BOUCLE PERCEPTION → RAISONNEMENT → ACTION

Le fonctionnement doit ressembler à celui d'un humain.

```text
OBSERVE
   ↓
UNDERSTAND
   ↓
DECIDE
   ↓
ACT
   ↓
OBSERVE RESULT
   ↓
CONTINUE
```

Exemple :

```text
Codex affiche une popup.

Duplica voit :
"Allow command npm install ?"

Duplica comprend :
installation d'une dépendance locale requise par le projet.

PERMISSIONS.md :
installation de dépendances locales = autorisée.

Duplica clique :
Allow

Puis il observe que Codex reprend son travail.
```

---

# 6. SURVEILLER CODEX COMME LE FERAIT L'UTILISATEUR

Cas principal :

```text
Utilisateur :
"Développe cette feature."

↓

Duplica transmet la mission à Codex.

↓

Codex travaille.

↓

Duplica surveille l'écran.

↓

Codex demande :
"Do you want to allow this command?"

↓

Duplica analyse.

↓

Duplica clique sur Allow.

↓

Codex continue.

↓

Codex demande une question.

↓

Duplica répond.

↓

Codex continue.

↓

Codex s'arrête.

↓

Duplica vérifie si la mission est réellement terminée.

↓

Si non :
Duplica relance Codex.

↓

Puis Duplica teste le résultat lui-même.
```

L'utilisateur n'a donc plus besoin de rester devant l'écran.

---

# 7. DÉTECTION DE L'ÉTAT DES AGENTS

Supporter notamment :

```text
RUNNING
WAITING_PERMISSION
WAITING_INPUT
WAITING_USER
IDLE
FAILED
FINISHED
INTERRUPTED
CRASHED
```

Le système doit détecter :

- une popup ;
- une demande d'autorisation ;
- une question ;
- un agent qui attend une saisie ;
- un agent silencieux ;
- un crash ;
- une tâche considérée terminée ;
- un terminal bloqué ;
- une application qui ne répond plus.

---

# 8. RÉPONDRE À LA PLACE DE L'UTILISATEUR

Lorsqu'un agent demande :

```text
"Dois-je modifier ce fichier ?"

"Puis-je supprimer l'ancienne implémentation ?"

"Quelle option dois-je choisir ?"

"Puis-je lancer cette commande ?"

"Dois-je installer cette dépendance ?"

"Quel comportement veut l'utilisateur ?"
```

Duplica doit suivre :

```text
1. analyser la question
2. rechercher dans le contexte
3. consulter les décisions précédentes
4. inspecter le projet si nécessaire
5. déduire la réponse si elle est suffisamment certaine
6. répondre directement
```

Seulement lorsque la décision n'est pas déductible :

```text
Duplica → Telegram → utilisateur
```

---

# 9. DUPLICA DOIT AUSSI RELANCER LE TRAVAIL

Une fonction majeure est la relance.

Si Codex s'arrête :

Duplica ne doit pas considérer automatiquement que le travail est fini.

Il doit inspecter :

```text
requirements
TODO
git diff
tests
logs
application
interface
bugs
résultat réellement observable
```

Puis décider :

```text
mission réellement terminée
        ↓ oui
validation finale

mission incomplète
        ↓
relancer Codex
```

Exemple :

```text
Continue from the current state.

The global objective is not finished.

Current implementation:
...

Remaining problems:
...

Observed behavior:
...

Required result:
...

Continue working from the existing implementation.
Do not restart from scratch.
```

---

# 10. DUPLICA DOIT TESTER LUI-MÊME LA FEATURE

Très important.

Duplica ne doit pas seulement croire Codex lorsqu'il dit :

```text
"Implementation complete."
```

Il doit vérifier lui-même.

Il doit pouvoir prendre le contrôle du PC et utiliser la feature comme un vrai utilisateur.

---

# 11. TEST D'APPLICATION

Exemple :

```text
Codex développe une nouvelle feature.

↓

Duplica démarre l'application.

↓

Duplica ouvre l'interface.

↓

Duplica clique sur la feature.

↓

Duplica entre des données.

↓

Duplica observe le résultat.
```

Il doit se demander :

```text
Est-ce que ça marche réellement ?

Le bouton fonctionne-t-il ?

Le résultat attendu apparaît-il ?

L'interface est-elle cassée ?

Y a-t-il une erreur ?

Y a-t-il un comportement étrange ?

Est-ce utilisable par un humain normal ?
```

---

# 12. EXEMPLE EXCEL

Si Codex développe une feature Excel :

Duplica doit pouvoir :

```text
ouvrir Excel

ouvrir le workbook

sélectionner la feuille

remplir les cellules nécessaires

cliquer sur les boutons

lancer une macro

vérifier les résultats

observer les messages d'erreur

tester plusieurs entrées

vérifier les formules produites
```

Si quelque chose ne fonctionne pas :

```text
Duplica capture le problème
↓
documente
↓
renvoie l'information à Codex
↓
Codex corrige
↓
Duplica reteste
```

---

# 13. EXEMPLE APPLICATION WEB

Pour une application web :

```text
lancer serveur

ouvrir navigateur

aller sur localhost

se connecter

naviguer

cliquer

remplir formulaire

soumettre

observer

tester résultat
```

Utiliser Playwright lorsque cela est pertinent.

Mais conserver également la possibilité de tester visuellement avec Computer Use.

---

# 14. OBSERVATEUR HUMAIN

Duplica doit faire plus que vérifier :

```text
HTTP 200
```

ou :

```text
tests passed
```

Il doit aussi détecter des problèmes qu'un humain remarquerait.

Exemples :

```text
bouton invisible

texte coupé

fenêtre bloquée

popup impossible à fermer

workflow incohérent

feature techniquement disponible mais inutilisable

chargement infini

mauvais texte affiché

action qui ne donne aucun feedback

layout cassé

résultat différent de ce qui avait été demandé
```

---

# 15. PRENDRE DES NOTES EN CONTINU

Lors de ses tests, Duplica doit noter tout ce qui semble anormal.

Exemple :

```text
[OBSERVATION 001]

Action:
Clicked "Export"

Expected:
File download starts.

Observed:
Nothing happened.

Reproducible:
Yes.

Severity:
Blocking.

Screenshot:
screenshots/obs001.png
```

Il ne doit pas seulement garder cela dans son contexte temporaire.

Il doit l'écrire sur disque.

---

# 16. BOUCLE AUTOMATIQUE DE CORRECTION

Créer cette boucle :

```text
CODEX IMPLEMENTS
       ↓
DUPLICA OBSERVES
       ↓
DUPLICA TESTS
       ↓
WORKS ?
   ↙       ↘
 NO        YES
 ↓          ↓
DOCUMENT   NEXT TEST
 ↓
SEND BUG TO CODEX
 ↓
CODEX FIXES
 ↓
DUPLICA RETESTS
```

Cette boucle doit fonctionner sans intervention utilisateur normale.

---

# 17. RAPPORT DE BUG POUR CODEX

Lorsqu'un problème est découvert :

```text
BUG ID

Context

Expected behavior

Actual behavior

Exact reproduction steps

Screenshot

Console output

Terminal output

Relevant logs

Relevant files

Severity

Possible hypothesis
```

Puis envoyer automatiquement ce rapport à Codex.

---

# 18. DUPLICA PEUT ÉGALEMENT UTILISER LE TERMINAL

Duplica doit pouvoir décider qu'une interface graphique n'est pas la meilleure solution.

Il doit pouvoir :

```text
ouvrir Terminal

cd dans le projet

git status

git diff

lancer pytest

lancer npm test

lancer build

inspecter logs

redémarrer serveur

chercher un processus

lancer une application

arrêter proprement un processus
```

Le terminal constitue simplement un autre moyen d'agir.

---

# 19. GITHUB

Si autorisé, Duplica doit pouvoir gérer le workflow Git/GitHub.

Par exemple :

```text
inspecter git status

inspecter diff

créer une branche

commit

ouvrir GitHub

consulter issue

consulter PR

répondre à Codex concernant Git

vérifier CI
```

Les opérations sensibles restent gouvernées par les permissions.

---

# 20. PERMISSIONS

Définir une politique configurable.

Exemple :

```yaml
permissions:

  computer_control: auto

  keyboard_mouse: auto

  workspace_read: auto
  workspace_write: auto

  terminal_commands: auto

  run_tests: auto
  run_local_application: auto

  browser_control: auto
  desktop_control: auto

  install_project_dependencies: auto

  git_status: auto
  git_diff: auto
  git_commit: auto

  git_push: ask

  production_deploy: ask
  payment: ask
  public_publish: ask

  read_secrets: ask
  send_private_data: ask

  destructive_system_operation: deny
```

---

# 21. TELEGRAM = LIEN AVEC L'UTILISATEUR

Duplica doit pouvoir communiquer avec l'utilisateur via Telegram.

L'utilisateur ne doit donc pas avoir à rester devant le PC.

Exemple :

```text
Duplica:

J'ai besoin d'une décision.

Codex propose :

A. conserver l'ancienne API
B. migrer l'API existante

Le projet ne contient pas suffisamment d'information pour déduire ton choix.

[A]
[B]
```

Réponse :

```text
A
```

Duplica enregistre alors :

```text
DECISIONS.md
```

et continue.

---

# 22. COMMANDES TELEGRAM

Supporter par exemple :

```text
/status

/continue

/pause

/stop

/screenshot

/logs

/current

/approve

/deny
```

Mais Telegram doit aussi comprendre du langage naturel.

Exemple :

```text
"Continue mais ne touche surtout pas à l'authentification."
```

Duplica doit :

```text
mettre à jour le contexte
↓
informer Codex
↓
continuer
```

---

# 23. ÉVITER LE SPAM

Telegram ne doit pas afficher chaque clic.

Événements importants uniquement :

```text
mission démarrée

question importante

permission sensible

bug bloquant

Codex relancé

tests terminés

mission terminée

erreur impossible à résoudre
```

---

# 24. MODE PLAN COURT PAR DÉFAUT

Le système ne doit pas perdre du temps à générer d'immenses plans.

Format :

```text
Goal

Current state

Next actions

Blocking issue
```

Puis :

```text
EXECUTE
```

L'objectif est que Duplica et Codex travaillent.

Pas qu'ils discutent éternellement du travail.

---

# 25. WATCHDOG

Ajouter un watchdog.

Il surveille notamment :

```text
activité de Codex

état de l'application

terminal

popups

questions

permissions

processus

timeouts

échecs
```

Si quelque chose semble bloqué :

```text
observe
↓
diagnose
↓
attempt recovery
↓
continue
```

Pas de redémarrage aveugle systématique.

---

# 26. RECOVERY

Après :

```text
crash

redémarrage du programme

redémarrage du PC

perte du processus Codex

perte du réseau

fermeture de fenêtre
```

Duplica doit pouvoir reconstruire l'état grâce aux fichiers persistants.

```text
LOAD STATE
↓
INSPECT MACHINE
↓
INSPECT WORKSPACE
↓
IDENTIFY LAST COMPLETED ACTION
↓
RESUME
```

---

# 27. BACKENDS D'AGENTS

Ne pas coupler toute l'architecture à Codex.

Définir :

```python
class AgentBackend:
    start()
    send_message()
    observe()
    get_status()
    respond()
    approve()
    interrupt()
    resume()
```

Premier backend :

```text
CodexBackend
```

Puis éventuellement :

```text
ClaudeCodeBackend

OpenCodeBackend

LocalAgentBackend
```

---

# 28. DIFFÉRENCE ENTRE DUPLICA ET ORCHESTRATEUR

Ne pas confondre.

Un orchestrateur décide :

```text
quel agent fait quelle sous-tâche
```

Duplica représente :

```text
l'utilisateur.
```

Architecture possible :

```text
                       ┌──── Telegram ──── User
                       │
                       ↓
                 DUPLICA AGENT
                       │
             contrôle du PC
                       │
                       ↓
               Codex / Orchestrator
                 ↙     ↓      ↘
             Agent A Agent B Agent C
```

Duplica peut superviser l'orchestrateur.

Il ne doit pas forcément le remplacer.

---

# 29. AUDIT

Chaque décision importante doit être tracée.

Exemple :

```json
{
  "actor": "duplica",
  "event": "permission_granted",
  "target": "codex",
  "action": "run npm install",
  "reason": "project dependency installation is auto-approved",
  "timestamp": "..."
}
```

Même chose pour :

```text
réponses données

actions GUI

commandes importantes

bugs détectés

relances

changements de décision

messages Telegram
```

---

# 30. QUAND CONTACTER L'UTILISATEUR

Duplica doit d'abord essayer de répondre seul.

```text
Question
 ↓
Known from context?
 ↓ yes
answer

 ↓ no

Can infer reliably?
 ↓ yes
answer + log

 ↓ no

Sensitive decision?
 ↓ yes
Telegram

 ↓ no

ask user if necessary
```

L'utilisateur doit être dérangé le moins possible une fois le contexte suffisamment riche.

---

# 31. CRITÈRE DE FIN

Codex disant :

```text
"Done"
```

n'est PAS un critère suffisant.

Une mission est terminée lorsque :

```text
requirements fulfilled

AND

implementation exists

AND

build succeeds

AND

automated tests pass

AND

Duplica has actually tested the feature

AND

expected user workflow works

AND

no blocking issue remains
```

---

# 32. MVP À CONSTRUIRE

Ne construis pas un framework gigantesque immédiatement.

## PHASE 1

Implémenter :

```text
Duplica Agent core

persistent context

ComputerController abstraction

Codex state detection

question detection

permission detection

automatic responses

automatic Codex continuation

event log

watchdog
```

## PHASE 2

```text
Telegram
```

## PHASE 3

```text
GUI testing

browser testing

desktop application testing

screenshots

bug feedback loop
```

## PHASE 4

```text
recovery

advanced user model

multiple agent backends

advanced Computer Use
```

---

# 33. END-TO-END TEST OBLIGATOIRE

Créer une vraie démonstration.

Scénario :

```text
1. utilisateur donne une mission

2. Duplica charge son contexte

3. Duplica lance Codex

4. Codex travaille

5. Codex demande une autorisation

6. Duplica observe la popup

7. Duplica analyse la permission

8. Duplica clique lui-même sur Allow

9. Codex continue

10. Codex pose une question

11. Duplica répond selon USER.md

12. Codex continue

13. Codex s'arrête

14. Duplica inspecte le résultat

15. Duplica constate que la mission n'est pas réellement terminée

16. Duplica relance Codex

17. Codex termine son implémentation

18. Duplica lance lui-même l'application

19. Duplica utilise souris/clavier

20. Duplica teste la feature comme un utilisateur

21. Duplica trouve un bug

22. Duplica prend une capture

23. Duplica écrit un rapport de bug

24. Duplica envoie le problème à Codex

25. Codex corrige

26. Duplica reteste

27. le scénario utilisateur fonctionne

28. tests automatisés verts

29. Duplica marque TASK_COMPLETED

30. Duplica envoie le résultat sur Telegram
```

Ce scénario constitue le cœur de la feature.

---

# 34. PRINCIPE DIRECTEUR

Quand tu dois choisir entre :

```text
faire parler Duplica à Codex
```

et :

```text
permettre à Duplica de réellement observer et manipuler le PC
```

prioriser la deuxième capacité.

La valeur fondamentale de Duplica est :

> PERCEVOIR LE PC + COMPRENDRE + AGIR À LA PLACE DE L'UTILISATEUR.

Il doit être capable de rester devant le poste de travail virtuellement pendant plusieurs heures pendant que l'utilisateur est absent.

Il regarde ce qui se passe.

Il répond.

Il clique.

Il écrit.

Il ouvre le terminal.

Il teste.

Il remarque les problèmes.

Il les documente.

Il demande des corrections.

Il reteste.

Il relance Codex.

Et il contacte l'utilisateur uniquement lorsqu'une véritable décision humaine est nécessaire.

---

# 35. COMMENCER L'IMPLÉMENTATION

Travaille maintenant directement dans le repository.

Commence par :

```text
1. inspecter toute l'architecture existante

2. rechercher les mécanismes existants de :
   - agents
   - Codex
   - Computer Use
   - desktop automation
   - terminal
   - browser
   - persistence
   - permissions

3. identifier ce qui peut être réutilisé

4. écrire un plan très court

5. implémenter immédiatement le MVP
```

Ne t'arrête pas après l'écriture du code.

Après chaque bloc important :

```text
IMPLEMENT
↓
RUN
↓
TEST
↓
OBSERVE
↓
FIX
↓
RETEST
```

Le MVP n'est considéré fonctionnel que lorsque Duplica peut réellement superviser une session Codex, répondre ou cliquer à la place de l'utilisateur, relancer le travail et effectuer au moins un test réel de la feature produite.