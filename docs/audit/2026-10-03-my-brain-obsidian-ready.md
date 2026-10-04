# My Brain — mise en service Obsidian du 3 octobre 2026

## Résultat

Damien demande d’appliquer le parcours dans Obsidian, avec le modèle déjà chargé
dans LM Studio et Parakeet, puis de préparer et transcrire des MP3 avant ses
audios personnels. Trois sous-agents ont vérifié les services, préparé une
nouvelle source et rédigé le guide ; le principal a intégré et testé le parcours.

Le coffre réel `/Users/damien/Desktop/IA_Interface_dev/my_brain` est enregistré
dans Obsidian et ouvert dans Obsidian 1.13.7. La note Sintel a été ouverte dans
l’app native : texte, provenance et 26 propriétés YAML effectivement visibles.
`Accueil My Brain.md` explique le parcours. `Tests audio/Tests MP3.md` intègre
deux lecteurs MP3 et les liens vers les transcriptions ; le lecteur Sintel
charge sa durée de 52 secondes. Aucun succès de synchronisation cloud déclaré.

## Connexions et fichiers

Contrôle natif en lecture seule, sans nouvelle inférence de diagnostic :

- FluidVoice 1.6.9 : `GET http://127.0.0.1:47733/v1/health` retourne `ok` ;
  Parakeet TDT v3 Multilingual installé/sélectionné, API et historique actifs.
- LM Studio : `/api/v1/models` confirme une instance chargée
  `qwen3.8-27b-splash` (Qwen3.8 27B Splash), également exposée par `/v1/models`.
  Nomic est identifié comme embedding non chargé, distinct du correcteur.
- My Brain : connecteur FluidVoice natif, LLM sur `127.0.0.1:1234/v1`, permission
  `vault-write`, export automatique vers `Inbox/Voix`. Configuration préservée.

Deux MP3 réguliers, copiés sans écrasement dans le coffre :

| Fichier sous `Tests audio` | Durée vidéo | Octets | Source |
|---|---:|---:|---|
| `Sintel - Trailer.mp3` | 52 s | 627 308 | [Blender](https://www.youtube.com/watch?v=HOfdboHvshg) |
| `Tears of Steel - Teaser.mp3` | 40 s | 479 276 | [Mango Open Movie](https://www.youtube.com/watch?v=WwHux5QZfC8) |

La seconde source est le teaser officiel Tears of Steel, projet Blender sous
[CC BY 3.0](https://mango.blender.org/about/), attribution inscrite dans la note.
MP3 vérifié par FFprobe : 48 kHz stéréo, 39,868667 s encodées.
SHA-256 : `f75fc74b0512b4e85efecd32332ec19db2faa8d182889a5838f0dc9f8c9bb3b4`.
Téléchargement par le helper existant, sans compte, cookie ou poids nouveau.
La provenance privée est dans `.atelier/brain-audio-ready/voice_e1da1ea71652.json`.

## Recette réelle et correction du contexte

Le MP3 Tears of Steel a été choisi via le vrai sélecteur de fichiers de My Brain,
puis traité par Parakeet et Qwen. Job `voice_298289c72202`, premier essai réussi,
statut `exported`. La note `Freaked-Out-by-the-Robot-Hand` existe dans `Inbox/Voix` ;
SHA-256 conforme à `exportSha256`. LM Studio rapporte 794 tokens entrée,
900 sortie, 1 694 total. L’expression « This is pretty freaking » reste signalée
comme ambiguë ; aucun mot manquant n’est ajouté pour la compléter.

Ce test a aussi révélé une erreur de pertinence : le pronom anglais « you »
suffisait à sélectionner les deux notes Sintel, et le LLM a proposé un tag
`fantasy-setting` absent du dialogue. Le premier export reste conservé, sans
réécriture silencieuse. `server/brain.py` filtre désormais les mots-outils
anglais et impose que les métadonnées viennent de la transcription seule.
Deux régressions fictives dans `tests/test_brain_local.py` vérifient exclusion
des voisins sans rapport et conservation du vocabulaire robot pertinent.

Après rechargement du service, la transcription brute de Parakeet a été déposée
comme `.txt` via le sélecteur UI, pour vérifier la correction sans refaire l’ASR.
Job `voice_29ceee470c7a`, `exported`, hash de note vérifié. Le seul voisin est
la note Tears pertinente ; aucune note Sintel envoyée. Qwen renvoie les tags
`robot`, `hand`, `colloquial-speech`, sans le tag hors sujet, et conserve le texte
brut et son ambiguïté. Usage observé : 713 entrée, 781 sortie, 1 494 total.
La note `Tests MP3` relie cette version et le premier export pour comparaison.

## Validation et état laissé

Commande requise avec Python 3.12 fourni :
`PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v`.
**324 tests, 322 réussis et 2 ignorés**, 62,070 s, checkout partagé comprenant
les travaux concurrents. Log privé :
`.atelier/brain-runtime-evidence/backend-obsidian-ready.log`.
Les huit tests locaux ciblés réussissent aussi. `git diff --check` réussi.
Aucun JS produit changé dans cette étape ; recette native Obsidian et deux
imports navigateur réels effectués. Les recettes synthétiques antérieures
restent décrites dans le [rapport YouTube](2026-10-03-my-brain-youtube.md).

Les actions CUA natives ont initialement montré un décalage AX/capture et un
timeout presse-papiers. Une observation complète a confirmé ensuite la note
ouverte ; les samples d’Obsidian montraient des boucles d’événements normales.
Aucun redémarrage d’Obsidian ni changement de ses réglages nécessaire.

Le service 4357 a été rechargé après file vide, avec les dix traitements déjà
présents conservés. Surveillance FluidVoice momentanément pausée puis réactivée
par son API ; le redémarrage a pris moins d’une seconde. Les historiques natifs
et sources restent conservés. Obsidian reste sur la note `Tests MP3`, My Brain
reste ouvert et prêt pour les fichiers. Les autres notes et travaux du dépôt
sont préservés. Aucun credential, inférence distante ou session Codex créé.

Preuves privées : `obsidian-ready-result.json`, `context-ready-result.json`,
`obsidian-mp3-ready.jpg`, `mybrain-context-ready.jpg` sous
`.atelier/brain-runtime-evidence/`. Les données du coffre et `.atelier/` restent
exclues de Git. Les métadonnées lexicales et la transcription ne sont pas une
mémoire validée ; statut YAML `to-review` conservé. Le test réel porte sur des
clips courts ; les limites de taille, durée et fidélité du guide restent applicables.
