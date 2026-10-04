# Créer une application avec l’IA : de l’idée à la maquette | NovaFactory — Jour 6

**URL :** https://www.youtube.com/watch?v=LlSOCjo6Yew

(0:01) Bonjour à tous, bienvenue dans cette nouvelle vidéo. Aujourd'hui, j'aimerais
(0:06) qu'on parte sur on va faire un premier débrief de ce que j'ai fait un petit peu
(0:11) en off hier soir, cette nuit. Ensuite, [grognement]
(0:16) on va créer une application de zéro qui va nous servir pour quand on va faire une
(0:24) autre série à côté qui me permettra de vous montrer un petit peu bah ce qu'on peut réaliser avec certains modèles
(0:32) et puis le côté que j'ai déjà abordé dans les vidéos précédentes qui est de
(0:37) faire réaliser la spec par un gros modèle et la l'implémentation par un petit modèle.
(0:43) J'ai un petit peu avancé avec ça, mais j'aimerais bien avoir une application pour pouvoir bah stocker les résultat
(0:53) euh stocker les coûts et cetera et que ce soit un petit peu plus sympa
(0:59) parce que là aujourd'hui, c'est vrai que ben je je dois switch d'une fenêtre à l'autre, je sois je dois switch d'une
(1:06) panne à l'autre pour récupérer les coups et cetera. C'est un petit peu chronophage et ça me donnera l'occasion
(1:11) de vous montrer un petit peu comment je fais le onboarding des projets [grognement] et comment je je ben je lance un projet
(1:18) quoi tout simplement. Donc on va commencer par ici. Je vais me créer un
(1:24) petit dossier et hop.
(1:31) Donc vu que je suis original, je vais appeler ça Nova Bench qui taille.
(1:38) Hop, voilà. On va aller chercher le dossier.
(1:48) Je l'ai mis là. Ici, on peut lui laisser la mémoire des
(1:53) agents puisque ça c'est un projet et on va autoriser le MCP de l'application.
(2:02) Donc, on reviendra là-dessus juste après. Je vais juste le ramener plus haut. Voilà. Mais on a déjà préparé
(2:08) notre dossier dans lequel on va bah lancer un agent et lui demander de de
(2:16) faire le onboarding suivant en gros une procédure que j'ai dans mon
(2:22) [soupir][souffle coupé] dans mon plugin forge. Donc je vais lui dire tout
(2:27) simplement c'est un nouveau projet.
(2:33) Tu vas m'aider à faire le horn. Tu vas m'aider à faire le onboarding. Ben, je
(2:39) vais le faire au vocal. On fait le onboarding pour une nouvelle application.
(2:47) Forcément,
(2:57) j'aimerais avoir une application qui m'aide pour quand on va faire les petits
(3:02) benchmark de modèles. Donc en gros, l'application, on va rester sur les
(3:07) mêmes stacks que d'habitude. On va utiliser Tori
(3:14) et euh
(3:21) est-ce que je lui dis ce qu'on prend comme stack ou pas ? On va voir. Il va trouver tout seul, je pense.
(3:27) Il va trouver tout seul et puis s'il y a besoin, peut-être qu'il va nous aiguiller vers bah quelque chose de plus
(3:32) adapté. Mais je pense que bon quoique quoi que quoi serait-elle pas
(3:40) plus simple de faire une application web pour ça ?
(3:45) Hm hm hm hm hm hm hm hm.
(3:52) On va faire ça sur une application web.
(4:02) pas de Tory pour cette application là. Alors, pourquoi je fais ça ? Parce que
(4:08) ben j'ai en tête euh que j'ai déjà pas mal d'applications enory. C'est
(4:13) intéressant pour l'installer sur des ordinateurs pour éventuellement le le
(4:19) mettre disponible sur internet. Par contre, ça allait un petit peu moins en ce qui concerne le développement. C'est
(4:25) vrai que en gros le le fait de devoir lancer des torde dev et cetera, c'est un
(4:31) petit peu plus complexe que d'avoir le serveur web allumé une fois avec le high reload. C'estàdire qu' en fait à chaque
(4:36) fois que l'agent va modifier des fichiers, je vais pouvoir voir directement dans le navigateur
(4:43) l'application se se modifier. Et en vérité cette application là, j'ai pas réellement besoin de la distribuer.
(4:49) C'est plus pour les vidéos pour que ce soit plus sympa de vous montrer en gros ce qu'auront fait les modèles. Donc bah
(4:57) là, on va faire ce qu'on fait d'habitude, c'est-à-dire qu'on va jaoger et je pense que j'ai pris ma décision, ça sera plus simple avec ça.
(5:06) Et du coup, plus qui dit plus simple dit moins coûter en token, évidemment. Voilà. Mais par contre, je pense qu'on
(5:12) va quand même rester sur du rust en backend. parce que ça l'aide quand même beaucoup.
(5:18) Donc euh voilà, pas de Tory backend en Rust.
(5:28) En gros, j'aimerais bien que l'application me permettre de montrer pour chaque modèle
(5:35) à chaque nouvelle version euh par exemple d'une réalisation qu'on
(5:42) souhaite faire, le par exemple le thermomètre de Galilée qu'on a fait il y a quelques jours,
(5:50) qu'on puisse passer d'un modèle à l'autre et voir le résultat directement dans l'application.
(5:57) Les résultats sont des fichiers HTML
(6:02) que je puisse copier le coût d'une session soit via le transcript de la session,
(6:11) soit via l'application Nova Factory dans lequel on a au niveau du header des
(6:17) terminaux un onglet qui nous permet de voir les coûts
(6:23) les coûts en token et en dollar. dollar euro.
(6:31) Qu'est-ce qu'on peut rajouter dès le départ ? [grognement] Moi ce que j'aime bien faire
(6:38) parce que en gros quand les modèles évoluent, leur manière de faire évolue aussi et j'aime bien retrouver un petit
(6:44) peu ma ma façon de faire les choses. Donc je vais aller dans mon dossier pour
(6:51) Nova Factory, là où j'ai plein plein plein de
(6:57) de design en gros de design nuit.
(7:02) Et j'ai bien aimé ce que Codex m'avait fait.
(7:08) Il m'avait fait une maquette en gros une maquette avec mes trois thème.
(7:14) Donc je peux switcher de thèmes comme ça et j'ai un petit un petit rendu de
(7:20) l'application quoi, une maquette quoi en gros de l'application. Et j'ai également en gros le design système avec ça vite
(7:27) d'avoir h vigier. Et je pense que je vais je vais lui dire
(7:33) bah tiens regarde on a déjà fait ça. Est-ce que tu peux t'inspirer de ça pour produire le résultat ? Donc je vais lui
(7:39) glisser. Tiens, est-ce que ça c'est mieux ?
(7:45) Ah ouais, j'adore. J'en ai deux. Cuivre graphite paramment.
(7:52) H ouais, c'est pareil. Bon, OK.
(7:59) Donc on va prendre ce fichier là, on va lui glisser. Ici, tu as une maquette avec le design
(8:07) système ou là Ouais, c'est bon. avec le design system
(8:12) que GPT Astra nous avait fait pour Nova Factory. J'aimerais qu'on s'en inspire
(8:19) euh je veux dire par là qu'on reprenne euh le document et qu'on y mette les
(8:25) nouveaux éléments qui vont nous permettre de faire
(8:30) le design système et la maquette de notre future application.
(8:38) Donc je répète, je veux que tu t'inspires de la façon de faire, non pas de du design system de l'application
(8:46) précédente. Voilà. [grognement] Donc lui, il fait juste le onboarding.
(8:53) Donc il va pas créer la D'ailleurs, je vais bien lui indiquer, tu ne crées pas la maquette. Toi, tu es uniquement là
(9:00) pour le onboarding. Tu copies ce fichier et tu l'indiques dans ton onboarding pour que j'envoie un agent commencer à
(9:09) nous faire la maquette à partir de ça. Voilà, là je précise à peu près tout. Ça
(9:15) peut vous paraître un petit peu brouillant au départ mais en fait vaut mieux trop en dire que pas assez parce
(9:21) que tout ce que vous laissez non dit, soit il soit il a un bon comportement. Et là, je suis à peu près sûr qu'il va
(9:26) avoir un bon comportement puisqu'il va en gros utiliser mon plugin forge et du coup il va avoir en gros les indication
(9:34) euh de où me poser des questions, sur quoi me poser des questions et cetera. Mais si vous avez pas ce type de de
(9:39) choseslà, n'hésitez pas, parlez-lui, donnez-lui beaucoup d'informations et vaut mieux passer du temps à créer le
(9:46) prompt comme ça que de d'en envoyer une partie, de le laisser travailler, de lui renvoyer une partie et cetera. Mieux
(9:53) prendre un petit peu de temps pour soi-même mettre au clair ses idées et ce sera quand même plus normalement le
(10:00) résultat sera meilleur. Là, on va laisser opus et on va laisser en height.
(10:06) Moi je pense que pour cette tâche là, j'ai pas besoin d'avoir un gros gros modèle
(10:12) et pas besoin de beaucoup plus de sinking non plus. Je sais même pas si he c'est déjà pas trop.
(10:20) On peut voir ici que les forfaits ont pas mal évolué. On a grillé Grock avant hier soir minuit puisque ben le forfait
(10:28) terminé hier soir et j'ai pas renouvelé mon abonnement à Grock.
(10:33) Euh déjà, bon, je je le ferai je je l'indiquerai dans une autre vidéo, mais je trouve que le coût est exorbitant par
(10:40) rapport au nombre de tokens qu'on peut obtenir. Très clairement, si je me mets là,
(10:47) je prends du 19 août au 19 septembre qui la durée de mon abonnement Grock. grand
(10:56) si on peut on va rigoler, on va laisser euh l'équivalence cloud par exemple et chat GPT. Voilà.
(11:06) Donc bon, ça intègre les caches, ça intègre l'inscription dans la cache et la lecture dans la cache. Mais faut voir
(11:11) que j'ai j'ai mangé tous mes forfaits hebdomadaires en permanence ou allez y
(11:17) rester 5 % des des fois quoi parce que je suis pas non plus à courir derrière les abonnements sinon on finit par plus
(11:24) vivre. Mais bon, la différence elle est colossale en fait. Euh et sachant que
(11:32) Codex ça vaut faire plein de reset et sur Grock, j'ai utilisé un reset qui
(11:37) avait été donné au début. Donc bon,
(11:44) no comment je pense. Surtout qu'en plus avec Rock, vous avez pas de actuellement vous avez pas un modèle frontière, vous
(11:50) avez pas un Astra ou un fable qui pourrait justifier euh
(11:56) bah l'abonnement plus cher quoi, tout simplement.
(12:03) Après ça peut, j'ai j'ai remarqué par contre que sur l'abonnement à 30 dollars, il avait une relativement bonne
(12:09) utilisation. Donc why not ? Mais du coup, vu que j'ai
(12:14) pas d'abonnement en comparaison à 20 dollars avec euh GPT ou Claude, je peux
(12:20) pas vous dire réellement si c'est équivalent. Voilà, ça y est. Là, du coup, il
(12:26) commence à me poser des questions. Il a regardé, il a vu qu'il avait rien dans son dossier, ce qui est normal, on a
(12:32) rien mis. [grognement] Il a [raclement de gorge] été voir Nova Factory
(12:37) et il a été voir Forge le plugin. Voilà, là il a lancé le skill Forge init
(12:44) workpace. Et là en gros, ça va lui expliquer quel fichier il il a besoin de créer. Il a
(12:49) des templates aussi pour comprendre. Et [grognement] donc il me dit le dossier est vide sans dépit manifeste ou skill
(12:56) local existante ni cargo package et cetera. Donc en gros, il y a rien. Le dossier vide, on vient de le créer.
(13:02) [grognement] Je devrais donc proposer les gates uniquement à partir de la stack indiqué. Rust côté serveur et web
(13:11) côté client. Mais j'ai besoin de de préciser la méthode de rendu du front
(13:16) avant de bâtir le manifeste de la maquette. Donc il me propose un truc relativement
(13:23) simple, un seul binaire, une seule chaîne de gate. Résultat HTM, elle s'affiche dans
(13:30) une FR iframe soundbox. Pourquoi pas ? Pas de note module. OK.
(13:37) Et sinon le classique réacte vite.
(13:49) Écoutez là-dessus, j'ai envie de le suivre. La SQLite, ça me va. Fichier HTML sur le
(13:55) disque, ça me va aussi.
(14:01) Oui, tu vas [grognement] faire ça aussi. Oui, on va créer un guide privé.
(14:08) Et donc là, c'est parti. Il va d'abord générer les fichiers dont les autres agents vont avoir besoin pour savoir ce
(14:14) qu'on va construire. Et c'est ça qui est relativement important au début. Bon, il y a peut-être pas besoin de toute la chaîne que je vais lui faire créer là.
(14:21) Comme je l'avais expliqué dans une vidéo précédente, les modèles évoluent énormément et du coup à un certain moment, il faut se poser la question.
(14:28) Donc j'ai fait le travail il y a il y a environ 7 jours. Je lui ai fait nettoyer un petit peu la chaîne
(14:34) mais voilà, c'est à l'usage que vous vous rendez compte de ce qui a marché et ce qui a pas marché.
(14:42) Donc il faut pas faut pas hésiter à de temps en temps faire évoluer les choses.
(14:48) Donc là moi j'utilise un plugin parce que c'est c'était dans l'idée plus simple pour moi au départ étant donné
(14:53) qu'au départ j'avais pas Nova Factory et du coup j'avais pas un endroit où j'avais regroupé tout tous mes projets,
(14:59) toute ma façon de travailler et du coup j'ai créé un plugin. Pourquoi
(15:05) le plugin ? Bah parce que vous pouvez l'installer sur n'importe quel Cali. En fait, il se branche aussi bien sur Cloud
(15:10) que sur Codex, que sur Grock ou n'importe quel autre Cali que vous
(15:15) pourriez utiliser. Du coup, j'aime j'aimais bien ça. Mais aujourd'hui, je me rends compte que avec
(15:21) Nova Factory en fait, si je si je veux l'intégrer à l'application, bah la version plugin, elle est pas vraiment
(15:29) idéale. Et donc je pense que l'un des prochains l'une des prochaines
(15:35) actions qu'on engagera sur l'application, c'est de créer un module de onboarding de projet directement dans Nova Factory.
(15:42) Comme ça, un nouvel utilisateur, une personne qui viendrait à à utiliser Nova
(15:47) Factory plus tard, bah il pourra tout à fait onboarder ses projets sans avoir de
(15:52) sans avoir le plugin forge qui est propre à ma manière, à moi de travailler. Donc bien sûr dedans, on
(15:58) fera on prendra des choses qui sont en forge pour les mettre dedans euh mais
(16:04) beaucoup de manière plus générique. Et forcément, ce sera assister avec un agent pour que il vous aide à prendre
(16:11) les les bonnes décisions par rapport à vos projets. Donc là, on peut voir, ça y est, il a créé tout un tas de fichiers
(16:17) quick ref, rule, convention, architecture, commande, trouble shooting et tout ailleurs qui
(16:23) sont en fait des endroits où il met surtout des informations liées à tiens mais il faudra faire ça. Voilà, j'ai
(16:29) constaté ça, il faudra faire ça ou au contraire j'ai eu pas mal de problèmes avec telle ou telle chose. Voilà. et le
(16:35) friction qui est un peu particulier là encore ses propres à forge. Euh j'aime
(16:40) bien qu'à la fin des des sessions, il ils disent en fait ce qui a marché, ce qui a pas marché et s'ils peuvent
(16:46) carrément expliquer pourquoi. Et [grognement] comme ça ben ça permet de faire évoluer les choses. Mais ça c'est pareil, il faut être proactif si vous
(16:53) l'utilisez. Si derrière vous en faites rien, il y a aucun intérêt de leur faire noter. Il faut de temps en temps revenir
(16:58) dessus. Alors, on pourrait imaginer euh plus tard ajouter un système de routine où tous les 7 jours ça lance un agent
(17:04) qui qui va chercher ça et qui vous crée des tâches euh spécifique dans le can.
(17:09) Mais bon, on verra ça plus tard. Donc là, il nous dit hors du template boarding produit. Euh OK.
(17:19) Le brief produit tiré de la dicté réalisation. [grognement] OK.
(17:29) Ça c'est pareil. OK, très bien. Et le kit ignorant. OK. Deux points à trancher
(17:35) avant que j'écrive.
(17:43) Euh, j'ai inscrit tel que quel
(17:57) bon là, il pose des questions. Si vous comprenez pas, vous pouvez laisser faire appel à son jugement quoi.
(18:05) Si vous savez de quoi on parle, effectivement, vous pouvez modifier les les choses.
(18:10) Bon là, c'est propre à du développement. Encore une fois, moi je je vois le je vois l'IA à travers mon prisme à moi qui
(18:18) est aujourd'hui principalement lié à du développement, mais vous pourriez appliquer euh certaines méthodes euh à
(18:26) tout autre métier. C'est juste que effectivement vous allez peut-être pas créer exactement les mêmes fichiers que
(18:32) ce que je crée moi ou du moins, vous mettrez pas forcément les mêmes choses dedans. C'est pour ça
(18:37) que comme je disais, j'aimerais bien créer un module de onboarding directement dans Nova Factory.
(18:44) Et là peut-être bah plus dans le questionnement dès le départ de savoir tiens, est-ce que je suis un utilisateur
(18:50) développeur ou est-ce que je suis un utilisateur lambda ? Et si je suis un utilisateur
(18:55) lambda, éventuellement pouvoir aiguiller vers certains types de onboarding.
(19:01) Est-ce que c'est un projet sur lequel on va travailler sur le long terme ? Est-ce que c'est un projet répétitif ? Voilà.
(19:07) pourriez vous pourriez imaginer avoir un dossier pour des tâches très spécifiques dans lesquelles vous allez avoir des
(19:13) parce que pour moi en gros toute l'idée c'est de de capitaliser aujourd'hui
(19:18) quand vous concevez un workspace vous pouvez tout à fait l'enlever je peux clic droit le virer il va me dire
(19:24) attention tu as des cartes tu as des souvenirs machin et je peux venir le recréer à part si je fais supprimer définitivement donc là je vais par
(19:31) exemple retirer Nova Shot si je veux le réinsérer hop je le réattache et je l'ai de nouveau quoi.
(19:37) exactement comme il était. Voilà. [grognement] Et ça pour moi c'est
(19:42) assez important. On voit que ça me réouvre même la ça me réouvre même la panne qui était
(19:49) avant que je le ferme ouverte avant que je le ferme. Donc on est où ? est sur bench
(19:57) et là on voit qu'il crée tout un tas de fichiers en fait avec les règles qu'il a dans des
(20:03) templates. Donc en gros dans le plugin au niveau de onboarding quand il fait le skill ça lui dit tiens mais tu as tel
(20:10) template tel template template. Du coup, il va lire le template, il va voir ce qui lui est utile dedans et il va
(20:15) reproduire ça dans un fichier et il peut éventuellement en fonction de ce qu'on a de ce dont on a parlé précédemment,
(20:21) c'est-à-dire que bah là je lui parle du projet, je lui dis ce que je souhaite réaliser en en finalité, mais lui il va
(20:27) adapter certaines choses bien entendu. Il va pas recopier que on va utiliser Python si au final on lui a dit queon
(20:33) allait utiliser Rust. Et c'est ce qui fait qu'après n'importe quel agent que je vais lancer dans le projet du de
(20:39) n'importe quel DCLI qui est disponible, ben il saura de quoi on parle. Pas besoin de lui dire là on est sur du
(20:45) Rust, ici on est sur du Python, là on fait du JavaScript en front et cetera et cetera. Il il sait automatiquement
(20:52) alors il sait il sait automatiquement pardon, il va avoir l'injection du coup des dossiers comme ben les agents
(20:59) pointmd et les cloud.md MD pour cloud où dedans ça lui donne déjà une première indication. Ça lui dit tel ici tu as tel
(21:07) fichier, ici tu as tel fichier et [grognement] comme ça il peut naviguer à l'intérieur et trouver les fichiers en
(21:12) question. On voit qu'il a fait un premier travail sur architecture. Il a expliqué un petit
(21:17) peu comment il voyait le il voyait le projet quoi. Il a parlé des imports de Nova Factory
(21:25) et des Transcripts. C'est ce que je lui avais cité. Nova Factory, c'est l'application sur laquelle on est là.
(21:31) [grognement] Et les transcripts en fait, c'est à chaque fois que vous vous ouvrez une une
(21:36) session cloud code ou une session codex ou n'importe quel provider, en gros, ça crée sur votre PC euh une transcription
(21:44) de toute la conversation qui s'est produite. C'est ce qui fait que derrière ici, là par exemple,
(21:50) je peux venir chercher les sessions que j'ai ouvert de l'autre côté en terminal. Je peux venir les récupérer ici en mode
(21:58) affichage HTML quoi. Voilà, ce qui en théorie aide à une
(22:04) meilleure visibilité. Je dis bien en théorie là forcément je prends la conversation sur lesquelles on faisait
(22:11) le benchmark l'autre soir et que forcément le le provider que j'ai regardé, il m'a il m'a recraché le HTML
(22:16) direct dans le dans le texte. Voilà.
(22:23) Donc je reviens à pendant que lui il est en train de faire son travail, je reviens à Nova Factory.
(22:28) Euh hier, j'étais un petit peu fatigué, ça a été une longue semaine donc j'ai pas mal travaillé et du coup je j'ai
(22:36) j'ai abandonné l'idée de faire une vidéo hier soir. Je me suis dit qu'on avait tout le weekend pour faire ça.
(22:42) Et du coup, je me suis lancé sur trois choses avant d'aller me coucher. J'ai d'abord fait cette partie là qui me
(22:50) tenait à cœur et dont je vous avais parlé il y a il y a de jours. En gros, on avait rappelez-vous tableau des tâches et sprint. D'accord ? Ben en fait
(22:58) tout simplement lui ai fait euh ajouter la partie euh sprint dans la partie
(23:05) tableau des tâches puis qu'en fait c'était à peu près la même chose mais articulé de manière un petit peu
(23:11) différente. Et du coup je trouvais ça bête parce que du coup tableau d'étage je l'utilisais
(23:16) plus. étant donné que c'était uniquement du manuel. Or là, je je me retrouve du coup avec mes chantiers ici qui sont en
(23:25) gros ben le voilà le nombre de tâches qu'on a dans ce chantier là et si elles
(23:31) sont réalisées ou non et les documents qui sont joués. Mais je peux également les retrouver ici.
(23:38) Voyez, ça c'est une carte par exemple du chantier ouverture au public macOS.
(23:44) Et dedans, je peux retrouver mes tâches. Bon là, c'est un petit peu brouillant parce que justement ces deux chantiers là, je les ai pas encore terminé et ils
(23:52) ont des tâches in progress du à l'ancien système. Et du coup, ben il va falloir qu'on
(23:58) qu'on fasse reprendre ça au modèle pour clarifier un petit peu cette
(24:04) situation. Voilà. Par contre, du coup, on a bien
(24:09) unifié notre camb. Donc ici, on peut s'en acquiter. Le résultat est obtenu. Et ici, je
(24:15) voulais également un volet partagé. Donc en gros, comme je vous avais montré ici, par exemple, si je vais dans cette
(24:22) conversation là, j'ai mon petit module qui s'ouvre à droite et j'avais modification, résultat et cetera.
(24:28) Je voulais en fait ici on avait également un volet mais qui était différent puisqu'il correspondait au
(24:34) premier design de l'application et il fonctionnait pas totalement comme on aurait voulu qu'il fonctionne. Et donc
(24:41) ici on peut voir que ça y est le même rendu. Alors c'est encore brouillon parce que là on était sur la première
(24:46) version. J'ai uniquement demandé au LM d'arrêter d'avoir deux volets différents
(24:52) alors qu'en fait c'est la même chose sur deux pages différentes. J'ai voulu homogénéiser d'abord
(24:59) et donc j'ai bien précisé au modèle que je veux réutiliser le même volet dans lequel on va afficher des choses un
(25:05) petit peu différentes, voire identiques dans certains endroits. Donc l'idée c'est quoi ? L'idée c'est de
(25:11) pouvoir quand là on va faire un bench par exemple ou qu'on va réaliser une
(25:16) tâche en particulier, c'est de pouvoir voir les fichiers modifiés par l'agent uniquement par cet agent là dans cette
(25:22) session là ou les résultats qu'il a produit. Donc euh là, j'ai pas pris le bon, mais
(25:29) si je viens ici par exemple que je fais ça, on peut voir qu'on a déjà une partie
(25:35) du de la fonctionnalité qui qui fonctionne. Ici, on va enlever le
(25:40) dossier. Bon, voyez, il y a il y a encore des trucs très bancals, hein. Je je je pense que c'est important quand
(25:46) même à souligner. Tout n'est pas parfait. Voyez, ça c'est totalement absurd. Je vois pas pourquoi on en
(25:52) arrive à une telle indentation. Euh là, peut-être qu'il peut regrouper en
(25:57) fait ses users Jérôme 1 11 1 jusqu'à arriver à l'endroit en fait où on va
(26:02) avoir la réelle indentation quoi. Un petit peu comme le fait Codex euh pour ceux qui connaissent.
(26:09) Mais c'est c'est la première version. Évidemment, j'avais pas tout prévu, donc je n'ai pas une version parfaite. Et moi
(26:16) ça me convient très bien parce que je fais évoluer le produit et je le teste en même temps et du coup je corrige les
(26:21) bugs et ça me permet à la fin d'avoir quelque chose que moi j'utilise tous les jours pour travailler et qui ma fois
(26:29) m'aide m'aide à faire mon travail correctement. Donc là, on peut voir qu'on peut mettre côte à côte. Ici, on va masquer cette partie à droite
(26:36) et là tout de suite, on peut voir directement ce qu'a fait le modèle, quelle ligne il a supprimé,
(26:42) quelle ligne il a ajouté. Et ça pour ceux qui font un petit peu de
(26:48) code, bah c'est génial. C'est vrai que euh en fait quand tu l'as pas sous les yeux, tu vas pas nécessairement aller le
(26:54) regarder et du coup ça peut amener à des situations vraiment euh difficile. Si on
(26:59) contrôle pas le travail que fait Lia et qu'on a pas les gardes fous autour, ça peut très vite euh partir en cacahuète.
(27:05) Donc faut pas hésiter à mettre des gardes fous. Alors moi j'ai j'ai beaucoup de gardes fou. Du coup, j'ai
(27:10) beaucoup de hook en fait. Les hooks, c'est des événements qui viennent
(27:16) qui viennent contraindre le modèle quand il fait des action. Par exemple, ben j'ai un h au qu'on appelle prepush.
(27:22) [grognement] Qu'en fait quand on travaille avec Git, ça je l'ai pas trop, c'est vrai que je parle beaucoup de push et et tout ça, mais j'ai pas trop
(27:28) expliqué. Git, c'est un système de versioning pour le code et du coup,
(27:33) c'est hébergé sur Gitup par exemple ou Gitlab pour pour ne pas en citer qu'un.
(27:39) Et j'imagine qu'il y en a d'autres, mais moi j'en connais que deux. Euh oui, il y a Cursor qui vient d'en sortir un aussi.
(27:46) Et donc ça vous permet en fait de d'avoir une base saine et de travailler sur des branches à côté. Et donc en
(27:53) gros, vous vous développez une fature sur une branche qui est une copie du code à l'instant t
(27:59) et on modifie que la copie. Et une fois qu'on est content ou satisfait du résultat qu'on a sur la copie, on fait
(28:05) ce qu'on appelle un merge, c'est-à-dire qu'on ramène la branche sur le code principal [grognement] et du coup on
(28:10) écrase les les les on on fait en sorte que les modifications écrasent l'ancien.
(28:16) Voilà. Et donc ici en fait c'est tout simplement d'un côté vous avez l'ancien
(28:21) code et à droite le nouveau et comme ça ça vous permet de voir ce qui a changé dans le code. Pour ceux qui font pas de
(28:26) code, je j'imagine [grognement] que ça vous paraît euh totalement abstrait.
(28:32) Mais pour nous, en gros, quand on voit bah certains certaines choses, on sait tout de suite bah ça c'est une là ici,
(28:37) il appelle une fonction, ici il est dans le
(28:43) il va attraper un événement en note et dans lequel il va passer des paramètres.
(28:49) Bref, c'est un c'est un petit peu compliqué de d'expliquer euh du code à des gens qui
(28:57) qui font pas de code, mais en gros, c'est une suite d'instruction qui va permettre euh quand on clique sur un
(29:04) bouton de réaliser le traitement qui était souhaité. Mais à chaque
(29:09) événement que vous pouvez imaginer sur une page web, le clique sur un bouton, vous rentrez quelque chose dans un
(29:15) champ. Ben quand vous rentrez quelque chose dans un champ, il y a peut-être 10 ou 12 événements qui peuvent être
(29:21) utilisés pour réaliser des traitement spécifique. Quand vous appuyez sur une touche, ben c'est un événement. Quand
(29:28) vous relâchez cette touche, c'est un autre événement. Quand vous passez avec votre souris par-dessus quelque chose, c'est un événement et cetera et cetera.
(29:36) Et c'est ce qui fait que nous les développeurs, on peut dire "Bah tiens, quand la souris va passer au-dessus de l'élément, tu vas par exemple changer la
(29:42) couleur de la police de l'élément. Voilà. où tu vas changer le la couleur
(29:48) de l'arrière-plan par exemple. Voilà. Donc ici, moi je du coup j'ai le change,
(29:54) donc j'ai la les les les changements qui ont été opérés par l'agent durant cette session de travail directement ici.
(30:01) Voilà. La deuxième partie c'est liée et là je vais retourner du coup
(30:09) sur cette session là pour le le montrer ça. Je voulais également que quand l'agent il fait un résultat comme ici en
(30:16) fait on on lui demande de produire un fichier pour en voir le résultat que je puisse regarder les résultats. Ah ben là
(30:23) on voit par exemple ça ne fonctionne pas. Voilà. Donc moi [grognement] j'ai je sais à peu près déjà pourquoi ça
(30:28) fonctionne mais je l'ai déjà essayé. Si ici en fait je fais ouvrir sur le navigateur, il me copie un lien et en
(30:34) fait le lien qu'il a indiqué c'est le lien
(30:40) c'est soit le lien d'un work tre soit un lien temporaire. Problème étant que là ben le la partie
(30:47) temporaire à mon avis a été supprimée. Donc là l'agent il enfin le le pardon le système est pas capable d'aller
(30:53) retrouver le fichier dont il parle. Donc on va commencer ici par screenshot ça
(30:59) là. envoyer un agent pour corriger. Vous me vous commencez à me connaître.
(31:05) Hop, dès qu'il y a un petit problème à quelque part, j'ai cette mécanique. Je
(31:10) vais prendre là et je vais lui indiquer. Hop ! Je vais rien lui indiquer du tout.
(31:15) Je vais lui donner ça brut comme ça parce qu'à mon avis, il y a pas grandchose à dire de plus là. Mais on
(31:22) peut voir du coup fusionner les tableaux, c'était bon. Ici, nettoyage et release, ça a été fait puisqu'on est sur
(31:28) la nouvelle version. Ça ça a été fait, c'est pas terminé.
(31:33) Mais je vais l'arrêter là parce que mon forfait en fait euh j'ai pété est quasi
(31:38) terminé jusqu'à demain midi et j'utilise en fait euh chatt pour
(31:44) m'aider euh dans la dans la dans la transcription des vidéos et dans
(31:51) les thumbmail et et tout que je mets sur les vidéos. Donc je vais garder un petit peu de forfait même si là bon 7 % ça va
(31:56) être largement suffisant. Ça c'était une exploration fait avec Rock, on va l'enlever. Et ça c'était justement bah
(32:02) celle qui a produit le volet latéral. Voilà. Bon, vous pouvez voir que voilà
(32:09) le le changement sur le volet latéral c'est 182 dollars, enfin 182 € pardon à
(32:14) peu près. On peut fermer aussi. Du coup, on se relance un cloud,
(32:21) on balance notre message, on le laisse travailler, on retourne sur le onboarding du projet.
(32:29) envie dire la partie volée à droite
(32:34) quand on ouvre depuis le header d'une d'un terminal a bien été intégré
(32:42) par Cloud. Par contre, il a fait une petite erreur. Je vois que quand on essaie d'ouvrir
(32:50) un fichier créé par l'agent durant la session, et bien malheureusement ça affiche un
(32:56) message d'erreur plutôt que la page en question. J'ai fait copier le lien dans le
(33:01) navigateur et du coup j'ai constaté que c'était un lien
(33:07) temporaire qui a priori n'affiche rien.
(33:14) Donc je ne pense pas que ce soit la fature qui pose problème mais le lien indiqué pour l'ouverture de la fature.
(33:21) Je te laisse vérifier tout ça et revenir avec moi avec le diagnostic réel
(33:27) et une solution. pour corriger. Voilà. Bon, là, j'ai donné beaucoup de
(33:33) détails, c'est pas vraiment nécessaire. OK. Qu'est-ce qu'il me dit lui ?
(33:39) Unboarding, terminé et poussé. Voici l'état, ce qui existe maintenant.
(33:45) On a un dépôt git. Parfait. On a un workspace avec notre forge qui est
(33:50) chargée. Main humaine. OK.
(33:58) OK, il a priori il a même créé la carte pour le di système. Voilà, ici, voyez,
(34:06) il explique quoi faire. Donc écoutez, pourquoi s'en privé ? C'est parti.
(34:12) On va se lancer un nouveau code là-dedans. C'est parti. Pour lancer la maquette,
(34:17) pointe-le sur Fable admis. Ah, attends, qu'il est pas
(34:23) bête là-dessus. C'est vrai qu'il est pas bête là-dessus.
(34:31) Non, c'est c'est sur celle-là que je voulais. Voilà, il est pas bête là-dessus. Donc
(34:38) on va ouvrir une clode comme ça.
(34:45) C'est vrai que j'ai pété aurait pu être intéressant sur cet exercice là.
(34:51) On va voir s'il est influencé si Fable est influencé par
(34:58) On va le mettre en X et on va lui balancer notre tâche.
(35:04) Tac. Confier inactif.
(35:10) D'accord. Tu veux pas me le lancer direct le message ? Non.
(35:18) OK. Donc là, c'est parti. Et voyez, il a eu les il a eu les informations,
(35:26) il a tout dit. Il a dit tiens, regarde le brief, il est là, le bench brief, il est là.
(35:32) Regarde l'ancien enfin le livrable c'est ça ça ça
(35:40) et ensuite dans le détail de la de la note ici
(35:48) j'ai vu qu'il lui parlait de voilà il lui parle de brom machin qu'il a mis dans un dossier. [grognement]
(35:55) Donc là voyez en en en ici ça s'est fait en 7 minutes. Bon, ça fait 32 minutes
(36:01) qu'on a ouvert cette panne, ça nous a coûté 4 €. Et là, à partir de
(36:08) maintenant, on a un autre agent.MD qui dit aux agents voilà, tu as la tu es la
(36:13) racine 2 machin, tu as le même fichier qui est ici. [soupir] Euh,
(36:21) ça lui explique un petit peu le le forge, pourquoi comment ça fonctionne et où sont les fichiers. Même chose là. Ça
(36:27) c'est un petit peu plus pour les humains. Et ici par contre il indique source de
(36:33) vérité du produit main humaine. Ça veut dire en fait quand il m'a main humaine ça veut dire que s'il doit s'il doit
(36:38) réaliser des modifications là-dessus, il doit demander à un humain. Il a pas le droit de modifier par lui-même.
(36:45) Alors, vous pouvez changer ce genre de règle mais vous étonnez pas si un matin le le l'agent suivant, il se comporte
(36:52) plus de la manière dont de se comporter l'ancien parce qu'en fait il y a des fichiers s'il les modifie tout seul, bah
(36:57) potentiellement il va s'arranger de certaines règles et ça malheureusement vous le savez pas avant d'utiliser
(37:03) parce que c'est vrai que tous les benchmarks sur internet, c'est bien gentil de mettre 90 % avec tel Termilan
(37:10) Bench ou mais ça en gros la plupart du temps on lance l'agent sur une tâche, on
(37:15) détermine la rapidité si c'est passé ou si c'est pas passé et c'est à peu près tout. On on c'est rare qu'il les fasse
(37:22) travailler sur des projets à long terme comme vous vous pourriez être amenés à le faire. Du coup, il y a certains
(37:28) défauts que eux voient pas et que vous vous pourrez trouver assez facilement.
(37:38) Donc on va suivre un petit peu cette cette étape là et ensuite je lancerai un nouvel agent
(37:45) pour me préparer le la root map en gros. Mais d'ailleurs on pourrait le faire tout de suite.
(37:51) On pourrait le faire tout de suite. On va se lancer un agent ici puisque lui en fait il va lire la doc et produire une
(37:59) maquette. C'est à peu près tout ce qu'il va faire. On n' pas besoin de lui pour réaliser le ce que ce dont je parlais
(38:06) précédemment, la road map de la réalisation de notre application, du moins de la V1 de notre application. La
(38:12) road map, elle est assez importante au début parce que ça vous permet à vous de savoir un peu par quelle étape il va
(38:17) falloir passer. Et si vous bloquez une étape, ben vous voyez que il vous en reste trois. Enfin bon, pour moi, c'est
(38:23) un repère dans le temps plus que euh une vérité absolue. Mais au moins,
(38:29) ça vous permet de savoir où c'est que vous voulez aller. Et donc, on va on va faire ça avec lui.
(38:35) Est-ce que j'ai besoin de tant d'effort ? Je suis pas certain.
(38:42) On va le laisser quand même.
(38:50) OK. J'aimerais qu'on réalise la la road map
(38:55) pour mettre en place ce projet. J'ai actuellement un fable qui est en train de réaliser la maquette
(39:02) visuelle du projet avec le design system.
(39:09) J'aimerais que toi tu t'occupes de préparer la road map et les specs de
(39:17) chaque étape afin qu'ensuite je lance un agent pour
(39:22) réaliser le travail.
(39:29) Pourquoi je lui parle de de l'agent suivant ? Bah tout simplement pour qu'il ait conscience que c'est pas lui qui va implémenter quoi. Voilà.
(39:38) Là, l'objectif, son objectif à lui, c'est il va lire, il va comprendre ma demande. S'il a besoin, il va me poser
(39:44) des questions pour pour éclaircir mon besoin. Et une fois qu'il aura fait la road map,
(39:51) terminée, on s'arrête là et là, on va passer en opus qui va orchestrer des des
(39:56) des sous-agents et qui va réaliser le projet. Et comme ça, en gros, on aura
(40:01) beaucoup moins d'interprétation. On a mis le socle du projet. Maintenant,
(40:07) on y met par-dessus la road map et la maquette. Et à partir de là, on va laisser travailler nos agents et on
(40:13) verra ce qu'il en ce qu'il en ressort une fois qu'ils auront terminé la V1.
(40:19) Et je pense vraisemblablement qu'une fois que j'aurai lancé tout ça, demain ou après-demain, je pourrais déjà vous
(40:25) présenter le la la l'application et on verra ce qu'on doit faire évoluer
(40:31) dessus pour mais on verra ça à l'usage en fait plus parce que j'ai pas grande
(40:37) ambition pour cette application. Nova Factory, je sais déjà plus ou moins où je vais aller, mais cette application
(40:44) là, c'est plus déjà bah ça me permet d'avoir un exercice à vous montrer comment je fais le mording d'un projet.
(40:49) J'ai fait j'ai fait comme ça pour toutes les applications que j'ai he enfin les du moins les applications que j'ai j'ai
(40:54) généré avec Nova. Donc Nova Wisp a été faite comme ça. Nova Factory aussi, Nova
(41:00) Mine que je vous présenterai un petit peu plus tard qui a qui a un harness en fait pour faire de de l'inférence en
(41:06) local. J'y travaille pas autant que je voudrais dessus par manque de temps
(41:12) principalement, mais en gros, c'est une base de travail
(41:17) qui reprend euh bah un petit peu les outils que qu'utilise Cloud pour faire
(41:22) travailler des agents en local avec un système de permission. Et on peut également voir en gros le les
(41:29) le travail réalisé par l'agent pendant qu'il le réalise.
(41:37) Donc là, ils sont tous deux en train de travailler.
(41:45) Ici, il y a plus grand-chose d'intéressant. Est-ce que lui il nous dit quelque chose ?
(41:58) Non, c'est pas très grave. On va le laisser travailler aussi ici. On va revenir là justement.
(42:04) Ça, on va clôturer et j'aimerais bien euh
(42:14) je vais lancer ça sur un cloud
(42:23) et je vais lui ajouter. J'ai l'impression qu'on a beaucoup de tâches qui sont in progressent mais qui en fait
(42:29) sont déjà réalisées. Tu peux faire le point là-dessus et mettre à jour les tâches si nécessaires.
(42:39) [grognement]
(42:45) Le le vocal là, si vous avez l'occasion d'utiliser, c'est vraiment génial,
(42:51) surtout si vous vous avez beaucoup d'aller-retour à faire. Moi, je trouve ça
(42:58) je trouve ça génial. Et là, on tourne sur des modèles en en local. C'est sur ma carte graphique que
(43:04) ça que ça envoie.
(43:15) [soupir][souffle coupé] C'est pas mal du tout.
(43:21) Pagine OK.
(43:26) OK. Bon, pendant qu'il travaille, moi je vais vous parler de d'un petit peu autre chose. Là, j'ai décidé de de plus
(43:32) mélanger les vidéos où je fais bah la série travail avec Lia et celle où je
(43:38) fais les bench parce que ça mélange un petit peu tout. Et du coup, j'aimerais savoir si réellement l'une ou l'autre
(43:44) vous intéresse. Donc, je vais le couper en deux et puis on verra celle qui vous intéresse le plus. Je pense que
(43:49) travailler avec Lia, de toute façon, on va rester quoi qu'il arrive, mais ça me permettra d'avoir des vidéos un petit
(43:54) peu plus courtes euh et peut-être un petit peu moins du coup euh
(44:02) un petit peu un petit peu plus digeste, pardon, parce que c'est vrai que quand on fait 1h30 ou 2h de vidéo, euh il y a
(44:09) peut-être des choses importantes à 10, 15, 20 ou 30 minutes que vous allez sauter parce que vous allez voir
(44:14) directement les benchmarks et au contraire ceux qui viennent plus pour euh bah apprendre une méthodologie ou
(44:22) euh du moins euh comprendre comment on peut utiliser le lia au quotidien.
(44:27) [soupir][souffle coupé] Euh les moments où je fais les benchmark, c'est pas intéressant euh enfin c'est pas directement intéressant pour vous, même
(44:34) s'il y a des aspects intéressants, je pense parce que aujourd'hui, moi justement, j'emploie une
(44:39) méthodologie spécifique parce qu'encore une fois, faire ce que fait tout le monde m'intéresse pas vraiment.
(44:46) moi-même, [raclement de gorge] je vais regarder ce que font les autres quand les modèles sortent et tout. Et euh et
(44:53) je trouve beaucoup plus parlant de de faire ce que j'ai fait sur la dernière vidéo, c'est de proposer un truc un peu
(45:00) alternatif où c'est le modèle qui va faire la spec et le petit modèle qui va implémenter. Et donc là, j'ai travaillé
(45:07) pas mal hier soir sur Nova Mind, j'ai fait travailler Quen notamment
(45:13) Quen 3.8 827B sur la carte graphique et on pourra voir que j'ai eu des j'ai eu
(45:19) des résultats plutôt étonnants et encourageant. Donc
(45:26) voilà. Mais moi ça m'a relativement surpris parce que les fois où j'ai essayé de
(45:32) l'utiliser au moment de sa sortie pour des pour des problèmes bien particulier euh
(45:39) ça s'est pas forcément déroulé comme je comme je pensais que ça aurait pu se dérouler.
(45:46) Le jour où il est sorti, je me suis dit tiens, j'avais une modification à faire pour mon boulot. Je me suis dit tiens, ça peut être intéressant. C'était en
(45:51) gros ni plus ni moins j'avais une image euh d'un template PDF quoi et en gros je
(45:57) voulais qu'il le traduise en en HTML et ça je l'ai fait faire plusieurs fois à Cloud ou à GPT. C'est des exercices
(46:04) sur lesquels ils sont bah ils font ça en quelques minutes quoi tout simplement. souvent vous avez peut-être un de retour
(46:10) à lui faire mais globalement ça va très très vite. Et alors déjà il a tendance à
(46:16) énormément pensé donc il a fallu que je refasse des réglages parce qu'à l'époque sur le 3.6
(46:22) 6 si vous laissiez des des énormes quantités de de sinking possible, le modèle il partait en boucle de sinking.
(46:30) Et aujourd'hui, c'est plus tout à fait la même chose, mais il a un syning débordant. Il est capable de faire
(46:35) presque 100k token juste en penser avant même d'avoir réalisé la moindre action.
(46:41) Du coup, c'est ça rend les choses un petit peu un petit peu plus longues. Voilà. Alors
(46:49) là, cet après-midi, j'ai encore travaillé là-dessus. Je me suis rendu compte que les retours d'expérience des gens qui utilisent le
(46:56) modèle en local disent que bon le X là comme ils ont mis par défaut en thinking
(47:01) c'est peut-être pas la meilleure des idées. Et en terme de résultat le en médium
(47:07) c'est relativement similaire. Donc on j'essaierai ça dans les
(47:12) prochains dans mes prochaines tentatives on va dire. Bon, on peut voir ça avance
(47:19) hein. Ça avance pas mal. Lui, il est en train de regarder euh les tâches, pourquoi c'est un progresse
(47:26) et cetera. Ah, ça y est, il les a fait bouger en in
(47:31) review. Voyez ? Voilà, du coup on a moins de cartes ici.
(47:41) Voilà, ça commence à être un petit peu plus vivante. Et celui-là dit, du coup, j'aimerais
(47:46) bien le clôturer. Donc il faut [raclement de gorge] qu'on se faut qu'on se bouge un peu. Et ça pareil, je sais pas si ça a pas été clôturé déjà.
(47:53) D'ailleurs, je vais envoyer un nouveau modèle. Ça
(47:59) pardon. Attends. Non non non non non non.
(48:05) OK, je suis en train d'utiliser fable. Je suis en train d'utiliser fable pour
(48:10) ça. H
(48:19) alors vous voyez ça c'est le côté que je disais l'autre. C'est pas pratique du tout. Il faut que je change ça parce que si j'envoie et que c'est toujours le
(48:25) dernier modèle, c'est extrêmement problématique. Donc ça, on va se noter une on va se
(48:31) noter une taxe une tasque là-dessus tout de suite.
(48:37) Déjà, tu vas [raclement de gorge] remettre au puce. Voilà. J'aimerais que tu crées une tâche dans
(48:42) Camban, s'il te plaît, [grognement] afin qu'on réalise un changement sur le dispatch justement, car actuellement
(48:50) quand je lance, je peux pas choisir le modèle et du coup je suis toujours avec le dernier modèle utilisé. En
(48:57) l'occurrence là, cette fois c'était faible, donc c'est problématique niveau budget.
(49:05) Voilà, on va le lancer à lui là-dessus. Et vu que maintenant j'ai créé mon truc, je peux partir sur confier
(49:12) dans une nouvelle. Voilà. Et lui, je vais lui ajouter. J'aimerais que tu regardes là ce qui a déjà été fait ou
(49:18) non et ce qui reste à faire et qu'on mette à jour si besoin le statut des tâches.
(49:27) Voilà. OK. Bon, il a fini assez rapidement. Ça
(49:32) va, il a pas utilisé trop de budget. Mais là, vous voyez, c'est la boulette quand même à
(49:37) il y a un petit tarot à la boulette, quoi. Voilà, c'est c'est la petite boulette qui coûte cher quand même.
(49:43) Si lui il travaille depuis plus longtemps, voyez, on est à 9 millions de token, on est à 7 dollars 15 et lui 4
(49:50) millions 5 dollars. Tout de suite, ça tape plus fort. Et encore là, c'était pas très compliqué ce qu'on envoyait
(49:56) vert. Ça va, c'est pas la boulette est pas est pas trop coûteuse.
(50:04) On [grognement] voit que ça nous a pas mis il y en a certaines qui sont passé une review. On va les valider.
(50:11) De toute façon, ça a été ça a été envoyé sur
(50:16) ça a été fait sur le Mac en gros parce que ben forcément si je fais le si je fais le si je fais les chemins critiques
(50:23) Mac, il m'a fallu aller sur le Mac avec les machines virtuelles et cetera. [soupir][souffle coupé]
(50:28) Et au début, j'avais en fait un espèce de de va et vienre internet, le Camband
(50:34) puis un potentiellement un autre poste. Mais aujourd'hui, je me pose la question de si cette fature va vraiment persister
(50:43) parce que là, on parle de gérer des données utilisateur via mon hébergement. Et
(50:51) certes, j'ai sécurisé et tout, mais c'est pas une pratique que j'ai envie d'avoir en fait. Je préfère euh bah si vous voulez utiliser euh Nova Factory,
(50:59) je préfère à la limite euh stocker euh par exemple la donnée directement dans
(51:05) dans le dossier euh Nova Forge par exemple et vous dire "Ah ben tiens, si tu si tu passes le dossier Nova Forge
(51:12) sur ton sur ton autre PC euh via Git par exemple, ben tu gardes ta mémoire ou tes
(51:18) tâches quoi, plutôt que euh passer par un service tiers de chez nous qui qui
(51:25) Après, on pourrait crypter les données et tout he, il y a pas de problème là-dessus. Mais ça me fait prendre une responsabilité en fait que j'ai pas
(51:32) vraiment envie de prendre aujourd'hui.
(51:42) le moins de données utilisateur qu'on utilise quand on est développeur et et
(51:47) mieux on se porte je pense parce que tu dit
(51:53) avoir des données sur les clients ou sur les les agissements des gens veut dire
(51:58) bah devoir respecter la RGPD donc donner la possibilité aux gens de de d'effacer
(52:03) les données et cetera et cetera ça rajoute énormément de de de choses à faire en fait et ça complique énormément
(52:10) le logiciel inutilement là pour le coup parce que bon là on est sur des tâches
(52:15) quoi. Il a créé des tâches dans le camban pour qu'on puisse travailler euh laisser la possibilité à l'utilisateur
(52:20) de l'exporter en même temps que le projet et puis chacun se l'exporte s'il a besoin quoi.
(52:27) Je pense que ça peut être mieux. Donc on fera ça dans une autre une autre
(52:34) vidéo aussi. Ici est-ce qu'on est bon ? Est-ce que est-ce qu'on on pourrait
(52:39) montrer au moins un début de quelque chose de de de l'application avant de
(52:46) nous quitter et de reprendre ça demain ? Je vais aller voir direct dans le bench.
(52:54) Est-ce qu'ils ont fait des work ? Non, pas encore. Tout va bien. Maquet, on a rien dedans.
(53:01) Plan, on a rien dedans. OK, bon, ça va. On a rien dedans.
(53:10) Non, il a créé quelques trucs mais c'est pas encore ce qu'on voulait regarder.
(53:15) Deux cartes sont en doublon strict. Parfait. Je les supprime bien entendu
(53:21) mon coco. Oui, vas-y, fais-toi plaisir. Laisser un
(53:27) tout dou. H ok,
(53:33) on est bien d'accord que là on est sur un opus hein. Ouais, on est bien d'accord.
(53:40) On est bien sur Opus. Oui.
(53:47) Alors, ça c'est pareil. Euh, tâche destructrice, il demande d'autorisation et pourtant l'agent est en bypass
(53:53) permission. OK, ça à vous de voir si vous laissez les
(53:58) agents supprimer des choses. Moi personnellement sur des choses comme ça, je préfère qu'il me demande la permission
(54:05) parce qu'en fait des fois ils peuvent prendre de l'initiative et du coup se tromper ça arrive. Il faut en être
(54:10) conscient. S'il se trompe et qu'il vous supprime les cards et que vous avez pas de sauvegarde de la de la base de
(54:16) données SQ Elite, ben vous avez plus les données. Voilà, moi je développe avec
(54:21) donc forcément j'en ai 10 ou 15 versions,
(54:26) mais c'est plutôt embêtant quoi. Vous perdriez quand même un petit peu de travail.
(54:31) Il y a très peu de choses sur lequel je le bloque, mais ça par contre
(54:38) je le bloque.
(54:45) OK, on revient sur bench. Est-ce qu'on peut voir quelque chose Fable ou pas ?
(54:53) On est à 5,64 € pour l'instant et 6,19 € sur la préparation de la
(55:03) de la tod list de la road map, pardon. Road map, voilà,
(55:10) elle est là, il a déjà créé une partie de la R map Map. Voyez, mais E1 socle,
(55:15) E2 catalogue, E3 vision visionneuse pardon. Wouh ! Et E4 le coup.
(55:23) il a pas été au-delà de ce qu'on lui a demandé. Il est pas parti en cacahuète en disant "Ouais, on va on va lancer les
(55:28) les pannes directement dans l'application et tout." Ça lui a pas être demandé, c'est pas l'objectif. L'objectif c'est pas d'avoir un deuxième
(55:34) Nova Factory pour lancer des pannes avec divers providers et cetera. Non, c'est pas ça le but du tout.
(55:45) Donc là, on peut vérifier. Et là, je vous encourage très fortement à vérifier quand vous faites faire des road maps et
(55:50) tout avant de lancer vos agences sur la road map. Parce que c'est pas une fois que tout est codé qu'il faut se dire "Ah mais non, mais en fait moi je j'aurais
(55:56) préféré que tu fasses comme ça. Il faut il faut y aller avant. Je préfère le dire.
(56:02) Si vous si vous êtes confiant et que vous pensez qu' il fera bien le job, allez-y. Mais très clairement, la
(56:08) plupart du temps, vous vous retrouverez avec des choses qui qui peuvent différer de ce que vous
(56:14) souhaitiez faire au départ. Voilà. Il faut en avoir conscience. Qu'est-ce qu'il nous dit lui ?
(56:31) Euh, tu laisses E 2.1.
(56:39) Par contre, tout pour tout le reste, tu peux y aller.
(56:45) Bien entendu, tu utilises le dispatch. Toi, tu es l'orchestrateur et par contre pour le dispatch, tu vas utiliser des
(56:51) agents opus ou sonner.
(56:57) Voyez, quand la transcript marche pas trop bien, il met des choses un petit peu illogiques. Mais c'est parce que son
(57:02) il l'a écrit de manière littérale alors que moi je parlais d'un nom propre pour le modèle sonné. Mais c'est pas grave,
(57:10) le modèle va très très bien comprendre. Il a pas besoin de d'avoir l'orthographe. Exact.
(57:17) On va revenir ici maintenant. La maquette elle-même. OK.
(57:30) Euh, il reste à créer h cartes en tête de Camban pour Nova Bench. un
(57:35) parchantier slug égal spec. Elles sont indépendantes, je l'écris
(57:42) toutes maintenant. Voilà, il est en train de nous ajouter. Voilà. Ah, lui il fait un chantier par
(57:49) point de la road map. Il a pas fait [rires] un chantier avec toute la road map.
(57:55) Et je pense que c'est pas mal parce que potentiellement dans un
(58:00) dans une étape, il y a peut-être divers
(58:06) divers cartes à utiliser.
(58:12) Donc là, on est parti quand même sur septiers pour la réalisation de cette application.
(58:19) On aura peut-être pas l'application dès la prochaine dès le prochain épisode de
(58:24) comparaison des modèle. Mais finalement, c'est pas très grave. On fera dans le
(58:30) temps que que c'est que ça nécessite. On n'est pas réellement pressé avec ça.
(58:40) OK, il nous dit que c'est bon, il a tout créé en haut. Voilà. R map spec en place
(58:45) bench.
(58:52) ce que les specs ancrent sur le terrain réel.
(59:00) Voilà, voyez, il a même été regardé en fait sur dans le dossier dev et il a trouvé en gros l'endroit où je mets les
(59:07) les chaque dossier pour que les en fait si vous lancez le CD Cali dans un dossier et que vous lui donnez pas les
(59:13) les permissions d'en sortir, mais en gros, il est obligé de travailler là-dedans. Donc je sais qu'en partitionnant dossier par dossier, j'ai
(59:19) je cloisonne le modèle pour pas qu'il regarde ce que fait les copains. et et du coup, il a trouvé les dossiers
(59:26) pour le thermomètre parce que le thermomètre, j'ai vraiment poussé. Ouais, c'est vrai que j'y étais j'y étais comme il faut. En fait, j'ai été
(59:31) surpris par certains résultats et du coup, je me suis dit tiens, est-ce que si on continue, on fait faire ça à par
(59:39) exemple à Opus 5, si on fait faire ça à GPT6 sol, comment ça se passe quoi ? Et je
(59:46) vous montrerai ça du coup dans l'autre mais lui il les a trouvé, il a compris en fait via comment je fonctionnais.
(59:58) Voilà. Décision prise dans la spec à confirmer au point d'arrêt de chaque spec. Exécution en propre partout.
(1:00:05) [soupir] Euh juge sursonné. Anti CRF. OK.
(1:00:11) CSRF pardon. Monter en millimè en millième. Ouais.
(1:00:18) OK.
(1:00:36) OK, on se met au travail. Par contre, tu codes rien toi-même. Tu vois, tu es l'orchestrateur ici et donc tu vas
(1:00:42) utiliser les eng opus et sonnés pour réaliser l'implémentation.
(1:00:48) Tu travailles le minimum possible.
(1:00:54) [grognement] Je vais le lancer un petit peu au début en fait, je pense. Et à partir du moment
(1:00:59) où il aura traité un ou un ou deux choses, au moins le socle, j'aimerais qu'il traite. Une fois qu'il l'aura
(1:01:05) traité le socle, ben je je passerai à Opus, je je fermerai cette conversation.
(1:01:11) et et là vous comprenez tout l'intérêt du tableau des tâches, c'est que maintenant qu'il a réalisé le
(1:01:16) prétravail, qu'il m'a mis partout euh le les informations en description
(1:01:22) et tout de ce qu'on attend et puis voir voyez le le socle de l'appuner
(1:01:30) sur sa tâche, il sait à peu près ce qu'il doit faire. On n'est pas sur une spec aussi précise que ce que j'ai fait
(1:01:36) au moment des au moment des bench. Certes, mais c'est pas l'objectif non plus. Là, ils vont
(1:01:42) pas coder euh un petit fichier HTML avec une animation à l'intérieur. Là, ils vont devoir pour
(1:01:49) certains faire quand même un petit peu marcher les neurones
(1:01:55) pour mettre en place tout le socle quoi nécessaire.
(1:02:03) Voilà, ça y est, il passe en mode PM pour product manager du coup.
(1:02:09) Et donc il va devenir le le le chef d'orchestre de de l'implémentation ou du
(1:02:15) moins de l'implémentation du socle. Voilà. Une fois que l'autre aura fini la la maquette et que je l'aurai validé, je
(1:02:22) pourrais tout à fait passer sur un sur un opus pour l'implémentation. J'aurais même pu mettre un opus pour la
(1:02:29) maquette, mais mais c'est un petit peu des challenges
(1:02:34) aussi. le 5.1, il est sorti il y a pas longtemps. J'ai pas eu le temps de lui faire faire de la maquette ou des
(1:02:40) réalisations graphiques. Donc, je voulais voir un petit peu ce qu'il était capable de produire ici.
(1:02:47) Ah, j'ai l'impression qu'il avance quand même parce que je vois du code passé.
(1:02:53) Mais est-ce qu'il s'est pas mis dans un work tree ?
(1:02:59) Je pense que si.
(1:03:04) On est en septembre.
(1:03:12) Non, en plus on dirait pas.
(1:03:20) Je pense d'abord il le réalise. Ah non, il l'a mis dans un dossier de design en fait. C'est pour ça que je me
(1:03:27) fais avoir. OK, d'accord. Autant pour moi.
(1:03:35) Autant pour moi. On va pas faire ça comme ça. Pardon.
(1:03:40) On va faire ça comme ça. Voilà un petit peu le le rendu que ça
(1:03:47) donne.
(1:03:53) [rires] C'est rigolo en tout cas. Pour une première version, c'est pas
(1:03:59) mal. Bon, c'est moche hein. C'est moche à souhait hein. C'est moche à souhait. J'aime pas du
(1:04:04) tout. Mais mais il y a de l'idée. Il y a de l'idée.
(1:04:12) En gros quoi. Je passe de l'un à l'autre comme ça en cliquant. Même pas pour l'instant. OK.
(1:04:20) Ah si, on peut mettre côte à côte. Comment j'ai fait ça ? Quitter la comparaison. OK. Côte à côte. Mais
(1:04:26) comment il sait qui je vais mettre côte à côte du coup ? Est-ce que je les sélectionne ici ?
(1:04:31) C'est ça. Ah, en shift cliquant par contre.
(1:04:40) OK, on sait pas pourquoi il va comparer à B. Bon, OK.
(1:04:51) Ouais, c'est un début hein. C'est un début. Voilà la planche qu'il a faite.
(1:05:07) Le volet à droite, il me dérange pas plus que ça. Par contre, je comprends pas ce truc là. Je comprends pas ce truc d'aller me prendre
(1:05:22) OK. Pardon pour les silences, mais ça me ça me perturbe en fait. Ça me perturbe
(1:05:28) pas mal. J'aime je sauve tout ça, ça prend trop
(1:05:35) de place en fait. On a envie d'arriver là direct.
(1:05:41) On a envie d'arriver là. il s'est presque plus concentré sur la reproduction du du thermomètre en lui-même [rires]
(1:05:48) [souffle coupé] que qu'en réalité sur l'application qu'on est en train de construire quand il faut le il faut le
(1:05:54) souligner. [grognement]
(1:06:01) Bon, on va voir parce que peut-être qu'il a pas tout à fait fini et qu'on est en train de regarder
(1:06:07) quelque chose de non abouti. On va le laisser terminer. Des fois, je m'emballe un peu, je regarde à l'avance
(1:06:13) et je m'aperçois après que nouvelle réalisation importé.
(1:06:27) OK, pas mal. OK. OK, je peux Ouais, ça ça je vais
(1:06:33) vous montrer voyez comment on importerait potentiellement un rendu. On vient là,
(1:06:40) on met le on met notre [raclement de gorge] fichier HTML, on dit ce que c'est la réalisation par exemple, la variante de prom que c'est,
(1:06:47) est-ce que c'est un prom direct ou c'est ce qui c'est une spec de l'un ou l'autre, le modèle qui a été utilisé,
(1:06:54) la version du modèle et on importe. Pouf !
(1:07:03) [grognement] Par contre, ce truclà, c'est absolument moche. Il faut, je sais pas, un truc à gauche là pour passer de l'un à l'autre. Je sais pas, il faut un
(1:07:09) truc, faut une navigation, faut là, tu l'inspiration, elle est à chier quoi. Je
(1:07:15) sais pas ce que vous en pensez mais moi je trouve ça mais
(1:07:20) Et puis lui, il est satisfait là. Il a là il est en train de clôturer [rires] là. Il est en train de clôturer au calme
(1:07:27) pour 12 balles. Il nous a pas du tout volé. [raclement de gorge]
(1:07:35) Bon, j'exagère. Peut-être que c'est c'est assez subjectif, mais ce dit, j'aime pas.
(1:07:41) Je pense que je vais faire passer Astra là-dessus, voir ce que ça donne.
(1:07:48) Je pense que je vais faire corriger Astra.
(1:08:01) Il manque le plan du lot. [soupir][souffle coupé]
(1:08:09) Non, attends. Et tu nous fais pas de review là-dessus, il n'y a pas besoin. D'accord.
(1:08:21) Parce que là il est en train de total partir en cacahuète. On va pas faire de la review d'une macetin, c'est ne
(1:08:26) poussons pas non plus. Ne poussons pas non plus. Alors il y en a il vont me dire "Mais il aurait peut-être vu les
(1:08:32) défauts." Non mais là les défauts en fait c'est pas des défauts c'est pas des des bugs ou des choses qu'il a qui qui
(1:08:38) qui sont mal produites. C'est juste une question d'affinité. juste que la
(1:08:44) manière dont il a traité les choses aujourd'hui, moi je j'aime pas ça. Je préférerais avoir une une navigation sur
(1:08:50) la gauche par exemple pour passer d'un modèle à l'autre plutôt que d'avoir des points au-dessus comme ça. Je trouve pas
(1:08:56) ça euh Ouais, je trouve ça casse un peu le le
(1:09:01) il faut scroll quoi. Vous voyez déjà quand il faut commencer à scroll pour voir le résultat de quelque chose,
(1:09:07) posez-vous les bonnes questions. quand on arrive sur une page, le l'essentiel de l'information doit être
(1:09:12) comprise dès le début. Le scroll, c'est le c'est le bonus, voyez, c'est je
(1:09:18) cherche une information supplémentaire ou j'ai j'ai pas eu ce que je voulais ou j'en veux plus. Mais pour moi, si vous
(1:09:23) devez scroller pour avoir l'information, ben on scrollera pas, quoi.
(1:09:30) Donc on va appliquer la même chose ici. Pour moi, si c'est si c'est aussi gros que ça, ça doit aller en dessous ou être
(1:09:37) mis différemment éventuellement. Il y a il y a en fait, c'est pas un
(1:09:43) scoring. On le le but, c'est pas d'avoir un score de qui que ce soit
(1:09:49) ou de quoi que ce soit. Et je pense que si l'idée c'est de comparer, on peut faire un comparateur
(1:09:55) mieux que ça très clairement.
(1:10:00) Et ça c'est vous l'affinité que vous aurez avec la chose qui qui est produite quoi. [soupir]
(1:10:07) Voilà. Bien, je pense qu'on va s'arrêter là pour cette vidéo. On a fait déjà un
(1:10:12) premier un premier travail de onboarding sur le projet. On a créé la road map et
(1:10:18) on a construit une maquette V1. Malheureusement la maquette elle
(1:10:23) convient pas donc je vais un petit peu la retravailler mais je pense qu'on fera ça dans une
(1:10:29) nouvelle vidéo. On retravaillera la maquette. On on regardera où en est la roadmap du projet
(1:10:36) et on finira ce petit projet. Le l'objectif c'est d'avoir notre petite application pour pouvoir montrer un
(1:10:42) petit peu ce qu'on fait avec les autres modèles. Et après cette petite pause
(1:10:47) application alternative, on reviendra sur Nova Factory, sur le gros chantier où là ben il faudra passer à des
(1:10:56) à des à des travaux plus importants
(1:11:02) euh puisque comme j'avais dit, je veux retoucher à cette partie-là. Je veux
(1:11:08) retoucher cette partie-là qui me froisse de plus en plus de jour en jour.
(1:11:13) Donc je pense que c'est c'est ce qu'on fera la prochaine fois dans dans Nova Factory. On reverra l'appel d'agent. Et
(1:11:19) le gros chantier dont j'ai parlé, c'est aussi le onboarding directement depuis l'application. Je veux pouvoir enfin je
(1:11:26) veux qu'un de mes prochains utilisateurs puisse onboarder son prochain projet via
(1:11:31) l'application sans dépendre d'un plugin hypothétique que je mettrai à jour ou pas qu'il faut
(1:11:37) que je mette disponible sur internet. C'est vraiment dès qu'on commence à avoir en fait tout un tout un tas de
(1:11:44) choses qui doit se greffer à l'application pour que ça fonctionne, ben le risque c'est que les gens n'utilise pas ces choseslà parce qu'ils
(1:11:49) savent pas que c'est là parce que donc en gros il faut que ce faut que l'application intègre un maximum de choses et qu'elle soit simple à
(1:11:55) utiliser. Exactement le [raclement de gorge] même principe que ça. Le CLI on pourrait le
(1:12:00) mettre à jour sans passer par Nova Factory. Mais le fait d'avoir Nova Factory, ça fait que ben tout de suite
(1:12:06) il va dire "Ah, il y a une nouvelle mise à jour, tu veux la faire ? Tu veux pas la faire ? Tu préfères lancer quand même, mettre à jour. Voilà.
(1:12:14) Et là, je peux mettre à jour directement comme si je lançais la commande moi-même depuis un terminal à l'extérieur de
(1:12:19) l'application. Ça ça a produit le même effet, hein. [souffle coupé] Mais il faut connaître la commande, il faut savoir que la mise à jour est
(1:12:25) disponible. Voilà.
(1:12:31) Donc euh donc ça nous aide quand même. Et le but justement c'est d'avoir une application
(1:12:38) qui au lieu de nous faire perdre du temps nous permet d'en gagner sur tout un tas de choses et du coup peut-être
(1:12:44) d'être plus productif, peut-être de vous dégager du temps pour faire autre chose. Bon aujourd'hui, je l'utilise pour être plus productif. Donc plus je vais vite
(1:12:50) sur une tâche et elle est bien faite, moins j'ai de temps à à à produire pour
(1:12:56) la corriger ou pour euh pour la rendre meilleure, quoi.
(1:13:01) Voilà tout. Ici, il a fini la maquette. Pour lui, c'est terminé. Je vais la réafficher
(1:13:08) quand même au cas où il y a des choses qui qui changent.
(1:13:19) Bon, c'est juste qu'il a mis la maquette qu'il a mis la maquette avec le design système en fait. Donc vous avez la
(1:13:26) version obsidienne et vous avez la version en light. En gros,
(1:13:32) [grognement]
(1:13:39) comment dire ? Voilà, je je n'en dirai pas plus. À vous de juger. [rires]
(1:13:46) À vous de juger. Mais je n'aime pas bien la version qu'il a faite. Je dois bien avouer. Je je trouve ça léger.
(1:13:54) On est quand même sur le mode frontière, le modèle frontière dansopique en X.
(1:14:00) Donc au-dessus c'est max. C'est-à-dire vous d'office vous donnez 1,5 1,5 fois
(1:14:06) le nombre de tokens pour pour la réalisation. Voilà.
(1:14:11) En fait, il y a des défauts qui sont pas il y a des choses qui sont pas belles. Je comprends pas pourquoi ici le rond est décalé, il est pas centré. Euh là,
(1:14:18) pareil. Euh et c'est surtout la manière dont il a disposé les choses. Je Comment je
(1:14:26) retourne en arrière là ? Ah, faut que je clique sur faut que je clique sur catalogue pour
(1:14:32) revenir en arrière. Donc voilà. Mais on reprendra ça la
(1:14:39) prochaine fois. Sur ce, je vous dis bonne fin de journée
(1:14:45) et puis à bientôt.
