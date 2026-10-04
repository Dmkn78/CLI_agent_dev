# My Brain — dossiers, dates et YAML du 3 octobre 2026

## Demande et résultat

Damien demande de déposer un dossier entier et de le traiter progressivement,
en conservant le nom, le numéro et les dates des vocaux. Les résumés datés
doivent rester retrouvables dans son second cerveau grâce à un YAML propre,
avec sujet, description et relations. Trois sous-agents ont partagé le travail :
manifestes/API, métadonnées/dates et interface/recette navigateur. Le principal
a intégré le pipeline, l’export, la documentation et le service réel.

Le dépôt récursif et le bouton **Choisir un dossier** acceptent jusqu’à
1 000 fichiers. Les sources sont copiées successivement puis traitées par la
file locale existante. Réception et traitement ont des progressions distinctes ;
les erreurs restent visibles sans empêcher les autres fichiers de passer.
Les manifestes sont persistés dans SQLite. Après une copie interrompue,
rechoisir le même dossier reprend les sources manquantes ; l’empreinte porte
sur projet, nom du dossier, fuseau, chemins, tailles et dates normalisées.
L’ordre du sélecteur peut changer sans décaler les index du manifeste.

## Implémentation

- `server/brain_batches.py` : manifestes `brainBatch`, validation des imports,
  liaison avec les jobs, erreurs par entrée, état projeté depuis les vrais jobs,
  y compris ceux absents des 100 éléments récents de l’interface.
- `run.py` : création, consultation et erreur d’un lot via les routes locales
  protégées par les contrôles Host/Origin et le nonce existants.
- `server/brain_metadata.py` : helpers purs, horodatages UTC et fuseau IANA,
  chemins relatifs déclaratifs, date de note et provenance déterministes.
- `server/brain.py` : métadonnées à l’import, déduplication distinguant les
  fichiers de mêmes octets mais de chemins/dates différents, schéma JSON
  enrichi, YAML v2 et export fondé sur la date et le nom source. Les imports
  FluidVoice et la surveillance de dossier transmettent aussi leurs dates.
- `web/brain.js` et `web/brain.css` : parcours récursif du glisser, pagination
  du lecteur de répertoire, sélection, suivi durable, reprise, erreurs
  relançables et affichage distinct des dates source et d’import.

Le titre conserve le nom source sans extension ; sans nom exploitable, il
prend la date. `subject`, `description` et `content_type` sont des propositions
du modèle séparées du titre et de la transcription complète. Le numéro est
conservé dans `file_number` quand sa lecture est non ambiguë.

La date de référence privilégie : résumé annonçant une date complète, date du
nom de fichier, enregistrement, création, modification, puis import. Les
horodatages utilisent le fuseau source pour le jour calendaire. Les dates
partielles ou relatives ne reçoivent aucune année inventée. `date_candidates`,
`note_date_basis`, `provenance` et `metadata_uncertainties` rendent ce choix
vérifiable. Les avertissements de date sont distincts des ambiguïtés ASR.

`topics`, `entities`, `tags` et `related_notes` facilitent la recherche. Les
relations viennent des chemins de notes réellement retrouvées par le contexte
lexical ; `related_notes_basis: lexical-candidates` et
`metadata_status: to-review` indiquent leur statut de propositions.
L’identité exacte et le contrat de « JEV / RLCD » restent inconnus : aucune
intégration spécifique à ce consommateur n’est prétendue.

## Vérification et corrections

