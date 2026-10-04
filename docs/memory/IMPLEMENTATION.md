# État de l’implémentation — Duplica, 2 octobre 2026

## Canaux : tours choisis et archive persistante — 4 octobre 2026

Les limites imposées de 6/50 tours sont retirées. Une limite positive peut
être choisie ; le mode accord des participants accepte aussi aucun plafond,
avec arrêt manuel. Les anciens choix restent conservés, défaut 24 si absent.

Messages et tours sont archivés séparément en SQLite, avec migration et
publication atomiques. L'archive ne bloque plus sur 512 messages, 240 000
caractères ou 140 tours. Les réponses publiques et les tours, même sans
message, se consultent par pages ; le contexte des modèles reste borné et
les omissions comptées exactement. La récupération des anciennes réponses
natives refusées pour capacité exige une attribution unique et complète.
Elle ne rejoue aucun appel et refuse les sources privées ou ambiguës.

Vérification d'une copie réelle : 142 messages publiés identiques et deux
réponses finalisées récupérées, soit 144 messages et 240 935 caractères.
Une seconde ouverture ne duplique rien. Suite backend complète : 446 tests,
444 réussis, deux ignorés. Recette Electron réussie sur 650 messages, reprise
jusqu'à 652, navigation avant/après/derniers, fenêtre 300 messages / 480 000
caractères et scroll conservé. Rechargement borné à quatre pages, deux
observées. Courses de réponse tardive et restauration échouée corrigées puis
revues indépendamment. Runtime isolé compilé, migration HTTP de 530 messages
sans inférence et hashes des fichiers embarqués vérifiés.

L'instance installée et ses cinq terminaux Codex ouverts restent conservés.
Activation toujours en attente de l'accord au redémarrage demandé auparavant ;
les deux réponses récupérées ne sont encore publiées que dans la copie de
validation. Aucun débat réel relancé.
Voir [rapport et preuves](../audit/2026-10-04-channels-history.md).

## Consommation Codex automatique — 3 octobre 2026

Le service local relit les quotas natifs Codex automatiquement toutes les
600 secondes, après une première découverte ou lecture manuelle. La boucle
fonctionne indépendamment de la page affichée ; plusieurs fenêtres ne créent
pas plusieurs lectures. Les appels simultanés partagent la lecture en cours,
et une tentative manuelle repousse la prochaine lecture de dix minutes.
Le mode `--no-discovery` n'active pas la boucle de lui-même.

La dernière mesure et sa date sont conservées après une erreur, affichée
dans le panneau partagé des vues Consommation et Connexions. La reconnexion
réveille la boucle et l'arrêt du service la termine. Seul le RPC officiel
`account/rateLimits/read` est utilisé pour les quotas ; aucun tour de modèle
ni lecture des credentials par Atelier. Les quotas restent ceux du compte,
partagés avec les autres clients Codex.

Validation : suite backend complète de 423 tests (421 réussis, 2 ignorés),
douze tests dédiés et seize tests Workbench vérifiés sur les dernières gardes,
syntaxiques/suites JS et recette Electron à fournisseur fictif réussies.

Livraison dans les sources. L'instance installée ouverte et ses cinq terminaux
Codex ont été conservés : elle ne charge pas ce correctif à chaud. Après sa
fermeture, le lanceur du projet démarre les sources corrigées. Voir le
[rapport et les vérifications](../audit/2026-10-03-codex-quota-refresh.md).

## Canaux : Markdown, API, skills et critique — 3 octobre 2026

Les canaux rendent maintenant le Markdown sûr et distinguent leurs huit
participants par couleur stable. Connexions propose LM Studio/oMLX/Splash/API
personnalisée, normalise `/v1`, découvre les catalogues et distingue les
embeddings si leur type est connu. Splash chargé via LM Studio a répondu à
l'essai court demandé, 1 846 ms et 119 tokens réellement communiqués ; le
service Splash 8001 exige une clé, oMLX 8000 ne répondait pas.

Chaque participant LLM peut recevoir jusqu'à huit skills/consignes du projet,
figés au lancement et traçables par hash. Les symlinks sont refusés ; les
fichiers référencés, outils et permissions ne sont pas ajoutés. SystemOne ne
reçoit pas de procédures textuelles. Nouveau rôle Questionneur/contradicteur,
identité explicite et consignes critiques sans désaccord artificiel. Le
contexte borné privilégie demandes utilisateur et dernières positions ;
troncatures/omissions visibles, même snapshot de tour pour tous les pairs.

386 tests backend (384 réussis, 2 ignorés), tests Node et recettes Electron
Markdown/skills/API réussis. Runtime isolé compilé et smoke test HTTP sans
inférence réussi. API enregistrée et carte `task_46e06dbd165f` En revue dans
l'instance installée, quatre skills de test ajoutés au projet ouvert. Activation
du runtime en attente du choix utilisateur : cinq terminaux Codex ouverts
seraient fermés au redémarrage. Installation actuelle conservée. Les prompts
critiques ne garantissent pas à eux seuls le comportement réel des modèles.
Voir [rapport et preuves](../audit/2026-10-03-channels-markdown-api-skills.md).

## Duplica : runner et équipes parallèles — 3 octobre 2026

« Travailler pour moi » lance maintenant un `duplicaRun` persistant et une équipe
de plateforme : 1–8 workers, plan de 1–20 mini-tâches, dépendances, conflits de
fichiers/dossiers sérialisés, review/audit/synthèse et recette indépendante.
Il peut prendre les TODO compatibles puis attendre les suivants, sans fabriquer
du travail. Modèle/effort découverts et explicitement sélectionnés, permissions
on-request et lecture seule/écriture projet conservées. Pause et reprise ne
rejouent pas les effets interrompus ; la reprise garde la configuration initiale.

Quatre skills Duplica sont injectés selon les rôles. La découverte examine les
racines de skills avant les artefacts build/dist ; les quatre skills sont présents
dans le catalogue réel. Le contrôleur Electron sait effectuer un vrai survol.
Les permissions et observations sont liées à la configuration de recette ; les
callbacks tardifs ne rouvrent pas les sessions. Le dossier reste réservé pendant
la vérification et les TODO demeurent En revue pour la recette humaine.

Validation finale : 322 tests backend (320 réussis, 2 ignorés), 26 nouveaux tests
du harnais, 80 fichiers JS/CJS valides, 10 suites JS et recette Electron réussie
(8 tâches, 4 agents fictifs simultanés, reprise, vrai processus de test et survol
Architecture, 1200/800/390 px). Aucune inférence réelle. Le catalogue du CLI Codex
local consulté contient 9 modèles mais ne propose pas GPT-6.1-Sol demandé ; aucun
remplacement silencieux. Le contrôle externe du PC reste absent ; une recette
non définie reste Preuves manquantes. Sources seulement, installation conservée.
Voir le [contrat](../DUPLICA_HARNESS.md) et le
[rapport avec preuves et limites](../audit/2026-10-03-duplica-harness.md).

## My Brain : YAML v3 et conservation du texte — 3 octobre 2026

