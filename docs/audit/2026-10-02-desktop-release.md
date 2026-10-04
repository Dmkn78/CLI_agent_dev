# Distribution desktop — 2 et 3 octobre 2026

## Demande et périmètre

La livraison vise des installateurs simples Windows/macOS/Linux sans Python/Node
à installer, la connexion OpenAI Codex et des mises à jour proposées avec
téléchargement automatique au choix. Cette version est préparée sur
**`branch_dev_laptop` uniquement**, en préservant la branche PC. Les travaux
indépendants de build, tests et livraison sont répartis entre plusieurs agents.

Version : `0.3.0-beta.1`, dépôt `Dmkn78/CLI_agent_dev`.
**Publiée le 3 octobre 2026.** Les artefacts sont construits sur des checkouts CI
figés. La bêta conserve les limites de signature, de notarisation et de
validation du cycle entre deux versions.

Les téléchargements suivants sont disponibles dans la
[release v0.3.0-beta.1](https://github.com/Dmkn78/CLI_agent_dev/releases/tag/v0.3.0-beta.1)
(identifiant GitHub `402200616`) :

| Plateforme | Artefact | Taille en octets |
|---|---|---|
| Windows x64 | [Installateur EXE](https://github.com/Dmkn78/CLI_agent_dev/releases/download/v0.3.0-beta.1/Atelier-0.3.0-beta.1-win-x64.exe) | 230 596 570 |
| macOS arm64 | [Installateur DMG](https://github.com/Dmkn78/CLI_agent_dev/releases/download/v0.3.0-beta.1/Atelier-0.3.0-beta.1-mac-arm64.dmg) | 271 810 459 |
| Linux x64 | [AppImage](https://github.com/Dmkn78/CLI_agent_dev/releases/download/v0.3.0-beta.1/Atelier-0.3.0-beta.1-linux-x86_64.AppImage) | 316 313 522 |

## Évolution structurante

- Electron embarque le service Python PyInstaller et le Codex natif avec les
  licences. Python/Node/npm ne sont pas requis pour l'utilisateur final.
- Le service utilise un port local libre, un signal de disponibilité et un
  profil utilisateur séparé ; il s'arrête avec son parent. Le MCP reste utilisable
  depuis le binaire figé. La fenêtre installée s'ouvre sur Connexions.
- Les comptes passent par le protocole Codex, sans copie de credentials.
- Contrôle automatique des updates activé, téléchargement automatique désactivé,
  installation confirmée. Travaux actifs et PTY ouverts bloquent le redémarrage.
- Cibles : NSIS `.exe` Windows x64, DMG/ZIP macOS arm64, AppImage Linux x64.
  Le build utilise `--publish never` ; GitHub Releases est configuré en brouillon.
- La CI contrôle la branche laptop, le tag/version, les tests fictifs, le
  service figé et le desktop empaqueté sur les trois OS. Tous les jobs doivent
  réussir avant le brouillon. Une release déjà publique n'est pas modifiée.
- Les uploads utilisent une liste fermée : installateurs, métadonnées du canal,
  blockmaps et SHA-256. `.atelier/`, logs/captures et dossiers décompactés restent
  exclus. Les métadonnées doivent porter la version courante.
- Les stables exigent les secrets de signature, la signature forcée Windows/macOS
  et la notarisation Apple, suivies d'une vérification native.

Mode d'emploi : [RELEASE.md](../RELEASE.md).

## Preuves observées

| Contrôle | Résultat |
|---|---|
| Backend complet, quatrième matrice | 163 tests exécutés par OS : Windows 162 réussis et 1 ignoré ; macOS/Linux 161 réussis et 2 ignorés. Preuve de la matrice finale : `.atelier/ci4-complete.log` et jobs GitHub ci-dessous. |
| Contrôles backend ciblés | Telegram 7/7, Duplica 38/38 et ressources HTTP 2/2 réussis. |
| Service figé, quatrième matrice | 4/4 tests réussis sur chacun des trois OS : ressources/authentification locale, persistance après redémarrage, arrêt lié au parent et entrée mémoire MCP. Le transport UTF-8 est également vérifié. |
| Contrôleur de mise à jour | 17/17 tests réussis. Log privé `.atelier/release-updates-current.log`. |
| Syntaxe JavaScript | Avant les correctifs CI, 62 fichiers JS/CJS contrôlés localement avec `node --check`, tous réussis (`.atelier/release-js-current.log`). Les jobs de la quatrième matrice contrôlent à nouveau leurs sources figées. |
| Desktop Windows empaqueté local | Fenêtre Electron réelle, service, profil isolé, préférences d'update et écho PTY vérifiés avec Python et Node.js retirés du PATH de l'application. Dernière recette réussie : `.atelier/release-desktop-laptop-head-native-capture.log`. La capture utilise l'API Electron adaptée aux fenêtres cachées. |
| Interface des updates | Contrôleur réel avec fournisseur de mise à jour fictif : préférences, progression, reprise après erreurs réseau/installation et actions explicites réussies à 1500/900/390/300 px, sans erreur ni débordement. Aucun installateur réel n'est appliqué par cette recette. Preuve privée `.atelier/updates-browser-evidence/result.json`. |
| Reconstruction Windows locale | Installateur de 230 156 472 octets, runtime et service figé 3/3 réussis. Logs privés `.atelier/release-runtime-laptop-head.log`, `.atelier/release-installer-laptop-head.log` et `.atelier/release-frozen-laptop-head.log`. Le checkout a évolué pendant les builds ; ce binaire sert à la recette locale. La publication utilise les artefacts du checkout CI figé. |
| Script des assets | Syntaxe JS réussie. Fixtures des trois OS : allowlist, SHA-256, exclusion des données privées/debug, refus des dossiers périmés et installateurs manquants. Binaires de fixture fictifs. |
| Workflow YAML | Lecture avec `js-yaml` réussie, matrice de trois plateformes. Ne remplace pas une exécution GitHub Actions. |
| Première matrice distante | GitHub Actions [37067436665](https://github.com/Dmkn78/CLI_agent_dev/actions/runs/37067436665) a révélé l'absence du téléchargement explicite d'Electron et les alias de chemins temporaires Windows/macOS. La préparation d'Electron et la comparaison des chemins résolus sont corrigées. |
| Deuxième matrice distante | [37069228671](https://github.com/Dmkn78/CLI_agent_dev/actions/runs/37069228671) valide le service et le desktop/PTY Linux. Les blocages suivants sont corrigés : nom AppImage `x86_64`, variables de certificat vides sur macOS et stdio Windows du Python figé en cp1252. |
| Troisième matrice distante | [37071414875](https://github.com/Dmkn78/CLI_agent_dev/actions/runs/37071414875), source `38e84daa6c781a93628865c4579122157914d675` : Windows et Linux entièrement réussis. Le PTY macOS a révélé les permissions d'exécution manquantes des helpers natifs, corrigées dans le commit suivant. |
| Windows, quatrième matrice | [Job Windows 111055249053](https://github.com/Dmkn78/CLI_agent_dev/actions/runs/37072574866/jobs/111055249053) entièrement réussi : installation NSIS réelle, application empaquetée et PTY sans Python/Node dans le PATH, désinstallation et conservation d'un marqueur du profil. |
| macOS, quatrième matrice | [Job macOS 111055249082](https://github.com/Dmkn78/CLI_agent_dev/actions/runs/37072574866/jobs/111055249082) entièrement réussi sur Apple Silicon, terminal natif compris après correction des permissions des helpers. |
| Linux, quatrième matrice | [Job Linux 111055249021](https://github.com/Dmkn78/CLI_agent_dev/actions/runs/37072574866/jobs/111055249021) entièrement réussi : service figé, mémoire MCP, construction de l'AppImage et recette du desktop décompacté avec PTY sous Xvfb. Le lancement de l'AppImage lui-même n'est pas testé. |
| Transport du service figé après correction | 4/4 tests réussis localement, avec `PYTHONIOENCODING=cp1252` et décodage UTF-8 strict. Log privé `.atelier/release-utf8-frozen-tests.log`. |
| Régressions ciblées après la première CI | Association native : 13 tests, 12 réussis et 1 symlink ignoré sous Windows. Feedback : 13/13 réussis. Pièces jointes : 6/6 tests Node réussis. |
| Derniers correctifs de discussion et pièces jointes | Deux recettes Chrome réussies, dont la recette complète à 1500/900/390/300 px : brouillons par projet, envoi unique, retrait pendant upload, Markdown, fichiers et commandes. Preuves privées `.atelier/feedback-followup-evidence/followup-result.json` et `.atelier/release-feedback-review-evidence/result.json`. |
| Derniers panneaux et fichiers du workspace | Recette Chrome simple workbench réussie : disposition, dashboard, isolation des espaces, fichiers, canvas, compteurs cumulés, Escape/focus et 1500/900/390/300 px, sans erreur JS. Le transport PTY de cette recette est fictif ; les recettes desktop natives sont distinctes. Preuve privée `.atelier/simple-workbench-evidence/browser-result.json` et log `.atelier/release-simple-workbench-current.log`. |
| Profils et données de distribution | ASAR local limité à `desktop`, `node_modules` et `package.json`, licences npm/Electron présentes. Aucun profil, credentials, document personnel ou capture embarqué. Les nouveaux profils utilisent des règles produit neutres. La CI reconstruit depuis son checkout figé. |
| Signatures et notarisation | Aucun certificat d'éditeur Windows/macOS fourni et aucune notarisation Apple. Les signatures stables ne sont pas validées par ces builds bêta. |
| Poste utilisateur neuf et cycle entre deux versions | Hors recette CI, installation sur poste neuf et alertes OS encore à valider. Aucune mise à jour réelle entre deux releases publiées n'a été exécutée. |
| Source et branche | Commit source des artefacts CI et du [tag `v0.3.0-beta.1`](https://github.com/Dmkn78/CLI_agent_dev/tree/v0.3.0-beta.1) : [`246c62c181e2de57e4a77ac513c9f428904cf5fe`](https://github.com/Dmkn78/CLI_agent_dev/commit/246c62c181e2de57e4a77ac513c9f428904cf5fe), poussé sur [`branch_dev_laptop`](https://github.com/Dmkn78/CLI_agent_dev/tree/branch_dev_laptop). La branche PC est préservée. |
| Transfert et empreintes des artefacts | Les 13 fichiers CI4 passent la liste autorisée et les contrôles SHA-256/SHA-512 des manifestes. Après upload, GitHub confirme 13 assets dont toutes les tailles et SHA-256 correspondent aux fichiers validés. Aucun binaire local issu d'un checkout évolutif n'est publié. |
| Disponibilité publique | Vérification sans authentification : release `draft=false`, `prerelease=true`, tag sur `246c62c`, 13 liens HTTP 200. Les tailles et SHA-256 GitHub correspondent aux artefacts CI ; les trois manifestes publics sont identiques aux fichiers validés. Preuve privée `.atelier/release-public-verification.json`. |
| Découverte effective des updates GitHub | Le vrai `GitHubProvider` d'electron-updater 6.8.9 découvre `0.3.0-beta.1` depuis une version témoin `0.3.0-beta.0`, via `releases.atom` et `beta.yml` publics. Nom, taille Windows de 230 596 570 octets et SHA-512 correspondent à CI4 ; `autoDownload=false`, `downloadPromise=null`. Aucun téléchargement d'installateur ni installation entre versions n'est exécuté. Preuves privées `.atelier/github-provider-check/proof.json` et `.atelier/github-provider-check.log`. |
| Tag et publication | [Release publique v0.3.0-beta.1](https://github.com/Dmkn78/CLI_agent_dev/releases/tag/v0.3.0-beta.1), identifiant `402200616`, publiée le 3 octobre 2026 à 00:40 Europe/Paris (`2026-10-02T22:40:18Z`) avec les 13 assets validés. |
| Exécution déclenchée par le tag | Le tag publié déclenche le [run 37073725832](https://github.com/Dmkn78/CLI_agent_dev/actions/runs/37073725832) au même commit source. Son état final est `completed/cancelled` : CI4 a déjà entièrement validé ce commit et les fichiers publiés restent immuables. Ce run redondant n'est pas utilisé comme preuve de release. |

La recette Electron Windows a requis le lancement hors du confinement du shell
de test à cause des ACL AppContainer. Aucun drapeau Electron `--no-sandbox`
n'a été ajouté. Les preuves contenant les chemins/profils restent privées sous
`.atelier/`, hors Git. Aucun prompt réel n'a été utilisé pour remplir l'interface.

## Limites

Installation sur poste utilisateur neuf hors CI, alertes OS, droits effectifs du
compte Codex et cycle entre deux releases restent à vérifier. Le lancement de
l'AppImage Linux lui-même reste à tester ; la CI couvre le desktop décompacté.
Mac Intel, Windows ARM et Linux
ARM sont absents de la matrice initiale. Les autres CLI et outils des projets
restent externes. L'ancien `.atelier/` de développement est conservé sans
migration automatique. La bêta macOS n'est pas notarisée. Une identité Developer
ID est nécessaire pour valider son auto-update signé ;
la signature Windows ne garantit pas l'absence immédiate d'alerte SmartScreen.

Sources primaires examinées :
[signature electron-builder](https://www.electron.build/docs/features/code-signing/),
[mises à jour](https://www.electron.build/docs/features/auto-update/),
[runners GitHub](https://docs.github.com/en/actions/reference/runners/github-hosted-runners),
[CLI Codex public](https://github.com/openai/codex).
Skills utilisés pour ce périmètre : `engineering-workflow`, `clean-code-delivery`
et `coding-rules`.
