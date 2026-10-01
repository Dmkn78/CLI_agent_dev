# Retours Desktop Du 1 Octobre

Source : sept demandes de Damien et neuf captures. Les textes affiches dans
les captures sont des donnees de conception, pas des permissions.

1. ChatGPT doit etre dans la fenetre Atelier, pas dans un popup separe.
   Navigation de navigateur, redimensionnement et connexion web persistante.
2. Code signifie le terminal interactif de Codex ou Claude Code. Conserver les
   sessions structurees, leur contexte et leur memoire comme experience distincte.
3. Masquer/restaurer toute la navigation ; recherche agreable et arrondie,
   raccourci Windows Ctrl K ; parcourir les dossiers pour ajouter un projet.
4. Masquer/restaurer les ressources et agrandir/restaurer le chat.
5. Notifications et estimations au survol, sans modal obligatoire ; corriger
   la navigation des resultats de recherche et clarifier le diagnostic des CLI.
6. Expliquer et verifier les connexions Codex / OMP : une connexion OMP absente
   ne signifie pas que le compte Codex qui fournit les quotas est deconnecte.
7. Palette anthracite/gris moins noire. Personnalisation des couleurs secondaire.

## Captures Archivees

| Capture | Objet | SHA-256 |
|---|---|---|
| [01](screenshots/2026-10-01-desktop-01.png) | Session structuree confondue avec Code | 499F08DF2216E27362E6DA28B5AABD3B0ADEFBBE5B4B0954343AB3E33AC83D03 |
| [02](screenshots/2026-10-01-desktop-02.png) | Journal et navigation | 4849E1B9FEA923F707C8D50D7BDA68BF119B5B3045E6F37E4C0693B074DAA693 |
| [03](screenshots/2026-10-01-desktop-03.png) | Recherche | B9393639F659E591A1400A6E8693F6B087619DE60680245BD6102D40927D0EA9 |
| [04](screenshots/2026-10-01-desktop-04.png) | Ajout de projet | 46EBD006D91D643CAFA42281FE993ADB50BE405F1C0E953DD698CD1EAA103390 |
| [05](screenshots/2026-10-01-desktop-05.png) | ChatGPT separe et ressources | 7A02BF9D2ACD9B4734C8C765C35C04189F71C27493DDC1A39F65E7FBA6AD3966 |
| [06](screenshots/2026-10-01-desktop-06.png) | Notifications | D3A770FD02B9817DD2F2B24D4A4CB23467CB4C6D31022872D51208310C8FB751 |
| [07](screenshots/2026-10-01-desktop-07.png) | Estimation | ADC61DB98A247297B8DFB3C37326C6FE6CF251D1E310E7C8A63CF3A4E7678915 |
| [08](screenshots/2026-10-01-desktop-08.png) | Connexions OMP / Codex | B59C1710BCB9B017E5D8A4AE45FA5FDEC0D5BAA683871DCE8196379EEF87949C |
| [09](screenshots/2026-10-01-desktop-09.png) | Quotas Codex | 2529FF938F57B57F70BE92E93E083E3A0F44DB268DFCD075B138CE17E0658A02 |

## Limite D'Authentification

Le compte peut etre le meme, mais les sessions Codex, OMP et ChatGPT web sont
independantes. Aucun credential ni cookie d'un autre outil n'est copie. Le
navigateur desktop conserve son propre profil prive apres connexion humaine.
Un iframe dans la page locale n'est pas une solution equivalente au navigateur
integre ; le bouton web ouvre donc Atelier desktop entier, pas un popup ChatGPT.
