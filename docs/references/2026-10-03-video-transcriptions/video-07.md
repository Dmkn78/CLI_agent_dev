# Jour 2 - Vibe coding sur NovaFactory avec GPT6 Astra, Claude et Grok

**URL :** https://www.youtube.com/watch?v=_12NIwMnULk

(0:00) Bonjour à tous, bienvenue dans cette nouvelle vidéo. On va reprendre là où on s'était arrêté la dernière fois avec
(0:07) Codex. Il a fini l'implémentation, ça lui a quand même pris 4h21.
(0:13) Donc il a pas il a pas chaubé. Il a eu pas mal de de déboir avec la review de
(0:20) ce que j'ai vu puis qu'il [grognement] s'est fait rejeter euh trois fois me semble-t-il. On va aller vérifier ça.
(0:28) J'ai fait cette fature il y a il y a il y a pas longtemps là et ça me permet justement de de pouvoir venir euh
(0:36) regarder ce qui s'est passé mais plus avec un œil un petit peu comme on a dans
(0:41) l'application Codex euh qui est quand même beaucoup plus agréable que
(0:48) le la console. Et en plus de ça, on peut avoir la totalité du transcript du début
(0:53) à la fin. Et donc ça vous montrera que j'ai pas eu à renvoyer de de message
(0:59) après la validation de la maquette qu'on avait faite ensemble. Donc on va se mettre ici. C'est ce qu'on avait euh
(1:04) validé et on va voir un petit peu. Je voudrais vous montrer
(1:10) les moments où justement ben la review le le le le bloc quoi et lui et lui
(1:16) demande de corriger certains trucs. J'ai vu qu'il en avait parlé à un moment donné.
(1:22) Donc c'est assez long. Il y a beaucoup de beaucoup de messages. Alors ça va
(1:29) être dans ce bloc. Il a fait toutes ses implémentations.
(1:37) Là, il constate que ben les tests passent, que tout est tout s'est bien passé après le rebase et il lance le
(1:44) juge. Enfin, il a lancé un juge mais sonné, il a il a utilisé.
(1:51) Donc il voit ce que fait le le juge en fait, il a accès au transcript
(1:58) et là c'est le moment où il a été validé. Mais j'ai vu que précédemment
(2:05) il s'était fait plusieurs fois rejeter quoi. Concerne les assertions, rester sur
(2:12) l'ancien contrat. Voilà. Donc là, en gros, ça lui a permis de de trouver des
(2:17) de trouver des choses qui le qui avait pas vu lui-même, mais qui
(2:25) nécessitait une correction, quoi. Et du coup, c'est l'un des trucs que je constate depuis que je me suis mis à
(2:31) faire une review automatique [grognement] à chaque fois que je fais du code avec Lia, c'est que bah il y a
(2:37) des choses à trouver. En fait, si vous faites pas la review, partez du principe que bah le code correspond pas peut-être
(2:44) à 100 % à ce qu'on attendrait de ce qu'il soit, quoi. [soupir][souffle coupé]
(2:49) Bref, on va pas s'étendre sur le sur cette partie là. il y a pas grand-chose à voir.
(2:55) À partir du moment où il a fait le boulot, que les tests sont passés et que le juge a accepté, normalement on a on a
(3:03) notre fature. Donc création explicite des tâches,
(3:08) c'est ce qu'on souhaitait hein. On avait vu que l'une des problématiques qu'on avait enfin que j'ai pour le moment,
(3:16) c'est que ben il y a tout un tas de tâches qui se créent alors qu'on en a pas réellement besoin quoi. C'est des
(3:21) tâches plus utilitaires. est lié au fait que c'est déterministe [souffle coupé] et que du coup à chaque fois qu'il crée
(3:26) une branche, ça crée automatiquement une tasque. Au début, ça paraissait une bonne idée euh mais à l'usage bah il
(3:35) faut dire que ça allait un peu moins [grognement] mais ça fait partie du ça
(3:40) fait partie du jeu. Et l'autre il a fini un peu plus tôt du
(3:45) coup euh l'agent qui était sur les modèles dynamiques. Il a été beaucoup plus
(3:52) rapide. Il a eu un peu moins de problèmes avec la review mais le travail était beaucoup moins
(3:58) conséquent. Il réutilise un bout de code qu'on a déjà quelque part. Il l'a adapté pour que ça fonctionne dans les deux
(4:04) cas. [grognement] Et donc euh voilà, en gros là à cette étape-là, soit je me
(4:12) satisfais de ça et je verrai le résultat à la prochaine au prochain lancement de
(4:18) l'application quand j'aurai fait la la release. Oui, parce que petite parenthèse,
(4:23) l'application, elle est en rust pour le backend et tory pour le le
(4:31) front. Donc ça embarque ça embarque tout ça bundelé quoi.
(4:37) [grognement] Et et donc en gros pour à chaque fois que je veux que l'application soit mise à
(4:42) jour, il faut qu'on fasse ce qu'on appelle une release quoi, qu'on rebuil de l'application et qu'on la remette
(4:48) disponible sur GitHub pour [grognement] que l'application le détecte et il nous propose automatiquement la mise à jour.
(4:56) [grognement] Là on voit ben forcément elle nous propose pas de mise à jour puisque actuellement on n pas fait la
(5:01) relas. Ce qui peut être sympa dans certains cas pour voir le comportement, c'est lui
(5:07) demander de lancer tout simplement ou de lancer soi-même une commande Tory Dev
(5:12) qui va builder l'application sur notre PC et nous permettre de voir ce que ça donne directement dans le dans le dans
(5:21) l'application ouverte. Là, on va pas trop s'attarder là-dessus
(5:26) parce que j'ai deux trois trucs que je voulais corriger
(5:32) et euh je pense que ça passe un petit peu. En gros, j'ai pas envie de build
(5:38) maintenant pour rebuild dans 2h tout simplement. Avant, je l'aurais fait, maintenant je le fais moins
(5:45) parce que quand il va build forcément en fait, il va modifier des choses. Du coup, il va repasser toute la suite de test, voir si euh il a bien fait son
(5:52) travail. Et donc ça prend quand même un petit peu de temps. Donc si on peut minimiser le temps où on passe sur des features qui
(6:00) qui change pas fondamentalement le le fonctionnement de l'application, on
(6:05) évite. Donc là,
(6:10) il y a une ou deux choses qui m'embêtent un petit peu. Notamment ici quand je vais cliquer.
(6:17) En théorie, je suis censé voir les fichiers qu'à modifié l'agent.
(6:24) Mais euh [gémissement] là, il m'a mis ce select qui était pas
(6:30) du tout prévu. à la base la demande initiale de quand on a créé la feature,
(6:36) on avait [grognement] déjà l'onglet skill ici qui ça aussi c'est au départ de l'application, ça paraît une
(6:42) excellente idée, mais en réalité [grognement] euh soit je vais taper le skill euh en
(6:49) tapant la commande, soit c'est lui qui va utiliser le skill et c'est très souvent le mode que j'utilise. J'ai pas
(6:56) énormément de skill mais ce que j'ai besoin, il va il va savoir très bien les
(7:01) utiliser. Là, j'ai remarqué, ils ont pas mal travaillé.
(7:06) Du coup, j'ai remarqué, j'ai plus que 88 Go sur le disque dur. Donc là, on va déjà commencer par dire à Claude d'aller
(7:12) modifier enfin d'aller pardon faire le nettoyage des work déjà mer compagnie.
(7:17) Fais-moi le ménage des work déjà merge et profites aussi pour nettoyer le
(7:23) dossier de build.
(7:29) Alors ça c'est une autre application, on en parlera plus tard mais c'est Nova Wisp. C'est inspiré en gros de Whisper
(7:36) Whisper Flow. Euh et cette application
(7:41) ce qui est assez impressionnant, je suis parti de de de l'idée de faire cette
(7:46) application. J'en ai parlé à un Claude à l'époque, j'avais j'étais en train de construire Nova Factory
(7:53) et euh et je je trouvais ça fastudieux en fait d'écrire euh des promptes. Souvent en
(8:00) fait quand vous avez une idée euh elle sort beaucoup mieux en parlant que en
(8:06) écrivant. Euh c'est comme ça. Enfin du moins moi personnellement c'est comme ça que je fonctionne. Et du coup je me suis
(8:13) dit tiens, ce serait pas mal d'essayer de reproduire quelque chose un peu comme Wisper Flow. [grognement] Et j'en ai
(8:18) parlé avec Claude. On a fait ce que je faisais beaucoup à l'époque, c'est c'est-à-dire une road map. Euh j'aimais bien qu'il me fasse des grosses ro map.
(8:25) Donc il on on se dit voilà j'aimerais bien telle application ou reproduire du moins
(8:32) autant qu'on peut telle application. [grognement] Et à partir de ce moment-là, on fait une road map, on met les prérequis, ce qu'on
(8:39) a besoin et où c'est qu'on veut aller [grognement] en plein de points. Et à
(8:44) partir de ce moment-là, je lançais un agent sur une étape de de cette road map
(8:49) et lui, il partait sur le sur le skill feature. Donc, il commençait par faire
(8:54) une spec, le plan qui découle de la spec et l'implémentation ensuite. Et en gros,
(9:00) c'est quand Fable est sorti, il a one shot l'application en 12h à peu près. En
(9:06) 12h l'application a fonctionner et c'est là où j'ai commencé à utiliser beaucoup les
(9:12) design systèmes et et même faire designer l'application
(9:17) euh par le par LIA directement sur mon PC. Et en gros, j'ai fait ça comment ?
(9:23) D'abord, j'ai utilisé Cloud Design la toute première fois et
(9:29) une fois qu'il l'a eu fait, je me suis aperçu qu'en fait la seule chose qu'il y avait de différenci enfin que moi
(9:34) j'utilisais de différenciant dans Cloud Design, c'est le fait que en fait
(9:39) ils prennent des photos, il prend des screens de avec Playwght et du coup à chaque fois qu'il crée quelque chose, il
(9:45) peut voir assez assez facilement là où il a fait des boulettes et les corriger avant de revenir vers toi.
(9:52) [grognement] Et du coup ensuite j'ai réutilisé ça. Je me suis dit tiens, je vais lui filer.
(9:57) J'avais fait faire un design système et je je vais vous montrer un petit peu comment ça se comment ça se copie le le
(10:04) machin. J'avais je lui ai fait faire un design système au départ. [grognement] Je vais
(10:09) même peut-être retrouver la celle de base. Hop ici. Wsp. Je pense que c'est
(10:16) ça. Donc en gros, ça se compose en trois fichiers. En Ouais, je j'avais ça en trois fichiers.
(10:21) En gros, il y en a une où, c'est le design system. Ça se donne comme ça. Merde,
(10:29) voilà. Truc tout bateau. On avait fait un petit un petit logo à la va vite et puis il a
(10:35) comme ça prévu un petit peu comment allait se passer les blocs et cetera. On avait fait plusieurs thèmes.
(10:43) Ça c'était l'idée initiale. En gros, il avait préparé quelques trucs, c'était sympathique.
(10:49) Et de ça en fait après, bah il a fait la maquette de l'application carrément.
(10:54) Et du coup, au moment où l'autre il se met à coder, bah il sait exactement ce qu'il doit
(11:01) faire. Voilà. Et pareil, c'est du Tory avec du avec du
(11:12) [souffle coupé][soupir] je vais y arriver euh Dory React et
(11:19) mince Rust en backend et ça utilise du coup les modèles locaux directement sur
(11:26) notre machine quoi. Et là tu pays rien quoi. C'est totalement gratuit. Il a one
(11:31) shot ça en 12h. À partir du moment où je lui ai donné la road map, le design
(11:37) system et le et le et la maquette de l'application, bah il
(11:42) [grognement] a créé l'application. Voilà, aussi simple que ça.
(11:48) Et bon après attention, je vais tempér ce que je raconte. Il a onehot
(11:54) l'application en 12h certes, mais euh après pour la pour l'améliorer
(12:01) parce que forcément en fait lui il a fait la base de l'application, donc il a fait toutes ces fonctionnalités là euh
(12:07) étaient présentes dès le début mais par exemple le Whisper large turbo, enfin V3
(12:14) turbo, il l'avait pas mis de base. C'est à partir du moment où j'ai voulu en fait améliorer l'application que je
(12:20) lui ai dit "Mais attends, ça prend énormément de temps et puis ça pèse beaucoup." En gros, quand vous prenez un gros modèle comme ça, euh tout de suite ça va
(12:28) taper dans votre carte graphique et ça et et ça prend ben
(12:34) 3 4 Go juste pour le fonctionnement quoi. Donc on a très vite beaucoup de mémoires vives qui sont utilisées et
(12:41) pour ceux qui utilisent un peu des modèles locaux, si tu veux si tu veux t'amuser un petit peu avec un quen ou
(12:48) quelque chose comme ça, bah très vite tu en as besoin de ta de tes gigas de de VRAM quoi. [souffle coupé]
(12:54) Et tu peux aussi passer en mode CPU mais là la transcription est relativement
(13:00) lente. Je préfère très largement la version GPU. Il y a pas de il y a pas photo, ça va très vite. Et donc
(13:07) l'application fonctionnait après 12h, mais pour la rendre euh meilleure en
(13:13) gros, bah il a fallu euh quasi de semaines supplémentaires, quoi.
(13:18) Voilà, il passait assez régulièrement du temps dessus parce qu'il y a beaucoup de choses là-dessus. Il peut pas le faire
(13:24) tout seul. quand vous voulez tester la transcription, bah il va falloir que vous mettiez derrière le micro et que vous vous lisiez la phrase qu'il veut
(13:32) que vous lisiez pour avoir l'exemple et tout. Mais ça c'est un exemple d'une application qui m'a ben coûté très peu
(13:40) de token. Il faut dire quand même ce qui est comparé à ce que ça me coûterait l'abonnement mensuel sur Whisper Flow
(13:47) quoi. Et j'ai aucune restriction et mes données elles restent sur mon PC quoi.
(13:53) Il a vraiment pensé à tout quoi. Là je peux copier le message et le recoller à quelque part d'autre et cetera. On peut
(13:59) choisir les les shortcuts mais voilà, il y a tout plein de petits
(14:05) détails. Il faut fautud faut faut en avoir conscience. Ça se règle avec le
(14:10) temps. Par exemple, ça ça se lançait ici et c'était souvent sous la barre window. Il a fallu qu'on fasse un développement
(14:16) spécifique, un correctif spécifique pour que je puisse l'avoir au-dessus et cetera et cetera.
(14:22) Donc pour vous donner un ordre d'idé, on peut va coder quelque chose très très vite mais c'est pas pour ça que c'est un
(14:29) produit qu'on pourra sortir, commercialiser ou même vendre à quelqu'un [grognement] tout de suite quoi. Ça va nécessiter des
(14:36) allers-retours et de la méthodologie. Moi, comme je l'ai dit sur la première
(14:41) vidéo, je suis plus je viens plutôt du développement web. Donc beaucoup de de Python, Python
(14:50) Jango et de JavaScript pour le front. [grognement] Et du coup la première la toute première
(14:57) fois que j'ai fait une la l'application Nova Factory, c'était une une découverte
(15:03) totale. Je pensais pas qu'on pouvait euh fabriquer un front en React et
(15:09) l'utiliser [souffle coupé] euh dans une application native qu'on
(15:14) installe sur le PC, quoi. Donc les premières préoccupations que j'ai eu, c'est sur les performances.
(15:20) Moi, je voulais que les performances soient au rendez-vous. Je voulais pas que l'application elle fasse laguer le
(15:25) PC ou que ce soit ingérable quoi. Donc c'est on a tout de suite mis l'accent
(15:32) sur les performances et du coup il dès la construction en fait il a pensé
(15:38) l'application pour que ce soit rapide, fluide et qu'on ait le minimum de de
(15:44) latence. Voilà. Et donc j'avoue que là ça c'est
(15:49) plutôt une franche réussite à ce niveau-là. Mais tout ne fonctionne pas du premier coup. Il faut il faut en
(15:56) avoir conscience. Dans notre dans le travail de développement, c'est beaucoup d'itération, [grognement]
(16:02) de suivi et comme je disais euh également dans la vidéo précédente, pour moi l'un des aspects qui est très
(16:09) important, c'est de de pouvoir évaluer ce qu'on vient de faire. En fait, si
(16:15) vous codez quelque chose et que ben en gros, vous pouvez faire faire un audit à
(16:20) un agent, il trouvera toujours quelque chose à aller corriger à un endroit. En fait, c'est logique. Surtout en fait,
(16:27) plus vous travaillez sur une application, plus vous ajoutez ou vous ou vous modifiez du code euh souvent
(16:34) dans un secteur en particulier, sans réellement avoir conscience de tout ce qu'il y a autour, bah il y a un moment
(16:41) donné où nécessairement il va y avoir des conflits et donc il faut il faut
(16:47) assez régulièrement venir nettoyer un petit peu ces conflits. Donc faut pas hésiter à envoyer des agents, faire des
(16:53) audits, rechercher des choses qui vous paraissent peut-être négatif et
(17:00) euh comment dire tout ça ça se construit avec le temps. Vous pouvez moi au début
(17:07) je je je lui faisais créer dans chacun des projets tout un tas de fichiers où
(17:14) il se référence en fait des choses. Donc on a le cloud que vous connaissez
(17:19) tous, j'imagine cloud.md MD, ceux qui utilisent Cloud ou le agent. MD, ceux qui utilisent Codex par exemple. Et en
(17:28) gros, l'idée de l'idée c'est de c'est c'est comment dire ? En gros, au début,
(17:34) il y a il y a quelques il y a il y a il y a un an, on y mettait tout tout plein de règles. Ne fais pas c, fais ça, dans
(17:42) telle situation, utilise ceci, dans telle situation, utilise cela. Aujourd'hui, c'est beaucoup moins euh
(17:47) nécessaire. Moi, je vais je vais avoir tendance à ce qui est procédure ou que
(17:52) je veux réellement qu'il exécute quelque chose d'une certaine manière, bah je fabrique un skill. Je pense que c'est
(17:58) beaucoup plus euh intéressant parce que déjà ça le l'agent.m ou le cloud.md, il
(18:04) est injecté à tout euh tout agent qui est lancé. Même les sous-agents derrière, ils vont récupérer euh ce type
(18:11) de document. Donc si ce document là il grossit énormément, ben vous vous y vous
(18:16) vous utilisez énormément de contexte alors que c'est pas
(18:22) [gémissement] tout le temps nécessaire quoi. Voilà. Donc plutôt lui dire tiens mais certaines choses tu vas les trouver
(18:28) à tel endroit [grognement] et comme ça en fait lui il a ça qui est injecté de base et quand c'est nécessaire il va
(18:34) savoir aller regarder telle ou telle information à tel endroit
(18:40) pour mieux éviter de surcharger mais même tout ça aujourd'hui
(18:45) vraiment il faut y aller avec parsimonie je m'aperçois que il y a beaucoup de choses là-dedans qui sont pas vraiment
(18:52) utilisées à part quand je vais lui dire tiens, on va faire un tour sur la
(18:57) qualité du code par exemple et dans ces cas-là, bah là, il va il va se référencer à ça. Il sait que ici, il a
(19:03) les conventions par exemple, mais ça c'est pareil. Ce type de chos
(19:10) là, il les respecte avec
(19:15) c'est relatif. Voilà. Des fois, il va très bien suivre les règles, des fois il ne suivra pas du
(19:21) tout les règles. Du coup, bon, les piqû de rappel et ça en fait si vous arrivez à capter le comportement, ça se corrige.
(19:28) Voilà, dans certaines situations, il y a des choses qui peuvent se corriger. Euh il y en a d'autres, c'est plus compliqué. Mais euh globalement, moi
(19:36) j'avoue que j'ai j'ai pas j'ai pas de réels problèmes. En général, quand un
(19:42) problème survient justement, on on va travailler pour faire en sorte que bah il disparaisse quoi. Donc je vais plutôt
(19:49) appeler ça des fr des frictions que des que des problèmes. Revenons à nos
(19:55) moutons. Ici, lui, il nous a trouvé des choses à nettoyer. [soupir]
(20:01) Et donc comme c'est Claude, Claude il pose beaucoup de questions. L'initiative c'est c'est voilà, il faut
(20:08) lui demander de prendre l'initiative quoi. [grognement] Donc là, il me dit que ben j'ai des j'ai
(20:14) des j'ai des dossiers de build en gros. Euh
(20:20) est-ce que il retire les choses qui sont inutilisées depuis 7 jours ou pas ? Euh,
(20:27) on va lui laisser faire ça. On va lui laisser enlever ceux qui ont plus de 7 jours d'inutilité
(20:35) parce qu'en gros toutes les applications euh elles vont avoir des builds particuliers et ben quand tu vas lancer
(20:42) 8 9 12 agents dans une journée, ils vont tous créer leur petit euh [grognement]
(20:48) leur petit build et ça laisse tout un tas d'artefacts en fait euh qui seront plus utilisés.
(20:55) Donc là, il va nettoyer et une fois qu'il aura nettoyé, on pourra passer à la suite.
(21:02) C'est déjà fait d'ailleurs. Donc on peut se remettre sur notre haut
(21:11) ici. Là, il y a quelque chose qui me dérange en fait. Hop hop.
(21:19) En gros, sur la mémoire, on peut confier à un agent [grognement] ici euh faire l'entretien de la mémoire. Et ça c'était
(21:25) jamais apparu avant et ça vient totalement péter mon interface.
(21:32) Donc on va faire un truc comme ça un peu approximatif. Hop. Et on va l'envoyer à Claude cette
(21:39) fois parce que j'ai besoin qu'il soit un peu sérieux le gars.
(21:45) J'ai besoin d'un type qui suive les consignes. [rires]
(21:51) Et donc on va lui dire une fois qu'on a fait un entretien avec
(21:56) un agent, on a cette espèce de bloc qui apparaît où rien ne s'affiche pour le coup.
(22:04) Du coup, tu vas me supprimer ça. J'aime pas du tout.
(22:12) En plus, il me semble me rappeler euh qu'il y a de jours, on a rendu totalement obsolète le fait
(22:21) d'envoyer [raclement de gorge] un agent corriger
(22:27) euh comment j'ai appelé ça là ? C'est petit trou de mémoire. Confier
(22:32) l'entretien. On a rendu ça totalement obsolète. Le fait d'envoyer un un agent entretenir
(22:41) la mémoire car c'est devenu
(22:50) un acte automatique durant la session.
(22:59) Là, pour la petite explication euh
(23:04) à une période en fait, vu que ben je l'ai expliqué dans la vidéo précédente, je faire un petit truc
(23:11) là-dessus. En gros, au début, vous dites "Putain, c'est une super punaise, c'est
(23:16) une super idée d'avoir de la mémoire sur le projet." Donc donc vous les laissez mettre de la
(23:23) de de mémoriser tout et n'importe quoi. Et au bout d'un moment en fait vous allez vous apercevoir que ben ils
(23:28) adorent ça quoi. Ils ont l'impression que tout est importé en mémorisé. Donc je m'étais dit ça pourrait être pas mal que ce soit moi qui valide ce qui euh ce
(23:36) qui est nécessaire à mettre en mémoire et ce qu'il n'est pas. Et là encore une fois pareil avec l'usage je me suis
(23:42) rendu compte qu'en fait c'est chronophage de fou et j'ai souvent pas la réponse en fait. J'ai souvent pas la
(23:47) réponse de si ça va lui servir ou si ça va pas lui servir, [soupir] si c'est utile. Euh enfin bon. Bref, du
(23:56) coup en fait, on est passé à un autre mode de fonctionnement où les agents en fait, ils doivent être autonomes sur la
(24:02) gestion de la mémoire, mais ça doit avoir un but bien particulier cette
(24:07) mémoire, c'est soit un piège qui fait perdre du temps et cetera et cetera. Et au fur à mesure des sessions, on voit
(24:14) euh si ça a été utilisé ou non. Si par exemple un agent découvre que ben une
(24:20) mémoire elle elle raconte quelque chose qui est faux, ben il va le rapporter à à
(24:27) l'agent principal et l'agent principal peut tout à fait décider de dire "Bon mais là effectivement, j'ai vérifié ce
(24:33) que dit l'agent, c'est réel, le la mémoire est corrompue à ce niveau-là. Donc il va supprimer le souvenir. Alors
(24:40) souvent ils ont même pas pas tout à fait le supprimé, c'est plus il va l'archiver. En gros, il va supprimer la
(24:46) partie euh qui est injectée aux agents au démarrage des sessions. Et donc c'est
(24:52) cette partie qui est injectée aux agents. C'est le c'est c'est ce qui c'est ce qu'il appelle le noyau. C'est en gros l'entête, tu vois, genre le
(24:59) Grock plancher MCP1 MO. Ben ça c'est injecté à l'agent.
(25:05) Et ensuite derrière, si euh durant la conversation il se rend compte qu'il a besoin de se souvenir, il va aller voir
(25:13) réellement le la totalité du du corps du souvenir quoi. Et ça peut le mener à un autre
(25:18) souvenir et cetera et cetera. Voilà le le le topo. Et donc je pense
(25:25) que on a je pense qu'on avait corrigé ça de mémoire. [grognement] Donc là qu'est-ce qu'il a trouvé ?
(25:30) Qu'est-ce qu'il nous dit ? nous dit le bloc entouré est deux choses la ligne entretien
(25:36) terminé et le carton citation journal de la citation I5
(25:47) [grognement] avec restaurateur par ligne chemin Hm.
(25:57) Mais oui, tu vas tu vas en effet supprimer le
(26:06) le bouton vu queon s'en sert plus.
(26:12) Souvent quand s'il met recommandé, c'est c'est la meilleure solution mais des
(26:18) fois ça pas. Il faut là encore euh il faut que ça fasse appel à votre à votre
(26:24) jugement parce que ben des fois les agents, ils ont tendance à faire ce qui est le plus simple ou le plus rapide. Et
(26:30) ça ça vient principalement pour cl de son prom système. Dans son prom système, il y a un truc qui qui lui dit
(26:35) littéralement choisit la solution la plus rapide. Et du coup, ça a tendance
(26:41) des fois à l'influencer dans dans une voie qui voilà, la plupart du temps,
(26:46) c'est bien parce que ça évite qu'il fasse un un un buldozer alors que tu avais
(26:51) demandé une pelle et que tu as juste besoin de mettre de coups de pelle pour creuser un trou. Mais des fois euh bah
(26:58) ça nécessitait qu'il aille un peu plus loin et et qu'il ajoute des poignées à la pelle tout simplement et il va pas
(27:04) forcément le faire. Et donc là des fois c'est bien de lui dire "Attends euh j'ai compris vers quoi tu vas mais moi
(27:12) j'aimerais bien aller autre part." Bref là il va nous nous résoudre ce problème. C'est un tout petit problème, c'est pas
(27:17) très important. Nous on va se focaliser sur autre chose. Ici en gros, je suis en
(27:24) train d'essayer de créer un truc. Je me suis dit quand [grognement] j'ai lancé Codex l'autre jour, je me suis dit
(27:29) je lance Codex et je vois que j'ai toutes les transcriptions en fait qui apparaissent sur le sur la gauche et
(27:37) je peux naviguer dans les conversations comme ça que j'ai eu uniquement dans mon appli le CLI. Donc en gros, ils sont
(27:44) capables de récupérer tes transcripts et de les mettre en ben en visibilité euh
(27:52) classique quoi, dans du code classique
(27:58) plutôt que dans la dans le terminal quoi. Et du coup, je me suis dit mais ce serait quand même génial de pouvoir
(28:04) avoir le même principe déjà pour pouvoir aller regarder ce qui s'est passé potentiellement postérioré et éventuellement pour pouvoir lancer tout
(28:11) simplement en fait des agents à partir d'ici et d'avoir un peu la même le même
(28:16) UI que on pourrait avoir sur Codex. Bon, déjà la complexité c'est que
(28:23) j'utilise pas que Codex. Donc si je veux que ce soit disponible pour Cloud, GPT
(28:28) et Grock, bah il y a des petites adaptations à faire. Mais ce que je
(28:34) remarque, Grock fonctionne mieux. Très clairement à chaque fois la
(28:39) conversation, elle s'affiche bien, c'est pas lagy, on peut enfin on voit tout
(28:44) comme il faut, c'est relativement bien implémenté. [grognement]
(28:49) Claude, il y avait quelques petits problèmes. J'ai remarqué. Voilà, il faut que je fasse un coup de souris pour pouvoir
(28:56) aller chercher le message en mod. Ça ça me ça me froisse fortement.
(29:04) Là, ça va, ça l'a pas fait.
(29:11) Et ensuite ce qui me gêne c'est ça. Ici il me met
(29:16) le le le la modification en fait de
(29:22) du de l'extrait quoi. Il il me le met bah l'un au-dessus de l'autre. Je comprends pas bien ce qui a été modifié
(29:28) ou ce qui l'a pas été. Et du coup, j'aimerais bien qu'il me fasse le le le le
(29:35) code dif qu'on peut l'avoir dans dans d'autres endroits. Je pas
(29:41) retrouver où d'ailleurs. J'en ai aucun. Parfait.
(29:50) C'est pas grave, on sait de quoi on va lui on va lui causer.
(29:55) Donc on va screen ça. Ça peut être pas mal. Voilà,
(30:03) ça peut être pas mal du tout. Et pour lui montrer un petit peu ce qu'on veut,
(30:10) on va aller dans l'éditeur. Ici, on a on a un truc guit. Tant pis, on va ouvrir le graphe.
(30:18) On va prendre fichier div comme ça. Voilà.
(30:24) Mais je l'aime pas trop celui-là. J'avoue que c'est un peu tout moche la manière dont il l'a fait ici.
(30:32) J'aurais préféré l'avoir dans le difficile.
(30:38) OK, c'est pas grave. Je vais utiliser Codex parce que je
(30:44) trouve que ces derniers temps niveau UI, Codex, il me fait des trucs bien plus
(30:49) jolis. Euh donc donc on va passer ça à Codex et on
(30:56) va lui parler de notre problématique. On va lui dire
(31:02) dans le mode chat au niveau des fichiers modifiés on voit
(31:08) le nombre de lignes en plus le nombre de lignes en moins. Par contre, on n pas de dif
(31:14) joli, tu sais, avec le vert, le rouge, à gauche, les lignes, les numéros de
(31:21) lignes, pardon. J'aimerais que tu me corriges ça et tu passes par une maquette d'abord, hein.
(31:30) Allez, c'est parti. Lui, il va travailler là-dessus. Ensuite là, on va régler plein de trucs UI. Il y a plein
(31:37) de trucs dans l'UI que je que j'adore parce que je les ai beaucoup travaillé avec Lia. Il y en a il y en a d'autres
(31:43) j'aime pas du tout. Euh et du coup, on va corriger ça ici. Là, ça c'est Codex
(31:49) qui l'a fait. Il l'a fait en one tap euh à partir d'une maquette. Il a il a fait
(31:54) la maquette et tout, mais j'ai même pas eu quoi que ce soit à lui dire. En gros, en gros, l'idée c'était que au début,
(32:01) j'avais juste le mode classique ici comme ça et lui, il m'a montré les huiles comme ça. Et là, je me suis dit
(32:08) mince, en fait, je vais perdre mes petites bulles avec la mise à jour des
(32:13) des Cali. Et je trouvais ça vraiment top en fait la mise à jour comme ça. Et du coup, je lui ai dit "Bah, il faut qu'on
(32:19) ait quand même un endroit où on puisse vérifier si c'est à jour, si c'est pas à jour, le mettre à jour indépendamment de
(32:25) notre côté." Donc en fait, il a créé ça qui est vraiment sympa. Ça permet de gérer les comptes et tout, d'ajouter
(32:32) supprimer un compte et cetera.
(32:38) Mais en fait cette page là, elle a pas bougé. Donc j'ai j'ai conservé cette cette partie là.
(32:45) Donc je me retrouve avec quelque chose de redondant. Mais j'aiais j'aime bien ici
(32:50) ce qu'il a fait là, le fait qu'il ait récupéré les les petit shadow derrière les cardes qui fait qu'on a l'impression
(32:57) qu'elle vole un petit peu là. Et cet aspect où c'est tout lisse, tout le reste est lisse. J'aime bien ça et
(33:02) j'aimerais qu'il me le reproduise ici là. Ici, j'aime pas vraiment l'interface.
(33:08) Ça c'est Cloud qui l'a fait [soupir] au tout début d'aprè. Ça, je lui ai fait refaire donc c'est un petit peu plus
(33:14) sympa très clairement. Mais euh bref, voilà les go et les
(33:20) couleurs. Moi, j'aime pas trop. Donc on va se lancer un petit codex ici. On va
(33:28) prendre en photo ça là comme ça il va comprendre le principe de
(33:33) ce qu'on veut. Voilà. Hop. Hop. Et on va aussi prendre
(33:40) en photo ça. Beaucoup plus simple de parler à travers des images pour le coup.
(33:46) Quoi que la deuxième, j'en ai pas besoin. En fait, je vais pouvoir lui dire directement
(33:53) ce que je veux. Je pense que c'est plus simple parce que sinon ça va faire appel au il
(33:59) va il va aller chercher ses outils et je sais pas en terme de de de token
(34:06) ce que ça donne ce trucl mais et du coup c'est la dialogue fournisseur. Donc on va lui dire
(34:14) j'aimerais que tu revois le design de la dialogue
(34:20) sitting. Je parle du design global, pas de chaque
(34:26) onglet.
(34:32) Tu vas me faire le même design que ce que tu as fait au
(34:37) niveau de la dialogue fournisseur
(34:42) avec l'aspect plat.
(34:48) Tu vois, aucun BG différent. là je je lui donne trop d'information,
(34:54) il faut pas que j'aille dans ce sens-là. Euh
(34:59) sinon, je vais l'indcer à inventer des trucs et moi je veux juste en fait [souffle coupé] qu'il me vire ce ce BG différent ici et
(35:08) qui me mette des cards de là qu'on puisse cliquer. Ce que tu as fait au niveau de la
(35:14) dialogue fournisseur. Comment j'explique ça ?
(35:24) la marge avec le shadow sur les cartes sélectionnées
(35:30) et le BG identique à gauche et à droite.
(35:39) Tu travailles sur une maquette.
(35:46) Là, on envoie un deuxième sur une maquette. lui il a fini le nettoyage. Ici, il y a pas grand-chose à faire, il
(35:51) a juste viré des work déjà à Merg. Et comme je disais, donc là, c'est le
(35:59) c'est le c'est le dossier où il met les les les caches de de
(36:06) Tory et donc il a tout viré. C'est bon, on peut continuer à travailler
(36:12) ici sur le bug d'affichage. Il m'a mis blog entretien. C'est
(36:18) plentretien mais c'est pas grave. Il est en cours [grognement]
(36:24) là. Je le fais pas passer par une maquette. Ça nécessitait pas une maquette vu qu'on on souhaite supprimer des choses si on commence à faire des
(36:31) maquettes pour tout et c'est plus le côté curation qui m'ennuie en fait.
(36:39) Je peux lui je peux lui laisser de toute façon. Il va il a bien compris quand on en a parlé.
(36:46) On a pu on a pu voir queil avait compris. Et là, on va attendre parce que les
(36:52) deux, ils vont nous produire une petite maquette. Pendant ce temps,
(37:00) j'ai remarqué une chose. Je me suis enquiquiné de l'autre côté
(37:06) euh quand j'ai fait Novator Hub. C'est le site internet en fait de de ben de de
(37:15) Digital Novator. Euh, j'ai refait les planches de Nova Shot
(37:27) et de Nova Wisp. Et ce qu'il a, il m'a pas mis euh il m'a
(37:34) pas mis ça sur Nova Shot. Alors, on va y aller on va y aller avec Grock cette fois. On
(37:42) va y aller avec Grock. Pour ce genre de choses, il est plutôt efficace en général quand il y a pas trop de
(37:47) d'interprétation. Je vais lui donner ça et je vais lui dire
(37:57) ici, on a fait le logo de l'application. J'aimerais que tu le mettes partout où
(38:04) c'est nécessaire dans la barre d'installation Window en haut à gauche sur l'application
(38:12) et cetera.
(38:17) Donc souvent je commence par un truc très simple comme ça et ensuite on voit euh surtout quand c'est simple comme ça.
(38:24) Fait des fois euh il va sûrement falloir que je lui précise par contre de de Ouais, je vais
(38:31) le faire tout de suite. Quand tu utilises le MCP, tu n'utilises aucun
(38:37) outil en même temps. Gr. Moi, [grognement] j'ai remarqué un
(38:43) petit défaut sur leur sur leur CLI actuellement quand ils utilisent des outils en même temps dans que le MCP,
(38:49) bah les outils MCP bloque et euh
(38:57) au début, on a cru que c'était lié à la quantité de réponse qu'il obtenait
(39:02) puisqu'il y a une limite en fait en en kilcté de ce qu'il peut recevoir dans une réponse. qu'on a limité tout ça et
(39:08) tout, mais ça vient pas de notre de notre outil en fait.
(39:14) Malheureusement, quand il utilise par contre les outils MCP les uns après les autres, au lieu de
(39:20) balancer quatre appels outils en même temps, bah ça fonctionne parfaitement.
(39:25) Donc il y a un petit défaut avec ça. Après, j'ai pas j'ai pas regardé mais je crois que je l'ai mis à jour
(39:31) aujourd'hui. Je l'ai mis à jour aujourd'hui.
(39:36) Peut-être qu'il y avait ça dans le patch. Ça aurait pu être rigolo de lui demander.
(39:42) Donc là, il a mis noté. En du moment où tu lui as dit par contre il y a pas de problème, il il va pas faire la la
(39:48) bêtise. Il va il va bien se comporter et on pourrait tiens ce serait marrant de
(39:54) lui demander. Tu peux me dire ce qu'il y a dans le patch notes ? Ouh là ou là ou là ou là.
(40:03) Tu peux me dire ce qu'il y a dans le patch note de la dernière version du CLI de Grock s'il te plaît ?
(40:14) Hop, ici, on voit qu'il se passe quelque chose. Il y en a un qui nous a euh demandé
(40:20) validation. Donc, on va aller regarder tout de suite
(40:26) ce qui nous a pendu. OK,
(40:31) vous voyez là, il nous propose en fait à partir du screen que je lui avais donné tout à l'heure.
(40:37) Ça a été assez rapide. Je lui ai donné quoi ? Je lui ai donné ça pour rappel.
(40:44) Voilà. Et lui nous sortant,
(40:54) j'aime pas trop ça. Extrait transmis par l'action
(41:01) diffunifier.
(41:07) Hm hm hm hm.
(41:12) J'aime pas du tout, [soupir] j'aime pas du tout cette partie-là. Après le reste, ça remplit parfaitement le le contrat.
(41:19) Juste dire ça là, ces flèches là, c'est totalement
(41:29) [soupir][grognement] ces flèches totalement moches. Vient de faire un truc pour ça. Mais
(41:35) c'est déjà pas mal franchement. il a il a parfaitement compris ce qu'on souhaitait quoi.
(41:42) Donc c'est le principal. On va lui envoyer ça comme ça. B voilà.
(41:50) Il faut quand même que tu me corriges cette flèche qui va vers le bas là qui est toute moche à droite.
(42:02) Hop, on va se remettre ça devant les yeux, c'est plus facile. Et la partie extrait transmis par
(42:09) l'action diffunifié. Je trouve ça moche. Vire ça.
(42:17) OK, c'est parti. Donc là, voyez, par rapport déjà à la première vidéo, on commence à à prendre
(42:23) une certaine vélocité. Et ça parce que ben je passe plus mon temps à écrire et
(42:30) je le passe plutôt à
(42:36) Ah, qu'est-ce qu'il dit ? Please retry. Oui, bonjour. Oui,
(42:46) alors j'aime bien je tu t'arrêtes. On va voir ce qui se passe. Soit c'est
(42:52) de leur côté que ça que ça a du mal.
(42:57) Ouais, c'est de leur côté que ça a du mal. Bon ben voilà, on vit certaines situations en direct, c'est plutôt pas
(43:03) mal.
(43:08) Codex c'est down. Bon, on va le laisser,
(43:16) on va le laisser quelques minutes. On va voir si ça si ça revient. En tout cas,
(43:21) on voit que ça n'affecte pas Claude. Lui, il est toujours au travail. Nova shot. On revient ici.
(43:29) On a Grock qui travaille sur euh la problématique du logo, de remettre le logo et tout à partir de la planche. En
(43:35) fait, je voulais pas montrer, je crois, la planche. Euh, qu'est-ce que j'en ai fait ?
(43:43) Je crois que je l'ai pas montré. Je vais vous montrer à quoi ça ressemble. En gros, ça je le je le généralise
(43:48) énormément. Je pense que c'est un truc qui est pas mal. Une fois que tu l'as fait faire une
(43:55) fois, tu le réutilises partout. Tu tu tu tu tu tu tu tu tu te prends pas la tête.
(44:01) C'est le logo de l'application tout simplement. Et comme ça en gros, on peut on peut filer ça à l'agent. Il est
(44:07) capable de générer les logos, de savoir dans quelle situation il va utiliser le qu et cetera et cetera. Et surtout aussi
(44:12) ce qu'il doit pas faire quoi, ce qu'il doit pas faire pour pas pourrir le logo.
(44:18) Et j'en ai un du coup pour chaque application. Voilà. Bon, il y en a pas très parlant,
(44:24) il y en a d'autres c'est plus parlant. Ça c'est une application en fait pour faire des screenshots. Vous voyez ce que je fais là avec le depuis le début avec
(44:32) l'outil de capture Window ? Ben en fait l'idée c'est de le faire avec une application qui fait sensiblement la
(44:38) même chose que la Capture Window, sauf que ça va te laisser ici un overlay et tu peux prendre le glisser directement.
(44:44) Ça évite de réouvrir à chaque fois, de cliquer, de machin. Et pareil, tu peux tu peux faire
(44:50) diverses trucs dans flouter des des parties de la vidéo
(44:56) et cetera. C'est une nouvelle voilà petit délire que j'ai. L'application
(45:01) existe, fonctionne mais actuellement elle fonctionne avec un M6 en même d'icône ou quoi que ce soit quoi. [grognement] Il nous dit quoi ? Il nous
(45:08) dit la spec. Bon là, il part sur une pec et tout, il était pas obligé mais on va le laisser faire son train train.
(45:16) Il a compris ce qu'il avait besoin. Euh
(45:22) OK là pareil, je je vais pas faire de
(45:28) délégation. Il va pas utiliser de sous-agent pour faire un truc comme ça. En gros, il est à 13 113 sur 500. Même
(45:36) s'il dit 500 mais en fait il va il va compacter à 400.
(45:41) Tiens là c'est rigolo. Qu'est-ce que ça raconte ça ? L' tête des sessions. Tiens une seule
(45:47) ligne avec le contexte. OK.
(45:56) OK. Bon, il y a il y a il y a rien qui
(46:02) concerne a priori notre problématique à nous.
(46:10) Qu'est-ce qu'il dit ? Ouvrez H silencieux workflow them.
(46:16) OK. Bon, il y a pas eu de il y a pas eu de patch sur notre problématique à nous, mais c'est pas très grave vraiment. Vous
(46:22) allez c'est pas très très grave. On peut le contrer différemment.
(46:30) Voilà, ils sont revenus au travail.
(46:37) On remet les codex au travail. Parfait. Alors euh que je reprenne un peu mes
(46:45) esprits. Ici, on a fait corriger tout à l'heure
(46:51) les modèles. On n pas pu le voir encore, mais c'est pas très grave. On le verra
(46:56) après la prochaine release. L'histoire du profil, j'avais pas demandé ce truc de profil, mais c'est
(47:03) vrai que ça peut être utile en fait. Ça peut être utile.
(47:11) Ça peut être utile. Ce trucl, c'est vraiment moche ce machin
(47:17) là qui s'ouvre vers le bas comme ça. D'ailleurs, il y a la même chose ici.
(47:24) Je sais pas pourquoi il l'a pas fait flottante la
(47:31) la le select ici. Il fait il fait sortir le D en fait.
(47:37) C'est on va on va on va en utiliser un pour nous corriger ça.
(47:46) Ça arrêtera de me frustrer.
(47:52) À chaque fois je le vois s'ouvrir, ça me ça me prend la tête. Donc on va régler le problème tout de
(47:58) suite. Je pense qu'on peut utiliser un GR pour
(48:04) ça sans aucun problème. Il va être assez bon pour ça. On va lui dire
(48:13) ici il y a le select des agents et il est influ sur le D.
(48:19) J'aimerais plutôt qu'il passe par-dessus les éléments en mode flottant quoi.
(48:32) C'est dans les tasques et attention, il y a deux endroits à corriger.
(48:41) celui des du tableau des tâches et celui des sprints.
(48:51) [soupir][souffle coupé] Voilà. Donc lui, il a corrigé ce qu'on lui a demandé
(48:58) tout à l'heure. Donc on va repartir dessus. Hop hop on
(49:03) va pouvoir checker comment il nous a fait ça. Ah, c'est déjà un peu plus euh hein. Il
(49:10) y a quelque chose là. Il y a quelque chose de plus sympa. Le avant après, il aurait pu éviter aussi
(49:19) mais bon. Allez, en fait, je lui fais dégager ça aussi.
(49:27) Je je le sais au bout d'un moment, ça va m'agasser.
(49:35) Donc là aussi, je repasse par une image. Est-ce que c'est nécessaire ? J'en sais
(49:40) rien. Peut-être que simplement lui expliquant, ça aurait pu euh
(49:46) ça aurait pu bien se passer. Mais on va quand même lancer notre image. La ligne
(49:52) avec avant, après, tu l'enlèves aussi. C'est pas nécessaire. On sait très bien
(49:58) que à gauche, c'est avant, à droite, c'est après.
(50:04) Alors, je dis ça mais en fait, c'est vrai que on pourrait se poser la question quelqu'un qui mais bon. Ça me
(50:10) paraît logique que à gauche on voit le la la version avant suppression et à
(50:16) droite la version après. Je pense le problème en fait c'est qu'à à chaque fois on va avoir une ligne comme ça qui
(50:21) va nous prendre quelques pixels sur un endroit où très clairement
(50:27) on n déjà pas morphe de place quoi. On a déjà pas
(50:33) de la place illimitée. Donc je préfère en fait enlever tout ce qui est superflu.
(50:40) ici. Ça y est, il vient nous le faire. Mais lui, il nous lui il nous donne un vieux lien.
(50:46) Il nous donne la moitié du lien en fait. Tu peux pas nous donner le lien entier qu'on puisse l'ouvrir dans un navigateur
(50:51) s'il te plaît ?
(50:57) Pour en revenir un petit peu à la transcription, en gros, pareil, le le fait que ça aille aussi vite aujourd'hui, c'est tout un travail
(51:04) d'amélioration en fait. Euh déjà le modèle le modèle V3 là euh
(51:11) fast est vraiment bien plus bien plus efficace le turbo.
(51:16) Mais il y a aussi le fait qu'en fait euh vous pouvez lui donner une partie de votre transcription.
(51:22) Enfin, vous pouvez travailler sur deux trois bouts de transcription qui fait qu'en fait il va
(51:28) s'améliorer avec les [soupir][souffle coupé] il va s'améliorer avec
(51:35) vos mots, votre façon de parler. Donc ici qu'on voit qu'il a parfaitement
(51:40) respecté ce qu'on voulait. On voulait récupérer le côté flottant ici et le côté sans euh background différenciant.
(51:49) C'est exactement ce qu'il a fait. Par contre, on lui a dit justement ne pas toucher euh enfin, on lui a pas dit
(51:55) explicitement, mais on lui a dit qu'on voulait le le le paramètre global et pas chaque volet. Il a pas touché au volet,
(52:02) il a même pas recréé certains volets, il s'en fiche. Et c'est exactement le comportement qu'on veut.
(52:09) Pour rappel, en fait ici, on est comme ça. On est comme ça et j'aime pas trop
(52:19) en fait. C'est pareil le design, c'est quelque chose. Au début, vous partez sur une
(52:25) idée, ça fonctionne plutôt comme vous voulez. Donc vous allez le laisser puis au bout d'un moment vous allez vous dire
(52:30) "Ah tiens, en fait bah tiens, j'ai vu ça quelque part, j'aimerais bien le retranscrire ici." Et le le le truc qui
(52:36) est très difficile avec le temps, c'est d'arriver à à avoir cette cohérence un
(52:41) peu partout dans les interfaces pour que bah ça ça casse pas trop l'œil, quoi.
(52:49) Et là, je trouve c'est trop marquant en fait la différence entre les deux et
(52:54) c'est pas vraiment nécessaire. Il y a pas de il y a pas de plusvalue à ce que ce soit aussi différent. Donc ici, je
(53:01) valide je valide clairement. Je valide.
(53:07) [grognement] Alors, je sais pas si vous vous l'utilisez, s'il y a des gens qui l'utilisent ce principe de de faire des
(53:14) maquettes comme ça. Au début, je me disais "Ah, ça fait beaucoup de token et tout à
(53:22) euh à la création quoi. On dépense un peu plus de tokens forcément s'il génère HTF de plus à chaque fois en reprenant
(53:29) les éléments de de design de la PL. Mais au final, si à la fin de de de la
(53:37) feature, quand moi je me mets à aller tester ça sur mon application, ça correspond pas à ce que je voulais, mais
(53:43) en fait il va falloir que je reparte soit avec un nouvel agent, soit avec l'ancien agent. D'ailleurs, ça en
(53:48) parlera dans une autre vidéo, mais il faut vraiment éviter d'avoir des conversations qui durent et qui durent
(53:55) dans le temps. Euh au-delà d'un certain euh montant en
(54:01) token, en fait, bah ça finit par coûter très cher. Au début quand j'utilisais
(54:08) Grock au tout début et puis Codex juste après, je me disais "Mais mince, en fait
(54:13) il il compacte au bout de de 400 cas sans me prévenir et et je me dans ma
(54:19) tête ça a impacté la qualité. J'étais persuadé que plus il avait de de de il
(54:26) pouvait emmagasiner de contexte et meilleur était le résultat." Et en fait, je me suis rendu compte que ça ne marche pas comme ça. Déjà, il y a toute
(54:32) l'histoire du contexte trot et tout ça. Donc là, en gros, le contexte qui pourrit, [grognement] mais il y a aussi
(54:38) l'idée de ce que vous payez. En fait, à chaque fois que la que la conversation elle dure, elle dure, elle dure, à
(54:44) chaque nouveau tour, vous lui certes, il y a la cache. Donc il il vous repayez
(54:49) pas à plein pot le fait de lire telle ou telle information, mais la cache, elle a
(54:55) un coût aussi. Et en fait sur quelques millions de tokens, enfin sur pardon quelques milliers de tokens, ça va. Dès
(55:02) que vous êtes à un demi million de token, euh la cache, elle commence à coûter cher. Et
(55:08) c'est comme ça qu'en fait, je me suis rendu compte qu'il valait bien mieux euh le le le lui dire d'utiliser l'auto
(55:16) compact quoi par exemple sur Cloud. Et donc moi, j'ai un autocompact programmé à 400k.
(55:21) Sachant que souvent sur Cloud, c'est pas celui avec qui je discute qui va implémenter. Euh, il va très souvent
(55:28) utiliser un le dispatch quoi. Et donc là, on va on va rigoler un petit
(55:33) peu. Je vais pour le pour le dernier là, je vais le lancer en
(55:40) lui disant qu'il va utiliser des sous-agents en Grock et il va il va
(55:46) orchestrer en fait des des sous-agents Grock. J'ai remarqué un truc avec Codex, il a beaucoup de mal euh même Astra à
(55:53) lâcher le le le volant quoi. Euh Claude, quand vous lui demandez d'orchestrer un
(55:58) autre sous-agent, que ce soit un un sous-agent interne ou que ce soit un sous-agent de notre CLI, il envoie sa
(56:05) tâche, il balance son monitoring et il bouge plus quoi. Il s'arrête, il bosse
(56:11) plus, il attend que le résultat arrive et puis ensuite il réenchaîne des actions. Codex, lui, il va continuer à
(56:16) travailler. Il va travailler sur autre chose. Il va faire il va faire plein de trucs en parallèle et du coup ça
(56:23) consomme beaucoup plus de tokens quand vous faites orchestrer à
(56:28) à Codex, je trouve. Donc ici, on en est où ?
(56:35) Là, c'est le dif sur le chat. Et ici, on a dit qu'on avait qu'on validait. La ligne
(56:42) avant après a été retirée. Bon là il s'est embêté à nous le à nous le faire dans le dans le design.
(56:50) Je montre comme ça. Voilà. Mais on était pas obligé. L'objectif
(56:56) c'était qu' c'était qu'il parte là. Donc là on va lui dire OK, c'est validé,
(57:02) tu peux te mettre à travailler. Et donc là déjà on a quatre cocos en train de travailler sur des choses
(57:08) différentes sur ce projet. On a lui ici qui est en train de travailler. Il est
(57:14) déjà très loin en fait. Donc
(57:20) on a mis en place ça. Ça c'est OK. Ici on est en train de modifier.
(57:26) Qu'est-ce que sur quoi on lance les prochains ? Le prochain.
(57:34) J'avais dit que je voulais attaquer ça là, cette partie là. Mais c'est très lié en fait
(57:39) euh Ah ben voilà, ça fonctionne en partie.
(57:46) En fait, je sais pourquoi, enfin je pense avoir compris pourquoi dans certaines situations, j'ai ce que je veux et dans certaines situations, je
(57:52) l'ai pas ici. Et c'est principalement lié au work en fait, c'est que vu que c'est mon c'est
(57:59) pas moi qui génère le work, mince, c'est pas moi qui génère le work tre depuis l'application ici.
(58:07) J'oublie à chaque fois en fait d'appuyer sur un nouveau work tray parce qu'ils ont des consignes en fait. il dans le
(58:13) dans le dans les skills qu'ils ont le le skill feature par exemple, il leur demande de créer un work
(58:20) automatiquement. Du coup, ils vont bosser automatiquement sur la tree. Donc, je le crée pas forcément, mais le fait que je le génère
(58:26) pas via l'application et qu'à mon avis, il y a rien qui permet de relier euh le work sur lequel est en
(58:33) train de travailler l'agent de euh le en fait le le l'onglet qu'on ouvre ici. Euh
(58:42) et ben du coup, on n pas le on n pas le div quoi comme on le voudrait. Je pense si on commence à passer
(58:51) sur les différents Non, même ici on n pas accès au à tous
(58:58) les fichiers quoi. Donc ça c'est une partie que je veux
(59:04) travailler mais en gros je veux qu'il s'inspire ici. On s'est un petit peu embêté là.
(59:10) Bah ça c'est un peu le le la partie où j'essaie justement de de reproduire un peu le
(59:17) un peu la le l'application Codex. Pardon, je vais y arriver. Je suis un petit peu fatigué.
(59:23) À partir de de de du moment où j'ai ce que je veux ici, ben je lui ferai utiliser le même
(59:30) composant ici. Voilà. Et donc en gros
(59:37) bah pour ça, il faudrait travailler là-dessus. faudrait retravailler un coup là-dessus,
(59:43) ça pourrait être intéressant. Qu'est-ce que on le lance sur quoi là ?
(59:56) Ici, on a l'aspect renommé le le dossier que j'avais fait hier.
(1:00:03) On a toujours un petit problème avec les statues ici. Très difficile d'arriver à capter les
(1:00:09) statues en direct,
(1:00:15) mais on va [grognement] pas travailler ça tout de suite.
(1:00:22) Et les connecteurs c'est pas pour ici en fait. Les connecteurs c'est pour l'autre côté justement.
(1:00:29) Je l'enlève de ce menu là. Et là, les connecteurs, il y a un peu tout à faire. J'ai j'ai j'ai j'ai créé
(1:00:35) la première fonctionnalité X mais j'ai pas encore le je sais pas encore comment
(1:00:40) je veux le gérer complètement. En fait, je vois pas trop l'intérêt
(1:00:47) d'aller filer 14
(1:00:52) connecteur à un agent qui va pas utiliser ces connecteurs là. Du coup, au début, je m'étais dit, je vais les je
(1:00:58) vais pouvoir le cocher par projet et tout, mais je trouve ça chiant à faire
(1:01:04) de devoir venir euh coucher, découcher ces petits projets.
(1:01:10) Donc je je sais pas encore. Il faut que j'y réfléchisse plus en détail là-dessus. Donc ce pourquoi il faut
(1:01:16) qu'on réfléchisse, on attaque pas tout de suite. [grognement] Ici, on a fait une petite refante cet
(1:01:22) après-midi avant la première vidéo. [grognement] Avant ici, on avait juste
(1:01:29) le choix entre aujourd'hui, il y a 7 jours, il y a 30 jours. Voilà.
(1:01:35) Sachant que je sais pas si vous avez vu mais il y a une latence
(1:01:40) parce que il récupère les transcripts et c'est que via les transcripts en fait qu'il arrive à à obtenir la quantité de
(1:01:45) données qui a été traitée en entrée, en sortie et en cache. Sachant que Claude différencie euh la
(1:01:53) cache d'entrée de la cache lue, donc l'écriture dans la cache, pardon, et la
(1:01:59) lecture de la cache, mais que les autres non. Et du coup, on a été obligé de mettre
(1:02:05) les entrées enfin la la l'écriture de cache dans les entrées pour cloud, ce qui est, je pense que font aussi les
(1:02:12) autres. Euh oui, ça y est, je raccroche les
(1:02:17) wagons. Donc [raclement de gorge] ici, on a l'usage, mais ça c'est ce qu'on a consommé, c'est les tokens consommés. Et moi ce que
(1:02:24) j'aimerais c'est qu'on rajoute quelque chose ici éventuellement qui me permette éventuellement de voir où c'est que j'en
(1:02:30) suis de mon forfait actuellement. C'estàd j'imagine qu'on qui qui doit y
(1:02:35) avoir un moyen de récupérer le ben ma consommation actuelle de Codex ou de ou
(1:02:42) de Grock par exemple directement sur l'application. Je pense ça pourrait être sympa.
(1:02:49) Donc on va spawn un nouveau un nouvel agent là. On va prendre Cloud parce que
(1:02:54) j'ai besoin euh parce que là ça va s'étendre un petit peu forcément. Il y a il y a au moins je veux au moins faire
(1:03:01) les trois premiers providers ici. Donc nécessairement on va s'étaler sur plusieurs tâches et
(1:03:07) là pour l'orchestration Claude sera nécessairement le meilleur. Après, est-ce qu'on va sur Fable ou est-ce
(1:03:14) qu'on reste sur Opus ? Pour [grognement] une tâche comme ça, je pense qu'on peut aller sur fable
(1:03:21) au moins pour la planification. On va le mettre en height. On va pas
(1:03:27) aller au-delà. Je pense que je pense que ça peut ça peut très très bien le faire.
(1:03:33) Et on va lancer le truc comme ça. Actuellement dans l'application, on a un onglet, une dialogue plutôt pour voir le
(1:03:42) l'usage, la consommation qu'on a fait euh via les agents qu'on a utilisé sur
(1:03:48) une journée, une semaine, un mois et cetera.
(1:03:56) Mais je pense qu'il manque quelque chose là. Je suis obligé d'ouvrir en permanence le navigateur avec euh mon
(1:04:02) compte Grock, mon compte Cloud, mon compte euh
(1:04:08) Codex.
(1:04:14) J'ai j'ai choisi un raccourci mais euh je pense que c'est pas le meilleur raccourci que je pouvais je pouvais prendre parce que du coup ça me met des
(1:04:21) espaces comme ça, c'est un peu chiant. Bon bref, on s'en fout.
(1:04:27) On gérera ça un peu plus tard. Mais du coup ça ça génère des
(1:04:35) blocs vides quoi. C'est génial. Bon,
(1:04:41) j'aimerais pouvoir sans ouvrir le navigateur voir la
(1:04:48) euh où j'en suis de mon forfait actuellement
(1:04:57) avec Cloud, Codex ou Grock par exemple.
(1:05:03) Donc déjà, tu vas commencer par déterminer si c'est possible de récupérer cette information.
(1:05:12) Ensuite, tu vas me proposer un affichage via une maquette comme d'habitude
(1:05:23) et ensuite tu planifieras le travail pour une implémentation en workflow.
(1:05:35) On décagent
(1:05:40) avec Grock dans l'implémentation.
(1:05:52) [grognement] Voilà, on va lui lancer ça. On va voir ce qu'il arrive à ce qu'il arrive à déterminer en fait. Si c'est possible de le faire. Si c'est possible
(1:06:00) de le faire, alors dans quelles conditions est-ce qu'ils sont tous égaux ? Parce
(1:06:07) que souvent en fait une fonctionnalité, elle est pas présente sur tous les CLI de la même implémenté de la même manière
(1:06:13) en gros. [grognement] Donc des fois, on a besoin de faire un peu des des adaptations particulières. Qu'est-ce qui nous dit notre bon là ?
(1:06:22) Sélecte agent en overlay. C'était quoi ?
(1:06:29) Ah donc là il est parti sur un bug fixe. C'est normal. A priori c'est un bug. Le
(1:06:35) sélecteur destinataire porte déjà. Mais la liste OK.
(1:06:53) Oh, tu peux ajouter choisir un sprint dans le
(1:06:58) dans le périmètre, hein.
(1:07:08) Et oui. OK, je valide.
(1:07:18) Attends, il m'a fait une petite maquette. Je vais pas valider les yeux fermés parce que si
(1:07:25) après ça ne marche pas, je vais rager.
(1:07:33) Donc on va regarder ce qu'il propose. [grognement]
(1:07:38) Euh il nous dit aujourd'hui, il nous dit après. C'est exactement ce qu'on veut en fait hein. Voilà, il y avait pas
(1:07:45) nécessairement besoin de maquête pour ça mais bon.
(1:07:51) Et oui. OK, on valide. C'est parti.
(1:07:59) Donc moi ce qui m'intéresse, eux ils sont partis. On a validé le travail me semble-t-il
(1:08:06) au dernier coup. Donc mes codex sont validés, ils sont partis au travail. On
(1:08:13) va laisser bosser. Grock lui, on vient de le valider maintenant. Donc il vient
(1:08:18) de partir bosser. Il nous reste lui. Lui, qu'est-ce qu'il nous raconte ?
(1:08:23) Point étape. [grognement] Euh,
(1:08:30) il a retiré la ligne. Parfait. Tout le flux confié à l'agent sort du produit.
(1:08:35) bouton euh fiche store wrap commande. Oui.
(1:08:49) Oui. Et oui.
(1:08:59) OK. [grognement] Alors, pardon, je prends un petit peu de temps toujours lire. Moi, je trouve que
(1:09:04) c'est extrêmement important de savoir.
(1:09:14) [grognement] Bon là, c'est un point étape. Ça veut dire qu'en fait lui, il a pas terminé de bosser mais il attend un moniteur. Donc là, ça sert à rien de lui
(1:09:20) répondre quoi que ce soit. Il nous explique juste ce qu'il a ce qu'il a fait et le pourquoi on attend quoi.
(1:09:27) Voilà. Ensuite
(1:09:35) euh OK, ici ça travaille.
(1:09:40) Nous ce qui nous intéresse principalement c'est lui ici.
(1:09:49) Il est en train de faire des recherches actuellement.
(1:10:02) Donc qu'est-ce qu' va nous Qu'est-ce qu'il va nous dire ? Je pense que c'est possible.
(1:10:08) Je pense que c'est possible parce qu'il me sembleavoir déjà vu ça sur une application.
(1:10:14) Donc le tout c'est en fait il faut qu'il arrive à comprendre
(1:10:20) comment il peut obtenir l'information.
(1:10:25) C'est surtout ça qu'on va attendre de lui.
(1:10:34) [grognement] Pendant ce temps, on va regarder si sur shot il a il a avancé notre ami Grock.
(1:10:44) Les quatre premiers. OK.
(1:11:00) Là, il a lancé un sabagant de lui-même en grand.
(1:11:22) Bon là, lui il nous dit qu'en gros la maquette parce que on a j'ai une maquette pour l'application euh une
(1:11:29) maquette standard en fait sans que il produise une maquette d'un bout du truc
(1:11:34) pour si je veux faire des changements fondamentaux genre dans dans le design. Donc il nous dit "Ah attention parce que là tu ta maquette, elle va plus être en
(1:11:41) adéquation avec le avec le code de l'application. Mais je m'en
(1:11:47) moque un peu. C'est pas très très grave que la maquette conserve des petits boutons à gauche à droite. Au pire cas
(1:11:52) le jour où tu veux faire quelque chose d'autre, tu lui fais enlever quoi. Mais bon,
(1:11:59) en fait au début je je justement je lui faisais faire à chaque fois les modifications, mais en fait c'est très
(1:12:06) chronophage, on finit par oublier des trucs et puis au bout d'un moment en fait le gap il est trop important et
(1:12:12) donc on finit par arrêter. Je pense que maintenir une maquette en permanence à jour sur l'application n'est pas
(1:12:17) vraiment le bon la dépense que tu as envie de faire en fait. Très clairement
(1:12:23) la maquette, elle est là pour valider que ce qu'il est en train de faire va te convenir parfaitement à la fin. Donc
(1:12:29) c'est un [toux][raclement de gorge] ajout il prépare le travail pour qu'au moment
(1:12:35) où il livrera le travail, ce sera plus plus ce sera parfaitement en correspondance
(1:12:41) avec ce que tu souhait. Et je dirais même plus que si tu fais faire euh si tu fais faire ton
(1:12:49) ta prép la préparation du travail par un gros modèle, c'est même mieux puisque le
(1:12:54) gros modèle, lui, il va travailler uniquement sur les éléments euh factuels que va devoir implémenter l'autre. Et en
(1:13:01) même temps euh en en te faisant valider la maquette, ben l'autre il il pourra
(1:13:08) que très peu en cacahuète quoi. Enfin du moins, il partira moins sans cacahuète. Ça veut pas dire que ça arrivera pas.
(1:13:21) Donc là par contre il sait pas le Grock ne s'est pas bloqué une seule fois sur le MCP. C'est déjà pas mal parce que lui
(1:13:27) on lui a pas dit. Je lui ai pas dit exprès pour voir s'il allait se se bloquer mais a priori ça va.
(1:13:35) A priori se bloque pas notre ami.
(1:13:40) Je changer de place. J'aimerais me mettre celle-là en grand. C'est celle que j'attends le plus parce que les autres sont en train de travailler. J'ai
(1:13:47) plus vraiment d'intervention à produire en fait à part s'il me pose une question.
(1:13:53) [grognement] le travail avec eux est est pour ainsi dire lancé.
(1:14:02) On voit que Codex il va utiliser Playwrit du en gros Playwght ça va lui permettre
(1:14:07) de prendre des photos en gros de l'application, prendre des screens de l'application de ce que vient de coder
(1:14:13) son sous-agent ou lui-même et de vérifier que les choses sont bien à la place où on souhaitait qu'elles soit
(1:14:18) quoi. Voilà. Et et pour le petit point là, tiens, tout à l'heure, je suis passé
(1:14:24) ici. On va regarder un petit peu ce qu'on a dépensé aujourd'hui. Aujourd'hui, on est à allez on est à 100
(1:14:31) millions quoi. On est à 100 millions. Et hier, par exemple, on était à 17.
(1:14:38) Mais hier, Codex, j'ai pas travaillé avec parce que Codex, j'avais plus de forfait.
(1:14:44) Voilà. Et là, cette nuit, ils ont fait un reset. Donc euh banco c'est la fête à
(1:14:52) Alors par contre au niveau des usages euh je tiens à dire que je je constate pas
(1:14:58) du tout ce que constatent les les autres personnes sur YouTube et cetera.
(1:15:04) Je trouve que le le aujourd'hui les quotas accordés par Claude sont
(1:15:10) monumentales par rapport aux deux autres. [soupir] C'est assez euh c'est assez ouf hors rés
(1:15:19) [soupir] parce que là par exemple si on prend sur 7 jours, certes on a 61 sur
(1:15:25) Codex et 59 sur Claude et 58 sur Grock, sauf que Cloud
(1:15:34) c'est mon usage classique de 7 jours. Codex je pense que j'ai eu deux resettes dans la semaine dans les 7 jours plus
(1:15:41) peut-être que j'en ai utilisé même un. en plus les resettes qu'ils avaient offert la semaine dernière. Grock
(1:15:46) pareil, j'ai utilisé un reset et je suis à 42 en 42 % de mon usage hebdomataire.
(1:15:54) [grognement] Donc là, tu as trois forfaits à 200 dollars le forfait, 300 pour Grock. Et niveau euh consommation
(1:16:02) de token, je bouffe euh tous les tokens possibles dans la semaine. J'arrive à 100 % d'usage avec chacun d'eux.
(1:16:10) Mais très clairement euh Codex là-dessus, on est à quatre fois le le l'ebdo classique hein. Donc il va
(1:16:19) falloir m'expliquer quoi comment on peut être à autant que Claude sur un hebdo normal
(1:16:26) avec un codex où on a eu 4, c'est juste intenable. et Grock, ben au final, comme
(1:16:31) je disais, c'est une fois et demi mon hebdo, quoi. Donc euh
(1:16:39) pour moi, en terme de nombre de token utilisables, du moins avec mon abonnement, Claude est largement devant.
(1:16:48) Après, est-ce que Claude utilise plus de tokens que les autres pour réaliser une tâche ? C'est difficile à dire.
(1:16:56) Je m'amuse rarement à envoyer le même enfin un agent sur la même tâche
(1:17:01) quoi. Si je renvoie un agent sur une tâche, c'est parce que l'autre bah soit il a mal fait son travail, soit la tâche
(1:17:08) était incomplète et dans ces cas-là, je veux la compléter. Mais on est plus sur ce c ce genre de de
(1:17:17) truc. Et sachant que aujourd'hui avec en cumulant les abonnements,
(1:17:25) je vais avoir tendance à répartir le travail un petit peu comme je disais tout à l'heure avec un fable qui va
(1:17:32) faire sur les gros les grosses modifications comme là on est en train de faire quand même une modification qui
(1:17:38) demande d'aller inspecter chacune des documentations de chacun des CLI, chercher l'information
(1:17:45) de comment il va pouvoir implanter ça, implémenter ça, pardon. et prévu enfin en gros créer l'aspect et
(1:17:51) le et le plan pour que autre vienne le coder quoi. [grognement] Et par contre, je l'utilise jamais
(1:18:01) quasiment pour faire du pour faire du code réellement parce que je me suis rendu compte qu'en fait déjà il produit
(1:18:08) pas forcément du meilleur code que les autres très clairement. Et euh
(1:18:15) et de deux en fait, il coûte très cher en outpot quoi. Donc euh tu préfères qu'il te fasse une belle spec pour que
(1:18:22) l'autre derrière il travaille bien. Je pense que c'est mieux quoi. Là il
(1:18:27) nous demande s'il peut push. En gros,
(1:18:32) je pense qu'il y est obligé avec un un hou de prépouche sur ce projet là. Justement parce qu'il y a une partie du
(1:18:38) projet où je l'ai fait coder à Grock. [grognement]
(1:18:44) Mais là, c'est pas très très compliqué. Là, il a changé des il a changé des
(1:18:49) icône quoi. Donc on n'est pas sur le le boulot le plus compliqué de la terre très clairement.
(1:18:56) Après, je dis ça, mais au final quand la spec est faite, très clairement c'est
(1:19:02) lui qui va partir codé. Là, vous allez voir comment je vais fonctionner avec lui.
(1:19:08) Je vais terminer ça ensuite. Je vais je vais arrêter la vidéo là. On reprendra demain. Je vais les laisser clairement
(1:19:14) travailler cette nuit et euh et demain soir, je referai une vidéo et on et on
(1:19:21) poursuivra l'aventure. Mais je veux d'abord vous montrer que
(1:19:28) une fois qu'il va avoir fait ses réflexions, tout ça, il va nous battrir un petit truc et on va lui donner le la
(1:19:35) consigne justement d'orchestrer ça avec des des sous-agents grec.
(1:19:44) Voilà ce qu'il faut que je me note tant que j'y pense. [grognement] Ce serait bien que ici par exemple
(1:19:50) là j'ai un bouton confier quoi. Mais ici je peux pas choisir. Donc en gros là je vais l'envoyer directement
(1:19:56) dans une panne parce que ça ça a été créé au moment où ici on avait que la partie classique, on avait pas les deux
(1:20:03) autres, elle était même pas imaginer quoi. Mais j'aimerais bien aujourd'hui pouvoir lui dire bah tiens, basculer en gros à partir de l'autre côté, basculer
(1:20:10) sur cette fenêtre et proposer une orchestration comme ça. Ce serait pas mal de faire ça demain, je pense.
(1:20:17) Ça me pousserait beaucoup plus à l'utiliser, il faut être honnête parce qu'aujourd'hui bah les cas, je vais plus
(1:20:22) employer ça de manière je vais lui dire je vais lui dire attends parce que là l'implémentation tu vas la faire tu vas
(1:20:28) la faire à Grock par exemple. Pourquoi Grock me direz-vous ? Ben
(1:20:33) justement parce que j'ai les trois en ce moment et que ça va pas durer là dans 5 jours, mon abonnement de Grock s'arrête
(1:20:41) et je vais pas renouveler l'abonnement à 300 dollars à Grock.
(1:20:47) C'était un test. J'ai bien aimé par contre celui à 30 dollars. Donc je pense que je conserverai l'abonnement à 30
(1:20:53) dollars quand même parce que je pense qu'il a une bonne utilisation. Je pense que pour 30 dollars
(1:20:59) en modèle d'appoint pour faire c certaines petites tâches toutes bête, il
(1:21:05) peut être très très bien. Mais mais en agent de code aujourd'hui,
(1:21:12) il il rivalise pas avec les deux autres, ça c'est clair. Je pense que
(1:21:19) je pense que Fable et Astra, ils sont beaucoup trop fort
(1:21:25) aujourd'hui. Après, on va voir. Il est annoncé le 4.7 bientôt. On verra ce que
(1:21:31) ça donne. [grognement] Qu'est-ce qu' nous raconte ici le le
(1:21:36) bon fable ? Il nous dit "J'ai sondé les trois providers pointos
(1:21:42) pour cloud, rate limit read pour codex.
(1:21:47) et journal
(1:21:53) [soupir] les maquettes usage existantes et les racines des comptes.
(1:22:00) OK, là voyez, il s'est pas juste arrêté aller voir si ça fonctionnait bien. Il
(1:22:06) fait ce que je vous ai dit tout à l'heure, c'est qu'en fait il va il va carrément nous créer la macet. Est-ce qu'on lui avait dit ?
(1:22:15) Non. Ah si, tu vas me proposer un affichage en maquette. Parfait.
(1:22:24) Donc là, vous allez voir, moi je suis assez étonné parce que il y a encore avant que Astra sorte, j'utilisais que
(1:22:31) Fable ou Opus pour faire les maquettes et tout. Je trouvais que vraiment c'était c'était vraiment ce qu'il y
(1:22:37) avait de mieux. Et aujourd'hui, non,
(1:22:42) je trouve que vraiment bah c'est pas fou quoi. Alors, je sais
(1:22:47) pas si si les modèles ont été nerf
(1:22:53) ou si c'est un coup de comme il nous avait fait au mois de mars là, de baisser le le le la quantité de sinking
(1:22:59) et cetera. Mais en tout cas, je trouve que ouais, il y a il y a un gap entre ce que j'obtenais avant et ce que j'obtiens
(1:23:05) aujourd'hui, j'ai l'impression en terme de de design chez Claude
(1:23:10) et j'ai tendance à aimer un peu plus le design que fait Astra aujourd'hui.
(1:23:16) Alors que avant je je dois bien avouer que Chat pété en terme de design, je
(1:23:22) trouvais pas ça fou. Mais là, ben récemment, j'ai refait le
(1:23:27) j'ai refait le site avec
(1:23:34) notre notre ami Chat GPT Astra. Bon, on n pas tout refait. Il y a une
(1:23:40) partie du il y a une partie du du site qui était déjà existante que j'avais faite avec Claude,
(1:23:47) mais euh mais très clairement, en gros, cette partie-là, principalement, les héros là
(1:23:55) qu'il a fait ici avec cette petite présentation là, on peut voir un petit peu ce qui se passe. Bah, c'est vraiment
(1:24:02) sympathique, je trouve. Je trouve ça plus fluide, plus sympa.
(1:24:10) On a en gros on a modifié pas mal les couleurs de fond. Claude avait mis un fond très très foncé et on avait mis que
(1:24:19) des héros partout ici. Mais le problème c'est que sur mobile les
(1:24:25) héros ça casse de partout donc c'est pas top.
(1:24:30) Et les couleurs très foncées aussi ça quand on n pas habitué c'est quand même
(1:24:36) c'est quand même violent. [grognement] Mais on a on a refait tout ça et je
(1:24:42) trouve que ça ça a quand même un peu plus de gueule que ce que c'était avant. Mais je vous montrais j'ai j'avais
(1:24:47) commencé à faire une vidéo pour montrer justement la différence entre les deux
(1:24:53) et euh ouais je trouve que ça apporte quelque chose quand même. Il a il a grandement
(1:24:59) amélioré le le site par rapport à ce que c'était avant.
(1:25:04) Donc voilà. Voilà, déjà vous avez un petit ordre d'idée en deux vidéos de ben comment je travaille au quotidien avec
(1:25:12) les agents I. Donc là, c'est sur un un projet perso, mais j'ai aussi le
(1:25:18) bah les les projets sur lesquels je travaille pour mon travail, pour mon pour mon boulot, quoi.
(1:25:26) Donc là, je le montrerai pas en direct parce que bah c'est pas
(1:25:31) euh c'est pas à moi quoi. Je peux pas me permettre mais je l'utilise euh de la même manière dans
(1:25:39) mon dans mon quotidien. au boulot. La la grosse différence c'est que c'est pas
(1:25:44) les mêmes tech. Donc ben quand je teste sur
(1:25:51) les pardon quand je teste sur du web avec un moteur Python derrière, c'est
(1:25:57) assez facile avec Docker de de de d'avoir son son serveur en local et de
(1:26:03) voir directement en fait les modifications qui sont produites. Alors que là avec Tory, ben je suis obligé de
(1:26:09) build l'application pour voir un petit peu ce que ça va donner quoi. Donc c'est pas tout à fait pareil en terme de
(1:26:14) développement. Mais on s'y fait je pense c'est bon les deux sont viables quoi.
(1:26:21) Après je pense que je rajouterai un peu plus d'outillage à partir d'ici directement. Moi ce qui
(1:26:27) me plairait beaucoup c'est que ben par exemple quand il produit la maquette là que je puisse cliquer là et que j'ai
(1:26:34) directement les fichiers qu'il a produit la maquette qu'il a produit. Voilà, comme là par exemple où je peux voir
(1:26:40) directement en fait la maquette qu'il a produit et et travailler avec quoi.
(1:26:49) Je crois qu'il est parti totalement en cacahuète notre ami si c'est lui qui a créé ça, il est parti totalement en cacahuète.
(1:26:58) Donc on va voir. Ouais, c'est lui en plus qui a créé ça.
(1:27:08) Où où sont vos abonnements maintenant
(1:27:13) indépendant de la période.
(1:27:19) Mais ça c'est notre page actuelle. C'est ça qui me
(1:27:25) ça qui me paraît fou. Ça c'est notre maquette actuelle en
(1:27:32) gros. À quelques encablures près.
(1:27:42) Le bloc forfait lit l'état de chaque compte. Je pro la différence les règles.
(1:27:59) Proposition en attente de validation visuelle.
(1:28:21) On va attendre, on va l'ouvrir. On va réellement ouvrir son truc parce que
(1:28:28) j'ai l'impression que l'interaction ici c'est un peu c'est un peu c'est un peu l' je peux rien faire.
(1:28:37) Donc je sais pas si euh
(1:28:50) parce que ça c'est vraiment ce qu'on a là.
(1:29:01) Ah oui, on est passé sur un nouveau jour. OK.
(1:29:10) [soupir][souffle coupé] On va attendre qu'il nous montre. On va attendre qu'il nous montre. Euh
(1:29:15) exploreur, pas mal ça.
(1:29:24) Ah non, c'est mieux. Autant pour moi. Voilà.
(1:29:29) Donc oui, là je là je là je je je dis oui. Je dis oui. Je dis je dis oui. Oui.
(1:29:35) Oui. Oui. Oui. Oui.
(1:29:42) C'est pas mal hein. C'est pas mal. C'est pas mal.
(1:29:50) Bon, il a un peu inversé là quand même. [raclement de gorge] Se le cacher. Il pourrait nous mettre session session.
(1:30:02) sem tous les modèles. Spark 5h spark OK
(1:30:08) OK écoute
(1:30:17) relever à relever à pas mal hein.
(1:30:22) Bon moi il y a un truc qui me gêne hein. Je je je je mal le cacher. Il y a un truc qui me gêne. Donc on va
(1:30:29) lui faire corriger. Où c'est qu'il s'est affiché mon bordel ? Il s'est pas affiché.
(1:30:37) [grognement] Alors ça c'est le le côté inconvénient quand ils se mettent à tous lancer des tests et tout vite le PC il
(1:30:44) il rame. Et pourtant on peut pas dire que j'ai un petit PC
(1:30:53) [soupir] en je viens là. Je soit qu'il me laisse en gros là ça m'embête
(1:30:59) ça m'embête que ce soit pas partout à la même hauteur. Moi j'aime pas ça.
(1:31:06) Donc soit il me laisse la place pour chacun soit il fait en sorte que ça rentre. Mais en gros on peut pas avoir
(1:31:12) des trucs comme ça avec des marches qui sautent de partout. Faut que les blocs ils aient un minimum de cohérence.
(1:31:17) J'aime pas quand c'est pas quand c'est pas cohérent comme ça. Donc
(1:31:23) je vais lui lancer ça comme correctif et puis on va se laisser. On verra le résultat demain quand il aura quand il
(1:31:29) aura bossé le coco. Je vais lui balancer ça. Hop.
(1:31:39) J'adore la version 1. C'est pas mal du tout. Par contre au niveau des blocs là où je te montre, tu vas faire attention.
(1:31:47) à laisser la place pour une deuxième ligne, même s'il n'y a pas de deuxième ligne, tu vois, on doit
(1:31:53) pas avoir un bloc où on a le trait au milieu, un bloc où on a le trait plus bas, un bloc où on a le trait plus haut,
(1:32:05) tu uniformises la taille des blocs quoi.
(1:32:13) Pour le reste, c'est nickel, c'est top. C'est nickel, c'est top. On va peut-être
(1:32:19) pas pousser. C'est nickel. Ah, en plus, on peut faire le relever
(1:32:25) avec le bouton. Donc, c'est Oui. Euh, voilà, [soupir][souffle coupé] pour le reste, rien à dire.
(1:32:33) Voilà.
(1:32:41) il est en train de tout préparer. Il prépare le le le le travail en fait pour que ben les suivants ils aient ils aient
(1:32:48) plus grandchose à faire quoi. Il a très très bien compris la consigne du début qui lui dit attention c'est Grock qui va
(1:32:55) faire l'implémentation c'est pas toi quoi. Et du coup, il va tout préparer pour faire en sorte que l'autre, il arrive et il déroule quoi ? déroule ses
(1:33:03) tests et tout et ça évitera en fait que que que Grock parte en cacahuète en
(1:33:09) disant tiens, je vais aller installer ta libre parce que j'ai besoin de ça alors que en réalité il y en a pas réellement besoin.
(1:33:22) Bon là, on chipote hein, très clairement, le design il est bon. Mais
(1:33:27) ceci dit, à des moments, en gros, est-ce que est-ce que tu as vraiment envie là dans 2 jours de revenir parce ça te pète
(1:33:33) les yeux là de de voir la différence entre les deux ou est-ce que tu peux le gérer dès le départ ? Vas-y, laisse la
(1:33:39) place pour deux, laisse la place pour deux lignes. Même s'il y en a qu'une, c'est pas très grave quoi.
(1:33:46) Voilà. Moi je pense bon, quand c'est simple comme ça, je reviens dessus.
(1:33:51) Ça aurait été plus complexe peut-être que j'aurais laissé
(1:33:58) mais là ça pourrait me faciliter la vie. Ça m'éviterait toutes les 3 minutes d'aller sur le site de du provider pour
(1:34:05) voir où c'est que j'en suis de mes forfaits parce qu'on va pas se le cacher que ça descend extrêmement vite. Euh
(1:34:13) depuis qu'on que j'ai commencé les vidéos cet après-midi, j'ai quasi codé euh avec Codex qu'avec vous quoi en
(1:34:20) vidéo 1h30 donc enfin il a posté 4h et tout mais j'ai fait 1h30 cet après-midi. 1h30
(1:34:28) là, on est presque à 1h30 ce soir en lançant quelques agents. J'ai déjà mangé
(1:34:35) euh 23 % du forcédo. Voilà. Bon, Codex, on les connaît. Euh
(1:34:43) dans 2 jours, il y a un reset, c'est quasi sûr. Et puis au pire, j'ai un reset qui est disponible jusqu'au 5
(1:34:49) octobre. Donc là, je peux éventuellement [grognement] besoin faire péter un reset.
(1:34:55) Mais à contrario, mon cloud, j'ai 10 que 20 %
(1:35:00) depuis 2 jours. Et Grock, par contre, Grock, il a bien consommé. On est à 40 %
(1:35:06) mais il revient le 16 donc dans 2 jours. Donc là l'objectif dans les deux
(1:35:12) prochains jours, c'est de faire bosser euh c'est de faire bosser Grock autant qu'on
(1:35:18) peut quoi. Donc là on laisse on le laisse lui finir. Il est en train de finir là. Il
(1:35:24) crée les il crée les sprint. Il crée les tâches du sprint.
(1:35:32) Ça c'est pas génial non plus.
(1:35:37) Voilà, on est là. Et là, vous voyez, il a tout créé quoi. Il il laisse il laisse la place à rien du tout. Il y a la il va
(1:35:45) y avoir la spec à mon avis. Il est en train de l'ajouter. Et là, chaque tâche a son petit brief,
(1:35:52) l'endroit où il l'a calé. Pourquoi utiliser ceci, cela, machin ?
(1:35:57) Donc là, on va attendre qu'il ait fini. Et ben voilà, ça y est, il a fini. Il nous
(1:36:03) a tout expliqué. Faisable pour les trois. Sonder sur ce poste. Maquette validée. Retouche appliquée. Donc là, il
(1:36:10) aurait après ce qu'il dit appliquer la retouche à sa
(1:36:17) à la hop à la maquette qui nous a faite. Voilà.
(1:36:22) Là, voyez. Voilà, ça donne ça.
(1:36:28) On apprécie, on apprécie pas. Moi, j'aime bien.
(1:36:34) Après, bon, il y a différents trucs qu'il a pas géré, hein, on va pas se le cacher. Si j'ai 12 comptes, là, ça va
(1:36:41) très très vite partir en cacahuète. Donc, on pourra éventuellement lui dire tiens et
(1:36:47) euh fais en sorte que ce soit éventuellement un carousel ou qu'on
(1:36:53) puisse ben filtrer les providers comme on a ici en bas. Mais bon, là, c'est une V1. Moi, je veux d'abord que ça
(1:36:59) fonctionne. Je vais être sûr que ma ma
(1:37:06) que ça fonctionne correctement. Et une fois que ça fonctionnera, éventuellement, on fera des retouches, on ajoutera un petit filtre, un petit
(1:37:11) machin. Je crée alors le work tree. Je lance le Grock sur L0.
(1:37:23) Donc, il nous dit qu'on a des trucs à contresigner. On va lire rapidement ça et ensuite je vais vous quitter.
(1:37:29) [grognement] Donc faisable, il nous a mis la preuve ici. Il a fait ses sondes, il a vérifié, tout est faisable. Donc c'est parfait.
(1:37:35) Il nous dit que via cette URL là, on peut obtenir l'usage avec les jetons au hos du crésial. Donc ça, il l'a déjà
(1:37:42) pour utiliser ses ces trucs. Il nous dit qu'on peut obtenir voilà ces données là.
(1:37:49) Pour Codex, ça passe par un autre canal mais c'est le même principe. Et ici pareil, réserve à trancher. Le
(1:37:57) jeton cloud expire en quelques heures et seul le CLI le ne renouvelle. L'appécrit
(1:38:04) jamais donc jeton expiré égal dernière relève connue. État périmé.
(1:38:11) Euh c'est aussi la première lecture du fichier identifiant par l'application. OK. Bon pourquoi pas [grognement] la
(1:38:18) maquette ? On va dire en fait pourquoi pas, je dis pourquoi pas parce que là j'ai pas vraiment envie de batailler avec ça. Je
(1:38:25) veux voir si à l'usage c'est vraiment contraignant. Si bah ça arrive une fois tous les de jours, j'ai pas lancé de
(1:38:30) panne de cloud, je vois pas le forfait cloud. Bon, on va se cacher que on on
(1:38:37) cherchera une solution à ce moment-là, mais c'est pas le plus important. Le plus important, c'est à mettons dans la journée, je suis en train de coder les
(1:38:42) cloud et là j'ai plus accès à ces données. Là, ça peut être problématique, il faudra agir plus vite. Donc on on va
(1:38:49) pas surréagir tout de suite, on va laisser, on va tester et avec le retour
(1:38:55) d'expérience, on verra si oui, il y a un truc à gérer, si ça arrive souvent et si ça arrive souvent, ça veut dire qu'on a
(1:39:01) un autre problème parce que ça veut dire qu'on va devoir se réauthentifier plusieurs fois. Donc c'est problématique
(1:39:07) mais on verra dans second temps. La maquette on l'a validé, c'est bon.
(1:39:13) Euh OK. Le Grock Sockle Rust plus lecteur
(1:39:21) Grock plus P1. Ouais, ça me paraît être bien ça. Camban
(1:39:29) parfait. Il reste qu'à contresigner D7 et D1.
(1:39:35) Je contresigne.
(1:39:42) Alors, je contresigne.
(1:39:49) Donc, tu l'écris et ensuite on s'arrête là.
(1:39:59) C'est une autre session. Il a pas besoin de savoir ça
(1:40:05) parce qu'en gros là, je vais pas utiliser mes jetons fables pour qu'il fasse de l'orchestration. Je pense que
(1:40:11) c'est absolument inutile. Là, il a déterminé tout ce que j'avais besoin qu'il détermine. Il a été
(1:40:16) regardé, c'est possible de le faire. Donc, on a utilisé le maximum d'intelligence possible pour prévoir un
(1:40:23) maximum le travail, préparer un maximum le travail. Ensuite, on va mettre un
(1:40:29) opus. il va largement faire le ce qu'il faut pour euh voir si euh l'agent
(1:40:35) respecte l'aspect et il enverra son sous-agent sonné pour faire ses vérifications. Donc je pense qu'on est
(1:40:41) on est bien rien lancé, aucun word tre reste n'est pas commité.
(1:40:54) OK. Euh
(1:40:59) je vais le laisser là au cas où j'ai un truc à y checker après. On va partir ici. On va
(1:41:06) ouvrir ça. On va prendre Cloud confier. Ah non,
(1:41:12) on va d'abord faire ça.
(1:41:17) Sinon, on va se le lancer sur euh on va se le lancer sur sur
(1:41:24) Fable. J'ai pas envie. [grognement] Euh ici, on va cliquer là et on va faire nouvelle pan. Voilà. Là, ça s'ouvre avec
(1:41:33) Opus forcément vu que c'est le dernier que j'ai sélectionné. Et ça lui envoie tout le pâté.
(1:41:39) Voilà. Et comme ça, lui, il va déjà savoir comment euh comment gérer son
(1:41:46) gérer son truc, quoi.
(1:41:51) Juste vérifier une chose, c'est qu'il aille chercher les informations au bon
(1:41:56) endroit. C'est qu'il retrouve le work qui avait qui qui avait créé l'autre. Mais vo voyez ici, il l'a indiqué.
(1:42:03) Prochain geste, go work tree groc et gless. Donc il y a déjà tout expliqué et
(1:42:09) vous avez même plus à faire quoi que ce soit. [rires] On va le laisser bosser là. Il va plus nous normalement il nous posera même pas
(1:42:15) de questions. Il va faire son job ici. On peut s'arrêter. C'est parfait. On y est. On est lancé.
(1:42:25) Gate rejoué. Un correctif. Donc vous voyez pour pourquoi je suis pas un agent en permanence dans son travail. parce
(1:42:32) qu'en fait il il y a il y a tout un tas de règles qu'il va devoir suivre. Il est obligé, c'est comme ça. Et donc Lady
(1:42:38) Gate dans le work blabla, il va il va relancer ses tests, il va lancer sa review et en per et il va itérer comme
(1:42:46) ça. En fait tant que la review est pas bonne, il peut pas pousser. Et dès qu'il
(1:42:51) arrive à au moment de pousser le code vergit, ben en gros il a il a toutes les
(1:42:57) tous les hook de prépush on appelle. Donc en gros, c'est des événements qui dès qu'il va lancer la commande, ben ça
(1:43:03) va lancer toutes les suites de test du projet sur les sur les types de ficher modifier. S'il a modifié que du front,
(1:43:09) ça va lancer que le front bien sûr. Mais s'il a modifié front et back, ça va lancer les deux et à chaque fois ça va
(1:43:14) lui ça va lui faire un retour. Donc soit c'est passé, c'est nickel, tout va bien ou soit ben au contraire c'est pas passé
(1:43:20) et dans ces cas-là, ben il va se faire euh jeter, ça va lui expliquer pourquoi ça le jette. Et en fonction du retour,
(1:43:27) il va il va itérer, continuer à itérer et moi, j'ai pas intervenir. Je vais lu dire "Ouais, mais là oui, tu as fait une
(1:43:33) erreur, corrige, c'est bon. Non, il sait tout seul, il va faire son job."
(1:43:39) Donc bah je disais qu'il allait pas nous poser de questions. Au final, il finit par nous en poser. Chantier relu le go.
(1:43:46) OK. tout non suivi sinon le work tre
(1:44:02) oui oui oui.
(1:44:10) Bon, il me propose divers trucs. Comic laoc plus work tre plus grckless.
(1:44:16) Euh, [gémissement] on va faire ça comme ça. On va accepter ce qu'il nous dit
(1:44:24) parce qu'en fait si tu commences à vouloir en en lancer 15 à la fois, potentiellement tu vas te retrouver avec
(1:44:32) des conflits partout. Des fois, des fois il les gère, des fois il les gère pas. Souvent, il va le dire. il va dire "Je
(1:44:38) vais lancer ces deux-là en même temps parce que ben c'est possible, ça touche pas les mêmes parties du code." Des fois il il va les lancer séquentiellement
(1:44:44) parce que ben la la troisème partie a besoin de la partie 2 et cetera.
(1:44:51) Mais là-dessus, j'ai j'ai pas de raison de le contredire. En fait, je pense que je
(1:44:57) peux faire confiance à son jugement sur cette partie là.
(1:45:02) Et donc là, en gros, combien ça nous a coûté ça ?
(1:45:08) Ça nous a coûté 1 enfin 2 % du forfait hebdomadaire.
(1:45:14) Voilà. [soupir] Euh, sachant que le premier a fini son job et que le deuxième est parti et que
(1:45:20) en même temps j'avais cette bestiole là donc qui tournait encore, même si cette bestiole là, elle fait plus grand-chose
(1:45:27) parce que là, elle lance des lance des [grognement] gay de test et à chaque
(1:45:32) résultat, c'est c'est attrapé par notre ami RTK Token
(1:45:38) qui fait qu'en fait on dépense quand même beaucoup moins que ce qu'on devrait dépenser.
(1:45:45) Voilà. Ça s'est pas mal amélioré depuis cet après-midi quand même,
(1:45:51) mais c'est en fonction du volume qui passe et des actions qu'il font. Toutes les actions ne sont pas prises en compte quoi. Mais on voit quand même qu'on a
(1:45:58) économisé 1,2 million euh ce qui est quand même pas mal. Non, c'est sur le c
(1:46:04) la output et c'est ça que tu à chaque fois je vais faire le coup. Ouais.
(1:46:12) Donc c'est bien ça. Ça c'est le output et ça c'est l'économie. Donc là quand même sur 2,9 millions qui
(1:46:20) rentrent dans RTK en sortie, l'agent il en prend que 1,2
(1:46:26) 1,8 quoi. Donc on en a économisé 1,2 1,2 million de token. C'est c'est vraiment
(1:46:35) c'est énorme. Il y a des jours où la somme économisée, elle est juste pharaonique quoi. Là par exemple ces
(1:46:42) jours-là, tu as 12 millions qui rentrent, 1,3 qui sort, 11 millions
(1:46:48) d'économisés. C'est énorme. Et ça c'est principalement quand il itère sur des tests et
(1:46:54) compagnie ce qui va lancer énormément de fois le les tests techniques ou aller faire des git log en permanence. Et dans
(1:47:01) ces cas-là, en effet, c'est voilà. Et là, ça y est, voyez ce que j'expliquais tout à l'heure. Il a il a lancé son
(1:47:07) Grock dans sa PUD tranquille. Et du coup lui il s'est arrêté là mon
(1:47:14) cloud il fait plus rien là. Là il attend que son moniteur lui le rappelle en lui
(1:47:20) disant "Ça y est machin infini ou ça y est il s'est passé tel et tel et tel et tel problème." Et là il va en fait il
(1:47:27) définit des budgets. Il va lui dire par exemple la Grock ben tu as euh 5 dollars pour arriver à résoudre cette
(1:47:34) problématique ou créer cette fature et du coup à la fin il va te faire il va me faire un résumé il va me dire "Vous
(1:47:39) verrez ça demain". Du coup, dans le prochain épisode, il il va me dire "Ben en gros, telle étape a coûté temps,
(1:47:45) telle étape a coûté temps, telle étape a coûté temps. Attention, on a eu un griff sur telle étape et cetera et cetera."
(1:47:51) Mais normalement lui, il va aller au bout. Là, moi je vais aller me coucher euh parce qu'il est il est largement
(1:47:56) l'heure et demain, ben en gros, lui demain matin, il aura il aura terminé probablement son travail
(1:48:04) et pendant ce temps, je me serai bien reposé. Voilà. Donc je pense que pour cette
(1:48:10) session, on a plutôt bien travaillé. On a beaucoup
(1:48:16) lancer beaucoup d'actions en même temps. Certes sur des petits sujets, mais j'ai
(1:48:22) plein d'idées, hein. J'ai plein d'idées que j'ai envie de de de développer dans l'application.
(1:48:28) Le le truc c'est qu'il faut savoir euh corriger les choses qui vont pas avant
(1:48:34) d'ajouter de nouvelles choses. Ça évite après d'avoir trop de choses à corriger par rapport à
(1:48:41) ce que notre esprit il est capable d'magasiner comme information. [grognement]
(1:48:46) Voilà. Ben pour ce soir, je vous dis
(1:48:51) bonne nuit et puis si le cœur vous en dit à demain.
(1:48:58) passer une bonne soirée.
