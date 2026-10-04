# Skills de recette Atelier — 3 octobre 2026

Demande : fournir des skills réutilisables pour tester l’application par des gestes utilisateur, reproduire les petits bugs, conserver les preuves et retester les corrections. Les captures et documents cités restent des références de conception, pas des permissions d’exécution.

## Livrables

| Skill | Utilité |
|---|---|
| [atelier-ui-explorer](../../skills/atelier-ui-explorer/SKILL.md) | exploration PC/navigateur avec outil disponible, déclencheur minimal, délégation bornée et rapport de bug |
| [atelier-browser-regression](../../skills/atelier-browser-regression/SKILL.md) | recettes Playwright isolées, fournisseur fictif, traces/captures, persistance et états asynchrones |
| [atelier-desktop-regression](../../skills/atelier-desktop-regression/SKILL.md) | Electron/WebContentsView, zoom/onglets, PTY, image CLI, arguments et permissions |
| [atelier-accessibility-check](../../skills/atelier-accessibility-check/SKILL.md) | noms visibles/accessibles, infobulles, focus/clavier, lisibilité au zoom |

Chaque skill possède une entrée SKILL.md, des métadonnées agents/openai.yaml et une référence ciblée. L’exploration fournit un [modèle de rapport](../../skills/atelier-ui-explorer/assets/rapport-bug.md). Les autres le réutilisent quand présent et restent opérables sans lui.

Création guidée par le skill système skill-creator. Le skill local evidence-ledger a été consulté pour organiser la provenance et distinguer les sources inspectées des pistes. Aucun runtime tiers, script GitHub ou paquet de test supplémentaire installé.

## Recherche primaire

Sources inspectées le 3 octobre 2026, avec sections et interprétations locales dans les références des skills :

- [Microsoft Playwright — Best practices](https://github.com/microsoft/playwright/blob/main/docs/src/best-practices-js.md) : comportement visible et isolation.
- [Microsoft Playwright — Trace Viewer](https://github.com/microsoft/playwright/blob/main/docs/src/trace-viewer.md) : observations console/réseau et métadonnées.
- [Microsoft — skill officiel playwright-cli](https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md) : gestes navigateur, snapshots et preuves ; disponibilité de l’outil non présumée.
- [Electron — Automated testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing) : lancement et captures de fenêtres par Playwright ; support expérimental signalé.
- [Deque — axe-core](https://github.com/dequelabs/axe-core) : moteur HTML et nécessité de revue manuelle pour résultats incomplets.

Les skills sont une adaptation au contrat Atelier et aux parcours demandés ; ils ne copient pas les instructions tierces et ne changent pas les permissions de l’application.

## Vérifications exécutées

- quick_validate.py du skill-creator : **4 skills valides** (frontmatter et scaffolding).
- Vérification des liens Markdown locaux des skills : **10 liens résolus**, aucun placeholder de scaffold inachevé.
- Appel réel de SlashCommands.catalog avec un hôte minimal en lecture seule : **4 noms et chemins découverts**, sans création de session ni appel fournisseur.
- Le premier essai de découverte sous /usr/bin/python3 a échoué lors de l’import backend sur une annotation de type utilisant |. Le même essai sous /opt/homebrew/bin/python3.12 a réussi. La référence de recette demande de vérifier l’interpréteur compatible ; aucun runtime système modifié.

## Limites

Cette livraison ajoute des procédures sélectionnables dans la bibliothèque du projet, pas un contrôleur PC supplémentaire. L’agent qui les utilise doit posséder les outils adaptés ; le contrôleur livré reste celui de l’architecture Atelier. Leur découverte n’atteste pas une recette GUI ni une exécution comportementale indépendante des quatre skills.

Aucune campagne réelle, inférence, connexion ChatGPT, envoi externe ou installation tierce n’a été effectué pour créer/valider ces fichiers. Les preuves de future recette restent privées dans .atelier/ ; les résultats fictifs ne doivent pas alimenter l’espace réel de l’utilisateur. La validation technique reste distincte de la recette humaine.