La commande requise, exécutée avec Python 3.12 fourni, est :

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
```

Résultat final : **360 tests, 358 réussis et 2 ignorés**, en 64,510 s. Log privé :
`.atelier/brain-runtime-evidence/backend-folder-final.log`.
Les nouveaux tests couvrent 19 cas de manifestes/API, 13 de métadonnées et
4 d’intégration import/correction/export. La suite inclut les travaux
concurrents présents dans le checkout ; elle ne constitue pas une validation
humaine des transcriptions. `node --check` passe pour `web/brain.js` et
`tests/brain_folder_acceptance.cjs`. `git diff --check` passe.

Les premiers essais ont permis de corriger le fallback de date native legacy,
une hypothèse de casse du fuseau dépendant du système et les doubles tirets
dans le nom d’export. L’essai sandbox initial ne pouvait pas ouvrir les sockets
de fixture ; les tests ont été relancés avec l’autorisation d’exécution locale.

La recette Electron isolée (`tests/brain_folder_fixture.py`, port 4363, puis
`tests/brain_folder_acceptance.cjs`) utilise uniquement des fournisseurs fictifs :

- 29 fichiers imbriqués, lecture récursive paginée et éléments cachés ignorés ;
- une seule copie simultanée, interruption HTTP 503 simulée au sixième import,
  rechargement et reprise du même lot avec les cinq sources déjà reçues ;
- 28 sources reçues, 27 terminées, deux erreurs isolées : format non pris en
  charge et échec ASR ; le dernier fichier a bien été traité ;
- état conservé après rechargement, texte collé préservé lors de la sélection,
  boutons de relance conformes aux vrais statuts ;
- nom du fichier, sujet, description, YAML, date du nom, date partielle et
  UTC 23 h 30 converti au lendemain en Europe/Paris vérifiés ;
- rendu vérifié aux largeurs 1 500, 900, 390 et 300 px sans débordement,
  aucune erreur JavaScript ni requête échouée hors réponses simulées ;
- 27 appels LLM et deux appels ASR **fictifs**, aucun export dans le coffre réel.

Le premier harness omettait `getData` dans son faux `DataTransfer` ; ce défaut
de test a été corrigé, puis la recette a passé sur une fixture vierge.
L’affichage des dates utilise le fuseau conservé avec la source, même si le
navigateur change ensuite de fuseau. Preuves et captures privées dans
`.atelier/brain-folder-evidence/`, résultat final `result.json`. La fixture
et ses fenêtres Electron ont été arrêtées après la recette.

## Mise en service et limites

Le service réel `http://127.0.0.1:4357/#brain` a été identifié par son workspace
et son répertoire `.atelier/my-brain-interface`, puis rechargé après vérification
de l’absence de traitement actif. Les 16 jobs présents et la configuration ont
été conservés. La surveillance FluidVoice a été momentanément pausée puis
réactivée ; les dictées produites pendant cette courte pause ne sont pas
revendiquées comme importées automatiquement. Le redémarrage observé a pris
0,149 s. Preuve : `.atelier/brain-runtime-evidence/folders-ready-result.json`.

L’onglet réel a été rechargé ; **Déposer fichiers ou dossier**, **Choisir un
dossier**, le pipeline Parakeet → LM Studio → Obsidian et la surveillance active
sont visibles. Capture :
`.atelier/brain-runtime-evidence/mybrain-folders-ready.png`.
Le guide du coffre `my_brain/Accueil My Brain.md` explique les dossiers et le
nouveau YAML. Les notes déjà exportées ne sont pas réécrites automatiquement.

Garder la page ouverte jusqu’à la fin de la copie. Le service doit rester actif
pour terminer le traitement ; après un redémarrage, les jobs interrompus se
relancent explicitement. Limites conservées : 20 Mo par audio, 20 minutes avec
FluidVoice/YouTube, 16 000 caractères par transcription. Un dossier est borné
à 1 000 fichiers, 40 niveaux et 500 caractères par chemin ; les fichiers cachés
sont ignorés. Les métadonnées du navigateur donnent la date de modification,
pas une prétendue date de création. Les formats invalides ont une erreur par
fichier, tandis qu’un manifeste dangereux ou hors limites est refusé en entier.

Les essais audio réels Parakeet/LM Studio/Obsidian restent ceux du
[rapport de mise en service](2026-10-03-my-brain-obsidian-ready.md).
Cette évolution a été vérifiée avec des fournisseurs fictifs et sans nouvelle
inférence réelle de diagnostic. Aucun credential, permission élargie, compte,
modèle téléchargé, commit ou réécriture des notes personnelles.
