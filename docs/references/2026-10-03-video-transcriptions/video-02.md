# Créer une application avec l’IA : de la maquette à l’application | NovaFactory — Jour 7

**URL :** https://www.youtube.com/watch?v=LlZXme-FklU

(0:01) Bonsoir à tous. Bienvenue dans cette nouvelle vidéo. Je vous propose pour commencer, on va reprendre là où on s'en
(0:09) était arrêté avec la conception de cette nouvelle application Nov. [grognement]
(0:14) Et donc comme on peut le voir, on est ben le lendemain en fait de la
(0:19) vidéo. Donc j'ai laissé travailler toute la nuit.
(0:25) Notre petit cloud, je pense que c'est celui-ci.
(0:30) Et on peut voir qu'il a plutôt bien travaillé. H il nous a fait
(0:37) hop, on va passer en mode chantier. Il nous a fait tous les points de la road map
(0:43) en Ouais, en moins de 12h en gros hein. Et entre-temps, moi j'avais lancé un
(0:51) agent Codex pour revoir un petit peu la la maquette puisque ben comme je l'avais
(0:57) dit, elle me plaisait pas trop. Donc on a fait quelques allers-retours, rien de bien méchant.
(1:04) Euh non, ça c'était la conception de la maquette. C'est ici la refonte. Alors, d'abord, j'ai fait passer codex avec GPT
(1:12) 5.6 sol. J'avais pas vu en fait que j'avais pas mis Astra. Et c'est vrai qu'en regardant le résultat, je me dis
(1:18) mais il a pas modifié grand-chose en fait. [grognement] Et du coup, j'ai lancé Codex
(1:25) euh avec GPT6 Astra dessus. Et là pour le coup, j'ai eu un meilleur
(1:31) résultat. Je lui ai précisé aussi deux trois choses que j'avais vu sur l'autre sur la maquette. Ça c'est comme je vous
(1:38) ai expliqué, comme je vous le montre à chacune des vidéos. En gros, c'est rare que une chose soit
(1:45) parfaite dès le premier coup. Ou sinon, c'est que vous avez été très précis sur le sur le sur le prompt de départ, ce
(1:53) qui fait qu'à l'arrivée, vous avez un résultat qui qui correspond parfaitement à ce que vous vouliez. Là, en gros, le prompt de base était
(2:00) quand même assez volumineux, mais euh c'était volumineux sur ce qu'on veut et
(2:07) pourquoi on le veut, mais pas comment on le veut. Voilà. [grognement] Donc
(2:13) ensuite, une fois qu'il a revu, ben j'ai j'ai passé l'information à l'autre pour lui dire "ça
(2:20) la maquette est prête." Et voilà le résultat qu'on obtient.
(2:29) C'est plutôt pas dégoûtant. H mais effectivement, on va le regarder après.
(2:35) Il y a quand même un sacré coup. Si on prend pour concevoir euh le la road map, ça
(2:43) nous a coûté à peu près 436 dollars. Voilà. Pour créer la première maquette,
(2:50) ça nous a coûté 18 dollars. Pour la rendre
(2:55) euh ben beaucoup plus jolie et et accueillante, ça nous a coûté 35 dollars de plus.
(3:02) La petite refontie 5 dollars et ensuite j'ai corrigé un bug que j'ai vu direct.
(3:08) J'ai fait un seul test en fait hein. J'ai essayé de mettre les coups sur une
(3:13) [soupir] sur l'un des essais et je me et je me suis rendu compte qu'en fait bah il
(3:19) avait mal réglé euh les interactions entre le front end et le back end et du coup j'avais un accès
(3:25) refusé. Donc j'ai fait corriger ça. Donc là 5 dollars enfin 6 dollars plus 5
(3:33) dollars on va dire qu'on est à 11. Ici, on ajoute 35. Donc, enfin, oui, on
(3:40) arrondit hein. Comme ça, on s'ett pas. 35 + 11, on est à 46.
(3:46) 46 + 18,
(3:51) on est à 50 60 en gros 60 65.
(3:57) Et là euh donc en gros, allez, on va dire qu'on était avec ça, on est à 70 + 30, on est
(4:06) à 500 quoi. On est à 500 dollars en gros pour euh
(4:12) une application avec un backend, un front end. Donc le backend, c'est la
(4:18) base de données avec les interactions qu'on peut avoir dans les pages. Le
(4:24) frontend, c'est le rendu graphique qu'on obtient.
(4:29) Et par contre, il y a pas de gestion des utilisateurs, il y a pas de
(4:34) d'authentification et cetera. En gros, là, on a une application qui peut tourner sur mon PC. C'était l'objectif.
(4:42) Mais si on devait le déployer, là on est qu'à allez de 21/10 diè de ce qu'il faut
(4:48) faire pour pouvoir publier cette application et l'utiliser en production
(4:53) parce que ben là on n pas on n pas géré de questions de sécurité parce qu'il y en a pas besoin en fait.
(4:59) Donc oui, 500 dollars, on a une application donc
(5:05) en en équivalent à pay puisque moi encore une fois j'ai mes abonnements et du coup ça m'a pas coûté d'argent
(5:12) direct, je paye déjà les abonnements. [grognement] Voilà. Mais on peut voir que si on prend
(5:18) entre hier et aujourd'hui, bon même si j'ai fait quand même d'autres
(5:23) d'autres petits code. Là l'interaction que j'ai eu entre hier et aujourd'hui.
(5:30) Aujourd'hui, j'ai un petit peu moins travaillé, c'est normal, c'est dimanche. On profite un petit peu de de faire
(5:35) autre chose dans la journée, même si j'ai quand même lancé des agents sur certaines questions.
(5:41) Voilà. Donc là, on a notre on a notre petite application. On va
(5:48) faire quelques tests. Je voulais d'abord, pardon, clôturer tout ça
(5:58) et ensuite je vais vous faire découvrir rapidement l'application.
(6:04) [grognement] Ça c'est pas très amusant mais au moins ça nous montre que notre nouveau campan
(6:10) fonctionne parfaitement. On peut voir que tout s'est passé tout seul de tout doux à complet.
(6:17) [grognement] Sachant que entre les deux, bah c'est passé à in progress quand il était en train de travailler puis review avant la
(6:24) review puis compl une fois que la review elle a été faite. Voilà.
(6:30) Et donc là, on peut on peut voir que pour chacun des lots où ça le nécessité, on a bien notre
(6:37) spec, on a bien notre plan et on a bien notre review.
(6:44) Voilà, qu'on pourra consulter aux besoins [grognement] ou euh durant l'exécution
(6:51) pour ceux qui aiment bien avoir un suivi attentif. Alors là, sur cette application là, j'ai pas eu un suivi
(6:58) attentif. tout simplement parce qu'en fait j'en ai pas besoin. Le le le petit harnet que j'ai construit autour du
(7:04) modèle euh pour la réalisation était suffisamment euh précis
(7:11) pour que j'ai pas besoin d'intervenir. Et au-delà de ça, elle a pas un réel
(7:16) intérêt. Elle va pas aller en production, elle va rester sur mon PC, elle va servir pour les vidéos de
(7:21) démonstration quand on quand on fait des essais sur les modèles. Mais c'est à peu près tout. Donc là, mon application,
(7:28) elle est en quelque sorte terminée. Les que je pourrais faire, c'est quand ben à l'usage, forcément, il y a des choses
(7:35) qui vont me plaire, il y en a d'autres qui me plairont peut-être moins et peut-être qu'il y a des idées qui vont émerger et à ce moment-là, je viendrai
(7:40) et je dirai "Allez, c'est parti, on va ajouter telle fonctionnalité, on va
(7:46) [grognement] on va modifier telle ou telle chose." Donc ici, on est bien. Maintenant, je
(7:52) vous présente un petit peu l'appli. Donc en gros, on a un double thème.
(7:57) Voilà. Bon, c'était pas spécifié au départ, mais vu que dans
(8:02) [raclement de gorge] le le document que je lui ai donné en source de la maquette, il a il a vu
(8:09) qu'il y avait plusieurs thèmes sur l'autre maquette. Du coup, il a reproduit au moins le côté dark et le côté [grognement]
(8:15) light. Moi, je préfère en dark. Donc je vais laisser comme ça. On a donc là où on est, c'est-à-dire la
(8:22) page des réalisation. Ici, on peut importer un rendu directement.
(8:29) Voilà, on peut choisir tout un tas de choses, hein, les modèles et cetera.
(8:35) [grognement] Ça c'est OK. Nouvelle réalisation. Voilà, c'est ça que je cherchais. Donc on peut tout à
(8:40) fait y mettre un titre, un identifiant. Ça, ila tiré en fait, il a vu comment je nommais mes dossiers et il s'est dit
(8:46) tiens, ça peut être une bonne idée. Et donc, on peut également mettre le prompt. Lui, je vois qu'il a fait euh
(8:53) ben il en a fait deux déjà. En gros, ici, je peux importer des
(8:59) rendus parce qu'il a pas importé des rendus. Si. Non, je sais pas. On va
(9:04) regarder celui-ci. Non, pour l'instant, il a rien importé.
(9:10) Voilà. Donc ça pourrait être rigolo. Hop, on va importer un rendu.
(9:16) Tac. Ça, je vais le mettre là. [grognement][soupir] Donc, je l'ai mis dans un dossier qui
(9:22) doit être dans dev résultat tableau sable mouvant et je les
(9:30) avais pas switch. Donc, il est pas là-dedans. Parfait. C'est probablement pour ça qu'il les a pas importé direct
(9:39) et c'est pas très grave pour le coup. Je vais m'en charger manuellement d'aller les chercher et les mettre. Ah
(9:46) merde là on était parti pour mettre B tiens, on s'en moque un petit peu. Donc on va prendre le premier qui vient.
(9:54) On a du sable mouvant. On était avec Grock 4. Et j'ai mis le quel dossier ? C'est
(10:01) celui avec Astra. D'accord. Vu que je l'ai ouvert, je peux pas. C'est celui avec la Spect d'Astra.
(10:08) Remplacer le rendu si la case est occupée.
(10:14) OK. Reprendre le corpus local.
(10:22) OK, on va voir si ça fonctionne. Ça me paraît un peu lent. Ah non, ça
(10:28) fonctionne. Ça fonctionne.
(10:34) Alors celui-là pour rappel, il était un peu buggéin. Donc c'est peut-être normal que le rendu
(10:40) soit buggé aussi. On va mettre le direct. Hop.
(10:47) [grognement] Voilà. Bon, on va pas tous les faire parce que c'est un peu chronophage. Et puis on verra peut-être à un moment donné même [grognement] de
(10:54) d'avoir un truc beaucoup plus automatisé. Voilà, là on peut voir que tout de suite
(10:59) quand il est pas buggé le le le rendu fonctionne bien. Si on tourne, on voit
(11:05) bien ce qui se passe.
(11:12) Voilà. Si on peut faire agrandir [grognement] agrandir, on enlève les
(11:17) deux colonnes à gauche et à droite quoi. Voilà, c'est pas terrible mais
(11:22) ça c'est pareil, c'est des choses à l'usage, on va voir que peut-être que là l'écran il est un petit peu petit. Peut-être qu'on aimerait bien le mettre,
(11:28) pouvoir mettre ça en plein écran par exemple. Ça, je pense que c'est une possibilité. Voilà pour voir les détails
(11:34) un peu plus fin là pour analyser la physique du résultat et tout c'est pas
(11:42) c'est pas nécessaire. Bien on va s'en mettre un autre. Je sais que Fable, j'en avais fait un avec.
(11:51) C'est parti. Où c'est que j'ai Fable ? Ici.
(11:57) Voilà, c'est les sables mouvants. C'est 5.1 et c'est en direct. On le met.
(12:04) Voilà, on peut voir que ça fonctionne parfaitement.
(12:09) Il y a pas de problème. [raclement de gorge] Si je fais ici euh comparer,
(12:16) est-ce que je pourrais comparer le Grock direct avec Voilà, parfait.
(12:22) Ouais, c'est là qu'on voit que ça fait un peu petit quand même, surtout pour des rendus où on a
(12:31) pardon où on a des animations à l'intérieur. Si on avait pas d'animation, ça pourrait aller mais avec des animations, ça fait tout de suite un
(12:36) petit peu bizarre quoi. Enfin, ça fait bizarre, ça fait petit quoi. Voilà.
(12:43) Mais ceci dit, ça fonctionne. Le permuté fonctionne aussi. Parfait. On
(12:50) retourne. OK. Voyez, c'était c'était le problème qu'on
(12:55) avait avec celui d'Astral justement. Ça freise en fait. [grognement] On va mettre le celui de fable enfin celui de
(13:02) Grock fait avec hop avec le prompt de fable. Voilà SPC
(13:10) fable. Voilà et comme ça on a les trois. Hop, j'allais prendre très beaucoup de
(13:16) temps. Et celui-là, c'était celui d'origine. Et c'est ça qui va être rigolo, c'est de
(13:21) pouvoir voir un peu l'évolution en fonction de qui c'est qui a fait l'aspect, qui c'est qui a produit l'implémentation
(13:27) et comparer un petit peu euh ben chacun d'eux quoi. Ici, on peut rajouter si on veut un modèle avec la version du
(13:34) modèle, ce qui est plutôt pas mal. Après voilà, là vous vous comprenez une chose, l'application elle est
(13:39) fonctionnelle euh elle a un certain design, certaines
(13:45) fonctionnalités et euh et dans un premier temps, moi je la trouve super mais je vois déjà les
(13:53) choses qu'il va falloir qu'on améliore pour rendre ça bien plus sympathique quoi. Mais là en un prompt de départ et
(14:02) quelques consignes bien entendu puisqu'en gros il a utilisé mon mon plugin forge. Donc il avait déjà des
(14:08) indications sur la manière dont j'aime travailler parce que je sais pas si vous vous rappelle vous vous rappelez à la vidéo
(14:14) précédente, on a d'abord fait le onboarding du projet. [grognement] J'ai lancé mon premier prompt sur fable 5.1
(14:22) où je lui ai décrit le projet que je voulais mettre en place. Là, en l'occurrence, une application, je
(14:27) lui ai donné quelques détails bien sûr. Et ensuite, il a produit le plan, la
(14:34) spécification technique, la road map et euh
(14:40) et ensuite, j'ai couplé cette conversation, j'ai lancé un opus et je lui ai dit "Voilà, c'est parti, tu vas
(14:46) faire l'implémentation." Donc celui que j'ai lancé moi, c'est l'orchestrateur. Donc il a orchestré des
(14:53) agents cloud opus. ou sonner en fonction de la difficulté. Il a beaucoup utilisé
(14:59) euh sonné et euh et pour la review, il a
(15:05) utilisé sonné aussi. Et à l'arrivée, on a une application qui fonctionne. Il y avait un bug au départ que j'ai fait
(15:10) corriger à à GPT6 Astra. Mais en gros, le
(15:15) problème c'était ici. Quand on saisissait le quand on saisissait le le
(15:21) coup, en gros, il y avait un bug. Donc [raclement de gorge] là, on va réessayer pour le coup. Est-ce que j'ai encore ces
(15:26) sessions d'ouverte ? Je pense pas. Je pense que je suis passé totalement à
(15:31) autre chose. On va essayer d'en récupérer une euh pour voir. Fable.
(15:39) Je vais mettre ça. 5.1 sable. Voilà, je vais aller chercher hop
(15:47) le bon endroit ici benchmark résultat
(15:54) et on est sur sable mouvant avec
(16:01) attends est-ce que j'ai Ouais, c'est le bon c'est le bon dossier. On enlève ça en recrée. Là vu qu'on avait créé,
(16:08) peut-être que on peut résumer et attraper la conversation.
(16:13) slash résume. Voilà,
(16:19) je pense que c'est celle-ci en effet. Oui. Bon, les coups sont un peu faussés
(16:25) sur celle-là puisque je lui ai demandé de me donner les coups et de manière honnête, il m'a dit "Attention là, rien
(16:31) que le fait d'avoir donné les coups, ça te coûte temps." Mais c'est pour voir si ça fonctionne. De toute façon, les
(16:37) sables mouvants, on le reproduira parce que c'était le tout premier que j'ai testé. Donc là, on veut voir si le
(16:44) fait de copier depuis l'application, comme vous avez pu le voir, hop, j'ai été dans mon petit onglet, j'ai fait
(16:50) copier, on a récupéré ça, on l'a collé là, on enregistre et on a bien nos coups
(16:56) qui s'affichent. Est-ce qu'on est bon ? On [grognement] était sur
(17:01) 14 et 17 22. Ouais, bon, on a un centime de
(17:07) différence mais c'est pas très grave. les tokens en entrée, les tokens en sortie et cetera. On regarde comment
(17:14) c'est reproduit. Pourquoi ma page relà ? Parce que j'ai pas pris la bonne. OK.
(17:21) 300000 52 300000 52 on est bon. 173000. Je refais
(17:28) la même boulette. Donc là on est bien. Il nous dit effectivement que attention là on est
(17:34) sur un taux dollars euros de temps et tout et cetera. Et en gros, j'ai même pas eu pour le moment à lui donner le
(17:41) tarif des de tel ou tel modèle, mais je pense [raclement de gorge] qu'en fait on doit pouvoir le régler puisque j'ai vu
(17:46) ici, voilà une section coût et on voit une grille tarifaire. Donc a priori, on
(17:51) pourrait indiquer les tarifs. Mais là, j'imagine que pour simplifier un peu le
(17:57) début, ce qu'il a dû faire, c'est qu'il a dû mettre une il a dû mettre lui-même une grille
(18:09) euh mais euh dans le code déterministe. C'est-à-dire que là, en gros, il a écrit
(18:14) ça en dur quelque part. Et du coup, si on le si on s'il y a une
(18:20) modification sur les tarifs par exemple, bah il faudrait venir le modifier dans le code. Donc ça c'est une un petit
(18:25) défaut mais toujours pareil encore une fois on lui a pas spécifié qu'on voulait une grille tarifaire. Donc quelque part
(18:31) là il a même pris un petit peu d'initiative pour le coup.
(18:36) Bon cet endroit je pense j'y viendrai très peu. Peut-être pour comparer éventuellement. Voyez on peut choisir
(18:43) par exemple sable mouvant. OK. Ouais, ça peut éventuellement être
(18:51) sympa. Et là, on voit quoi ? Modèle version
(18:58) variante token. OK, modèle version. Voilà, les variantes c'est spec. OK.
(19:05) Il m'en moins trois à chaque fois. Mais les gros par exemple modèle comme Astra
(19:11) ou ou Fable, je vais pas leur faire le le
(19:16) prompt de leur concurrent ou le prompt de leur spec à eux. Je pense que au bout d'un moment, on va
(19:22) on va pas non plus pas pousser m'aimer. Par contre, ce qui peut être rigolo,
(19:29) c'est les modèles locaux. Comme c'est pour ça que j'ai rajouté
(19:35) coign ici, même s'il a pas saisi le modèle pour le coup. Là, on peut rien faire.
(19:41) OK, donc ça, voyez, pareil ici, a priori, j'ai rien pour pouvoir modifier
(19:46) les choses qu'il a déjà faites. C'est par défaut les modèles. Je peux en ajouter
(19:53) mais a priori, je peux pas en modifier. Voilà, [grognement] là vous voyez la limite. En gros, il y a des choses qu'on
(19:59) peut faire dès le début et il y a des choses que si on veut on Ah, attendez, c'est quoi ça ?
(20:09) Ah, et donc on peut modifier quelque chose, non ? [grognement] OK, donc là,
(20:14) bon, c'est fature totalement tellement useless ça.
(20:21) Est-ce qu'on a besoin d'avoir ça en dessous ? Bon, je sais pas, c'est pas très handicapant mais en tout cas ça se fait. Personne
(20:28) voyez le temps que j'ai mis à venir cliquer ici en bas et en plus je peux absolument rien faire. Je peux pas les
(20:33) modifier. Ça c'est dommage mais on verra éventuellement sur ben ajouter ces fonctionnalités là dans une V2. Je pense
(20:41) que ça pourrait être pas mal. D'ailleurs, est-ce qu'on se noterait pas
(20:49) des des petites choses ?
(20:54) pour la prochaine version. Ça pourrait être sympa ici.
(21:00) En général, je fais avec un agent, mais là je vais le faire moi-même. Euh ajouter la modification
(21:09) euh des modèles. Voilà,
(21:16) on verra qui on l'attribute. Tout ça, c'est pas très important pour l'instant. On va se le laisser en tout dou. Et ici,
(21:23) je voulais également ajouter euh
(21:30) grill tarifaire des terministes
(21:42) actuellement. Voilà, en fait c'est des choses qui il qui vont me parler quand je vais revenir dessus et comme ça,
(21:48) j'aurais pas oublié ce qu'on vient d'observer là. Autant euh toujours le temps qu'on investit, autant qu'il
(21:55) servve à quelque chose. Là, on vient d'investir un petit peu de temps pour regarder l'application, ce qui fonctionne, qui fonctionne moins bien.
(22:01) Autant euh autant que ça soit utile pour euh ben la
(22:09) manière de l'application, quoi. Voilà, je sais pas ce que ce que vous en penserez. Moi, je [grognement] trouve que pour une application où on aurait
(22:17) payé 500 dollars potentiellement, euh moi personnellement à ce tarif là,
(22:23) en tant que développeur, je fais pas mieux. Voilà. Euh peut-être que des gens
(22:29) sont bien meilleurs que moi en développement et pour 500 dollars, ils arriveraient à faire mieux. Mais si
(22:36) enfin 500 dollars, je sais pas en 2 jours, il faut avoir construit le
(22:42) backend, la base de données, la PI pour pour faire communiquer les deux
(22:47) et un design quand même plutôt bien léché, quoi. Euh,
(22:53) c'est faisable. Euh si vous êtes plutôt bon designer, le design en soi, il va pas vous prendre non plus
(23:00) [soupir][souffle coupé] une semaine à créer. Ceci dit, si vous partez de rien, vous avez pas trop d'idées et que c'est pour vous, ça peut
(23:07) ça peut quand même prendre beaucoup de temps quoi. Voilà pour rappel très rapide hein sur
(23:14) puisquon on conserve du coup les artefacts, ce qui va me permettre de vous montrer un petit peu de quoi on est
(23:20) parti à la base. Il me semble que ce doit être ici.
(23:26) Ça c'est le 20, c'est aujourd'hui. Euh non, ça doit être dans
(23:36) Forge. Voilà ma quête.
(23:44) Ça nous donne quoi ça ? Bon, ça c'est la maquette refait par
(23:54) refait par Astra et je vois pas le je vois pas la
(24:02) première version template peut-être. Non, ça c'est le
(24:08) code direct. Je pensais dans doc avec design. Ah, peut-être ici,
(24:16) peut-être ici. Non, il l'a mis à jour aussi. [soupir][souffle coupé] Il l'a mis à jour aussi. Donc on pourra
(24:23) pas voir.
(24:34) Ouais, bon, c'est [grognement] dommage. C'est pas grave. Vous vous aurez qu'à regarder la vidéo
(24:39) précédente pour le coup euh puisque dedans je l'ai montré.
(24:47) Ouais, il a mis à jour. Bon, on va pas s'en plaindre. On des fois ils oublient.
(24:53) Donc là, vu qu'il a fait sur la maquette d'abord, il a d'abord mis à jour la maquette avant de
(24:59) avant de le mettre sur l'application. Du coup, j'avais validé ça directement.
(25:04) compléter les coups. On peut voir que de là d'ailleurs, on peut voir qu'entre la maquette et la réalisation, il y a un
(25:10) gap euh sur les coups surtout
(25:17) maquette coup. Voyez ici, il y a un background partout.
(25:24) Ici, il y en a pas. Mais ici, c'est assez bizarre. Ça fait
(25:29) un peu Ça fait bébé. Ça fait un peu je sais pas, j'aime pas les chiffres là comme ça qui sont pas alignés. Je trouve
(25:36) pas ça joli du tout. C'est une police spécifique qu'il a utilisé
(25:45) pour le coup. Peut-être qu'il a pas refondu cette page spécifiquement. Voilà qu'il l'avait fait sur le Tiens,
(25:52) on va regarder. Ça peut être rigolo ici.
(25:57) Catalogue comparaison index. index, [raclement de gorge] on était là, non ? Vous voyez, on avait bien ce
(26:05) on avait bien ce côté un petit peu propre, joli. Donc là, on voit que c'est parfaitement
(26:11) ce qu'on a sur l'application. Hop, on va se mettre là.
(26:16) A quelques espacements en plus, il y a quelques détails en plus
(26:21) qui a été oublié.
(26:27) Donc ça ça c'est pareil. Il faut pas hésiter quand vous regardez quelque chose, bah vous intéresser de savoir que
(26:33) bah tiens, est-ce que c'est parfaitement conforme à ce qu'on souhaitait ? On le regarde. C'est une application comme
(26:39) j'ai dit, je vais pas publier qui est pour moi pour les vidéos que je réalise.
(26:45) Mais l'objectif, c'est aussi que vous compreniez le le cheminement qu'on a en développement quoi. [grognement]
(26:53) Sur un start d'application comme ça, vu que j'ai la maquette, je peux m'amuser à comparer. Et là, on peut voir plusieurs
(26:59) détails qui sautent aux yeux et qui nous avaient pas sauté aux yeux au départ. Ici, quand on est sur réalisation ou sur
(27:04) coup, on sait pas où on est. Voilà, il y a pas l'indicateur comme il y a sur la maquette.
(27:11) Voilà. Ensuite, deuxième détail, quand on va sur coup, on peut s'apercevoir qu'en fait bah déjà ici elle est pleine
(27:17) page, ici elle est centrée au milieu. Et ensuite, on va voir que là ça avait
(27:23) un petit côté sympa. On avait varié des couleurs entre les petits titres et les
(27:29) données. Alors qu'ici, on n pas du tout repris ça. Il y a pas les capill.
(27:37) Voilà, ça c'est des capill. Donc il y a pas les capill. Et puis nos données, elles sont totalement
(27:44) enfin elles sont mises un petit peu comme ça sur sur un fond brut.
(27:53) Donc là, vous voyez un petit peu la différence. ici si on clique et que là [grognement] je voulais pas
(28:00) montrer celui-là justement et qu'on clique ici
(28:16) mais ici je préfère à gauche si il m'avait mis des choses et tout et
(28:23) je trouvais que ça se marchait un un petit peu dessus. [grognement] Par contre, au niveau des coups,
(28:31) voyez la grosse différence.
(28:37) Et là-dessus, [grognement] ça vient principalement du fait que à mon avis, il y en a un qui a commencé à faire une
(28:43) base et ça, ils ont beaucoup de mal les modèles quand vous les faites travailler un sur une chose et l'autre sur l'autre.
(28:49) Là par exemple, j'ai lancé la base de l'application par Opus et pendant ce temps, je suis parti faire autre chose.
(28:55) Je suis revenu, j'ai lancé l'autre sur la maquette en me disant que ben de toute façon ensuite j'allais donner
(29:00) l'information à Opus et il allait faire corriger. Et oui, il a fait corriger mais euh comment dire ? En gros, selon
(29:08) le modèle qui corrige, il va plus ou moins penser à aller corriger tel ou tel détail. Et donc s'il avait par exemple
(29:15) fait une feuille de style déjà de base avec certaines indications, potentiellement il a il a vite fait
(29:20) regardé, il a vu que c'était à peu près pareil. il s'est pas forcément pris la tête d'aller plus loin. Donc là, en
(29:26) fait, ce serait intéressant de dire à un modèle eh euh regarde parce que là, on n pas du tout le même on n pas du tout le
(29:32) design qui était attendu, notamment sur l'onglet droit, machin. Voilà, si on
(29:38) veut chipoter, ça c'est rigolo, c'est visuellement joli mais ça sert absolument à rien.
(29:47) OK. [grognement] En tant qu'humain là, vous savez pas quelle partie est quoi déjà. Il y a il y
(29:53) a pas de Ah si, on peut reporter à la couleur du point devant.
(29:58) Mais bon, c'est subtil hein. C'est subtil, il faut comprendre. Voilà. Mais ceci dit, une fois que vous
(30:05) avez compris, ça peut être rigolo et c'est surtout visuellement joli.
(30:11) D'accord. Là, on voit qu'il a pas reproduit. C'est un petit peu brut.
(30:17) Voilà. Bon, après, c'est acceptable, hein. On va pas non plus euh chipoter là-dessus,
(30:29) détail de la session. OK, il me remet les coups. Ça c'est vraiment génial. On a les coups juste au-dessus. On a détail
(30:35) de la session. On a des coups encore. Provenance. OK, il nous dit l'OCT, la
(30:41) date heure, importer, remplacer ce rendu. Signaler un rendu caché. Bon.
(30:48) OK, le prompt si on veut mettre le prompt mais là c'est pas le bon on pourrait si on publiait l'application
(30:54) par exemple sinon dans la à l'avenir on publiait l'application ça pourrait éventuellement être intéressant de
(31:00) remettre le prompt que les gens voient un petit peu qui puissent voir le prompt éventuellement le reproduire chez eux et
(31:06) cetera ici bon c'est discutable mais encore une fois on lui avait pas
(31:11) précisé et tout ce qu'on précise pas bah le modèle il prend des décisions en fonction de lui ce qu'il pense être le
(31:20) j'allais dire le mieux mais même pas euh c'est statistique donc ce qui est
(31:26) statistiquement le le plus proche voilà de ce qui pense être ce qu'on veut
(31:32) quoi. Bon voilà pour la petite revue. J'espère que ça vous aidera. N'hésitez
(31:38) pas si vous avez des questions à me mettre des questions en commentaire, je pourrais y répondre.
(31:46) Si vous avez apprécié, mettez un pouce, abonnez-vous pour les prochaines vidéos. Là, je pense que la prochaine vidéo justement, bah je vais me servir de Nova
(31:53) Bench et je vais montrer un petit peu bah la réalisation que j'ai fait faire à plusieurs modèles sur le thermomètre de
(31:59) Galilée. on peut voir qu'il l'a qu'il a déjà bien complété et on va voir qu'on a des des
(32:06) des résultats différents de ce qu'on a pu voir avec le tableau des sables mouvants
(32:12) sur le le il y a deux vidéos avant,
(32:18) mais ça confirme quand même un axe principal et du coup euh
(32:25) ça pourrait être intéressant à l'avenir de se servir beaucoup plus de cette technique de de faire réaliser l'aspect
(32:31) par un gros modèle et ensuite de faire travailler les petits modèles pour certaines tâches qui ne nécessitent pas
(32:38) forcément d'avoir le modèle le plus le plus avancé. Voilà.
(32:46) Euh je fais quand même une petite parenthèse ici pour vous parler de bah de du
(32:52) développement sur Nova Factory puisque j'ai quand même fait quelques petites
(32:58) modifications qui sont pas encore passé en production mais je vous avais dit que
(33:03) la dialogue nouvel agent elle commençait à me perturber pas mal pour voir elle m'agaque
(33:10) souvent je vais pas en bas je vous remontre un petit peu l'original Voilà, ici je choisis mon modèle. Voyez,
(33:17) on n pas changé fondamentalement le design. Par contre, on a changé le fonctionnement. Ici, si je sélectionne
(33:23) cloud, par exemple, il faut que je descende pour aller chercher quel euh type de permission je lui donne, si je
(33:30) veux le MCP, le compte et cetera. Et donc, ben c'est pas très user friendly
(33:36) très clairement et même moi ça me ça m'embêtait. Donc je voulais changer un peu cette dynamique. J'ai utilisé Astra
(33:44) et je lui ai donné certaines indications. Voilà, très clairement, je lui ai dit "écoute le mode de travail en haut, je pense qu'on a pas besoin
(33:51) d'avoir la description en dessous. On comprend très bien, je pense. Et quand on clique dessus, on a les détails, donc
(33:57) c'est parfait. Et [grognement] ensuite, j'aimerais qu'on remonte, je lui ai dit le bloc de permission qui est en dessous. J'aimerais que tu me fasses un
(34:02) volet sur la droite. Et on met ça dedans. Et le dernier point que je lui ai dit,
(34:09) c'est le dossier de travail, tu le mets tout en bas. Voilà. Et donc, on peut voir ça donne la chose suivante
(34:17) où on sélectionne notre modèle ici comme d'habitude. Voilà, ça [grognement] nous
(34:22) permet toujours de voir la mise à jour si on est sur la dernière version et cetera. Ça ça me tient à cœur. Moi,
(34:28) j'aime bien savoir où c'est que j'en suis. Dès qu'il y a une mise à jour, potentiellement peut-être qu'il y a un modèle qui est sorti, j'aime bien me
(34:33) mettre à jour et laisser la possibilité aussi de d'éventuellement ne pas le faire. Ensuite, je peux sélectionner mon
(34:39) compte. Souvent si j'en ai qu'un, je préfère que ce soit celui par défaut. Donc là, c'est le cas, c'est parfait. Et
(34:46) on voit que niveau permission du coup, bah c'est beaucoup plus user friendly. On a cliqué là, on vient cliquer là et
(34:52) ensuite on clique ici. Si on veut changer éventuellement le MCP, on peut voilà si on veut mettre dans un work ou
(34:59) dans un nouveau work et cetera. Mais quoi qu'il arrive en fait, on a tout sous les yeux dès le départ et c'est
(35:04) moi, pour moi, c'est ça qui est important. Ici, il a un petit peu modifié. Euh on y reviendra dans un
(35:11) second temps parce que pour l'instant en fait j'aime bien sa modification mais il m'a toujours pas intégré le l'aspect
(35:17) permission et là ça devient problématique. Je peux pas partir avec un approbation à la demande sur ben un
(35:23) duo ou une orchestration parce que sinon très vite je vais me retrouver avec
(35:29) l'agent secondaire qui va poser une question euh qui c'est qui me m'envoie la le quel c'est m'envoie la question ?
(35:36) Si je suis moi en train de discuter avec Claude par exemple, le classifieur de Cloud, il va jamais intercepter les
(35:43) questions que le classifieur de Codex met en place [grognement] et viceversa.
(35:49) Et du coup, ça veut dire qu'à un moment donné, peut-être que je vais avoir un agent qui lui va rester bloqué en
(35:54) attente d'une réponse de ma part. Alors, je sais que certains il mettent un timeout mais euh Claude par exemple, il
(36:01) y a pas de timeout sur les sur les ou c'est peut-être un paramètre mais moi je l'ai pas activé et du coup il va rester
(36:08) indéfiniment en attendu d'une réponse que moi potentiellement je verrai même pas. Donc ça c'est des petites
(36:13) problématiques qu'on résoudra un petit peu plus tard. Mais quoi qu'il arrive là déjà on a un un design qui me plaît
(36:19) mieux. Voyez ce que je disais ici on avait un une description. Alors au début quand on avait que cette partie-là à
(36:26) l'écran, ça va en fait, ça pose pas de problème. Ça donne une petite indication, ça ça adoucit un petit peu
(36:33) aussi à l'œil, c'est plutôt pas mal. Mais à la longue, en fait, on s'aperçoit que c'est très gros pour très peu de
(36:38) d'interaction. Au final, potentiellement, vous utilisez jamais ça. Vous utilisez que le classique et du coup, vous cliquerez même jamais puisque
(36:45) c'est le sélectionné par défaut. [grognement] Et euh donc quand on vient ici, voyez,
(36:50) c'était comme ça, le profil, il prenait énormément de place. Voilà.
(36:56) et on avait toujours pas le classifur les permissions quoi.
(37:01) Et donc maintenant on passerait sur ce modèle là où duo avec review on a le profil ici éventuellement où on peut en
(37:09) ajouter un nouveau. Et là quand on clique, voyez
(37:15) donc peut-être que ça posera aussi alors là-dessus en gros il a il a reproduit un petit peu la même chose qu'on a là ici
(37:22) et dans l'idée j'aime bien ça. D'accord. Je trouve que c'est ça me plaît bien.
(37:27) Voilà. Mais est-ce qu'à l'usage ce sera réellement cool ? Est-ce que ben quand je vais rajouter les permission là, ça
(37:33) va pas devenir handicapant en permanence de devoir aller vers le bas ? Voyez ? Donc voilà, toutes les
(37:40) questions, on se les posera au fur et à mesure où on utilisera les systèmes. Aujourd'hui, je demande beaucoup, c'est
(37:46) moi qui demande à l'agent de faire selon leur enfin de d'utiliser l'orchestration
(37:51) par exemple et de mais ces fonctionnalités là, elles ont été faites justement parce que ça à la longue ça
(37:56) commence un petit peu à à m'agacer en permanence de dire au modèle et là il faudrait que tu utilises un un modèle
(38:03) sous-agent. Avant, je l'avais mis dans le plukin forge. Donc dans chaque skill, il savait
(38:09) plus ou moins le faire. Mais depuis un certain temps en fait, et là vous vous allez comprendre un petit peu qu'on est
(38:15) souvent tributaire de ce qui se passe au niveau des des providers. Donc Claude a
(38:20) décidé d'ajouter dans son on prend le système comme ça une nuit euh le fait
(38:26) que il il privilégie le fait d'implémenter lui-même. Donc en gros, tu n'utilises pas de sous-agent si c'est
(38:32) pas explicitement demandé. Et du coup, c'est problématique parce que ben la manière dont vous l'avez
(38:39) indiqué dans le dans le dans le prompt du skill fait que bah certaines fois en
(38:45) fait lui il va juger que bah ce qu'il a reçu dès le départ est plus important que ce qu'il voit dans votre skill et du
(38:51) coup il faudra peut-être reformuler et cetera. Donc là pour l'instant pour pas lier à
(38:56) ça, je le dis explicitement mais à l'avenir potentiellement je clique sur orchestration, j'ai mon petit profil
(39:04) équipe produit par exemple disons. Moi ce sera plutôt parce que là si j'ai une
(39:10) review ici, je vais pas faire une test qualité là, ce sera plutôt un designer éventuellement un implémentaire pour les
(39:16) grosses fitures. Donc on dirait que lui designe par exemple et on met éventu ben
(39:22) voilà encore un problème mais bon là on est sur la maquette donc potentiellement il a pas reproduit ici normalement on a
(39:27) les modèles dynamiques. Donc là, on prendrait fable par exemple pour faire le design à mettons ou Codex Astra
(39:35) [soupir] euh ou 5 hein qui est très bon aussi en design, il faut bien le dire.
(39:41) Et euh par exemple en implémentation, vous mettraz au bus ou sonner ou euh allez savoir ce que vous voulez mettre
(39:48) quoi. Voilà, ça pourrait être sympathique
(39:53) de se faire des petites équipes comme ça et comme ça on clique une fois, on vient là, on clique deux fois et terminer, on
(39:59) envoie et ça ça part direct. Voilà. Mais déjà cette partie-là à mon
(40:07) avis sera bien plus utile. Donc là vous commencez à comprendre potentiellement que bah construire
(40:15) souvent construire l'application en elle-même, c'est pas le plus compliqué. Très clairement quand vous appuyez sur
(40:20) un bouton si ça fonctionne pas, on va vite comprendre pourquoi ça fonctionne pas et on va corriger et du coup on
(40:25) comme ça en itérant on avance. Par contre euh il y a certaines choses en fait la
(40:31) manière dont vous mettez les choses, où vous les disposez et tout euh
(40:36) ça c'est à l'usage. Les utilisateurs vous feront des retours, on dira "Écoute, aller chercher le bouton là-bas en haut à droite, c'est vraiment chiant
(40:42) à chaque fois, j'oublie." Alors que [raclement de gorge] alors que des fois vous pourrez utiliser une sujection euh le mettre peut-être dans
(40:50) un endroit où si vous par exemple vous avez des colonnes où la personne elle va valider des choses, vous allez pas lui
(40:57) mettre le bouton de validation du formulaire totalement à gauche. Il faut rester sur une certaine logique. Si la
(41:03) personne appuie plusieurs fois sur la droite, hop, le mieux c'est de mettre le bouton de validation juste en dessous sur la droite. Voilà. Mais c'est pas
(41:10) évident toujours comme ça. Ici c'était pas évident parce que au fur et à mesure le besoin, il a évolué. Au
(41:17) fur et à mesure on a rajouté des choses. Je me suis dit "Ah tiens, ça serait pe peut-être pas mal au lieu d'avoir une pop-up qui arrive pour nous dire qu'on a
(41:23) pas activé le MCP, éventuellement bah un bouton d'activation du MCP précoché de
(41:28) base directement dans la dans la dialogue de nouvel agent.
(41:35) Voilà, j'ai fait ça. Ensuite, j'ai désactivé. Alors moi je suis totalement
(41:40) franc. Quand il y a un problème, je vais le dire aussi. Je vais pas dire "Ah ouais, c'est génial le vibe coding, c'est génial, il y a jamais de
(41:45) problème." Si, il y en a euh nécessairement en fait. et moins vous comprenez ce que vous faites et plus
(41:50) vous aurez des problèmes et plus vous aurez de difficultés à résoudre les problèmes. Donc en gros, il faut ça sert
(41:57) à rien de vouloir construire la tour effel en une semaine si au bout de de 2 jours elle s'effondre et que vous avez
(42:03) plus de problèmes à la remonter que finalement à passer de semaines à à la
(42:10) construire simplement. Ici, [grognement] j'ai désactivé l'overlay. vous savez le l'overlay qui donne les l'indication sur
(42:17) les euh les limites de d'utilisation euh des providers parce que ben cet
(42:23) après-midi, j'ai eu un premier free où l'application elle a tout simplement freeé, elle arrêté de fonctionner.
(42:29) Donc j'ai pas trop compris. Je me suis dit tiens, peut-être qu'il y a un agent qui a lancé trop de test et tout. J'ai regardé les ressources du PC, il y avait
(42:35) pas il y avait pas de problématique. Mais en regardant les ressources du PC, je m'aperçois que l'application, elle
(42:41) utilise 16 Go alors que jusque-là, elle n'avait jamais utilisé de ressources
(42:47) pour vous dire, je la vois jamais [raclement de gorge] dans les dans les applications. Voilà, là par exemple, elle utilise 83 Mo de RAM. Voilà. Donc
(42:56) jusque- là, on on à chaque fois justement quand ils ont construit quelque chose, il y a des tests qui qui
(43:02) jugent du de s il y a des des problèmes avec les performances. Parce que pour
(43:07) moi en gros, une application qui n'a pas qui ne pardon fait rien tourner directement, elle a pas besoin de
(43:12) consommer 16 Go de RAM. Donc là ça veut dire qu'il y a un problème. Et donc j'ai
(43:18) lancé un nouvel agent en lui donnant certains détails. Donc la l'application avait free. Donc j'ai kill
(43:23) l'application, je l'ai relancé. J'ai lancé ma fenêtre, j'ai dit "Regarde, il y a probablement un problème avec
(43:30) l'application." D'abord, je l'ai laissé l chercher au sens large. Je l' ai pas
(43:35) dit, je pense que ça vient de l'overlay, d'accord ? volontairement parce que peut-être que ça venait pas de l'overlay
(43:41) et si je l'avais orienté vers l'overlay en gros potentiellement il aurait eu du mal après à se recentrer sur un autre
(43:48) problème. Voilà donc j'ai préféré le faire l chercher au sens large parce qu'il y a des logs en fait dans l'application et tout pour qu'il aille
(43:55) regarder les logs s'il trouvait pas quelque chose de particulier. Donc il a trouvé certaines choses mais rien de très concluant.
(44:00) Et donc euh et donc là moi je l'ai orienté, je lui ai dit écoute, la première fois que l'application a a
(44:08) planté ce matin, ça faisait un moment en fait que le PC était allumé, ça faisait un moment que l'application était allumée et à ce moment-là, j'ai pas eu
(44:14) le réflexe d'ouvrir le gestionnaire de ressources. Donc, j'ai pas vu de problématique particulière, [grognement]
(44:20) mais j'avais remarqué que l'on que le l'overlay sur la droite avait un petit peu un petit peu figé. Et tout à
(44:27) l'heure, juste avant que ça le refasse, pareil, j'avais l'overlay sur la droite et j'essaie de passer sur l'overlay et
(44:33) là, j'ai la la web viiew qui part sur l'autre écran en fait. [grognement] Donc là, je me dis tiens, c'est bizarre.
(44:39) J'essaie en suivant d'agrandir une fenêtre cl comme ça. Et là, hop, la fenêtre cloud, elle reste comme ça,
(44:46) ouverte avec le noir retour. Donc là, je comprends que il y a un problème, c'est peut-être figer. Je viens ici, j'essaie
(44:51) de désactiver l'overlay, ça ne fonctionne pas. Donc application figée, j'ai quitté, j'ai rancé et là je lui ai
(44:57) dit, je dit écoute, je pense que il faut s'orienter vers là parce que ça me paraît et il me dit en suivant "Ouais,
(45:04) c'est vrai, tu as raison, c'est probablement l'overlay." Et ensuite, il m'a proposé d'aller faire
(45:10) un diagnostic et d'aller euh faire des en gros des des bons d'essai et
(45:16) d'essayer d'en reproduire le le problème. Donc je lui dis "Vas-y banco." Et donc il me dit "Ce n'est pas
(45:21) l'overlay." Vous voyez ? Donc on était parti sur du généraliste, il a pas trouvé, je l'ai orienté vers l'overlay.
(45:28) Euh il était comme moi au début, il est il me dit "C'est c'est le suspect numéro 1, on va chercher dans ce sens-là."
(45:35) Donc il a fait ses bandes de test et en fait il revient vers moi en me disant ce n'est pas l'overlay. Donc là je l'ai pas lu la réponse. Donc je sais pas
(45:41) réellement ce qu'il va me ce dont il va me parler mais voilà je me doutais que c'était l'une des fatures qu'on vient de
(45:48) de d'ajouter parce qu'en fait j'en ai euh jusqu'à hier l'application elle
(45:55) buggait pas. Elle elle plantait jamais. J'avais pas de problème de ressources et
(46:01) même au contraire le au bout d'un moment j'ai été obligé de réduire un peu la voilure en terme d'agent parce que mon
(46:07) mes ressources PC suivaient plus parce que tous les agents lançaient des tests lançai les les suites c et et c'est
(46:14) c'est ce dont je parlais il y a deux vidéos euh j'ai dû revoir un petit peu l'architecture de de conception de
(46:22) l'application notamment les lancements de test et tout pour éviter que ça fasse bugger mon PC mais l'application elle
(46:28) Elle avait aucun problème et là aujourd'hui c'est le contraire. Le PC va mieux, pas de problème de ressources.
(46:34) Par contre l'application elle s'est emballée et donc il me parle là des fichiers dans la panne. Vous savez, je
(46:40) vous ai montré deux améliorations la dernière fois. J'ai ajouté j'ai fait ajouter cette partie- làà et notamment
(46:46) le suivi des fichiers dans les pan et d'après lui en fait ça viendrait de là. Voilà ça réécrit la liste entière de
(46:53) chaque événement d'activité. Donc forcément en fait plus vous avez de pan plus vous avez de fichiers et c'est
(46:58) exponentiel. Donc au bout d'un moment effectivement ça peut cracher.
(47:03) Donc il éc et cargo test de la panne Codex dont le target vit dans le dossier
(47:09) surveillé la nourrit par milliers. Voilà, c'est exponentiel et en plus de ça, vu que l'agent lançait des tests, ça
(47:17) créait des fichiers et potentiellement ça amplifié fois un certain nombre le la
(47:25) problématique. Donc il nous explique la chaîne, je vais pas tout vous lire, euh les événementies
(47:31) et cetera et cetera. Il nous dit que le déclencheur c'est celui-ci qui exclut les noms, les machins.
(47:38) Voilà la preuve, il nous montre la session problématique. Voilà, l'overlay est donc écarté.
(47:47) Non, en fait, il y avait deux choix mais l'overlay, c'est vrai que quand je lui ai donné cette piste, ça me semblait
(47:53) logique parce que la première fois, je l'ai vu freeze et la deuxième fois aussi. Mais j'avais quand même certain
(47:58) doute parce que l'overlay, je crois que ça fait tr ou 4 jours qu'il est là. Et sur les trois ou qu jours, ce qu'il y a que depuis euh ben le premier crash
(48:05) s'est produit hier soir, depuis c'était pas reproduit et il s'est reproduit à vers 17h tout à l'heure. Donc
(48:13) c'était possible que ce soit ça mais c'était pas dit. Et là ça correspond parfaitement en fait avec la livraison
(48:18) de la de la feature liée au fichier. Donc je pense qu'il a trouvé le la problématique. Donc là je vais le lancer
(48:27) avec son skill. Donc je vais dire oui bug fix.
(48:33) Il va en gros euh faire son test rouge, corriger le code,
(48:39) vérifier que le test passe en vert et [grognement] ensuite on relancera l'application
(48:46) et il va laisser cette fois je vais lui faire laisser les sondes qu'il a mis et comme ça euh en gros dès que certains
(48:53) seuils vont être dépassés, on aura des avertissements et ça nous dira attention là on a peut-être quelque chose qui a été mal goupillé.
(49:00) Alors, ce qui m'embête un petit peu, c'est que cette fonctionnalité, elle a été faite par Codex
(49:08) alors que justement avec l'autre, j'ai jamais ce type de problématique là. Souvent, il va détecter dès le départ en
(49:14) gros que il il y a un problème de performance. Et là, ça fait deux problèmes de performance dans la semaine pour Codex puisqu'on a sur le benchmark
(49:21) des sables mouvants. Au niveau de la spec qu'il a fait Astra en X, euh on
(49:27) s'est retrouvé avec ben un sable mouvant qui était inutilisable sur les euh
(49:33) [grognement] sur les implémentations qui qui proviennent de sa spec et pas un seul modèle mais il y a sur les sur les
(49:39) quatre qui l'ont utilisé, il y en a trois qui sont buggés. Le seul qui est pas buggé, c'est Dipsic. Et en fait, je
(49:44) l'ai vu faire des choses que les autres modèles ont pas fait. Il a été prendre des photos et tout et il a été contrôlé
(49:49) en gros des logs auquel il a pas accès sur la carte graphique et il a compris en fait certaines problématiques et il
(49:56) l'a corrigé. Mais le le rendu est quand même lagy. Voilà, comparé au aux autres
(50:02) qui ont été faits par dont l'aspect a été fait par Fable et où clairement on a
(50:08) on a aucun problème de performance avec le rendu de de cet exercice là quoi.
(50:13) Voilà. Donc là, on va le laisser corriger. On n'est pas pressé. Moi, je vais aller me
(50:19) reposer. Demain, c'est le travail. Je vous souhaite une belle fin de soirée
(50:24) du coup et j'espère à bientôt.