Le YAML v3 remplace l’en-tête technique v2 par 14 propriétés plates, de types
stables et dans un ordre fixe. Les listes sont rendues en YAML bloc. Les IDs,
hashes, modèles, comptes et provenance détaillée restent dans le suivi privé.
`content_types` est une liste à vocabulaire fermé pour des contenus mixtes,
dont réflexion, dialogue, récit et conseil à soi. Contrat et sources officielles
Obsidian/LM Studio/CLEF dans `docs/MY_BRAIN.md`.

Le prompt système exige copie exacte en absence d’erreur ASR certaine et
correction minimale, sans lisser hésitations, répétitions ou contradictions.
`brain_fidelity.py` compare réellement les deux textes ; avertissements
lexicaux sur nombres, négations et réécritures, sans certifier le sens.
L’original est l’onglet par défaut et le corps de référence exporté. Proposition
séparée, avant/après surligné, brouillon récupérable sans remplacement silencieux.
`brain_notes.py` protège le texte littéral et exclut la proposition non relue
de la recherche grâce à des marqueurs appariés indépendants de l’ordre YAML.

La remise en forme des notes générées sauvegarde fichiers et jobs, conserve
les chemins/liens et refuse les modifications manuelles. L’inode précédent est
préservé avant publication exclusive, avec intention persistée pour récupérer
une publication précédant une panne de SQLite. Une reprise explicite de la
surveillance FluidVoice conserve son curseur et récupère les dictées de la
pause de maintenance. Le comportement ordinaire d’activation reste « futurs
vocaux ».

CLEF est identifié par sa documentation officielle comme modèle de décision
compatible Jev/SystemOne, avec `state` et `questions` typées. Il n’impose aucun
YAML et n’a pas été branché comme correcteur de prose. Aucun modèle téléchargé
ni appel distant. Résultats, recette et état réel :
[rapport fidélité](../audit/2026-10-03-my-brain-fidelity.md).

Validation finale : 414 tests (412 réussis, deux ignorés), recette Electron
fictive avant/après et dossiers sur quatre largeurs. 30 notes réelles remises
en forme/vérifiées avec sauvegardes et YAML parsé indépendamment ; configuration
et surveillance conservées. Types de propriétés Obsidian fixés pour éviter
qu’un titre daté devienne une Date ou un numéro un Nombre.

## My Brain : dossiers, dates et YAML v2 — 3 octobre 2026

Le format v2 décrit ci-dessous est remplacé par le v3 ci-dessus ; cette section
conserve le contexte de la livraison initiale des dossiers.

Import récursif par dépôt ou sélection de dossier : jusqu’à 1 000 fichiers,
40 niveaux, copie séquentielle et traitement FIFO. `brainBatch` conserve le
manifest, les références aux jobs, les erreurs par fichier et les compteurs
réels, y compris au-delà des 100 jobs récents. Rechoisir le même manifest reprend
la copie ; un échec n’arrête pas les suivants. Les sources reçues restent sur
le service, et le navigateur doit rester ouvert seulement pour leur copie.
Les traitements interrompus par redémarrage restent à relancer explicitement.

Le titre des nouvelles notes conserve le nom source, ou une date en absence
de nom exploitable. Sujet, description et type de contenu sont séparés.
`brain_metadata.py` conserve dates source, date d’import, chemin, numéro,
fuseau, candidats temporels et provenance. Le jour annoncé explicitement dans
un résumé est prioritaire, puis celui du nom/fichier ; ni année manquante ni
date modèle inventée. YAML v2 sérialisé côté serveur, liens Obsidian étiquetés
comme candidats lexicaux, corps complet préservé. Les fichiers de même contenu
mais de nom/date/chemin distincts gardent une identité distincte.

Validation backend : 360 tests (358 réussis, 2 ignorés), incluant 19 tests de
lots, 13 de métadonnées et 4 d’intégration de la file avec fournisseur fictif.
Recette navigateur et état du service : voir le
[rapport de travail](../audit/2026-10-03-my-brain-folders-dates.md).

## My Brain : mise en service Obsidian et contexte anglais — 3 octobre 2026

Le coffre enregistré et ouvert dans Obsidian 1.13.7 correspond au dossier
`my_brain` du dépôt. Texte et 26 propriétés YAML de la note Sintel vérifiés dans
la vraie application. Deux MP3 conservés dans `Tests audio`, avec lecteurs
intégrés, liens vers les notes exportées et note `Accueil My Brain`.
FluidVoice 1.6.9 répond à son health ; Parakeet TDT v3 est disponible. Le
catalogue natif LM Studio prouve Qwen3.8 27B Splash chargé, distinct du modèle
d’embeddings. Export automatique vers `Inbox/Voix` et surveillance conservés.

Le nouveau teaser Tears of Steel (40 s, 479 276 octets) a été transcrit et
exporté avec les deux modèles locaux. Il a révélé des voisins lexicaux anglais
sans rapport, sélectionnés par « you » : mots-outils anglais désormais filtrés
et prompt de métadonnées limité à la transcription. Deux régressions fictives
couvrent exclusion de ces voisins et conservation du vocabulaire robot pertinent.
Suite finale : 324 tests, 322 réussis et 2 ignorés, checkout partagé. Le service
sur 4357 est rechargé avec la correction et sa surveillance réactivée.
Voir le [rapport de mise en service](../audit/2026-10-03-my-brain-obsidian-ready.md)
pour la recette réelle, les preuves et les limites de relecture.

## My Brain : YouTube et fichiers réellement vérifiés — 3 octobre 2026

Import d’un lien YouTube public depuis la vue My Brain : téléchargement local
avec yt-dlp/ffmpeg, MP3 conservé et téléchargeable, transcription puis correction
locale et export Markdown/YAML. La note conserve URL, identifiant, titre et
durée de la vidéo. Déduplication par lien/projet et reprise du MP3 validé après
échec ; aucun cookie ou compte YouTube utilisé. Les dépôts de fichiers sont
cumulatifs, avec retrait individuel et brouillons conservés par projet.

Le premier essai réel a révélé un blocage de Fluid Voice dans AVAudioFile lors
de l’ouverture d’un fichier sous Desktop. La préparation audio passe désormais
par des WAV PCM mono 16 kHz dans un dossier temporaire privé du système, hors
Desktop : segments de 240 secondes, nettoyage après traitement, original gardé.
Le diagnostic de protection macOS est probable, sans lecture de la base TCC.
Aucun accès général au Desktop n’a été accordé.

Deux parcours réels ont réussi dans l’interface : bande-annonce officielle
Sintel de 52 secondes → MP3 de 627 308 octets → Parakeet TDT v3 Multilingual →
`qwen3.8-27b-splash` → note dans `my_brain/Inbox/Voix`, puis import du même MP3
par le sélecteur de fichiers. Les deux notes, l’original et les passages ambigus
sont consultables ; le statut YAML reste `to-review`.

