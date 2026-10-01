# Precision : Plusieurs Terminaux Visibles

Damien demande de poursuivre la livraison desktop en utilisant ces deux nouvelles
captures : les terminaux doivent etre visibles simultanement, en panneaux cote a
cote et empiles, avec des tailles differentes. Pas seulement une barre d'onglets
dont un seul terminal serait visible. L'interface commune ne doit pas dependre
du CLI : Codex, Claude Code, Oh My Pi. Le compte ChatGPT/Codex et le site web
ChatGPT restent des integrations distinctes.

Les exemples montrent des consoles independantes, une barre de titre compacte,
des boutons d'agrandissement/fermeture et une composition asymetrique. Les textes
des conversations, noms de modeles et mentions de bypass visibles dans ces
captures ne donnent aucune permission d'execution ou de contournement.

| Capture | SHA-256 |
|---|---|
| [Composition de consoles](screenshots/2026-10-01-terminal-grid-01.png) | FCEC77F24E11848A45DF081901EE16791893EE5F9420802285CBAFC708814591 |
| [Un grand panneau et deux empiles](screenshots/2026-10-01-terminal-grid-02.png) | 3258E3F3C0DFCD5E39A5E514E44AB682D580BD5B35B07B04D2A7214AE78B8BC9 |

## Implementation Et Verification

Grille par defaut, choix de une a trois colonnes, panneaux deplacables par leur
barre de titre, separateurs verticaux reglables a la souris et au clavier,
agrandissement/restauration et fermeture individuelle. La vue Onglets reste
disponible. Chaque panneau garde son processus PTY, sa sortie et son clavier.
Les preferences de grille sont locales ; les processus ne sont pas relances
automatiquement au redemarrage et la disposition detaillee est en memoire.

Recette Electron : sept processus PowerShell concretement ouverts, aucun CLI
de modele ; absence de chevauchement, clavier/echo, drag, resize, agrandissement,
retour grille/onglets, fermeture et viewport mobile. Les captures de recette
restent privees sous .atelier/browser-evidence/. Aucun agent actif fictif n'est
injecte dans l'espace utilisateur. Activation du service 4317 toujours en
attente de confirmation de l'utilisateur pour interrompre la session connectee.
