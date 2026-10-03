---
name: atelier-browser-regression
description: Transformer un bug web Atelier reproduit en recette navigateur isolée, vérifier les parcours avec Playwright et fournisseur fictif, conserver captures, erreurs et retest. Les fonctionnalités Electron et vrais CLI relèvent de la recette desktop.
---

# Recette navigateur reproductible

Partir du déclencheur demandé ou d’un rapport de bug. Lire [recettes et sources](references/recettes.md), puis inspecter fixture et script concernés avant exécution : ports, labels et paramètres évoluent.

Utiliser un service de fixture distinct de l’espace utilisateur, sur loopback, avec fournisseur fictif et état synthétique. Confirmer que le port répond à cette fixture ; ne pas lancer un agent sur une instance réelle supposée fictive. Les modèles de fixture ne vont jamais dans le catalogue produit.

## Vérifier l’effet utile

- Préférer noms accessibles et labels ; attendre l’état utile avec attente bornée plutôt qu’un délai arbitraire.
- Déclencher via le contrôle visible puis vérifier le résultat visible. Pour persistance, cumul et annulation, compléter par l’état ou les événements liés à la même action.
- Avec une fixture déterministe, couvrir reçu, en cours, réponse/erreur/approbation et arrêté. Message utilisateur et état ready ne prouvent pas une inférence.
- Vérifier modèles/efforts indépendants dans la requête au fournisseur fictif ; tokens absents, zéro mesuré et cumul sans double compte.
- Tester dimensions et zoom du défaut puis une variante proche. Capturer textes coupés, chevauchements, infobulles et zone active. Absence de débordement global ne prouve pas lisibilité.
- Collecter erreurs console/page, requêtes échouées utiles et captures. Une trace peut contenir DOM et corps réseau privés : conserver localement.

## Livrer la preuve

Une régression automatisée est utile pour un comportement important ou fragile. Éviter les tests qui ne comparent que classes/fonctions ou recopient l’implémentation. Une simple retouche réversible peut se vérifier visuellement.

Conserver rouge observé, résultat après correction et preuves. Sans rouge, écrire « test ajouté, défaut antérieur non reproduit ici ». Utiliser le [rapport voisin](../atelier-ui-explorer/assets/rapport-bug.md) si disponible, sinon les mêmes champs dans le rapport courant.

Après backend modifié : PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v. Après JS modifié : node --check si disponible. Recette navigateur pour UI. Arrêter uniquement sa fixture ; conserver .atelier/ et preuves. Garder on-request et périmètre local ; aucune inférence réelle pour alimenter les écrans.
