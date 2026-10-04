# Vidéo 04 — NovaFactory, Jour 5 : tokens, cache et choix des agents

Analyse du 3 octobre 2026, modèle demandé : GPT-6.1-Sol. Source intégralement lue : [transcription video-04](../../references/2026-10-03-video-transcriptions/video-04.md), 1 057 lignes, couvrant 0:01–1:58:23. [Vidéo d’origine](https://www.youtube.com/watch?v=tqXt3ij82YU). Le fichier video-05 est identique, SHA256 `8a2ac4d70de97826a27caac6bb8f07aac83dea011ff2330bf7dec1806718fb51` : aucune seconde expérience indépendante.

L’épisode apporte surtout une interface d’observation et un essai comparatif exploratoire. Il soutient l’intérêt d’une spécification réutilisable, sans démontrer qu’un grand modèle associé à un petit est toujours moins coûteux. Les montants ci-dessous sont rapportés par le présentateur ; cette analyse de transcription ne vérifie ni les pixels de la vidéo ni les journaux source de NovaFactory. Les noms « Fable », « Astra », « Sol », « Opus », « Grock » et « Dipsic » restent les désignations transcrites, sans déduire un catalogue fournisseur.

## Méthode reconstituée

Deux évolutions préparées hors caméra sont présentées : détail des tokens/coût au clic dans un terminal et refonte de Consommation. La réalisation a suivi description du problème, spécification, lecture humaine du design, implémentation et review ; le présentateur corrige lui-même son expression « one shot » et indique plusieurs allers-retours (3:54–5:41, L40–57). La review compare résultat, spécification et design ; elle peut conduire à plusieurs corrections (2:29–3:07, L27–33 ; 19:04–19:57, L183–192).

L’exercice du soir consiste à reproduire un thermomètre de Galilée avec interactions physiques et effets visuels. Un prompt enregistré, en anglais, est lancé dans des dossiers distincts initialement vides. DeepSeek Flash reçoit un effort max et une précision de sortie HTML ; les autres agents reçoivent le prompt annoncé identique, avec paramètres contrôlés manuellement (24:28–28:24, L235–269 ; 31:39–32:14, L298–304). Une branche parallèle demande à Fable et Astra une spécification Markdown, ensuite confiée à DeepSeek, puis à Sol.

Le MCP est désactivé pour limiter l’accès aux autres sessions (30:50–31:11, L291–294). Une demande de lecture extérieure de Fable est refusée (49:00–50:56, L455–470). Cela montre une vigilance, sans prouver une isolation complète. Plus tard, le présentateur essaie un « automode » pour réduire les demandes d’autorisation (1:29:49–1:30:46, L795–804) : les conditions changent pendant l’expérience.

## Constats, preuves et transposition

| Constat | Preuve horodatée et lignes | Transposition à Atelier |
|---|---|---|
| Coût accessible depuis le terminal, incluant des sous-agents | 0:57–2:29, L13–27 : environ 135 €, dont orchestrateur ~40 € et implémentation ~90 € | Détail compact, arbre parent/enfants et couverture explicite |
| Cache séparé dans la ventilation, réintégré au total annoncé | 7:53–9:11, L78–90 | Normaliser les conventions fournisseur avant toute somme |
| Grille tarifaire récupérée au bouton, change réglable | 9:31–10:49, L93–106 | Historiser tarifs et taux utilisés par chaque estimation |
| Quotas visibles dans un overlay selon leurs fenêtres | 15:29–16:17, L148–156 | Montrer fenêtres reçues, échéances et fraîcheur ; conserver un en-tête minimal |
| Interruptions/reprises contaminent le coût précédent | 28:54–30:31, L273–288 | Compter essais avortés et interventions séparément |
| Une spécification peut transmettre aussi un défaut | 1:13:43–1:15:30, L656–672 | Valider ses critères avant réutilisation et tracer son hash |
| Efforts différents et appréciation visuelle subjective | 1:11:18–1:13:04, L634–650 | Comparaisons par configuration et grille d’acceptation explicite |

## Tokens et coût : ce qui est réellement observable

### Collecte et périmètre

La transcription décrit l’accès aux « données lié à cette session » et des ventilations par intervenant, mais ne donne aucun nom de fichier, événement, endpoint, parseur ou protocole de collecte. Elle ne prouve pas davantage comment sont rattachés les sous-agents, éliminés les doublons ou gérés les changements de modèle. Il serait donc incorrect d’attribuer à NovaFactory un collecteur précis.

La couverture varie : à 35:23–35:57 (L333–338), l’overlay n’est pas encore injecté dans les OpenCode, alors que DeepSeek dispose déjà de nombres de tokens/dollars. À 21:07–21:15 (L203–204), le présentateur remarque « relevé impossible » sans savoir si des résultats manquent. Un total affiché ne garantit donc pas une mesure complète. Le coût de l’orchestrateur, de l’implémentation et de la review est utile, mais la transcription ne permet pas de réconcilier tous les agents Grok auxiliaires mentionnés.

### Cache : volume, inclusion et prix

Le présentateur explique qu’une information relue bénéficie d’un tarif différent et qu’il excluait auparavant le cache lu du total. Cette explication pédagogique ne décrit pas techniquement la clé du cache, sa durée, ses invalidations ou le contexte réellement réutilisé (8:00–9:19, L79–91). Elle ne permet pas d’affirmer que le cache correspond simplement à une ouverture de fichier local.

La grille annonce 20 USD/million pour l’écriture et 0,25 USD/million pour la lecture de cache de Fable ; un exemple attribue 178 USD de lecture à un total de 245 USD (10:54–11:33, L107–113). Soit **72,7 %**, calcul analytique `178/245`, malgré un prix unitaire faible. Cela illustre qu’un grand volume répété peut dominer un coût. Ce n’est ni une loi générale ni un tarif actuel vérifié. Les volumes bruts, la composante entrée ordinaire, la sortie, la durée d’écriture et l’instant tarifaire manquent : aucun recalcul indépendant n’est possible.

Pour Atelier, le schéma normalisé inclut déjà le cache dans l’entrée. Une formule adaptée est `((entrée − cache_lu − cache_écrit) × prix_entrée + cache_lu × prix_lecture + cache_écrit × prix_écriture + sortie × prix_sortie)/1 000 000`, uniquement lorsque chaque catégorie et sa convention sont connues. Ajouter encore le cache au total créerait un double comptage. Le raisonnement éventuellement compris dans la sortie ne doit pas être ajouté automatiquement non plus.

### Équivalent API, abonnement et facturation

NovaFactory multiplie les catégories de tokens par une grille USD, puis convertit en euros avec un taux réglable. La version temporelle des tarifs et la récupération dynamique du change sont **envisagées**, pas démontrées comme livrées (9:31–10:49, L93–106).

Les 588 USD annoncés pour une journée et 31 000 USD sur trente jours sont des équivalents API ; le présentateur dit les avoir consommés dans ses abonnements (11:47–12:36, L115–122). Ils ne constituent pas une facture supplémentaire ou une économie comptable démontrée. Il précise que renouvellements, changements de comptes, chevauchements d’abonnements et resets faussent la période (12:42–14:34, L123–140). Atelier ne doit en déduire ni stratégie de comptes ni permission d’automatiser ces pratiques.

Les 10–15 % d’une fenêtre de cinq heures et 4 % hebdomadaires attribués aux deux Fable sont une observation/commentaire du présentateur (1:09:09–1:09:30, L616–619), sans relevés avant/après isolés. Un quota partagé ne se convertit pas en coût de session : d’autres clients ou usages simultanés peuvent intervenir. « Rien payé » signifie ici absence de paiement marginal annoncé, avec abonnement déjà payé.

### Reprises et attente

Les interruptions/reprises ont, selon le présentateur, consommé une majorité du coût de l’essai précédent ; `/usage` ne répondait pas, et demander au modèle les coûts n’apportait pas les tokens nécessaires (29:01–29:58, L274–283). La correction utile consiste à observer des compteurs natifs et des tentatives, sans provoquer une nouvelle inférence pour expliquer un prix.

Les longs silences ne prouvent pas l’inactivité : le présentateur hésite lui-même entre attente et travail invisible, tout en disant que le prompt et les instructions sont déjà consommés (33:40–34:13, L317–322). La spec Fable est annoncée à 7,28 € après trente minutes, dont neuf minutes de travail supposées (1:03:03–1:03:40, L562–568). Cette estimation humaine ne sépare pas latence fournisseur, raisonnement, outils et attente d’approbation.

## Petits/grands modèles : comparer le chemin complet

Les montants annoncés progressent pendant les tours : DeepSeek direct ~0,12 € (1:08:18, L608), Grok 2,28 €, Astra ~3 €, Fable ~10 € encore inachevé (1:06:29–1:06:53, L592–596), Sol direct 0,63 € (1:20:17, L713). Ce sont des points de lecture, pas une table finale exhaustive.

La comparaison finale fournit une base plus utile : Astra direct ~3 €, spec Astra 2,71 € et implémentation Sol 0,88 €, soit **3,59 €** (1:39:16–1:40:09, L881–888). Avec DeepSeek à 0,13 €, le chemin vaut **2,84 €**, contre Opus à 7,45 € (1:44:40–1:45:36, L929–937). Le gain face à Astra direct est seulement ~0,16 € ; l’hybride Sol est plus cher. Ces additions n’incluent aucune review supplémentaire non indiquée.

Réutiliser une spec peut amortir sa préparation : hypothétiquement, `2,71 + n × 0,13` face à `n × 3`, à qualité comparable et sans coûts supplémentaires. Les prix de ces essais ne permettent pas de garantir ces hypothèses pour d’autres tâches.

Le meilleur contraste contrôlé est Sol direct contre Sol avec spec Astra, tous deux en « high » selon le présentateur (1:34:53–1:35:20, L840–845). Le reste mélange souvent « X/max » et « high ». L’amélioration visuelle est plausible ; aucune répétition, oracle physique ou évaluation aveugle ne la quantifie. Les essais locaux sont seulement annoncés pour la suite (1:47:32–1:47:58, L954–958).

## Atelier : acquis et améliorations prioritaires

Les [demandes canoniques](../../memory/USER_REQUEST.md), L108–109 et L157–161, exigent déjà cette distinction. Le code observé reçoit `thread/tokenUsage/updated` et calcule les deltas depuis une baseline ([server/app.py](../../../server/app.py), L484–487, L636–648). Les compteurs natifs Codex viennent des événements `token_count` des rollouts ([native_usage.py](../../../server/native_usage.py), L89–102). Cela décrit Atelier, pas NovaFactory.

Les quotas sont explicitement partagés ([workbench.js](../../../web/workbench.js), L67–74), les tarifs rapprochés/calculés avec refus des catégories inconnues (L76–98), et l’estimation dépend des requêtes mesurées ([session_usage.js](../../../web/session_usage.js), L69–75). L’[audit récent](../2026-10-03-architecture-memory-usage.md) documente les sources officielles et le cache de 24 h. Rafraîchir un tarif ne suffit cependant pas à figer l’estimation historique.

Deux écarts méritent vérification : `nativeSubagent` est collecté (native_usage.py, L191–215), mais absent de `consumptionRecords` ([cockpit.js](../../../web/cockpit.js), L103–121). Les totaux ne démontrent donc pas une couverture enfants complète. Le seuil de contexte utilise l’entrée agrégée et l’écriture absente vaut zéro hors Anthropic (workbench.js, L88–97) : ces hypothèses doivent dépendre du protocole fournisseur.

- **P0 — Couverture et provenance** : détail par tentative/agent/requête, source native, date d’observation, champs manquants et périmètre parent/enfants. Préserver inconnu/partiel ; fixture avec reprise, doublon et enfant non mesuré.
- **P1 — Estimation reproductible** : snapshot tarifaire et change horodaté référencés par estimation ; afficher USD original, EUR converti, détail entrée/cache/sortie et date. Recalcul historique explicitement distinct.
- **P1 — Comparaison complète** : total spec + implémentation + corrections + review + essais interrompus ; distinguer qualité acceptée, déclaration d’agent et preuves exécutées. Préparer des fixtures avant toute campagne autorisée.
- **P1 — Configurations traçables** : hash prompt/spec, modèle/effort reçus du catalogue dynamique `model/list` ([app.py](../../../server/app.py), L107–126), permissions et outils observés. Respecter le choix explicite de Damien, sans remplacement automatique.
- **P2 — Durées et local** : séparer durée native reçue, attente mesurable et durée murale ; coûts électriques/matériels seulement avec données fournies, jamais zéro inventé.

## Limites

Transcription bruitée, montants arrondis, absence d’artefacts NovaFactory, de logs, de tarifs versionnés et de volumes détaillés. Les assertions finales sur subventions, avenir des abonnements ou droit européen ne sont pas vérifiées et ne deviennent pas des règles Atelier. Seul ce rapport a été créé ; aucune modification applicative, mémoire, inférence ou campagne fournisseur n’a été réalisée.
