# Canaux : Markdown, API locales, skills et analyse critique

Suite du 4 octobre : le runtime prêt inclut désormais limites de tours choisies,
archive complète et récupération des contributions refusées pour capacité.
Activation reste en attente du choix utilisateur de redémarrer les cinq
terminaux ouverts. Voir [correctif et preuves](2026-10-04-channels-history.md).

Date : 3 octobre 2026. [Demande et captures](../references/2026-10-03-channels-markdown-api-skills.md).
Développement partagé entre trois sous-agents : interface/Markdown, API,
skills puis rôle critique/contexte. Intégration, essai local réel, tests globaux
et runtime par l'agent principal. Les modifications préexistantes et celles
d'autres chantiers dans le checkout ont été conservées.

## Résultat

- Messages, plan et contributions consultables rendent les titres, emphases,
  listes imbriquées, citations, tableaux, code et liens sûrs. HTML et images
  restent littéraux ; aucun chargement d'image distante depuis une réponse.
- Huit couleurs contrastées distinguent les participants, y compris ceux de
  même rôle. L'attribution reste stable après réorganisation/rechargement dans
  le même navigateur. Le nom et le rôle restent visibles.
- Connexions propose LM Studio, oMLX, Splash et une API personnalisée. La base
  `/v1` est normalisée. La lecture du catalogue peut suivre l'enregistrement,
  sans génération. LM Studio fournit facultativement les types natifs pour
  séparer LLM et embeddings ; un type absent reste inconnu, sans deviner sur
  le nom. Catalogue reçu et réponse modèle reçue sont distincts.
- L'invitation permet de sélectionner des skills du projet et des consignes
  personnelles de la bibliothèque `/`. Maximum : huit ressources, 16 000
  caractères chacune, 32 000 au total. Le texte est revalidé et figé au
  lancement, puis transmis aux LLM natifs/API. Les hashes et chemins identifient
  les sources par participant, tour et requête/session. Les symlinks sont
  refusés, y compris un remplacement pendant la lecture Unix. Le texte
  complet de la mission de discussion remplace la troncature native à 20 000
  caractères avant le démarrage du thread isolé.
- Le rôle **Questionneur / contradicteur** examine les hypothèses, les choix
  techniques, les optimisations et les écarts à la demande. Tous les LLM
  reçoivent une consigne d'analyse indépendante, de justification publique et
  de réexamen de leurs positions, sans opposition artificielle. Le critique ne
  remplace pas le rédacteur du plan ; un canal composé seulement de critiques
  et consultants ne peut pas démarrer un plan.
- Le contexte long conserve prioritairement les demandes utilisateur et les
  dernières positions des participants. Les propres réponses et celles des
  pairs sont identifiées par ID, même avec des noms identiques. Les extraits
  restent verbatim et les omissions sont affichées ; aucun résumé inventé.
  Le sujet reste ajouté séparément. Budget public : 32 000 caractères de texte
  et 40 000 caractères estimés avec les étiquettes. Les pairs reçoivent la même
  projection au début d'un tour, avec leurs sources choisies séparément.

Fichiers principaux : `web/{channels.js,channels.css,message_markdown.js,
api_connections.js}`, `server/{channels.py,channel_runtime.py,
channel_instructions.py,channel_context.py,api_connections.py}`. La route
`/api/skills` partage désormais le catalogue borné de `SlashCommands`, ce qui
inclut `.agents/skills` et exclut les copies de build et les liens.

## Essai réel demandé

`127.0.0.1:1234/v1/models` expose `qwen3.8-27b-splash` et un embedding Nomic.
Le catalogue natif LM Studio confirme **Qwen3.8 27B Splash chargé**, type LLM,
et Nomic type embedding. Un seul appel court via `ApiConnections.reply` a
répondu **« API locale opérationnelle. »** en **1 846 ms**. Usage effectivement
reçu : 53 tokens entrée, 66 sortie, 119 total. Le champ sortie peut inclure
des tokens de raisonnement du serveur ; Atelier n'en publie pas le contenu.
Les paramètres API affichent « paramètres serveur » et ne prétendent pas que
le raisonnement est désactivé.

Le service Splash distinct sur `127.0.0.1:8001` répond **HTTP 401** sans clé ;
le service oMLX sur 8000 n'est pas joignable au moment du contrôle. Aucun
credential natif, poids de modèle ou dossier personnel `.omlx` consulté.
Preuve privée : `.atelier/channel-api-evidence/live-result.json`. L'essai
utilise un store de sonde séparé ; il n'ajoute pas de faux tokens au canal
utilisateur et ne lance aucune discussion dans celui-ci.

## Validation

