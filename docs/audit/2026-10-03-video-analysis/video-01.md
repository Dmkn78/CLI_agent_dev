# Vidéo 01 — apprendre un parcours avant de l’automatiser

Analyse du 3 octobre 2026 pour Damien. Source intégralement lue : [transcription](../../references/2026-10-03-video-transcriptions/video-01.md), « Agents IA : vous automatisez TROP TÔT ! Voici ma méthode », [vidéo](https://www.youtube.com/watch?v=hkUByJckFMI). Les références `L` désignent les lignes de cette transcription, horodatages inclus. Comparaison avec [CORE](../../memory/CORE.md), [demande canonique](../../memory/USER_REQUEST.md), [IMPLEMENTATION](../../memory/IMPLEMENTATION.md), [consommation/mémoire du 3 octobre](../2026-10-03-architecture-memory-usage.md) et [harnais Duplica](../../DUPLICA_HARNESS.md). Aucun fournisseur, compte, credential ou campagne sollicité ; aucun changement applicatif. L’état Atelier ci-dessous est documentaire, pas une nouvelle recette.

## Conclusion pour l’interface

L’apport principal est un parcours de maturation : réussir une tâche avec l’humain, comprendre les corrections, formaliser une méthode, spécialiser uniquement les responsabilités utiles, puis configurer déclencheurs et validations. Atelier dispose déjà de nombreuses briques. Les ajouts utiles sont leur articulation visible, le contrôle du routage réellement exécuté et la lisibilité des consommations incomplètes. La vidéo ne démontre pas qu’une équipe spécialisée coûte moins cher à qualité constante.

## Preuves et interprétation

« Déclaré » rapporte les propos ; « montré raconté » signifie que l’auteur décrit ce qu’il affiche, sans vérification des pixels dans cette analyse. « Inféré » désigne notre proposition produit. Une présentation générée et les appréciations des produits tiers ne constituent pas une mesure indépendante.

| Passage exact | Statut et constat | Usage dans Atelier |
|---|---|---|
| 2:32–2:59, L28–32 ; 16:18–16:52, L158–163 | Déclaré : conversation conservée depuis 19 jours ; contexte devenu inutile, coûteux ; sectorisation envisagée. | Préparer un nouveau contexte ciblé à partir des décisions utiles, avec provenance et validation. |
| 6:35–6:56, L66–69 | Déclaré : session trop ancienne pour reconstituer son coût. | Afficher début de couverture et périodes sans mesures ; ne pas transformer absence en zéro. |
| 7:35–7:58, L75–79 ; 17:03–17:15, L165–167 | Montré raconté : Sol chargé d’employer Luna ; impression d’un orchestrateur consommant beaucoup de jetons ; présentation attribuée à Luna. | Relier configuration attendue et appels observés ; vérifier la répartition sans prétendre connaître les tâches internes. |
| 11:22–12:03, L110–117 | Déclaré : portage durant plus de 48 heures, « 500 dollars » équivalent, « 1,33 milliards » de tokens. | Exiger provenance, périmètre et ventilation avant comparaison ; ces valeurs transcrites ne sont pas une facture vérifiée. |
| 23:00–24:02, L220–230 ; 24:38–25:35, L236–245 | Déclaré : besoin réel, exécution initiale, puis skill ; procédure préférable à une multiplication d’agents pour certains besoins. | Entrée « Appliquer une méthode » à côté de « Créer un agent », sans imposer une équipe. |
| 27:53–28:59, L268–278 ; 29:35–30:29, L284–292 | Déclaré : reproduction, rouge/vert, review et changement de spécification validé par l’utilisateur ; couverture limitée aux cas prévus. | Présenter preuve de reproduction, correction et recette comme jalons distincts. |
| 31:41–32:45, L304–315 ; 32:57–33:10, L317–319 | Déclaré : clarification, recherche, maquette/plan ; exécution directe ou déléguée ; vérifications avant push. | Montrer choix d’exécution et contrôles applicables, avec responsables et résultat observable. |
| 34:48–35:18, L335–340 | Déclaré : « reflect », utilité de souvenirs, nombre de recherches ; injection minimale puis recherche au besoin. | Séparer consultation mesurée et utilité déclarée ; une fréquence ne prouve pas la valeur. |
| 35:24–36:22, L341–350 | Montré raconté : UI ajoutée sans validation après nettoyage mémoire ; idée d’un onglet discret de restauration. | Limiter dérive de périmètre ; proposer changements et restauration sans encombrer le cockpit. |
| 42:51–43:34, L412–419 ; 45:31–46:32, L438–447 | Déclaré : corrections humaines de visage, SEO et titres ; retrait progressif de certains points d’intervention. | Transformer corrections en critères proposés et versionnés, acceptés par Damien. |
| 47:35–48:39, L457–467 ; 49:33–50:30, L475–484 | Déclaré : production inaccessible, PR seulement ; usage personnel du bypass suivi d’une suppression du home ; recherche bornée et risque d’injection. | Conserver on-request et confinement local ; aucun bypass ni VPS à déduire de ces anecdotes. |
| 51:51–53:19, L497–511 ; 54:55–55:07, L527–529 | Déclaré/projeté : méthode, rôle, déclencheurs, validations et livrables ; démonstration complète repoussée. | Ne pas présenter l’automatisation YouTube finale comme prouvée par cette vidéo. |

## Ce qui existe déjà

| Atelier documenté | Écart utile, sans doublon |
|---|---|
| Tokens entrée/réponse/cache/total, courbes et comparaisons fournisseur/session/tâche/modèle/requête, export ; tarifs officiels et équivalent API. Le cache lu est inclus dans l’entrée. | Couverture historique et coût par phase/rôle ; contrôle de conformité du routage. Aucun nouveau tableau général nécessaire. |
| Modèles/efforts dynamiques et indépendants, graphe/handoffs, sélection de skills. | Recommandation explicable de méthode ou d’équipe, avec choix humain et aucune substitution silencieuse. |
| Noyau utilisateur/projet ≤ 4 000 caractères, réserve MCP Codex, provenance, souvenirs JSON/YAML. | Usage observé des souvenirs et retour qualitatif, puis proposition de contexte ciblé. OMP n’a pas cette réserve MCP. |
| Duplica : workers parallèles bornés, dépendances, réservations, review/audit/synthèse, recette indépendante, pause/reprise, TODO En revue. | Promotion guidée d’un parcours validé en procédure réutilisable et revue de ses points humains. |
| Lecture seule/écriture projet explicite, on-request, plans validés, séparation des preuves et déclarations. | Rendre ces limites lisibles par étape ; un skill ou un dessin n’ajoute aucune permission. |

Les sections récentes du 3 octobre priment sur le tableau historique « État précédent » : le parallélisme Duplica et les tarifs automatiques existent désormais. Le runner reste Codex ; une interface multi-fournisseur ne garantit pas le même harnais partout. Les compteurs PTY dépendent des journaux observables et de leur association ; le site ChatGPT ne fournit pas ses tokens à Atelier.

## Consommation et choix : recommandations prioritaires

**P0 — Carte de conformité et couverture dans le détail d’un run.** Afficher rôle, modèle/effort demandé, modèle observé, session/appels liés, entrée, cache, réponse et total. Un écart ou un modèle indisponible reste visible et attend une décision ; aucune bascule automatique. Ajouter « mesures disponibles depuis… », appels sans usage et provenance des observations. Pour une session ancienne, un cumul disponible peut être montré sans inventer une chronologie. Une part « orchestrateur/total » exige une attribution complète ; sinon indiquer couverture partielle.

**P1 — Budgets de mission et par rôle.** Ajouter aux réglages existants un plafond tokens observés, durée et nombre de relances, avec action choisie : alerte ou pause des nouvelles attributions. Afficher consommation observée et seuil restant. Le coût monétaire demeure un équivalent API sourcé ; le quota d’abonnement est une information séparée. Ne pas promettre un plafond strict si les mesures arrivent après le tour, ni oublier les agents déjà actifs. Les bornes workers/tâches/continuations du harnais existent ; le complément concerne les tokens et leur enforcement.

**P1 — Assistant de maturation.** Depuis une session ou un rapport accepté : « Extraire un parcours ». Montrer entrées nécessaires, sorties, corrections, contrôles, décisions humaines et inconnues. Sauver une proposition de skill/workflow seulement après validation, avec lien vers les preuves et version. Un écran simple « Manuel → Procédure → Agent spécialisé → Déclenchement » guide le choix ; progresser nécessite des critères satisfaits, sans pourcentage de confiance inventé.

**P1 — Contexte par responsabilité.** Montrer fichiers, skills, noyau et souvenirs sélectionnés, taille en caractères et motif de sélection. Proposer une session neuve avec handoff borné ; conserver l’original. Le panneau représente ce qu’Atelier transmet, pas tout le contexte fournisseur. Toute estimation de tokens doit être étiquetée avec sa méthode ; les caractères ne sont pas des tokens observés.

**P2 — Retour humain et mémoire.** Relier « correction demandée » à un critère proposé : visage conservé, SEO présent, fichiers modifiés cohérents. Exposer consultations horodatées, dernière utilisation et retour « utile/inutile/inconnu ». Aucun souvenir rarement consulté n’est supprimé automatiquement ; restauration discrète et validation restent nécessaires.

## Limites de décision

Aucune répartition entrée/cache/sortie, règle tarifaire ni détail des comptes n’accompagne les chiffres du portage. Leur précision, agrégation et transcription restent inconnues. Astra/Sol/Luna sont des noms de la source, jamais un catalogue à coder. La baisse de coût et la qualité comparable sont des hypothèses : une comparaison ultérieure devra conserver mission, contexte, critères et versions, et compter coordination, retries et review. Elle nécessite une autorisation distincte de campagne. Le présent rapport propose des interfaces ; il ne lance aucune automatisation ni ne valide les résultats techniques racontés.
