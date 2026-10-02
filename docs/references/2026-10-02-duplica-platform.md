# INTÉGRATION DE DUPLICA DANS TOUTE LA PLATEFORME

Duplica Agent ne doit pas être développé comme une application séparée ou comme un simple module externe.

Il doit être **imbriqué directement dans la plateforme et dans l'interface existante que nous sommes en train de développer**.

L'objectif est que Duplica soit présent partout dans l'environnement de travail et qu'il puisse agir comme :

> ma version agentique à l'intérieur de la plateforme.

Il représente l'utilisateur à travers toute l'interface.

---

## 1. DUPLICA DOIT ÊTRE NATIF À L'INTERFACE

Duplica doit être accessible depuis l'ensemble de la plateforme.

Il ne doit pas être limité à une page particulière.

Il doit pouvoir connaître et observer :

- les projets ;
- les missions ;
- les tâches ;
- les TODO ;
- les agents ;
- les sous-agents ;
- les conversations ;
- les exécutions en cours ;
- les fichiers ;
- les workflows ;
- les tests ;
- les erreurs ;
- les permissions ;
- les états des agents ;
- les résultats produits.

Il doit disposer d'une vue globale de ce qui se passe dans la plateforme.

Conceptuellement :

```text
PLATFORM
│
├── Projects
├── Missions
├── Tasks / TODO
├── Agents
├── Codex sessions
├── Files
├── Terminal
├── Browser
├── Tests
├── Computer Use
└── DUPLICA
      ↑
      │
      └── accès transversal à l'ensemble
```

Duplica doit être une couche transversale de la plateforme.

---

# 2. ACTIVATION / DÉSACTIVATION

L'utilisateur doit pouvoir décider quand Duplica intervient.

Prévoir plusieurs niveaux.

## Global

Exemple :

```text
Duplica

[ ON / OFF ]
```

Lorsque Duplica est activé globalement, il peut superviser l'ensemble du workspace selon ses permissions.

---

## Par projet

Exemple :

```text
Project X

Duplica:
[ Enabled ]
```

Duplica supervise alors uniquement ce projet.

---

## Par mission

Exemple :

```text
Mission:
Develop authentication system

[ Run ]
[ Run with Duplica ]
```

ou :

```text
Duplica supervision:
[ ON ]
```

---

## Par agent

Exemple :

```text
Codex Agent #4

Status: Working

Duplica:
[ Supervise ]
```

---

## Par action

Certaines actions doivent pouvoir proposer :

```text
[ Execute ]

[ Execute with Duplica ]
```

Ainsi l'utilisateur peut décider que Duplica prenne en charge uniquement certaines opérations.

---

# 3. DUPLICA = USER AGENT / PERSONAL MANAGER

Duplica n'est pas simplement un superviseur technique.

Il constitue le **manager personnel de l'utilisateur** dans la plateforme.

Il doit pouvoir savoir :

```text
quel agent travaille

sur quoi

pour quelle mission

depuis combien de temps

ce qu'il a déjà réalisé

ce qu'il lui reste à faire

s'il est bloqué

s'il attend une permission

s'il a terminé

si son résultat a été testé

si une autre tâche doit être lancée ensuite
```

Duplica possède donc une vision globale :

```text
USER
  ↓
DUPLICA
  ↓
┌─────────────────────────────┐
│          PLATFORM           │
│                             │
│ Agent A → Mission A         │
│ Agent B → Mission B         │
│ Agent C → Tests             │
│ Codex   → Feature X         │
│                             │
│ TODO                        │
│ Tasks                       │
│ Bugs                        │
│ Tests                       │
└─────────────────────────────┘
```

---

# 4. VUE MANAGER

Ajouter à l'interface une vue Duplica permettant de voir rapidement :

```text
DUPLICA

Active missions: 4

Agents working: 6

Waiting for approval: 1

Blocked: 1

Tests running: 2

Completed today: 3
```

Puis par exemple :

```text
MISSION 01
Build Excel export

Codex #2
Status: Testing

Current task:
Validate exported workbook

Duplica action:
Observing Excel UI
```

Autre exemple :

```text
MISSION 02
Authentication redesign

Agent:
Codex #5

Status:
Waiting for permission

Request:
Modify database migration

Duplica:
Analyzing request...
```

---

# 5. DUPLICA DOIT MANAGER LES TODO

