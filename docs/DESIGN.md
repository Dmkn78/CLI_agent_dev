# Contrat visuel

Révision du 2 octobre 2026 : Damien demande une interface plus simple, arrondie,
inspirée du calme visuel de Claude. La palette devient charbon chaud, texte
ivoire et accent terracotta. Garder la marque Atelier et les états observables ;
les noms, dates et métriques des références restent illustratifs.

## Charte révisée

- Fond charbon presque noir, sidebar et surfaces gris neutre ; bordures fines.
- Terracotta pour navigation, sélection et liens ; les couleurs d'état restent distinctes.
- Typographie système, titres de vue de 24 à 28 pixels, libellés de 11 à 13 pixels. Rayons de 12 à 20 pixels ; bordures discrètes et boutons compacts.
- Duplica : choix du projet, discussion centrale persistante, un bouton principal Travailler pour moi. Actions secondaires dans le menu ⋯ ; missions et preuves dans Suivi. Le formulaire Telegram guide la création et l'association du bot privé.
- Consommation proche de chaque session : tokens entrée/réponse/cache et total, abonnement communiqué, quota clairement attribué au compte partagé. Aucune addition du cache au total, aucun quota fictif par session.
- Premier écran de travail : graphe projet/orchestrateur/agents/sorties, détails sélectionnés, activité et tâches réelles. Aucune composition marketing ni statistique fictive.
- Graphe sur fond ponctué discret : liens directionnels, états nommés, sélection donnant accès au modèle, aux permissions et aux preuves. Les nœuds prévus sont distincts des sessions lancées.
- Création : fournisseur/catalogue réel et configuration séparée du planificateur, des spécialistes, du vérificateur et de la synthèse.
- Consommation : tableaux par fournisseur, consommateur, tâche et requête. Inconnue affichée par un tiret ; zéro seulement lorsqu'une mesure contient zéro.
- Connexions : compte, clé API et moteur local distincts. Installation, catalogue et capacité restent séparés ; secrets exclus des logs et de Git.
- Terminal : choix Codex/OMP, dossier, modèles/effort/restrictions et commande consultables ; variantes OMP plan/slow/smol. Une ouverture ne prouve aucune activité ou consommation.
- Équipe composable : boutons Ajouter/retirer, nom/rôle/consignes par sous-agent, review/synthèse facultatives ; aucune rangée de cases spécialistes fixes. Reconfigurer prépare un nouveau lancement.
- Chat : conversations, message central et panneau contexte latéral ; empilés sur mobile. Noyau, skills/fichiers choisis, instructions transmises, tokens observés et fenêtre uniquement si rapportée. Estimation du brouillon clairement distincte des tokens reçus.
- Travail : activation visible de la file TODO au lancement, affectation explicite facultative. Les captures vides restent vides tant qu'aucune donnée réelle n'existe. Codex est présent dans le filtre de consommation même sans requête.

## Analyse des références

Le [retour workbench](references/2026-10-01-workbench-feedback.md) affine cette charte : champs lisibles, panneaux de session à rayon 8 px, canvas sombre éditable, inspecteur discret et navigation repliable. ChatGPT.com est une vraie surface navigateur avec ressources autour, distincte de la conversation CLI. Le mode Agent reste indéfini, donc pas de troisième mode factice. Notifications cliquables, quotas et durées natifs doivent rester proches du travail concerné. La fermeture masque un panneau sans annuler le travail ; interruption et clôture de session restent des actions séparées.

Nexus propose une topologie centrée sur l'orchestrateur et un inspecteur à droite. Analytics privilégie la comparaison dense par fournisseur/modèle/tâche. Les trois images Workspace, identiques octet pour octet, présentent les flux entre ressources, agents et sorties. Combiner ces hiérarchies avec les événements et artefacts locaux sans reproduire les chiffres fictifs.

## Repères

- Sidebar fixe : projet, navigation, projets secondaires, connexions.
- Barre supérieure : fil d’Ariane, recherche globale `⌘K`, journal.
- Vue d’ensemble : compteurs réels, graphe, sessions, activité et tâches.
- Panneaux de session : nom, modèle, état, permissions, consommation, conversation et actions de clôture.
- Mémoire : budget en haut, recherche et filtres à gauche, souvenir et provenance à droite.
- Explorateur : dossiers à gauche, source numérotée ou image à droite, périmètre et lecture seule explicites.
- États vides explicatifs ; aucun faux taux de réussite, token ou agent actif.

## Accessibilité et adaptation

Le frontend utilise des boutons natifs, labels de formulaire, dialogues, `aria-label` pour les icônes et une zone `aria-live` pour les notifications. La sidebar garde des noms accessibles quand les libellés sont masqués. Focus visible, `prefers-reduced-motion`, taille responsive et colonnes empilées sur écran étroit.

Breakpoints : 1500, 1180, 900, 680 et 420 pixels. Vérifier aussi le panneau étroit de Codex (environ 300 pixels). Aucun défilement horizontal de la page ; les grands tableaux, arbres de workflow et sources peuvent défiler dans leur propre zone.

Variables principales dans `web/style.css` : `--bg`, `--sidebar`, `--panel`, `--border`, `--text`, `--muted`, `--accent`, `--amber`, `--purple`. Les icônes SVG sont locales. Les sources et sorties sont échappées avant insertion dans le DOM.

Les formulaires de benchmark affichent clairement les effets du lancement : génération, candidats et reviews consomment du quota. Les métriques différencient verdict exact, avis du modèle et validation humaine.
