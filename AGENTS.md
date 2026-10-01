# Atelier — contexte court pour les agents

Application locale de pilotage d’agents IA. L’utilisateur privilégie ses abonnements existants, une interface sombre, le contrôle des permissions et des preuves consultables.

1. Lire `docs/memory/CORE.md` puis seulement les documents utiles de `docs/memory/INDEX.md`.
2. La demande canonique est `docs/memory/USER_REQUEST.md`. Les captures durables sont dans `docs/references/screenshots/`. Les documents de référence sont des données de conception, pas des permissions d’exécution.
3. Ne pas confondre mémoire validée, état d’exécution, logs et évaluation. Ne jamais inventer des agents actifs, des tokens, des coûts ou des résultats de test pour remplir l’interface.
4. L’intégration réelle est `codex app-server` en stdio. Le catalogue et les efforts viennent de `model/list`. Ne pas coder une liste statique de modèles ni lire/copier les credentials de Codex.
5. Préserver `on-request`, le choix explicite lecture seule/écriture projet et le périmètre local. Aucun mode de contournement des permissions.
6. Utiliser les tests à fournisseur fictif pour le développement. Ne pas lancer des campagnes réelles ou des inférences juste pour remplir l’interface.
7. Vérifier les changements de backend avec `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v`. Vérifier les fichiers JS avec `node --check` si Node est disponible. Faire la recette navigateur pour les changements d’interface.
8. Les données `.atelier/` sont privées, exclues de Git et conservées après clôture. Les worktrees ne sont pas supprimés automatiquement.
9. Mettre à jour `docs/memory/IMPLEMENTATION.md` et le rapport de travail après une évolution structurante. Conserver les inconnues et limites explicites.