Validation finale du checkout partagé : 313 tests backend, dont 311 réussis et
2 ignorés ; syntaxe Node valide ; recette Electron YouTube à 1500/900/390/300 px
et parcours réels ci-dessus réussis. Les longues durées sont vérifiées avec
fournisseurs fictifs ; la recette réelle porte sur 52 secondes. Bornes : 20 Mo
par audio, 20 minutes avec Fluid Voice et 16 000 caractères transcrits.

Le service sur 4357 est laissé ouvert. Le coffre et l’export automatique déjà
configurés sont conservés. La surveillance a été mise en pause au redémarrage ;
le dernier contrôle affiche « Nouvelles dictées Fluid Voice suivies » et cet
état réactivé depuis est conservé.
Les preuves privées et limites sont décrites dans le
[rapport de travail](../audit/2026-10-03-my-brain-youtube.md), qui actualise l’état
de l’API Fluid Voice et de l’inférence réelle décrit dans le rapport précédent.

## Atelier mobile Android — 3 octobre 2026

APK Android `fr.atelier.mobile`, version initiale `0.1.0` (code 1), Android 8+
livré dans `build/mobile/Atelier-mobile.apk`. Application native avec profils
de plusieurs PC chiffrés via Android Keystore, WebView de même origine privée,
connexion et retour aux profils. Le PC conserve les comptes et exécutions.
Interface mobile dédiée : projets, sessions/prompts, catalogue/efforts dynamiques,
équipes de 1 à 8 spécialistes, décisions de permission et de plan, fichiers
confinés, tâches, mémoire, consommation observée, canaux et discussion Duplica.
Lecture seule et diagnostic/plan par défaut, écriture projet explicite,
on-request ; aucun prompt rejoué automatiquement après perte de réponse.

La passerelle séparée `server/mobile_gateway.py` exige une clé révocable propre
au mobile et un Host/Origin exact, n’écoute que sur loopback ou IPv4 Tailscale
explicitement choisie. Mode HTTPS Tailscale Serve configurable. L’amont reste
le backend loopback existant ; nonce desktop renouvelé seulement après refus
avant action et jamais transmis au client. Les routes sont autorisées par liste,
sans terminal système, proxy générique ni contrôle externe. Le lanceur
`scripts/connect-mobile-pc.py` découvre les services locaux et demande un choix
explicite si plusieurs instances sont détectées ; il ne démarre pas de backend.

Détection des mises à jour à la connexion, au retour au premier plan et action
manuelle : manifeste/APK
authentifiés sur le PC, SHA-256/taille/package/version/signature contrôlés,
installation confirmée par Android. Clé de signature durable sous
`.atelier/mobile/signing/`, chaîne de build privée sous `build/mobile-toolchain`.
Source de mise à jour locale à chaque PC ; pas de publication Android publique.

Recettes et preuves : **317 tests backend (315 réussis, 2 ignorés)**, transport
avec Application/FakeCodex, recettes navigateur 390/300 px (20/19 contrôles),
installation/connexion et vraie mise à jour code 1→2 QA sur émulateur Android.
APK livré : version 0.1.0/code 1, SHA-256 d08b279a…eeb393c, signature v2/v3
valide. Aucun fournisseur réel ni quota consommé.
La recette sur téléphone physique et le réseau Tailscale réel restent à faire.
Les PTY Electron, le ChatGPT desktop et les fenêtres externes ne sont pas portés.
Voir [guide de connexion](../MOBILE.md) et
[rapport détaillé](../audit/2026-10-03-mobile-android.md) pour les résultats finaux.

## Une seule application Atelier — 3 octobre 2026

Le développement et l’installation partagent maintenant le même verrou
natif Atelier, acquis avant tout démarrage de service. Leurs profils privés
restent distincts. Deuxième ouverture : même fenêtre, restauration si
minimisée, mode explicitement demandé transmis même pendant le démarrage.
Les recettes restent isolées et masquées du Dock.

Le lanceur macOS prépare un moteur avec le nom, l’icône et l’identifiant
Atelier. `npm run desktop`, les deux `.command` et l’ouverture depuis le
service passent par ce lancement commun. Le service source démarre après
le verrou avec Python 3.12+ et un port libre ; il s’arrête avec son parent.
Une adoption de service existant exige la même racine et le même dossier
de données, prouvés par `/api/desktop/service` authentifié.

Le seul Electron de test orphelin a été arrêté. L’application installée et
sa session avec file activée sont conservées ; elle reçoit les demandes
de réouverture. Les sources seront chargées au prochain lancement depuis
le projet après fermeture de cette instance. Validation : 209 tests backend
(207 réussis, 2 ignorés), 9 tests JS, signature locale v2 valide, recette native
de verrou (ancienne/nouvelle instance), vrai shell source/service/PTY fictif
et réouverture de l’application utilisateur réussis. Aucun prompt réel.
Voir le [rapport et les preuves](../audit/2026-10-03-single-app.md).

## My Brain : dictées et Obsidian — 3 octobre 2026

Vue My Brain intégrée : audio/texte → API ASR locale facultative → correction
fidèle par LLM local → JSON validé → Markdown/frontmatter YAML → nouveau fichier
dans le coffre configuré. Catalogue réel via `/v1/models`, génération via
`/v1/chat/completions`, notamment LM Studio. Aucun moteur Codex lancé pour ce flux.
Contexte/glossaire, original conservé, corrections/incertitudes, aperçu/export,
déduplication, file séquentielle et dossier surveillé activable. Les instructions
exactes du correcteur sont consultables dans Mon workflow.

Lecture seule par défaut, permission explicite de création dans le coffre,
export automatique séparé, aucun écrasement ni symlink. Les sources et fichiers
d'arrivée restent conservés ; reprise explicite après redémarrage. Recherche
lexicale dans texte/YAML ; réponse locale basée sur cinq notes, avec extraits et
sources affichés. Pas d'embeddings, de moteur RLCD entraîné ni de certitude inventée.

Validation : 207 tests backend (205 réussis, 2 ignorés), dont 13 My Brain ;
syntaxe JS/CJS et recette web en Electron isolé, API/audio/coffre fictifs, aux
largeurs 1500/900/390/300. Aucun modèle réel utilisé. Interface réelle accessible
sur `http://127.0.0.1:4357/#brain`, stockage privé `.atelier/my-brain-interface`,
désormais configurée avec le LLM chargé `qwen3.8-27b-splash`, Fluid Voice 1.6.9
et `/Users/damien/Desktop/IA_Interface_dev/my_brain/Inbox/Voix`. Le modèle
Parakeet TDT v3 est observé actif dans Fluid Voice et ses fichiers CoreML sont
présents. Son historique textuel est activé dans l’UI et le suivi des futures
dictées est actif, avec création de notes/auto-export selon la demande.

Complément Fluid Voice : découverte locale, catalogue LM Studio typé, protocole
natif JSON `/v1/transcribe`, `rawText` de l’historique macOS (pas de presse-papiers),
frontière d’activation et identité des dictées, contexte automatique par dictée
et trois notes proches bornées/provenance YAML. Les repères personnalisés sont
facultatifs. Le fallback navigateur ouvre désormais un sélecteur macOS avec
annulation/expiration ; choix natif contrôlé par l’agent non validé.