| Vérification exécutée | Résultat |
|---|---|
| Suite backend avec Python 3.12 : `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v` | 386 exécutés, 384 réussis, 2 ignorés, 68,134 s |
| Tests canaux/contexte/skills compris dans cette suite | 39 réussis ; isolation, barrière, arrêt, contexte long, identité, critique, limites et sources figées |
| Tests API compris dans la suite | 18 réussis ; HTTP fictif local, URLs, types, erreurs et secrets |
| Tests Node Markdown/identité | Structure, HTML littéral, liens sûrs, collisions, huit couleurs, persistance et contraste réussis |
| Régressions JS partagées | `test_duplica_resources.cjs` (9 cas) et `test_cockpit.cjs` réussis |
| Recette Electron Markdown/canaux | Skills choisis et hash persistant, messages/plan/activité, 1500/1100/800/390/300 px, aucune erreur JS ni débordement global |
| Recette Electron API | Préréglages, deux GET de catalogue fictifs, embedding écarté, enregistrement hors ligne et deux réponses fictives ; 1500/390 px, aucune erreur JS |
| Syntaxe JS et whitespace | `node --check` des fichiers modifiés et `git diff --check` réussis |
| Runtime compilé PyInstaller | Build réussi, puis `tests/channels_frozen_smoke.py` : API normalisée, skill sélectionné/hashé, critique accepté sans pouvoir planifier seul, zéro inférence |

Les deux tests backend ignorés concernent le coffre Windows et l'entrée MCP
packagée, cette dernière exigeant un binaire fourni par la recette release.
Le test frozen de cette livraison vérifie l'HTTP ; il ne prétend pas couvrir
l'entrée MCP. Le premier passage backend a utilisé le Python système 3.9,
incompatible avec les annotations déjà présentes ; le passage complet ci-dessus
emploie le Python 3.12 installé. Le premier build voulait écrire son cache
PyInstaller hors périmètre ; le cache a ensuite été placé dans `build/`.

Captures inspectées : `.atelier/channel-markdown-evidence/markdown-1500.png`,
`markdown-390.png`, `skill-invitation.png`, `skill-source.png`, et les captures
API de `.atelier/api-connection-evidence/`. Journaux et résultats privés :
`channel-api-evidence/backend-tests.log`, `build-runtime.log`,
`channel-markdown-evidence/result.json`, `api-connection-evidence/browser-result.json`,
`channel-frozen-evidence/result.json`. Les fixtures sont arrêtées et conservées.

## Activation locale

La fenêtre utilisateur ouverte utilise `/Applications/Atelier.app` avec un
runtime plus ancien, sur le port 49508 au contrôle. Le runtime corrigé est
préparé sous `build/channel-delivery-20261003/runtime/atelier-service`, à partir
du snapshot de la livraison installée, avec les seuls modules de cette
livraison et la correction du catalogue de skills. Le manifeste liste leurs
hashes. Les autres évolutions en cours dans le checkout ne sont pas introduites
par ce correctif local. Le runtime précédent et une sauvegarde SQLite restent
dans `.atelier/channel-installed-backup-20261003/`.

L'API **Splash via LM Studio** est enregistrée dans l'instance existante avec
le modèle réellement observé. Quatre skills de test du dépôt ont été copiés
dans la bibliothèque du projet Atelier ouvert, sans écraser de fichiers
existants. La carte `task_46e06dbd165f`, **Canaux : analyse critique, skills et
API locales**, est **En revue**, sans agent lancé automatiquement.

**Activation du runtime en attente du choix utilisateur** : cinq terminaux
Codex ouverts sont confirmés par les processus enfants de l'application.
Fermer/reouvrir Atelier les fermerait. Aucun tour structuré, workflow,
appel API ou approbation n'est actif au contrôle. Le correctif compilé et les
sauvegardes sont prêts ; l'application installée n'a pas encore été remplacée.
Après activation, relire le catalogue de la connexion avec le préréglage
LM Studio pour obtenir les types natifs, puis ouvrir Canaux → Inviter →
Skills et consignes. Aucun nouveau participant n'est invité automatiquement
et aucune discussion réelle n'est relancée.

## Limites

Les API fournissent des contributions textuelles au canal. La sélection d'un
skill ne donne ni outil hôte, ni accès PC, ni nouvelle permission. Les fichiers
référencés ne sont pas chargés transitivement. SystemOne, qui reçoit des avis
structurés, refuse les skills textuels. Les procédures de discussion ne sont
pas héritées implicitement par un workflow d'écriture. `on-request`, lecture
seule et contexte privé séparé restent appliqués.

Les hashes prouvent quel texte a été transmis ; ils ne prouvent pas que le
modèle a correctement suivi une méthode. Les nouveaux prompts critiques ont
été vérifiés avec fournisseurs fictifs ; leur efficacité comportementale sur
un débat réel reste à évaluer. Les messages très longs ou très nombreux
peuvent avoir des extraits initiaux ou des omissions intermédiaires explicites.
Les anciennes réponses déjà produites restent inchangées. Les couleurs sont
locales au navigateur et peuvent être réutilisées après retrait d'un acteur.

Sources protocolaires : [catalogue natif LM Studio](https://lmstudio.ai/docs/developer/rest/list),
[catalogue compatible OpenAI](https://lmstudio.ai/docs/developer/openai-compat/models).
Skills de recette appliqués : [atelier-ui-explorer](../../skills/atelier-ui-explorer/SKILL.md)
et [atelier-browser-regression](../../skills/atelier-browser-regression/SKILL.md).
