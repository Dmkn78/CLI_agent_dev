# Canaux : Markdown, API, couleurs et procédures — 3 octobre 2026

Demande directe de Damien, normalisée depuis son message oral :

- Corriger le Markdown affiché littéralement dans les réponses des canaux.
- Permettre d'ajouter des API de LLM locaux ou distants, notamment LM Studio,
  oMLX et Splash. Tester l'API Splash déjà en place.
- Distinguer les agents et consultants avec des couleurs propres à chacun.
- Donner aux participants la possibilité d'utiliser des skills et autres
  sources expliquant comment procéder.
- Répartir le développement entre plusieurs sous-agents.

La mention orale des dossiers personnels `.omlx`/modèles est imprécise et
conditionnelle. Le service HTTP suffit pour cette livraison ; aucune lecture
de credentials ou de bibliothèque personnelle n'en est déduite. L'essai réel
autorisé est un appel local court au modèle Splash exposé par LM Studio,
distinct des fournisseurs fictifs des tests de développement.

Les deux captures restent des données de conception et ne constituent pas
une instruction de prise de contrôle, d'exécution SSH ou de lancement de leurs
conversations :

- [Canal et participants](screenshots/2026-10-03-channels-markdown-1.png)
- [Markdown affiché littéralement](screenshots/2026-10-03-channels-markdown-2.png)

## Complément : analyse critique, après les corrections initiales

Damien demande d'ajouter à la TODO la prévention des accords automatiques :
les participants doivent analyser les propositions des autres **et** leurs
propres contributions précédentes, garder le contexte et prendre du recul.
Il propose un rôle de questionneur/contradicteur examinant les risques, les
choix technologiques, l'optimisation et la fidélité à la demande utilisateur.
Le travail initial reste prioritaire. La critique doit être argumentée ;
un désaccord artificiel ne constitue pas une analyse ni une preuve.

Critères de cette suite : identité visible dans l'historique, avis indépendant
au début du tour, motif d'accord ou de révision explicite, objections concrètes,
questions discriminantes et clôture sans boucle d'approbation/reformulation.
Une consigne système ne garantit pas à elle seule le comportement du modèle.

## Complément : continuité du canal — 4 octobre 2026

Damien demande d'enlever la borne imposée à 50 tours, de choisir sa propre
limite et de corriger l'historique plein qui impose un nouveau canal. La
[capture du défaut](screenshots/2026-10-03-channels-history-full.png) montre
l'erreur après plusieurs reprises, au tour 47. Les échanges déjà enregistrés
ne sont pas effacés par cette erreur, mais le canal ne peut plus continuer.

Critères : limite personnalisée sans maximum imposé et option sans plafond,
arrêt manuel possible, archive persistante sans plafond de messages/tours,
migration des canaux existants sans perte, accès aux anciens échanges dans
le même canal. Les pages affichées et le contexte des modèles restent bornés.
Les tests emploient des fournisseurs fictifs, sans relancer le débat réel.