Validation complémentaire : 215 tests backend, 213 réussis et 2 ignorés ;
vérification finale du projet partagé : 322 tests, 320 réussis et 2 ignorés.
Recette isolée de détection, sélecteur navigateur simulé, dictées/API natives
fictives, contexte automatique, exports/recherche et quatre largeurs, sans
erreur JS. Aucun modèle réel n’est utilisé pour ces recettes. L’API Fluid Voice
sur 47733 répond maintenant `status=ok`, version 1.6.9 : la demande d’accord
pour relance est devenue inutile, aucune relance exécutée par ce travail.
Deux exports issus des autres interactions sont observés (YouTube/audio),
avec fichiers présents. Aucune inférence de démonstration ajoutée ni fidélité
humaine affirmée. `my_brain` est ouvert/enregistré dans Obsidian par le sélecteur
natif ; fenêtre/coffre et configuration JSON observés. Le suivi a été réactivé
après un redémarrage intervenu pendant les travaux : `watching=true`, aucun
`watchError`. Capture réelle privée `fluid-voice-live.png`.
Voir [mise en route](../MY_BRAIN.md), [rapport initial](../audit/2026-10-03-my-brain.md)
et [connexion Fluid Voice](../audit/2026-10-03-fluid-voice.md).

## Mises à jour : interrupteurs et carte — 3 octobre 2026

La zone des mises à jour desktop utilise une carte sombre arrondie, un statut
issu du contrôleur, deux interrupteurs terracotta et une progression native.
Les préférences existantes restent persistantes ; clavier, libellés accessibles
et focus conservé après changement sont vérifiés. Le téléchargement et le
redémarrage gardent leurs actions explicites. Les styles sont isolés dans
`web/updates.css`, servi par le service local.

Validation : 17 tests unitaires mises à jour réussis ; 194 tests backend
exécutés, 192 réussis et 2 ignorés ; recette Chromium dans Electron avec système
de mise à jour fictif, quatre largeurs (1500/900/390/300), sans débordement,
erreur JS ni requête externe. Sources uniquement : application installée et
installateurs non remplacés. [Rapport](../audit/2026-10-03-updates-ui.md).

## Affinage des en-têtes et accès images — 3 octobre 2026

L’en-tête terminal/panneaux est ramené à 20 px tout en conservant état, tokens
et icônes. Le bouton trombone **Images** est directement visible dans chaque
barre Codex et ouvre la section de sélection/collage avec focus ; la session
existante reste ouverte, les images sont transmises à un nouveau terminal.
Recette Electron fictive réussie à 1500/900/390 : dimensions20px, icônes12px,
aucun débordement, paramètres préservés et image passée au PTY fictif.
Le [rapport](../audit/2026-10-03-compact-terminal-header.md) décrit aussi la
reconstruction locale distincte, terminée et vérifiée (service figé quatre
tests, démarrage desktop et echo PTY fictif sans erreur JS). Le lanceur
`Ouvrir Atelier corrigé.command` ouvre le bundle sous
build/local-delivery-compact-20261003/dist/mac-arm64/Atelier.app.
L’installation existante n’est pas remplacée ; fermer cette version avant
ouverture du nouveau bundle pour éviter sa réactivation par le verrou d’instance.

## Corrections de l’interface — 3 octobre 2026

Les [retours du 3 octobre](../audit/2026-10-03-feedback-fixes.md) sont intégrés
dans les sources : zoom du chat indépendant 25–200 %, onglets Chat 1/2
renommables, sélecteur et collage d’images avant lancement Codex --image,
navigation lisible à toutes les largeurs et infobulles immédiates.
Les permissions restent read-only/workspace-write et on-request ; les
arguments sont vérifiés, leur enforcement OS n’a pas fait l’objet d’une
inférence réelle pendant cette recette.

Canaux : huit invitations vérifiées par l’UI, modèles/efforts conservés,
Envoyer et lancer, activité individuelle cliquable avec session/appel observé,
erreurs, tokens cumulés issus des requêtes et interruption. L’activité et les
contributions publiques ne constituent pas un accès aux pensées privées.

Quatre [skills de test](../audit/2026-10-03-testing-skills.md) ajoutés au projet :
exploration UI/PC, navigateur, Electron/PTY et accessibilité. Ils sont découverts
dans le catalogue et validés ; ils ne donnent pas automatiquement des outils PC
aux agents. Le contrôleur Atelier conserve son périmètre actuel.

Validation : 175 tests backend exécutés, 173 réussis et 2 ignorés ; sept suites
unitaires JS réussies ; recettes Electron fictives chat/images, canaux (8
participants) et navigation (1500/900/390/300) réussies. Aucune inférence réelle,
connexion ChatGPT ou campagne utilisateur ; aucun nouvel installateur publié.
Le programme installé dans /Applications n’est pas modifié par ces edits source.

## Accès Windows à Atelier

Le [correctif de lancement](../audit/2026-10-02-atelier-windows-launcher.md)
ajoute `scripts/open-atelier.ps1` et `scripts/install-atelier-shortcuts.ps1`.
Les raccourcis **Atelier** existent dans le menu Démarrer et sur le bureau du
poste de Damien. Le service local est réutilisé après contrôle du dossier,
et Electron réaffiche sa fenêtre unique. Le fournisseur de certificats est
chargé depuis le PowerShell courant si nécessaire ; aucune politique Windows
n'est modifiée.

Deux ouvertures réelles ont été vérifiées : même serveur sur 4317 et même
fenêtre **Atelier · Agents & projets**, laissée sur **Canaux d’agents → Plan
avant action**. Duplica reste en pause, aucune session active. C'est l'état
observé lors de la recette, pas une garantie de processus toujours actifs.
Le projet et ses dépendances restent requis ; pas d'exécutable autonome livré.

## Discussion, Telegram et retours UX

Le complément [duplica-ux](../audit/2026-10-02-duplica-ux.md) décrit l'état le
plus récent : discussion durable par projet et partagée avec Telegram,
Travailler pour moi limité au projet choisi, UI charbon chaud/arrondie,
compteurs et abonnement proches des sessions. Le composant de consommation
a été réellement développé en partie par Duplica avec GPT-6-Luna, contrôlé
indépendamment puis relu et intégré.

Telegram propose une création/association guidée par code privé de cinq
minutes et un coffre DPAPI Windows ; aucun bot réel n'est encore configuré.
Ses messages libres discutent désormais avec Duplica ; `/instruct` dirige
explicitement un agent choisi. Les secrets du relais sont exclus des
processus des agents et des recettes. Les TUI restent non automatisés ;
seuls les compteurs Codex CLI sont lus via leurs journaux, avec association
unique ou explicite, sans importer les conversations.

