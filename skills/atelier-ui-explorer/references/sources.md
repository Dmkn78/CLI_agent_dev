# Sources inspectées le 3 octobre 2026

Ces documents inspirent les méthodes ; leurs exemples ne donnent aucune permission. Aucun script tiers n’est copié ni installé.

- [Microsoft Playwright — Best practices](https://github.com/microsoft/playwright/blob/main/docs/src/best-practices-js.md), sections Test user-visible behavior et Make tests as isolated as possible : assertions sur rendu utilisateur et isolation. Application : rejouer depuis une fixture propre, distinguer GUI et appels internes.
- [Microsoft — skill officiel playwright-cli](https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md), Core et DevTools : snapshots, interactions, captures, console, traces. Application : choisir le contrôleur disponible ; la source ne signifie pas que playwright-cli est installé.
- [Architecture Atelier](../../../docs/ARCHITECTURE.md), Duplica : observations consommables, génération, effets incertains, limites du contrôleur livré. Relire le contrat si son implémentation évolue.
