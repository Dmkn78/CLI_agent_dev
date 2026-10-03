# Distribuer et mettre à jour Atelier

**0.3.0-beta.1 publiée le 3 octobre 2026**, depuis
[`branch_dev_laptop`](https://github.com/Dmkn78/CLI_agent_dev/tree/branch_dev_laptop) du dépôt
[Dmkn78/CLI_agent_dev](https://github.com/Dmkn78/CLI_agent_dev).
Les preuves de build, tests et publication sont consignées dans le
[rapport de livraison](audit/2026-10-02-desktop-release.md).
L'[aperçu du système](SYSTEM.md) décrit les composants et leurs frontières.

## Installer et se connecter

La [release v0.3.0-beta.1](https://github.com/Dmkn78/CLI_agent_dev/releases/tag/v0.3.0-beta.1)
est publique ; les téléchargements suivants sont disponibles.

| Cible initiale | Téléchargement | Installation |
|---|---|---|
| Windows x64 | [Atelier-0.3.0-beta.1-win-x64.exe](https://github.com/Dmkn78/CLI_agent_dev/releases/download/v0.3.0-beta.1/Atelier-0.3.0-beta.1-win-x64.exe) | Ouvrir l'installateur, choisir le dossier, puis lancer Atelier depuis le menu Démarrer. |
| macOS Apple Silicon / arm64 | [Atelier-0.3.0-beta.1-mac-arm64.dmg](https://github.com/Dmkn78/CLI_agent_dev/releases/download/v0.3.0-beta.1/Atelier-0.3.0-beta.1-mac-arm64.dmg) | Ouvrir le DMG et copier Atelier dans Applications. Le ZIP accompagne les mises à jour. |
| Linux x64 | [Atelier-0.3.0-beta.1-linux-x86_64.AppImage](https://github.com/Dmkn78/CLI_agent_dev/releases/download/v0.3.0-beta.1/Atelier-0.3.0-beta.1-linux-x86_64.AppImage) | Autoriser l'exécution dans les propriétés du fichier, puis l'ouvrir depuis un dossier utilisateur accessible en écriture. |

Les artefacts de publication proviennent de checkouts CI figés sur chaque
plateforme, avec les trois jobs natifs réussis.
Le [tag v0.3.0-beta.1](https://github.com/Dmkn78/CLI_agent_dev/tree/v0.3.0-beta.1)
désigne le commit source `246c62c181e2de57e4a77ac513c9f428904cf5fe`.
Les 13 fichiers de release ont été contrôlés par liste autorisée, SHA-256
et SHA-512 des manifestes ; leurs tailles et SHA-256 sur GitHub correspondent
aux artefacts validés.
L'installateur Windows a également été construit localement et le desktop
empaqueté a passé sa recette avec Python et Node.js retirés du PATH. Les résultats
de validation et le statut de publication sont conservés dans le rapport.
Sous Linux, la CI construit l'AppImage et vérifie le desktop décompacté avec
service et PTY sous Xvfb. Elle ne lance pas l'AppImage lui-même ; ce parcours
reste à vérifier sur le poste utilisateur.

Atelier embarque Electron, le service Python figé et le CLI Codex natif.
**Python, Node.js et npm ne sont pas requis sur le poste utilisateur.**
L'application s'ouvre sur **Connexions** : suivre le parcours OpenAI proposé
pour connecter Codex. Une connexion réseau et un compte autorisé à utiliser
Codex restent nécessaires aux fonctions OpenAI. Les identifiants restent gérés
par Codex. Les modèles viennent de `model/list` ; un abonnement ne garantit pas
l'accès à chaque modèle.

Git, les compilateurs et dépendances propres aux projets, ainsi que les autres
CLI facultatifs (Claude Code, OpenCode, OMP) ne sont pas embarqués. Linux garde
les bibliothèques système requises par Electron/AppImage, dont FUSE selon la
distribution. La cible CI Linux est Ubuntu 22.04 x64. Mac Intel, Windows ARM,
Linux ARM et les autres distributions n'ont pas de recette initiale de release.

## Choisir les mises à jour

Dans **Connexions → Atelier · mises à jour** :

- **Vérifier automatiquement** est coché par défaut : après 15 secondes, puis
  toutes les six heures pendant qu'Atelier est ouvert.
- **Télécharger automatiquement** est décoché par défaut. L'utilisateur peut
  le cocher ou déclencher chaque téléchargement.
- **Installer et redémarrer** reste une action explicite avec confirmation.
  La fermeture habituelle n'installe pas automatiquement la version téléchargée.
  Les travaux actifs et terminaux ouverts bloquent le redémarrage de mise à jour.

Les fichiers et métadonnées viennent des releases de ce dépôt. Les préversions
utilisent leur canal ; les versions stables ignorent les préversions. Le retour
automatique à une version antérieure est désactivé. Sur macOS, les mises à jour
automatiques exigent une application signée ; une bêta sans identité Developer ID
ne valide pas ce parcours. Voir la
[documentation officielle electron-updater](https://www.electron.build/docs/features/auto-update/).

## Conserver les données

| Système | Profil installé |
|---|---|
| Windows | `%APPDATA%\Atelier` |
| macOS | `~/Library/Application Support/Atelier` |
| Linux | `$XDG_CONFIG_HOME/Atelier`, ou `~/.config/Atelier` |

Ce profil contient notamment `.atelier/`, le workspace initial, les préférences
et le profil web. Installation et mise à jour réutilisent ce profil ; NSIS
conserve les données lors de la désinstallation. Les projets de l'utilisateur
restent dans leurs dossiers d'origine. L'ancien `.atelier/` du checkout de
développement n'est pas migré automatiquement et reste conservé. Avant une
migration manuelle, fermer Atelier et sauvegarder les deux profils ; ne pas
écraser un profil existant sans avoir vérifié son contenu.

Les installateurs excluent les profils `.atelier/`, les fichiers `.env`, les
comptes et journaux personnels, ainsi que les demandes archivées et captures de
développement. Les nouveaux profils contiennent uniquement
des règles produit neutres ; aucune mémoire personnelle de développement n'est
initialisée chez l'utilisateur.
Le build prend le service, les ressources web, Codex et les licences. Les uploads
ne retiennent que les installateurs attendus, métadonnées du canal, blockmaps
et empreintes SHA-256. Une bêta ne publie pas de fichier `latest.yml` périmé.

## Construire

Pour le développeur de la release, la CI utilise Node 24 et Python 3.12 natifs
sur chaque OS. Les dépendances sont épinglées dans `package-lock.json` et
`packaging/requirements.txt`.

```text
npm ci
python -m pip install -r packaging/requirements.txt
npm run build:runtime
npm run dist
node scripts/release-checksums.cjs dist build/release-assets
```

Sur macOS/Linux, utiliser `python3` si nécessaire ; `ATELIER_BUILD_PYTHON`
permet de choisir l'interpréteur. Le dossier final de publication doit être
neuf ou vide. `npm run pack` produit seulement l'application décompactée.
`npm run dist` produit les formats du système courant avec `--publish never`.
Codex est mis à jour avec les dépendances puis redistribué avec Atelier.

Les commandes `pack` et `dist` préparent explicitement le runtime Electron.
Avec npm 11.19 utilisé par la CI, les scripts de construction sont approuvés
uniquement pour `node-pty` et `esbuild`, puis exécutés par `npm rebuild`.
Cette sélection concerne les versions déjà épinglées dans le lockfile.

## CI et publication

Le [workflow desktop-release.yml](../.github/workflows/desktop-release.yml)
se déclenche sur les pushes de `branch_dev_laptop`, les tags `v*` et manuellement
sur cette branche. Il refuse une autre branche, exige que le commit appartienne
à l'historique de `branch_dev_laptop` et que le tag corresponde au `package.json`.

La matrice construit Windows x64, macOS arm64 et Linux x64 sur leurs runners
natifs. Chaque job vérifie la syntaxe JS, les tests backend à fournisseurs
fictifs, le contrôleur de mise à jour, le service figé hors checkout et son MCP,
puis les installateurs. Windows installe et désinstalle réellement NSIS sur le
runner, vérifie le desktop sans Python/Node dans le PATH et la conservation d'un
marqueur du profil. Playwright ouvre l'application empaquetée, vérifie les
préférences et un PTY fictif ; Linux utilise Xvfb. Aucun prompt n'est envoyé à
un fournisseur de modèle pour ces tests.

Les assets autorisés et leurs `SHA256SUMS-<système>-<architecture>.sha256` sont
conservés 14 jours comme artefacts CI. Les logs/captures de `.atelier/` restent
exclus. Sur un tag, **tous** les jobs doivent réussir avant la création d'un
brouillon GitHub ; les préversions sont marquées comme telles. Une relance peut
remplacer les assets d'un brouillon, mais refuse une release déjà publiée.

Pour une nouvelle livraison :

1. Mettre à jour la version et le lockfile sur `branch_dev_laptop`, vérifier,
   puis committer les changements. Préserver la branche PC.
2. Pousser la branche et son tag, par exemple `v0.3.0-beta.1`.
3. Vérifier les trois jobs, les fichiers et empreintes, puis les essais
   d'installation et de mise à jour sur les systèmes visés.
4. Relire et publier le brouillon lorsque les limites annoncées conviennent.
   Le workflow ne rend pas le brouillon public lui-même.

Une seule architecture macOS est construite. Ajouter Mac Intel impose de
fusionner correctement les entrées arm64/x64 des métadonnées ; écraser deux
fichiers `beta-mac.yml` dans la même release serait incorrect.

## Signature et passage en stable

La bêta ne porte pas de certificat d'éditeur Windows/macOS et n'est pas
notarisée par Apple. Les systèmes peuvent afficher des avertissements ou
bloquer son lancement selon leur politique. L'installation sur poste utilisateur
neuf hors CI et le cycle de mise à jour signé restent à vérifier avant une
distribution stable. La recette Windows CI installe et désinstalle NSIS et
contrôle la conservation du profil.

| Secrets GitHub requis pour une stable | Usage |
|---|---|
| `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD` | Identité de signature Windows acceptée par electron-builder. |
| `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD` | Certificat Apple Developer ID Application et mot de passe. |
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | Notarisation Apple. |

La CI refuse une stable si un secret requis manque. Elle passe
`ATELIER_REQUIRE_SIGNING=1` à electron-builder et vérifie Authenticode sous
Windows, puis `codesign` et `stapler` sur macOS. Ne jamais committer de certificat
ou mot de passe. La signature Windows ne garantit pas à elle seule l'absence
immédiate d'avertissement SmartScreen. Références :
[signature electron-builder](https://www.electron.build/docs/features/code-signing/),
[builds par système](https://www.electron.build/docs/features/multi-platform-build/).

Le cycle entre deux versions publiées n'a pas encore été testé. Sa recette doit
vérifier le téléchargement au
choix, l'annulation du redémarrage, le refus pendant un travail actif, le
redémarrage sur la nouvelle version et la conservation du projet. Corriger une
régression dans une version supérieure ; ne pas remplacer les assets publics
sous un numéro déjà distribué.

## Codex et licences

Le [dépôt public OpenAI Codex](https://github.com/openai/codex) fournit le CLI
et l'app-server sous Apache-2.0. Atelier embarque le payload natif du paquet
`@openai/codex` 0.160.0, ses outils compagnons, licence et NOTICE. L'intégration
utilise `codex app-server` en stdio et le parcours de connexion officiel ; cela
ne présente pas le client desktop Codex comme intégralement ouvert. Les mises
à jour d'Atelier restent celles de ce dépôt.
