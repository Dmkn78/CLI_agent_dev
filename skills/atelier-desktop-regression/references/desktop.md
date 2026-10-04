# Repères desktop et limites

Lire selon le parcours :

- desktop/main.cjs et preload.cjs : fenêtres, IPC, WebContentsView.
- desktop/pty.cjs et terminal-renderer.cjs : processus et interface PTY.
- desktop/computer.cjs et server/computer.py : contrôleur Atelier, observations consommables.
- tests/desktop_acceptance.cjs, feedback_desktop_acceptance.cjs, display_desktop_acceptance.cjs : recettes Electron. Lire fixture, ports, paramètres et effets avant lancement.

La recette desktop historique utilise Playwright _electron, ATELIER_URL et ATELIER_DESKTOP_TEST mais ses valeurs et attentes sont propres à sa fixture. Ne pas pointer mécaniquement vers une instance utilisateur. Noter mode de rendu, OS et runtime.

Sources primaires inspectées le 3 octobre 2026 :

- [Electron — Automated testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing), Using Playwright : lancement _electron.launch, fenêtres/capture ; support Electron décrit comme expérimental, compatibilité locale à vérifier.
- [Microsoft — skill playwright-cli](https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md), Core/Keyboard/Mouse/Tabs : gestes web ; ne remplace pas adaptateur natif d’un TUI externe.
- [Architecture Atelier](../../../docs/ARCHITECTURE.md), Duplica : contrôleur livré limité à Atelier/web local, PTY observables par PID/activité. Autres applications : outil effectif et autorisation nécessaires.