Les sprints ouvrent un tableau filtré et présélectionnent le sprint lors
d'une création de tâche ; dates et projet sont validés côté serveur. Le
nonce HTTP est renouvelé après refus avant exécution, sans rejouer les
résultats incertains. La TODO `task_18c4e845ba7b` suit ce correctif.
Validation : 94 tests backend, 93 réussis et 1 saut Windows ; calculs et
recettes navigateur/UX/workbench/manager réussis. Electron : sept PTY et
compteurs, resize/drag/mobile réussis ; Duplica fictif réalise deux corrections
et trois vérifications par vrais clics/clavier. Détails et limites dans
le rapport. Aucun resize n'est envoyé après la sortie du terminal. La TODO
des sprints/reconnexion est **En revue** ; le backend local est relancé.
Le terminal utilisateur est préservé. La fenêtre desktop déjà ouverte charge
les anciens scripts jusqu'à son prochain lancement ; le navigateur local
permet de consulter immédiatement la nouvelle interface.

## Duplica Agent

Duplica est intégré à `Application`, au cockpit, aux sessions, workflows et
TODO. Un indicateur reste dans la barre principale ; la vue manager réunit les
missions, états observés, demandes, recettes, décisions et preuves. La mémoire
globale/projet, les décisions exactes et les permissions sont persistantes sous
`.atelier/duplica/`. Le service est désactivé par défaut ; global → projet →
workflow → tâche → agent définit l'héritage, avec Pause/Stop/reprise de contrôle
comme barrière générale. Les campagnes de benchmark restent exclues.

Le backend Codex réutilise `app-server`, les sessions existantes et `on-request`.
Une question connue est résolue depuis une réponse explicitement enregistrée,
avec sa source ; une question inconnue ou contradictoire demande l'utilisateur.
Les commandes sont classifiées prudemment, avec contrôle du dossier ; les
profils de plan et lecture seule empêchent l'approbation automatique d'écriture.

Le `ComputerController` utilise le shell Electron : captures réelles, contrôles
observés, clics, double clics, défilement et clavier. Les observations expirent
et se consomment une seule fois ; un contrôle changé avant clic autorise une
nouvelle observation bornée, un résultat incertain ne se rejoue pas. Il couvre
Atelier et un navigateur HTTP local isolé. Les GUI externes, Excel et les TUI
natifs ne sont pas automatisés par ce contrôleur ; les PTY remontent uniquement
PID, ouverture/fermeture et activité de sortie.

Une mission conserve une recette explicite : fichiers attendus, tests, build
(ou absence de compilation déclarée), commande d'application et parcours GUI
avec résultat visible. Duplica exécute les tests lui-même, lance son processus
d'application, utilise la GUI, écrit les rapports/captures, demande les
corrections puis reteste, avec 0 à 10 relances. Le résultat `Vérifiée` dépend de
tous ces contrôles ; les TODO restent **En revue**, pour validation humaine.
Un outil ou fichier inaccessible produit `non exécuté` et une demande, sans
relance de code. Une redéfinition des critères ne transforme pas une ancienne
observation en correction validée. Les actions GUI sont auditées avec captures.

Le watchdog signale silence/crash sans redémarrage aveugle. Après redémarrage,
état et preuves restent conservés, Duplica passe en pause et la mission se
reprend explicitement. Telegram est un relais facultatif, activé par l'utilisateur
et configuré dans l'environnement ; il accepte un seul compte en conversation
privée, conserve l'offset et transmet les événements importants. Aucun bot réel
n'a été configuré ou contacté pendant cette livraison.

Les empreintes SHA-256 des rapports, sorties de commande et artefacts de session
portent sur les octets UTF-8 réellement écrits, sans conversion de fins de ligne.

Validation du 2 octobre : **83 tests backend, 82 réussis et 1 saut symlink
Windows** ; syntaxe JS/CJS et calculs cockpit vérifiés. Recette navigateur Duplica
et régression du cockpit aux largeurs 1600/900/390/300, sans erreur JS ni
débordement global. Recette Electron avec fournisseur fictif : permission et
réponse CSV par vrais clics/saisie, deux relances, trois vérifications, deux bugs
résolus après retest. Recette réelle **GPT-6-Luna** : défaut contrôlé, une
relance/correction, deux vérifications, tests et parcours GUI réussis. Le modèle
réel n'a demandé ni permission ni réponse : ces branches sont prouvées par la
recette fictive, pas attribuées artificiellement au modèle réel.
Régression desktop : navigateur isolé, PTY echo/fin, sept terminaux, déplacement,
redimensionnement, onglets et affichage compact vérifiés. Les métadonnées Duplica
partent après l'attachement des flux natifs pour préserver le démarrage du PTY.

Les détails, commandes et preuves privées sont dans le
[rapport Duplica](../audit/2026-10-02-duplica.md). L'inférence de préférences en
langage naturel, le contrôle Windows externe et les autres backends spécifiques
restent à développer. Une recette qui réussit ne prouve pas tous les workflows
possibles ni un fonctionnement continu de plusieurs heures.

## État précédent : workbench

La plateforme intègre Codex app-server et Oh My Pi RPC. Le cockpit charbon/cyan suit sessions, workflows et consommation observée. Le workbench ajoute vrai navigateur ChatGPT optionnel, canvas de conception, notifications, quotas natifs, durées de tours, rapports compacts et plan soumis à validation. Voir le [rapport courant](../audit/2026-10-01-workbench.md), le [rapport chat/équipes précédent](../audit/2026-10-01-chat-teams-todo.md) et les [retours utilisateur](../references/2026-10-01-workbench-feedback.md). Le test synthétique autorisé GPT-6-Luna a réussi ; cela ne prouve pas l'accès à tous les modèles ni la qualité d'une implémentation.

## Couverture de la demande

