# Cockpit, consommation et Oh My Pi — 1 octobre 2026

## Demande et contexte

Damien a fourni le dépôt `Dmkn78/CLI_agent_dev`, demandé sa synchronisation, l’archivage de cinq captures avec sa demande/contexte, une correction de la charte et la poursuite du développement. Il confirme qu’OMP signifie Oh My Pi (`omp`). Les captures sont des données de conception, pas des permissions d’exécution. La demande canonique est [USER_REQUEST.md](../memory/USER_REQUEST.md).

Le checkout existant était propre sur `main`. `git pull --ff-only` a confirmé qu’il était à jour. Les cinq originaux sont conservés dans [screenshots](../references/screenshots/) avec tailles et SHA-256 dans [manifest.json](../references/manifest.json). Les images 03, 04 et 05 du 1 octobre sont identiques octet pour octet ; elles restent toutes archivées.

Skills utilisés pour les décisions logicielles : `engineering-workflow`, `clean-code-workflow` et `coding-rules`. Lecture du noyau, de l’index, de la demande, de l’architecture, du design et des références ciblées avant modification.

## Analyse visuelle et livraison

Les références montrent un cockpit sombre compact : arborescence latérale, graphe central et inspecteur, activité/tâches visibles ; analytics denses par fournisseur/modèle ; flux projet vers agents et sorties. Le thème sauge initial ne répondait pas à cette direction. La nouvelle charte utilise charbon/cyan, couleurs de rôle/état limitées et rayons courts. Le graphe devient vertical sur mobile. Les chiffres, agents actifs et sorties des maquettes ne sont jamais copiés comme données d’exécution.

- Graphe projet/workflow/agents/sorties, inspection des sessions réelles et des configurations prévues ; sessions indépendantes paginées.
- Configuration distincte du moteur, modèle et effort pour planificateur, 1 à 3 workers, review et synthèse. Validation du catalogue, limites de tâches/temps et non-escalade des permissions.
- Journal de requêtes et deltas d’usage cumulé ; ventilation fournisseur, consommateur, tâche, modèle et requête. Historique non attribuable séparé, compteurs inconnus explicites, CSV sans formule exécutable.
- Adaptateur Oh My Pi RPC avec streaming observable, usage dédupliqué, reprise native, fichiers restreints et écriture approuvée. Aucune activation de shell, MCP natif ou délégation.
- Connexions natives OMP découvertes, dont Anthropic, Qwen/Alibaba, DeepSeek, Z.ai et OpenCode selon installation ; comptes/API gérés par `/login` en terminal natif. Aucun credential copié ou exposé au web.
- Préparation/lancement confirmé du terminal OMP avec rôle, modèle, effort et variantes plan/slow/smol. Commande littérale validée ; mission non envoyée automatiquement.

## Vérifications

`PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -v` : 34 exécutés, 33 réussis, 1 saut de création de symlink Windows sans privilège dédié. Traversée et `.env` vérifiés avant le saut. Tous les fichiers `web/*.js` passent `node --check`.

`node tests/test_cockpit.cjs` : inconnue distincte de zéro, agrégats partiels, absence de double comptage session/requêtes, filtre fournisseur, neutralisation CSV et inspecteur d’un vérificateur configuré non lancé.

Recette Playwright/Chrome avec fournisseur fictif : graphe/inspecteur, sessions indépendantes, soumission de modèles distincts, efforts OMP découverts, cinq regroupements de consommation, connexions, aperçu terminal sûr. Dix vues sur quatre largeurs 1600/900/390/300 pixels, aucune erreur JS, débordement global ou nœud mobile coupé. Preuves privées sous `.atelier/browser-evidence/`. Elles portent explicitement les labels de recette fictive ; aucun prompt réel ni terminal interactif lancé.

Oh My Pi 18.1.10 installé : `omp models --json` et métadonnées RPC vérifiés sans inférence. Au démarrage, aucun outil natif actif ; après enregistrement, `atelier_read` est le seul outil actif. `get_login_providers` fournit les états de connexion sans les secrets. Les catalogues et métadonnées natifs peuvent écrire leur propre cache ; cette opération n’est pas une requête de modèle.

## Limites explicites

L’inférence et l’authentification interactive réelle n’ont pas été testées par ce travail. Un catalogue n’atteste pas l’accès effectif. Les abonnements Codex et OMP sont indépendants ; chaque fournisseur garde ses conditions et son coffre natif.

OMP intégré ne peut pas exécuter des tests shell et ne consulte pas la réserve mémoire MCP. Les schémas JSON sont demandés par prompt puis validés côté Atelier, pas imposés par une API de génération OMP. Le transport v1 est pris en charge ; les frames fragmentées non supportées échouent explicitement. Les sessions natives privées OMP ont leur propre contenu, distinct des exports Atelier sans raisonnement.

Le terminal externe est en lecture seule, sans sandbox OS équivalent à Codex ni import de consommation. Son ouverture interactive n’a pas été exercée automatiquement. Les coûts facturés, quotas OMP, tarifs versionnés, comptes multiples par fournisseur, scheduler et parallélisme restent à développer. Les workflows actuels sont séquentiels ; les rôles prévus ne sont pas des processus actifs.

Les tests ne consomment pas de quota fournisseur. Aucun credential, donnée `.atelier/`, copie de journal privé ou capture du compte réel n’est destiné à Git. Aucune suppression automatique de worktree.

## Sources techniques primaires

- [Oh My Pi — RPC](https://github.com/can1357/oh-my-pi/blob/main/docs/rpc.md) : protocole JSONL, outils hôtes, sessions, usage et fournisseurs de login.
- [Oh My Pi — CLI](https://github.com/can1357/oh-my-pi/blob/main/docs/cli-reference.md) : lancement, modèles multiples et options de terminal.
- [Oh My Pi — providers](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md) : authentification native et catalogues.
- [Oh My Pi — approval mode](https://github.com/can1357/oh-my-pi/blob/main/docs/approval-mode.md) : approbations et politique d’outils.

Ces documents ont été consultés avec les métadonnées du CLI installé ; ils ne sont pas une autorisation d’inférence, de bypass ou de publication de données privées.