Duplica doit avoir accès aux TODO de la plateforme.

Il doit pouvoir identifier :

```text
TODO
 ↓
non assigné
 ↓
agent disponible
 ↓
assignation possible
```

Mais il ne doit pas nécessairement devenir l'orchestrateur principal.

Il peut demander à l'orchestrateur existant de lancer une tâche.

Exemple :

```text
Duplica:

Mission principale toujours incomplète.

Remaining TODO:

[ ] Fix Excel export
[ ] Test Windows
[ ] Update documentation
```

Il peut alors faire continuer le workflow.

---

# 6. DUPLICA DOIT CONNAÎTRE LE RÔLE DE CHAQUE AGENT

Pour chaque agent :

```text
Agent ID

Agent type

Model

Mission

Current task

Current status

Last action

Current files

Permissions

Start time

Last activity

Dependencies

Blocking issue
```

Duplica doit donc pouvoir répondre à :

```text
Qui travaille actuellement ?

Sur quoi ?

Pourquoi ?

Quel agent est bloqué ?

Quel agent attend quelque chose ?

Qu'est-ce qui est terminé ?

Qu'est-ce qui reste à faire ?
```

---

# 7. DUPLICA DOIT POUVOIR INTERVENIR

Depuis cette vision globale, Duplica peut :

```text
répondre à un agent

autoriser une action

refuser une action

envoyer une instruction

relancer un agent

faire continuer une mission

mettre une mission en pause

lancer un test

ouvrir l'application

inspecter un résultat

documenter un bug

demander une correction

réassigner une tâche si l'architecture le permet
```

---

# 8. CONTRÔLE DU PC INTÉGRÉ À LA PLATEFORME

L'accès Computer Use de Duplica doit être directement relié à l'interface.

Par exemple :

```text
Duplica
   ↓
Mission X
   ↓
Codex
   ↓
Needs interaction
   ↓
ComputerController
   ↓
PC
```

Il peut alors :

```text
ouvrir la fenêtre concernée

observer Codex

cliquer sur Allow

ouvrir Terminal

tester l'application

ouvrir Excel

naviguer dans le navigateur

revenir dans la plateforme
```

---

# 9. DUPLICA DOIT VOIR L'INTERFACE ELLE-MÊME

Très important :

Duplica doit également pouvoir comprendre et manipuler **notre propre plateforme**.

Il peut par exemple :

```text
ouvrir une mission

sélectionner un agent

ouvrir les logs

voir les TODO

lancer une tâche

cliquer sur Resume

consulter un rapport

ouvrir Computer Use

changer de workspace
```

Il agit donc également dans la même interface que l'utilisateur.

---

# 10. MODE "TRAVAILLE POUR MOI"

Prévoir idéalement un mode clair :

```text
WORK FOR ME

[ Activate Duplica ]
```

Lorsque ce mode est activé :

Duplica prend en charge la supervision quotidienne du travail.

Il observe :

```text
missions

agents

TODO

questions

permissions

tests

bugs

résultats
```

et agit lorsque cela est nécessaire.

L'utilisateur peut quitter son PC.

---

# 11. CONTEXTE GLOBAL + CONTEXTE LOCAL

Duplica doit avoir deux niveaux de contexte.

## Contexte global

```text
qui est l'utilisateur

ses préférences

ses habitudes

ses règles

ses permissions

ses décisions générales
```

## Contexte local

Pour chaque projet :

```text
objectif

architecture

missions

agents

TODO

décisions

contraintes

historique
```

Ainsi Duplica reste :

```text
la même représentation de l'utilisateur
```

tout en comprenant les différents projets.

---

# 12. DUPLICA DOIT AVOIR UNE MÉMOIRE DES DÉCISIONS

Exemple :

L'utilisateur dit :

```text
"N'utilise jamais Firebase sur ce projet."
```

Duplica enregistre cette décision.

Plus tard Codex demande :

```text
"Can I use Firebase for authentication?"
```

Duplica répond automatiquement :

```text
No.

Project decision:
Firebase must not be used.
```

L'utilisateur ne doit pas avoir à répéter son choix.

---

# 13. DUPLICA DOIT ÊTRE PROACTIF

Il ne doit pas uniquement attendre des questions.

Exemple :

