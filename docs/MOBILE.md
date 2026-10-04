# Atelier sur Android

L’APK **Atelier mobile** pilote les projets et les agents qui tournent sur vos
ordinateurs. Le téléphone conserve plusieurs profils de PC ; chaque profil
contient un nom, une adresse privée et une clé d’appairage. Les comptes Codex/OMP
et les fichiers restent sur le PC. Les modèles et leurs efforts proviennent du
catalogue découvert par ce PC.

L’application utilise Tailscale et une passerelle Atelier explicite. Le service
principal Atelier reste sur `127.0.0.1`. Il n’est pas nécessaire d’installer un
serveur SSH ni de copier une clé SSH ou les credentials des fournisseurs.

## Installation et connexion

1. Installez `build/mobile/Atelier-mobile.apk` sur le téléphone Android. Android
   demande d’autoriser l’installation depuis l’application qui ouvre ce fichier.
2. Installez [Tailscale sur Android](https://tailscale.com/docs/install/android)
   et [sur chaque PC](https://tailscale.com/docs/install). Connectez-les au même
   réseau Tailscale. Gardez Tailscale actif sur le téléphone.
3. Ouvrez Atelier sur le PC, avec les projets et comptes habituels. La passerelle
   utilise cette instance ; elle ne démarre pas un deuxième backend.
4. Dans le dossier de ces sources sur le PC, avec Python 3.9 ou plus, préparez
   l’adresse privée HTTPS :

   ```sh
   tailscale serve --bg http://127.0.0.1:4318
   ```

   Tailscale affiche une adresse telle que `https://mon-pc.mon-reseau.ts.net`.
   Remplacez cet exemple par l’adresse réellement affichée dans la commande
   suivante :

   ```sh
   python3 scripts/connect-mobile-pc.py --public-origin https://mon-pc.mon-reseau.ts.net --pc-name "Mon PC"
   ```

   Sous Windows, utilisez `python` à la place de `python3`. La commande reste
   ouverte pendant l’utilisation. Si plusieurs services Atelier sont détectés,
   elle affiche leurs adresses et leurs dossiers. Choisissez celui souhaité :

   ```sh
   python3 scripts/connect-mobile-pc.py --list
   python3 scripts/connect-mobile-pc.py --backend http://127.0.0.1:PORT --public-origin https://mon-pc.mon-reseau.ts.net --pc-name "Mon PC"
   ```

5. Dans un deuxième terminal, affichez la clé propre à cette passerelle :

   ```sh
   python3 scripts/connect-mobile-pc.py --pair
   ```

6. Dans l’APK, ajoutez un ordinateur : nom, URL HTTPS affichée par Tailscale et
   clé d’appairage. Connectez-vous. Recommencez pour le deuxième PC et sélectionnez
   le profil à utiliser.

[Tailscale Serve](https://tailscale.com/docs/reference/tailscale-cli/serve)
partage le service au sein du réseau Tailscale. Le PC doit rester allumé,
connecté à Tailscale, avec Atelier et la passerelle actifs. Les règles d’accès
du réseau Tailscale s’appliquent également.

Une autre configuration consiste à écouter directement sur l’IPv4 Tailscale
du PC, lorsque cette adresse peut être liée par le système :

```sh
python3 scripts/connect-mobile-pc.py --listen 100.XX.YY.ZZ --pc-name "Mon PC"
```

Saisissez alors `http://100.XX.YY.ZZ:4318` dans l’APK. Le transport passe dans
le tunnel Tailscale. Sur macOS, le mode HTTPS Serve est préférable lorsque le
client Tailscale n’expose pas son adresse comme interface réseau du système.

## Travail depuis le téléphone

Choisissez le projet du PC connecté. Parcourez les dossiers et lisez les
fichiers dans l’explorateur, consultez les tâches, ouvrez une session ou créez
un agent/une équipe. Choisissez le modèle et l’effort dans le catalogue du PC.
La création conserve **lecture seule par défaut**, le choix explicite
**écriture projet**, **on-request** et le diagnostic/plan avant implémentation.
Les prompts et les réponses passent par les sessions réelles d’Atelier.

Les demandes d’autorisation et les plans attendent votre décision. Une fin de
tour ne vaut pas validation humaine de la tâche. Les mesures absentes de
tokens/abonnement restent inconnues. Les données hors connexion sont signalées
comme dernières données reçues ; un envoi interrompu n’est pas rejoué
automatiquement.

Cette première version mobile utilise les sessions outillées du backend. Les
PTY Electron, le navigateur ChatGPT intégré et le contrôle des fenêtres externes
restent des fonctions desktop. Le téléphone n’exécute pas lui-même Codex.

## Mises à jour de l’APK

L’application vérifie la version proposée par le PC connecté à la connexion et
au retour au premier plan (au plus toutes les cinq minutes), et permet une
vérification manuelle. Une version supérieure est présentée avec une action de
téléchargement. Le téléchargement utilise la même adresse et la clé du PC ;
le SHA-256, la taille, le package et la signature sont contrôlés avant ouverture
de l’installateur Android. L’installation demande votre confirmation Android.

La source de mise à jour est le couple `build/mobile/release.json` et
`build/mobile/Atelier-mobile.apk` du PC. Pour proposer une nouvelle version :
augmentez `versionCode` et `versionName` dans `mobile/android/version.json`,
recompilez avec la **même clé de signature**, puis déposez les deux fichiers
sur les PC servant les mises à jour. Une interface web mise à jour sur le PC est
chargée à la prochaine connexion ; une nouvelle version native requiert un APK.

Il n’y a pas de publication Android sur le Play Store ou de flux de release
Android public configuré dans cette livraison. Un manifeste absent ou invalide
est présenté comme indisponible ; il n’est pas assimilé à une vérification réussie.

## Révocation et données privées

Les profils du téléphone sont chiffrés avec Android Keystore et exclus de la
sauvegarde Android. La clé de la passerelle est conservée dans
`.atelier/mobile-gateway/key`, exclu de Git. Le nonce HTTP desktop reste
uniquement en mémoire sur le PC. Pour révoquer les appairages de ce PC :

```sh
python3 scripts/connect-mobile-pc.py --revoke
python3 scripts/connect-mobile-pc.py --pair
```

La révocation agit sans relancer la passerelle. Remplacez ensuite la clé dans
les profils autorisés du téléphone. Arrêter la passerelle coupe l’accès mobile,
sans arrêter les sessions d’agents du backend. Chaque PC conserve ses propres
données et sessions.

## Sources, build et recette

Sources Android : `mobile/android/`. Interface : `web/mobile/`. Transport :
`server/mobile_gateway.py`. Découverte locale : `server/mobile_discovery.py`.
Android 8.0 ou plus est requis. Version initiale : `0.1.0`, code `1`, package
`fr.atelier.mobile`. Le build local produit un APK de développement signé, installable ;
sa signature est distincte d’une future signature de diffusion Play Store.

Sur macOS ou Linux, reconstruisez avec :

```sh
sh scripts/build-mobile-android.sh
```

Le script Python sous-jacent est `mobile/android/build.py`. Il prépare sa chaîne
d’outils dans `build/mobile-toolchain` sur macOS Apple Silicon ; sur Linux,
fournissez `JAVA_HOME`, `ANDROID_BUILD_TOOLS` et `ANDROID_PLATFORM_JAR` pointant
vers votre JDK/SDK Android. La clé de signature est conservée durablement dans
`.atelier/mobile/signing/debug.keystore`, hors Git. Conservez cette clé pour
pouvoir installer les versions futures par-dessus
l’application existante.

La recette développeur utilise exclusivement un fournisseur fictif, deux
projets de test et des services locaux isolés. Les preuves et les limites sont
consignées dans [le rapport mobile](audit/2026-10-03-mobile-android.md).
