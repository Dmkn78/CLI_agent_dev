# Livraison Workbench

## Périmètre

Réponse aux [quatorze retours](../references/2026-10-01-workbench-feedback.md). Skills utilisés : engineering-workflow, clean-code-workflow, clean-code-acceptance, coding-rules et openai-docs. Les captures utilisateur sont conservées dans Git ; `.atelier/`, profils navigateur, certificats publics exportés, journaux, comptes et preuves de recette restent privés.

## Réalisé

- Fermeture des panneaux sans réouverture automatique ; onglets ChatGPT ouvrables, sélectionnables et fermables dans le shell desktop.
- Mode ChatGPT séparé des conversations CLI. Explorateur du projet, aperçu, copie de ressources/consignes et dépôt de fichier natif depuis une fenêtre desktop optionnelle. Dans le navigateur web ordinaire, ChatGPT s'ouvre séparément : aucune iframe incompatible prétendument fonctionnelle.
- Éditeur LogicFlow : blocs/décisions déplaçables, liens, agents existants et ressources, inspecteur, undo/redo, pages par projet, révisions, import/export JSON et explication. Une session de conception peut proposer un JSON que l'utilisateur importe. Les liens restent des données de conception inertes.
- Projet choisi dans le formulaire d'agent ; sections de navigation repliables avec préférence locale. Le changement de projet réinitialise les ressources et sélections pour éviter un mélange de contexte.
- Cloche persistante : permissions, questions, fin de tour, erreur/reconnexion et plans à valider ; lien vers session/projet. Réessais dédupliqués dans les notifications, pas dans le journal.
- Diagnostic/plan par défaut, thread et tour de diagnostic en lecture seule. Validation explicite avant le tour d'implémentation ou les spécialistes d'une équipe. La file TODO conserve son bail pendant cette attente ; réussite technique mène En revue, jamais Terminé.
- PID vivant du processus Atelier, erreur réseau visible, inventaire externe limité aux exécutables Windows reconnus. Un PID ne prouve pas qu'un modèle travaille.
- Quotas `account/rateLimits/read` et notifications natives, fenêtres, pourcentages restants et dates de reset ; rafraîchissement sans inférence. Compte partagé, distinct des mesures de tokens Atelier.
- Durées natives `turn.durationMs`, cumul des tours et temps écoulé séparés. La durée native inclut les attentes réseau/permissions, ce n'est pas du temps CPU pur.
- Rapport canonique `report.json`, résumé `report.md` avec frontmatter YAML et références aux sorties/journaux/hash. Pas de seconde transcription intégrale ni d'inférence pour le générer.
- Estimation USD à partir de tarifs saisis et sourcés, datés, par fournisseur/modèle. Cache déjà inclus dans l'entrée déduit une seule fois. Mesure ou tarif manquant : estimation inconnue. Pas de facture supposée à partir d'un abonnement.

## Incident TLS Et Test Réel

Le journal natif de « testr » montre un vrai tour démarré, plusieurs reconnexions `UnknownIssuer`, puis une interruption humaine. L'ancienne vue ignorait les notifications `error`, d'où l'impression d'un agent fictif. La capture OAuth montre un échec d'échange réseau, mais ne permet pas seule d'attribuer sa cause à tous les fournisseurs.

