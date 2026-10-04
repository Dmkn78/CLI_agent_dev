# APK Atelier mobile — 3 octobre 2026

Damien a demandé une application Android livrée en APK pour se connecter à
plusieurs PC, retrouver leurs répertoires, envoyer des prompts et lancer des
agents. Il a ajouté la détection des mises à jour. Le travail a été réparti
entre trois sous-agents (Android/build, passerelle/tests/revue indépendante,
interface/recette mobile), avec intégration, découverte du backend, tests de
transport et documentation par l’agent principal.

## Livrables

- `build/mobile/Atelier-mobile.apk` : APK signé localement, Android 8.0 minimum,
  package `fr.atelier.mobile`, version `0.1.0`, code `1`, cible Android 15/API 35.
  Taille : **57 821 octets**. SHA-256 :
  `d08b279a3a928be32199eb20e237ae3e69faeeb86614fd36cb6fbdf02eeb393c`.
- `build/mobile/release.json` : version, taille et SHA-256 du binaire publié
  localement ; endpoint de téléchargement fixe `/mobile/atelier.apk`.
- `mobile/android/` : client natif Java, profils chiffrés Android Keystore,
  WebView de même origine, erreurs explicites, mise à jour et fournisseur de
  contenu borné pour l’installateur Android, sans pont JavaScript natif.
- `web/mobile/` : interface sombre française, navigation tactile, catalogue
  dynamique, projets/fichiers/sessions/prompts/équipes, tâches/mémoire/mesures,
  permissions/plans, canaux et discussion Duplica.
- `server/mobile_gateway.py` : passerelle à activation explicite ;
  `scripts/mobile-gateway.py` est son CLI et `scripts/connect-mobile-pc.py`
  rattache le service Atelier déjà ouvert avec découverte locale bornée.
- [Guide](../MOBILE.md) : installation, Tailscale Serve, appairage de plusieurs
  PC, révocation, maintenance et reconstruction.

## Contrat de connexion et de permissions

Le backend existant conserve son écoute loopback et sa politique HTTP locale.
La passerelle possède une autre clé aléatoire privée et révocable. Elle obtient
le nonce du backend en mémoire, ne l’envoie jamais au téléphone et ne lit aucun
credential Codex. Chaque API mobile exige un bearer, un Host et une origine
autorisés. Aucun wildcard, URL amont distante, redirection backend ou proxy
arbitraire. Les fichiers servis sont choisis par liste fixe.

L’écoute directe est limitée à IPv4 Tailscale `100.64.0.0/10` ou `127.0.0.1`.
Le mode HTTPS Tailscale Serve autorise uniquement une URL privée explicitement
configurée. Les en-têtes `X-Forwarded-*` ne créent pas de permission. La découverte
observe les sockets locales de processus candidats, refuse les redirections et
n’exporte pas le nonce ; les anciennes versions desktop sans endpoint identité
sont reconnues par leur état, avec chemin de données inconnu conservé comme tel.

Le modèle et l’effort viennent du PC connecté. Les nouveaux agents démarrent
en lecture seule avec diagnostic/plan ; le profil écriture projet reste un choix
explicite. La validation et les approbations passent dans les API existantes
on-request. Un tour terminé et une tâche validée restent distincts. La discussion
Duplica mobile n’active pas la supervision ou le contrôle ordinateur.

Le transport ne rejoue une requête qu’après l’erreur exacte de nonce périmé,
émise par le backend avant toute action. Un refus générique, délai ou résultat
indéterminé n’est pas rejoué. L’UI désactive les mutations hors connexion.

## Mises à jour

Le client Android consulte le manifeste du PC à la connexion, au retour au
premier plan (au plus toutes les cinq minutes) et via le bouton MàJ.
Version indisponible et version à jour sont distinguées. Télécharger est
une action humaine ; le téléchargement refuse les redirections et vérifie
taille/SHA-256, puis package/version supérieure/certificat avant de donner une
URI `content://` en lecture seule à l’installateur Android. La confirmation
d’installation reste Android. Aucun certificat HTTPS invalide n’est accepté.

Le couple manifeste/APK est vérifié par la passerelle avant chaque diffusion.
La signature locale reste dans `.atelier/mobile/signing/debug.keystore` (même
certificat migré depuis le premier build privé) ; les profils, clés et outils
ne sont pas dans Git ou l’APK. Le build utilise les outils Android officiels et
Temurin 17, avec téléchargements épinglés/vérifiés, sans installation globale.

