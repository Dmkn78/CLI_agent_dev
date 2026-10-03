# Connexion du chat intégré

Date : 1 octobre 2026. Branche : branch_dev_PC.

## Demande et choix confirmé

L'utilisateur signale l'écran de connexion ChatGPT malgré sa connexion à Codex et à Firefox. Il choisit explicitement le chat intégré avec une connexion initiale. Le profil Firefox n'est pas importé ; le parcours reste dans Atelier.

Capture utilisateur archivée : `docs/references/screenshots/2026-10-01-chat-login.png`, SHA-256 `8ead741d553ccb3fc24d6c03e06d5bb454ab10f396824bbedc11ae13fc846a7e`.

## Diagnostic et correction

Electron utilise déjà `.atelier/desktop-profile/` et `persist:atelier-chatgpt`. Ce profil est distinct de Firefox. L'authentification Codex ne remplit pas les cookies de cette WebContentsView. La documentation officielle distingue le cache de connexion Codex et la session ChatGPT web conservée par le navigateur : https://learn.chatgpt.com/docs/auth.

La vue ChatGPT affiche maintenant l'état Codex réellement observé, puis explique la première connexion web et sa conservation dans Atelier. L'état vide guide vers le chat intégré ; le bouton Nouveau chat précise son profil séparé. Aucun état « ChatGPT connecté » n'est inventé. Les comptes et fichiers restent privés dans les stockages natifs.

L'écran réel « Connectez-vous ou inscrivez-vous » a été ouvert dans la fenêtre Atelier. L'utilisateur termine sa connexion lui-même. Aucun credential n'a été saisi ni aucune authentification soumise par l'agent. La fenêtre actuelle n'a pas été rechargée, pour conserver le formulaire ; les libellés sont disponibles au prochain chargement de l'interface. Le serveur n'a pas nécessité de redémarrage.

## Vérification et limites

61 tests backend réussis. Syntaxe JS contrôlée. Recette desktop fictive : texte de connexion affiché, session de la WebContentsView identique à `session.fromPartition('persist:atelier-chatgpt')`, isolation conservée et grille PTY toujours fonctionnelle. Contrôle visuel de la vue ChatGPT sur le serveur de recette. Aucune inférence, login automatisé ou copie de credentials/cookies.

La partition persistante est vérifiée ; une connexion authentifiée survivant à un redémarrage ne peut être affirmée avant la connexion humaine. Aucun succès de login, de dépôt de fichier ou d'accès à un modèle supplémentaire n'est prétendu. Des expirations/déconnexions imposées par le site peuvent toujours demander une nouvelle authentification.
