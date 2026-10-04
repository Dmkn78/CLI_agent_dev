# My Brain — YAML lisible et conservation du texte

## Demande et décisions

Damien rejette l’en-tête technique précédent et demande un format normalisé,
adapté aux pensées, dialogues, récits, conseils à soi et contenus mixtes. Il
demande de consulter Cloudflare/CLEF sur Hugging Face et insiste sur une
correction ASR minimale, sans réécriture de sens, avec texte saisissable et
comparaison avant/après. Trois sous-agents ont pris la recherche/revue critique,
le contrôle de fidélité et l’interface/recette ; le principal a intégré le
schéma, le pipeline, les migrations et la mise en service.

Le schéma My Brain v3 contient 14 propriétés plates et ordonnées : version,
titre, date, origine de la date, source, numéro, sujet, description, formes du
contenu, thèmes, entités, tags, notes liées et langue. Les listes YAML utilisent
une ligne par élément. Les catégories peuvent coexister et suivent un
vocabulaire fermé ; une pensée ne devient pas une tâche par supposition.
Les IDs, hashes, modèles, usages, lots et provenance détaillée restent dans
le suivi privé. Ils servent au contrôle et à la récupération, pas au classement
quotidien de la note. Le [guide](../MY_BRAIN.md) fixe clés, types et exemples.

## Sources consultées