| Demande | Version actuelle | Limite / suite |
|---|---|---|
| Création d’agents | Catalogues/efforts Codex et OMP, mission, rôle, permissions, tâche, skills, dossier/worktree | OMP sans shell ni MCP de réserve ; autres adaptateurs à ajouter |
| Plusieurs fenêtres | Grille d’agents, 1 à 3 sessions côte à côte, streaming structuré | Terminal PTY/TUI complet à ajouter |
| Sprints et tâches | CRUD local, affectation, priorités, file TODO des agents lancés, bail tâche/dossier, fin → En revue | Dépendances, scheduler par sous-tâche et budgets à ajouter ; Terminé reste humain |
| Git/worktrees | Lecture Git, sélection d’un worktree, création de branche et worktree local | Aucun cleanup ou merge automatique |
| Pull requests | Lecture avec `gh`, état de review/checks et lien vers GitHub ; dépôt CLI_agent_dev identifié | Création/merge dans le produit à ajouter |
| Second cerveau | Souvenirs projet/utilisateur, budget combiné 4 000 caractères, recherche lexicale MCP à la demande, provenance | Promotion assistée de logs et embeddings à ajouter si utiles |
| Bibliothèque de skills | Bibliothèque du projet, sélection de `SKILL.md`, validation des chemins | Pas de chargement automatique de tous les skills personnels |
| Tokens et graphes | Mesures par fournisseur/consommateur/tâche/modèle/requête, CSV ; quotas du compte Codex, tarifs saisis/sourcés et estimation USD | Factures, tarifs publics automatiques, devises et comptes multiples non importés |
| Connexions | Codex/ChatGPT ; fournisseurs OAuth/API découverts par OMP et login dans son terminal natif | Aucun secret dans le formulaire web ; succès d’inférence non vérifié |
| Terminaux | PTY node-pty/xterm integre au desktop : Codex, Claude Code, OMP, clavier, resize, onglets fermables ; sessions structurees conservees | Pas de tokens/historique/temps de tour importes du PTY ; Claude en plan, OMP outils de lecture, lancement explicite sans prompt |
| Chat/contexte | Vrai ChatGPT dans shell desktop optionnel, ressources/consignes/copie/drag ; conversations CLI distinctes avec contexte observé | Login/upload ChatGPT à valider humainement ; Chromium, pas Firefox ; profils SQL/CIW à ajouter ; pas de tokens/historique du site importés |
| Fichiers | Navigation, source numérotée, images, lecture seule, contrôle des chemins | Écriture/édition et diff IDE à ajouter |
| Multi-agent | 1 à 8 sous-agents ajoutables/supprimables, noms/rôles/consignes/modèles indépendants, review/synthèse facultatives ; max 20 tâches, graphe et handoffs | Séquentiel ; reconfiguration pour nouveau lancement ; worktrees par sous-tâche/parallélisme/budgets à ajouter |
| Modèles Codex/ChatGPT | Catalogue paginé `includeHidden=true`, entrées étendues identifiées ; TODO réelle prioritaire ajoutée | TODO ouverte : écart offre ChatGPT/catalogue Codex et accès effectif non vérifié |
| Rapports et audit | JSONL par agent, JSON canonique, résumé MD/YAML, durées natives, hash et UNVERIFIED | Attestations de tests/runtime indépendants à ajouter |
| Architecture éditable | Pages, diagramme LogicFlow, déplacement/liens, ressources, agents existants, explication et JSON proposé/importé | Pas encore un scheduler n8n ; liens inertes, pas de déclenchement ou injection de ressource implicite |
| Plan et notifications | Diagnostic en lecture seule par défaut, validation humaine avant implémentation ; cloche liée à la session | Le modèle peut échouer à reproduire : inconnue conservée ; preuve de test rouge/vert requise, jamais présumée |
| Processus et connexion | PID du fournisseur Atelier, erreurs de retry visibles, inventaire Windows partiel, CA Windows scoped | Tous les CLI externes et leur activité non attribuables ; nouvel OAuth à vérifier humainement |
| Benchmarks | 1 à 50 candidats, jeu JSON hashé, répétitions, générateur proposant des cas, oracle exact ou juge modèle distinct, exports | Oracles exécutables de code, navigateur, sécurité/alignement et recette humaine structurée à ajouter |
| Maintenabilité | Sources archivées, quinze captures utilisateur dont trois identiques, hashes, annotations navigateur, demande canonique, architecture, design, audits et tests | Captures marquées inline sans chemin : texte conservé, aucun binaire prétendu archivé |

## Points techniques à connaître

- Backend Python standard et CLI ; canvas LogicFlow bundlé via Node/esbuild, shell Electron optionnel. Versions épinglées dans package-lock ; `npm ci` puis `npm run vendor` nécessaires au canvas.
- Le serveur n’écoute que sur `127.0.0.1`. Les API exigent un nonce par lancement ; Host et Origin sont vérifiés. Les données privées sont dans `.atelier/`, ignorées par Git.
- `codex app-server`, MCP mémoire et `omp --mode rpc` sont les interfaces réelles. Le frontend n’automatise pas ChatGPT et ne copie pas les credentials. Les comptes OMP sont indépendants des comptes Codex.
- OMP n’active que les outils hôtes de fichiers ; l’écriture est confirmée dans Atelier et revalidée avant application. Les outils shell/MCP/délégation sont absents. Le protocole v1 est supporté ; les frames fragmentées non prises en charge échouent explicitement. Les fichiers de session OMP restent privés dans `.atelier/`.
- Le catalogue local n’est pas une entitlement garantie. Un tour réussi doit confirmer l’accès réel pour la requête.
- Une session sans aucun message n’a pas forcément de rollout Codex. À sa reprise, Atelier recrée un thread vide en conservant l’identifiant local et la trace. Avec des messages, il appelle `thread/resume`.
- Le MCP mémoire Codex est requis lorsqu’il est activé : sa panne fait échouer le démarrage. OMP ne reçoit que le noyau, sans réserve MCP.
- Les workflows utilisent un seul worktree, séquentiellement. Aucun orchestrateur secondaire natif n’est lancé.
- La file TODO ne démarre que pour un agent de travail explicitement lancé avec `startWork` ou activé par l'utilisateur. Les nouvelles tâches réveillent les abonnés compatibles. Échec/interruption arrête la file ; redémarrage libère les baux sans reprendre le travail. Même dossier : un seul propriétaire automatique ; les actions manuelles hors file restent à isoler.
- Le chat n'envoie pas de mission au démarrage et ne prend pas le backlog. Les fichiers de contexte sont relatifs au projet et bornés à 8 fichiers / 64 Ko chacun / 40 000 caractères. Le panneau montre le dernier appel et les instructions réellement transmises, pas une reconstruction complète du contexte interne du fournisseur.
- La configuration native du CLI reste applicable aux benchmarks. Le mode sans mémoire désactive le noyau et MCP Atelier, pas tout l’environnement du fournisseur. Lors de la recette réelle, des MCP natifs (`codex_apps`, `cua_repl`, `node_repl`) étaient présents. Une table `mcp_servers={}` ne les supprimait pas ; cet override inefficace a été retiré. La V1 ne prétend donc pas filtrer tous les outils du fournisseur.
- 50 tests signifie 50 candidats maximum. La génération et les reviews distinctes ajoutent des inférences et du quota.
- Les coûts facturés et les équivalents API ne sont pas inventés. Les graphes n’utilisent que les mesures reçues.
- Le rapport de clôture est déterministe et ne consomme pas d’inférence supplémentaire. Il montre les preuves d’outils et les déclarations de l’agent comme des objets distincts.

## Vérifications Actuelles

55 tests backend executes : 54 reussis, 1 saut symlink Windows. Syntaxe JS/CJS
et calculs verifies. Recettes navigateur, workbench et desktop fictif : navigateur
isole, bounds, masque au survol, fermeture, vrai processus PTY avec echo clavier
et sortie/fin observes. Aucun login ChatGPT, upload reel ou inference dans cette
livraison. Details et limites : audit desktop-terminals.

La navigation entiere et les ressources se masquent/restaurent ; le chat dispose
de back/forward/reload/home et focus. Le site utilise un WebContentsView isole,
pas un iframe. Le bouton depuis un navigateur ouvre Atelier desktop avec le chat
dans cette fenetre ; le popup externe ChatGPT a ete retire. Le profil web prive
est persistant ; connexion humaine initiale requise. Recherche et apercus ont
ete revises, les liens de memoire/tache corriges, et l'ajout de projet a un
selecteur natif de dossier. La palette par defaut est anthracite.

