# Contrat visuel

Les captures constituent une référence de fonctionnalités et de hiérarchie. Atelier adopte une identité propre : fond charbon, surfaces discrètes, accent sauge, petites touches ambre/violet pour la revue et la mémoire. Aucune ressource distante, police externe ou image générée nécessaire.

## Repères

- Sidebar fixe : projet, navigation, projets secondaires, connexions.
- Barre supérieure : fil d’Ariane, recherche globale `⌘K`, journal.
- Vue d’ensemble : invitation claire, compteurs réels, sessions, choix solo/duo/équipe, connexion et mémoire.
- Panneaux de session : nom, modèle, état, permissions, consommation, conversation et actions de clôture.
- Mémoire : budget en haut, recherche et filtres à gauche, souvenir et provenance à droite.
- Explorateur : dossiers à gauche, source numérotée ou image à droite, périmètre et lecture seule explicites.
- États vides explicatifs ; aucun faux taux de réussite, token ou agent actif.

## Accessibilité et adaptation

Le frontend utilise des boutons natifs, labels de formulaire, dialogues, `aria-label` pour les icônes et une zone `aria-live` pour les notifications. La sidebar garde des noms accessibles quand les libellés sont masqués. Focus visible, `prefers-reduced-motion`, taille responsive et colonnes empilées sur écran étroit.

Breakpoints : 1500, 1180, 900, 680 et 420 pixels. Vérifier aussi le panneau étroit de Codex (environ 300 pixels). Aucun défilement horizontal de la page ; les grands tableaux, arbres de workflow et sources peuvent défiler dans leur propre zone.

Variables principales dans `web/style.css` : `--bg`, `--sidebar`, `--panel`, `--border`, `--text`, `--muted`, `--accent`, `--amber`, `--purple`. Les icônes SVG sont locales. Les sources et sorties sont échappées avant insertion dans le DOM.

Les formulaires de benchmark affichent clairement les effets du lancement : génération, candidats et reviews consomment du quota. Les métriques différencient verdict exact, avis du modèle et validation humaine.
