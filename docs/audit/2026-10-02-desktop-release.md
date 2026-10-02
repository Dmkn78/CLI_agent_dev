# Préparation de la distribution desktop — 2 octobre 2026

## Demande et périmètre

Damien demande des installateurs simples Windows/macOS/Linux sans Python/Node
à installer, la connexion OpenAI Codex et des mises à jour proposées avec
téléchargement automatique au choix. Il confirme le dépôt GitHub et demande de
committer cette version sur **`branch_dev_laptop` uniquement**, en préservant la
branche PC. Il demande explicitement plusieurs agents en parallèle.

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
| Backend complet | 157 tests OK, dont 2 ignorés : symlink Windows sans privilège et MCP empaqueté hors environnement. Ce dernier est exécuté séparément. Log privé `.atelier/release-backend-verification.log`. |
| Service figé Windows | 3/3 réussis : ressources/authentification locale, persistance après redémarrage, arrêt lié au parent et entrée mémoire MCP. |
| Contrôleur de mise à jour | 17/17 tests réussis. |
| Desktop Windows empaqueté | Fenêtre Electron réelle, service, préférences d'update et écho PTY vérifiés. Preuves privées `.atelier/release-desktop-fixture/proof.json` et `connections.png`. |
| Première construction NSIS | EXE produit ; Authenticode `NotSigned`, conformément à la bêta. Reconstruction finale en cours lors de cette rédaction, après ajout icône/licence Python et correctifs d'update. |
| Script des assets | Syntaxe JS réussie. Fixtures des trois OS : allowlist, SHA-256, exclusion des données privées/debug, refus des dossiers périmés et installateurs manquants. Binaires de fixture fictifs. |
| Workflow YAML | Lecture avec `js-yaml` réussie, matrice de trois plateformes. Ne remplace pas une exécution GitHub Actions. |
| macOS/Linux et matrice distante | Non vérifiés lors de la rédaction initiale ; nécessitent les runners natifs. |
| Signature, notarisation, machine vierge, mise à jour entre deux versions | Non vérifiées ; identités de signature non fournies. |
| Commit, push, tag et publication | À renseigner après l'action réelle ; ce document n'est pas une preuve de publication. |

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
