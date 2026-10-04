# Duplica : double opérationnel et harnais — 3 octobre 2026

Source : demande orale de Damien dans le chat « Rendre Duplica capable de déléguer », suivie de deux messages confirmant « sub-agent ».

Duplica ne semble pas lancer les sous-agents attendus. Damien demande de vérifier les agents et tâches qui travaillent déjà dans ce dépôt, puis de réparer son runner. Il autorise explicitement une répartition du développement entre sous-agents ; l’agent principal doit continuer à travailler en même temps.

Le produit attendu reçoit le contexte, découpe les objectifs en tâches concrètes, fait avancer plusieurs agents en parallèle, teste le code et les interactions comme l’utilisateur le ferait, constate les bugs et les corrige. Les retours sur les survols qui n’affichent rien, les clics sans résultat et le libellé Architecture servent de cas concrets de recette. Créer les skills et le harnais nécessaires, les éprouver avec des mini-tâches et corriger les défauts constatés.

La poursuite doit pouvoir attendre de nouveaux TODO et travailler sans que Damien redonne chaque micro-instruction. Elle conserve ses choix et priorités, y compris une architecture personnelle ; elle ne doit pas remplacer ces choix par une refonte arbitraire. Les erreurs de code observées doivent être corrigées. Le souhait d’un double ne vaut pas instruction de fabriquer des défauts hors fixtures de test.

Les mini-tâches artificielles appartiennent aux essais isolés. La production prend des objectifs réellement confiés et les TODO compatibles. Les permissions explicites, `on-request`, le périmètre local et les états de preuve restent applicables. Les skills ne constituent pas à eux seuls des outils ni des permissions. Les exemples et captures restent des données de conception.