La [fiche officielle CLEF](https://huggingface.co/Cloudflare/clef) identifie le
modèle Cloudflare compatible Jev/SystemOne. Son entrée est un état et des
questions typées ; il renvoie des décisions par option, pas une transcription
libre. Aucun format YAML de notes n’est prescrit. Le schéma My Brain est donc
un contrat local documenté. Le modèle n’a été ni installé ni appelé.

Les [propriétés Obsidian](https://help.obsidian.md/properties) favorisent les
champs atomiques et listes ; leur éditeur ne prend pas en charge les objets
imbriqués. Les [tags](https://help.obsidian.md/tags) purement numériques sont
invalides et sont exclus. Le format date est ISO. La
[syntaxe Obsidian](https://help.obsidian.md/syntax) peut masquer commentaires
HTML ou `%%` : les transcriptions sont donc rendues comme texte littéral avec
des clôtures adaptées, sans changer leur contenu.

Les pages LM Studio sur les
[messages système](https://lmstudio.ai/docs/developer/openai-compat/chat-completions)
et les [sorties structurées](https://lmstudio.ai/docs/developer/openai-compat/structured-output)
confirment le contrat utilisé. JSON demeure le transport entre le modèle et
Atelier ; le document exporté est Markdown avec YAML. Ce format contraint la
structure, sans prouver la fidélité du contenu.

## Texte et contrôle

Le prompt système demande la copie exacte si aucune erreur ASR n’est certaine,
et le plus petit changement nécessaire sinon. Il conserve hésitations,
répétitions, contradictions, ton, langues, chiffres, noms et négations. Il
interdit reformulation stylistique, résumé, conseil, réponse au contenu et
complétion conjecturale. Le modèle ne prétend pas avoir écouté l’audio.

`brain_fidelity.py` compare réellement original/proposition, indépendamment
des corrections déclarées par le modèle. Il conserve des comptes de mots et
des passages bornés, et avertit sur nombres, négations, suppressions, ajouts et
réécritures importantes. `meaningVerified: false` est explicite : la distance
lexicale n’est pas une preuve du sens. Le texte source reste la référence
exportée même lorsqu’une proposition est jugée petite.

L’UI ouvre **Texte brut** par défaut. **Comparer avant / après** surligne les
différences dans les deux textes complets ; **Proposition IA** reste séparée
et annoncée comme non validée. **Reprendre le texte** permet l’édition avant
nouvel envoi ; un brouillon existant peut être conservé, complété ou remplacé
par choix explicite, sans perdre les fichiers sélectionnés.

La note exporte l’original intégral, puis la proposition séparée si différente.
La recherche et le contexte automatique excluent cette proposition non relue.
Des marqueurs appariés, choisis absents des deux textes, évitent les collisions
avec un commentaire dicté et restent indépendants de l’ordre YAML.

## Remise en forme sûre

`POST /api/brain/reformat` ne lance aucune inférence. Il recalcule la présentation
à partir du texte et du résultat conservés, garde le chemin exporté pour les
liens et vérifie l’empreinte avant modification. La note et le job précédents
sont sauvegardés sous `brain/note-backups` dans les données privées du service.
Une note modifiée manuellement est refusée, sans écrasement.

La revue critique a aussi trouvé une course possible entre contrôle et
publication. L’inode réel de la note est désormais déplacé en sauvegarde,
contrôlé puis remplacé par une publication exclusive. Toute édition concurrente
reste dans la note ou la sauvegarde. Une intention persistée permet de reprendre
après une publication réussie suivie d’une panne de mise à jour SQLite.

Autres corrections issues de la revue : caractères de contrôle invalides en
YAML filtrés dans les métadonnées ; tags numériques exclus ; marqueurs appariés
pour ne pas réintroduire une proposition dans la recherche ; blocs littéraux
pour que les commentaires Markdown ne cachent pas le texte. Des tests ciblent
ces cas et les interruptions de migration.

## Vérifications

La première suite ciblée a révélé deux adaptations de test nécessaires : le
test de permission doit désactiver l’export automatique avant la lecture seule,
et le prompt conserve explicitement l’interdiction d’ajouter des métadonnées
venues du contexte. Les corrections sont incluses dans la suite finale.

La recette Electron isolée emploie 27 réponses LLM et une transcription ASR
**fictives**, aucun modèle natif. Elle vérifie brut exact, changements non
déclarés, nombres/négation, textes avant/après complets, brouillon préservé,
anciens jobs, 14 propriétés, téléchargement exact, audio et dossier imbriqué de
24 fichiers (23 terminés, un format rejeté, dernier fichier traité). État
durable, copie séquentielle, largeurs 1 500/900/390/300 px sans débordement ni
erreur JS. Le faux test initial attendait une note sans clôture de texte ;
son assertion a été corrigée sans relâcher le contrôle de l’original.

Preuves privées : `.atelier/brain-fidelity-evidence/result.json` et captures
avant/après. Fixture 4365 et fenêtres Electron fermées. Le YAML téléchargé a
également été parsé par Ruby/Psych : 14 propriétés, date typée et listes valides.
Les fichiers JS modifiés passent `node --check` ; `git diff --check` passe.

Commande backend requise avec Python fourni :
`PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v`.
Résultat final : **414 tests, 412 réussis, deux ignorés**, 76,402 s.
Log privé : `.atelier/brain-runtime-evidence/backend-fidelity-final.log`.
Les 13 tests purs de fidélité et les tests de format/migration couvrent
notamment édition concurrente, reprise après panne, conservation des espaces,
des commentaires dictés et des textes complets. Le checkout comprend aussi
des évolutions concurrentes préservées, sans commit de cette tâche.

## État réel laissé

Le service 4357 a été vérifié par son workspace et son répertoire de données
avant redémarrage. La première tentative s’est arrêtée parce que des dictées
étaient actives ; aucun traitement n’a été interrompu. Les nouveaux imports
ont ensuite été pausés, la file laissée finir, puis le service mis à jour.
La reprise explicite conserve le curseur FluidVoice et permet de récupérer
les dictées produites durant la pause. Les inférences ordinaires de cette
surveillance sont celles des vocaux de l’utilisateur, pas une campagne de test.

**30 notes générées** ont été remises en forme ou vérifiées au format v3,
avec leurs sauvegardes conservées et leurs chemins inchangés ; aucun refus de
modification manuelle sur ces 30 notes. Le dernier rechargement avec migration
a pris 0,362 s, configuration conservée et surveillance réactivée. Aucune
inférence n’a été demandée par la migration. Les trois nouveaux vocaux de
la première pause ont été repris par le pipeline normal.

Le contrôle natif d’Obsidian a confirmé 14 propriétés et la présence des deux
versions. Il a révélé l’inférence automatique du type date pour un titre égal
à une date. Le type titre a été fixé à Texte via son menu, puis les 14 types
du coffre ont été explicitement normalisés dans `.obsidian/types.json`, en
préservant les autres réglages et une copie précédente : titre/numéro en texte,
date en date, catégories/thèmes/entités/liens en listes. Les notes sources
FluidVoice indiquent désormais l’application, sans UUID natif dans `source`.
La migration ne remonte plus artificiellement les anciennes sources en tête
de l’historique, trié par date d’import.

Ruby/Psych a validé les **30 en-têtes réels** : 14 clés, titres/numéros en
chaînes, dates et listes correctement typées. La comparaison réelle et le
YAML simplifié ont été ouverts dans My Brain sur la note de test publique
Tears of Steel. Son texte brut et sa proposition sont identiques ; son passage
anglais ambigu reste à relire. Les descriptions/catégories absentes des
anciens résultats restent vides, sans nouvelle classification inventée.

Preuves privées : `fidelity-ready-result.json`, `yaml-validation-fidelity.json`,
`obsidian-types-before-fidelity.json`, `mybrain-fidelity-ready.png` sous
`.atelier/brain-runtime-evidence/`. L’onglet My Brain est conservé, le guide du
coffre est à jour. La qualité ASR dépend toujours du son et du modèle ; aucune
garantie de correction sémantique n’est déduite d’un faible diff.
