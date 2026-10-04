---
name: duplica-quality-loop
description: Vérifier indépendamment un résultat Duplica, observer les parcours utilisateurs, relier les bugs aux corrections et rejouer le même déclencheur après modification. Utiliser pour décider si les critères de mission sont couverts ; aucune capacité GUI n’est présumée.
---

# Observer, corriger, retester

Évaluer le résultat contre les critères de l’utilisateur. Partir du livrable, des fichiers modifiés et du parcours demandé, puis consulter le handoff comme déclaration à contrôler. Si possible, séparer l’opérateur de vérification de l’auteur de la correction.

## Choisir la vérification réelle

Vérifier les outils disponibles avant de prétendre observer une interface. Utiliser une fixture locale isolée et un fournisseur fictif pour le développement Atelier. Un agent n’obtient pas le contrôle du PC parce qu’il lit un skill.

| Résultat à vérifier | Procédure ciblée |
|---|---|
| Parcours visible, petit défaut, comportement inattendu | [atelier-ui-explorer](../atelier-ui-explorer/SKILL.md) |
| Bug navigateur reproductible et régression utile | [atelier-browser-regression](../atelier-browser-regression/SKILL.md) |
| Electron, navigateur intégré, terminal PTY ou dialogue natif | [atelier-desktop-regression](../atelier-desktop-regression/SKILL.md) |
| Libellé, infobulle, focus, clavier ou lisibilité au zoom | [atelier-accessibility-check](../atelier-accessibility-check/SKILL.md) |

Lire seulement la procédure utile. Un seul opérateur manipule une fenêtre donnée ; les autres vérificateurs utilisent leurs propres fenêtres/fixtures ou des contrôles indépendants.

Pour une navigation HTML, vérifier séparément : nom visible en barre ouverte, nom accessible, texte réellement affiché au survol/focus, puis effet du clic. Par exemple, l’icône Architecture doit permettre d’identifier la destination et le clic doit ouvrir la vue attendue ; un `aria-label` seul ne prouve pas que le nom est lisible. Tester les dimensions ou le zoom signalés par Damien, puis une variante proche. Relier l’oracle à sa source et ne pas généraliser un ancien exemple en exigence de tous les écrans.

## Conserver le rouge et déclencher la correction

Un défaut contient préconditions, étapes minimales, attendu, observé, environnement/révision et preuves. Distinguer **reproduit**, **non reproduit ici**, **non vérifié**, **corrigé et retesté**. Utiliser le [modèle de rapport](../atelier-ui-explorer/assets/rapport-bug.md) si utile. Conserver les preuves privées et des résumés expurgés.

Donner au correcteur le déclencheur observé et le critère échoué. Une correction proposée reste à vérifier ; rejouer ensuite les mêmes préconditions et gestes, et une variante proche si elle apporte une couverture utile. Si le test avant correction n’a pas reproduit le défaut, le dire au lieu d’inventer un rouge. Les défauts indépendants peuvent être distribués selon leurs fichiers et dépendances ; l’intégration attend leurs résultats.

Pour backend Atelier modifié, exécuter `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v`. Pour JS modifié, utiliser `node --check` si Node est disponible. Faire la recette navigateur des changements UI. Une vérification supplémentaire doit répondre à une incertitude concrète, pas seulement augmenter un nombre de tests.

## Décider la suite

Relier chaque critère à une preuve et à ses limites. Un critère échoué crée du travail de correction utile ; un critère non vérifiable précise l’outil ou la décision manquante. Respecter les limites de relances du runner et arrêter une répétition sans progrès. Le modèle ne déclare ni test réussi sans résultat, ni agent actif sans événement, ni coût sans mesure.

Validation technique et recette humaine restent distinctes. Le résultat peut être prêt pour revue avec une liste précise de limites ; il ne devient pas accepté automatiquement. Voir le [contrat du harnais](../../docs/DUPLICA_HARNESS.md) pour la clôture et la reprise.
