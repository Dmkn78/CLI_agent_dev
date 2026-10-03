# Interface des mises à jour — 3 octobre 2026

Demande de Damien : embellir la zone de mises à jour de la capture et remplacer
les cases par des toggles. [Capture fournie](../references/screenshots/2026-10-03-updates-before.png).
Les autres modifications présentes dans le checkout ont été conservées.

## Résultat

- Carte charbon arrondie, icône discrète, version et statut du contrôleur.
- Vérification et téléchargement automatiques : interrupteurs terracotta,
  libellés courts, descriptions et surfaces cliquables de 44 px.
- Contrôles natifs avec `role="switch"`, nom/description accessibles, clavier,
  focus visible et restauration du focus après réception d’un état.
- Pied de carte avec information sur le redémarrage et boutons compacts.
  Barre de progression alimentée uniquement par le pourcentage reçu.
- Mise en page adaptée aux petits écrans et mouvement réduit respecté.

`web/updates.js` conserve le pont desktop et les préférences existants.
`web/updates.css` est chargé dans `web/index.html` et ajouté à la liste des
assets autorisés dans `run.py`. Aucun changement du contrôleur de mise à jour.

## Vérifications

- `node --check` des sources JS web, puis des deux fichiers JS modifiés : réussi.
- `node --test tests/test_updates.cjs` : 17 tests réussis.
- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v` avec le
  Python du runtime : 194 tests exécutés, 192 réussis, 2 ignorés.
  Journal privé : `.atelier/updates-ui-backend-tests.log`.
- `tests/updates_browser_acceptance.cjs` avec
  `ATELIER_BROWSER_CHANNEL=electron` : persistance après rechargement,
  clavier Espace/Tab, focus, progression à 37 % fictifs, actions explicites,
  erreurs et reprise, largeurs 1500/900/390/300. Aucun débordement, aucune
  erreur JS ni requête externe. Contrôleur réel avec updater/installation fictifs.
  Preuves privées : `.atelier/updates-browser-evidence/result.json` et captures
  dans le dossier `directory` indiqué par ce fichier.

Le premier passage sandbox ne pouvait pas ouvrir les sockets locales. Les
recettes ont été rejouées avec autorisation d’exécution locale. Le pont fictif
de la recette, antérieur aux raccourcis de zoom du chat, a été actualisé avant
le passage réussi. Le contrôle visuel a ensuite conduit à raccourcir les
libellés et placer le badge sous le titre à 420 px et moins ; recette rejouée.

## Portée

Modification dans les sources du projet ; application sous `/Applications`
et installateurs publiés non remplacés. Aucun téléchargement réel, installation,
redémarrage utilisateur, inférence ou changement de préférence du profil
utilisateur. Les données `.atelier/` sont conservées ; les processus fictifs
sont fermés par la recette.
