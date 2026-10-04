# Atelier Android

Client Android natif minimal (`fr.atelier.mobile`) pour piloter les PC Atelier
par leur passerelle privée. Android 8.0/API 26 minimum, cible Android 15/API 35.
Les opérations agents et fichiers viennent du PC ; l’APK ne contient aucun
fournisseur IA, modèle figé, compte ou credential Codex.

## Construire l’APK

Depuis la racine : `scripts/build-mobile-android.sh`.

Sur macOS ARM64, le script récupère les archives officielles vérifiées de
Temurin 17, Android SDK Build Tools 37 et Platform 35 dans
`build/mobile-toolchain/`, sans installation globale. Un autre système peut
fournir `JAVA_HOME`, `ANDROID_BUILD_TOOLS` et `ANDROID_PLATFORM_JAR`.
La compilation utilise `javac`, `aapt2`, `d8`, `zipalign` puis `apksigner`.

Sorties : `build/mobile/Atelier-mobile.apk`, `release.json`, empreinte SHA256,
preuve de signature et métadonnées du package. `version.json` définit la
version publiée ; augmenter son `versionCode` avant chaque nouvelle version.
Les options `--version-file` et `--output-directory` permettent une construction
de recette isolée sans modifier les livrables.

La signature locale de développement est stable et privée dans
`.atelier/mobile/signing/debug.keystore` (droits 0600). Le script reprend la clé
initiale de `build/mobile-toolchain/debug.keystore` si présente. Conserver cette
clé et la sauvegarder en lieu sûr : une nouvelle clé ne peut pas mettre à jour
l’application déjà installée. Aucune clé ni profil privé n’est versionné.

## Connexion et mises à jour

Voir `docs/MOBILE.md` pour l’installation Tailscale et les commandes PC.
Les profils PC sont intégralement chiffrés par AES-GCM avec une clé
non exportable Android Keystore ; la sauvegarde Android est désactivée.
Les URL configurées doivent être privées, locales ou Tailscale (`*.ts.net`).
Le DNS doit résoudre exclusivement des adresses privées. La navigation et
les requêtes WebView restent dans l’origine configurée. HTTPS garde la
validation standard des certificats ; aucun pont JavaScript natif n’est exposé.

La navigation initiale transmet le bearer à `/mobile/`. Les ressources
`/mobile/app.js` et `/mobile/style.css` sont statiques. Le HTML embarque uniquement
le token de cette passerelle dans `atelier-mobile-token` pour ses appels API.
Les clés ne sont jamais placées dans une URL. Les cookies sont désactivés et
les données WebView sont effacées lors de la déconnexion.

À la connexion, au retour au premier plan (au plus une fois par cinq minutes)
et au bouton **MàJ**, l’app lit `/mobile/release.json` avec le bearer.
Le téléchargement de `/mobile/atelier.apk` exige un clic explicite.
Avant installation : taille et SHA256, nom du package, version réelle de
l’archive supérieure à celle installée et certificat de signature identique
sont vérifiés. Le fichier est fourni en lecture seule à l’installateur Android
par un ContentProvider privé ; Android demande l’autorisation et la confirmation.
Une mise à jour de la page mobile servie par le PC apparaît à la reconnexion ;
une mise à jour native exige une nouvelle APK et un manifeste sur ce PC.

## Vérification

Le build exécute les régressions JVM de la frontière URL/origine, valide la
signature v2/v3, l’alignement, le nom du package et la version. La recette
Android 15 ARM64 sur émulateur est décrite dans le rapport de livraison mobile.
L’installation sur un téléphone physique et un vrai tailnet reste une
validation utilisateur.
