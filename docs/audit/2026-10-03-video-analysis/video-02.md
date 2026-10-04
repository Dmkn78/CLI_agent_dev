# Vidéo 02 — Jour 7 : de la maquette à l’application

Analyse du 3 octobre 2026 pour Damien. Source intégralement lue : [transcription vidéo 02](/Users/damien/Desktop/IA_Interface_dev/docs/references/2026-10-03-video-transcriptions/video-02.md), 473 lignes, de 0:01 à 50:24. Comparaison limitée à CORE, INDEX, USER_REQUEST et aux passages utiles d’IMPLEMENTATION. Aucun visionnage, appel fournisseur, campagne, lecture de secrets ou modification du code/de la mémoire. Les références décrivent une conception ; elles n’autorisent aucune exécution.

## Ce que cette source permet d’affirmer

La transcription contient des descriptions orales de manipulations et d’écrans, des déclarations rétrospectives et des hypothèses. « Fonctionne parfaitement » reste le jugement du présentateur : ni captures ni logs bruts ne sont joints ici. Les noms transcrits « Fable », « sonné », « cloud », « aspect », « coups » sont parfois ambigus ; le contexte suggère spécification et coûts, sans autoriser à reconstruire les identifiants exacts des fournisseurs.

| Passage, lignes exactes | Nature et enseignement |
|---|---|
| 0:19–2:20, [L8–26](/Users/damien/Desktop/IA_Interface_dev/docs/references/2026-10-03-video-transcriptions/video-02.md:8) | Déclaration : roadmap réalisée pendant la nuit ; refonte avec deux choix Codex successifs, puis annonce « maquette prête » à l’autre agent. |
| 6:10–6:44, [L62–67](/Users/damien/Desktop/IA_Interface_dev/docs/references/2026-10-03-video-transcriptions/video-02.md:62) | Description d’écran : TODO → travail → review → complet, avec spec, plan et review consultables par lot. |
| 14:14–15:10, [L137–146](/Users/damien/Desktop/IA_Interface_dev/docs/references/2026-10-03-video-transcriptions/video-02.md:137) | Récit : conception initiale, conversation couplée, orchestrateur Opus, workers choisis selon difficulté, review confiée au modèle appelé « sonné ». |
| 16:08–18:31, [L155–178](/Users/damien/Desktop/IA_Interface_dev/docs/references/2026-10-03-video-transcriptions/video-02.md:155) | Reprise et copie des coûts ; tokens entrée/sortie évoqués. Tarifs codés en dur : hypothèse explicite, pas inspection prouvée du code. |
| 23:14–29:32, [L220–275](/Users/damien/Desktop/IA_Interface_dev/docs/references/2026-10-03-video-transcriptions/video-02.md:220) | Description orale : version initiale introuvable après mise à jour ; écarts entre maquette et application, particulièrement page coûts. |
| 35:11–36:13, [L327–337](/Users/damien/Desktop/IA_Interface_dev/docs/references/2026-10-03-video-transcriptions/video-02.md:327) | Risque déclaré : approbation d’un agent secondaire invisible, donc attente indéfinie. Aucun routage corrigé démontré. |
| 46:34–48:53, [L437–458](/Users/damien/Desktop/IA_Interface_dev/docs/references/2026-10-03-video-transcriptions/video-02.md:437) | Diagnostic rapporté : surveillance de fichiers amplifiée par les builds ; correction rouge/vert et sondes annoncées, résultat final absent. |

## Parcours de travail à retenir

Le parcours est onboarding → plan/spec/roadmap → maquette → orchestrateur/implémentation → review → essais humains → nouvelles TODO. La maquette évolue pendant l’implémentation. Le présentateur explique les écarts par une base déjà commencée et une correction trop approximative (28:37–29:32, L266–275) : c’est son hypothèse causale. Notre déduction utile est un besoin de handoff versionné, plutôt qu’un simple message « prêt ».

L’application d’essais importe un rendu, son titre, identifiant, prompt et modèle/version ; compare des variantes selon auteur de spec et auteur d’implémentation (8:22–13:34, L83–131). La provenance expose date, heure, import et remplacement, mais le prompt sélectionné est incorrect selon le commentaire (30:29–31:06, L283–289). Une comparaison reproductible doit donc lier les bons artefacts, pas seulement proposer deux aperçus. Le plein écran est demandé oralement parce que les animations sont trop petites ; ce n’est pas une capacité démontrée (11:12–12:36, L109–122).

Atelier possède déjà artefacts hashés, rapports déterministes, graphe/handoffs, conception en lecture seule et validation séparée de l’implémentation ([IMPLEMENTATION L322–323, L388, L541](/Users/damien/Desktop/IA_Interface_dev/docs/memory/IMPLEMENTATION.md:541)). Son runner Duplica fournit désormais dépendances, parallélisme, conflits sérialisés et recette indépendante ([L5–26](/Users/damien/Desktop/IA_Interface_dev/docs/memory/IMPLEMENTATION.md:5)). Les anciennes lignes « séquentiel » du tableau historique ne doivent pas effacer cette évolution. La finition pertinente est une chaîne lisible demande → version de spec → maquette approuvée → tâches → preuves → recette humaine. Conserver **En revue** après review : le passage automatique à « complet » raconté dans la vidéo contredit le contrat humain d’Atelier.

