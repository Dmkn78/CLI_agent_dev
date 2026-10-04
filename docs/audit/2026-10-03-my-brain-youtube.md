# My Brain — YouTube, fichiers et test réel du 3 octobre 2026

## Résultat

Demande : retrouver MyBrain, télécharger une vidéo YouTube en MP3, la transcrire
avec l'IA locale, vérifier le résultat et préparer le dépôt de fichiers. Damien
demande une délégation maximale : téléchargement, UI/recette et diagnostic ASR
ont été répartis entre trois sous-agents, avec intégration et test réel par le principal.

Le service **http://127.0.0.1:4357/#brain** utilise ce dépôt et les données
privées `.atelier/my-brain-interface`. Un lien YouTube déclenche une file
téléchargement → MP3 → ASR local → correction locale → note Markdown/YAML.
Le dépôt audio/texte accepte plusieurs ajouts et le retrait individuel.
Brouillons conservés, erreurs visibles, provenance et MP3 accessibles.

## Changements

- `server/brain_media.py` : URL YouTube unique normalisée, outils locaux
  détectés, yt-dlp sans shell/config/cookies/plugins/composants JS distants,
  téléchargement/conversion bornés, annulation des processus et publication
  atomique sans écrasement. Durée, titre, URL, ID et SHA-256 observés conservés.
- `server/brain_audio.py` : FFprobe/FFmpeg locaux, WAV PCM mono 16 kHz,
  segments de 240 secondes, temporaires système privés hors Desktop,
  suppression après succès/échec/annulation, source conservée. Pas de poids neuf.
- `server/brain.py`, `run.py` : source YouTube asynchrone, états et relance,
  hash de tous les audios vérifié avant ASR, MP3/audio accessibles seulement
  avec Host/Origin/nonce, YAML de provenance. MP3 complet conservé même si
  une annulation survient juste après publication.
- `web/brain.js`, `web/brain.css` : formulaire YouTube, états, download avec
  renouvellement du nonce, fichiers cumulatifs et retrait, brouillons par projet,
  erreurs persistantes, disposition responsive dont pipeline en colonne à 300 px.

Les évolutions FluidVoice/choix de dossiers déjà présentes et les autres travaux
concurrents du dépôt ont été conservés. Aucun commit, campagne Codex, credential
CLI, nouveau modèle ou serveur distant d'inférence n'a été utilisé.

## Diagnostic rouge puis correction

FluidVoice 1.6.9 et Parakeet TDT v3 étaient installés. LM Studio répondait sur
1234 avec le modèle chargé `qwen3.8-27b-splash`, découvert depuis le catalogue.
La préférence native `LocalAPIEnabled` a été activée, puis FluidVoice relancé.
`/v1/health` a confirmé `ok` et la version 1.6.9.

Le premier MP3 de 52 secondes a dépassé le délai HTTP de 120 s. Après relance,
le même contenu en WAV dans le dépôt Bureau a aussi bloqué l'app et son health.
Le sample privé `fluidvoice-blocked-62995.txt` montre 870 échantillons du thread
principal dans `transcribeFileForAPI → validateDurationWithinLimit → AVAudioFile
→ open`, avant toute inférence CoreML. L'accès macOS au dossier Desktop protégé
est la cause probable ; ce diagnostic ne prétend pas prouver l'état TCC interne.

Un WAV copié dans un temporaire système privé a renvoyé le texte en **0,258 s**,
avec `provider: Parakeet TDT v3 (Multilingual)` et 835 584 samples. Le parcours
de préparation hors Desktop est maintenant appliqué à tous les fichiers du
connecteur FluidVoice. Aucun accès général au Bureau n'a été ajouté à cette app.
Le découpage évite aussi la limite native de 300 s par fichier de cette version.

FluidVoice écoute sur un listener système `*:47733` ; sa version filtre les
connexions entrantes hors `127.0.0.1`, `::1` et localhost avant traitement.
Ne pas décrire ceci comme un bind strict loopback. Atelier appelle uniquement
loopback, sans proxy ni redirection. L'API d'ASR applique les réglages natifs
dictionnaire/ponctuation/mots parasites, puis MyBrain conserve ce texte retourné
comme original de transcription ; l'audio reste la source de référence.

## Preuves réelles