Vue Code : grille de PTY par defaut, une a trois colonnes, deplacement entre
colonnes, hauteurs ajustees par separateur, agrandissement/restauration et
fermeture separee. Onglets en option. Sept panneaux simultanes testes avec
processus PowerShell fictifs, sans chevauchement, drag et resize observes.
Sous 800 pixels, panneaux empiles et page defilante. Les sorties/processus ne
sont pas recrees lors d'un changement de vue ; preferences de mode/colonnes
locales, position/tailles detaillees en memoire seulement.

Un evenement `account/updated` partiel sans `authMode` ne deconnecte plus Codex.
Les vues Connexions et Consommation partagent le rendu des quotas ; Connexions
distingue explicitement Codex, OMP et le site web. Aucune connexion fictive n'est
affichee pour masquer le besoin de connexion independante OMP.

Le dernier test réel autorisé GPT-6-Luna a terminé en 3 725 ms avec réponse et mesures natives de tokens, après configuration du CA Windows. Connexion et quotas réellement lus, aucun secret copié. Le test n'établit pas la recette humaine du nouvel OAuth ni l'accès aux autres modèles. Le catalogue courant contient dix entrées à cette vérification (Codex 0.159.2) ; les nombres des livraisons précédentes sont historiques.

## Vérifications Précédentes

43 tests automatisés exécutés, 42 réussis et 1 saut de symlink Windows faute de privilège dédié. La traversée et les fichiers sensibles sont vérifiés avant ce saut. Couverture supplémentaire : catalogue étendu paginé, chat/contexte borné et reconfigurable, reprise du contexte après redémarrage, bail tâche/dossier et affectation, TODO existantes/futures, échec sans retry, sous-agents dynamiques et rôles facultatifs, terminal Codex sans bypass. Couverture précédente préservée. Vérification syntaxique de tous les fichiers JS.

Recette Playwright/Chrome avec fournisseur fictif : graphe/inspecteur, configuration de quatre sous-agents et retrait, reconfiguration, review/synthèse désactivées, chat avec fichiers/skills/modèle et tokens entrée/réponse, affectation TODO et passage En revue, préparation des terminaux Codex/OMP, Codex visible en consommation. Dix vues plus chat à 1600/900/390/300 pixels, sans erreur JS, débordement global ni nœuds coupés sur mobile. Captures/résultat privés sous `.atelier/browser-evidence/`. Aucun terminal interactif ni prompt réel lancé par cette recette.

Recette OMP 18.1.10 limitée aux métadonnées : démarrage sans outils natifs, enregistrement d’`atelier_read`, liste active conforme, catalogue et fournisseurs de login. Aucun secret lu ni inférence envoyée.

Recette réelle initiale : connexion ChatGPT détectée, 7 modèles découverts, création en lecture seule d’un thread Codex, clôture avec artefacts. Aucun prompt d’inférence réel envoyé. Le journal de cette session technique demeure dans `.atelier/logs/`.

La réussite des tests n’est pas présentée comme une approbation produit de Damien. Les données historiques ou fictives ne sont pas injectées dans son espace réel pour remplir le cockpit.

## Prochaines unités de travail

TODO prioritaire ajoutée à la demande explicite de Damien : compléter/vérifier les modèles Codex/ChatGPT manquants. La découverte étendue est corrigée, mais la tâche reste À faire tant que les écarts d'offre et l'accès réel ne sont pas établis sans réutilisation de credentials.

Après redémarrage de cette livraison : 11 entrées Codex, dont 6 masquées, contre 5 visibles avant correctif. Vérification limitée aux métadonnées, sans inférence. Les modèles absents ne sont pas ajoutés artificiellement.

1. Effectuer une recette réelle explicitement autorisée par moteur/fournisseur ; vérifier quotas et accès effectif sans supposer que le catalogue est une entitlement.
2. Valider le login/upload ChatGPT desktop et les CLI natifs humainement ;
   packaging distribue, profils SQL/CIW, observabilite du PTY et theme configurable restent ouverts.
3. Ajouter des oracles de benchmark exécutables : tests de code dans un workspace isolé, artefacts de build, captures/runtime UI et score de review explicitement séparé.
4. Introduire un scheduler par ressource et des worktrees par sous-tâche avant d’autoriser les écritures parallèles.
5. Ajouter une grille tarifaire/FX versionnée et une importation explicite des dépenses réelles.
6. Raccorder les actions GitHub et la recette humaine à des contrats d’acceptation et preuves référencées.
7. Faire évoluer les rapports en propositions de souvenirs que l’utilisateur valide ; éviter d’injecter tout le journal dans la mémoire.

Ces unités correspondent aux demandes initiales encore ouvertes. Aucune permission de publication, de merge ou d’action externe irréversible n’est déduite de cette roadmap.

## Historique : Test Réel Précédemment En Attente

Un test unique de streaming et de recherche mémoire avec GPT‑5.6‑Sol a été préparé. La revue automatique a rejeté l’envoi, car il transmettrait à OpenAI le noyau et un extrait de mémoire du projet sans autorisation explicite pour ces données et cette destination. Aucun tour réel n’a été envoyé. Une demande d’autorisation a été présentée à Damien ; tant qu’il ne répond pas, le test reste non vérifié.

Le service a été redémarré après finalisation ; la session préparée reste conservée en état arrêté, reprenable.


## Canaux de préparation — 2 octobre 2026

Vue **Canaux d’agents** et connexions **API locales & distantes** livrées.
Canaux persistants par projet, jusqu’à 8 participants et 1 à 6 tours parallèles
avec état public identique, publication en fin de tour et synthèse à relire.
Les participants natifs utilisent des contextes frais de discussion ; copier
un agent existant copie sa configuration sans ses pensées, messages ni mission.
Arrêt, callback tardif ignoré, état Arrêt en cours et reprise explicite.

Codex app-server, OMP, Chat Completions et SystemOne sont adaptés. LAYA et CLEF
sont consultants de décisions typées via un serveur configuré ; un LLM rédige
le plan. Aucun poids n’est installé. Le transfert au chat Duplica est un brouillon ;
la tâche issue du plan reste En revue et sa création est idempotente.
Les clés des nouvelles API restent dans des variables du service et sont retirées
des environnements enfants. Les tokens absents ne sont pas estimés.

Preuves : 121 tests backend (120 réussis, 1 symlink ignoré), recette navigateur
avec quatre participants fictifs, persistance et quatre largeurs. L’inférence
native réelle et la qualité des consultants ne sont pas vérifiées. Détails :
[rapport](../audit/2026-10-02-agent-channels.md).
Le service local sur 4317 a été rechargé sans travail actif ; le canal réel
« Plan avant action » est conservé en brouillon, sans participant ni inférence.

