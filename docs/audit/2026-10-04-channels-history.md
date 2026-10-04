# Canaux : limite choisie et archive conservée — 4 octobre 2026

## Défaut constaté

Le service précédent impose 6 tours fixes, 50 tours automatiques par lancement,
512 messages, 240 000 caractères d'historique et 140 tours enregistrés. Le
contrôle de taille après réception des contributions peut refuser leur
publication, même après une réponse finalisée des fournisseurs. Ces plafonds
d'archive n'ont pas de rapport avec la taille du contexte envoyé aux modèles.

Une copie SQLite cohérente de l'instance installée conserve 142 messages,
237 400 caractères et 70 tours dans `channel_d757c6603bb0`. Son dernier tour,
numéro 48, a échoué sur la taille d'archive. Les échanges publiés sont toujours
présents. Deux sessions natives finalisées pendant ce tour contiennent des
réponses qui ne sont pas publiées dans le canal. L'original est conservé.

Preuves privées : `.atelier/channel-history-evidence/before.json`,
`installed-before-history-fix.sqlite`, `unpublished-round-metadata.json`.
La [capture utilisateur](../references/screenshots/2026-10-03-channels-history-full.png)
est une observation du défaut ; son texte ne donne aucune instruction
d'exécuter une campagne ou de fermer les terminaux.

## Évolution demandée

Limite positive choisie sans plafond imposé, option sans plafond en mode
accord des participants, arrêt manuel et reprise explicite. Archive complète
persistante dans le même canal, migration sans perte et chargement progressif
des anciens échanges. Le contexte modèle et les pages affichées restent bornés.

Le backend, l'interface et la revue indépendante sont confiés aux trois
sous-agents déjà mobilisés. Les tests utilisent des fournisseurs fictifs.

## Backend livré et vérifié

`server/channel_archive.py` archive messages et tours en SQLite, avec index
par canal/séquence/auteur et compteurs persistants. Migration, contributions,
état du tour et projection récente sont enregistrés dans la même transaction.
La projection stockée dans l'objet canal garde au maximum 120 messages et
240 000 caractères de texte ; l'archive entière reste conservée. Les tours
récents sont bornés à 80 et 240 000 caractères de JSON.

`GET /api/channels/history` propose des pages chronologiques de 1–100 messages,
240 000 caractères maximum, avec `before` ou `after` exclusifs. Aucun texte
n'est coupé par la pagination. `GET /api/channels/rounds` permet aussi d'accéder
aux anciens tours sans contribution, avec curseur de position. Ces routes
conservent la vérification de Host, Origin et nonce local. Les métadonnées
de contexte très volumineuses des tours associés à une page de messages
peuvent être omises explicitement ; la page des tours garde leur source.

Le contexte modèle utilise des candidats indexés : première demande,
64 demandes récentes, dernière position de chaque participant actif et
128 messages récents. Le budget de texte reste 32 000 caractères ; identités
et enveloppes sont aussi bornées. Les comptes d'omissions portent sur toute
l'archive, même lorsque les listes d'identifiants sont des échantillons.

La récupération de l'ancien défaut exige un tour de discussion échoué pour
cette erreur précise, aucune contribution publiée, et une seule session
native finalisée par participant, créée dans l'intervalle du tour et portant
les bons identifiants. Toutes les contributions doivent passer les mêmes
gardes de texte public. Attribution ambiguë, contenu privé, contribution déjà
publiée ou source API empêchent la récupération. La provenance et l'ancien
échec restent enregistrés. La reprise de discussion demeure explicite.

Sur la copie réelle : **142 objets message publiés identiques**, **deux réponses
finalisées récupérées**, **144 messages / 240 935 caractères / 70 tours**.
Redémarrage idempotent et projection d'état vérifiés. Aucune donnée installée
modifiée et aucun fournisseur démarré par cette recette ; elle instancie
uniquement Store et ChannelHub sur une copie privée.

| Vérification | Résultat |
|---|---|
| Suite backend complète Python 3.12 | 446 tests, 444 réussis, deux ignorés, 81,863 s |
| Tests ciblés `test_channel*.py` compris dans la suite | 59 réussis |
| Revue indépendante avec fournisseurs fictifs | Migration de 620 messages / 161 tours, choix de 61 tours, accord après 53, arrêt après 55, récupération durable et refus des sources ambiguës/privées |
| HTTP local isolé | 530 messages paginés dans les deux directions sans doublon ; nonce requis ; curseurs invalides refusés |
| Migration de la copie utilisateur | Tous les objets publiés identiques, deux réponses récupérées et seconde ouverture sans doublon |