## Vérifications

Les vérifications finales sont consignées dans les preuves privées ci-dessous.
Les scénarios emploient exclusivement un fournisseur fictif et des projets
isolés ; ils ne lancent aucune inférence réelle.

- Suite backend actuelle complète : **317 tests exécutés, 315 réussis et 2
  ignorés**, avec `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v`
  dans le runtime Python disponible. Journal :
  `.atelier/mobile-browser-evidence/backend-317-tests.txt`. Un premier passage
  durant les évolutions concomitantes du checkout avait révélé trois échecs
  hors mobile (runner Duplica et découverte des skills) ; leurs corrections
  partagées ont été vérifiées par les tests ciblés puis cette suite complète.
- Passerelle : **22 tests réussis**, couvrant authentification, écoute/amont,
  Host/Origin/Serve, révocation immédiate, nonce, routes, permissions, limites,
  symlinks, HEAD et manifeste/APK.
- Découverte : **6 tests réussis**, dont backend desktop ancien, absence de
  nonce exporté, refus des redirections et borne de 32 ports avec 4317 prioritaire.
- Transport : **2 tests réussis** avec HTTP réel, Application et FakeCodex :
  catalogue/fichiers/confinement, création, prompt readonly/on-request, plan
  refusé sans deuxième tour, permission transmise une fois et clé révoquée.
- Navigateur/Electron : recette autonome et même recette contre le vrai backend
  fictif + passerelle, **390 et 300 px**, agent/effort, brouillon, permission,
  prompt/plan, projets/fichiers, tâches, mémoire, équipe de deux spécialistes,
  perte de réponse après traitement serveur avec un seul envoi, état hors ligne,
  conversation Duplica partagée en lecture seule, aucun débordement horizontal
  ni erreur JavaScript. Recette mock : 20 contrôles ; intégration : 19 contrôles.
  Revue indépendante : ID
  de questionnaire échappé et réponse préservée, aucun HTML exécuté.
- Android : installation dans l’émulateur Android 15 ARM64, vraie saisie de
  profil, connexion WebView au backend fictif, version courante détectée,
  refus d’une clé invalide conservé après `pageFinished`, profils chiffrés et
  conservés après redémarrage. Régressions JVM des URL/origines : **29 réussies**.
  Mise à jour réelle de code 1 vers code 2 QA (`0.1.1-qa`) : détection,
  téléchargement, refus d’un certificat différent, contrôle du candidat
  conforme, permission Android, clic de confirmation et installation terminée,
  version code 2 confirmée par `dumpsys package`, profils chiffrés conservés après
  l’installation. Cette variante de recette est
  séparée de l’APK livré, qui reste code 1.

Preuves UI : `.atelier/mobile-browser-evidence/ui/report.json` et `integration/report.json`,
avec captures. Preuves Android : `build/mobile/android-qa-proof.json`,
`build/mobile/screenshots/`, `package-proof.txt`,
`signature-proof.txt`, empreinte `Atelier-mobile.apk.sha256` et manifeste final.
Les captures sont des recettes fictives, pas l’activité réelle de l’utilisateur.

La revue indépendante a repéré puis relu trois corrections : ID de question
échappé, erreur WebView non remplacée par un faux succès et port 4317 toujours
prioritaire dans la découverte. Les fichiers JS mobile et de recette passent
`node --check` ; les calculs cockpit existants passent également leur recette.

## Limites conservées

La recette physique du téléphone de Damien, l’appairage à ses deux PC et le
transport Tailscale réel n’ont pas été exécutés. Il faut installer/activer
Tailscale et lancer la passerelle sur chaque PC. Les PC restent allumés ; le
téléphone ne lance pas les CLI localement et ne possède pas leurs credentials.

Le client expose les sessions outillées et les API prévues, pas les PTY Electron,
le navigateur ChatGPT desktop ou un contrôle de fenêtres externes. Les canaux
affichés sont configurés sur le PC. Il n’y a pas de publication Play Store ni de
distribution Android publique : une nouvelle APK signée et son manifeste doivent
être déposés sur les PC pour que la détection l’annonce.

Les changements My Brain/Duplica/runtime déjà en cours dans le checkout partagé
ont été conservés. Aucun commit, push, remplacement de l’application desktop,
arrêt d’une session utilisateur ou campagne réelle n’a été effectué.
Les serveurs de recette et l’émulateur ont été arrêtés après vérification ; les
preuves, données de recette et clé de signature sont conservées.
