# Préparation de la distribution desktop — 2 octobre 2026

## Demande et périmètre

La livraison vise des installateurs simples Windows/macOS/Linux sans Python/Node
à installer, la connexion OpenAI Codex et des mises à jour proposées avec
téléchargement automatique au choix. Cette version est préparée sur
**`branch_dev_laptop` uniquement**, en préservant la branche PC. Les travaux
indépendants de build, tests et livraison sont répartis entre plusieurs agents.

Version préparée : `0.3.0-beta.1`, dépôt `Dmkn78/CLI_agent_dev`. Le statut bêta
conserve les limites de signature et de validation. Au début de la préparation,
l'API publique des releases ne retournait aucune release ; cette réponse
n'exclut pas un brouillon privé.

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
| Backend complet avant les correctifs CI | 159 tests exécutés : 157 réussis et 2 ignorés (symlink Windows sans privilège et MCP empaqueté hors environnement), en 48,713 s. Le MCP est exécuté séparément. Log privé `.atelier/release-backend-current.log`. |
| Contrôles backend ciblés | Telegram 7/7, Duplica 38/38 et ressources HTTP 2/2 réussis. |
| Service figé Windows | 3/3 réussis : ressources/authentification locale, persistance après redémarrage, arrêt lié au parent et entrée mémoire MCP. |
| Contrôleur de mise à jour | 17/17 tests réussis. Log privé `.atelier/release-updates-current.log`. |
| Syntaxe JavaScript | 62 fichiers JS/CJS contrôlés avec `node --check`, tous réussis. Log privé `.atelier/release-js-current.log`. |
| Desktop Windows empaqueté local | Fenêtre Electron réelle, service, profil isolé, préférences d'update et écho PTY vérifiés avec Python et Node.js retirés du PATH de l'application. Dernière recette réussie : `.atelier/release-desktop-laptop-head-native-capture.log`. La capture utilise l'API Electron adaptée aux fenêtres cachées. |
| Interface des updates | Contrôleur réel avec fournisseur de mise à jour fictif : préférences, progression, reprise après erreurs réseau/installation et actions explicites réussies à 1500/900/390/300 px, sans erreur ni débordement. Aucun installateur réel n'est appliqué par cette recette. Preuve privée `.atelier/updates-browser-evidence/result.json`. |
| Reconstruction Windows locale | Installateur de 230 156 472 octets, runtime et service figé 3/3 réussis. Logs privés `.atelier/release-runtime-laptop-head.log`, `.atelier/release-installer-laptop-head.log` et `.atelier/release-frozen-laptop-head.log`. Le checkout a évolué pendant les builds ; ce binaire sert à la recette locale. La publication utilise les artefacts du checkout CI figé. |
| Script des assets | Syntaxe JS réussie. Fixtures des trois OS : allowlist, SHA-256, exclusion des données privées/debug, refus des dossiers périmés et installateurs manquants. Binaires de fixture fictifs. |
| Workflow YAML | Lecture avec `js-yaml` réussie, matrice de trois plateformes. Ne remplace pas une exécution GitHub Actions. |
| Première matrice distante | GitHub Actions [37067436665](https://github.com/Dmkn78/CLI_agent_dev/actions/runs/37067436665) a révélé l'absence du téléchargement explicite d'Electron et les alias de chemins temporaires Windows/macOS. La préparation d'Electron et la comparaison des chemins résolus sont corrigées ; nouvelle exécution requise. |
| Deuxième matrice distante | [37069228671](https://github.com/Dmkn78/CLI_agent_dev/actions/runs/37069228671) valide le service et le desktop/PTY Linux. Les blocages suivants sont corrigés : nom AppImage `x86_64`, variables de certificat vides sur macOS et stdio Windows du Python figé en cp1252. La publication attend la nouvelle matrice. |
| Transport du service figé après correction | 4/4 tests réussis localement, avec `PYTHONIOENCODING=cp1252` et décodage UTF-8 strict. Log privé `.atelier/release-utf8-frozen-tests.log`. |
| Régressions ciblées après la première CI | Association native : 13 tests, 12 réussis et 1 symlink ignoré sous Windows. Feedback : 13/13 réussis. Pièces jointes : 6/6 tests Node réussis. |
| Derniers correctifs de discussion et pièces jointes | Deux recettes Chrome réussies, dont la recette complète à 1500/900/390/300 px : brouillons par projet, envoi unique, retrait pendant upload, Markdown, fichiers et commandes. Preuves privées `.atelier/feedback-followup-evidence/followup-result.json` et `.atelier/release-feedback-review-evidence/result.json`. |
| Profils et données de distribution | ASAR local limité à `desktop`, `node_modules` et `package.json`, licences npm/Electron présentes. Aucun profil, credentials, document personnel ou capture embarqué. Les nouveaux profils utilisent des règles produit neutres. La CI reconstruit depuis son checkout figé. |
| Signature, notarisation, machine vierge, mise à jour entre deux versions | Non vérifiées ; identités de signature non fournies. |
| Commit et push | Source committée et poussée sur `branch_dev_laptop` : [`feb51456e98459df4d62f2a6411a7e47ce23d25b`](https://github.com/Dmkn78/CLI_agent_dev/commit/feb51456e98459df4d62f2a6411a7e47ce23d25b). Documentation système complémentaire en préparation. |
| Tag et publication | Non réalisés lors de cette rédaction ; aucun téléchargement public n'est attesté par ce rapport. |

La recette Electron Windows a requis le lancement hors du confinement du shell
de test à cause des ACL AppContainer. Aucun drapeau Electron `--no-sandbox`
n'a été ajouté. Les preuves contenant les chemins/profils restent privées sous
`.atelier/`, hors Git. Aucun prompt réel n'a été utilisé pour remplir l'interface.

## Limites

Installation sur machine vierge, alertes OS, droits effectifs du compte Codex et
cycle entre deux releases restent à vérifier. Mac Intel, Windows ARM et Linux
ARM sont absents de la matrice initiale. Les autres CLI et outils des projets
restent externes. L'ancien `.atelier/` de développement est conservé sans
migration automatique. La signature macOS est nécessaire à son auto-update ;
la signature Windows ne garantit pas l'absence immédiate d'alerte SmartScreen.

Sources primaires examinées :
[signature electron-builder](https://www.electron.build/docs/features/code-signing/),
[mises à jour](https://www.electron.build/docs/features/auto-update/),
[runners GitHub](https://docs.github.com/en/actions/reference/runners/github-hosted-runners),
[CLI Codex public](https://github.com/openai/codex).
Skills utilisés pour ce périmètre : `engineering-workflow`, `clean-code-delivery`
et `coding-rules`.