Le lanceur Windows conserve la validation TLS et transmet au processus enfant un bundle de racines publiques déjà approuvées par Windows. Une configuration CA explicite de l'utilisateur reste prioritaire. Le correctif n'exporte aucune clé privée, ne modifie pas le magasin Windows et ne copie aucun credential. Mécanisme conforme aux [sources Codex custom CA](https://github.com/openai/codex/blob/main/codex-rs/http-client/src/custom_ca.rs).

Le binaire Codex installé avec l'application desktop, 0.159.2, est découvert par le lanceur ; `ATELIER_CODEX_EXECUTABLE` permet de choisir explicitement un autre binaire. Le shim npm disponible était 0.153.2. Le catalogue réel du binaire actuel a renvoyé dix entrées au contrôle, sans liste figée dans le produit. Les catalogues précédents ne sont pas une promesse d'offre permanente.

Un seul test synthétique réel autorisé **GPT-6-Luna** a terminé : `ATELIER_OK`, durée native 3 725 ms, entrée 22 524 tokens dont 12 032 cachés, sortie 8, total 22 532. Pas de remplacement de modèle, de campagne ou d'outil de test exécuté sur le dépôt. Le test n'injectait ni noyau ni réserve MCP Atelier ni fichier de projet explicite, mais la configuration et les instructions natives du CLI restaient applicables. Le script emploie désormais un dossier temporaire hors dépôt. Les mesures sont des faits de ce test, pas une estimation du coût de l'abonnement.

Lecture réelle des quotas et requête du modèle réussies après configuration CA. Une nouvelle authentification OAuth complète n'a pas été forcée sur le compte déjà connecté ; sa recette demeure humaine. Voir [authentification Codex](https://learn.chatgpt.com/docs/auth) et [protocole app-server](https://learn.chatgpt.com/docs/app-server).

## Vérifications

Le skill async-data-boundaries a servi à borner les publications asynchrones de ressources : réponse A après B ignorée, changement de projet invalidant l'ancien résultat. La recette reproduit déterministement cet ordre adverse ; elle ne prétend pas annuler un effet réseau déjà parti.

- Backend : 52 tests exécutés, 51 réussis, 1 saut Windows symlink faute de privilège. Traversée et fichiers sensibles vérifiés avant le saut.
- Syntaxe Node de tous les JS/CJS frontend, desktop et scripts ; tests de calculs sans navigateur.
- Playwright/Chrome, fournisseurs fictifs : recette précédente, plans d'équipe, composition/reconfiguration, TODO, ressources, fermeture, notifications, quotas, déplacement par vrai pointeur du canvas et sauvegarde/révision. Dix vues, chat CLI et nouvelles vues à 1500/1600, 900, 390 et 300 px selon la recette, sans débordement global ni erreur JS.
- Electron : WebContentsView `about:blank` fictif, bounds, isolation, absence de preload distant, masque du navigateur derrière une modal et fermeture d'onglet. Connexion ChatGPT et upload réels non automatisés.
- Dépendances épinglées, bundle ESM LogicFlow ; audit npm sans vulnérabilité signalée au contrôle. Les scripts de recette ne lancent aucun modèle réel.

Le développement a rencontré un rendu dynamique LogicFlow manquant avec son entrée CommonJS. Le bundle ESM et un garde de durée de vie du canvas corrigent ce problème. Les captures de recette demeurent sous `.atelier/browser-evidence/`, distinctes des références utilisateur.

## Limites Et TODO

Six tâches prioritaires de suite ont été ajoutées au tableau utilisateur sans lancement d'agent. La tâche historique du catalogue reste ouverte, non déclarée terminée par la réussite d'un seul modèle.

1. Valider le choix desktop Chromium / Firefox ou DuckDuckGo externe. Recette humaine ChatGPT : connexion, persistance privée et dépôt SQL. Le shell n'importe ni historique ni tokens internes du site et ne lui injecte pas de scripts.
2. Ajouter profils SQL/CIW et bibliothèques de skills externes explicitement autorisées. La sélection de skills du projet est conservée ; une instruction « seulement ces skills » n'est pas un filtre de sécurité du CLI natif.
3. Relier un workflow dessiné aux contrats exécutables : entrées/sorties, ressources, dépendances et validation. Aujourd'hui le canvas n'exécute rien ; pas de moteur n8n complet ni de création automatique d'agent depuis un simple bloc.
4. Adaptateurs de télémétrie pour CLI externes, Claude Code et OMP/Bun/Node. Aucun import arbitraire de secrets ou de lignes de commande. Terminal PTY/TUI complet encore absent.
5. Recette d'un nouvel OAuth sous le compte humain si nécessaire ; diagnostic réseau spécifique par provider, pas de bypass TLS. Ne pas déconnecter un compte fonctionnel juste pour tester.
6. Tarifs publics/versionnés et factures importées, devises et sources séparées. Les tarifs actuels sont fournis par l'utilisateur ; coûts inconnus si mesures insuffisantes.
7. Accès aux autres modèles Codex/ChatGPT à contrôler sans inférence interdite. L'unique succès Luna ne prouve pas l'accès à tous les modèles du catalogue.

## Frontières Desktop

Les permissions sensibles du navigateur distant (micro, caméra, géolocalisation, etc.) sont refusées dans cette version ; aucun mode vocal implicite. La sélection et le dépôt volontaire d'un fichier restent possibles.

Electron est optionnel. Le renderer local est isolé et le preload expose uniquement création/fermeture/bounds/drag. Les pages distantes sont sandboxées, sans Node ni preload Atelier. Le backend revalide projet, chemin et taille avant le drag natif. Le profil Chromium reste sous `.atelier/desktop-profile/`. Voir les recommandations [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) et [native file drag](https://www.electronjs.org/docs/latest/tutorial/native-file-drag-drop/). Un diagramme JSON est borné et validé, sans HTML ou code exécutable.
