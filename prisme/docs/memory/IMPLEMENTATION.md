# Prisme — état de livraison

Application locale indépendante, démarrée avec `Prisme.cmd` ou
`python -B run.py --open`. Tout le projet reste dans le dossier `prisme`.
Python et Codex CLI restent des dépendances installées sur la machine ; aucun
module d'Atelier n'est importé. Le lanceur réouvre une instance existante
uniquement si elle sert la même bibliothèque.

## Ce qui existe

- Accueil consacré au dépôt et à la bibliothèque, sans barre latérale.
  Les quatre expériences préfabriquées sont un exemple secondaire.
- Import PDF, PNG, JPEG, WebP, TXT et Markdown. Originaux, hashes, images des
  pages et numérotation conservés. Texte natif extrait ; scans, images et
  dessins vectoriels transmis visuellement lors de la création.
- Création générique par lots avec `codex app-server` en stdio. Compte lu sans
  copie de credentials ; `model/list` paginé avec efforts fournis par Codex.
  Modèle, effort et lecture seule/écriture du dossier de cours sont explicites.
  Permissions `on-request`, annulation et demandes d'autorisation observées.
- Prompt embarqué, profil d'apprentissage modifiable, prérequis, preuves
  complètes, prédictions, reconstructions, corrections et applications utiles.
  Une préférence spatiale n'est pas considérée comme un diagnostic.
- Expériences spécifiques en HTML/JS natif, canvas ou SVG, dans une iframe
  opaque sans réseau ni accès au parent. Les laboratoires spécialisés restent
  disponibles seulement pour les concepts auxquels ils correspondent.
- Cours continu à droite et laboratoire fixe à gauche. Une section active
  change l'expérience ; défiler dans la même section conserve ses paramètres.
  Les gestes de lecture ordinaires à gauche suivent le cours à droite.
- Notes, réponses et auto-évaluations sauvegardées. Les rappels sont déduits
  de l'auto-évaluation, jamais présentés comme une maîtrise mesurée.
- HTML autonome contenant cours, scripts, styles, sources et notes. Archive
  ZIP comprenant aussi les originaux, le manifeste et les hashes.
- Sources conservées après échec/arrêt ; sorties invalides non publiées ;
  ancienne édition sauvegardée avant remplacement ; jobs interrompus signalés
  au redémarrage.

## Organisation

`prisme/ingestion.py` prépare les sources ; `generation.py` orchestre les lots ;
`codex_client.py` adapte le protocole ; `course_contract.py` contrôle structure
et couverture des pages ; `storage.py` conserve cours et apprentissage ;
`http_server.py` expose la frontière locale ; `exporter.py` crée les documents.
`web/` contient la fabrique et le lecteur ; `templates/` le lecteur autonome ;
`prompts/course-factory.txt` le contrat pédagogique embarqué.

Les imports sont bornés à 12 fichiers, 25 Mo chacun, 40 Mo au total et
100 pages. Chaque page préparée doit être référencée dans la sortie validée.
Les documents sont des données, jamais des permissions d'exécution.

## Vérification et limites

60 tests Python et 10 tests JavaScript passent. Syntaxe des modules et du
script du HTML réellement téléchargé vérifiée. Recette navigateur du dépôt,
de la création fictive, du paramètre, du défilement, des sources, des notes et
du téléchargement effectuée. Voir le rapport et ses captures.

Le Codex CLI réel répond et expose 11 modèles ; son compte est non connecté
au dernier contrôle. Aucune inférence réelle n'a été lancée. La création avec
un compte réel et un cours personnel reste à valider après `codex login`.

L'ouverture de fichiers locaux est interdite par le navigateur intégré.
Le HTML a été téléchargé et contrôlé, mais son exécution sous `file://` n'a
pas été vérifiée. Pas de contournement de cette politique. La justesse d'une
expérience générée reste à confronter au cours et à ses sources.

Les essais de taille effectués ont montré 1145/1280 px de largeur. La demande
de viewport mobile n'a pas modifié la taille observée dans cet environnement ;
la recette mobile ne peut donc pas être déclarée réussie.

Pas d'import Office, de téléchargement de vidéos, ni d'OCR séparé du modèle.
Les données `.prisme/` sont privées, ignorées par Git et à garder lors d'un
déplacement complet du dossier.