Consolidation et recette Electron du 2 octobre : la navigation fixe défile
verticalement, ce qui rend Connexions accessible lorsque les entrées dépassent
la hauteur de fenêtre. La recette reprend une seule fois un clic explicitement
refusé avant émission, avec nouvelle observation et recherche du label ; elle
ne rejoue pas un résultat indéterminé. Validation isolée : 128 tests backend
(127 réussis, 1 symlink ignoré), syntaxe JS et parcours Canaux → Connexions
réussis, avec un rejet forcé puis un seul clic réel. Voir le
[rapport de consolidation](../audit/2026-10-02-duplica-channels-consolidation.md).
Les fenêtres cachées de test conservent leur rendu actif et leur fermeture est
confirmée. Cette validation ne constitue pas un état d’exécution de Duplica.

## Correction : Agents ouvre les CLI natifs

Retour du 1 octobre 2026 : la capture de conversation structurée ne correspond
pas au résultat demandé. Agents arrive désormais sur les vrais terminaux ;
Nouvel agent ouvre le lanceur natif, avec Codex, Claude Code, OpenCode et OMP.
Les anciennes sessions restent consultables via Sessions outillées. Desktop :
PTY intégrés en grille ; navigateur : terminal système avec le CLI choisi.
OpenCode est préparé avec `--agent plan`, sans prompt ni modèle artificiel ;
Claude Code utilise son mode plan. Ces profils natifs ne sont pas une sandbox OS.
Le profil d’écriture reste disponible uniquement pour Codex dans ce parcours.

Correction PowerShell : les apostrophes ASCII et typographiques sont échappées
sans modifier les arguments, y compris dans les consignes de démarrage. Le PTY
reçoit explicitement la taille du panneau après sa création ; un nouveau panneau
occupe la colonne la moins remplie. Electron renouvelle son jeton HTTP local
après un redémarrage serveur, uniquement après le refus avant exécution.

Validation : 57 tests backend, 56 réussis et 1 symlink ignoré sur Windows ;
recettes navigateur et desktop avec fournisseur fictif, sept PTY simultanés (CMD léger pour la recette Windows).
Codex et OMP réellement ouverts et laissés côte à côte, sans mission ni inférence.
Le premier démarrage Codex a échoué par allocation mémoire pendant les contrôles
concurrents ; le second affiche le TUI et reste actif. Claude Code n’est pas
détecté dans le PATH ; lancement réel d’OpenCode non vérifié. Rapport :
[CLI natifs](../audit/2026-10-01-native-cli-correction.md).


## Lancement macOS et serveurs locaux — 1 octobre 2026

Atelier a été relancé sur `127.0.0.1:4317` et sa fenêtre Electron ouverte dans la vue Code. Les données existantes sont conservées ; les deux sessions antérieures étaient clôturée/arrêtée avant le remplacement de l'ancien serveur. Dépendances épinglées installées et assets locaux générés sur ce Mac.

Agents/Code et Connexions proposent maintenant **oMLX** et **Splash** via leurs lanceurs natifs Codex. Ports proposés 8000/8001, modifiables au lancement, hôte fixé à 127.0.0.1. Permissions explicites lecture seule/écriture projet et `on-request`, délégation désactivée, aucun prompt initial. Les modèles sont découverts par les lanceurs. Aucun credential Codex lu/copied et aucune configuration globale Codex modifiée. Splash peut demander sa clé dans le PTY, masquée et seulement transmise à l'environnement du processus.

Les deux services existants ont répondu HTTP 401 au catalogue sans clé. Atelier expose cette authentification requise sans prétendre être connecté. L'accès authentifié, l'inférence et les mesures de consommation de ces terminaux restent non vérifiés/non importés. Le diagnostic utilise les ports proposés, sans suivre les ports personnalisés des terminaux.

Correction macOS : `npm run vendor` rétablit le bit exécutable du `spawn-helper` de node-pty. La recette desktop crée elle-même son dossier de preuves ; elle teste aussi le changement oMLX/Splash/OMP/Codex, les ports proposés et les permissions disponibles.

Validation : **61 tests backend réussis**, syntaxe JS/CJS, calculs cockpit et recette Electron avec fournisseur fictif (echo clavier, sortie, sept PTY, drag/resize/zoom/onglets/mobile/fermeture). Pas d'inférence réelle, ni de login ou dépôt ChatGPT. Voir [rapport local macOS](../audit/2026-10-01-macos-local-providers.md).


## Connexion initiale ChatGPT intégrée — 1 octobre 2026

L'utilisateur a choisi de garder ChatGPT dans Atelier et de se connecter une fois dans ce navigateur. La vue ChatGPT distingue maintenant l'état Codex observé et la connexion web séparée, explique la première authentification et la conservation du profil. Le parcours intégré reste principal, sans lancer Firefox ni importer sa session. Le stockage privé Electron et la partition persistante `persist:atelier-chatgpt` existaient déjà ; leur usage réel est vérifié par la recette.

L'écran réel « Connectez-vous ou inscrivez-vous » a été ouvert pour l'utilisateur dans le chat intégré. Aucune saisie de credentials ni soumission n'a été effectuée par l'agent. La fenêtre et le formulaire restent en place : pas de rechargement pendant la connexion, les nouveaux libellés apparaîtront au prochain chargement de l'interface. Connexion effective/reprise après connexion toujours non vérifiées.

Validation : 61 tests backend réussis, syntaxe JS, recette desktop fictive et contrôle visuel de la vue ChatGPT. Rapport : [connexion du chat](../audit/2026-10-01-chat-login.md).


## Architecture, souvenirs et consommation — 3 octobre 2026

La création depuis le dessin conserve la vue ; ressources et sources de souvenir peuvent être parcourues et recherchées dans le projet nommé. Les commandes du dessin restent accessibles en fenêtre partagée et à 390 px. Les sessions de conception utilisent une intention architecture en lecture seule : une validation importe une nouvelle page avec provenance, sans lancer de tour d’implémentation. Duplica peut réaliser cette validation par clic observé en mode ordinateur, avec permission dédiée et identité du tour ; une issue incertaine n’est pas rejouée. Les plans de code conservent leur permission distincte et le profil de session.

Les propositions JSON sont lisibles dans le détail des agents, avec source brute consultable. Les états du tour et de la tâche sont distincts : fin de tour ne signifie pas tâche accomplie. Les compteurs cumulés et les courbes par fournisseur affichent uniquement les mesures disponibles. Les tarifs API sont actualisés depuis les pages officielles OpenAI/Anthropic, avec correspondance exacte des modèles, cache de 24 h et valeur inconnue explicite.

Les souvenirs créés/modifiés sont sauvegardés en JSON privé `atelier.memory/v1`, avec projet, sujet, raison, dates, validation, provenance et contexte. Export JSON ou Markdown avec en-tête YAML. Les anciens souvenirs restent exportables sans migration destructive ni métadonnées de validation inventées.

Validation finale de l’état partagé : 207 tests backend (205 réussis, 2 ignorés), syntaxe de 75 fichiers JS/CJS, tests cockpit/usage et recettes Electron à fournisseurs fictifs. Duplica a importé le dessin par clic réel observé, avec zéro tour d’implémentation ; le second message a suivi les états running → waiting_plan → ready. Aucune inférence réelle. Le bundle macOS installé n’a pas été remplacé par cette intervention. Voir [rapport, preuves et limites](../audit/2026-10-03-architecture-memory-usage.md).
