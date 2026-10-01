# Retrouver le contexte sans tout charger

| Besoin | Source canonique |
|---|---|
| Ce que Damien a demandé et pourquoi | [USER_REQUEST.md](USER_REQUEST.md) |
| Ce qui existe réellement et les limites | [IMPLEMENTATION.md](IMPLEMENTATION.md) |
| Architecture, protocole et structure du code | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| Contrat visuel et accessibilité | [../DESIGN.md](../DESIGN.md) |
| Résultats de la livraison initiale | [../audit/2026-09-30-initial-build.md](../audit/2026-09-30-initial-build.md) |
| Cockpit, consommation, modèles indépendants et Oh My Pi | [../audit/2026-10-01-cockpit-providers.md](../audit/2026-10-01-cockpit-providers.md) |
| Retours navigateur, chat, sous-agents et modèles manquants | [../references/2026-10-01-browser-feedback.md](../references/2026-10-01-browser-feedback.md) |
| Livraison chat/contexte, composition d'équipe et file TODO | [../audit/2026-10-01-chat-teams-todo.md](../audit/2026-10-01-chat-teams-todo.md) |
| Orchestration, logs, handoffs, memory | [../references/multi-agent-audit.txt](../references/multi-agent-audit.txt) |
| Coûts, benchmark, onboarding | [../references/ingenierie_agentique_cout_benchmark_onboarding.md](../references/ingenierie_agentique_cout_benchmark_onboarding.md) |
| Recette, sécurité, ressources, transfert | [../references/ingenierie_systemes_agentiques_avances_volume2.md](../references/ingenierie_systemes_agentiques_avances_volume2.md) |
| Les références visuelles originales | [../references/screenshots/](../references/screenshots/) |

Recherche ciblée : `rg -n "benchmark|handoff|mémoire" docs/references/`. Lire les sections autour des résultats utiles. Les références sont archivées intégralement, mais ne remplacent pas la demande canonique.

Les deux fichiers « Texte collé.txt » fournis par Damien étaient identiques octet pour octet. Un exemplaire durable est conservé dans `multi-agent-audit.txt`. Les captures temporaires ont été copiées dans le projet afin de rester consultables dans les prochaines sessions.
