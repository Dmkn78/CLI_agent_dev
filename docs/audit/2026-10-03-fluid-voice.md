# Fluid Voice → My Brain — 3 octobre 2026

## Demande et constat

Damien demande de relier réellement Fluid Voice et Parakeet V3, de corriger
le sélecteur macOS et de laisser le LLM déduire les contextes variables.
Le paramétrage d’une API audio générique était insuffisant pour son logiciel.
Le fallback web de `projects/pick` refusait tous les systèmes hors Windows.

Installation observée : Fluid Voice **1.6.9**, domaine `com.FluidApp.app`,
modèle actif **Parakeet TDT v3 multilingual** dans son interface. Les cinq
composants CoreML attendus sont présents sous
`~/Library/Application Support/FluidAudio/Models/parakeet-tdt-0.6b-v3-coreml/`.
Les coffres déclarés dans Obsidian sont Centrale et IA ; aucun coffre déclaré
ne s’appelle my_brain. Le nouveau dossier local du projet `my_brain/` est
préparé comme destination et exclu de Git. Il a ensuite été ouvert dans
Obsidian par **File → Open Vault → Ouvrir un dossier comme coffre**, avec
le sélecteur natif macOS. La fenêtre **my_brain** et son dossier Inbox sont
observés, et son chemin est vérifié dans `obsidian.json`.

## Changements

- Découverte locale des métadonnées Fluid Voice et des chemins de coffres
  Obsidian. Aucun provider, compte, cookie, clé ou log n’est importé.
- Catalogue LM Studio typé pour filtrer les embeddings et sélectionner
  l’unique générateur chargé observé ; autres API compatibles conservées.
- Connecteur natif Fluid Voice `/v1/transcribe` : JSON avec chemin privé,
  sans credentials du LLM. Le modèle utilisé reste celui actif dans Fluid Voice.
- Réception directe des futurs `rawText` depuis son historique de préférences
  macOS : date Swift convertie depuis 2001, frontière d’activation, identité
  de dictée, pas d’import du passé ni accès au presse-papiers.
- Contexte automatique par dictée, enrichi de trois notes proches au maximum
  (titres/extraits bornés), chemins consultables et conservés dans le YAML.
  Repères personnels facultatifs et repliés.
- Sélecteur natif macOS ajouté au chemin navigateur, annulation et expiration
  explicites ; la branche Electron conserve son `showOpenDialog` existant.
- UI avec détection, source de réception, connecteur audio natif et état
  observable du suivi. Conservation des règles de fidélité et des permissions.

## Vérifications

- Suite backend complète : **215 tests**, **213 réussis**, **2 ignorés**.
  Journal privé `.atelier/fluid-voice-backend-tests.log` ; Python 3.12 fourni.
- Vérification finale après les autres évolutions du projet partagé :
  **322 tests**, **320 réussis**, **2 ignorés**, journal
  `.atelier/fluid-voice-backend-tests-final.log`. Syntaxe JS/CJS vérifiée.
- Six tests supplémentaires : sélecteur macOS simulé (choix, annulation,
  échec/expiration), découverte limitée aux champs autorisés, texte brut/date
  Swift, API JSON Fluid Voice, dictées futures distinctes/export/pause,
  contexte retrouvé sans domaine/glossaire imposé.
- Recette navigateur isolée réussie : bouton Choisir → chemin visible,
  détection → sélection automatique, réception Fluid Voice → original/YAML
  et export, fichiers audio via protocole natif fictif, recherche et persistance.
  Largeurs 1500/900/390/300, aucune erreur JS ou requête échouée. Les fixtures
  n’interrogent ni l’installation utilisateur ni un modèle réel.
- Preuves privées `.atelier/brain-browser-evidence/result.json` et captures.
  Deux erreurs initiales de locators ont été corrigées ; chaque recette
  complète repart d’un nouveau stockage synthétique.
- La branche macOS du sélecteur est vérifiée par doubles de processus et par
  la route navigateur simulée. Un appel du vrai bouton est déclenché sur Mac ;
  son dialogue osascript n’est pas contrôlable par le catalogue d’apps CUA.
  Une sélection native par l’agent n’est donc pas déclarée validée.

## Configuration réelle et limites

Le service My Brain déjà ouvert sur 4357 a été rechargé avec ses données
propres. Atelier installé et ses sessions ne sont pas arrêtés. Le LLM
`qwen3.8-27b-splash` est sélectionné depuis le catalogue local réel de
`127.0.0.1:1234`, sans inférence de démonstration.
Destination : `/Users/damien/Desktop/IA_Interface_dev/my_brain/Inbox/Voix`.
Création de nouvelles notes et export automatique activés selon la demande.
L’historique textuel de Fluid Voice est activé dans son interface, sans
enregistrement audio ajouté. Le bouton Activer la surveillance est utilisé
et l’interface confirme **Nouvelles dictées Fluid Voice suivies**.

Lors de la préparation, son API était activée en préférence mais la route de
santé sur 47733 ne répondait pas. Un accord a été demandé avant une relance
ouvrant les endpoints locaux. Pendant les autres travaux sur la machine,
l’API est devenue active : `GET /v1/health` retourne `status=ok`, `version=1.6.9`.
La demande de relance n’a donc plus lieu d’être ; aucune relance n’est exécutée
par ce travail. Le service My Brain a aussi été redémarré entre-temps : le suivi
est réactivé dans l’interface et `watching=true`, `watchError=null` sont vérifiés.
Le suivi de dictées par préférences ne dépend pas de cette API.

Deux traitements issus des autres interactions locales sont maintenant
**exported**, une source YouTube et un fichier audio. Leurs fichiers Markdown
existent dans le coffre, avec empreintes d’export observées dans l’état. Ce
travail n’a pas lancé/rejoué ces inférences et ne prétend pas à une validation
humaine de leur fidélité. La capture réelle
`.atelier/brain-browser-evidence/fluid-voice-live.png` montre le suivi actif,
les connexions/destination et les deux exports observés. La capture viewport
est conservée ; la capture fullPage du contrôleur IAB déformait le rendu alors
que les dimensions DOM restaient normales, et n’est pas utilisée comme preuve.
Les bornes de taille, la recherche lexicale (pas de RLCD entraîné) et la reprise
explicite après redémarrage restent celles du contrat My Brain.

## Sources primaires

Mise à jour ultérieure : le test YouTube explicitement demandé a permis de
diagnostiquer le blocage de l’API, de corriger la préparation des fichiers et
de vérifier deux transcriptions/corrections/exports réels. Le service est sain.
La surveillance a été mise en pause après redémarrage, puis réactivée depuis
selon le dernier contrôle de l’interface. Voir le
[rapport My Brain YouTube](2026-10-03-my-brain-youtube.md) pour l’état final et
les preuves ; les observations ci-dessus décrivent l’étape antérieure.

[API d’inférence Fluid Voice v1.6.9](https://github.com/altic-dev/FluidVoice/blob/v1.6.9/Sources/Fluid/Services/LocalAPI/InferenceAPIController.swift),
[historique natif](https://github.com/altic-dev/FluidVoice/blob/v1.6.9/Sources/Fluid/Persistence/TranscriptionHistoryStore.swift),
[port et activation](https://github.com/altic-dev/FluidVoice/blob/v1.6.9/Sources/Fluid/Services/LocalAPI/LocalAPIModels.swift).