Source : [trailer officiel Sintel publié par Blender](https://www.youtube.com/watch?v=HOfdboHvshg).
Vidéo de **52 s**, MP3 de **627 308 octets**, SHA-256
`315e0e47efce9c676afec9c614a211e2336cf7534a65432afde75b8b7e27873f`.

1. Import via formulaire YouTube, job `voice_57186c901348`. Après correction
   et relance depuis le MP3 conservé : `exported`, original de 155 caractères,
   ponctuation corrigée, un passage ambigu signalé. Qwen a renvoyé une consommation
   de **585 tokens entrée, 781 sortie, 1 366 total**. Aucun coût inventé.
2. Dépôt du même MP3 par le sélecteur de fichiers du navigateur, job
   `voice_8407a77a7788` : `exported` au premier traitement ; mêmes octets audio
   vérifiés, original et correction de 155 caractères, **668 entrée, 860 sortie,
   1 528 total** renvoyés par LM Studio.

Les deux notes existent sous le coffre configuré
`my_brain/Inbox/Voix/2026-10-03-Quest-in-the-Land-of-the-Gatekeepers-voice_….md`.
Leur hash correspond à l'export enregistré et le YAML garde `status: to-review`.
La première note conserve la provenance YouTube, la seconde celle du fichier déposé.
Le téléchargement audio authentifié renvoie les mêmes octets que la source.

Preuves privées conservées sous `.atelier/brain-runtime-evidence/` :
`real-result.json`, `mybrain-real-success.jpg`, sample du blocage. Réponse de
l'essai PCM isolé dans `.atelier/my-brain-interface/brain/wav-test-result.json`.
Les modèles n'ont pas reçu de mémoire de développement ; le correcteur local
peut recevoir les courts extraits des notes voisines selon `autoContext` configuré.

## Vérification reproductible

Commande backend requise exécutée avec Python 3.12 fourni :
`PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v`.
**313 tests : 311 réussis, 2 ignorés**, durée 57,597 s. Journal privé :
`.atelier/tools/media/backend-tests-final.log`. Cette suite reflète le checkout
partagé au moment du test, y compris les travaux concurrents.

28 tests media fictifs, 13 tests de préparation audio fictifs et cinq tests
de la file YouTube couvrent limites, chemins, hash, annulation, source conservée,
relance tardive, provenance et nonce. Le test FluidVoice utilise un double de
préparation ; le codec réel est vérifié par l'essai PCM et les deux imports réels.
Syntaxe Node vérifiée sur `web/brain.js` et les deux recettes navigateur.

Recette Electron synthétique dédiée : `tests/brain_youtube_fixture.py` puis
`tests/brain_youtube_acceptance.cjs`, API/coffre/audio fictifs isolés, sans Internet.
**Passed**, un download/ASR/LLM fictif, MP3 exact et MIME `audio/mpeg`, download
depuis le bouton, nonce périmé puis renouvelé (200/403/200), URL canonique/YAML,
texte conservé, cumul/retrait de fichiers, lien invalide visible, aucune écriture
en lecture seule. Largeurs **1500, 900, 390, 300**, captures inspectées, zéro
erreur JS/requête échouée. Preuves `.atelier/brain-youtube-evidence/result.json`.
L'attente initiale de l'événement download Playwright n'est pas supportée dans
ce harness Electron : observation remplacée par `will-download`, échec conservé
sous `previous-failures`. Aucun faux bug produit déclaré. Fixture arrêtée.

## État laissé et limites

Service réel et onglet MyBrain laissés ouverts. FluidVoice et LM Studio restent
disponibles ; configuration locale et export automatique préexistants conservés.
La surveillance a été **mise en pause au redémarrage**, conformément au contrat.
Le dernier contrôle de l’interface affiche **Nouvelles dictées Fluid Voice
suivies** : cet état réactivé depuis est conservé, sans nouvelle modification
de préférence par ce travail. Le JSON de preuve garde l’état observé au moment
des exports ; la capture finale montre celui de la clôture.
Les imports manuels sont immédiatement utilisables. `.atelier/` et `my_brain/`
restent exclus de Git ; les deux sources et notes de test sont conservées.

Bornes : 20 fichiers par sélection, 20 Mo/audio, 20 min de préparation FluidVoice
et de vidéo YouTube, transcription totale 16 000 caractères. Une frontière de
segment peut couper un mot ; fidélité à relire, pas de validation humaine simulée.
Le délai de préparation de 180 s est vérifié autour des requêtes HTTP, chacune
gardant son timeout configuré : ce n'est pas une garantie murale stricte.
L'essai réel porte sur un clip de 52 s ; le cas long est testé avec fournisseur
fictif, pas validé par une longue inférence réelle. Le coffre reçoit les fichiers
Markdown ; l'ouverture et la synchronisation par Obsidian ne sont pas vérifiées.
Recherche lexicale, sans entraînement RLCD ou embeddings ajoutés.

Sources primaires de protocole : [yt-dlp](https://github.com/yt-dlp/yt-dlp),
[API FluidVoice 1.6.9](https://github.com/altic-dev/FluidVoice/blob/v1.6.9/Sources/Fluid/Services/LocalAPI/InferenceAPIController.swift),
[listener et filtre](https://github.com/altic-dev/FluidVoice/blob/v1.6.9/Sources/Fluid/Services/LocalAPI/LocalAPIServer.swift),
[décodeur audio](https://github.com/altic-dev/FluidVoice/blob/v1.6.9/Sources/Fluid/Services/LocalAPI/LocalAPIAudioDecoder.swift).
