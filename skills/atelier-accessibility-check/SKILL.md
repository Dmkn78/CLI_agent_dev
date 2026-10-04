---
name: atelier-accessibility-check
description: Vérifier dans Atelier noms lisibles, infobulles, focus, navigation clavier et zoom ; reproduire les défauts avec preuves visuelles. Pour contrôles sans nom, textes coupés et modales ; pas une certification complète d’accessibilité.
---

# Lisibilité et interactions accessibles

Tester les parcours demandés dans une fixture locale, sans inférence réelle. Lire la [grille ciblée](references/checks.md).

Comparer nom visible, nom accessible et sens du contrôle. Un aria-label ne garantit pas un nom visible en barre étendue ; vérifier séparément ces propriétés. Une icône ou un title ne prouve pas une infobulle fonctionnelle dans Electron.

## Observer les interactions

- Survoler puis focaliser au clavier les icônes ; observer texte et emplacement de l’infobulle. Déplacer le pointeur et fermer au clavier si pertinent. Tester barre ouverte/repliée.
- Parcourir l’ordre clavier. En modal : entrée du focus, Tab, Escape selon contrat, retour au déclencheur ; contrôles masqués derrière non atteignables.
- Ouvrir listes modèles/rôles : textes, valeur, focus, scroll et sélection clavier ; plus de deux participants quand demandé.
- Rejouer au zoom du défaut puis zoom supérieur et fenêtre étroite : texte, contrôle, troncature, chevauchement et scroll. scrollWidth seul ne prouve pas lisibilité.
- États reçu/en cours/erreur/arrêt et absence/zéro tokens doivent être compréhensibles par le texte ; couleur seule insuffisante.

Si axe-core est déjà installé et utilisable en recette, l’utiliser en complément : règles, éléments, versions et résultats incomplete. Pas de script CDN dans le profil utilisateur ni installation pour remplir un score. Le contrôle manuel reste nécessaire ; zéro violation automatisée ne prouve pas une conformité complète.

Conserver captures et étapes avant/après ; distinguer défaut visible, sémantique, clavier et moteur de rendu. Après correction autorisée, retester même interaction et variante. Utiliser [rapport voisin](../atelier-ui-explorer/assets/rapport-bug.md) si disponible ou les mêmes champs dans le rapport courant. Garder preuves privées et périmètre local, sans modifier les données utilisateur.