```text
Agent A termine.

↓

Duplica inspecte la mission.

↓

TODO suivant disponible.

↓

Duplica demande à l'orchestrateur de continuer.
```

Autre exemple :

```text
Codex dit "done".

↓

Duplica ouvre l'application.

↓

fonction cassée.

↓

Duplica crée bug.

↓

renvoie Codex dessus.
```

---

# 14. MAIS PAS D'ACTIONS ARBITRAIRES

Duplica représente l'utilisateur.

Il doit donc respecter :

```text
contexte

permissions

scope du projet

instructions

décisions précédentes
```

Il ne doit pas inventer de nouveaux objectifs importants simplement parce qu'il a accès à toute la plateforme.

Son autonomie concerne principalement :

```text
faire avancer les objectifs déjà définis.
```

---

# 15. INTERFACE DUPLICA

Prévoir un composant persistent dans l'UI.

Par exemple :

```text
┌─────────────────────┐
│ DUPLICA             │
│                     │
│ ● ACTIVE            │
│                     │
│ 5 agents running    │
│ 1 waiting           │
│ 2 tests             │
│                     │
│ Current focus:      │
│ Project Alpha       │
│                     │
│ [Open]              │
│ [Pause]             │
└─────────────────────┘
```

Ou un bouton global :

```text
DUPLICA ●
```

toujours accessible dans la barre principale.

---

# 16. TIMELINE DUPLICA

Ajouter une timeline permettant de voir ce que Duplica a fait.

Exemple :

```text
10:31
Codex requested permission.

10:31
Duplica approved npm test.

10:36
Codex stopped.

10:37
Duplica detected incomplete TODO.

10:37
Codex resumed.

10:48
Implementation completed.

10:49
Duplica launched application.

10:51
Bug detected in export.

10:52
Bug sent back to Codex.

11:04
Fix completed.

11:06
Retest successful.
```

---

# 17. L'UTILISATEUR PEUT REPRENDRE LE CONTRÔLE À TOUT MOMENT

Toujours fournir :

```text
Pause Duplica

Stop Duplica

Take control
```

Lorsque l'utilisateur reprend le contrôle, Duplica doit arrêter d'interagir avec l'interface concernée jusqu'à ce qu'il soit réactivé.

---

# 18. DUPLICA EST UNE COUCHE GLOBALE

Conceptuellement, ne pas construire :

```text
Platform
+
petit plugin Duplica
```

Construire plutôt :

```text
                 USER
                   ↕
                DUPLICA
                   ↕
        ┌────────────────────┐
        │      PLATFORM      │
        │                    │
        │ Projects           │
        │ Missions           │
        │ Agents             │
        │ Tasks              │
        │ TODO               │
        │ Computer Use       │
        │ Terminal           │
        │ Browser            │
        │ Tests              │
        │ Files              │
        └────────────────────┘
```

Duplica doit pouvoir interagir transversalement avec tous ces composants selon ses permissions.

---

# 19. OBJECTIF PRODUIT

À terme, l'expérience doit devenir :

```text
Utilisateur :

"Je veux cette feature."

↓

Duplica comprend la mission.

↓

Les agents travaillent.

↓

Duplica les supervise.

↓

Duplica répond aux questions.

↓

Duplica valide les autorisations.

↓

Duplica regarde les TODO.

↓

Duplica relance les agents.

↓

Duplica contrôle le PC.

↓

Duplica teste l'application.

↓

Duplica détecte les bugs.

↓

Les agents corrigent.

↓

Duplica reteste.

↓

Utilisateur reçoit :

"Terminé."
```

L'utilisateur ne doit plus avoir besoin de manager manuellement chacun des agents.

C'est précisément le rôle de Duplica.

---

# 20. PRINCIPE FINAL

Duplica est :

> l'utilisateur transformé en agent à l'intérieur de la plateforme.

Il dispose :

```text
du contexte de l'utilisateur

de la vision globale de la plateforme

de l'état de tous les agents

des missions

des TODO

des permissions

du Computer Use

du terminal

des outils de test

de la mémoire des décisions
```

et utilise tout cela pour faire avancer le travail à la place de l'utilisateur.

Lors de l'implémentation de Duplica, il faut donc penser la fonctionnalité comme une **capacité native de la plateforme**, activable ou désactivable selon le projet, la mission, l'agent ou l'action, et non comme un outil isolé ajouté après coup.