## Consommation : l’apport principal

Les montants annoncés sont environ 436 $ pour roadmap/conception, 18 $ pour première maquette, 35 $ pour amélioration, puis de petites corrections ; le total est arrondi à environ 500 $ (2:35–4:06, L28–42). L’arithmétique orale hésite : ces chiffres ne constituent pas une facture ni un total auditable. À 5:05–5:12 (L52–53), le présentateur précise l’**équivalent API** et les abonnements déjà payés. Afficher « 500 $ dépensés » serait donc trompeur.

La reprise `/resume`, décrite à 16:08–16:19 (L155–157), sert à récupérer une ancienne conversation. Demander au modèle ses coûts ajoute lui-même de la consommation et fausse le relevé (16:25–16:31, L158–159). Puis le présentateur copie un onglet, colle, enregistre et contrôle les compteurs ; il mentionne un centime d’écart et une conversion dollars/euros (16:44–17:34, L161–169). Les nombres prononcés à L167 sont trop peu structurés pour attribuer sûrement les catégories. Retenir le mécanisme, sans importer ces valeurs dans Atelier.

Atelier dispose déjà de mesures par fournisseur/session/tâche/modèle/requête, export CSV, quotas Codex, compteurs CLI associés et clôture sans inférence ([IMPLEMENTATION L359, L264–265, L388](/Users/damien/Desktop/IA_Interface_dev/docs/memory/IMPLEMENTATION.md:359)). Les tarifs officiels OpenAI/Anthropic sont maintenant récupérés avec correspondance exacte et cache de 24 h ([L543](/Users/damien/Desktop/IA_Interface_dev/docs/memory/IMPLEMENTATION.md:543)). Ce cache de tarifs est distinct du **cache de tokens**, que la vidéo ne détaille pas. Elle ne donne ni ratio de cache, ni formule tarifaire, ni méthodologie de quota, ni dépenses effectivement facturées. L’overlay de limites est décrit à 42:10–42:17 (L395–396), sans chiffres ni preuve d’une fuite causée par cet overlay.

La bonne finition : un relevé exportable sans modèle, avec source, date, périmètre et détail entrée/sortie/cache seulement lorsqu’observés ; agrégation par phase conception, réalisation, review, correction. Montrer séparément équivalent API estimé, coût facturé importé, abonnement et quota natif. Un tarif inconnu ou une catégorie absente reste inconnu. Conserver le tarif utilisé au moment du calcul permettrait de comprendre un ancien montant après actualisation ; versionnage tarifaire, conversion sourcée et factures restent des compléments à établir.

## Modèles, contextes et permissions

La vidéo suggère un grand modèle pour la spec et des modèles plus petits pour certaines tâches (32:25–32:38, L301–303), mais ne produit aucune expérience contrôlée démontrant son économie. Les changements de modèle et de consignes sont simultanés au début : le meilleur rendu ne peut pas être attribué au seul modèle. « Astra en X » à 49:21 (L462) ne suffit pas à identifier sûrement un effort. Les retours négatifs sur performance (49:00–50:08, L459–470) restent des observations racontées, pas un classement général.

Atelier doit conserver le choix explicite par rôle, catalogue/efforts découverts et configuration initiale ; aucun changement silencieux vers un modèle moins cher. Les profils d’équipe proposés à 38:56–39:59 (L364–374) sont encore décrits comme maquette, avec catalogue dynamique manquant à cet endroit. Le couplage de conversation ne décrit pas le contexte interne exact ni son coût. Afficher ce qui a réellement été transmis et les références utilisées reste plus fiable qu’un « contexte complet » supposé.

## Ajouts et finitions priorisés

1. **P0 — approbations visibles pour toute l’équipe.** Compléter la cloche/session existante par un regroupement avec agent, fournisseur, action, dossier, attente et lien de réponse. Vérifier les sessions structurées ; pour les PTY non automatisés, afficher une limite explicite. Préserver `on-request`, sans résoudre l’attente par un contournement.
2. **P0 — versions et recette de conformité.** Garder les maquettes approuvées immuables ; comparer page coûts, navigation active et rendu à des captures référencées. Les tests et la review ne suffisent pas à prouver fidélité ou satisfaction humaine.
3. **P1 — relevé économique par phase.** Relier compteurs et preuves aux lots/specs/reviews ; éviter doubles comptes et inférences de reporting. Ajouter provenance tarifaire et comparaison qualité/consommation uniquement sur résultats existants.
4. **P1 — lancement compact et vérifiable.** Montrer modèle/effort, compte, permissions/MCP et dossier avant envoi, avec détails repliables ; enregistrer des profils d’équipe sans figer de modèles. La vidéo décrit cette amélioration à 33:17–35:04 (L309–326).
5. **P1 — surveillance des ressources.** Instrumenter mémoire, volume d’événements, watchers et concurrence des tests ; borner rafraîchissements et dossiers générés. Les 16 Go contre 83 Mo sont des déclarations (42:41–42:47, L400–401). La correction annoncée n’est pas validée dans cette source : ne pas transformer son diagnostic en preuve d’un bug identique dans Atelier.

Ces propositions sont des suites de conception. Aucune campagne réelle ni sélection nouvelle de modèle n’a été exécutée pour ce rapport.
