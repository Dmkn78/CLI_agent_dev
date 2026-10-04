# Jour 1 - Vibe coding sur NovaFactory avec GPT6 Astra

**URL :** https://www.youtube.com/watch?v=bXWGvamrZAk

(0:00) Bonjour à tous, je m'appelle Jérôme. Je suis développeur depuis déjà 10 ans et
(0:06) aujourd'hui, j'ai décidé de vous présenter Nova Factory [grognement] qui est un logiciel que j'ai créé avec Lia à
(0:13) partir de juillet et que j'utilise au jour le jour pour mes développements
(0:18) personnels et professionnels. L'objectif de de cet outil, c'est de
(0:23) répondre à diverses problématiques euh que j'avais euh quand je développais
(0:28) avec Lia. Euh l'une d'elles, c'est que quand on commence à lancer une multitude de
(0:34) terminales, au bout d'un moment, c'est assez difficile de savoir lequel travaille sur quoi, sur quel projet il
(0:40) est, où c'est qu'il en est de la tâche. Deuxième problématique, c'est que le
(0:45) contexte grossit assez vite et qu'un agent perd assez vite le fil de ce qu'il
(0:51) doit l'objectif en fait de rendre du final. Et donc pour répondre à à tout
(0:57) ça, on a développé Nova Factory. Nova Factory, c'est en gros un logiciel qui
(1:02) permet d'ouvrir bah [grognement] divers Cli. Donc on a Cloud Code, Open
(1:09) Yi Codex, Grock, Kimi, Open Code, Cursor et
(1:14) Mistral Vibe. Et ensuite vous pouvez en lancer d'autres à travers le la console
(1:19) terminale. À partir d'ici, on peut voir euh en gros les
(1:26) la version en fait qui est utilisée actuellement sur le PC. S'il y a une mise à jour, ça nous proposerait la mise
(1:32) à jour. On peut avoir divers modes de travail. On peut travailler en mode classique, hein, un terminal qui s'ouvre
(1:38) et on parle de notre problématique et la jambe va se lancer dessus. On peut travailler en duo avec review. Donc là,
(1:47) l'idée bah c'est d'avoir un provider principal et un provider secondaire pour
(1:53) faire la review. Et on peut faire un mode orchestration où là carrément on va pouvoir déterminer
(2:00) qui c'est qui implente le code, qui c'est qui est l'agent principal, qui c'est qui fait la review et on peut
(2:05) ajouter éventuellement bah un autre agent pour le design par exemple et
(2:11) cetera et cetera. Voilà pour la présentation succente des modes. Ensuite pour chaque provider que
(2:19) vous sélectionnez, vous pouvez avoir différents comptes. Donc là moi j'en ai un sur mon adresse email.
(2:26) On peut gérer les comptes des divers providers ici. L'objectif c'est que ce soit simple en fait, c'est que quand il
(2:33) y a une mise à jour, je le sais et je peux la faire sans avoir à aller chercher la commande spécifique qui va
(2:38) me permettre de de faire ça dans un terminal. Ici, tout est géré via l'application directement
(2:44) et euh bah c'est l'objectif, la simplicité, la rapidité. On se pose pas vraiment de questions. Quand il y a une
(2:50) mise à jour, je le sais, je je peux la mettre à jour. Je peux aussi décider de pas faire la mise à jour.
(2:56) Bien, maintenant qu'on a fait une présentation assez succinte de l'objectif de l'application, je vais
(3:02) vous montrer un petit peu comment ça fonctionne et euh quoi de mieux que d'utiliser l'application pour
(3:08) retravailler l'application. Donc au départ, en gros, j'ai j'ai eu
(3:14) cette idée de faire un camban. Je me suis dit ça peut être pas mal de gérer euh
(3:19) euh les les tâches qui sont données à Liia dans les terminaux via euh un camb.
(3:27) Donc on l'a mis en place. Euh à partir de là, je peux moi-même créer une tâche ou euh l'agent peut créer une tâche via
(3:34) le MCP. Une fois que le le que les champs sont remplies, je peux dispatcher
(3:41) ça à un agent euh et ça l'ouvre directement dans la panne et ça lui donne les informations
(3:48) détenues par le le la tâche quoi de la tâche qui doit réaliser. Le problème
(3:54) c'est queune fois qu'on a lancé, ça passe en in review mais en in progress mais la suite va être à faire
(4:00) manuellement. Sauf si l'agent euh prend l'initiative de faire avancer la tâche
(4:05) jusqu'à une review, sinon ça n'avancerait pas. Et du coup pour pour
(4:12) euh euh contrevenir à ce cette problématique, je me suis dit pourquoi on va pas vers quelque chose qui est un peu plus automatisé et qui permettrait
(4:19) éventuellement d'englober plusieurs tâches dans une fature qui nécessite plusieurs tâches ? Parce qu'en gros
(4:26) l'une l'une des grosses problématiques qu'on a, c'est que bah au moment de la création de la tâche, il faut juger
(4:31) soi-même de la quantité de travail qui va être à exécuter pour être sûr que ça rentre à peu près dans le contexte que
(4:38) l'agent va avoir disponible, même si on peut utiliser les sous-agents et cetera.
(4:43) En gros, ça veut dire que on va laisser l'agent décider de quand c'est qui va utiliser les sous-agents, quand c'est
(4:49) qu'il ne va pas les utiliser et cetera. Ici, en gros, l'objectif c'était de dire "Bon, mais voilà, je je te confie une
(4:55) tâche via un terminal. Euh j'aimerais créer une nouvelle fature, voilà la feure. [grognement] La l'agent travail
(5:02) euh fait les constatations, les premières explorations, euh et il détermine un plan et cetera. Et à partir
(5:08) de là, il va créer une tâche au Camban, [grognement] mais c'est la tâche du projet en gros de la fature. Donc là,
(5:15) par exemple, bah c'était compte affiché aucun quand l'hydratation a échoue. Ça
(5:21) on voit tout de suite que c'est un agent qui l'a créé. Et dessous, il affiche le constat, enfin ce qu'il a constaté en
(5:27) gros au moment de de l'exploration.
(5:33) Ensuite de ça, euh il va il va en faire une spec puis un plan, puis euh la rivi
(5:38) là, on peut voir que euh bah il y a il y a des petits trous. C'est qu'ici il trouve on trouve pas le fichier. Alors
(5:45) est-ce qu'on le trouve pas parce qu'il existe pas ou est-ce qu'on le trouve pas parce que l'agent l'a pas rangé au bon endroit ? Bah c'est toute la question
(5:51) justement. Euh aujourd'hui en gros, le système fonctionne
(5:57) fonctionne. Voilà, on peut pas dire le contraire. On voit que ici euh il y a une partie des tâches qui ont été faites
(6:04) et euh à certains endroits, on voit carrément que ils il arrive très très bien à faire le travail. Mais justement,
(6:10) il y a un petit gap. Pourquoi à des endroits où on arrive très bien et à d'autres pas ? Ben c'est parce qu'en
(6:15) fait à des moments l'agent pour diverses problématiques, il va décider d'aller créer une nouvelle branche où il va et
(6:22) et en gros dans le la fonctionnalité Sprints, il y a une partie de déterministe.
(6:28) Les tâches, elles peuvent être créées par l'agent associé à la tâche principale à l'agent par l'agent, mais
(6:34) elles peuvent aussi être créées uniquement parce que l'agent a créé une
(6:40) branche. Et du coup, en gros, je pense qu'on a mal jaogé là entre la partie
(6:45) déterministe et la partie qui ne doit pas être déterministe et est plutôt gérée par l'agent.
(6:50) Donc c'est parti. On va euh utiliser Codex pour ça, on va utiliser Astra et
(6:56) on va voir s'il est capable de nous proposer euh une résolution à cette problématique.
(7:03) Donc en général, j'utilise euh Nova Wisp pour parler à l'agent, mais je vois que
(7:08) avec quand j'utilise OBS, ça ne fonctionne pas et du coup, il faudra que je lance un agent euh sur cette
(7:14) question, mais on le fera plus tard. Donc c'est parti pour Astra. Donc on va
(7:20) lui dire qu'on a une une fonctionnalité sprint. On a une fonctionnalité
(7:26) sprints dans l'application qui mele
(7:34) [raclement de gorge] déterminisme
(7:40) et euh action de l'agent.
(7:49) Euh et du coup ça crée
(7:54) diverses problématiques.
(8:04) Euh des tâches sont créées
(8:13) directement quand on crée une branche
(8:22) et sont référencés à tort.
(8:31) par l'outil.
(8:38) Ensuite, certaines tâches n'ont pas
(8:44) les spec plan review
(8:50) ou en non seulement une partie.
(9:01) On va le lancer là-dessus et on va voir un petit peu ce qu'il trouve et s'il utilise notre péthodologie parce qu'en
(9:08) gros je me suis rendu compte que bah simplement mettre un point cloud ou un
(9:14) point agent. MD [grognement] euh ne suffisait la plupart du temps pas à ce
(9:19) que Lia exécute les choses comme je voulais qu'elle le fasse. Et donc j'ai
(9:24) créé un plugin avec des avec des skills qui lui indiquent en
(9:31) gros comment il doit se comporter dans telle ou telle situation. [grognement] Je vous encourage grandement à créer vos
(9:38) propres votre propre méthodologie de travail avec Lia. C'est important pour
(9:44) plusieurs raisons. Déjà, vous savez euh ce qu'il va faire et pourquoi il le fait et ensuite ça permet de le faire évoluer
(9:51) avec le temps. En gros, c'est très difficile de créer comme ça à brute un système qui fonctionne du premier coup
(9:58) sans l'avoir expérimenter et retravailler en fonction de de ben
(10:04) des retours que vous pourrez faire au système quoi. Pour moi, le l'un des
(10:09) l'une des choses les plus importantes quand vous travaillez avec les agents IA, c'est de faire attention à ce qui vous
(10:16) remonte. Souvent, les informations, il vous les donnent. Il va vous dire "Ah ben tiens, attention euh, j'ai constaté
(10:22) qu'à tel endroit, il y a peut-être une faiblesse ou peut-être un truc." Ben dans ces cas-là, vous pouvez tout à fait
(10:28) lui dire "Bah, note-moi une tâche au camban histoire que plus tard je puisse y revenir dessus." Et je travaille
(10:33) beaucoup comme ça où je vais essayer toujours de comprendre où a été le point
(10:39) de friction. Euh qu'est-ce qui a fait qu'ici par exemple on a plus de temps que d'habitude ? pourquoi les tests sont
(10:44) pas passés. Et en gros, c'est avec cette expérience, avec le temps, en emmagasinant et en corrigeant les choses
(10:50) qui dysfonctionnent, qu'on ait un système qui va de mieux en mieux quoi. [grognement] Voà, on voit qu' il cherche
(10:57) pas mal hein dans les dans les tasques, il regarde un petit peu là justement, il est en train d'utiliser le MCP
(11:04) pour regarder un petit peu ce qu'on a dans les dans les tâches. Donc là, il est en train de bouffer un petit peu de contexte mais en même temps, il a il a
(11:10) aussi besoin de savoir quelle tâche il y a pas, pourquoi. C'est justement le travail dont je parlais tout à l'heure
(11:17) quici par exemple si je prends cette tâche là je vais pas avoir mes je vais pas avoir
(11:23) mes documents alors que la tâche est accomplie. Et donc là c'est possible que ce soit juste que ben quand si la tâche
(11:29) a été créée, elle a été créée avec un certain chemin j'imagine et potentiellement c'était dans un ware cre
(11:35) et une fois qu'on a merge tout ça dans main euh bah éventuellement là il retrouve plus forcément le le fichier.
(11:40) Donc on va voir sur quoi il sur quoi il conclut. Mais à mon avis, c'est possible qu'on soit sur quelque chose comme ça.
(11:47) Et vu qu'on va pas attendre, là on est sur une session de travail. Tout l'objectif, c'est de vous montrer justement moi ce que je fais durant mon
(11:53) travail. Voà, pendant que lui il cherche, on va lancer une nouvelle panne. Cette fois, on va utiliser Clod
(11:59) parce que justement c'est Codex qui avait réalisé la fature que j'essayé de lui faire corriger mais qui n'a pas qui
(12:05) n'a pas réussi. Ici, je trouve que tout ça c'est disproportionné. On voit que là
(12:10) Lia, elle a elle a un petit peu craqué. Elle a mis des tailles de police qui sont totalement
(12:16) pas ce qu'on voudrait. Donc là, je vais prendre une photo.
(12:22) Ça, il faut s'habituer à le faire. [grognement] C'est important pour le travail. Ça permet de travailler mieux.
(12:28) Et on va lui faire des petits traits, des petits trucs pour lui indiquer où c'est que ça va pas quoi. Où c'est qu'on
(12:34) a des problématiques tous ces blocs là, c'est surdimensionné.
(12:42) [soupir] On va se mettre ça ici. Voilà.
(12:47) Et on va venir lui glisser et déposer notre petite image.
(12:54) Voilà. et on va lui ajouter la police
(13:00) dans la dialogue nouvel agent
(13:06) n'être pas du tout conforme aux taille de police
(13:14) habituelle.
(13:24) Alors là, je je vais le faire corriger d'abord sur la maquette parce que justement j'ai pas envie que ça
(13:29) recommence comme précédemment. Et du coup là, l'objectif c'est quoi ? C'est que ben ça c'est juste un changement de
(13:35) de règle CSS et vu que le CSS est commun de la maquette à l'application réelle,
(13:41) s'il le corrige sur la maquette et que je peux le voir sur la maquette, et ben immédiatement ce sera corrigé sur le sur
(13:46) le sur le fond. J'ai même pas besoin de lui faire lancer la l'application euh développement. [grognement] Et donc
(13:53) c'est ce qu'on va faire. Je vais dire d'abord travaille sur la maquette.
(13:59) Sur ma quête pour me montrer le résultat.
(14:07) Voilà. [grognement] Pendant ce temps, on a notre petit codex qui est revenu. On va le mettre en grand ici. Et on voit
(14:13) qu' il veut nous poser une question là. Là, il a il a un truc qui nous demande. Donc, on va regarder ce que c'est.
(14:20) As-tu un ou deux noms de tâches de sprint mal attaché ou privé ?
(14:25) Ben tiens, on va aller ici justement. Celle-ci là semble-t-il, ça ne marche
(14:31) pas. Ici, j'ai pas la spec là et sur la tâche, j'ai ni spec, ni plan, ni review.
(14:39) Donc, on va lui mettre celle-là. Hop ! Cette tâche par exemple
(14:48) n'a aucun document dans lui.
(14:54) Et on va lui mettre un petit screen aussi parce que comme je vous expliquais précédemment, c'est toujours plus parlant pour lui quand il sait de quoi
(15:01) on est en train de parler. Donc on repart. Capture. Booum
(15:08) booum. On prend ça en photo. Voilà.
(15:14) Donc l'objectif en fait c'est c'est qu'à chaque fois qu'on qu'on veut qu'il fasse une correction, plus on peut lui donner
(15:20) des informations et plus on peut être plus on est précis sur les informations qu'on lui donne et meilleur sera le
(15:26) résultat bien évidemment. Par contre là, je vais d'abord envoyer
(15:31) et ensuite je vais lui mettre l'image parce que j'ai peur que dans la réponse ça passe pas.
(15:39) Et donc pendant que lui il travaille, on va retourner voir ce que fait notre ami Claude. Claude, il est en train de
(15:45) chercher via justement le MCP.
(15:50) Ce qu'on voit ici qui colle le MCP.
(15:56) Hop. Pendant que ces deux agents là travaillent, je me dis qu'il serait pas mal.
(16:02) J'ai encore une problématique ici. Décidément, c'est ce sont des nouvelles fonctionnalités. Donc forcément en fait
(16:10) quand vous avez pas 100 % blindé le la conception au départ, ben vous vous
(16:15) retrouvez avec des gaps à la fin. Ici le gap c'est que bah là il me met des modèles en dur et c'est normal au départ
(16:22) en fait on lui a pas demandé d'aller faire quelque chose qui va euh euh regarder dans le CLI les modèles
(16:28) disponibles et nous les retranscrire dans l'application. Par contre, je sais qu'on l'a fait ici. On l'a fait ici. Ça
(16:36) ici là, on a quelque chose qui va chercher au niveau du CLI et qu'il enregistre pour pouvoir nous resservir
(16:42) les modèles disponibles. Donc là, l'objectif ce serait de dire à notre agent "Et regarde ici, là dans le chat,
(16:49) on a une fonctionnalité. Bah, tu vas aller me [grognement] regarder comment c'est fait et tu vas le
(16:55) réutiliser en fait dans ce dans cet endroit-là quoi. Je vais changer la disposition, je préfère les avoir côte à
(17:01) côte. Une chose, voyez, que que je disais au début, l'une des problématiques, ben elle est résolue par
(17:07) le fait que en fait quand il se lance, l'une des premières actions qui doit faire le modèle, c'est de mettre un
(17:12) titre à la à la panne. Voilà, comme ça bah là je sais qu'on est en train de parler de la cohérence des tasques des
(17:20) tâches sprint. Ici, on est en train de parler de la correction des polices dans les dialogues nouvel agent. Et ici, ben
(17:26) quand je vais lui avoir donné la consigne, on verra de quoi on est en train de parler. Et ça c'est pour moi
(17:31) c'est d'autant plus important que je peux travailler selon la disponibilité
(17:37) des forfaits que j'ai. Je peux travailler sur de 3 4 h projets en même temps. Et donc quand je rebascule de
(17:43) l'un à l'autre, il faut que je sois capable de raccrocher les wagons et me dire "Attends où c'est que j'en suis quoi."
(17:50) Donc là avant de relancer notre codex, on va lire ce qu'il a ce qu'il nous dit lui. Il nous dit pour cet exemple les
(17:56) trois documents attendus sont absents du correctif livré. J'ai vérifié la PR de guide. Le
(18:02) rattachement de la carte et de chemin ont affiché hein.
(18:12) Donc là, il nous dit qu'en gros, il y en avait pas. Il y a il y a a il y a rien qui a été fait par l'agent. Alors, est-ce que c'est normal ? Est-ce que ça
(18:18) allait pas ? C'est ça qu'on va essayer de déterminer.
(18:23) Donc, il dit que c'est pourtant passé à à terminer quoi. Lui, constate donc correctement l'absence. La chaîne de
(18:29) réalisation a laissé passer le dossier incomplet et le suivi ne le contrôle pas.
(18:37) On ne peut pas établir si ces documents ont été exilés localement avant la suppression du work tree.
(18:44) J'ai aussi trouvé un défaut d'affichage. Une review absente déclenche systématiquement
(18:50) l'explication livrée avant le contrat de review version.
(18:58) Donc là, il a fait lui-même une carte au camp, hein, pour expliquer c'est quoi sa problématique. Ça [grognement] c'était
(19:04) peut-être un bug et je pense que si c'est un bug,
(19:10) bah il [grognement] a utilisé la la chaîne [gémissement] du du skill Bug Fix, pardon. Et du coup
(19:19) en gros forcément la chaîne du skill bug fix à mon avis elle lui impose pas de spec de plan et de rivion. En gros
(19:26) [grognement] le le la chaîne Bug Fix elle va lui imposer de reproduire le bug de de et ensuite de généraliser mais
(19:34) absolument pas de créer la chaîne. Et donc on voit qu'en fait l'agent si on lui spécifique pas si on lui spécifie
(19:40) pas de lui-même, il va pas le faire. Donc est-ce que c'est problématique pour Bug Fix ? Je pense pas. Euh
(19:51) par contre, si on prend celle-là, là, on a bien la spec, on a bien le plan, on a bien la review. Donc [grognement] on
(19:56) voit que a priori
(20:02) c'est le bug fix qui qui qui fait que ça ne déclenche pas le la création. Donc
(20:09) jusque là tout va bien. Ici c'est normal parce qu'en fait il les
(20:14) a créé à postériori. C'est un travail qui est fait sur le Mac et donc forcément actuellement j'ai que
(20:21) les choses en local. Donc là je je suis en local pour la mémoire et je suis en local pour le campant. À une époque
(20:29) j'avais pensé peut-être le rendre disponible via le cloud mais aujourd'hui je me pose la question. Je me pose la
(20:35) question euh pour diverses raisons parce qu'en fait on pourrait faire en sorte que éventuellement ce soit directement
(20:41) dans le guide du projet plutôt que que ça passe par euh le hub de Nova Factory.
(20:49) Voilà. Donc je pense que la problématique ici
(20:54) du de cette carte là, c'est la chaîne
(20:59) Bugfix.
(21:10) Donc oui, la chaîne Buffix n'exige pas la création
(21:17) des documents et je pense que
(21:23) cette panne cette pardon cette tâche est issue
(21:33) euh d'une chaîne Buckfit.
(21:43) Next. [grognement] Là, je lui dis next parce qu'en gros, il s il s'est fortement arrêté là-dessus. On voit qu' il a
(21:49) totalement délaissé la la deuxième partie et c'est normal en fait, il est il est un peu comme nous hein, il traite
(21:54) les choses de manière séquentielle. Donc là a priori,
(22:00) il va quand même vérifier ce que je lui dis. Ça c'est plutôt pas mal parce que moi-même il me semble que c'est logique
(22:07) mais c'est peut-être pas logique. Donc on va voir ce qui est dit dans Buckfix et il me semble bien que Bugfix n'impose
(22:12) pas de spec [grognement] pour des raisons diverses et variées. Mais en gros la la spec, elle est
(22:19) demandée beaucoup dans Fature parce que justement c'est ce qui va permettre à la review après de constater que le travail
(22:25) a bien été fait selon les conditions qui étaient requises au départ. Or, un bug
(22:31) fix, bah la condition c'est de résoudre le bug fix. Donc c'est un peu
(22:36) contreintuitif. On pourrait créer une spec pour faire ça, mais je trouve que ça alordit
(22:41) beaucoup le travail pour rien. Ici, on voit que Claude, il vient de terminer et
(22:47) là vous voyez déjà à quel point rien que euh juste lancer deux pannes déjà deux
(22:53) terminaux, ça peut occuper très très vite tout notre esprit quoi. Donc là, il
(22:58) me dit qu'en gros, ça y est, il a fait la maquette et tout et donc on va
(23:04) pouvoir la trouver dans concept doc conception
(23:09) donc dans un word tree. Je vais l'ouvrir directement dans mon navigateur. Ça c'est d'ailleurs une feature que je veux
(23:15) développer, c'est la possibilité d'ouvrir en gros de dans l'application
(23:20) euh directement le le potentiellement la maquette qu'il a qu'il a généré, quoi.
(23:27) Donc là, je vais vous montrer un petit peu ce que ça donne. Je vais aller dans le bon dossier. Tac. Donc là, il est
(23:33) dans un work tree. Donc forge work tree.
(23:40) C'est c'est la police. H
(23:47) et il a pas travaillé dans je pense. Il a fait ça comme un cochon.
(23:55) [souffle coupé] On est sur Conception. Ouais.
(24:06) Et euh h [toux] nouvel agent police
(24:14) ici. Voilà à quoi ressemble la petite maquette qui nous a faite. Non, tu vas
(24:20) rester comme ça. Voilà. Donc il nous montre ce qu'on a aujourd'hui. Voilà. Bon, il a pas trop
(24:26) respecté la police mais c'est pas très très grave.
(24:32) C'est encore très très gros, je trouve. J'ai l'impression qu'il a un peu la berlue.
(24:40) C'est peut-être moi. Mais tu es encore très très gros dans les select.
(24:46) On va lui dire ça.
(24:57) Donc j'ai l'impression que dans les selectortionné.
(25:10) On va le laisser bouliner. Il va corriger ça tranquillou lui du coup.
(25:19) Il a avancé un petit peu. Il a avancé un petit peu. Qu'est-ce qu'il dit ? La chaîne installée confirme
(25:26) une partie de ton point. Bugfix ne demande pas de plan séparés. Elle exige toutefois un oracle dans spec
(25:35) puis une review. Je corrige donc le diagnostic. L'absence
(25:40) de plan peut-être normale pour Buckfix Sprint.
(25:45) OK.
(25:59) Euh oui, éventuellement. Donc là, il nous pose une nouvelle question. On va regarder. C'est pas mal ce nouveau
(26:04) module de question, j'aime bien parce qu'en fait, il continue à travailler malgré tout. Il se bloque pas forcément.
(26:10) Donc il nous dit pour la suite, "Veux-tu fiabiliser le suivi Sprints ou
(26:17) aussi empêcher une livraison forge lorsque ces documents obligatoires manquent ?
(26:30) Je je vais prendre sa recommandation. Je pense que c'est pas mal. Euh la création explicite des tâches, documents adaptés
(26:38) à la chaîne et manque visible. [grognement] Parce que c'est vrai que aujourd'hui en
(26:44) fait on sait pas trop si c'est un bug, si c'est un oubli de l'agent et nous ça
(26:50) peut nous pénaliser même si je dois bien avouer que je vais très rarement
(26:55) euh vérifier le plan ou la review. En général, je me contente de la spec euh
(27:03) parce qu'elle explique en général très très bien ce qu'on va obtenir à la fin et et que souvent mes features passent
(27:10) par de toute façon euh une maquette qui me permet moi de voir un petit peu un
(27:16) petit peu le résultat à l'avance quoi. [grognement] Ici, il nous dit quoi ? Trois camp trois crans pour les
(27:22) sélecteurs.
(27:29) Ouais.
(27:41) Allez, on va prendre son B. On va prendre son B. Je pense c'est pas mal d'être entre les deux.
(27:48) Ça fera quand même un tout petit peu moins gros, c'est clair.
(27:58) Ça, j'aime pas du tout.
(28:05) On verra plus tard. On verra plus tard. Ça m'intéresse pas trop de modifier ça pour l'instant. J'ai pas eu le temps de tester ces features là.
(28:13) euh parce que je les ai retravaillé avant de les de les tester en fait parce que j'ai
(28:21) eu l'occasion, on avait fait les premiers branchements en fait à partir de la la moitié de la fiture, je pouvais
(28:26) déjà demander à Cloud ou à Codex d'utiliser Grock pour faire l'implémentation
(28:32) et du coup, j'ai pas encore eu le temps de tester directement cette fature là, mais on se le fera justement sur un sur
(28:39) sur un nouvel sur une nouvelle vidéo. Là, je veux vraiment avancer sur cette problématique des sprints [grognement]
(28:45) parce que mine de rien, en fait au début, je me disais "Ouais, ça pourrait être pas mal" mais en fait c'est très très bien. C'est très bien pour surtout
(28:52) sur les grosses tâches. Là par exemple, ben voilà, typiquement je veux sortir mon application, j'aimerais la la
(28:59) distribuer, mais je sais de base que il y a certaines choses qu'on a codé et qui
(29:04) sont agnostiques à mon poste, qui sont liés à mon poste quoi. [grognement] pardon qui sont liés à mon poste et pas
(29:10) agnostique. Et le l'objectif justement c'est de faire en sorte que si toi tu télécharges l'application et que tu
(29:15) l'installes sur ton PC, ben ça fonctionne de la même manière que si on l'installe sur Mac, ça fonctionne directement sans qu'on ait besoin de d'y
(29:23) toucher. Et là euh ben nécessairement en fait on va être obligé d'aller tester ça
(29:28) sur des PC quoi. Donc on va en gros simuler un PC, on va utiliser les VM, on
(29:34) va prendre une certaine version de Windows, une autre, une autre, une autre et puis on va faire bah 10 12 tests bien
(29:40) spécifiques sur des choses qui pourraient casser sur un poste différent. par exemple l'installation
(29:46) des CLI ou la mise à jour des CLI. Ben, il a fallu que je regarde pour chacun des CLI qu'on a voulu joindre au
(29:52) logiciel si euh bah le fait d'avoir au départ par exemple pour un exemple très
(29:58) concret au départ il quand il a installé Codex, il l'a installé avec NPM. Or en
(30:03) fait NPM euh nous les développeurs, on a toujours Node sur notre PC. fait la plupart des développeurs en note sur
(30:08) leur PC, donc ça pose pas réellement de problème. Si tu as, tu as installé NPM avec en général, mais par contre
(30:15) quelqu'un de lambda, Node, il l'a pas forcément sur son PC quoi. Je me vois pas embarquer la version de Node et
(30:22) installer faire installer Node, c'est tout un autre processus. Alors que là, bah par exemple, pour la version Codex,
(30:29) il existe l'installateur Windows et l'installateur Mac indépendamment. Et du coup, ben après avoir euh constaté ça,
(30:36) j'ai fait corriger Alia pour utiliser à chaque fois le bon processus. Ça c'est l'une des grosses
(30:42) problématiques que vous aurez. Si vous s'il y a des choses que vous spécifiez pas, euh ben peut-être qu'elles seront
(30:48) pas faites selon ce que vous souhaitiez avoir à la fin. Donc en gros, vu que
(30:53) c'est extrêmement difficile de tout prévoir, bah il faut pas hésiter à faire euh repasser euh une IAP ou faire un
(31:00) audit d'un endroit spécifique ou d'une chose spécifique. Et c'est là où la fonctionnalité Sprint pour moi, elle est
(31:08) extraordinaire. Tout ça, ça découle B d'un premier là. Ça c'est la deuxième
(31:13) mais la première couche, elle est par là. Voilà, en gros euh première euh
(31:19) première audit, il est ressorti toute une liste de choses à vérifier ou à corriger. Ben on a lancé le processus et
(31:26) là en gros euh ben étant un petit peu à cours de forfait cloud, euh j'ai j'ai gardé Cloud en orchestrateur mais il
(31:33) fait coder un agent Grock pour l'implémentation. Donc en gros, on a euh
(31:40) Cloud qui orchestre, donc qui pilote, il va il va il va faire le prompt et décrire la tâche, ouvrir le work, créer
(31:48) les les éléments dont dont le l'implémentaire a besoin pour réaliser son travail. Par contre, tout le travail
(31:53) va être fait par Grock et à la fin, ben admettons, c'est Soné qui va qui va faire la review.
(31:59) Et comme ça, ça me permet de de dépenser beaucoup moins avec Claude que si Clode
(32:05) fait la totalité de la chaîne. Voilà. Euh mais on reparlera des des diverses
(32:11) providers et de de de la chaîne qu'on peut qu'on peut avoir pour les faire
(32:16) travailler quoi. [grognement] Ça y est, on a enfin notre spec qui a été faite
(32:22) par Astra. Et donc on va aller là la regarder vite fait si on peut y avoir
(32:29) accès. On va aller regarder à quoi ça donne. Ce que ça donne pardon.
(32:37) Je pourrais essayer d'y accéder par là [grognement]
(32:42) éventuellement si j'y a accès. Non, forcément je n'y ai
(32:49) pas accès.
(32:56) H [raclement de gorge] il l'a mis dans un work où il aurait pas dû le
(33:01) mettre. Donc déjà lui il a en gros quand il travaille, il respecte pas nécessairement les choses qu'on qu'on
(33:08) lui dit. Il vient de créer un [rires]
(33:14) un work tree mais dans un endroit où il est pas censé créer un work et du coup ça engendre tout un tas de
(33:19) problématiques. Bon là pour le l'exercice en soi on s'en moque un peu mais ça c'est une problématique qu'il va falloir que je résolve aussi.
(33:26) [grognement] Certains agents écoutent extrêmement bien les règles, d'autres ils font un petit peu comme ils veulent quoi. Et on
(33:33) voit que Codex, il est un petit peu de ce type là où il fait un petit peu ce qu'il a envie.
(33:39) Donc on est ici. On va prendre par date, ça ira plus vite. Voilà.
(33:46) Et on va l'ouvrir. Allez,
(33:53) on va l'ouvrir dans VS Code une fois n'est pas coutume. Hop.
(33:58) Hop ! Qu'est-ce que c'est tous ces
(34:04) accents mis ? Euh,
(34:10) c'est hyper désagréable. Bref, on s'en moque un petit peu. Donc, qu'est-ce qu'il nous dit ? Il nous
(34:15) dit que on est sur le suivi des sprints déclarés dans le document attendu.
(34:20) Euh proposition de validation par l'opérateur.
(34:26) Ouais. Exécution proposée en propt. Donc là, en gros, il veut pas déléguer il
(34:31) veut faire le le truc lui-même puisqu'on lui demande de on lui demande de soit déléguer, soit de
(34:37) Donc je peux exiger qu'il délègue mais là pour lui on va le laisser faire sa tâche lui-même en tant qu'opérateur.
(34:44) OK. Constat contrats de référence les
(34:49) fichiers. C'est bien. Décose. La déclaration créée le travail de
(34:57) suivi. Ça c'est plutôt pas mal. Je pense que c'était le trou qu'on avait. La création reste un geste explicite par
(35:03) les chemins de cartes existants. OK.
(35:12) Ouais, pourquoi pas ?
(35:18) Ouais, ça c'est réel. OK. Euh, le type de travail est une donnée explicite. Oui, parfaitement.
(35:28) Les attentes documentaires sont distinctes de la disponibilité. Oui.
(35:35) Oui. Aussi. L'application restitue qu'elle a observé, c'est le mieux quand même. Les données antérieures restent
(35:42) explicites. OK. Et là, on voit qu'il nous met les scénarios d'acceptation.
(35:50) Scénario d'acceptation, on va pas tous les lire.
(35:57) Je vais inventer ça. [grognement] OK. OK. OK. OK. OK. OK. OK.
(36:05) Zé création sur ma matrice. OK, parfait. Validation prévu et limite. Les noms
(36:12) définitifs de test et le nombre de l'eau livrables seront arrêtés dans le plan après la validation de cet spec. Le plan
(36:19) citera cet oracle. Il distinguera les surfaces store persistance
(36:26) résolution documentaire UI et MCP. C'est plutôt bien. La maquette
(36:31) s'appuyera sur le volet sprint existant. Oui. Éventuel dialogue reprendre la
(36:39) On est bon. OK. Donc là, je vais valider son travail. Je pense qu'on est bien parti.
(36:44) Je valide. Donc ça c'est euh en gros ce qui
(36:50) pourquoi il s'arrête là, c'est une exigence qu'il a dans le skill feature. Dans le skill feature, l'objectif c'est
(36:56) quoi ? Il va d'abord faire de l'exploration. puisque bah il a besoin en fait d'acquérir du contexte sur ce ce
(37:01) qui existe réellement. Là pour le coup, c'est entre une résolution de bug et une nouvelle feature. Donc il va le classer
(37:08) dans feature parce qu'il va ajouter quelque chose mais en réalité il aurait tout à tout à fait pu faire ça en mode
(37:16) résolution de bug. Et là euh et donc c'est comme je disais tout à l'heure, c'est pas du tout le même travail qu'on
(37:22) lui demande. Donc d'abord il fait une spec, il s'arrête, il me fait valider la spec et je pense que ça c'est important
(37:28) parce que euh ben c'est l'aspect qui détermine le travail qui va être réalisé derrière. Si on vérifie pas l'aspect, si
(37:36) on prend pas connaissance de l'aspect, ben potentiellement, on va avoir quelque chose qui qui à l'arrivée qui ne sera pas du tout ce qu'on souhaitait au
(37:43) départ. Et ça, on essaie de le minimiser justement via le via l'ajout de ce skill
(37:49) qui est en gros une méthodologie de travail. On lui dit pas en gros comment
(37:54) il va travailler, on lui explique juste le cheminement qu'il doit exécuter euh pour arriver à faire la fature. Voilà.
(38:01) Et donc là, il va s'arrêter potentiellement une deuxième fois. C'est au moment où il voudra me faire valider le design s'il retouche à quelque chose
(38:08) sur la maquette. Et là, on voit qu'il est en train de retoucher la maquette. [grognement] Donc probablement qu'il va me faire valider la maquette. Et une fois que
(38:13) j'aurai validé la maquette, il va partir, il va travailler, il va il va
(38:18) réaliser sa fature, lancer ses tests, utiliser euh
(38:24) euh Playwgri s'il a besoin de faire des vérifications et à la fin, il va euh
(38:30) utiliser le hook prépush puisqueen gros, il a un hook à exécuter qui va réaliser
(38:35) les tests sil les a pas déjà réalisé avant. et euh et en gros qui va le
(38:40) bloquer si euh bah le travail demandé correspond pas avec les les exigences du
(38:47) projet. Donc les exigences c'est quoi ? C'est il y a une couverture de test minimal à obtenir. Euh il doit d'abord
(38:54) les créer rouges et puis ensuite les passer verts et cetera. Il a tout un cheminement à faire. Et s'il y a un texte un test qui passe pas par exemple,
(39:01) il peut pas merge, il peut pas pousser le code par guide quoi. Voilà.
(39:08) et il doit en gros dans le dans la dans la dans le suivi de la feature, il doit utiliser un autre un autre agent. Donc
(39:14) là, il utilisera probablement Sonny pour faire sa review en fait.
(39:21) [raclement de gorge] Voilà l'idée. Ici, notre cloud, bah il est parti sur la modification. Ça y est, il a eu notre
(39:28) réponse tout à l'heure. Ça lui a suffi, il est parti, il s'est mis au travail. Donc là, on est sur des modifications
(39:34) très simples, très basiques, mais enfin là là déjà c'est déjà moins basique. Ici
(39:39) c'est très basique. Et là on pourra [grognement] entamer une troisème modification basique. Pourquoi pas ? Et comme je disais tout à l'heure, on va
(39:45) revenir ici. Ici on peut pas sélectionner les vrais modèles en fait. Et donc là ça c'est très très
(39:51) problématique. Donc on y va. dialogue nouvel agent
(39:58) dans duo ou orchestration
(40:05) ou là euh les modèles
(40:12) dans les sélecteurs sont euh en dur. On peut lui dire ça comme
(40:19) ça. Vrai effectivement si vous êtes pas développeur, vous allez pas trop comprendre. Là en gros, ça vient du fait
(40:25) que quand on indique une quand on dans une application, on montre une
(40:30) information à un utilisateur, ça peut venir soit euh d'une donnée qu'on a
(40:35) encodé. Dans le code en dur, on a mis bah là c'est GPT3, GPT8, GPT12 ou on
(40:41) peut également avoir ben quelque chose qui va faire qui qui va qui va poser une question en fait au système
(40:46) littéralement. euh une fonction qui va être appelée à ce moment-là et qui va aller détecter par exemple les les
(40:52) modèles disponibles pour ce CLI. Et donc là, c'est ce que je vais lui je vais l'orienter vers ça. Je lui dis parce que
(40:57) je le je le remarque que c'est codé en dur, ça me plaît pas trop. Et donc ben là, on va également lui indiquer qu'on a
(41:03) déjà cette fiture. Ça sert à rien qu'il aille recoder quelque chose. On a quelque chose de l'autre côté qui fait à peu près la même chose. On va l'adapter
(41:10) pour le réutiliser ici. Donc je vais lui dire hein, je veux dire on a euh il y a
(41:16) quelques jours, non, il y a quelques jours,
(41:22) nous avons créé une fature
(41:29) dans le chat. pour faire en sorte d'avoir
(41:36) les modèles euh dynamique dicque
(41:46) depuis les Cali. Je veux qu'on corrige
(41:55) pour utiliser H. Je veux que tu réutilises
(42:04) cette fiture. Tu l'adaptes si nécessaire.
(42:12) Si nécessaire. Voilà. Là, je pense qu'on lui a donné suffisamment d'informations.
(42:18) On va voir euh bah ce qui ce qu'il va trouver. Est-ce qu'il a envie de est-ce qu'il a envie d'utiliser Fature ou
(42:24) est-ce qu'il a envie d'utiliser Bugfix ? Là, je pense que très
(42:29) clairement, il va utiliser feature. Donc, on voit qu'il utilise le le le
(42:35) skill using forge. Et forge, c'est mon plugin.
(42:40) Donc, en gros, il utilise le skill qui lui explique comment il doit utiliser le le plugin quoi. [grognement]
(42:47) Ça c'est plutôt pas mal. Sachant qu'ils ont une injection de mémoire en début de session. Donc en gros euh au au tout
(42:54) début de la session, ils ont des indexes de la mémoire du projet qui sont injectés.
(43:00) Ici, on a toute la mémoire de qui est disponible pour les agents. On voit également le nombre de fois qu'un
(43:07) qu'un qu'un souvenir a été appelé par les agents. Et là, c'est vraiment appelé par les agents ou appelé parce que
(43:16) le le le système se rend compte que la que la session en a besoin, quoi.
(43:22) Donc ici, bon c'est pour nous les êtres humains, c'est vrai qu'il y a certains trucs qui sont un petit peu voilà, ça
(43:29) demande un petit peu de de d'adaptation quoi. on comprend pas directement tout à
(43:34) première vue, mais euh je sais par expérience pour le voir au jour le jour
(43:40) que il y a certains euh il y a certaines choses qui sont nécessaires à être indiquées quelque part [grognement]
(43:46) parce que ben en fait on on a on a tendance à vouloir utiliser l'IA comme
(43:51) euh des oracles alors que ce sont pas des oracles. perder en tête que ils ont
(43:56) un certain nombre de paramètres, ils ont une certaine façon de généraliser et de résoudre les problématiques et euh et
(44:04) des fois leur seul euh euh mémoire
(44:10) comment on pourrait dire ça ? Leur leur mémoire d'entraînement, on va appeler ça, ne suffit pas tout le temps à
(44:16) résoudre la totalité des problèmes. Voilà, il y a il y a beaucoup de choses aussi qui sont liées au poste de
(44:23) travail. Moi ici que je suis sur un PC Windows, j'ai tout un tas de bibliothèques d'installer. Euh vous
(44:31) pourriez être sur un Mac ou sur un Linux avec d'autres bibliothèques d'installer et il aura du coup bah les commandes
(44:37) seront peut-être pas les mêmes et cetera et donc et les problématiques qui en
(44:42) découle ne sont pas forcément les mêmes. Et dans la mémoire, il va surtout ouais
(44:47) s'indiquer quand il a quand il quand il est tombé sur un piège par exemple qui lui a fait perdre une demi-heure sur une
(44:53) bêtise, bah ça il va pouvoir l'indiquer pour que la prochaine fois éventuellement si on retombe sur une
(44:58) problématique identique, [grognement] l'agent suivant tombera pas dans le même piège et ça nous fera éventuellement
(45:05) gagner un petit peu de temps. Voilà. Donc Codex, il adore le
(45:13) Nova Factory. Il va y piocher à chaque fois des des quantités de
(45:18) d'informations incroyables. Je suis pas sûr que tout soit très utile, mais
(45:24) là on voit qu' il va spécifiquement euh sur des
(45:30) sur [grognement] des souvenirs qui sont liés à justement la création de la fature précédente. Et c'est ça aussi que
(45:37) je me suis aperçu avec le teint, c'est que bah le fait d'organiser le travail
(45:42) autour de Sprint avec les informations
(45:47) du du qui ont qui ont qui ont découlé de la de l'implémentation,
(45:53) bah ça fait que la l'agent est capable de savoir que oui, quand on a fait ça ici là, quand on a fait cette tâche ici,
(46:00) ben voilà ce qui s'est passé. euh quand on a livré, ben on a constaté tel problème et cetera et cetera.
(46:06) Et du coup, ben toutes ces informations là, s'il les avait pas, potentiellement il
(46:11) retomberait dans le piège et on reperdrait une demi-heure et une tr d'heure et cetera. Sans compter que à
(46:18) chaque fois que ben qu'il va perdre du temps sur une problématique qui était
(46:23) pas la problématique initiale, euh bah c'est une dépense de token que vous vous
(46:28) souhaitez pas forcément faire. Voilà. Donc en gros, il faut arriver à arbitrer
(46:34) entre le fait de pas trop en mettre dans la mémoire non plus parce que l'idée c'est pas que vous démarriez la session à 300 cas de contexte. C'est pas c'est
(46:42) pas du tout l'objectif mais qui en est suffisamment pour que quand il démarre,
(46:47) il sait où il est quoi. Il sait pourquoi enfin qu'on a fait tel fature il y a 2
(46:53) jours que si si là ça bloque au moment de la la release, c'est parce que ben il
(46:59) y avait peut-être trois migrations lors de la release et cetera.
(47:04) Donc je pense qu'avec le temps, on économise euh quand même des tokens.
(47:10) Après, on en on y reviendra dans d'autres vidéos, mais au niveau de de l'économie de token, euh
(47:19) il y a un plugin, enfin un plugin, il y a un logiciel qui s'appelle RTK Token et
(47:26) je le trouve particulièrement intéressant. L'objectif, c'est que ça réécrit en gros [grognement] euh ça
(47:34) réécrit certaines commandes qui sont passées par les Cali. Donc là, on peut voir en gros sur la
(47:40) journée d'aujourd'hui que ça a réécrit à peu près 671
(47:46) commandes. L'entrée en token était de 817 K
(47:51) et la sortie a été de 489. Donc il y a eu une économie de 328
(47:58) K. Euh ou c'est le contraire ou c'est l'économie ici et la sortie là, pardon.
(48:04) Je pensais plus ça. Ouais. output et saved. Donc là, on est à l'output et on
(48:11) peut voir que ben par exemple sur une journée comme hier, en gros sur 73 qui
(48:16) sont rentrés, il y en a 5ion1 qui sortent donc on a économisé 2lion2 et pourtant ça représente que 30 %. En
(48:23) gros, on a on a très peu économisé là sur les derniers jours parce que ben les features qu'on fait sont pas forcément
(48:30) des fatures où où les commandes de l'agent vont être traitées. En gros, il y a pas toutes les commandes ne sont pas
(48:35) traitées par RTK. C'est principalement certaines commandes. Donc voilà, le GRAP, il
(48:42) permet d'économiser un petit peu, le raid aussi, mais on voit de plus en plus que les agents ils visent moins ces
(48:48) commandes là. [grognement] Donc forcément euh voilà, mais là où c'est relativement important, c'est sur
(48:54) les tests. Quand l'agent lance des tests, par exemple, il a pas nécessairement besoin d'avoir
(48:59) [souffle coupé] toutes les sorties euh liées au test et du coup ça va lui découper et lui laisser uniquement ce qu'il a besoin.
(49:05) Dans certains cas, ça va réduire, diminuer les espacements qu'il y a entre les les lignes et cetera et cetera. Ça
(49:11) vous fait économiser en gros une quantité de token assez pharamineuse et quand on en consomme énormément comme
(49:18) moi, c'est vrai que bah ça peut être quand même sympathique quoi. Si on une
(49:25) journée comme aujourd'hui, on n pas trop codé et du coup bon on est à 3 millions
(49:30) mais si on prend la journée juste la journée d'hier par exemple on était le 12 vo d'hier c'est c'est 17 c'est 19
(49:39) millions quoi 19 millions si on prend les 7 derniers jours. J'étais
(49:44) relativement calme mais le weekend dernier, il y a eu le il y a eu la sortie de
(49:51) il y a eu la sortie de du dernier codex là avec bah le reset de Claude et cetera
(49:57) et cetera et du coup là on a pu vraiment vraiment beaucoup s'amuser quoi.
(50:05) [grognement] Bien ici du coup on a notre
(50:10) cloud qui a terminé. On peut voir qu'il a fait ça en deux temps trois mouvements. Ça la panne est
(50:17) ouverte depuis 37 minutes 38 et donc il nous explique en gros ce qu'il a fait
(50:23) quoi. Le merge est passé. Napoly Biologue nouvel tient dans sa gamme. Parfait. Blab bla bla bla bla.
(50:31) Deux choses à savoir. Voilà ça ça à chaque fois que vous avez ce genre de point il faut les lien. C'est important
(50:37) en fait parce que souvent il vous donnent des informations. Des fois c'est des informations que ben vous savez donc
(50:43) vous avez pas vraim vous allez pas y faire réellement attention. Des fois c'est des informations que vous aviez pas forcément et qui sont importantes à
(50:49) prendre. Bon là pour le coup section P.hp.
(50:57) Donc là, il nous dit qu'en gros, il y a un autre endroit où il y a le défaut et il l'a corrigé au passage. Donc, mais a
(51:04) priori là, c'est très bien. Et il nous dit le work et la cache reste en place à nettoyer au prochain passage du skill
(51:11) nettoyage. Voilà, parce que oui, on a un petit skill nettoyage [grognement] parce
(51:16) que en gros dans le dans le moi j'ai j'opeur
(51:23) Python à la base. Voilà, j'ai appris à développer en JavaScript
(51:28) et et ensuite Python et et j'utilisais principalement ça. Python Django et des
(51:35) applications en JavaScript derrière. Mais je me suis vite rendu compte que le
(51:42) le le Python, ça permet de de faire un peu tout et n'importe quoi et JavaScript
(51:47) aussi. Et du coup, il y a il y a il y a pas assez de garde fou, je trouve euh
(51:55) pour coder sereinement avec Lia. souvent en fait, elle va elle va faire tous ses tests et tout mais après une journée de
(52:02) travail, on va se retrouver enfin après 5 si merges, on va se retrouver avec une branche où on a trois ou quatre tests
(52:09) qui passent pas ici, 4 C qui pètent là-bas et cetera et on sait pas trop d'où ça vient. On sait pas quel agent a
(52:15) laissé passer ça, mais la réalité c'est que ça laisse passer quoi. Et
(52:21) du coup pour je me suis aperçu en fait en développant une autre application que si on va vers
(52:28) des langages forts à fortipage ou notamment ben par exemple un Rust où
(52:34) quand l'IA va compiler et qu' y a quelque chose qui est pas conforme à ce qui est souhaité par le moteur, ben elle
(52:41) va avoir les flags, elle va avoir les erreurs, les lignes et même des fois même des des des exemples. de la manière
(52:49) dont elle doit exécuter le le le truc quoi. Donc c'est beaucoup plus sécurisant et ça permet surtout en gros
(52:56) je pense que c'est une question de retour. Si vous créez les gardes fou et que vous faites en sorte qu'elle puisse avoir les
(53:02) retours au moment de publier son code en Python par exemple, bah elle aura la même efficacité que mais là avec Rust,
(53:08) ce qui est intéressant c'est que c'est déjà dans le package. Donc vous lance elle elle lance le cargo et s'il y a un
(53:15) problème, elle elle va directement avoir les lignes où il y a le problème. Ici,
(53:20) on a notre ami euh qui nous qui nous propose de valider la [rires] valider la maquette, mais on l'a pas vu.
(53:27) Donc ça c'est encore un truc génial avec lui mais c'est pas très grave. Je vais
(53:34) aller la chercher. Il a dû nous faire ça comme il faut.
(53:42) Donc ma quête, j'imagine. Hm.
(53:53) Hm hm. On va regarder s'il l'a pas dit à un moment donné où c'est qu'il l'a mis.
(53:59) J'ai pas envie de chercher partout. Et là, vous comprenez pourquoi j'ai envie de créer un un bloc qui s'ouvre à droite
(54:05) et qui me montre où c'est qui crée ces documents. Parce que j'ai déjà essayé de faire mais avec peu de
(54:13) Voilà, c'est ici. C'est dans Doc Conception en fait. Il l'a juste mis à côté quoi.
(54:20) Doc conception et on doit être ici.
(54:28) Paf ! Et on va se regarder la petite maquette qui nous a faite. Voilà. Donc
(54:35) le le le truc est bien rodé quand même parce que bon, il te met il te met même les il te met même le changement de
(54:42) style et tout. [grognement] Et si tu valides ici, ça veut dire que c'est déjà bon parce qu'il utilise les
(54:49) éléments de l'application, quoi. Donc là, il nous fait quoi ? Il nous
(54:55) fait quoi ? Il nous fait quoi ? On a le sprint rattacher un con ouvrir.
(55:03) OK, là ça s'ouvre à droite. Je sais pas pourquoi il a été m'ajouté. C'est
(55:11) Ah non, OK. C'est moi qui a confond divers affichages en fait. Je vais me
(55:16) mettre un cuivre. Je préfère le titre. OK, pourquoi pas Merg. Donc là, on voit
(55:23) que c'est Merge. Ah, et là, il nous mettrait directement.
(55:31) J'ai un petit problème. J'ai l'impression qu'il a totalement oublié le coco que il y a d'autres choses ici
(55:36) dans le formulaire. fait de passe.
(55:42) Donc euh
(55:47) donc là, il manque des trucs, hein. On va voir avec lui.
(55:53) Fonctionnalité. OK. Nom précisé.
(56:04) OK. Donc là, il nous montre en gros les divers les divers types de
(56:09) fonctionnement. C'est c'est pour qu'on puisse passer de l'un à
(56:14) l'autre quoi. Bon, c'est un peu un excès de de de zel,
(56:21) mais bon, c'est pas très grave. On va s'en contenter.
(56:27) Euh
(56:39) il y a un truc qui me gêne quand même. Il y a un truc qui me gêne. Je trouve ça fait très très gros pour pas grand-chose.
(56:57) Je vais la valider. Je vais la valider. Je vais pas être exigeant parce qu'en fait ce qui m'importe surtout c'est la
(57:03) la fonctionnalité finale et euh
(57:10) et ensuite si besoin, je ferai comme je viens de faire avec les deux autres tout à l'heure, j'adapterai le front un petit
(57:16) peu plus tard parce que en soit il il il change pas grand-chose hein. Il ajoute
(57:22) ce bloc là document qui vient nous dire si c'est trouvable ou pas. Ça évite d'aller cliquer en haut.
(57:29) Sachant que bon donc on va accepter ça comme ça. Après
(57:36) voyez ces boutons là et tout il va pas les refaire en fait il les a mis juste pour que ce soit joli. Et du coup on
(57:41) voit tout de suite que bah c'est pas adapté quoi. Mais c'est pas très grave. Encore une fois, il faut en fait, il
(57:48) faut savoir utiliser les les outils qui nous qui nous montrent là pour faire ça quoi.
(57:55) J'étais en train de dire oui, la maquette, la maquette en soi, il faut pas enfin faut pas pour moi faut pas
(58:00) aller vers la perfection ça. Le but c'est pas que le que que ce soit parfaitement conforme à ce que j'aurai.
(58:07) Le but c'est que ce qui va changer soit conforme à ce que j'aurai. Je sais qu'il va pas toucher au bouton dispatch en bas. Je lui ai pas demandé, il a aucun
(58:13) intérêt d'y toucher, donc il touchera pas. [toux] Donc voilà, ici du coup euh sur notre
(58:23) problématique ici du modèle qui est pas dynamique, bah ça y est, il nous a fait un petit retour. Codex, qu'est-ce qu'il
(58:30) nous dit ? Il nous dit qu'il a retrouvé le catalogue du chat, celui que on a codé
(58:35) il y a quelques jours. Donc ça c'est plutôt pas mal. Ça veut dire qu'il a compris queil allait pouvoir le raccorder. Le raccordement doit aussi
(58:41) gérer doit aussi adapter le backend qui refuse actuellement les nouveaux identifiants
(58:46) de modèle. Ça c'est problématique, hein. [soupir][souffle coupé] [grognement] Donc il va nous corriger tout ça. Là, il nous dit que il y a la
(58:52) spec ici et l'aperçu ici. On va regarder à quoi ça ressemble.
(59:00) Même si en soit il n'y a pas de modification.
(59:07) à jour. Ouais ouais ouais ouais.
(59:13) Alors là, je vais je vais lui je vais lui je vais lui mettre une un petit un petit olé olé
(59:20) parce qu'en gros j'aime pas trop ce truc où il va me mettre aucun modèle découvert parce qu'en gros il va faire
(59:26) un truc où il va découvrir les modèles et tout mais moi j'aimerais bien que la découverte des modèles, elle se fasse
(59:32) par exemple au lancement de l'application ou éventuellement après la mise à jour du CLI. Ce qui pourrait être
(59:38) intéressant quand on met à jour le CLI. Je sais pas moi, Claude demain il sortent Claude Opus 5.1. Bah, j'aimerais
(59:44) que quand je vais mettre à jour mon CLI, ça fasse la détection et que ça le trouve parce que là aujourd'hui, lui, il
(59:50) va me faire ça, je l'imagine, il va me faire ça ici là. Donc, je vais ouvrir ma ma ma ma ma mon petit select et je vais
(59:57) avoir ma détection et ça ça me plaît pas du tout. Donc je vais lui dire, je vais lui dire tout de suite. La détection
(1:00:05) euh détection des modèles
(1:00:10) doit intervenir au lancement de l'application
(1:00:19) et également
(1:00:25) un refresh au moment.
(1:00:31) Euh par au moment après la mise à jour
(1:00:36) d'un CLI.
(1:00:47) Je veux pas je veux pas de bouton
(1:00:52) actualiser ou de liste par défaut.
(1:01:07) On clique sur nouvel agent, je veux déjà avoir la liste disponible.
(1:01:15) Donc là, j'en profite en fait pour en plus de le de le de lui faire
(1:01:22) implémenter une fiture enfin implémenter de lui faire implémenter cette fature
(1:01:27) dans un autre endroit d'où elle était au départ, ben en plus j'en profite pour lui dire "Attends, parce que à la base
(1:01:32) ici là ce que tu m'as fait dans le chat, j'aime pas du tout. J'aime pas que ici je me connecte et j'ai pas ma liste à
(1:01:38) jour en fait c'est juste pas possible. Moi quand j'arrive ici, quand je sélectionne cloud, je veux pouvoir avoir
(1:01:43) mon opus, mon machin, mon bidule sans avoir à me poser des questions sur ah
(1:01:49) est-ce que il a fait son col ou pas quoi. Donc ici, on va mettre ça comme ça. On va lui on va lui spécifier en
(1:01:56) gros qu'il doit faire ça comme ça. Donc là, il nous dit qu'il a compris. Le dialogue utilisera une liste déjà
(1:02:03) chargée sans bouton actualisé, ni liste de secours codé en dur. La découverte se
(1:02:08) fera en arrière-plan au démarrage puis à la mise à jour d'un Cli.
(1:02:15) Voilà, ça sert uniquement à afficher, on est bien d'accord. Donc là, il a compris, il va se mettre au boulot. Lui,
(1:02:22) il emmerde son travail. Je pense que là, on doit avoir notre petit sprint ici qui
(1:02:27) a été complété. Voilà, on le voit là. et ce qui nous a fait et lui il avait pas
(1:02:33) fait non plus la chaîne et c'est normal puisque c'est également un bug fix en quelque sorte parce que la
(1:02:41) police était pas conforte. Bref, vous avez vu un petit peu l'idée
(1:02:47) là. On va laisser Codex travailler. [grognement]
(1:02:54) Pendant qu'il travaille, on va relire un petit peu ce qu'il fait.
(1:03:01) On peut s'agrandir ça pour avoir plus de place. Alors, on n'est pas obligé de tout lire
(1:03:08) en permanence. Moi, j'aime bien, ceci dit, euh de temps en temps, jeter un œil à ce qu'il raconte entre les entre les
(1:03:15) les modifications qu'il fait. Souvent, ça donne une indication de s'il galère, si il a pas trouvé telle ou telle
(1:03:21) information. Des fois, en fait, il va trouver des informations que vous-même vous saviez même pas qu'elle était là.
(1:03:27) des fois, au contraire, il va galérer à trouver un truc qui est évident pour vous. Bah, dans ces cas-là, dites-lui quoi, ne le laissez pas chercher 3h.
(1:03:34) [souffle coupé] Euh, à chaque fois qu'il lance une commande, euh vous payez en écriture. Chaque fois que euh qu'il va
(1:03:41) faire trop de recherche alors que bah si vous lui aviez expliqué euh, il y était arrivé direct, bah c'est des tokens que
(1:03:47) vous dépensez que vous auriez peut-être pas euh pu pardon, peut-être pas dépenser. [grognement] Donc euh donc ça
(1:03:54) c'est quand même à manager un minimum. Mais après bon, est-ce qu'on va aller lire la totalité de du des values qu'il
(1:04:02) a mis des inserts et cetera ? Non, moi c'est pas mon c'est pas mon truc très
(1:04:08) clairement. Je l'ai eu fait à une période. C'est vrai que quand on prend en septembre l'année dernière euh oui LIA
(1:04:16) c'était pas l'IA d'aujourd'hui très clairement. une fois sur deux quand il modifiait un fichier, il cassait le le
(1:04:21) l'indentation ou il cassait une partie du fichier ou il remplaçait pas la bonne ligne. Bref, ça pouvait très vite
(1:04:27) devenir catastrophique. Aujourd'hui, bon euh ça arrive de moins en moins.
(1:04:34) Après, ça arrive de moins en moins parce que souvent ils sont beaucoup plus procédurals, ils font relativement
(1:04:40) attention à enregistrer les données avant. S'il fait une bêtise, il les remet. Euh et un un point que je tiens à
(1:04:48) à souligner pour les les gens qui sont pas dans le développement, à mon avis,
(1:04:55) c'est ultra important d'utiliser euh des outils de versioning comme GitHub, gitab
(1:05:01) euh et cetera. Euh justement parce que ben vous vous avez votre projet qui est
(1:05:07) enregistré, l'agent lui il va travailler sur en quelque sorte une copie de votre projet. Euh et si si ça va pas en fait,
(1:05:16) si à la fin fonctionne plus parce qu'il a tout cassé, bah vous êtes pas obligé de de pousser ce code là euh dans le
(1:05:22) dans le centre de euh dans le main de votre de votre projet et du coup ça ça a
(1:05:29) beaucoup moins d'impact. Pareil s'il supprime le projet en local. Bon, il y a pas vraiment de problème. On on on l'a
(1:05:35) sur guit. Ça c'est à faire très attention. Moi, j'utilise euh les agents
(1:05:41) en bypass permission. Tout le monde n'est pas obligé de faire pareil. Je pense qu'au début d'ailleurs, il faut
(1:05:47) acquérir une certaine confiance avec les outils. Petite anecdote, il y a il y a environ un mois quand j'ai commencé à
(1:05:54) utiliser Grock, euh vu que j'utilisais Codex, que j'utilisais Cloud et que ça fonctionnait plutôt bien, je me suis
(1:06:00) senti pousser des ailes et j'ai filé les mêmes accès à Grock. et euh il est parti
(1:06:06) faire un band d'essai pour l'installation de d'un nouveau provider justement sur l'outil. [grognement] Sauf
(1:06:12) que euh la commande suppression qu'il a fait, la commande récursive en suppression qu'il a faite dans le
(1:06:18) dossier home à manqué de supprimer le PC en entier quoi. Voilà. Et là, c'est moi qui lui avait donné la permission. Je
(1:06:23) peux pas me plaindre du modèle, il était en bypass permission. Donc il faut quand même faire assez attention à ça. Après,
(1:06:30) j'ai quand même du mal à j'aurais du mal à utiliser un Open Clow ou un Hermes sur
(1:06:36) un serveur distant. Parce que pour être très honnête, déjà avec la grosse
(1:06:41) machine que j'ai aujourd'hui, euh dès que j'ai deux trois quatre agents qui
(1:06:46) travaillent en même temps, ça peut devenir compliqué très honnêtement quand il y en a deux ou trois qui vont se
(1:06:52) mettre à lancer les tests en un temps qu' en a un qui fait un un benchmark de l'autre côté et cetera, ça ça tire très
(1:06:57) très vite sur le système et du coup, je vois pas comment sur un VPS en fait, je pourrais avoir la même vélocité de de de
(1:07:06) livrable, quoi. Donc donc je reste avec Lia sur mon PC.
(1:07:14) On verra peut-être qu'un jour ça me causera du tort mais pour l'instant l'expérience me donne raison.
(1:07:20) Qu'est-ce qui nous dit notre petit codex ici ? Il nous dit que c'est corrigé.
(1:07:27) Il a fait sa petite correction ici.
(1:07:34) Euh
(1:07:42) ouais, c'est pas mal. De toute façon, il corrige que du physique lui. Donc
(1:07:52) on est bon. Je valide. [grognement]
(1:08:00) Alors, on va regarder comment il a découpé justement son travail, notre petit codex. Et en fait, il s'est pas
(1:08:06) embêté. Euh, on le voit ici pour la fiabilisation des
(1:08:11) des cartes sprint et leur document. Il a fait une seule tasque. Pour lui, ça n'en
(1:08:17) nécessitait pas plus.
(1:08:26) Parfait. Écoutez, on va voir combien de temps il met ici. On a
(1:08:35) Ouais, ça c'est l'autre c'est l'autre tâche justement. Et ici d'ailleurs à lui, je vais lui rajouter un truc. Je
(1:08:41) vais dire euh il n'y a
(1:08:47) en fait je vais pas faire ça. Je vais pas faire ça parce que je vais le perturber dans son travail. Je vais plutôt ouvrir une autre panne et je me
(1:08:56) lancerai là-dessus après. Euh
(1:09:01) parce que j'aimerais bien revoir l'ordre en fait. Ici quand j'arrive il y a pas vraiment de logique. Je vois un truc
(1:09:07) ouvert il y a 10 jours. Je vois un truc ouvert hier là. ouvert aujourd'hui.
(1:09:14) Il y a pas vraiment de logique. Ça faudra que je le corrige aussi. J'aimerais pouvoir réouvrir euh les
(1:09:21) clôturés. Là, c'est tous les chantiers qu'on a mené bah ces dernières semaines,
(1:09:26) c'est ces deux derniers mois quoi, depuis que la feature existe. Donc bon,
(1:09:32) vous voyez, c'est ce que je disais tout à l'heure, il y a ça fonctionne quand même bien. Il y a pas de il y a pas de
(1:09:39) souci. On a réussi à mener à bien pas mal de chantiers sans sans sans problématique. Mais comme toute chose en
(1:09:46) fait, c'est pas parce que ça fonctionne que c'est parfaitement euh adapté à ce qu'on souhaite quoi. Moi ce qui me gêne
(1:09:52) beaucoup là c'est ça, les 100 sprint là, la quantité de de tasque que j'ai qui
(1:09:57) sert à rien en fait. Tous ces trucs de sauvegarde et tout. Je
(1:10:04) veux plus qu'elle y soit quoi. C'est tout l'objectif de de la tâche que
(1:10:09) qu'a pris l'autre codex. On va laisser ça de côté pour l'instant. On va se concentrer sur les sur les deux
(1:10:15) qui restent. Mais voilà, en gros, vous voyez là, vous
(1:10:20) avez un petit peu tout le tout le panel de ce qu'on fait
(1:10:28) en tant que développeur avec UNIA. aujourd'hui, c'est pas parce qu'on plus de de feures nous-même, parce qu'on
(1:10:35) écrit plus directement du code que euh qu'on est qu'on qu'on ne fait plus rien
(1:10:42) du tout. Euh au contraire même, je pense que plus on cherche à déléguer euh ou à
(1:10:49) faire son travail à et moins on est maître du résultat. Donc pour moi en
(1:10:55) gros, il faut déjà le tout ce qu'on tester. Pour moi, c'est
(1:11:02) c'est le c'est le B à bas. En gros, si je crée une fature et que je la je la teste pas, ben
(1:11:08) je je peux pas savoir si elle fonctionne, si elle fonctionne bien, si elle correspond parfaitement à ce que je voulais ou pas. Et du coup la la la
(1:11:14) personne à la fin qui valide, c'est toujours moi. C'est jamais eux. Ça c'est la la la première chose. Et l'autre
(1:11:22) chose, c'est dans la planification. Moi, je veux être proactif dans la planification. Lancer un prompte et m'en
(1:11:29) aller me balader, revenir 3h plus tard et voir que c'est fait. Oui, j'aimerais bien mais la réalité
(1:11:36) c'est qu'aujourd'hui c'est pas du tout comme ça que ça se passe. Euh potentiellement là elle va tomber
(1:11:41) sur un truc dans dans 10 ou 15 minutes. Elle va tomber sur un truc où ben elle
(1:11:46) elle a pas envie de décider pour toi et donc elle va te poser une question et si tu es pas là pour y répondre déjà ben tu
(1:11:54) tu vas enfin elle va attendre dans le vent. Et de deux en fait c'est une question de qualité. Si je décide pas
(1:12:01) moi de faire ces choix-là, ben elle va les faire. Mais euh mais ça correspondra
(1:12:07) beaucoup moins à ce que je souhaitais au départ. C'est ça. Enfin voilà, il y a une chance que ça [grognement]
(1:12:13) corresponde à ce que je veux. Mais plus tu es exigeant dans le résultat souhaité
(1:12:18) et plus il y a de chance que ça soit pas du tout ce que tu veux quoi. Voilà.
(1:12:25) Donc coder avec Lia, c'est viable. Pour moi, il y a pas de problème. Aujourd'hui, LIA est tout à fait capable
(1:12:31) techniquement de de de concevoir du code et du code qui fonctionne. Euh mais
(1:12:38) entre ce que vous vous souhaitez et ce que elle va réaliser,
(1:12:43) euh la la la différence de résultat en fait, c'est votre travail à vous. C'est
(1:12:49) ce que vous vous c'est êtes-vous capable de lui apporter le contexte nécessaire à la réalisation de la tâche. Voilà. Et
(1:12:54) quand je parle de contexte, c'est pas juste qu'elle aille lire les quelques fichiers, c'est aussi qu'elle comprenne l'intention euh que vous avez quoi.
(1:13:01) Pourquoi vous voulez modifier ce code, qu'est-ce qui fonctionne pas, euh qu'est-ce qui vous dérange, quelle est la friction et cetera et toujours
(1:13:08) apprendre de ce qui s'est passé. Si il y a ben là, si durant la réalisation il y
(1:13:13) a un truc qui se passe mal, il faut que je comprenne pourquoi ça s'est mal passé. Donc là, par exemple, l'une des
(1:13:19) choses qui va se passer quand elle va avoir fini quand va avoir fini cette tâche là.
(1:13:24) Euh ben je vais lui demander pourquoi elle a été me créer le work dans un dossier WT à la racine de E du disque
(1:13:33) dur E pardon alors que en théorie elle est censée le mettre dans un dossier work dans le dossier de l'application
(1:13:41) et on verra selon ce qu'elle me répond comment je peux euh corriger pour que la
(1:13:47) fois prochaine elle le crée au bon endroit en fait le dossier. Alors là, c'est un petit incident, mais
(1:13:54) c'est un petit incident qui peut très vite être casse pied parce que ben quand je vais lancer mon skill justement de
(1:14:00) nettoyage des work déjà merge parce que souvent ils oublient en gros les agents il a oublient de le supprimer, tu peux
(1:14:07) rajouter une règle mais des fois ils l'oublieront ou des fois il c'est pas qu'ils l'oublieront mais c'est qu'en fait eux ils sont eux-mêmes lancés dans
(1:14:15) le dossier en question et donc s'ils essaient de supprimer le dossier le système va leur refuser parce que ben,
(1:14:20) ils sont ouverts directement dedans. Donc il y a plusieurs problématiques, mais quoi qu'il en soit, s'il m'en
(1:14:26) disperse un peu partout, en gros quand l'autre il va vouloir nettoyer, il va en trouver certains, mais d'autres il les trouvera pas. Donc il va m'en rester sur
(1:14:32) le disque dur. Et en fait avec
(1:14:38) les frontes en React ou en
(1:14:44) ou en JS, enfin bref, vous vous faites des builds. En gros, bah si on nettoie pas ces builds, au bout d'un moment, ça
(1:14:50) prend énormément de de place sur le sur le PC. Là, si je les laisse coder, si j'en lance 4 5 et que je les laisse
(1:14:56) coder toute l'après-midi, ce soir, ils ont bouffé 500 Tra 500 Go à 1 T sur mon
(1:15:02) disque dur. Et donc forcément, ben c'est vu que c'est pas illimité, il faut
(1:15:07) régulièrement nettoyer quoi. Donc là, on va essayer de faire en sorte que la prochaine fois il respecte les
(1:15:14) règles. Et avant, il est respecté. Donc il y a un truc qui a changé, c'est peut-être quand j'ai changé ma
(1:15:19) J'ai un petit peu revu Forge il y a quelques jours parce que je me suis dit peut-être qu'on peut réduire le nombre
(1:15:24) d'instruction mais peut-être qu'il y en a certaines au contraire qu'on a supprimé qu'on aurait pas dû. Donc on va
(1:15:29) regarder ça et c'est toujours c'est c'est ça qui est je trouve et d'un côté
(1:15:34) des fois exaspérant dans notre métier et d'un côté qui est qui est qui est qui est bien c'est que ben le c'est pas
(1:15:41) parce que vous avez créé quelque chose qui fonctionne aujourd'hui que demain ça correspondra toujours à votre besoin et
(1:15:47) il est important d'évaluer en fait la portée de ce que vous connaissez quand vous mettez en place un système bah il
(1:15:53) faut essayer de penser l'évaluation de ce système. Par exemple,
(1:16:00) quand j'ai mis en au début, j'ai mis en place la mémoire et je me suis rendu compte que en fait j'avais perverti le
(1:16:06) le le le truc parce que déjà j'avais pas mis de système
(1:16:12) d'évaluation, donc j'étais pas capable de savoir si oui ou non les agents ils utilisaient réellement les les les
(1:16:19) choses qu'ils inscrivaient dans leur mémoire. Ensuite, je me suis rendu compte que dès que tu leur mets des outils à disposition, ils les utilisent.
(1:16:26) il les utilise à tort ou à raison. Il y a des fois où c'est hyper intéressant. Il y a des fois où au contraire il bour
(1:16:32) la la pour la mémoire. Par exemple, à chaque fin de tour, il me mettait trois quatre trucs de mémoire et c'était pas
(1:16:39) tout n'était pas pertinent. Et je me suis rendu compte qu'en fait tu ne peux pas enfin il faut éviter un maximum de
(1:16:46) faire 25 actions différentes à un seul agent. Si la fature elle est très importante,
(1:16:53) si tu as une grosse fature à coder comme ben par exemple le la mise en conformité
(1:16:59) pour la sortie de l'application Windows, je vais bouger là [toux][raclement de gorge] là une fature avec 23 tasques dedans, 23
(1:17:08) points à réaliser indépendamment les uns des autres, mais qui peuvent se toucher les uns les autres, ben en gros, un seul
(1:17:14) agent euh il aura jamais assez de contexte, jamais. Donc euh c'est là où
(1:17:20) je me suis orienté vers un modèle où j'essaie de d'avoir un modèle qui orchestre et qui ne code jamais. Il doit
(1:17:27) pas faire une ligne de code lui et il utilise des sous-agents internes ou externes dans notre provider pour
(1:17:33) réaliser les tâches. Et euh donc oui, ça ralentit le processus. C'est clair que c'est pas euh
(1:17:42) vous avez pas la même efficacité euh en temps quand vous utilisez un seul agent ou quand vous en utilisez un qui pilote
(1:17:47) 10 autres agents. C'est évident. Mais par contre en terme de qualité euh ça
(1:17:53) change du tout tout. Avant j'avais il y a encore 3 mois, j'avais des des des agents des fois on partait sur une
(1:18:00) fiture, on on faisait l'aspect, on réalisait le plan ensemble, je réalisais tout, je validais tout. Et arrivé à la
(1:18:07) fin, je me rappelle que j'avais une question que je leur posais toujours, c'est "C'est bon, tout est fait, tout est branché et on a complètement terminé
(1:18:14) quoi." Et souvent en fait, il va te répondre honnêtement que non. Il va te dire "Ah ben non, en fait, j'ai codé
(1:18:21) tout mais bon ben là, je me suis arrêté pour diverses diverses raisons." Claude souvent c'est dès qu'il atteignait un
(1:18:27) certain niveau de contexte, il s'arrêtait. Et donc moi à cette époque là, je me dis
(1:18:32) c'est pas possible, il est feignant en fait. Mais c'est pas qu'il est feignant, c'est parce qu' fait au bout d'un moment son contexte a tellement grossi que il
(1:18:38) sait plus où c'est qu'il habite le le le modèle en fait. Il sait plus où donner de la tête quoi. Donc il va faire quoi ?
(1:18:45) Il va relire ses derniers ses derniers transcripts, il va dire "OK, c'est bon, j'ai fait ça euh bah c'est bon, la
(1:18:50) fature elle est faite quoi." Et donc il s'arrête. Alors que ben là déjà avec le sprint et les tâches, il sait sur quelle
(1:18:59) partie il est. Euh le celui qui code, il il a même pas la plupart du temps
(1:19:05) connaissance de tout ce qu'il a autour. Il a juste son objectif de cette petite tâche à réaliser mais qui fait partir
(1:19:12) d'un énorme ensemble de d'un gros sprint. Et pour moi, c'est ça qui est bien. Et là par exemple, ben je je je me
(1:19:19) remets dessus sur cet exemple en particulier, mais c'est une énorme tâche en fait. Là, il y a il y a il y a à
(1:19:26) chaque tâche des fois c'est plusieurs heures de travail d'un agent.
(1:19:31) impléteur qui va lui-même utiliser les sous-agents pour le l'assister dans l'implémentation.
(1:19:36) Et du coup, à partir du moment où on a autant de profondeur, ben nous en tant
(1:19:41) qu'humain, on n plus la capacité de de de lire. Si vous utilisez Cloud, par exemple, Clode Code, bah vous lui dites
(1:19:48) d'utiliser des sous-agents, vous voyez pas les transcripts des sous-agents, vous savez pas ce que le sous-agent est en train de faire, s'il bloque sur un
(1:19:53) problème particulier. Euh ça c'est l'agent principal. s'il regarde le transcript qu'il pourra le voir.
(1:20:00) Alors aujourd'hui, ils ont mis des ils ont mis des des systèmes qui leur permettent de de de communiquer entre
(1:20:07) agents. Mais c'est vrai que hors hors ces systèmes-là euh vous avez un agent principal qui attend que les sous-agents
(1:20:13) aient exécuté le travail sans réellement vous-même avoir la vision sur ce qui se passe. Donc si au départ vous avez mal
(1:20:20) organisé votre truc, bah à l'arrivée vous pouvez vous retrouver avec un un monstre de Frankenstein. C'est voilà. Au
(1:20:27) début, j'avais des trucs encore plus euh des systèmes encore plus poussés où euh
(1:20:33) j'avais un orchestrateur qui préparait euh le travail en chaîne pour plusieurs
(1:20:39) agents. Donc par exemple euh bah là j'ai combien ? J'ai on a dit c'est 20 Ouais,
(1:20:46) j'ai 23 euh tasques en gros dans ma dans mon sprint. Ben imaginez que il aurait
(1:20:52) mis il aurait [grognement] mis un agent euh pour les tests euh en premier. Donc
(1:20:58) le type qui fait les tests rouges, l'implémateur qui implente et fait
(1:21:04) passer les enfin et via son implémentation, les tests vont passer au vert et du coup on valide le fait que
(1:21:11) les tests fonctionnaient. Et en dernier, on avait un reviewer et le reviewer, il pouvait relancer un
(1:21:20) implémentaire si ça correspondait pas ou s'il y avait un truc qui déconnait. Et donc comme ça, on avait des boucles
(1:21:25) itératives infernales infernales où tu avais tu étais euh des fois j'ai fait 50
(1:21:31) millions de tokens sur une seule fiture. Une seule fiture, 50 millions de tokens plus d'une jourfin une journée de
(1:21:37) boulot. Et à l'arrivée, ta feature, elle elle est toujours pas elle correspond
(1:21:43) toujours pas à 100 % à ce que tu voulais au final. Donc c'est là où tu
(1:21:49) euh proportionner. Il y a des choses qu'on a besoin, il y en a d'autres qu'on a moins besoin. Il faut faire attention
(1:21:56) à pas trop à En gros, c'est euh on doit scale up au fur et à mesure que l'outil
(1:22:01) fonctionne et pas euh partir tout de suite sur une méga usine avec euh 45
(1:22:07) agents qui travaillent en en coordination et tout sans même avoir évalué le si si ça fait gagner de la
(1:22:14) qualité ou si au contraire on est en train de balancer des tokens par la fenêtre. Et et aujourd'hui, en gros, les
(1:22:21) elles sont certes beaucoup plus élaborées qu'avant, elles font moins d'erreurs et elles sont bah ell elles
(1:22:27) arrivent bien mieux à combler nos attentes. Mais je le répète encore une
(1:22:33) fois, c'est pas des oracles. Il faut pas croire qu'elles ont tout le savoir de l'humanité. C'est faux. Et au contraire
(1:22:40) même, il vaut mieux l'encourager à aller chercher l'information plutôt que de se baser sur ses sur ses acquis de de
(1:22:48) d'entraînement parce que déjà en fonction de des modèles euh les hallucinations elles
(1:22:54) sont elles sont à géométrie variable. là avec le dernier euh Astra, ils ont
(1:23:00) réussi à bien améliorer le système. Mais c'est vrai que j'ai pété 5.6 quand j'ai commencé à l'utiliser, je je l'utilisais
(1:23:08) que sur des tâches mais vraiment très simples. Dès queil y avait un peu de complexité, euh il travaillait des fois
(1:23:14) 2h30, il me disait que c'était terminé, je testais la fonctionnalité, elle fonctionnait pas du tout quoi. Et là,
(1:23:20) c'était frustrant. Et souvent tu remarquais quand même que c'était très lié à l'hallucination quoi. Le modèle il
(1:23:28) se faisait un petit peu toute une histoire autour de de ta demande quoi. Et là on remarque que c'est en train de
(1:23:35) s'inverser. Astra est beaucoup moins dans le l'invention, beaucoup plus dans
(1:23:40) la preuve et Claude, il a toujours ce comportement euh de
(1:23:47) moi, il adore, il fait des bancs, il fait des bans parce que sur un autre projet, en gros, euh
(1:23:53) je j'ai fait un un logiciel de traitement de d'images astro astrophoto parce que je fais un peu d'astronomie et
(1:23:59) tout en amateur et et justement, je voulais utiliser l'accélération GPU pour faire le traitement des images.
(1:24:06) Et en gros, pour reproduire certains certains algorithmes, on est parti de de
(1:24:12) de du document, la publication euh paru sur les revues scientifiques,
(1:24:18) quoi. et et en gros il faisait des itérations ou il
(1:24:24) faisait un ban d'essai euh il faisait ses ses tentatives euh et ensuite il
(1:24:31) avait une image sortie d'un autre logiciel pour contrôler que son travail correspondait
(1:24:38) à ce qu'on souhaitait ou pas. Et comme ça, en gros, j'ai réussi à reproduire des algorithmes ultra complexes juste
(1:24:45) par littération, par le fait de laisser le modèle aller dans une dans une direction ou une autre direction.
(1:24:51) Sachant que il avait des on avait déterminé des critères bien particuliers. Par exemple, j'avais des liserets très très verts sur le haut des
(1:24:58) étoiles et en gros ça c'était lié à l'algorithme de déburer qu'il utilisait.
(1:25:04) et on a du coup été cherché l'article scientifique machin avec des bandes d'essai et tout et et là on a réussi à
(1:25:09) avancer. Donc Claude est capable de le faire mais souvent il a il a tendance à répondre de manière confiante quelque
(1:25:16) chose qui est souvent très éulcoré face à la réalité. Moi, c'est vrai que j'ai
(1:25:21) pris ce réflexe très souvent de lui dire "Ben vas-y, écoute, essayons, montre-moi." Tu te mets dans un dossier,
(1:25:28) tu démarre, tu installes tes prérequis et tu me montres tu me montres si ça fonctionne quoi. Et comme ça, j'arrive à
(1:25:35) des résultats bien plus intéressants. Mais il n'empêche que souvent je le vois
(1:25:41) quand il part sur sa quand il fait sa spec et tout, il part de du principe que telle chose fonctionne de telle manière
(1:25:46) et à l'arrivée on s'aperçoit que ça fonctionne pas du tout de la manière dont il avait [souffle coupé] dont il
(1:25:51) est don dont il parti du principe que ça fonctionnerait au départ quoi.
(1:25:56) Voilà. Bon je pense que je vais m'arrêter pour ici ici pour aujourd'hui.
(1:26:03) Je laisserai le le petit résultat plus tard. [souffle coupé]
(1:26:08) [grognement] Euh je reprendrai en fait la prochaine vidéo, je reprendrai là-dessus. On verra ce qui a été réalisé et et on avancera
(1:26:17) comme ça. J'espère que ça vous a plu. J'espère que vous apprenez des choses et
(1:26:23) puis je vous dis à bientôt pour une prochaine vidéo. Bye bye.