Les deux tests ignorés concernent le coffre Windows et l'entrée MCP packagée,
qui exige un binaire de recette spécifique. Un premier passage complet a
chargé une version intermédiaire du nouveau fixture de tour vide pendant son
édition ; il a échoué sur cette fixture. Le passage stabilisé ci-dessus est
vert ; le journal intermédiaire est conservé séparément.

Preuves privées : `.atelier/channel-history-evidence/backend-tests.log`,
`backend-tests-intermediate.log`, `installed-migration-result.json` et ses
dossiers `migration-*`. Aucune campagne ni inférence réelle lancée pour ces
vérifications.

## Interface et runtime vérifiés

Options du canal : limite personnalisée sans maximum 6/50, ou aucun plafond
en mode accord. Navigation Messages précédents / Messages plus récents /
Derniers échanges dans le même canal. La fenêtre du navigateur est bornée à
300 messages et 480 000 caractères ; les autres restent dans l'archive.
La lecture historique n'est pas remplacée par les rafraîchissements récents.
Le rechargement restaure une fenêtre et son ancre en quatre requêtes maximum,
sans télécharger toute l'archive. Aucun texte n'est copié dans localStorage.
Les réponses récupérées portent une étiquette explicite.

La revue indépendante a reproduit deux erreurs de concurrence/état : une
réponse ancienne reçue après Derniers échanges créait un trou d'affichage,
et une restauration échouée gardait de mauvaises bornes malgré une navigation
réussie. Contrôles désactivés immédiatement, génération de requête et remise
à zéro des indicateurs corrigent ces cas. Ils sont vérifiés indépendamment.
Le changement de projet pendant une requête garde le bon propriétaire du
cache et de la position sauvegardée.

| Vérification complémentaire | Résultat |
|---|---|
| Tests Node historique et Markdown | Merge paginé, lecture figée pendant refresh, fenêtre bornée, erreurs récupérables, courses async, limites, identité et Markdown sûr réussis |
| Recette Electron | Archive fictive 650 → 652, premier échange accessible, navigation avant/après/derniers, reprise même canal, scroll préservé ; deux requêtes observées au rechargement |
| Réglages dans le navigateur | Auto 120, fixe 99, sans plafond `null`, ancien défaut 24 vérifiés |
| Layout et captures | 1500/900/390/300 px, bornes et scrollWidth des panneaux vérifiés ; aucune erreur JS ; captures desktop et mobile inspectées |
| Runtime compilé isolé | PyInstaller réussi, puis smoke HTTP : 530 messages anciens identiques migrés/paginés/repris, curseur `after`, options 81/null, skill hashé, critique accepté, zéro inférence |
| Cohérence de livraison | Hashes des 12 fichiers du snapshot et assets web embarqués comparés ; syntaxe JS et `git diff --check` réussis |

Les captures Electron fullPage ont d'abord produit un relayout en retirant
la scrollbar verticale. La fixture stabilise sa gouttière pour les captures ;
les mesures de layout réel sont conservées et aucun changement de CSS produit
n'est attribué à cet artefact.

Preuves privées : `.atelier/channel-history-evidence/result.json`,
`archive-oldest.png`, `history-*.png`, `build-runtime.log`,
`delivery-verification.json`, `.atelier/channel-frozen-evidence/result.json`.
Les fixtures Electron/HTTP et le service compilé de recette sont arrêtés.

## Activation en attente

Le runtime consolidé est prêt sous
`build/channel-delivery-20261003/runtime/atelier-service`, avec Markdown,
identités, API, skills, critique et cette correction d'archive. Le snapshot
minimal reste basé sur la version installée, avec les seuls modules de cette
livraison et ses routes HTTP. Les travaux en cours d'autres chats ne sont pas
introduits par cette livraison. Le manifeste et ses hashes sont conservés.

L'instance `/Applications/Atelier.app` est toujours ouverte avec cinq vrais
terminaux Codex enfants du processus 1971. Le choix de fermer/reouvrir ces
terminaux demandé précédemment n'a pas encore été donné. Le runtime installé
et la base utilisateur restent inchangés ; les 144 messages existent pour
l'instant dans la copie de validation. Après accord et arrêt de l'application,
faire une sauvegarde SQLite fraîche avant remplacement et migration. Aucun
débat réel n'est relancé automatiquement.

La récupération ne peut pas recréer une ancienne réponse API dont aucun
texte n'a été enregistré, ni deviner une attribution ambiguë. Ces sources
restent conservées. L'archive complète occupe le stockage local ; elle est
distincte du contexte partiel transmis au modèle et de la fenêtre affichée.
