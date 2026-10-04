# Jour 3 - Vibe coding sur NovaFactory avec GPT6 Astra, Claude et Grok

**URL :** https://www.youtube.com/watch?v=S5gsjrHBPL4

(0:00) Bonsoir à tous. On reprend là où on s'était arrêté hier. [soupir][souffle coupé]
(0:06) Donc on peut voir qu'ils ont tous bien travailler et que le bah c'est terminé quoi. Je me
(0:12) suis permis quand même de lancer la release parce qu'elle a pris quand même pas mal de temps et je m'en doutais un
(0:19) petit peu vu le nombre de modifications qu'il y avait. Et donc on va mettre à jour
(0:25) l'application et on va pouvoir faire la recette de tout ce qu'on a ajouté.
(0:40) Donc normalement c'est pas très très long.
(0:47) Hop et on a l'application qui revient.
(0:53) [grognement] Voilà. Donc on va pouvoir regarder un par un euh une
(1:01) par une pardon les modifications qu'on avait prévu et les valider ou non en
(1:06) fonction de si c'est parfaitement conforme à ce qu'on voulait. [grognement] Donc on avait les comptes affichés aucun
(1:15) quand l'hydratation échoue. OK.
(1:20) On va se remettre sur les pagnes ici plutôt et on ira chercher les cartes au moment
(1:27) où on voudra les valider. Donc le bug affichage sur le bloc entretien. Hop, c'était ici.
(1:35) Et effectivement, on voit que c'est corrigé. On a plus le bloc qui nous gêne ici
(1:41) et on a plus non plus le bouton puisque c'est devenu obsolè. Ça c'est parfait.
(1:47) Donc on va le valider. retirer le point attrition. Bon, on voit
(1:52) qu'il avait tout fait, il avait fait son job. D'ailleurs, ça c'est la nouvelle Ouais,
(1:58) c'est l'une des des autres fitures qu'on avait à relier. [raclement de gorge] Ici, on voit que ben pour le coup, on n
(2:04) pas les fichiers. Donc c'est parfait.
(2:10) Celui-là, on le valide. [grognement] Qu'est-ce qu'on avait ?
(2:19) Donc ça c'était le truc de codex justement. Et là on voit que lui par contre il a bien mis les documents
(2:28) et on le voit ici. Parfait. Donc ça c'est cool.
(2:36) Je les cliquerai tous en même temps, ce sera plus simple.
(2:42) Donc retirer l'entretien, c'est bon. Fiabiliser les cartes, c'est bon.
(2:51) Nouvel agent police des dialogues. Oui, c'était ici. Là, on avait une police affreuse. C'était gigantesque.
(2:58) [grognement] Là, effectivement, on est revenu à quelque chose de plus acceptable.
(3:03) Mais ceci dit, on a un nouveau bug qui apparaît puisque on a plus la liste des comptes.
(3:10) Enfin, on a plus la liste pardon des modèles. Ah oui, d'accord. Il faut choisir le compte
(3:15) pour pouvoir voir le OK. Donc là, on a on a un petit bug à corriger. Justement,
(3:23) on peut pas choisir le modèle avant d'avoir choisi le compte, ce qui est un peu ridicule puisque la seule condition
(3:29) à choisir le modèle, c'est bah c'est le fournisseur, quoi.
(3:35) Et du coup, au lieu de mettre par défaut ici, je pense qu'il faudrait mieux directement choisir le premier compte
(3:41) disponible. [grognement] Donc bah c'est parti hein,
(3:46) on va prendre un premier screen tant qu'à faire et on va lui expliquer ce qui
(3:51) va pas quoi. Ça du coup
(3:57) et du coup on le répercute de partout. C'est un peu pareil partout. Si on a un compte, autant choisir
(4:03) directement le compte. Pourquoi on irait
(4:09) on irait faire quelque chose de différent ? Donc on se le garde, on a pris la photo, on sait de quoi on va parler. Ça pour le
(4:16) coup le contrat est rempli puis c'était pas du tout ça qu'on demandait au modèle. Donc les comptes, c'est bon.
(4:24) Et on a vu que du coup ça hydrate bien la taille des polices. C'est bon. Donc ça c'est good. Ici on va relancer
(4:33) justement un codex pour qu'il nous termine un peu ben tout ça là. On va le
(4:38) faire tout de suite. Ce sera fait.
(4:43) On va prendre Codex. Du coup, ça nous a descendu le fait qu'il mettent document ici. Là, on voit que j'avais pas
(4:48) anticipé. Ça nous a descendu destinataire ici et priorité, ce qui est absolument infamme en fait. Donc on va
(4:56) lui faire changer ça parce que du coup le bloc document
(5:01) peut-être qu'on préférerait l'avoir ben en dessous quoi.
(5:08) Du coup ça pareil on va faire la capture tout de suite.
(5:15) Autant quand on découvre un truc autant tout de suite le prendre. Ça ça va venir ici en bas ce
(5:24) bloc document là. Aucun Ouais, on va choper tout le truc.
(5:30) Type de travail en dessous là. Bloc document
(5:36) en dessous là. Bon, on va faire un truc approximatif comme ça, mais on va lui expliquer
(5:43) et comme ça, on pourra avancer sur ce sujet là aussi. [grognement]
(5:49) ici en fonction si c'est choisi ou pas. Ouais. OK. Et ça, on va l'envoyer à
(5:54) Codex. On va l'envoyer à Codex.
(6:01) Il va reprendre le le chantier.
(6:07) Agrandissez la position. Oui, du coup, je vais supprimer une panne. C'est vrai que j'ai réduit la quantité de panne
(6:13) qu'on peut mettre, mais du coup, on se retrouve un petit peu embêté. [grognement] Donc bloc d'affichage d'entretien, on l'a recette, on a fait la recette, c'est
(6:20) bon, on l'a validé. Ah ça c'était un nouveau truc aussi. Alors là, voilà,
(6:26) c'est ce que je disais justement hier. [soupir] En gros, il a dû trouver plusieurs
(6:32) configurations de comptes que j'ai dû tester ou qu'il a dû tester qu'il a dû ajouter en faisant les tests justement
(6:39) d'ajout des comptes. Et on se retrouve du coup avec tout un tas
(6:44) de cards qui ont aucun aucun intérêt.
(6:49) Et bah là, vous voyez réellement en gros la la vie d'un développeur. On avait
(6:55) anticipé certaines choses, mais on peut rarement tout anticiper. Euh où il
(7:01) aurait fallu que j'aille regarder dans la base de données les comptes que j'avais potentiellement enregistré et
(7:08) détecter que voilà, ça c'est juste je pense un nettoyage à faire. Donc on va lancer on va lancer un autre agent
(7:14) là-dessus. Mais on voit que par contre la fiture,
(7:21) on voit par contre que la fiture elle fonctionne même si là je suis dubitatif,
(7:28) j'ai pas de comptes Grock. Je vois pas comment il a pu aller
(7:33) chercher les informations sur deux comptes Grock où il y en a une qui l'a relevé à une
(7:40) certaine heure et une autre à une autre. C'est ce que il semble être ça
(7:46) parce que on voit dernier relevé 21h46. Mais est-ce que c'est Ouais non relevé.
(7:52) Donc lui-même il a détecté que qu'il y avait un problème et pourtant
(8:00) pourtant c'est celui-là qui a la bonne information. Donc là, ça fait peut-être écho à ce
(8:06) qu'il nous disait hier Claude [grognement] euh par rapport au fait que ben quand on relance une nouvelle panne,
(8:13) ça rafraîchit l'authentification et du coup ben on aurait peut-être dû l'écouter à ce moment-là. [grognement]
(8:21) Peut-être qu'on j'ai minimisé éventuellement ce que ce que le modèle nous rappelait. Quoi
(8:27) qu'il arrive là, on a une partie de ce qu'on veut mais on a clairement pas tout ce qu'on veut.
(8:32) Donc c'est reparti. On fait une grosse capture.
(8:38) Voilà. Et là on va lui montrer
(8:44) pourquoi on a autant de comptes comme ça.
(8:50) Pareil pour Codex et je pense que ça résoudra le problème de Grock mais on va quand même lui en
(8:58) parler. [grognement] Donc et en plus cette session là c'était la
(9:06) plus longue qu'on avait eu. Voilà, c'était celle des forfaits provider. Et là, je voulais justement montrer quelque
(9:11) chose parce qu'il a orchestré en utilisant euh
(9:18) en utilisant Grock pour l'implémentation en fait sur la session [grognement] et du coup
(9:24) il a travaillé en temps API [raclement de gorge] 1h26 seulement le modèle.
(9:31) Et là, on peut voir qu'est-ce qu'il a utilisé, hein, en gros comme modèle quoi. C'est lui qui a coûté le plus
(9:38) cher. Sonné à la review, il a quasi rien coûté. Pourtant, il a été lancé à de nombreuses reprises. On [grognement]
(9:44) voit qu'en terme de jeton, Soné a beaucoup plus utilisé de jeton
(9:50) via la cache puisque forcément il a il a lu beaucoup plus de fichiers. Par contre, on voit que euh Opus qui était
(9:57) l'orchestrateur, lui, il a un peu plus de d'écriture en cash et le modèle coûtant
(10:04) plus cher, forcément, on a un on a un résultat de coût bien plus conséquent, même si là, c'est à titre indicatif, vu
(10:10) que ça tire sur le forfait et que du coup, on dépense pas réellement de d'argent à chaque
(10:17) transaction, quoi, à chaque prompte, pardon. [raclement de gorge] Et donc par contre le forfait Grock, il
(10:24) a pris 20 % quoi pour réaliser la totalité de la tâche.
(10:32) Voilà pour ça. Maintenant on peut la fermer parce qu'on va pas réutiliser ces modèles là pour
(10:39) pour corriger le dif lisible dans le chat. Ça c'était
(10:45) justement on va sélectionner le projet.
(10:51) Voilà, on va regarder. Tiens, lui ici. Est-ce que on a ce qu'on veut ?
(10:58) A priori, oui. A priori, oui. On est pas mal du tout.
(11:08) Ouais, c'est parfait. Ah, ça laisse même les lignes sur la gauche. Bon, ce qui était pas forcément
(11:14) nécessaire. Ceci dit,
(11:20) pourquoi pas ? On avait pas précisé et pour le coup, ça
(11:26) c'est pas c'est pas plus mal. Je pense que c'est même pas mal. [grognement] ici.
(11:32) Ça c'est la conversation qui est en cours. Donc je vois qu'elle s'affiche ici mais que du coup on peut pas y cliquer dedans.
(11:39) Ça c'est justement ce que j'ai fait tout à l'heure. C'est la release que j'ai faite pour qu'on puisse resetter en gros
(11:46) les feitures qu'on a codé hier. On va passer un tout petit peu de temps, encore un peu là-dessus et ensuite on va
(11:53) passer au ben au correctif parce que je pensais pas qu'il y en aura autant. Je dois bien l'avouer.
(12:00) Mais là pour le coup, c'est moi qui n'ai pas euh lancé la Tory dev. J'aurais éventuellement pu détecter certains
(12:06) problème. Pas tous parce que par exemple ici les comptes, je suis pas certain que
(12:11) sur la base de dev, on ait autant de de comptes créés. [grognement] Donc euh bon, il y a certaines choses,
(12:18) on est forcément on est tributaire de la donnée, quoi.
(12:30) Et là, c'est quoi celle-là ? Ah oui, c'est l'une qu'on a donné à Grockier à traiter justement.
(12:37) Donc, il a mené à bien. Bon, je pense qu'on est bon pour tout ça. Le dif, il
(12:43) est bon. Grock, c'était euh Ah oui, c'était le le
(12:49) la sélection d'agent ici. Donc on voit que c'est le contrat est bien respecté.
(12:55) On a bien notre [grognement] on a bien notre select qui flotte maintenant au lieu d'apparaître
(13:04) dans le flux. Donc c'est pas mal. OK,
(13:11) la recette est terminée. Dialogue réglage. Oui, c'est vrai, il y
(13:17) avait ça aussi. Et là, c'est pareil, le contrat a été respecté. On a modifié
(13:22) uniquement cette partie-là. Le reste est resté identique. On est bon.
(13:29) Je des mises à jour ici. Donc ça, on peut euh rayer également.
(13:36) Ensuite, on va dans les sprints. Ici, on voit que Codex s'est mis au travail sur celle-ci,
(13:43) la couverture rust. Mais je Ah oui, périmètre. OK.
(13:50) Et ici du coup, [soupir][souffle coupé] ça c'est bon,
(13:55) on vient de le voir. Voilà. Là, il y a un autre comportement qui est désagréable. Quand je coche une case ici, le la carte, elle part un peu
(14:02) n'importe où. Il y a pas vraiment de Il y a pas vraiment d'ordre quoi. Faudrait éventuellement avoir un système de
(14:08) filtre pour pouvoir dire bah tiens, je veux contrôler uniquement celles qui sont terminé. Par exemple,
(14:14) nouvel agent, menu flottant, c'est bon. Euh les providers, c'est bon.
(14:25) C'est bon, c'est bon. Et c'est bon. [grognement] Donc là, on a
(14:32) tout. contrôler, évaluer. On a récupéré ce qu'on avait besoin de récupérer au
(14:38) passage, c'est-à-dire bah les informations qui ont manqué au moment implémentation hier.
(14:44) Et on va se relancer du coup, on va se relancer des agents là-dessus.
(14:49) Donc on va utiliser un petit peu Codex
(14:56) et on va commencer à lui balancer nos retours.
(15:04) On va l'utiliser d'abord pour cette partie- làà qui est hop,
(15:11) je resserre un peu ça pour vous le montrer. On va lui parler d'abord de cette partie- làà parce que j'ai je en
(15:17) fait j'avais prévu de l'utiliser ce soir et bah du coup on a des trucs à corriger d'abord.
(15:22) [grognement] Donc on va y aller, on va lui dire, tu vois sur cette image
(15:28) quand on sélectionne le mode de travail duo avec review ou orchestration,
(15:35) au moment où on sélectionne le provider, il faut qu'on ait sélectionné un compte
(15:43) afin de pouvoir choisir le modèle. Ça déjà c'est pas conforme à ce qu'on
(15:50) souhaitait.
(15:56) À partir du moment où on a sélectionné un provider, en théorie, on peut sélectionner directement le modèle en
(16:03) question. Ensuite, pour le compte, justement, tu
(16:10) m'enlèves ce par défaut. Il y a pas de compte par défaut. S'il y a un compte de créer pour ce
(16:16) provider là, tu sélectionnes le premier compte. Sinon,
(16:23) tu laisses ce vide et le l'utilisateur choisira le compte lui-même.
(16:33) OK. Hm hm.
(16:40) Der sélectionner directement le modèle en question. Il m'a pas collé la
(16:45) deuxième partie là. Je crois que j'ai pas j'ai pas reçu ma deuxième partie.
(16:55) Donc on va reprendre ça, c'est pas très grave. Et on va le coller là. Voilà. Ensuite pour le contement
(17:02) [soupir] résumé le problème ici.
(17:09) On doit sélectionner un compte pour pouvoir sélectionner un modèle. Ça c'est totalement contreintuitif. En plus, on a mis le compte à droite alors que en
(17:17) théorie, on si c'était ça la condition, il vaut mieux le mettre au milieu. Mais
(17:22) là, pour le coup, je préfère qu'il laisse le compte à droite et que la personne choisisse le modèle.
(17:28) Je pense que c'est mieux. On va partir là-dessus. Ensuite, qu'est-ce qu'on a vu ?
(17:34) Oui, c'est vrai. Au niveau des tasques, d'ailleurs, est-ce que ça fait la même chose euh que dans sprint ici ? Non,
(17:41) ici, on l'a pas. Parfait. Au moins ça gêne pas et en même temps on n pas les documents. Donc c'est logique. Ici c'est
(17:48) l'aspect géré par l'humain quoi éventuellement.
(17:54) Donc on va se reprendre un un
(18:00) terminal et là je vais prendre directement un rock. C'est juste de la modification d'interface rapide.
(18:13) Je vois pas mon curseur, ça me perturbe hautement. Fortement, pardon.
(18:20) Tu vas me descendre les deux blocs en dessous. Les actions formulaires doivent être
(18:27) au-dessus et la partie gestion des documents
(18:35) et du type de tâche en dessous.
(18:43) Là pareil, je vous remets vite fait mais en gros il a mis un nouveau champ type de travail, c'est pour comme ça ça lui
(18:49) permet de déterminer si c'est logique qu'il manque des documents ou non. Donc l'idée pourquoi pas. On verra à l'usage
(18:55) si c'est vraiment utile ou pas. Sachant qu'il avait bien précisé que il ne mettrait pas lui-même les sur les tâches
(19:02) qui existaient déjà. Donc c'est pas grave. On va voir sur les prochaines tâches là ce qui se passe.
(19:09) Mais du coup, ça a tout décalé. En plus, je sais pas pourquoi il a été me mettre la partie sprint et priorité en bas.
(19:17) Enfin, [raclement de gorge] je Ouais, j'avoue que je comprends pas trop. On va reprendre rapidement la maquette.
(19:24) ce qu'il avait été comment c'était avant mais il me semble bien que
(19:32) que c'était pas comme ça. Je la mets. Hop,
(19:39) j'ai cet onglet là. [soupir][souffle coupé] Du coup, on est ici. Si j'ouvre,
(19:46) j'ai carrément rien. OK. Bon, ça fait longtemps qu'on avait abandonné du coup
(19:52) sur cette partie là. On va lui préciser, c'est dans les
(19:57) tâches du sprint. [grognement] Et je vais bien lui
(20:03) repréciser aussi parce que j'ai pas envie de d'avoir à le à le à lui
(20:09) préciser. Après, on va lui dire qu'en fait ben on veut d'abord le
(20:14) destinataire,
(20:19) le sprint est la priorité.
(20:24) dans l'ordre destinataire forcément la mémoire qui saute à
(20:31) destinataire sprint priorité description
(20:37) sprint priorité description
(20:44) et ensuite du coup on ajoute type de travail et document
(20:49) et ensuite type de travail et document. Voilà. Donc ça c'est notre deuxième
(20:56) petite problématique. Et la troisème euh on va également utiliser un codex
(21:05) mais d'abord on va on va mettre à jour le le Kimi. Donc là voilà, je peux dire bah
(21:11) non en fait je préfère rester sur celle-là. Je sais qu'elle est bien, j'ai pas envie donc je vais masquer. Je peux
(21:17) lancer quand même passer outre la fenêtre. En gros, je je peux mettre à jour. Si je m'ajour, c'est simple,
(21:24) ça va lancer la bonne commande. On voit ce qui se passe dans le terminal
(21:31) et comme ça on n pas à déjà être renseigné que parce
(21:37) que bon certains provider je crois que Kimy par exemple quand vous lancez la la le terminal Kimi, il va vous afficher
(21:44) directement, il vous dire "Ouais, en gros, il y a une mise à jour, tu peux faire la mise à jour mais ça a pas
(21:50) toujours été le cas." Bon là pour le coup, j'ai plus de j'ai plus de kimi, donc on va le laisser et
(21:57) après je pourrais passer éventuellement par là aussi.
(22:03) La dernière fois sur la mise à jour, voilà, il y avait eu un problème. Bah, je vois que ça ça récidive
(22:09) [grognement] et j'ai l'impression que c'est lié à quand la la elle est pas redémarrée la
(22:18) quand l'application est démarrée à travers une mise à jour. Donc, on va lui on va le donner à un agent. Ça
(22:26) je m'en doutais un petit peu. Et on va refaire travailler Codex là-dessus.
(22:32) On va refaire travailler Codex là-dessus. Il y a un problème avec la mise à jour
(22:38) de open code.
(22:43) C'est pas la première fois que ça arrive. La dernière fois, j'avais eu le même souci
(22:50) et quand j'ai relancé l'application, j'ai pu faire la mise à jour.
(22:57) Voilà, je lui donne quelques indications. Vu que j'ai cette information, autant lui donner et
(23:02) éventuellement ça l'aidera, éventuellement pas. Mais là-dessus, c'est lui qui va
(23:09) c'est lui qui va pouvoir regarder. Donc là, on a déjà des questions qui arrivent sur la capture. Par défaut est le libélé
(23:14) du modèle. Euh ben il me semble pas que c'était ça.
(23:27) Ben non,
(23:39) sur la capture. Le par défaut, c'est le select du compte.
(23:52) Voilà, je sais pas euh je sais pas pourquoi il se trompe sur ce qu'il dit. Parce que sur la capture comme on l'a vu
(23:58) tout à l'heure, on va pouvoir le regarder ici. Bah ici, c'est bien le compte par
(24:03) défaut. Ah oui, bon, il a un défaut aussi là, mais par défaut et défaut, c'est pas tout à fait pareil quand même.
(24:09) Connect, s'il te plaît, sois gentil. Bon là, on voit par contre qu'on a bien tous
(24:14) les modèles. On peut choisir Astra aussi, mais ça on testera on testera ça, je
(24:20) pense à la prochaine à la prochaine vidéo. [soupir][souffle coupé] Ici, mise à jour open code, ici choix
(24:27) des modèles dans le compte. Là, c'est ben ma la la [raclement de gorge] suite du travail que j'étais en train de
(24:33) réaliser pour éventuellement mettre disponible l'application.
(24:40) Donc c'est plutôt propreté du code euh et ajouter les les les un petit peu les
(24:50) les choses enfin les les trucs que j'ai besoin en terme d'hygiène de de de code
(24:55) pour me pour m'en sortir un petit peu quand je vais mettre le nez dedans.
(25:01) Ça c'est assez important de temps en temps d'aller quand même regarder ce qui se passe dans votre code base parce
(25:07) qu'on peut très vite avoir bah ce genre de chos par exemple. Voilà, certains agents, ils respectent parfaitement
(25:13) l'endroit où ils mettent les fichiers, bah d'autres ils s'en moquent un petit peu quoi. Donc là on a tout plein
(25:18) d'images qui sont principalement en fait des moments où il va il va regarder si ce qu'il a fait fonctionne comme il
(25:25) veut. Et euh en gros ça, il est censé le
(25:30) mettre dans un autre bloc. Mais là, on voit qu'il a mis là. Du coup, c'est assez rigolo. Ça montre
(25:37) l'application comme elle était avant. Avant tout était collé et tout.
(25:44) Depuis, j'ai fait quand même pas mal évoluer les choses. C'est rigolo de revenir un petit peu en
(25:49) arrière. Mais ça, bah du coup, il faut que je lui fasse nettoyer parce que du coup, j'ai aucun intérêt de garder tous ces tous ces artefacts là. Et si moi j'y
(25:57) vais pas, ben je pourrais pas savoir que ça y est, quoi. C'est toujours pareil. [grognement] Donc ici, qu'est-ce qu'il
(26:02) nous dit ? Il nous dit qu'il a fait le cadrage. Les constats sont consignés sur
(26:09) V206 et la carte de tête. OK.
(26:15) OK.
(26:20) D'accord. Parfait.
(26:32) OK, je valide. [grognement] Donc là, il a déjà les consignes, c'est juste qu'il a une
(26:38) consigne particulière qui lui dit "Vas-y, soumets ta spec." Mais là, elle est déjà enfin en gros, il
(26:44) sait déjà via la road map qu'on avait créé l'objectif qu'on cherche à atteindre. Et là, c'est en fait, c'est
(26:50) faire passer la suite de test sur Linux. Donc il va se se mettre un container sur
(26:57) Docker ou il doit même l'avoir, il va juste le rallumer et il va se mettre à
(27:02) à lancer ses suites de test et corriger bah ce qui doit l'être parce que vu qu'on fait évoluer le code,
(27:08) bah en gros il forcément là je suis sur Windows, ils vont faire en sorte que ça
(27:14) fonctionne sur Window mais certaines certaines fonctionnalités vont
(27:20) nécessiter qu'on ajoute des choses particulières pour Linux ou pour MacOS.
(27:25) Alors MacOS, j'ai quand même bien avancé. L'application, elle se lance sur MacOS. Sur Macos, elle est signée aussi.
(27:32) Ça c'est une partie que j'expliquerai. Mais [grognement] quand vous fabriquez ben le un site internet, vous avez juste
(27:38) besoin d'aller demander un certificat pour votre domaine, ce qui vous permet d'avoir le petit CADNA en haut à gauche
(27:44) et de dire que vous êtes un site légitime en gros. Euh en gros pour faire simple hein, je
(27:51) vais pas rentrer dans le détail et sur euh les plateformes comme Windows ou ou
(27:56) Mac, vous devez avoir une signature qui est émise pour Windows et émise soit par
(28:03) Microsoft Azure si vous passez sur le store. Sinon euh on doit bah aller voir
(28:10) un organisme pour qu'il nous donne une signature, mais c'est surtout une histoire de
(28:16) d'argent. Donc ça coûte entre 150 et 400 € si vous êtes une entreprise en
(28:22) particulier. [grognement] Donc c'est quand même pas gratuit. Et pareil pour Mac, mais Mac c'est vous
(28:30) payez 100 € et vous pouvez distribuer je crois jusqu'à 400 applications
(28:35) et par an. Donc euh voilà, c'est un budget quand même. Dès qu'on passe sur
(28:41) de l'applicatif, on commence à voir les choses un petit peu différentes. Et si vous le signez pas, ben en fait les
(28:48) utilisateurs quand ils installent l'application, ils ont euh ce qu'on appelle le Smart Screen. C'est en fait
(28:54) ça vous dit ben là on connaît pas le l'émetteur de du logiciel donc potentiellement c'est un c'est un virus.
(29:01) Et du coup, par défaut, le Microsoft Defender, il va le il va le catcher
(29:07) quoi. [grognement] Et donc il va stopper l'application, la bloquer et vous pouvez même plus vous en vous en servir.
(29:14) Donc c'est un petit peu le passage obligé. Pour que la l'application soit distribuable au niveau de Windows, il va
(29:20) falloir euh payer pour obtenir le le le le sésame qui fait que le smart screen
(29:27) de ne criera pas à chaque ouverture de la de l'appli. [grognement] Sachant que c'est pas uniquement ça, il
(29:33) y a aussi une histoire de réputation et cetera. Bref, c'est assez complexe sans
(29:38) non plus être trop complexe. C'est surtout il faut aller se renseigner, regarder comment comment on le comment
(29:46) on le met en place et à qui on fait le paiement quoi grossiement.
(29:52) Donc je crois qu'il nous restait un petit truc euh
(29:58) il nous restait un petit truc à voir et je me dis que je vais aller je vais aller voir Claude pour ça.
(30:13) Je vais aller voir Claude pour ça. Et c'est mon histoire de multicomte
(30:18) euh ce qu'on a vu tout à l'heure. J'ai j'ai en gros c'est c'est nickel parce
(30:23) que je je peux enfin suivre depuis l'application où j'en suis de tel ou tel
(30:29) forfait mais j'ai quand même un peu trop de compte par rapport à ce qui est
(30:34) réellement authentifié. Du coup, ça c'est le problème. On va lui dire tout de suite. Bah, j'ai déjà mis l'image.
(30:43) Comme tu le vois sur le screen au niveau du détail de ce qui me reste disponible sur chaque compte par provider, euh on a
(30:52) un problème. Je vois énormément de comptes alors que actuellement dans l'application, j'ai un seul compte par
(30:57) provider. Tu maudites cette question et on prépare
(31:05) un patch.
(31:10) C'est parti. Donc voilà, j'avais prévu un petit
(31:15) programme mais pour le coup ben en fait on peut pas y aller toute fa On pourrait y aller tout de suite mais la réalité
(31:22) c'est qu'il vaut mieux dès que vous finissez une feature et que vous constatez que bah il y a quelque chose qui correspond pas à ce que vous
(31:28) souhaitiez. [soupir][souffle coupé] Là pour cloud c'est vraiment pas quelque chose de complexe. Potentiellement même
(31:33) il va le faire sans que j'ai besoin de redémarrer l'application. Si c'est quelque chose dans la base de données, bah c'est lié à des tests où on a
(31:40) conservé des comptes qui existent plus ou quelque chose du type. Réordonner les
(31:46) champs ici, il y a rien de bien complexe non plus. Qu'est-ce qu'il nous dit notre
(31:51) notre ami Grock ?
(31:59) Les deux blocs sont descendus. Donc le volet d'un sprint, destinataire, sprint, priorité,
(32:05) description. C'est ce qu'on lui avait demandé, type de travail.
(32:16) Parfait. [grognement] Si la p est déjà ouverte, referme et
(32:21) réouvre la carte. Non mais gogo, tu as pas pu par contre
(32:28) le faire. sans rafraîchir l'application. Tu es gentil mais euh
(32:38) je n'ai pas relancé l'app. C'est normal la branche le comis dis-moi. Oui, tu
(32:45) pousses.
(32:52) Voilà, je lui ai mis Merge. Si tout va bien, c'est pas très grave.
(32:58) Ensuite ici le choix démodé des comptes. On lui a déjà donné une consigne, il
(33:03) nous a il nous a parlé tout à l'heure. La mise à jour open code pour l'instant il est dessus. [grognement]
(33:08) Le correctif proposé doit aligner la détection. Voilà, ça c'est l'installeur Windows.
(33:14) Bon
(33:24) donc il est en train de faire sa petite spec et tout. On va le laisser travailler
(33:30) et on va retourner sur shot ici où euh Codex avait fait le le enfin pardon euh
(33:36) Grock avait fait le travail qu'on lui a demandé. Et là je vais spawner un cloud
(33:43) et je vais lui demander de m'installer de me de me générer le build en local
(33:48) pour que je puisse tester l'application. tu peux me générer le build de cette application en local
(33:55) et que je puisse l'installer le MSI.
(34:01) Donc là, je l'ai déjà installé l'application mais c'est un ancien c'est l'ancien l'ancienne application. Je vais
(34:06) lui rajouter. Je pense qu'il faut poule depuis origine.
(34:13) La poule c'est pas vraiment ça que je voulais. [grognement] On va le laisser travailler
(34:19) là-dessus. Il y en a un qui est revenu vers nous. Donc là, c'est parti hein. On on repart
(34:25) comme d'habitude. Qu'est-ce qu'il nous dit cause ? Confirmer. [grognement] Oui, voilà. Donc on est encore avec
(34:32) l'ancienne configuration npm que on est censé avoir viré. Donc on l'a viré sur l'installe mais je vois qu'il reste une
(34:39) petite une petite dose à droite à gauche.
(34:51) OK.
(35:01) Il a été me faire une maquette pour ça. On en est là sérieux.
(35:08) On en [grognement] est là a priori.
(35:13) Alors là par contre on s'est pas compris parce que Non mais là on s'est pas compris parce que moi je veux pas que tu
(35:19) affiches un message d'erreur en fait. Je veux pas que ça propose une mise à jour
(35:24) si on a réellement pas de mise à jour.
(35:29) On va pas mettre un pensement, d'accord ? On corrige vraiment le problème.
(35:37) Si le problème est sur la détection, bah on corrige la détection. Je vois pas pourquoi on utilise encore npm. D'ailleurs,
(35:46) on l'a déjà précisé ailleurs. Si l'utilisateur n'a pas Node, il doit
(35:51) quand même pouvoir utiliser l'application. Donc tu regardes s'il existe une
(35:57) solution. Sinon, on discutera ensemble
(36:03) des alternatives possibles. Là, vous voyez typiquement euh ce sur
(36:11) quoi il faut faire très attention. il a très bien compris ce que c'était le problème. Il a pas il est pas en train
(36:19) de de comment dire, il est pas en train d'halluciner quelque chose. Euh par
(36:25) contre, il a pas réellement compris ce que moi j'entends par tu vas me corriger ce problème. Donc c'est aussi une un
(36:33) problème de comment je me suis exprimé donc le prompt que je lui ai envoyaisé au départ en gros. Et là-dessus, j'avoue que Claude, il
(36:39) fait rarement ça. Claude en général, il comprend assez explicitement et puis il va faire des liens avec d'autres chose.
(36:46) Et là, en gros, on voit très très vite, hein. Il dit, il dit "Tiens, je t'ai fait je t'ai fait une petite oui,
(36:52) pardon, je voulais pas montrer. Je je t'ai fait une petite
(36:58) une petite maquette." Mais sa maquette, c'est ça en gros. Sa maquette c'est aucune mise à jour. Noa via upgrade en
(37:06) gros. Il il t'indique que il a pas mais moi je veux pas que si ici
(37:14) ça me dit que j'ai une mise à jour à faire en gros bah c'est qu'il y a une mise à jour à
(37:20) faire sinon on devrait pas avoir ce bloc là qui nous indique qu'on a une mise à jour.
(37:26) Donc là, on a [grognement] soit un problème dans la détection, c'estàdire qu'en fait, on est déjà en 31, mais il l'a pas, il le voit pas, l'application
(37:32) le voit pas. Soit on a un problème avec l'updater qui va chercher une version
(37:38) que qui est peut-être pas encore disponible. Bref, on va voir sur quoi lui il tombe à la fin. Mais là, il a pas
(37:44) voilà, [grognement] j'ai mal cadré. Je reprends la détection. Identifier la version réellement disponible par Widget
(37:51) sans dépendre de node puis vérifier cette solution avant de modifier le code. Donc là, je pense que ça y est, il
(37:57) a il a réellement compris ce qu'on lui demandait.
(38:04) Ensuite, lui ici, il a terminé en gros et il nous
(38:10) dit où c'est qu'il a mis où c'est qu'il a mis le le le bundle. Donc on va aller installer l'application. Ça va nous
(38:16) permettre d'une voir si l'icône euh est mis à jour et deux si les dernières correctives que j'avais fait il y a
(38:21) quelques semaines sont euh bien implémenter ou ou pas.
(38:28) Et si c'est pas le cas, on enverra des des agents pour vérifier.
(38:34) Donc on est sur release, il m'a dit je crois. Non, déjà il l'a mis dans CT. Je sais
(38:41) pas pourquoi il a été me mettre ça dans CT. J'aime pas bien quand il fait ça
(38:46) l'animal. Va bill release
(38:54) bundle et MSI. OK donc comme pour tout à l'heure je lance mon
(39:01) MSI, il va installer l'application. J'ai le bandeau qui me dit "Est-ce que
(39:06) tu es sûr hein de vouloir installer cette application ?" C'est ce que je c'est ce dont je parlais tout à l'heure,
(39:11) le smart screen. Et là, on va voir si euh Nova Shot est installé ou pas.
(39:22) A priori, c'est installé et a priori, on a le bon euh le bon icône mais pas partout
(39:33) [grognement] mais pas partout. Et je je je je je on va voir si je dis
(39:41) ouais, j'ai même l'impression que l'application elle ne marche pas du tout. En fait,
(39:48) j'ai les mêmes problématiques que j'avais ben la dernière fois. Sauf que là j'ai j'ai bien l'icône euh merce je
(39:54) suis pas sur le bon écran donc vous pouvez pas voir mais en gros j'ai un icône qui dit qu'il y a pas d'icône.
(40:00) Voilà on voit Nova Shot mais l'application quand je clique dessus que je fasse clic droit ou non il se passe
(40:06) absolument rien. Là je vais essayer quand même de la kill.
(40:11) Je vais essayer de le de le kill le programme.
(40:16) On voit qu' il est lancé en double en plus.
(40:22) Voilà, on va essayer de le relancer.
(40:30) Là, on est censé avoir l'application de lancer, mais toujours pareil, il y a pas
(40:35) l'air de se passer quoi que ce soit. Si je fais alt F,
(40:44) non, il se passe absolument rien. Donc parfait. Euh je vais en parler à à
(40:51) Claud. Qu'est-ce qu'il nous dit ? Il nous dit que le build est terminé, que c'est non signé. Ça c'est OK. Installer
(40:56) par machine. Double clic. OK. Bon là, on a un problème quand je
(41:04) installé l'application, mais déjà dans la barre window, quand je fais clic droit, rien ne se passe. Quand
(41:11) j'essaie le raccourci pour prendre un screenshot, rien ne se passe non plus.
(41:18) Donc là, tu me fais un petit audit de ce qui se passe. Tu peux utiliser jusqu'à 5 sous-agents.
(41:29) Tu testes, tu utilises Playwght pour vérifier et
(41:35) une fois que tu sais d'où vient le problème et comment le corriger, tu reviens vers moi.
(41:46) Voilà. Bon, lui il avait pas fait grand-chose, il avait juste build. Mais du coup, c'est peut-être soit c'est un
(41:51) problème de son build, soit c'est un problème lié à l'application. Là, je pense plus pour l'application,
(41:58) même si ça me semble bizarre. J'ai l'impression qu'on est sur une ancienne version. J'ai
(42:04) l'impression qu'on est sur une ancienne version de l'application parce que ça, il me semblait bien qu'on l'avait euh qu'on l'avait corrigé.
(42:15) Je vois d'ailleurs encore plein de work tree. Attends
(42:20) là, je vais rajouter une information. D'ailleurs, il y a pas mal de work qui traînent pour ce projet. Est-ce
(42:27) qu'ils sont merge ? Est-ce qu'il reste des choses à pousser ?
(42:35) Sinon, tu me lanceras un sous-agent pour me nettoyer ces workant.
(42:44) Voilà, comme ça il va aussi faire un petit peu de ménage parce que là soit en gros les correctifs ils ont été fait
(42:51) mais ils sont encore en local. Ça peut arriver de temps en temps surtout quand on travaille sur beaucoup beaucoup de
(42:57) choses. Bah vous allez aller vous coucher, vous revenez le lendemain, vous travaillez sur un autre un autre projet
(43:03) et puis en fait vous vous apercevez pas un jour vous switchez là-dessus, vous voyez que c'est des vieilles fenêtres ouvertes depuis euh Mathusalem et du
(43:09) coup vous les vous les fermez. Mais potentiellement le travail a pas été euh poussé jusqu'àit.
(43:16) C'est pour ça que je lui ai dit d'abord tu vérifies. Euh voilà. Donc il y en a 6 sur se qui sont
(43:21) merge
(43:27) mais il en a un où il voit que bah il y a sep commit jamais poussé.
(43:35) Voilà. Donc on va voir si euh là-dedans il y a il y a pas peut-être le correctif en question.
(43:41) qui expliquerait que ben en fait moi je l'ai déjà vu fonctionner mais que là ça fonctionne pas. Effectivement s'il nous
(43:47) manque un patch euh ça peut pas fonctionner. [rires] Donc ici lui a priori il a terminé le
(43:53) travail ça a été poussé c'est bon on a plus le le le le
(43:59) problème avec les choix par défaut. Donc ça c'est parfait. On verra demain quand on relancera l'application.
(44:06) Ici lui il va travailler probablement toute la nuit. Et ici lui il avance.
(44:14) OK, parfait. On va revenir là. Point d'arrêt d'oracle. Donc là, ça veut dire qu'il a
(44:21) il a il a fait un petit peu ses tests. Il a regardé les problématiques et il nous propose une solution. Gros, donc
(44:28) test rouge commité. Ça veut dire qu'il a fait ça via des tests déjà. il a il a en gros dans le dans le dans le skill bug
(44:34) fix, il doit d'abord reproduire le le bug et ensuite via la reproduction, il
(44:40) il va proposer un test rouge. Donc ça veut dire c'est un test en gros qui passe pas volontairement qui dit que ben
(44:46) là la fature elle ne fonctionne pas. Voilà du moins elle fonctionne pas comme on souhaiterait. [grognement] Et comme ça, en gros, quand il va faire
(44:53) quand il va envoyer son sous-agent faire le code, son sous-agent va faire le code et le but c'est qu'il fasse passer la la
(45:00) le test rouge à vert. Donc là, il nous dit le disque
(45:06) a affiné le modèle tes quatre comptes vis vivant pardon point sur les racines
(45:12) du poste. Voilà. Ben oui, c'est sûr que le fait de proposer ici en gros quand on
(45:19) ajoute un compte, on va le faire via là, mais [grognement] quand on ajoute un compte, on propose de récupérer euh par
(45:27) exemple la première fois que vous installez ce logiciel sur votre machine, c'est peut-être pas la première fois que vous utilisez Cloud. Et du coup, ben en
(45:34) gros, je me suis dit ça pourrait être pas mal de récupérer déjà l'emplacement du compte. Mais du coup, j'avais pas anticipé le fait que ben ça ça nous crée
(45:42) ce cette problématique là en plus. Donc il nous dit que il a bien trouvé
(45:47) les comptes à la racine. Le compte machin, c'est mon compte avec un jeton expiré et être tiré removat
(45:56) et son dossier est resté. OK, donc on a peut-être un autre problème à gérer ici.
(46:01) [grognement] Oracle proposé, la racine du plan. Un compte vivant dans la table. Account provider qu'on a un
(46:09) OK. Plus jamais sur le disque. Ouais, c'est plutôt ça qu'il faut faire. Compte du poste n'apparaît que si aucun vivant
(46:17) ne porte la racine. Ouais.
(46:24) Un point à trancher. Garder compte du poste comme libélé quand le compte
(46:29) vivant pointe sur un ou
(46:38) je valide pour le nom du compte et tu peux y aller.
(46:46) Voilà. Donc là c'est parti. Lui, il va se mettre au travail aussi.
(46:54) Bon, vu que lui il a fini, il a poussé son travail, est-ce qu'il a poussé la MR
(46:59) jusqu'au bout ou est-ce qu'il s'est juste arrêté à
(47:07) Non, il l'a bien poussé jusqu'au bout. Donc ça c'est bon. Celle-là, je vais quand même la garder
(47:12) parce que je me dis ça peut être pas mal. Ça peut être pas mal de la garder pour
(47:19) quand on fera la recette demain.
(47:25) Ici, on a Claude qui cherche. Il nous dit quoi ?
(47:30) Bon, après des fois il il voit qu'il y en a 6 sur 7 mais au final quand il va tester, il va voir que il y en avait
(47:36) bien 7 sur 7 mais des fois pas. Donc là, on va on va voir on va attendre son verdict
(47:44) en faisant des comparaisons plus poussées. Il va il va arriver à détecter ces problématiques là.
(47:51) Et sinon ici tiens, est-ce qu'on peut quand même voir un petit peu les choses bouger ou pas ?
(48:01) Voilà. Ah ben oui, on a vu les choses bouger ici.
(48:08) Parfait. On voit les les choses avancées. Alors, c'est pas parce qu'ici
(48:13) on a la vue comme sur Cloud, mais du coup habituellement codex est dans l'autre
(48:19) sens. Je vois qu'en fait en fonction de
(48:27) Et là, ouais, voilà, on a les de quarts de Codex. et de card pour Grock.
(48:37) Bon, c'est pas très grave. Je pense que GR on est bien à 54 de toute façon. Ouais, c'est ça.
(48:43) On est à 54 le 16. Donc il reste quand même 48 he pour Grock. Donc là, on va commencer à envoyer un petit peu plus du
(48:53) Groc de main, je pense. [grognement]
(49:03) [soupir] Pendant ce temps, est-ce que on peut pas regarder tiens, est-ce qu'on a toujours
(49:10) Ouais, on a toujours ces cartes là qui sont en
(49:19) qui sont in progress et tout alors que au final
(49:25) au final elles existent pas quoi.
(49:35) [grognement] Il va quand même falloir qu'on nettoie ça parce qu'à priori il a corrigé le il
(49:40) a endigué le l'épidémie ce qui fait qu'on va en avoir moins. Mais mais
(49:48) mais il faut quand même qu'on nettoie ça. Quand même qu'on nettoie ça. Je vais
(49:53) colle un cloud.
(49:59) Non, je vais prendre un codex pour ça.
(50:09) Par contre, on va peut-être pas pousser peut-être pas pousser m quand même.
(50:16) J'aimerais que tu regardes hier avec Codex, on a modifié
(50:22) la fature sprint afin de d'enlever la création
(50:28) automatique des cardes à chaque branche.
(50:35) Par contre, on n pas du tout nettoyé les anciennes cartes qui étaient créées et qui sont en tout in progress,
(50:44) sachant qu'elles avanceront jamais.
(50:51) On va le lancer là-dessus. On va voir comment il se débrouille.
(50:58) Je pense que là dans les prochains jours, j'ajouterai un petit
(51:04) un petit plus à la vidéo où genre j'essaierai de benchmarquer
(51:09) les un modèle par jour sur une tâche particulière, je sais pas, créer un jeu ou créer une landing page.
(51:20) Et en plus de de de cette partie là, je
(51:25) pense que ça pourrait être sympa. Là, on voit en gros ben comment je travaille au
(51:31) jour le jour avec Lia et comment bah
(51:36) j'arrive à évaluer un petit peu les les les performances des modèles dans mon
(51:43) infrastructure. Mais je pense ça peut être rigolo aussi de de tester les modèles sur bah des des
(51:50) tâches un petit peu plus décontracté, on va dire, sur lesquels on a moins d'attendus.
(52:01) Voilà, il a bien compris. Ici, on voit qu'il a il a trouvé en fait les résultats du travail de Codex euh d'hier
(52:09) et donc il a constaté, il dit "Je vois que hier vous avez travaillé effectivement et qu'on a bien arrêté la
(52:15) création automatique mais on a volontairement conservé les cartes dans l'historique. J'ai trouvé une carte in
(52:21) progress qui correspondent à la sien format automatique titre égal au nom de branche description vide
(52:29) et cetera. Voilà. Donc là, il il va préparer
(52:36) quelque chose pour les supprimer.
(52:45) Oui, je confirme.
(52:53) Voilà. Et là, comme ça, on on y verra un petit peu plus clair
(53:00) là-dedans. Après, je vais l'utiliser là. Là, je l'utilise vraiment beaucoup ce machinlà,
(53:09) mais je vais l'utiliser sur le nouveau format et on va voir ce que ça ce que ça nous apporte ou pas. Euh pour le coup,
(53:18) on va voir déjà si là tout cela il il crée les les il crée quand même les cartes ou ou pas.
(53:30) Bon, lui par contre, je pense que ce qu'il va faire, voilà, on va [grognement] très très vite le voir.
(53:43) On va très très vite le voir puisque là, il le fait direct en direct sur la base de données. Donc forcément,
(53:48) c'est instantané quoi. Par contre, je vois pas. Voilà, c'est on va retomber dans le dans le travers de départ. C'est
(53:55) là ils ont pas créé deux sprints, ceux qui se sont mis à travailler. Là
(54:01) je vois pas de sprint pour problème solise à jour codex non plus. Pourtant on l'a
(54:09) vu, on l'a vu euh tout à l'heure utiliser le MCP pour ça. Donc est-ce qu'il a créé
(54:17) des tâches individuelles ?
(54:23) [grognement] Là je les vois pas en tout cas. Ah si, ici on voit la tâche individuelle.
(54:28) Bon, en même temps, c'est pas des chantiers. Donc c'est vrai que là-dessus, je pense qu'ils ont raison.
(54:33) Il y a pas besoin d'un chantier pour quelque chose qui va être réalisé en direct quoi.
(54:41) Et là-dessus, voilà, on voit qu'il a fait la spec lui.
(54:46) Lui aussi, on a bien l'aspect. Après, forcément pour les bugs fixes,
(54:52) voilà, c'est un correctif. Donc pour un correctif, on a'ura pas le document de
(54:57) de plan quoi. Par contre, on doit avoir la
(55:03) review normalement.
(55:08) Bon, l'idée c'est pas non plus de leur faire créer des documents juste pour que ce soit joli dans une interface et qu'on
(55:13) ait des documents dans l'interface. L'objectif c'est que ces documents, ils servent à quelque chose. Là, l'objectif
(55:19) c'est quoi ? [soupir] En gros, une spec, c'est ni plus ni moins que expliquer
(55:27) en règle quoi, en en en divers points ce qu'on attend de la fature en finalité
(55:34) quoi. Et et eux, ils poussent encore un petit peu plus parce qu'il dit ben voilà, telle euh
(55:41) telle fonction ne rend que les lignes euh removes. Voilà, un contre tiré n'est
(55:48) pas une racine. reste reste donc c'est c'est assez barbare. Il y a pas de nous
(55:55) nous les humains, on on s'amuse pas à lire ça à longueur de journée. Après ça peut être intéressant de regarder à
(56:00) chaque fois surtout quand c'est des gros travaux parce que ben si vous engagez plusieurs millions de tokens sur une
(56:06) tâche, faut mieux être près sûr que ça ça comblera votre votre désir quoi. Je
(56:13) pense que c'est quand même le le point auquel il faut être vigilant.
(56:19) On voit que Grock aussi a fini. En même temps, c'était des trucs assez simples aussi dans le bouletage, il a bien fait
(56:25) son travail. Sprint priorité description puis type de travail.
(56:36) OK, donc là on est bon. Parfait.
(56:46) Eux, ils vont à mon avis terminer assez rapidement. Par contre, lui, il va pas terminer rapidement du tout. Lui, je
(56:53) pense qu'il va il va tourner une partie de la nuit. Les 50 cartes ont été
(56:58) supprimées. Parfait. Il reste 21 in progress. Les autres cartes branches work sont
(57:06) intact. Parfait. On peut l'enlever celui-là.
(57:15) On voit qu'il utilise bien les cardes pour le coup. La dernière fois le quand j'ai mis un codec sur cette sur ce
(57:22) sprint là, c'était sur celui-là. Il a été me créer un autre sprint ici. Là je
(57:29) je vérifie bien ce qu'il va me faire. Et là on voit que pour le coup lui il a bien respecté. On est bien sûr. Il a
(57:37) fait la la spec. Voilà, il a fait son son plan par rapport à l'aspect et là le
(57:43) plan c'est un peu plus euh comment dire ? C'est un peu plus déchiffrable quoi.
(57:48) Conserver l'accord et la preuve de compilation rouge avant correction. Exécuter corriger les deux fitures blab
(57:55) bla bla. Donc là des gens comprend bien mieux quoi. Const en banque
(58:00) et cetera et cetera. Et à la fin, une fois qu'il aura fait la review, ici, on aura le document de la review
(58:05) nécessairement sur ce type de de fature.
(58:12) Donc on est pas mal. On a quand même une là on commence à avoir le le bon
(58:17) fonctionnement, je pense. Ça à mon avis ça date un petit peu, mais là
(58:23) j'ai plus j'ai pas la date quoi. J'ai plus la date.
(58:29) OK. Il me semble qu'ici on a une indication de date, non ? Ah oui, mais on l'a
(58:35) au-dessus vu que là on est plus au-dessus.
(58:42) OK. Oui, mais voilà, là on a un champ qui a changé quand même. Ça, il faudra qu'on le
(58:50) faudra qu'on le gère. On a un champ qu'on chargé ici. On n pas qui c'est qui a créé la tâche et ce serait bien
(58:55) d'ajouter bah la date la date et heure de création quoi. Comme ça on voit ici
(59:01) je sais en fait donc je peux les je peux les je peux les supprimer moi-même
(59:10) euh parce que ça je sais que c'est fait par exemple. Ça je sais que c'est fait.
(59:19) Voilà. Ça, je sais que c'est fait aussi.
(59:24) Donc c'est pas un souci. Ici, qu'est-ce qu'on a ?
(59:35) Ouais, mais ça c'est vieux, je pense. Ça c'est vieux. Donc on va s'en débarrasser tout de suite.
(59:43) Pas si vieux que ça mais oui, ça commence à dater un petit peu. Ça commence à dater. J'ai déjà fait
(59:48) intervenir des agents là-dessus. Aucune garde n'apparaît.
(59:54) Ça aussi c'est géré.
(1:00:00) H pareil pour ça.
(1:00:09) Pareil pour ça.
(1:00:16) Pareil ici. Pareil là. OK.
(1:00:23) Voilà, on commence à voir un peu plus clair. Après dans les prochaines améliorations ici, j'aimerais pouvoir justement malgré que ce soit acquité là
(1:00:31) ou comment on dit ? Oui, que que c'est terminé quoi, j'aimerais pouvoir cliquer dessus que ça s'ouvre sur la droite,
(1:00:37) pouvoir ouvrir le document éventuellement. Donc ça, je je pense que demain, on
(1:00:43) travaillera là-dessus. Autre chose que j'aimerais aussi, c'est avoir une deuxième vue un petit
(1:00:50) peu plus campant pour ça aussi. réutiliser la vue en ban qu'on a là.
(1:00:55) [grognement] Mais pour ce mode là, sachant qu'on peut le voir comme ça ou de l'autre sens. Comme ça, je peux voir
(1:01:00) les cartes actives tout de suite, celles sur lesquelles ils sont en train de travailler tout de suite quoi.
(1:01:05) Parce que là, c'est vrai que bon, aller les chercher à la main ici en bas, c'est pas c'est pas très agréable.
(1:01:12) Voilà. Et on reverra le design ici un petit peu de cette case, de ce petit trait là
(1:01:18) aussi. J'aime pas trop, c'est trop gros. Mais ce sont des détails.
(1:01:24) Ce sont des détails ça.
(1:01:30) Et ensuite bah une fois que ça aurait été corrigé
(1:01:35) là demain, j'aimerais me lancer là-dessus. J'aimerais lancer un un chantier sur cette partie-là justement
(1:01:42) des fichiers modifiés et cetera qu'on puisse avoir accès au
(1:01:49) dans un premier temps peut-être uniquement modification
(1:01:55) des des des fichiers en cours en gros. Donc il faut fiabiliser à mon avis la
(1:02:02) jonction du boy ou de la branche
(1:02:08) avec le le travail en cours dans la dans le terminal du de l'agent. Et pour ça,
(1:02:16) ben c'est pour ça que je suis d'abord passé dans sprint faire un petit peu le le ménage parce que je sais qu'ici
(1:02:22) notamment il renseigne cette data. Donc soit on lit la la
(1:02:28) tasque directement au niveau de de du header de la de la dialogue ici du
(1:02:35) terminal ici comme on l'a fait avec ça. Comme ça, on peut voir directement la tâche et par la même occasion euh s'il a
(1:02:43) enregistré le work dans la tâche, ça veut dire qu'on l'a disponible pour là. C'est potentiellement qu'une simple jonction qui reste à faire. Voilà. où
(1:02:51) euh où j'ai j'ai mal compris d'où venait le problème. Et dans ces cas-là, on verra
(1:02:57) ce que le ce que l'agent découvre et ce qu'il nous dit. On a déjà une partie qui est pas malin quand on ouvre un document
(1:03:03) là qui a été fait par l'agent. Le visuel est pas dégoûtant. On peut l'ouvrir
(1:03:09) directement dans l'explorateur comme ça. Hop.
(1:03:14) Voilà. Donc il y a quelques fonctionnalités qui sont pas trop trop mal. On peut copier le chemin éventuellement.
(1:03:20) Mais il y en a une autre partie là. Je vois pas pourquoi on peut passer d'un dossier à l'autre alors qu'on on coupe
(1:03:25) la page en deux effect pardon. On coupe la page en deux pour avoir et d'un côté
(1:03:30) le terminal et de l'autre avoir les documents qui sont générés par l'agent.
(1:03:36) Donc je vois pas trop l'intérêt de passer de l'un à l'autre. C'est pas le c'est pas l'objectif ici. Et on avait déjà ben justement on avait déjà cette
(1:03:43) partie là qui permet de d'accéder aux fichiers qui sont créés et cetera.
(1:03:48) Le problème c'est que c'est pareil. Ça c'est un peu repris un peu de VS code.
(1:03:54) Le souci c'est que on n pas le même usage queon aurait dans VS Code. Dans VS Code quand on travaille dans du dans
(1:04:01) dans un projet de code, on s'est soit mis directement dans le Wordre, soit dans le
(1:04:07) dans l'origine et quoi qu'il arrive, on sait où c'est qu'on est. Là, on sait pas. En fait, on sait pas parce que ben
(1:04:13) les agents, ils peuvent être dispatchés d'un divers work tree. Si on se met euh comme je pense que c'est le cas, voilà,
(1:04:18) il est sur main euh donc sur le principal, là il voit absolument pas les modifications qui sont faites par le
(1:04:24) l'agent dans le work. Donc ça c'est un c'est une problématique que j'ai envie de que j'ai envie de travailler.
(1:04:32) Mais voilà, ça sera à mon avis dans le dans la prochaine vidéo.
(1:04:38) Donc là aujourd'hui, en gros, on a fait la recette du travail
(1:04:43) exécuté par les agents hier. On a vu que au moment où on fait la
(1:04:50) recette, c'est aussi le moment où on détecte euh bah les certains problèmes
(1:04:56) qu'on avait [grognement] pas anticipé au moment de la création et on a lancé nos agences sur la
(1:05:02) correction de ces problèmes. Donc demain quand on reprendra, on fera
(1:05:07) la recette des correctifs qu'on a lancé ce soir et on lancera un gros chantier
(1:05:15) et au moins un benchmark. Euh on va voir. Je pense que je vais je
(1:05:21) [grognement] vais tester un Astra versus ben Clud Fable 5.1
(1:05:27) sur une tâche particulière. On verra si on isole la mémoire aussi.
(1:05:34) Même si bon dans un nouveau projet, il aurait accès uniquement à la mémoire utilisateur. Qu'est-ce qu'on a dans la
(1:05:40) mémoire utilisateur ? Ici, on a pas grand-chose.
(1:05:49) On a que des choses relativement génériques qui donnent des indications sur le poste en lui-même. Donc c'est pas
(1:05:54) vraiment handicapant. Surtout si on fait faire un jeu sur entry JS dans un HTML,
(1:06:01) enfin tout dans le même HTML. Bon euh je vais y réfléchir demain dans la journée
(1:06:08) et on se lancer là-dessus. Voilà, j'espère que vous avez apprécié.
(1:06:14) Euh on va essayer de rentrer dans une phase où on va dynamiser un peu plus le le contenu parce c'est vrai que c'est
(1:06:21) intéressant de voir la méthode de travail mais de rester derrière les fenêtres à attendre qu'il se passe
(1:06:26) quelque chose, c'est pas réellement euh le truc le plus sympa du monde quoi. Donc
(1:06:33) on va essayer de rendre ça un peu plus amusant avec une partie où on traite les problèmes de l'application et les
(1:06:40) nouvelles fitures qu'on souhaite y ajouter. et une deuxième partie où bah on fera plus on on testera certains
(1:06:48) modèles, on testera éventuellement j'ai envie depuis un certain temps de tester quelque chose et de prendre un modèle
(1:06:55) euh beaucoup moins fort que ces ces ces
(1:07:00) modèles que j'utilise là au quotidien, genre du deepsic et cetera, même si aujourd'hui s'en approche quand même
(1:07:06) fortement. Et de faire euh ben genre de faire une spec par exemple à Claude ou à
(1:07:12) Astra. de faire travailler ces petits modèles et de voir si on obtient un meilleur résultat euh
(1:07:19) que avec le modèle tout seul par exemple. Parce que c'est vrai qu'aujourd'hui je le fais beaucoup avec euh avec Grock euh
(1:07:28) mais c'est principalement une question de coût c'est-à-dire que bah Grock à l'exécution coûte quand même beaucoup moins cher que si je laisse Astra ou
(1:07:35) euh Fable travailler tout seul. Astra, il y a le côté avantageux que pour
(1:07:41) l'instant open ils sont un peu dans un mode où euh bah ils offrent des resets
(1:07:46) tous les trois jours, tous les deux tr jours. Donc pour l'instant, on se passe pas trop la question, mais c'est vrai que
(1:07:52) demain, si vous si en utilisant ce type de modèle là, vous manger votre forfait
(1:07:58) en une journée comme c'est le cas aujourd'hui, si vous utilisez un Astra sur 4 C tâches en même temps, bah c'est
(1:08:05) vrai que bon 200 dollars par mois pour une journée, ça fait quand même peu. Ça fait quand même très très peu.
(1:08:12) Voilà, je vais m'arrêter là pour ce soir. C'est un petit peu plus court que d'habitude, mais c'est la reprise de la
(1:08:18) semaine. C'est un petit peu plus compliqué pour moi de d'être disponible.
(1:08:23) Euh mais je vais préparer un petit peu plus en amont comme ça demain je pourrais
(1:08:29) rester un petit peu plus avec une partie plus agréable, plus détente sur bah sur
(1:08:36) la conception d'un jeu ou d'une landing page ou quelque chose comme ça. Je vous
(1:08:41) dis belle soirée et à demain.
