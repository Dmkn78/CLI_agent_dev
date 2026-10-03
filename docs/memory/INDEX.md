# Retrouver le contexte sans tout charger

| Besoin | Source canonique |
|---|---|
| Une seule application Atelier : identité, lanceurs et instance partagée | [correction et preuves du 3 octobre](../audit/2026-10-03-single-app.md) |
| Vocaux, LLM local/LM Studio, YAML Obsidian et recherche My Brain | [mise en route et contrat](../MY_BRAIN.md), [rapport et limites](../audit/2026-10-03-my-brain.md) |
| Architecture, Duplica, souvenirs JSON/YAML, compteurs et tarifs — 3 octobre | [corrections, preuves et limites](../audit/2026-10-03-architecture-memory-usage.md), [demande et huit captures](../references/2026-10-03-architecture-memory-feedback.md) |
| En-tête terminal minimal et bouton Images visible | [correction et recette du 3 octobre](../audit/2026-10-03-compact-terminal-header.md) |
| Zoom, images Codex, noms des chats/navigation, canaux et skills de test — 3 octobre | [corrections et limites](../audit/2026-10-03-feedback-fixes.md), [demande/captures](../references/2026-10-03-feedback.md), [skills de test](../audit/2026-10-03-testing-skills.md) |
| Retrouver et ouvrir Atelier sous Windows | [raccourcis, lanceur et recette réelle](../audit/2026-10-02-atelier-windows-launcher.md) |
| Poursuite du travail des canaux par Duplica | [mission et passage de travail](../audit/2026-10-02-duplica-channels-handoff.md), [consolidation et tests validés](../audit/2026-10-02-duplica-channels-consolidation.md) |
| Canaux d’agents, consultants LAYA/CLEF et API locales | [../audit/2026-10-02-agent-channels.md](../audit/2026-10-02-agent-channels.md), [demande et sources](../references/2026-10-02-agent-channels.md) |
| Duplica discussion, Telegram, compteurs natifs, sprints et reconnexion | [../audit/2026-10-02-duplica-ux.md](../audit/2026-10-02-duplica-ux.md) |
| Duplica : demande, intégration, preuves et limites | [../audit/2026-10-02-duplica.md](../audit/2026-10-02-duplica.md), [mission](../references/2026-10-02-duplica-mission.md), [plateforme](../references/2026-10-02-duplica-platform.md) |
| Ce que Damien a demandé et pourquoi | [USER_REQUEST.md](USER_REQUEST.md) |
| Ce qui existe réellement et les limites | [IMPLEMENTATION.md](IMPLEMENTATION.md) |
| Architecture, protocole et structure du code | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| Contrat visuel et accessibilité | [../DESIGN.md](../DESIGN.md) |
| Résultats de la livraison initiale | [../audit/2026-09-30-initial-build.md](../audit/2026-09-30-initial-build.md) |
| Cockpit, consommation, modèles indépendants et Oh My Pi | [../audit/2026-10-01-cockpit-providers.md](../audit/2026-10-01-cockpit-providers.md) |
| Retours navigateur, chat, sous-agents et modèles manquants | [../references/2026-10-01-browser-feedback.md](../references/2026-10-01-browser-feedback.md) |
| Livraison chat/contexte, composition d'équipe et file TODO | [../audit/2026-10-01-chat-teams-todo.md](../audit/2026-10-01-chat-teams-todo.md) |
| Vrai ChatGPT, canvas, notifications, rapports compacts et diagnostic TLS | [../audit/2026-10-01-workbench.md](../audit/2026-10-01-workbench.md) |
| Les quatorze nouveaux retours et leurs onze captures | [../references/2026-10-01-workbench-feedback.md](../references/2026-10-01-workbench-feedback.md) |
| Terminal natif, chat dans Atelier, navigation et sept retours desktop | [../references/2026-10-01-desktop-feedback.md](../references/2026-10-01-desktop-feedback.md) |
| Livraison PTY, navigation et connexions distinctes | [../audit/2026-10-01-desktop-terminals.md](../audit/2026-10-01-desktop-terminals.md) |
| Precision : grille de vrais terminaux et deux captures | [../references/2026-10-01-terminal-grid-feedback.md](../references/2026-10-01-terminal-grid-feedback.md) |
| Connexion initiale ChatGPT intégrée et choix utilisateur | [../audit/2026-10-01-chat-login.md](../audit/2026-10-01-chat-login.md) |
| Correction Agents : vrais CLI et activation locale | [../audit/2026-10-01-native-cli-correction.md](../audit/2026-10-01-native-cli-correction.md) |
| Orchestration, logs, handoffs, memory | [../references/multi-agent-audit.txt](../references/multi-agent-audit.txt) |
| Coûts, benchmark, onboarding | [../references/ingenierie_agentique_cout_benchmark_onboarding.md](../references/ingenierie_agentique_cout_benchmark_onboarding.md) |
| Recette, sécurité, ressources, transfert | [../references/ingenierie_systemes_agentiques_avances_volume2.md](../references/ingenierie_systemes_agentiques_avances_volume2.md) |
| Les références visuelles originales | [../references/screenshots/](../references/screenshots/) |

Recherche ciblée : `rg -n "benchmark|handoff|mémoire" docs/references/`. Lire les sections autour des résultats utiles. Les références sont archivées intégralement, mais ne remplacent pas la demande canonique.

Les deux fichiers « Texte collé.txt » fournis par Damien étaient identiques octet pour octet. Un exemplaire durable est conservé dans `multi-agent-audit.txt`. Les captures temporaires ont été copiées dans le projet afin de rester consultables dans les prochaines sessions.
