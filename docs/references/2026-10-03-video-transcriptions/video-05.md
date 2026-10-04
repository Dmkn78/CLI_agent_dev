# Agents IA : Fable, Astra, DeepSeek et Grok sur le même exercice | NovaFactory — Jour 5

**URL :** https://www.youtube.com/watch?v=tqXt3ij82YU

(0:01) Bonsoir à tous, bienvenue dans cette nouvelle vidéo. Alors, on va reprendre un petit peu là
(0:07) où on s'était arrêté hier. Euh donc hier, on a fait les un premier test avec
(0:16) un prompt qu'on a réutilisé sur plusieurs sur plusieurs modèles et on a orchestré
(0:24) en gros des petits modèles avec un gros qui avait fabriqué la spec. Mais hier, j'étais un peu bloqué. J'ai pas pu
(0:30) montrer euh le coût euh que représentait en en token AP une session.
(0:36) Et du coup aujourd'hui, j'ai lancé j'ai lancé deux cloud
(0:42) euh enfin je l'ai fait hier soir en en off avant d'aller me coucher. Et du coup, j'ai obtenu tout à l'heure le
(0:49) résultat des deux sessions. L'une, c'est sur l'ajout d'une fonctionnalité euh
(0:57) au niveau des des des terminaux. On peut désormais cliquer et obtenir le coût
(1:04) d'une session en token et le coût d'une session en équivalent coût à payer. En
(1:10) gros, quand vous avez un abonnement chez Cloud ou chez GPT, pour ceux qui ne le savent pas, en gros, vous vous avez un
(1:18) certain nombre de de tokens que vous pouvez consommer via ce cet abonnement.
(1:24) Donc moi, j'ai des abonnement à 200 dollars avec Cloud et à 200 dollars avec
(1:30) Codex. Et du coup là, on peut voir que cette session en particulier avec ces
(1:36) sous-agents intégrés euh aurait coûté en en équivalent à payer 135 € quoi. Voilà,
(1:44) donc c'est quand même pas à donné pour pouvoir ajouter du coup un overlay ici
(1:50) avec l'appel des des données lié à cette session et pouvoir avoir un ordre d'idée
(1:56) de ce que ça nous a coûté de réaliser telle ou telle fature. Là, c'est un petit peu faussé pour la raison que il a
(2:03) utilisé un petit peu de quelques agents rock pour [grognement] réaliser les parties les plus simples. Mais on peut
(2:10) voir globalement que lui, celui qui était le maître de la conversation qui
(2:16) est le fable 5.1 hein, sur cette tâche, il a à lui tout seul coûté 46 dollars en
(2:22) gros 40 € quoi et que le le principal implémentaire nous a coûté 90
(2:29) €. et la review. Donc c'est-à-dire le fait que une fois que le travail est dit
(2:36) terminé euh que quelqu'un inspecte le code en fait
(2:41) euh et ils pas comme ça juste en regardant non, il va il va prendre l'aspect qui avait été établi au départ,
(2:48) l'aspect qui est le document en fait qui permet de cadrer le travail qu'on
(2:54) souhaite obtenir à la fin. et il va comparer en fait le l'aspect avec le
(3:00) résultat qui est apporté par l'agent. Et là, en plus de l'aspect, il a aussi le le design à faire respecter puisque
(3:07) le design, c'est une partie de l'aspect. Et là, je vous avais je vous ai gardé quand même quelques petits éléments.
(3:16) Hop, ici on a le design qui a été fait par l'agent en fait. et lui il avait et
(3:22) à faire le le le l'onglet comme ça. Donc on peut voir que c'est très pour très ce
(3:29) qu'on a. La peut-être la seule différence c'est la police d'écriture. Il me semble
(3:35) qu'ici la police est plus sympa. ici, elle est plus abrupte quoi.
(3:40) Donc il y a peut-être une police différente mais hormis la police en gros, on retrouve les couleurs, on trouve les emplacements, on retrouve les
(3:47) données qu'on souhaite y voir. [souffle coupé] Donc globalement pour du one shot, c'est
(3:54) c'est nickel. Enfin, du one shot. Moi, je tempère un peu ce que je dis puisque j'ai pas fait un seul prompt et c'est
(3:59) parti. Il y a d'abord eu je lui ai décrit le problème en gros. Euh ensuite,
(4:05) il a il a édité sa spec. J'ai lu la spec rapidement comme je fais avec vous d'habitude et je me suis concentré
(4:12) principalement sur le design puisque déjà dès le en gros le le prompt initial
(4:17) il lui donnait déjà tout le la problématique le vers quoi je voulais aller. Et donc le l'objectif en fait
(4:24) c'était d'avoir euh cette partie euh sur le sur le terminal directement pour pouvoir
(4:30) voir une session euh combien elle elle m'a coûté mais également refondre un petit peu la partie euh
(4:39) comment dire la partie consommation en fait parce [grognement] que je me suis aperçu que bon c'est déjà c'était léger
(4:46) en fonction des des providers, on avait pas forcément la lecture de la cache et cetera donc c'était un petit peu léger à
(4:52) ce à ce niveau-là. Et c'est vrai que les tokens ça pour les gens qui sont pas
(4:57) connaisseurs, ça dit pas grand-chose. Je peux vous dire "Ouais, j'ai mangé un milliard de tokens dans la journée. Cash
(5:03) read compris, ça vous dit pas grand-chose si je vous dis j'ai j'ai mangé 412 dollars de pay
(5:12) token là les tout le monde va comprendre je pense.
(5:17) Donc je voulais un petit peu avoir une refonte et donc là-dessus j'ai fait pas mal d'aller-retour. Je vais pas vous mentir que ça a pas été parfait du
(5:23) premier coup, loin de là. Euh, on a d'abord pas mal bataillé ici euh sur
(5:29) cette partie-là. Il m'a proposé une première fois, j'ai dit non, je lui ai donné des contrexemples en fait que
(5:35) j'avais et là c'est Sonné qui a travaillé principalement. En fait, je me suis trompé quand j'ai cliqué ici. Je
(5:41) c'est pas celle-ci, c'est celle-ci la celle qui a réalisé le travail que je
(5:46) viens de vous montrer. Et donc le le fait de pouvoir afficher ce
(5:51) cette partie-elà, cette partie-elà je vais vous la décrire juste après. C'est un autre délire mais dans le dans la
(5:57) même idée. Donc là, c'est génial. On va pouvoir se lancer les agents. J'ai déjà préparé les pannes
(6:04) sur le nouveau petit benchmark que je veux réaliser.
(6:11) J'ai fait attention aux permissions et cetera. Donc là, on va être beaucoup plus vigilant à voir s'il y a pas un
(6:17) agent qui regarde. Mais j'ai bien inspecté les [grognement] transcripts d'hier et a priori, il y a pas eu de
(6:23) débordement. aucun agent n'a été voir le travail de l'autre et du coup le le le
(6:28) résultat identique sur les sur le Grock et le dipsic indique que indiquerait que
(6:35) la la spec était suffisamment détaillée pour que l'agent n'ait pas du tout à interpréter
(6:43) le le résultat à produire quoi. Donc là on peut voir par contre que cette session pour le coup a été très
(6:49) volumineuse. 250 dollars sur une session, ça reste ça reste cher. Voilà.
(6:56) [souffle coupé] Euh et pour le coup, on a utilisé beaucoup beaucoup de de de
(7:04) sous-agents quand même. Sep sous-agents fondus et il a utilisé aussi des sous-agents Grock pour réaliser le la
(7:10) fiture. Et donc on a le résultat donc de du petit overlay ici qui est plutôt
(7:16) sympathique je trouve qui nous donne très rapidement l'information de combien ça a coûté et c'est un petit peu
(7:22) l'objectif. Et ici, du coup, on a eu la petite refonde. Donc, j'ai pas touché à cette partie-là comme je dis hier,
(7:28) pardon. Ça, on le fera un petit peu plus tard parce que pour l'instant ça me convient. Même si ça reste là, c'est pas
(7:34) très grave. Je peux je vous montre par la même occasion que la partie Grock qui était buggée hier a bien été corrigée et
(7:41) on est bien à l'abonnement sur le sur à identique pardon de l'abonnement que je
(7:47) vois sur mon sur ma page du provider. Donc tout va bien. Et ici, on peut voir qu'on a fait la refonte.
(7:53) Donc voyez, par rapport à la par rapport à la maquette, j'ai aussi fait inverser ça parce que avant je ne
(8:00) comptabilisais pas la cache lu dans le dans le total token parce que je trouvais ça ridicule en fait. Ça c'est
(8:07) plus représentatif de ce que j'ai consommé dans une journée. Ça c'est en fait c'est inhérent au fonctionnement du
(8:14) du LLM. Mais à partir du moment où on montre des euros, on est obligé d'être 100 % transparent parce que la casche la
(8:21) casche la cash read donc le fait de lire la cache, de lire les informations qui est en gros une cache c'est quoi ?
(8:28) Pardon ? On va on va prendre dès le début. La la cage, c'est le fait que cette information qu'il a là, qu'il a
(8:34) lu, en gros, le bout de de le texte qu'il a lu va être conservé sur une
(8:40) machine en fait pendant la durée du fonctionnement et à chaque fois qu'il va refaire appel à cette cette information,
(8:45) en gros, on va payer mais pas aussi cher que la première fois qu'il ouvre le fichier sur notre PC et dans lesquels il
(8:52) récupère l'information. Donc il y a une différence en gros dans
(8:57) le dans le tarif. C'est pour ça qu'on le compte à part et parce qu'en gros euh
(9:04) sur un travail d'une heure, on va dire euh la la CACH travaille à son plein potentiel. Vous payez une fois, vous
(9:11) vous lisez ensuite à chaque fois le pour certains LLM en gros le coût en écriture de cache
(9:19) est vraiment fort. Alors là pour le coup, il m'avait pas mis fable mais je
(9:25) l'ai parce que bien sûr pour qu'il obtienne les
(9:31) pour qu'il sache en fait combien ça coûte, il faut lui indiquer à quelque part. Donc soit on le fait via un lien
(9:37) dynamique vers X ou Y bibliothèque mais qui est peut-être amené à changer dans
(9:43) le temps où on fait comme là j'ai fait. C'est-à-dire qu'en gros euh ben une fois
(9:48) j'ai appuyé sur le bouton, il a récupéré des informations et à partir de ce moment là, on peut
(9:54) imaginer soit modifier nous-même à la main, soit versionner ça. C'està-dire dire bah de telle période à telle période là de de du moment où je l'ai
(10:01) créé à aujourd'hui par exemple, c'était tel tarif et demain ouvrir une nouvelle page tarif quand les tarifs évoluent un
(10:08) petit peu comme on fait avec Git et avec le code. Donc là c'était la première partie. On
(10:13) verra si on ajoute une deuxième partie. Pour l'instant dans l'idée, ça me ça me convient. Ici
(10:19) pareil, on peut régler le taux de change entre le dollar et l'euro. Ça c'est
(10:24) pareil, c'est des jeux que vous pouvez rendre dynamique. Il pourrait tout à fait faire un ping sur un serveur quelconque euh qui donne la donnée sur
(10:32) internet du taux de change euro dollars ou de je ne sais quelle monnaie vers
(10:38) laquelle vous voulez traduire le le prix. Là, moi je fais en euros et du
(10:43) coup là c'est le prix en dollar et ensuite ça convertit parce que forcément les éditeurs, ils mettent le prix en
(10:49) dollar, c'est des Américain pour la plupart. [grognement] Donc voilà. Donc là, on a notre grille
(10:54) de prix et à partir de là, vous voyez que un fable 5.1 quand il écrit dans la
(10:59) cache, c'est 20 dollars par million de tokens en entrée. Par contre, quand il
(11:05) la lit, c'est 0,25 dollars par million en lecture, quoi. Et donc, en gros, vous
(11:11) allez vite vous apercevoir quand on va faire nos nos tests que le principal coût, c'est
(11:20) la lecture de cash. Au début, on se dit "Mais non, mais c'est pas très cher." Donc oui, heureusement que c'est pas très cher parce que sinon ça ferait
(11:27) exploser le prix. Là, on voit que sur 245 dollars de prix, ce qui nous a coûté
(11:33) le plus cher, c'est la lecture de cash avec 178 dollars en haut. Voilà.
(11:39) [grognement] Donc, c'est extrêmement conséquent. Bref, ça c'était la petite parenthèse ici. Je reviens là et on peut voir que
(11:47) aujourd'hui euh j'ai consommer pour l'équivalent de 588 dollars d'API
(11:55) token et j'ai rien payé. C'est dans les abonnements que j'ai souscrit au début
(12:01) du mois. Donc 200 dollars pour euh [soupir] pour clot 200 dollars pour Codex et euh
(12:08) Grock coûte un peu plus cher 250 dollars. Enfin 300 dollars mais en euros ça fait 250 € en gros.
(12:17) Et donc euh juste en une journée, j'ai mangé en token le l'équivalent du prix
(12:23) de mes abonnements quoi. Donc si on met sur les 30 derniers jours, même si c'est un peu faussé les 30 derniers jours, je vous expliquer pourquoi.
(12:28) [souffle coupé][soupir] Mais en gros, si on pense sur les 30 derniers jours, ça représente 31000 dollars de token à pays. Voilà,
(12:36) c'est phénoménal en fait. C'est phénoménal. Et là, pourquoi ? Parce que ben principalement
(12:42) principalement parce qu'en fait on peut user de certains astuces. par exemple l'abonnement Cloud
(12:50) euh ou n'importe quel abonnement. Mais pour le coup, ça marche plutôt bien avec Cloud. Si vous par exemple votre
(12:56) abonnement, il est renouvelé le 4 et que ça vous arrange pas bien que ce soit le 4, bah de toute façon, vous allez le
(13:02) repayer ce mois-ci si vous voulez le conserver. Donc pourquoi pas annuler celui-là, mettre sur une autre adresse
(13:09) mail et débuter le 1 si ça vous arrange plus de débuter le 1. [grognement] Et l'abonnement par contre de l'autre, il
(13:16) va terminer que le 4. Donc en gros pendant un certain temps, vous avez deux abonnements. Si vous voulez consommer en
(13:23) fait il y a des moments où par rapport aux resets de la semaine et tout, moi je m'arrange. Je je coupe l'autre compte,
(13:29) je mets sur un autre compte. Là par exemple, il y a il y a eu la sortie de
(13:36) de GPT euh si ça serstra et quand c'est sorti, ils ont fait un reset cloud. Moi,
(13:41) j'avais mangé quasi tout mon abonnement et du coup pendant 12h, j'ai eu ben un
(13:48) abonnement reset et j'ai mangé 60 % de l'abonnement hebdomadaire en même pas ouais même même pas 12h quoi. [soupir]
(13:56) Et donc forcément comme ça vous vous gagnez un petit peu par rapport au prix des abonnements. Donc là, c'est pas mal
(14:02) faussé à cause des resettes, mais bon
(14:07) euh voilà, ça nous ça vous donne un ordre d'idée quoi. Et je trouve open Bon
(14:13) là je l'ai ouvert beaucoup plus tardin. On voit que c'est plus aux alentours du
(14:20) en gros je l'ai commencé le le 29 ou le 30 août [grognement] et
(14:28) et le 2 ou le 4, je suis passé à l'abonnement supérieur. J'avais pris 100 € j'ai je suis passé à 200 €
(14:34) et du coup en gros ça resette donc c'est du du coup du 2 au 2 quoi. Mais eux on
(14:41) peut voir tout de suite que le le le le le le le nombre de de token disponibles
(14:46) à la pay est pas du tout le même quoi dans le forfait que celui de
(14:53) il n'y a pour moi aucune aucune comparaison en fait.
(15:01) Voilà. Et j'ai eu comme tout le monde plein resette et tout et je les utilise à chaque fois. Là, vous pouvez voir en
(15:08) gros il me reste qu'à dimanche, je suis déjà à 69 %. En gros là ce soir, je pense qu'on va manger bien 10 ou 15 % de
(15:16) ça et peut-être 5 à 10 % de ça. Euh donc on va voir mais vous allez voir que ça
(15:22) va extrêmement vite. Et donc pour en revenir, j'ai eu une autre idée. Je me suis dit buunque, c'est casse-pedier
(15:29) d'aller cliquer là-haut [grognement] pour voir les les resettes. Et j'ai vu sur X un gars qui montrait un overlay en
(15:35) haut sur le côté. Je me suis dit "Punaise, c'est une super idée, pourquoi ne pas aller ? faire ce petit ce petit
(15:43) overlay. Et donc voilà, ici on va on se retrouve avec ça. Et là l'overlay, il
(15:48) nous montre soit le débit pour la semaine
(15:53) pour par exemple Codex qui a pas de limite sur 5 heur à part sur un type de modèle particulier.
(15:59) Et pour Grock pareil. Par contre pour Claude, on voit la
(16:05) session. Voilà différence.
(16:11) Et en gros, on peut choisir donc de le mettre en haut, de le mettre à gauche, de le mettre à droite. Il y a un petit bug, j'ai constaté. Si j'essaie de
(16:17) lever, voilà, il fait un peu n'importe quoi. Donc je verrai peut-être de corriger ça.
(16:23) On peut le laisser toujours. Je vois pas, je vois absolument pas l'intérêt de faire ça. Et ça c'est ça pour le coup,
(16:28) je l'ai fait faire par Fable. Et [raclement de gorge] on va pouvoir voir que dès le début,
(16:34) lui en fait le seul correctif que j'ai fait sur la maquette quand il me l'a présenté, c'est qu' ici en fait le
(16:41) pour codex c'était en jaune. Voilà. Et donc je lui dis bah écoute, ce serait
(16:47) pas mal quand même d'avoir le le codex en blanc aussi mais c'est à peu près tout le la la
(16:53) seule correction que je lui fais faire quoi. Dès le début, il avait extrêmement bien compris ce qu'on lui demandait.
(17:02) Et vous pouvez voir que il a reproduit exactement enfin lui il a reproduit je dis en fait c'est les sous-agents qui
(17:09) ont travaillé pour lui qui ont reproduit parfaitement le l'aspect quoi. Et pour [grognement] lui pour le coup pour cette
(17:15) feature là comme on le voyait c'est celui du début. En gros lui tout seul il a coûté 40
(17:21) dollars. Ça veut dire 40 €. Ça veut dire que potentiellement
(17:26) d'après les tests que je suis en train de faire là avec ben les benchmarks qu'on a réalisé hier notamment et qu'on
(17:32) va reproduire ce soir, on pourrait penser que avec juste les 40 € de de
(17:38) Fable, potentiellement on s'arrête avec Fable et on et on passe à un autre provider qui par exemple Dipsic où ça va
(17:45) être des centimes plutôt que des dizaines d'euros de dépenser. Et donc
(17:51) c'est toute c'est tout l'objectif. Si vous pouvez si à terme on peut utiliser
(17:57) un modèle frontière pour les les cas complexes qui ont besoin de de de prédire sur plusieurs tâches un travail
(18:04) plus long, euh ben on le fait travailler sur le onboarding et là il a il a attention euh 40 € mais il a fait le
(18:11) onboarding et il a fait l'orchestration. dire qu'en fait c'est lui qui a qui a dit bon ben là je vais découper mon
(18:16) projet en temps de phase. Donc pour le coup on peut retourner sur notre petite fature de sprint qui est là pour pour
(18:23) ça. Et là on peut voir que lui c'est ici l'overlay pour l'usage. On va voir il a
(18:28) prévu ça en trois en trois étapes en gros.
(18:34) Euh et en fait après c'est des agents qui ont bossé pour lui quoi.
(18:40) Voilà, lui il a fait que euh préparer l'aspect et préparer le plan. Ensuite il
(18:46) a envoyé son agent réaliser le le l'aspect la la fature quoi. Et on peut
(18:52) voir que le plus gros du coup ici il est il se situe sur
(18:57) principalement sur l'implémentation. La review a quasi rien coûté. Bon, c'est
(19:04) toujours pareil, il faut tempérer ce que je dis. 5,31 € c'est quand même quelque chose mais comparer le coût global au
(19:10) coût global pardon, c'est une partie infime et la review, il faut pas la
(19:15) sous-estimer. Au début, on se dit "Ouais, bon mais en fait non, euh en réalité les
(19:22) modèles, ils ont tendance de temps en temps à prendre des largesses pour diverses raisons. Et la review, elle est
(19:28) là pour leur dire "Non, non, là ça on t'avait pas demandé ou on t'avait demandé ça comme ça, il faut le faire
(19:34) comme ça." [grognement] Donc c'est quand même important. Moi je vois souvent la review. Des fois ça
(19:40) pénalise le modèle. Il est obligé de refaire trois fois ou quatre fois la review parce que ben trois ou quatre
(19:45) fois, il avait quand même pas respecté la totalité. Puis des fois à la première review, il va trouver quelque chose.
(19:51) Quand le modèle va avoir corrigé, il va relancer une nouvelle review et la review va trouver autre chose. En fait, ça veut pas dire c'est pas parce que une
(19:57) première review est passée et il vous dit on a trouvé une seule chose que la deuxième va pas trouver autre chose. Alors par contre, on va pas faire ça
(20:03) éternellement. Si c'est validé, c'est validé. Au bout [grognement] d'un moment, on cherche à s'approcher de la
(20:10) perfection, pas d'être parfait. C'est extrêmement difficile. Après, je sais que c'est frustrant. moi-même
(20:15) pendant longtemps, j'étais frustré du fait que les choses soient pas parfaites et toujours en plus on va avoir tendance
(20:21) à remettre en question sa façon de travailler en disant "Ouais mais peut-être que c'est moi qui fait mal les
(20:27) choses, c'est pour ça que c'est pas parfait peut-être." Mais dans ces cas-là, analyse ton travail et regarde
(20:33) ce qui a pu pêcher et comment tu peux demain l'améliorer, quoi. Je pense c'est
(20:38) une meilleure attitude que de se dire "Oh mais en fait je je fais jamais les choses parfaites. Plus on on comble de
(20:47) problématique et plus on va vers un résultat convenable quoi." Voilà, là c'est pas
(20:54) parfait hein, on est d'accord comparé à la spec enfin comparé à la [soupir] pardon à la maquette, ben il y a une
(21:02) différence de police. Voilà, si on va chafou moi l'œil ça me gêne et puis là
(21:07) je vois relevé impossible. Est-ce que ça veut dire qu'il a pas pu relever ? Est-ce que ça veut dire qu'il manque une partie du résultat ? On sait pas trop.
(21:15) Voilà. Bon, c'est des choses à creuser. Voilà, il reste du travail effectivement mais la majorité de la fature, elle est
(21:21) rendu. Dire hier, on a fait des tests, on était pas capable de savoir combien ça coûtait. Ce soir, on va faire des
(21:27) tests et on va savoir combien ça va coûter. Et ça, c'est quand même déjà un
(21:32) plus. Voilà. Donc vu qu'on a pu euh valider ces deux que ces deux choses
(21:39) étaient faites et bien on va les acquitter
(21:44) et on peut au passage aussi ça on l'a vu. C'est bon il a enfin résolu le problème de la
(21:53) du forfait qui remontait pas sur Grock. Bien, ici, j'en ai envoyé un autre parce
(21:59) que je me suis rendu compte qu'encore une fois, malgré qu'on a fait on a démarrer cette fature il y a deux
(22:05) épisodes, on l'a fait corriger à l'épisode précédent, ben encore tout à l'heure, oui, j'ai avancé effectivement,
(22:12) je suis plus bloqué à la première étape du de dubarding du compte, mais je suis bloqué à l'étape suivante, donc le
(22:19) problème reste le même. Je reste bloqué. Donc aujourd'hui, on a là, j'ai renvoyé
(22:24) un codex un petit peu plus énervé que
(22:29) la dernière fois en lui disant "Acco maintenant, tu vérifies la prochaine fois que je lance l'application en fait
(22:35) je peux onborder mon compte. On va arrêter de faire des allers-retours 15 fois pour du code qui fonctionne pas.
(22:41) Donc tu fais tu fais tu fais ce qu'il faut pour pouvoir contrôler parce que là en fait il a les outils pour contrôler
(22:47) mais des fois ils prennent encore une fois comme je le dis ils prennent des largesses. Je vois souvent Claude ouvrir
(22:54) le l'application enorde dev et aller prendre des screenshots pour voir ce qui se passe. Donc quand lui il le fait pas,
(23:00) soit il le fait pas pour des problèmes de permission ou quoi que ce soit mais là il n'aimait pas de problème de permission. Ça peut arriver mais souvent
(23:06) ils vous le disent on dira j'ai pas pu par contre lancer là ça n'a pas fonctionné. J'ai pas les permissions
(23:12) nécessaires. Voilà, c'est à vous de faire quelque chose. Bref, le bug sur le forfait, on a dit
(23:19) c'est bon le nettoyage du work tre et la release. Bon mais voilà, ça ça typiquement c'est une action que vous
(23:24) aimeriez très fortement faire avec un un modèle local parce que là il y a pas il
(23:30) y a pas de réel plusvalue. Il suit un script hein, c'est aussi bête que ça. Il doit envoyer telle commande, utiliser
(23:36) telle truc. Donc si la si l'instruction est suffisamment précise, potentiellement un modèle euh
(23:44) bien moins capable serait capable de réaliser la tâche. Donc là, on voit que ça nous coûte quand
(23:50) même 8,43 € de de de d'API pour faire le nettoyage
(23:56) des work déjà merge et de pousser la release. Voilà, c'est un petit peu cher
(24:03) quand même pour [grognement] l'action demandé. Est-ce que je relance quelque chose tout
(24:08) de suite ou est-ce que d'abord on lance euh nos petits bonhommes ici ? Je pense
(24:15) qu'on va d'abord lancer nos petits bonhommes sur le travail comme ça pendant que eux travaillent, on va pouvoir aller voir de l'autre côté.
(24:20) Enfin, on va on va utiliser le principe de de multiplier les tâches et les sous-agentes. Donc là, je vais tout
(24:28) simplement aller chercher mon prompt. Je suis pas une machine. Donc mes promptes ont été euh enregistrés
(24:36) dans des fichiers, ça va beaucoup plus vite.
(24:46) Donc j'ai ici le prompt de base. Je vais le lancer sur
(24:53) dipsic en mode flash
(24:58) en réflexion max. Euh mais d'abord, je vais ajouter un Tu
(25:07) dois créer un fichier HML
(25:15) et pas répondre dans la console.
(25:22) Off. Est-ce qu'on lui fait la front de lui préciser ? Non. On va voir parce qu'en
(25:28) théorie normalement on a on a donné les instructions dedans. Ou là, ou là, ou là, ou là, ou là. On va se calmer. On va
(25:33) le laisser travailler. Voilà. Donc là, c'est parti. Il est dans son dans son petit fichier à lui, dans
(25:39) son petit dossier à lui qu'on a créé pour l'occasion. Il n'y a absolument rien dedans. Voilà, le dossier est vide
(25:46) de chez vide. C'est très simple, on est vide. Voilà. [grognement]
(25:51) Donc on lui a donné le prompton de base.
(25:56) Maisaintenant, on va voir comment il se débrouille. Ensuite, on va faire la même chose avec
(26:02) Fable. OK. Il se passe quoi ? Très bien. On va
(26:08) choisir notre modèle Fable et on va comme hier le mettre en X. Je pense que
(26:13) ça suffira vu la quantité de temps que ça va prendre pour qu'il démarre pour qu'il commence à
(26:20) démarrer lui. C'est bon. Et on va faire pareil
(26:26) pour Astra. Oui, bonjour. Il se passe quoi là ?
(26:36) On est bien dans mon truc. On n'active pas le MCP.
(26:43) Euh si j'ai le bon modèle et le bon la bonne quantité. Parfait. Donc vous
(26:50) voyez, j'ai lancé le même prompte sur chacun d'eux et il nous en manque un.
(26:59) Du coup, il nous manque Grock et je vais le mettre dans son petit dossier aussi.
(27:05) Voyez, c'est tout bête ce que je fais, hein. Je crée Grock code 4.6. Ici,
(27:15) je vais venir là euh dans mon petit dossier résultat
(27:22) thermomètre de Galilée. Oui, pardon, j'ai pas dit ce que c'était le l'objectif, c'est de faire un thermomètre de Galilée. C'est pas très
(27:33) c'est pas très euh c'est pas foufou mais c'est dans la même idée que que
(27:39) hier quoi. Dans la même optique que ce qu'on a fait hier. On va se mettre là et c'est parti.
(27:46) Grock. Ouais, je peux le laisser comme ça. On
(27:52) désactive ça. Et lui c'est pareil. On lui balance le prompt.
(27:58) [grognement] Est-ce qu'on est en bon ?
(28:04) Je vais pas prendre le risque de le lancer sans savoir.
(28:09) Ça pourrait être en milieu. En mieux. Hop hop, on est un extra aussi. Donc tout va
(28:18) bien. Voilà. [raclement de gorge] Et là, on a chaque modèle qui travaille
(28:24) dans son dossier à réaliser euh notre petite tâche.
(28:31) Codex là. Ah oui, d'accord. C'est le refresh en fait. Tu fais que je sois comme ça. Voilà.
(28:41) Voilà. Voyez ce que j'expliquais sur Fable. Le côté pas génial du tout, c'est que
(28:48) là, il va passer un temps infini à rien faire et on sait pas s'il
(28:54) travaille. Donc hier, je l'ai interrompu, je l'ai relancé machin et c'est pour ça aussi que je me suis décidé à faire cette action sur le coup
(29:01) parce qu'en fait je me suis dit oh mais pas de problème, je vais lancer le slash usage en général ça nous donne le prix
(29:07) qu'à consommer la session, je vais avoir le résultat. En fait, je lance le slash, on a bien vu, ça donne rien du tout. Je
(29:13) me suis dit bon ben je vais demander au modèle le coût de sa session. C'est ce que j'ai fait. Le problème c'est que le
(29:21) fait de l'avoir interrompu puis relancé puis réinterrompu, en fait j'ai payé. C'est-à-dire que ça m'a décompté des
(29:26) tokens. [souffle coupé] C'est pas juste vous arrêtez la session, vous la Non, en fait juste cette action là, ça a mangé
(29:33) une majorité des des du prix de la session. [soupir][souffle coupé] Et du coup, c'était plus je pouvais pas
(29:40) vous montrer ça en vous disant "Oui, oui, ben lui, il a consommé 17 dollars, lui il a consommé 12 dollars." En sachant que moi-même en ayant coupé
(29:47) relancé, coupé relancé deux fois, j'avais induit le le truc en air. Et
(29:53) même si lui il détaillait les coûts, il détaillait les coûts pour les pour les euros mais il détaillait pas les coûts pour les les tokens. Du coup, il aurait
(29:58) fallu que je fasse des divisions et cetera. Donc ça ça rentrait enfin on commençait à partir dans un truc où ça
(30:05) devenait disproportionné par rapport à quand on clique ici, on veut juste savoir quand il a fait ce jeu-là combien
(30:12) de dollars ça nous a coûté pour mettre un peu en balance avec les autres. L'objectif c'est aussi voir si au moment
(30:18) où il va faire la spec ici par exemple euh
(30:25) qu'est-ce que ça va nous qu'est-ce que ça va générer en fait en terme de prix ?
(30:31) plus le dips qui travaille quoi. Voilà, donc je vous propose de passer à ça
(30:36) parce que on peut voir qu'ils sont extrêmement lents ces deux pour travailler.
(30:43) Désolé pour la petite coupure. Du coup, [grognement] on reprend avec notre clotte de flable.
(30:50) On est sur le Non, j'ai fait une bêtise. Hop, il faut que j'enlève le MCP sinon
(30:57) 21, ils peuvent passer d'une session à l'autre pour regarder ce qui se passe et c'est pas vraiment l'objectif.
(31:05) Et là, le prompt est un peu différent du coup. Hop. puisqueen fait on lui demande de faire
(31:11) l'architecture pour le pour le modèle quoi.
(31:19) OK. Est-ce qu'il est dans le bon endroit ?
(31:26) Oui, il est au bon endroit. On est sur Fable 5.1, on est en X, c'est
(31:33) parfait. [grognement] Voilà. Bon, pourquoi j'ai pourquoi les frampes sont en anglais ?
(31:39) C'est très simple, c'est parce qu'en fait je veux pas que les modèles chinois soient handicapés par le fait que nous
(31:45) on soit français. Je sais que certains de ces modèles ont des petits problèmes avec le
(31:52) l'orthographe français. Donc j'ai voulu éviter ça. Ici, on est
(31:58) bien aussi au bon endroit. On va coller le prompt. C'est quand même
(32:03) du prompt volumineux. On n'est quand même pas sur
(32:09) sur du petit prompt. Voilà, là on a lancé en gros ceux qui
(32:14) font ceux qui vont réaliser les specs pour les autres.
(32:20) C'est pénible ce
(32:27) et voyez la différence entre GPT6 Astra et Fable. Mais GPT6 il commence direct.
(32:35) En fait, il a très vite, il a très bien compris. Il dit "OK, je me mets à faire la spécification dans le point MD."
(32:43) Et lui, il a même pas répondu. Pour l'instant, on sait pas s'il a compris ce qu'on voulait, si il est au travail, si
(32:52) on sait pas. On voit que
(32:58) l'ami mince Dipsic, il est déjà au travail
(33:05) lui. Il a commencé à à créer un fichier JS
(33:10) dans le dans le local
(33:16) et à mettre ses petites ses petites choses en route. On voit que
(33:22) lui il a toujours pas commencé à travailler. 8 minutes que le modèle attend quoi.
(33:29) Voilà voilà c'est ce que je vous disais hier et est
(33:34) en train de se de se voir directement sous vos yeux et baillés.
(33:40) Bon, pour le coup, pour l'instant, on a rien enfin ça nous a rien coûté, mais ceci dit, euh
(33:48) voilà, il le modèle, il trahille pas quoi. Pendant ce temps, vous vous attendez que de savoir s'il a même reçu
(33:54) le Par contre là, vous avez déjà consommé des tokens, hein. Ça se voit pas dans l'abonnement pour le moment, mais les tokens qu'il est déjà qu'il a
(34:01) qu'il a emmagasiné juste au fait du prompt et du cloud.md et bon là, il y a
(34:06) pas de cloud. MVD et du prom système qui lui est injecté par anopique. Tout ça vous l'avez déjà payé. Voilà. Par contre
(34:13) lui il a pas rendu quoi que ce soit au dans l'immédiat quoi.
(34:20) On peut voir qu'Astra aussi est au travail.
(34:25) Alors oui, [grognement] pardon, je reprécise. Ceux sur lesquels il y a juste le nom là, c'est quand il réalise la tâche en direct. Donc on leur a donné
(34:32) le prompt original et ils ont pour objectif de générer le
(34:39) le résultat. Ce euh [gémissement]
(34:44) ceux-là par contre, ils font lac. L'objectif c'est qu'il nous pronent un
(34:51) fichier avec la spec.
(34:59) Donc normalement ça va arriver assez rapidement. Les résultats vont pas prendre à des heures. Je pense que le
(35:05) premier à rendre le résultat, ce sera dipsyque. Voilà.
(35:10) On peut voir qu'il a essayé de regarder une image
(35:16) et on peut voir déjà euh que en terme d'usage,
(35:23) on est à 8 centimes ici. Pour l'instant, j'ai pas je l'ai pas
(35:28) injecté sur les sur les open codes. Je l'ai par contre ici pour
(35:35) les deux gros modèles.
(35:45) Mais Dipsi on avait déjà de dips hier, j'avais déjà le nombre de token et le nombre de de dollars que ça coûtait en
(35:51) en app pour la petite histoire. J'ai j'ai pris 20 dollars il y a 3 mois je crois. J'en
(35:57) ai divisé peut-être peut-être 50 centimes actuellement.
(36:03) Donc euh mais justement aujourd'hui, je me pose pas mal de question parce que je me dis
(36:10) là, j'ai payé euh le Groc à 250 € en me disant euh bon euh
(36:19) si on est sur le niveau frontière et qu'il est capable de faire les mêmes travaux que les deux autres, au final ça
(36:24) me fait quand même économiser pas mal. Mais en réalité bon euh il est il est
(36:30) quand même inférieur et il va il est à la même vitesse que les deux autres. Donc si vous voulez,
(36:36) vous vous gagnez pas en capacité et vous gagnez pas en vitesse. Et pour le coup,
(36:41) la petite erreur que j'expliqué qu'il a fait hier, enfin qu'il avait fait il y a un moment que j'ai expliqué hier,
(36:47) c'est juste c'est juste rédibitoire quoi.
(36:54) Toujours pareil ici, il a pas commencé à travailler lui ou du moins on voit pas
(37:00) le résultat de ce qu'il a commencé à éventuellement penser ou faire.
(37:14) lui euh
(37:20) on dirait qu'il essaie de lancer un serveur. Je pense que là-dessus, on peut regarder, on peut voir un un premier
(37:27) résultat de ce qu'il fait éventuellement.
(37:34) Je je vous montre quand même. C'est quand même pas mal. C'est qu'un début hein. On va pas juger
(37:42) tant qu'il a pas fini. Mais bon, il y a un truc hein.
(37:48) Visuellement c'est joli. C'est pas fini. Par contre, on dirait qu'il manque quand même quelque chose [grognement]
(37:55) mais on voit qu'il travaille encore. Donc on va pas le le blâmer. Astra trahit
(38:01) encore alors que Claude n'a pas débuté. Claude pour l'instant on est encore dans le dans le deep euh in through
(38:07) [soupir][souffle coupé] on attend qu'il se passe quelque chose. OK. Pendant que les autres ils
(38:14) travaillent ici, est-ce que ce serait pas le moment de
(38:20) lancer le chantier dont on parlait hier sur cette partie là ?
(38:38) Oui, il y a deux choses qui me tuent les pin là ces derniers temps, c'est cette dialogue comme j'en ai parlé hier et
(38:44) c'est la partie tableau et sprint. Là, je trouve qu'on est on est passé
(38:49) dans un mode que j'aime beaucoup. Ici, on voit que tout est vous voyez comparé
(38:56) à la semaine dernière quand j'ai début, enfin quand dimanche quand j'ai pu la première vidéo où on avait des cartes en
(39:02) tout de partout, on avait des cartes en euh in progress de partout. On savait
(39:10) pas trop pourquoi, qu'est-ce qui fonctionnait, qu'est-ce qui avait pas fonctionné. On voit que là, c'est
(39:15) totalement l'inverse. On sent que c'est beaucoup plus organisé. On voit que les dernières qui ont été créées là, elles
(39:22) ont toutes une PR. Donc elles font toutes appel à au
(39:29) à une branche guide juste derrière. Et on peut voir qu'en fonction de si c'est un correctif
(39:34) ou si c'est euh
(39:40) on peut voir par contre que certains ils remplissent pas tout.
(39:46) Voyez quand c'est codex il travaille, il fait pas de plan. Le le gars.
(39:54) Ah si si il en a fait un, il en fait quasi jamais quoi. La plupart du temps, il saute le plan
(40:00) pour lui. L'aspect ça suffit. On va pas s'embarrasser de plan.
(40:06) [toux][raclement de gorge] Je rigole. On éclaircira ça un peu plus tard. Le pourquoi il y a pas de spec
(40:12) dans telle ou telle situation.
(40:18) Moi, j'avais l'impression que c'était par rapport au correctif, mais on a vu qu'il y en a un qui en a qui a un correctif qui a un plan et en théorie,
(40:24) il me semble que à une époque du moins, on avait le on avait spec, plan, travail, review et
(40:34) ensuite on avait même un reflect. réflexe qui est le moment où euh il va
(40:39) évaluer si une mémoire lui a été utile ou non, s'il a eu des conflits, des
(40:46) comment dire des moi ce que j'appelle des frictions en fait dans dans l'interaction avec le système ou avec le
(40:51) projet ou avec d'autres agents par exemple. ce qui m'a fait détecter l'autre jour, ben le problème dont j'ai
(40:57) parlé sur la la C qui se qui en fait était envoyé à chaque fois qu'un agent
(41:04) réalisait du code. Et après, on a cette partie-là qu'on a
(41:09) un petit peu que j'ai un petit peu délaissé, mais dont l'objectif en fait, c'est de
(41:14) permettre ben des personnes non développeur éventuellement d'utiliser l'application
(41:20) avec un rendu relativement similaire à ce que vous pouvez avoir sur Codex par exemple.
(41:26) Voilà. Donc ça c'est une partie que j'ai envie de de travailler
(41:33) mais ça va faire appel à mon avis à des sessions plus poussé quoi.
(41:39) parce que il faut qu'on y réalise des tâches, il faut qu'on qu'on travaille avec en fait pour
(41:46) s'apercevoir des des petits défauts, des petits problèmes et corriger ce qui est rédibitoire, enfin ce qui
(41:52) peut être des rédibitoires pour des utilisateurs quoi. Ici en fait je vis c'est fou parce que
(42:00) de soir de suite on vit exactement le même scénario avec lui. Alors, vous
(42:05) l'avez pas vu hier parce que je l'ai je l'ai fait en off, [grognement] mais j'ai eu la même situation. Au bout de 15
(42:10) minutes, il a généré 64 token sans rien montrer,
(42:17) donc comme s'il s'était rien passé. Du coup, je l'ai coupé et relancé et là, il s'est mis à travailler. Donc là, on va pas le couper, on va pas le relancer, on
(42:22) va le laisser faire. Mais c'est c'est quand même un comportement très curieux.
(42:28) Alors qu'on voit qu'Astra est en train de me faire la même chose qu'hier, c'est-à-dire me lâcher son HTML complet dans le dans le terminal.
(42:35) Voilà, au calme. Grock, il a pas fini
(42:41) et Dipsi qui a pas fini non plus. Tiens, étonnamment, j'ai l'impression que là,
(42:47) on est sur un exercice qui est un peu plus difficile potentiellement
(42:53) que celui d'hier. Pourtant, on dans mon idée, c'est un petit peu pareil. On est sur un
(43:00) un thermomètre de Galilée. Je vais vous montrer à quoi ça ressemble
(43:07) comme on l'a fait hier. Voilà l'idée
(43:13) l'idée du thermomètre de Galilée.
(43:20) Donc on est encore sur un objet physique qu'on essaie de faire reproduire informatiquement
(43:26) mais avec moins enfin en fait avec des des exigences qui sont différentes de des
(43:33) exigences du précédent. Ça fait quand même appel à certaines notions de physique,
(43:40) mais c'est un exercice totalement différent. Donc on va voir le le résultat final
(43:47) proposé par les modèles. Ici notre
(43:54) Fab n'a toujours pas avancé.
(44:05) [soupir][grognement] Et j'ai mis à jour les CLI cette aujourd'hui, mais je vois que on a de
(44:12) nouveau des problèmes de de rafraîchissement de la du terminal.
(44:25) Donc peut-être que ça vient des Cli en eux-même.
(44:31) À voir si ça se reproduit un petit peu dans la
(44:36) journée de demain, je verrai à faire une petite audit de la question. Mais
(44:41) normalement, on n' pas touché à cette partie-là à part l'ajout de la de la partie tarif dans le dans le header de
(44:48) la panne. Donc on dit oui là-dessus, on n pas de
(44:54) de problème.
(45:01) Ouais. Donc lui il a fini. GPT6 Astra, il a fini là. a tout ce qu'il est en train de nous déblatérer.
(45:07) On s'en moque un petit peu parce qu'en réalité le résultat a déjà été terminé dans le dossier. C'est juste que le
(45:15) modèle il
(45:20) [grognement] le modèle en gros nous nous nous p son HTML comme ça dans le
(45:26) un truc mais je pense qu'il y a pas trop d'intérêt quoi pour le coup. Je vais vous montrer un petit peu le résultat.
(45:33) Voilà le résultat final. Donc on voit que depuis tout à l'heure, il y a eu des petites
(45:39) des petites amélioration
(45:45) ou pas, [grognement] je sais pas. Il a fait des choses sympathiques quand même hein.
(45:53) Il y a des choses relativement sympathiques parce qu'on voit l'effet comme si c'était en vert et on voit un petit peu,
(46:00) je sais pas si vous voyez, on voit l'effet grossissement sur le verre. Donc c'est pas mal. Il y a un principe
(46:07) lié à la température
(46:14) et après on a Oh, d'accord. OK. Alors là par contre, il y a quelque
(46:20) chose de particulier. Là, on voit les effets de la lumière. Ça
(46:27) c'est quand même c'est quand même pas mal du tout.
(46:35) Ça a l'air plutôt réaliste, on va dire.
(46:42) Ce que j'aime là en gros
(46:48) c'est qu'on a on a un petit peu de choses en plus. On a notre objet qu'on avait demandé mais on a aussi des effets
(46:53) lumineux. On a une recherche de réalité en fait avec voyez la la comment comme
(47:00) quand vous regardez à travers un verre des fois on voit une déformation un petit peu. Bon alors c'est grossier on
(47:05) est d'accord c'est pas parfaitement le le le les l' les lesffet quoique ça s'en
(47:10) approche quand même sacrément je trouve on voit qu'il y a une certaine physique qui est respecté les objets son s'en
(47:17) pilent se bouscule un petit peu. Je sais pas ce que vous en pensez, moi je trouve ça pas mal. Je trouve que
(47:25) l'exercice est plutôt pas mal là-dessus.
(47:30) [raclement de gorge] Est-ce que on a l'une des deux specs qui a été réalisé ?
(47:37) He alors [grognement] ça il nous l'a fait aussi hier. GPT
(47:43) comme ça, il a été regardé de la doc surtout sur Trigs.
(47:50) C'est particulier parce qu'à priori c'est quand même un modèle qui qui est réputé sur le sur la 3D et tout.
(48:00) Après, est-ce qu'on peut critiquer le fait qu'il aille se documenter ? Non, absolument pas. Je je pense que c'est
(48:06) même conseillé s'il sait pas comment faire autant qu'il aille lire la doc qu'il prenne
(48:11) et qu'il prennent le temps qu'il a besoin pour prendre les infos. Pour nous, l'important c'est que le résultat soit là,
(48:20) c'est que ce soit un petit peu conforme à ce qui est attendu. Alors lui, je je me doutais qu'il y aurait un
(48:26) petit truc comme ça, mais j'en étais pas sûr. Ah, il a quand même OK, autant pour moi. [soupir]
(48:32) Dipsy qui nous a quand même fait le fichier. Voilà à quoi ressemble celui de Dipsic de base.
(48:41) Donc, on va bouger mon overlay. Si je monte la température ou là par contre
(48:47) [rires] il y a il y a il y a un petit truc chez lui hein. Là ça monte direct et puis les
(48:55) unes elles se bloquent. Bon on dirait qu'il a mis plusieurs verres.
(49:00) On dirait qu'il y a des verrs dans les verrs. Ah attendez Fable nous demande la permission de
(49:06) faire quelque chose. Qu'est-ce qu'il veut faire ?
(49:23) Mais non, en fait.
(49:30) Oh, c'est pénible ça.
(49:36) Non, interdit. Tu dois rester dans ton fichier, dans ton dossier.
(49:55) Je mets un petit truc un peu sarcastique. Riolo, mais j'ai pas apprécié que il veuille aller regarder
(50:00) ce qu'il avait dans le Ouais, ici tu peux. Ouais, vas-y.
(50:07) Là, en fait, ce qui vous a si vous avez pas compris, le fait qu'il s'arrête ici là quand il faisait sa question, c'est
(50:13) dire qu'en fait, il aurait pu regarder et s'apercevoir en fait qu'il y avait d'autres dossiers et potentiellement derrière aller regarder ce qu'il y avait
(50:19) dans les dossiers et cetera et cetera. Et donc c'est pour ça que je l'ai mis dans des permissions spécifiques pour
(50:25) que il soit obligé de demander si
(50:32) s'il lui prenait l'envie d'aller de vouloir les observer. Après là-dessus, [grognement] attention, c'est pareil, on
(50:38) peut se dire "Ah mais il veut tricher, non, pas du tout." C'est qu'en fait le modèle, il a été appris d'une certa de travailler d'une certaine façon et
(50:44) notamment de regarder l'existant avant d'aller mettre des fichiers de partout. Donc là,
(50:50) lui, ce qui l'intéresse, c'est de savoir si ce que je lui ai donné, c'est son objectif ou si ce que je lui ai donné,
(50:56) c'est euh qu'une partie et qu'il en a une autre partie à quelque part. Voilà, donc là, il fait un peu l'inventaire
(51:05) mais pour le coup, il est il est il est lent. Euh là, on est quand même sur une lenteur assez énervée, quoi.
(51:15) Il a quand même 20 23 minutes pour poser une question de savoir s'il pouvait regarder ailleurs quoi.
(51:21) Une minute, c'est euh waouh
(51:28) waouh waouh waouh. Donc psy a fini, lui il est toujours pas
(51:33) dans le moindre début de quoi que ce soit. Grock euh on voit qu'il est en train de prendre ses captures, donc il
(51:39) est en train de vérifier son travail. En gros, ici lui 20 minutes, il a toujours rien
(51:45) fait. Voilà, on est quand même sur quelque chose de magnifique.
(51:51) Et Astral est en train de fignoler son plan. Voilà. Donc en gros, je vais pouvoir lancer Dipsic potentiellement
(51:58) sur le travail de Qu'est-ce qu'il a lui ? [grognement]
(52:29) Je suis en train de m'interroger sur une chose. Où c'est qu'il est en train de regarder
(52:34) là ? en train de faire des choses qui sont pas tous
(52:40) sur mon
(52:46) sur mon dossier.
(52:58) Je m'excuse, je prends un petit peu de temps mais c'est important parce que si
(53:03) en fait ça fosse le résultat, c'est pas la peine de continuer.
(53:10) En fait, ça m'inquiète un peu parce que je vois qu'il il va dans des fichiers euh
(53:20) en fait, c'est un dossier qui est qui est qui est partagé sur le PC, quoi.
(53:26) Donc à partir du moment où euh
(53:42) Mais c'est lui qui l'a fait ce fichier. C'est bizarre qu'il demande d'avoir un fichier si c'est pas lui qui l'a fait.
(53:56) final capture où il se restaore
(54:10) là, vu que je comprends pas en fait euh j'ai besoin qu'il m'explique, j'ai besoin qu'il me disent
(54:19) donc est-ce que je peux écrire là ou pas ?
(54:53) OK. Bon, pour le coup, je me suis inquiété un petit peu pour rien, mais je préfère être inquiet pour rien [grognement] plutôt que
(55:00) que m'apercevoir après qu'il a triché en fait. OK, donc là on a son résultat Grock.
(55:08) Je je vais le relancer. Voilà. Donc
(55:16) là, on peut voir quand même qu'on a trois euh modèles et on a trois résultats.
(55:22) Il y a pas photo. Tous ont respecté un minimum les règles. Il y a pas de problème.
(55:31) Oui. Donc la lumière c'est c'est une des c'est une des règles.
(55:38) On voit qu'ils l'ont tous faitin. C'est pas juste par contre sil y a une certaine finesse
(55:44) dans le dans l'exécution. Je sais pas si vous voyez mais en gros lui il fait il fait bouger la lumière autour de l'objet
(55:51) alors que Astra on bougeait l'objet on bougeait en même temps que l'objet et du coup on arrivait à la lumière.
(55:59) La différence ici c'est comme si on avait une lampe qu'on agite à droite à gauche. Il y a pas vraiment de logique
(56:06) en plus si elle tourne sur elle-même. Ouais. OK. Bon,
(56:14) visuellement, j'aime pas du tout. Après, il y a il y a des on voit des choses qui respectent le quand on voyait le vert.
(56:21) Voyez comment c'est quand ils arrivent sur les bords, le flou qui se crée, ça étire l'image.
(56:30) On voit que quand les quand les petits poissons ils se touchent là, hop, on voit que ça fait un
(56:36) effet physique et c'est le vrai effet. C'est le vrai effet, ça simule vraiment
(56:41) un vrai effet pour le coup là-dessus.
(56:47) J'aime bien. J'aime bien. C'est pas parfait mais j'aime bien. J'aime bien ce qu'il nous a fait le petit Crooc.
(56:54) Juste pour le pour le côté rigolo. Ah voilà. Bon pour certains, on va quand
(57:00) même avoir le problème. C'est pas grave. OK.
(57:06) Donc ici on a le résultat pour un Astra. le résultat qui nous a fait globalement
(57:14) ça nous a coûté en gros 3 € quoi. Voilà, ce qui est pas excessif pour le résultat
(57:20) obtenu. Ça y est. Alléluia.
(57:25) Notre notre ami s'est mis au travail. Lui ici,
(57:33) [raclement de gorge] ça nous dit quoi ? Il a fini, il a pas fini ? Je comprends pas.
(57:39) Il s'est arrêté si
(57:48) OK. Structure numérique. OK. Qu'est-ce qu'il a fable ?
(57:56) Il veut se mettre à rename le le la [grognement] pagne. Lui, il a rien
(58:03) commencé du tout, qu'il est déjà en train de bon. Alors, c'est bien, il respecte les règles du
(58:11) il respecte les règles du logiciel. Mais bon, là, on est quand même à 25 minutes
(58:17) 124 token, il y a pas il y a rien qui est sorti quoi.
(58:26) Peut-être un petit P1, je sais pas. [grognement] On va voir. On va voir. Mais c'est extrêmement long.
(58:32) Après, je je critique mais j'adore Claudin. Je vais pas
(58:39) ne ne [raclement de gorge] me prenez pas pour un amoureux de GPT ou de Grock qui qui fusil Claude en permanence. Non,
(58:45) Clod j'adore, j'utilise au quotidien. Mais fables euh en X là, on peut voir
(58:52) que c'est bah je sais pas mais si démarre comme ça juste pour réaliser un
(58:59) petit truc caca ou ou faire un plan si met 3h comme ça je sais pas si vous vous
(59:05) rendez compte mais le moment où vous voulez réaliser une vraie fiture où vous avez besoin d'aller un petit peu vite là
(59:12) c'est c'est démentiel si à chaque prom que vous envoyez le le modèle il met il met 3 he comme
(59:19) Lui, il veut quoi ? Oui oui, bien sûr. Utiliser Pit. Ouais.
(59:26) H donc là vous voyez ça c'est ça ça par contre c'est c'est cl en action quoi. Il
(59:33) y en a aucun autre qui m'a ouvert le navigateur. Lui il vient de m'ouvrir le navigateur de dev là. C'est ce qu'il a
(59:39) c'est la question qu'il a posé avec Playwght. et il va du coup euh ben regarder ce qui
(59:46) se produit euh dans son développement quoi.
(1:00:00) Voilà. Là, il a compris que le port qu'il voulait utiliser c'était pas le bon que du moins il était utilisé actuellement.
(1:00:07) Donc il va mettre ça sur un autre port.
(1:00:18) Miss erreur le favicon. Ouais, bon favicon, on s'en moque un petit peu. Waouh ! Bah là, je suis
(1:00:27) je suis très légèrement déçu [rires] mais vous allez voir le résultat.
(1:00:33) [grognement] En fait, c'est comme tout, c'est il y a du bon mais il y a il y a il y en a il y
(1:00:40) en a à laisser dans le lot quoi. Et là, on va pouvoir voir que on va voir
(1:00:45) d'ailleurs si si s'il voit ses erreurs, s'il voit qu'il y a quelque chose qui va
(1:00:50) pas. J'ai montrer très rapidement mais ça
(1:00:55) c'est le résultat actuel de Fable.
(1:01:01) Voilà. Alors ouais, il y a une il y a une
(1:01:07) certaine idée de la physique, mais il y a aussi une certaine idée du
(1:01:12) n'importe quoi, quoi. [rires] Ils ont tous réussi hein, pour le coup.
(1:01:17) Il y a il y en a pas une qui s'est qui s'est trompé sur l'exercice. Donc si lui
(1:01:22) il arrive pas à voir qu'il a fait des bêtis là, qu'il faut les corriger,
(1:01:31) c'est problématique. Mais on va voir. En attendant, on en a un autre ici qui nous
(1:01:40) qui nous pose une question.
(1:01:50) [grognement] Oui, vas-y.
(1:02:09) Oui. OK. Donc là, vous voyez un mode sans bypass
(1:02:15) permission, d'accord ? Donc il a pas le droit de tout faire là. Là, en fait, à chaque fois qu'il veut faire une action,
(1:02:20) c'est même pas il a pas le droit de le faire ou quoi. C'est à chaque fois qu'il essaie de faire l'action, c'est son
(1:02:26) c'est sa c'est c'est sa box autour qui lui interdit. Ça nous envoie à nous l'autorisation et tant qu'il y a pas
(1:02:32) l'autorisation, la commande ne part pas. Mais effectivement pour lui c'est extrêmement contraignant quoi.
(1:02:38) C'est clair que ils apprécient que moyennement le [rires] le le
(1:02:46) serrage de vis quoi. Bien.
(1:02:52) Est-ce que
(1:02:58) on utilise donc là ? Pardon là il a fini la spec.
(1:03:03) On peut voir pour le coup là, ça y est, on a un coût clair et parfaitement
(1:03:09) 7,28. Voilà 7,28 € pour 30 minutes.
(1:03:15) Voilà 30 minutes pour sortir une spec
(1:03:22) et c'est pas ce qu'il a travaillé sur le problème très clairement.
(1:03:27) Euh il a commencé la première, je crois qu'il s'était passé 20 minutes. Donc il a travaillé 9 minutes a priori sur notre
(1:03:34) problème. Pourtant on a attendu. Voilà. Bon heureusement qu'on pe pas à
(1:03:40) l'attente. Hm. Tout va bien de ce côté-là. [grognement]
(1:03:45) Et lui du coup et on était à 3. OK. Bon, donc a priori
(1:03:52) là, si je comprends bien, on a nos specs quelque part par là. Bench template
(1:04:00) thermomètre de Galitle. Oui, on l'a. Donc c'est très simple. Astra
(1:04:08) euh tu dois rendre ton
(1:04:14) Je vais l'ajouter parce j'ai pas envie de faire du copiercollé. Ton résultat dans un fiche.
(1:04:22) index html et pas dans le chat
(1:04:31) et on lui colle direct le le prom là. J'ai bien pris le Astra. J'ai bien pris le Astra. Je suis bien dans le dossier
(1:04:37) de Astra. Ici je lui balance le compte. OK, on est bon.
(1:04:44) On est bon. Donc là, il va read. Et là, ça nous
(1:04:49) demande la permission. Est-ce que j'ai le droit d'aller regarder le fichier là qui est placé là-bas ? J'ai vraiment le
(1:04:56) droit ?
(1:05:05) Ben, je préférerais pas. Mais bah si parce que là il est dans le dossier du
(1:05:11) coup pas de risque. OK. Ensuite, on va prendre ça.
(1:05:20) On va le recoller là. On va reculer d'un cran. On va se mettre dans l'autre et on va lui envoyer ça à
(1:05:27) lui. Voilà.
(1:05:34) Lui pareil, on l'autorise à aller fouiller dans ce dossier et chercher ce fichier là.
(1:05:45) Et là, vous voyez le la différence de contrainte quand je les envoie moi d'habitude, il pose pas de question. Il
(1:05:51) y a pas de question. Non, pas parce qu'ils ont pas envie d'en poser, c'est parce que le CLI les autorises vu qu'ils sont en bypass permission, ils ont le
(1:05:57) droit de faire n'importe quelle action. Mais là, si je les laisse avec le même état d'esprit, [souffle coupé]
(1:06:02) ben en fait, on n'est pas certain qu'il y en a pas un à un moment donné qui va dire "Oh tiens, il y a un dossier là-bas, il s'appelle étrangement pareil
(1:06:09) que la tâche qui m'est demandé. Allons voir ce qu'il y a à l'intérieur et qu'il aille pas copier en fait le travail qui
(1:06:14) a été fait par un autre. [soupir]
(1:06:21) Donc ça, on l'a déjà vu. Qu'est-ce qu'il fait encore lui en fait ? Ah, c'est juste le serveur qui est encore lancé.
(1:06:29) Voilà. Et là, on peut enfin voir le le coût de la session Grock.
(1:06:34) Donc là-dessus, Grock nous a coûté 2,28 € sur cette tâche.
(1:06:40) Astra, on a dit, il nous a coûté 3 3 € quoi.
(1:06:47) Fable pour changer nous a coûté 10 €.
(1:06:53) Il a toujours pas fini son histoire en plus.
(1:06:58) et ça repose des questions toutes les 15 secondes
(1:07:06) [raclement de gorge] et a priori fait des modifications. Bon, il a modifié un icône, je suis pas sûr que ce soit ça qu'on voulait.
(1:07:13) Il a aussi modifié des d'autres choses. Est-ce que le résultat sera au rendez-vous ?
(1:07:19) On va voir. J'ai l'impression que ça s'amélioré par rapport à ce que je vous ai montré tout à l'heure.
(1:07:27) On voit un peu plus des formes de boules se dessiner mais ça reste encore très flou et très étiré sur les côtés. Bon,
(1:07:34) je vous montre le résultat quand c'est fini. Et là, on va voir comment ces deux ils se débrouillent avec l'aspect donné
(1:07:41) par l'un ou par l'autre. On voit que celui de l'aspect de fable, il [grognement] est tout de suite au
(1:07:47) travail. Il est tout de suite au travail avec du
(1:07:55) avec du test puisquon des screenshot code. OK.
(1:08:06) OK. Moi ce qui m'intéresse c'est surtout la différence de coûts. On voit qu'ici en
(1:08:13) implémentation plus enfin en en le fait d'avoir le prompt de base et de prédire
(1:08:18) ses propres actions et cetera, on voit qu'il était à 12 centimes [toux] le le dipic. On va voir si avec les
(1:08:27) specs des autres, il est il est à quelque chose de mieux. Et je voulais ajouter un petit peu de piquant là
(1:08:32) pendant que ce travail au+ 5.
(1:08:38) C'est parti. Résultat thermomètre de Galilé au+ 5. Voilà. Sans ça, s'il te
(1:08:46) plaît. Tac tac tac tac tac. On supprime ça
(1:08:51) aussi. Et on fait modèle. On prend opus
(1:08:58) en height. Oui, opus, je vois pas trop d'intérêt
(1:09:04) d'aller au-delà du height. En plus, on peut voir là uniquement sur
(1:09:09) les deux fables, hein. Euh, j'ai quand même éclaté 10 15 %
(1:09:16) d'une d'une fenêtre de 5h et tenez-vous bien 4 % de mon forfait
(1:09:22) hebdomadaire. OK. 4 % de mon forfait hebdomadaire
(1:09:30) et l'autre il est encore en train de prendre des images. [rires] Donc euh bon
(1:09:38) ces modèles là, les fables euh GPT6 Astra et tout, enfin
(1:09:44) GPT6 Astra, c'est difficile de vous dire de pas utiliser GPT6 Astra. Euh, j'en suis tout à fait conscient parce que un
(1:09:50) sol pour moi faire du code par exemple, c'est assez chaotique.
(1:10:02) Du coup, je voulais lancer mon opus sur la même tâche de départ que les deux autres, mais ça m'a un petit peu le
(1:10:09) refroidi. [grognement] Euh, c'est pas grave, on va le faire quand même. On est curieux. On
(1:10:16) veut voir ce que ça peut donner. Euh hop ! Tu peux tu peux arrêter de me faire ce
(1:10:22) truc avec la fenêtre là qui me gêne beaucoup. [soupir] On est dans Opus 5, on lance. Donc ça ce sera opus 5 tout
(1:10:29) seul de base. Et comme ça on va voir la différence de coût et de qualité entre Opus et GPT6
(1:10:37) Astra enfin et pardon et Fable. Et pour que ce soit équitable bien sûr, on va
(1:10:44) faire un petit GPT. H
(1:10:49) 5. Sol qui était quand même le le best modèle avant Astra quoi.
(1:10:57) On n quand même pas sur le dernier des des trucs à jeter quoi.
(1:11:06) Open en sboxer sans le MCP. Je tutorise à
(1:11:11) traer là-dedans. Et là on fait modèle. Hop.
(1:11:18) Hop, on fait pareil, on le met en he d'accord
(1:11:24) différence entre Opus ou GPT5.6 sol, mais une différence avec les les les
(1:11:31) meilleurs modèles de chaque entité. D'accord ? Eux, on les a lancé en mixite, eux, on les lance en he
(1:11:41) on dirait peut-être que je fais une bêtise. Peut-être qu'il faut pas euh différencier, mais pour moi, très
(1:11:47) honnêtement, sur un rendu design he x ou du max,
(1:11:55) vous allez voir une énorme différence de coût. Par contre, vous verrez pas une énorme différence en one shot sur des
(1:12:01) tâches. Ben moi je je l'ai je l'ai pas vu. Je l'ai testé comme tout le monde he au début. J'ai j'ai essayé de les lancer
(1:12:08) ces modes he max et cetera. Ce que je vois c'est que le travail est
(1:12:15) deux fois plus long. Euh souvent la qualité est identique. Je
(1:12:20) vais pas le je vais pas vous dire le contraire parce moi je l'ai pas vécu comme ça.
(1:12:27) Et et le rendu sur une page web ou sur une application et tout c'est hyper
(1:12:33) subjectif. Euh très honnêtement, c'est difficile pour moi de dire aujourd'hui
(1:12:38) "Ah oui, ça c'est le truc le plus beau". Oui, ça me moi personnellement ça me
(1:12:44) touche ou c'est dans mes affinités, j'aime bien cette façon de faire les choses par exemple. Mais aller dire
(1:12:50) "Oui, ça c'est magnifique, c'est le truc le plus beau comparé à ce qu'a fait l'autre, c'est bon, c'est très
(1:12:56) subjectif. Certains vont aimer ce que fait Fable, certains vont aimer ce que fait Astra là-dessus. J'ai pas
(1:13:04) grand-chose à dire. Je pense très clairement que ils ont tous deux leur place.
(1:13:11) Ça y est, Dipsy via la la spec de fable a terminé.
(1:13:20) Donc là, ce soir, voyez, je vous fais la totale. Je on fait vraiment le
(1:13:25) on les fait travailler et on les on les regarde ensemble. Le
(1:13:31) Waouh ! OK
(1:13:37) OK. Waouh, c'est fou.
(1:13:43) C'est fou parce que vous voyez le problème qu'il y avait dans Fable tout à l'heure, bah on le retrouve ici en fait.
(1:13:51) On retrouve dans l'aspect la problématique qu'on a vu sur le le truc
(1:13:58) généré par le modèle en lui-même. [grognement] Donc ça veut dire qu'il a encodé le le
(1:14:03) problème que je vois de l'autre côté là, il l'a encodé dans le dans la spec, ce qui fait que l'autre l'a reproduit.
(1:14:14) On voit pas que le problème qu'on avait sur le dipsi tout à l'heure, il a disparu. Là, il y a une certaine logique à la
(1:14:21) vitesse de de monté ou de descente, [soupir] il y a un aspect
(1:14:27) ou alors là par contre la lumière.
(1:14:34) Ah, c'est intéressant, hein ? C'est intéressant parce que d'une tâche à l'autre aujourd'hui, on est en train
(1:14:39) de s'apercevoir qu'on a pas du tout les mêmes résultats. Enfin, ça conforte une chose, c'est que
(1:14:46) hier, on a vu que une une excellente spec, elle donne à deux modèles
(1:14:52) différents avec la même spec un résultat identique. Et là, on peut voir que un
(1:14:57) modèle qui avait lui-même qui au moment de la réalisation en fait
(1:15:03) a eu un petit problème de à des a à un problème de réalisation,
(1:15:10) ben derrière en réalité il va euh potentiellement introduire ce problème dans l'aspect. Et du coup, on va se
(1:15:17) retrouver avec un gros modèle qui a fait une super spec pour un petit modèle qui en au final va reproduire les les les
(1:15:24) bug puisqu'il suit l'aspect lui. D'accord ? Là, on peut pas reprocher à Dips la manière dont il a codé le truc
(1:15:30) puisque lui il suit explicitement ce que l'autre a dicté. Voyez ? Est-ce que sur sur Astra il a
(1:15:37) terminé ? Sur Astra, il est plus long déjà.
(1:15:42) En terme de coût, on reste très très peu élevé quand même. On est sur 4 centimes.
(1:15:49) [grognement] On est sur 4 centimes quoi.
(1:15:54) Et là, la règle, elle a été respectée. Hier, j'avais pas dit d'éditer dans un fichier HTML et le modèle m'a m'a
(1:16:01) imprimé son HTML de de 3000 lignes dans la dans le terminal. Il a fallu que je
(1:16:07) remonte à la molette de la souris pour aller chercher le début de la conversation. et pouvoir mettre ça dans un fichier
(1:16:13) HTML et le lancer sur le PC quoi. C'est quand même plus simple quand ils suivent la ben quand on leur donne la bonne
(1:16:19) règle et qu'il la suivent. J'adore qu'on va l'appeler ça Galileo.
(1:16:31) Oui. Grock. On l'a vu. Lui, il a pas l'air d'avoir terminé encore.
(1:16:37) Il continue. Opus, il a même pas commencé quoi.
(1:16:46) [grognement] est dingue quand même parce que habituellement j'ai pas ce problème là
(1:16:53) dans quand je pose des questions classique sur euh
(1:17:01) est-ce que c'est inhérent à la taille du prompt
(1:17:07) ce qu'on lui a demandé éventuellement je sais pas mais c'est quand même très curieux parce que là on voit que bah
(1:17:14) typiquement le modèle il continue enfin il est en train de travailler Certes, mais enfin il est en train de
(1:17:19) travailler. Il a reçu l'instruction et a priori il va il va travailler dessus. Mais euh
(1:17:35) ouais. Bon, ces deuxl ils ont fini. Ben oui, de toute façon, on a lancé les deux autres, donc c'est logique, ils avaient fini.
(1:17:42) [grognement] Là aujourd'hui il travaille plus lui
(1:17:48) qu'il a terminé mais j'ai l'impression que seul aussi hein.
(1:17:54) Bon là-dessus pour le coup il y aura pas photo hein. Effectivement sol beaucoup
(1:18:00) plus rapide quoi là sur le sur l'exercice quoi.
(1:18:07) [raclement de gorge] Faut voir le résultat. Mais bon,
(1:18:15) sol. Ouf !
(1:18:20) Alors par contre ou [rires] ça fait mal aux yeux,
(1:18:29) j'ai l'impression quand même. Il y a un petit truc là. Vous me direz pas le contas. C'est même pas au niveau dips
(1:18:35) psique, j'ai l'impression. Vous rendez compte quand même ou pas ?
(1:18:43) Waouh ! Ouais, je suis choqué. [grognement]
(1:18:50) La lumière est à peu près bien respectée.
(1:18:58) Voyez là, on est en train en plein en train de visualiser un problème qui
(1:19:03) [toux] qui sera probablement pas résolu par les
(1:19:08) LLM aujourd'hui, même si on essaie de nous faire croire que si.
(1:19:14) et que et qu'en fait on arrive à donner l'illusion qui passe au-delà de ces problèmes là. Mais en fait là il le
(1:19:21) modèle il il construit quelque chose dont il a même pas idée de de de l'effet
(1:19:27) de du visuel réel qu'il a le truc. il il fait via des descriptions qu'il a dans sa mémoire ou qu'il a été chopé sur
(1:19:34) internet d'une
(1:19:41) pardon d'éléments physiques qui se produisent dans la réalité mais on voit tout de suite que bon il y a un problème
(1:19:50) au-delà du fait qu'il a pas stylisé parce que bon les gardes en elle-même on
(1:19:55) lui on lui a pas forcément demandé Euh puis c'est c'est subjectif quoi. Bon
(1:20:03) voilà donc on se le met de côté.
(1:20:10) Mais j'ai pété sol. Ouais, pas pas topissime. Par contre, en terme de coup, vous avez vu quoi ?
(1:20:17) Ça a coûté 63 centimes quoi. Alors, me direz-vous, on est on est on
(1:20:23) est quand même bien au-delà de de Dieck, on va pas se tout cacher.
(1:20:30) Lui, il continue avec Playwright tant qu'il peut là. J'ai pas l'impression que son truc s'améliore. Je sais pas ce
(1:20:37) qu'il fait. Je sais pas ce qu'il fait.
(1:20:51) Après pour un exercice comme ça, on aurait pu faire d'abord il crée le truc puis ensuite il crée l'aspect. Mais là,
(1:20:57) on est carrément en triche quoi.
(1:21:03) Moi, mon objectif c'est de vous montrer que dans certains cas, juste via l'aspect, il arrive à imprimer en gros
(1:21:10) suffisamment d'éléments dans sa spect pour faire en sorte que le petit modèle derrière respecte beaucoup
(1:21:17) mieux les règles. [grognement] D'ailleurs là, on va se faire un petit plaisir. vu qu'il a été ultra rapide le
(1:21:24) sol, on va le prendre ici
(1:21:29) et on va faire un petit spec Astra. Voilà. Donc en gros là, on va choper
(1:21:37) l'aspect d'Astra, on va le balancer sur lui et euh
(1:21:44) et on va voir ce que ça donne. On va voir s'il a réussi à infuser euh
(1:21:50) suffisamment son prompt Astra pour que sol soit suffisamment bon.
(1:22:02) Ça me met le doute de le mettre en X mais bon on verra ça la prochaine fois.
(1:22:09) On fera ça au prochain. Où c'est que je l'ai là ? Spect de Astra. Je l'ai là.
(1:22:17) H [raclement de gorge] là
(1:22:25) Spectast Astra. Voilà. Si on n pas vraiment fini cette partie
(1:22:31) làà, on reprendra là-dessus la prochaine fois et cetera et cetera. On peut faire des des moment glissant. De toute façon,
(1:22:37) les fichiers je les conserve. Je vais les conserver
(1:22:42) et j'aimerais potentiellement là euh ce que je pense qui pourrait être sympa,
(1:22:48) c'est de générer une application pour conserver tous ces résultats et tout. et
(1:22:53) ça me donnerait l'occasion de vous montrer bah le onboarding d'une application. Voilà comment quand j'ai
(1:23:00) une super idée d'application que je suis persuadé que ça va être génial, comment je comment je je fais en sorte que mes
(1:23:08) agents, ils me préparent tout ce qui est nécessaire pour débuter et comment je débute un projet. Voilà.
(1:23:17) Euh je pense ça peut être intéressant comme ça de temps en temps de de montrer des choses bien particulières qui
(1:23:22) peuvent à vous vous aider éventuellement. Ben voilà, j'ai une idée mais ça fait longtemps que j'ai envie de de tenter de faire traer un agent dessus
(1:23:29) mais je sais pas par où commencer. Moi aussi à une période de ma vie sur tout un tas de trucs, je me dis "Ah,
(1:23:34) j'aimerais bien faire ça mais finalement jamais je m'y suis engagé."
(1:23:41) Et des fois un petit truc, un petit déclic, j'ai vu ça chez quelqu'un ou un ami m'a parlé de quelque chose et hop,
(1:23:47) ça m'a donné envie de d'aller plus loin.
(1:23:52) Il veut quoi lui ?
(1:23:59) Mais en fait, tu es pas censé euh Ouais. Bon, allez, vas-y, c'est bon. Liste tes fichiers là.
(1:24:05) Donc vous voyez là, on a le comportement identique entre Opus et Fable.
(1:24:14) les deux ont cherché à regarder dans le dossier d'abord avant d'y d'y coder quoi.
(1:24:22) Et donc c'est un là c'est un comportement qui est induit par le provider et pas par le
(1:24:30) modèle en lui-même. On le sent tout de suite. [grognement]
(1:24:36) Ah ben génial là ça part carrément écran quoi. magnifique.
(1:24:42) Je sûr que c'est ce merdier là, en ce bandeau là qui fait que du coup on a la
(1:24:47) panne qui part à l'autre bout.
(1:24:54) Wouh ! C'était particulier là ce qui vient de se passer. Ah c'est parce que d'accord. OK, c'est l'agrandissement.
(1:25:02) Ouh là, ça c'est un problème. Ça c'est un problème. Et du coup qui dit
(1:25:07) problème dit solution. Euh
(1:25:16) non mais tu me par en bypass et tout et tout. Là on est on est bon. On est revenu sur notre état de
(1:25:24) Ah ouais. Ah ouais. Non, c'était c'était original ça. [soupir]
(1:25:30) Euh et on va lui dire lorsqu'on a grandi une panne
(1:25:37) via le l'étirement qu'on a mis en bas à droite et sur les côtés
(1:25:43) et qu'ensuite on passe en plein écran, et bien le resize ne se fait pas avant.
(1:25:50) Donc en gros, la panne devient plus grande que l'application elle-même
(1:25:55) et donc elle part dans le l'overflowiden.
(1:26:01) Tu peux regarder ça s'il te plaît et le corriger.
(1:26:07) Voilà. Pour un humain, c'est pas très clair mais je pense que pour la machine ça le sera.
(1:26:15) Revenons à ce qu'on vient de lancer. Euh voilà, j'avais lancé ça.
(1:26:23) [grognement] Tac. C'est pénible le ce le C qui quand on
(1:26:30) switch de page se réécrit pas correctement.
(1:26:40) Oui, parce que un terminal en gros ça fonctionne de la manière suivante, c'est qu'à chaque fois il y a une nouvelle ligne, ça ne fait pas qu'ajouter la
(1:26:46) nouvelle ligne en fait, ça réécrit. le contenu que vous voyez à l'écran. Du coup, en fait, en fonction de la de de
(1:26:54) la vitesse de refr et cetera et cetera, bah certaines fois en fait le changement
(1:26:59) de de taille de la panne et cetera, ça ça peut générer ce type de problème là.
(1:27:07) Donc là, c'est tout nouveau, hein. J'avais pas ça cet après-midi. Je sais pas si c'est lié à cette partie
(1:27:13) également là qui s'affiche en haut. Mais vous voyez là, voilà, c'est comme
(1:27:19) si on était zoomé d'un coup, enfin c'est comme si on avait le nombre de lignes qui avait changé.
(1:27:25) Voilà. Du coup, on a l'impression que c'est dégoûtant.
(1:27:32) Là, ça fonctionne. Là, ça fonctionne plus. Voyez, c'est pas instantané. Au début, c'était bien.
(1:27:39) Ouais, il y a il y a quelque chose sur la refresh de la panne. [grognement] OK, on regardera ça plus en
(1:27:45) détail demain. Là, on a lancé pas mal de choses. J'aimerais voir ce que ce que va donner le résultat
(1:27:52) ici. Et Fab, il a fini là. Wou, ça commence à devenir trop long là, mon pote. Il faut que tu arrêtes avec
(1:27:58) Playht.
(1:28:04) Il faut que tu arrêtes avec Playwright. [toux][raclement de gorge] Le cliché est arrivé plusieurs secondes
(1:28:11) après le reset.
(1:28:19) [rires] Je trouve ça stupéfiant stupéfiant le le temps que que le modèle
(1:28:26) va avoir pris
(1:28:32) comparé à Dipsy par exemple.
(1:28:38) On est sur une folie furieuse. Astra. OK, il la vie lui aussi.
(1:28:49) Euh ben tiens, le dipsic du coup le le le dipsy de Astra a terminé. On va
(1:28:57) pouvoir aller voir le résultat que ça donne.
(1:29:03) Dipsy de Astra. Où est-ce qu'il s'est ouvert ? Il s'est ouvert là. Waouh ! Alors
(1:29:12) waouh ! On a celui de fable ici
(1:29:20) quand même. D'accord. Et on a celui d'Astra là.
(1:29:29) Voilà. Et là il y a pas de triche. Le dipsy il est lancé en max. Juste avec la
(1:29:35) spec. D'accord. Il y a pas de Et on sent tout de suite l'influence en
(1:29:43) fait du modèle original. C'est fou parce que je vais vous remettre quand même le Ah et Claude est
(1:29:49) encore en train de me poser des questions. Alors promis, ce weekend, je vais
(1:29:54) travailler sur le le S boxing et je vais faire une architecture, un petit truc là
(1:30:00) qui va me permettre de gérer ça mieux parce qu'à prouver à chaque fois qu'il veut utiliser Playwright, je pense qu'il
(1:30:06) y a mieux à faire. Je pense qu'on peut arriver éventuellement à faire un
(1:30:11) mode benchmark dans l'application qui ferait qu'en fait je clique juste sur cette permission dès le départ et ça lui
(1:30:17) autorise à utiliser Playbright, ça lui autorise à utiliser tout ce qu'il veut mais dans le cadre de son dossier et
(1:30:24) peut-être éviter de passer par tous ces ce système là qui est vraiment juste
(1:30:33) on va essayer de l'automode voir si si ça le développe. Si ça le débloque
(1:30:41) parce que là le modèle permission comme ça c'est juste insupportable.
(1:30:46) C'est juste insupportable. Puis du coup le modèle met un temps fou.
(1:30:51) Allez
(1:31:03) voilà. Et ben lui, il a fini aussi. Pardon euh
(1:31:10) j'étais en train de passer à autre chose mais je veux pas passer à autre chose. Je veux vous montrer le résultat obtenu.
(1:31:18) [grognement] Je vais vous montrer le résultat d'Astra et des petits modèles qu'on travaille
(1:31:24) avec le truc d'Astra. Je pense c'est important. Ça c'est celui d'Astra.
(1:31:30) Et on voit là-dessus que il a réussi à infuser certaines choses au petit modèles.
(1:31:37) Voyez comment c'est soft là. C'est soft. Il y a un petit truc sympa.
(1:31:43) Ça descend doucement. Hop, il se replace un petit peu. Bon,
(1:31:49) donc la physique n'est pas parfaite dans tous les sens, mais
(1:31:57) on a l'impression qu'on tourne en même temps que le bocal là cette fois. Ça fait cet effet un peu bizarre. Et on
(1:32:03) le retrouve ici. Voyez ?
(1:32:09) Hop. Alors, ça c'est la température, pardon. Voyez, on tourne avec le bocalin ou ou
(1:32:17) plutôt le bocal tourne mais la source de lumière reste placé au même endroit elle. Enfin, c'est peut-être une
(1:32:24) impression que j'ai par rapport aux autres mais je sais pas là. Clairement le le design il est bien fait, c'est
(1:32:32) joli. Ici, on retrouve une partie quand même de l'influence
(1:32:38) du modèle, je trouve. Et là par contre, [rires] c'est juste insupportable. [soupir]
(1:32:47) Alors c'est waouh, c'est moche. Non, pour le coup, je disais n'importe quoi.
(1:32:52) On a la même le même effet de truc qui tourne. J'ai totalement halluciné. Je sais pas
(1:32:57) pourquoi ça me fait cet effet là, mais OK, tout va bien. J'ai pété sol via
(1:33:05) J'ai pété sol tout seul et maintenant j'ai pété sol via [raclement de gorge] Astra.
(1:33:10) D'accord.
(1:33:18) On est d'accord ? Hm, on est d'accord. Il y a il y a il y a il
(1:33:23) y a quelque chose là. Là, pour le coup, on voit que c'est pas la même chose. Voyez, hier l'exercice
(1:33:30) était assez simple avec le sable. Je pense que en gros il y avait pas assez d'inter
(1:33:37) d'interprétation laissée au modèle pour qu'on voit la différence entre dipsy et Grock pour le coup. Mais là,
(1:33:45) je suis désolé, forcé de constater. Là, on a Dipsy.
(1:33:51) Là, on a euh GPT sol avec l'aspect d'Astra. 5.6 avec l'aspect d'Astra.
(1:33:57) Et on voit tout de suite, on voit la pâte de l'un.
(1:34:03) dans le travail final. On voit même. mais c'est fou d'ailleurs.
(1:34:09) Ça clignote un peu là. Et on a le même effet là avec le divic.
(1:34:16) Non, si on a le même effet clotant avec le dips
(1:34:24) mais c'est fou comment là le le le cylindre et tout, le côté en bas là.
(1:34:32) Ils ont vraiment le même W Astra, c'est quand même plus Ouais,
(1:34:37) c'est quand même plus joli. OK
(1:34:46) [rires] là là vous là vous pouvez pas dire d'accord au début j'ai hésité à lancer
(1:34:53) le GPT sol en X pas fait je l'ai laissé en he là il est en he avec sa propre
(1:34:59) interprétation du front initial d'accord et on voit tout de suite la méga
(1:35:04) différence quand même ils ont la même capacité de réflexion les deux
(1:35:09) ok il y Là, les deux sont en he c'est le même modèle.
(1:35:15) La seule chose qui change, l'aspect. D'accord ? Donc là, c'est Astra qui a
(1:35:20) fait l'aspect. Et on voit que sur les deux modèles, que ce soit sur Dipsic ou que ce soit sur GPT6,
(1:35:28) le résultat est fou quoi. Est fou.
(1:35:33) Et je j'aimerais bien quand même à un moment donné. Ouf ! Alléluia !
(1:35:39) euh opus enfin pardon Fable a fini. Ça c'est le résultat de Fable, le
(1:35:45) résultat final. Voilà. Bon,
(1:35:54) que dire ? Que dire que dire ? En fait, c'est dommage parce que quand ça se
(1:36:01) déplace un peu, on voit ça pourrait donner une sensation de réalité, mais là, on est peut-être un peu trop proche
(1:36:06) de la réalité. Du coup, agrandi le bocal. Je sais pas. Fais quelque [rires] chose s'il te plaît, je t'en prie, mais
(1:36:13) fais quelque chose qui fait qu'on a pas cette sensation que tu as bacé le travail quoi.
(1:36:21) On est même sur le même On est presque [rires] même sur sur le dipsi initial quoi les
(1:36:27) les gars. Je sais pas. Là, on a Fable 5, d'accord ? 5.1 en X.
(1:36:36) OK.
(1:36:42) Je sais pas, peut-être que des gens aimeront après, je sais pas.
(1:36:47) Mais là, pour le coup, je suis pas convaincu. Je suis pas convaincu du tout, ni par l'aspect qu'il a produite
(1:36:55) puisqu'on voit le résultat que ça donne, hein. Ni par son propre résultat. Je suis
(1:37:00) désolé. Là-dessus, carton rouge, mon petit flable.
(1:37:07) Et pourtant, j'aime beaucoup ce modèle. Mais pour moi là, ou [soupir] c'est quoi ? C'est Opus qui fait ça là.
(1:37:21) OK, OK. Bon, je vais vous montrer Opus quand même. Je vais vous montrer Opus. Mais du
(1:37:27) coup ça va commencer à devenir n'importe quoi cette série parce que ça commence à me
(1:37:33) faire douter. Je me dis si celui qu'on bouvant comme frontière
(1:37:39) euh produit un résultat moins bon sur certaines tâches comme celle-là [soupir]
(1:37:45) que ben opus par exemple qui est en dessous normalement.
(1:37:50) Ouais. C'està dire que potentiellement on peut éventuellement essayer de faire faire la la spec à Opus aussi et voir le
(1:37:57) résultat que ça donne. Mais du coup, on va se retrouver avec des specs de partout et plus de modèles de spec que
(1:38:02) de modèles qui réalisent le travail par eux-mêmes. Bon, en tout cas, on peut on peut voir
(1:38:08) que ça se confirme par rapport à ce qu'on a vu hier. une bonne spec donnée à peu près
(1:38:14) n'importe quel modèle aujourd'hui du marché, ça donne un résultat pas des
(1:38:20) goods du tout. Et ça pourrait ce je pense que ce qui pourrait être intéressant, c'est de pousser encore plus au au au au lieu de
(1:38:27) demain de vous proposer un nouveau un nouvel exercice, bah éventuellement
(1:38:33) encore approfondir celui-là et utiliser éventuellement mais on a encore de la marge. On peut chez Claude, on peut
(1:38:40) aller sur sonner, on peut même essayer du AQ si vous voulez voir ce que ça
(1:38:46) donne. [grognement] Et et pareil pour GPT, on peut descendre sur des couches
(1:38:51) un petit peu plus inférieures et voir si donner une une super spec d'astra à
(1:39:00) et ben à à Luna permettrait d'obtenir le même
(1:39:05) résultat que qu'on obtient avec Sol.
(1:39:10) Vo pour une fraction. Du coup, je le rappelle parce que là, si on prend
(1:39:16) euh Astral, la production seule, c'est 3 €. OK.
(1:39:22) Si on prend la spec, il l'a fait pour 2,71. Bon,
(1:39:33) [grognement] ça fait cher l'aspect quand même parce que derrière l'autre il réalise en
(1:39:38) combien ? Mince, je peux appuyer sur le bon bouton.
(1:39:48) Ça se discute hein parce qu'on est qu'à 88 centimes hein au final. 88 centimes
(1:39:55) plus 2,71 de spec,
(1:40:00) on est à 350 360 quoi. 360 et ici on est à 3. Bon,
(1:40:09) [soupir] ça se discute je pense je pense je pense. Allez, on se regarde opus et puis
(1:40:17) on refera le point demain, je vous propose mais voilà ce que je voyais moi d'opus
(1:40:24) tout à l'heure. Et on peut voir qu'opus en he pas en X,
(1:40:33) on a un meilleur résultat que Fable. Voilà, là-dessus, je pense que ça va
(1:40:39) être difficile pour qui que ce soit de dire le contraire.
(1:40:47) Alors, on aime, on aime pas le côté lycée, la couleur, elle est pas enfin les couleurs sont pas flashy.
(1:40:54) OK. OK. Il y a peut-être des jeux de lumière un peu spéciaux.
(1:41:00) Voilà, déjà on a un reflet qu'on a pas sur tous. [grognement]
(1:41:09) lui avait mis un peu GPT6 sol avec l'aspect d'astra,
(1:41:15) il y avait quand même un petit effet mais bon c'est pas topissime. Ici avait
(1:41:20) carrément Z rien du tout [grognement] ici. Zipsic
(1:41:26) Ouais, on a un petit effet aussi. Ouais globalement. Mais après, j'aime beaucoup l'aspect arrondi là ici. J'avoue que
(1:41:34) j'aime beaucoup. Bon,
(1:41:39) OK. Bon, je sais pas ce que vous en penserez.
(1:41:45) Moi, je trouve ça pas mal et ça ouvre pas mal de perspectives. Mais ça veut dire qu'en fait euh là en
(1:41:54) de jours, on fait quand même deux exercices qui sont d'une très lié à la physique quand même. Il y a de la
(1:41:59) physique dans le l'exercice en lui-même et c'est très lié à euh ben de la
(1:42:04) décoration quoi. Voilà, on on fait typiquement deux objets de décoration du
(1:42:10) du que vous pourriez avoir chez vous quoi. Et c'était c'était justement saidé et on peut voir que le dernier modèle
(1:42:17) n'est pas toujours le meilleur dans la réalisation directe. On peut voir que là-dessus Fable il a totalement foiré
(1:42:24) son truc. B je sais pas moi dans quelles conditions je peux me dire que celui-là est meilleur que les que tous les autres
(1:42:29) que tu vois là. L'ombre est sympa. Ouais ouais ouais si
(1:42:35) on veut. Au final là tu vois des boules qu'ici tu arrives qu'à peine à percevoir
(1:42:42) donc il y a quand même un gros décalage je trouve même si attention là je j'essaie de
(1:42:50) trouver des choses pour comparer les comparer les modèles. Oui oui, le côté le verre avec l'eau à l'intérieur et
(1:42:56) tout ça, c'est indéniable. Je trouve ça sympa. Mais il a pas pensé comme là, ben c'est
(1:43:03) tout pète mais j'ai j'ai pété, il y a pensé opus, il a pensé il y a de la place. Il
(1:43:09) y a de la place. On voit nos boules bouger. On on les voit interagir les unes avec les autres. Elles se poussent,
(1:43:16) voyez, elles se poussent. Elles ont ce petit truc, hop, ce petit rebond, hop avec la
(1:43:21) carde et cetera. Je sais pas, il y a il y a il y a quelque chose de joli.
(1:43:30) Il y a une fluidité même.
(1:43:35) Après le défaut ici. Ouais, ça c'est un petit peu trop doré. Bon, allez, allez, je suis la cor.
(1:43:42) Mais les jeux de lumière, ils sont là.
(1:43:47) Il y a quelque chose ici en tout cas. Bon là moi celui-là définitivement celui de Fable j'aime pas. Celui psyc fait par
(1:43:55) Fable. Bon ben voilà, on retrouve exactement le problème de Fable. Voyez
(1:44:01) la houle, on sait pas vraiment où elle est. En fait, elle est confondue avec le bord
(1:44:07) quoi. Alors que dipsic avec la la pardon, je
(1:44:13) l'ai où ? psique avec la la Spect d'Astra, bah on a quelque chose qui
(1:44:18) s'approche de Opus quoi. [grognement] On a quelque chose qui s'approche de Opus. Et alors là, je
(1:44:26) faisais la comparaison avec ce qu'avait coûté euh
(1:44:33) Ça c'est Opus ça. OK. Bon,
(1:44:40) on est quand même à 7,45 € pour Opus. Le résultat est là. Certes,
(1:44:45) mais 7,45 € quoi quand même. Alors que si je
(1:44:54) cumule comme on a fait tout à l'heure avec l'autre, on cumule
(1:44:59) 2,71 la spec. OK, j'arrive avec mon petit dipsi ici
(1:45:07) qui a coûté 13 centimes quoi à la réalisation. très centim est même pas à 3 à 3 € entre
(1:45:15) l'aspect de de de Astra pour le coup et la réalisation de Dipsic.
(1:45:21) Voilà pour moi aujourd'hui qualité prix
(1:45:27) il y a pas photo quand vous si vous mélangez les deux vous êtes à la moitié du prix de fable de de Opus pardon est à
(1:45:36) la moitié du prix de réalisation d'Opus sur cette tâche là.
(1:45:44) et on est à à 10 € de plus pour pour Fable pour un résultat qui est vraiment
(1:45:50) moins bon. Donc à de trancher quoi. Mais j'ai bien aimé
(1:45:57) pour le coup. Je le remets. Je remets. J'ai bien aimé
(1:46:05) le le GPT sol avec l'aspect d'Astra. Ouais.
(1:46:11) Ouais, il y a un truc, c'est pas le plus joli, je trouve,
(1:46:18) mais globalement la règle, elle est respectée, quoi. Après, oui, vous allez me dire oui mais
(1:46:24) il y a on voit pas l'eau, l'effet de l'eau et l'effet du [soupir][souffle coupé] Oui, c'est vrai.
(1:46:34) On voit pas trop l'effet du verre et cetera mais entre le on le voit pas trop et on voit que ça, [rires]
(1:46:41) mon cœur balance un peu, mais j'ai je préfère cette partie- làà je préfère
(1:46:46) très largement cette interprétation là. Voilà. ou celle-là que celle-là quoi. Voilà.
(1:46:55) Ah oui, il y en a les plus réalistes d'entre vous diront "Oui, mais physiquement c'est plus proche l'autre
(1:47:00) côté." Mais là-dessus, je suis désolé, Astra était très bon. Il a réussi à influ
(1:47:07) influencer
(1:47:13) au moins deux modèles à obtenir le même résultat.
(1:47:20) Alors là, ce qui va être rigolo, c'est que je vous le dis, maintenant qu'on a découvert que ben hier sur les sables
(1:47:26) mouvants, l'aspect donné par Fable est meilleur que l'aspect d'Astra, ben on va
(1:47:32) on va tester les ces ces specs là sur d'autres modèles, des modèles plus petits et ensuite on viendra carrément
(1:47:39) sur des modèles locaux. Moi, j'ai sur mon PC une RTX 5090 avec 32 Go. Donc, on
(1:47:46) peut mettre jusqu'à des modèles jusqu'à 27B et cetera. Donc on fera des tests où
(1:47:53) on utilisera ces spectres là réalisés par des gros modèles et on fera tourner des petits modèles et on verra ce qu'on
(1:47:58) obtient avec parce que là on reste sur Dipsic qui est peu cher mais Dipsic il est quand même
(1:48:04) est toujours dans le cloud et il est en Chine. Voilà donc on paye toujours.
(1:48:09) Après très honnêtement euh il faut pas faire l'autruche non plus. Faut pas toujours écouter tout ce que tout ce qui
(1:48:15) est dit sur internet. Ah mais le local c'est génial. Le local c'est c'est l'avenir et tout. Oui, peut-être, mais
(1:48:21) aujourd'hui, en fait, le local, il va vous coûter de l'électricité aussi, hein. Mon PC, il fait du 300 W. Dès que
(1:48:27) la carte graphique va se mettre à tourner, il va passer à 750 voire 800 W.
(1:48:32) Donc, c'est pas gratuit. Le gratuit n'existe pas. Et le prix de la carte graphique,
(1:48:38) voilà, il est il est absolument pas gratuit. Enfin, il était à 3200 balles quand je l'ai acheté en novembre de
(1:48:44) l'année dernière. Aujourd'hui, je pense que vous devez avoisiner 3005 pour la même carte graphique.
(1:48:51) Voilà. Donc déjà, l'achat de la carte graphique à rentabiliser en terme d'abonnement euh plus euh le prix en
(1:48:58) électricité. Faites bien le calcul. Aujourd'hui, les abonnements chat GPT et cetera, ils sont
(1:49:05) subventionnés euh et ça va pas durer. [rires] Il faut pas croire que ces boîtes-là éternellement elles vont vous
(1:49:12) fournir des abonnements à 200 dollars où vous allez aller chercher comme je le fais des des euh 10 15 20000 dollars de
(1:49:20) token à pay dans un mois. Ça à un moment donné quand les gens vont avoir adopté
(1:49:26) vont y être un petit peu accros, on va vous le faire payer au prix où c'est affiché là aujourd'hui.
(1:49:34) À moins d'une révolution extraordinaire où on arrive à à réduire énormément le
(1:49:40) coût d'utilisation des des GPU sur les dans les data centers. Mais bon,
(1:49:47) aujourd'hui, on y est pas. Aujourd'hui, ça coûte très cher. Euh donc, vous payez l'entraînement des
(1:49:53) modèles, vous payez euh euh le le le renfon le
(1:49:59) [raclement de gorge] pardon. En fait, quand vous entraînez un modèle de zéro, vous obtenez une base à laquelle vous allez faire passer des en gros, vous
(1:50:05) allez vous allez les amplifier sur certaines parties. Donc le renforcement learning là.
(1:50:11) Et en gros via ce biais là, ils peuvent leur leur faire apprendre des capacités supplémentaires. Je simplifie. Ben
(1:50:18) toutes ces étapes, elles ont un coût et c'est rien comparé à l'inférence derrière. C'estàd qu'à chaque fois vous allez poser une question en modèle en
(1:50:24) fonction du nombre de GPU que vous utilisez, vous consommez l'électricité. Et en gros, c'est ça l'IA. LIA, c'est de
(1:50:30) transformer de l'énergie en données. Voilà. Et au passage,
(1:50:35) essayez de faire en sorte que la donnée produise de la richesse pour vous. Mais euh mais ça déjà le ce que je viens de
(1:50:43) dire à la fin n'est pas garanti. C'est c'est pas parce que vous transformez l'électricité aujourd'hui en token que le token qui va arriver en sortie sera
(1:50:51) euh vous apportera quelque plusvalue. Et là
(1:50:56) pour le coup, c'est la différence entre Pierre, Paul et Jacques qui sont chacun derrière leur PC en train d'utiliser
(1:51:02) Lia. La plupart des choses qu'on génère avec Lia aujourd'hui.
(1:51:08) Euh enfin là par exemple, j'ai généré tout un tas de choses sur mon logiciel. Soyons tout à fait réaliste, le logiciel
(1:51:13) n'est pas commercialisé, donc il me rapporte 0 €. Pourtant eux, ils
(1:51:18) encaissent à chaque fois que je paye l'abonnement tous les mois [souffle coupé][soupir] pour utiliser ces services. Donc à pas
(1:51:26) confondre, transformer de l'électricité en argent. Non, vous transformez bien de l'électricité en token et éventuellement
(1:51:33) ces tokens en argent, mais c'est voilà, c'est un autre business déjà.
(1:51:39) Donc je peux vous encourager à faire aujourd'hui, c'est utiliser ces forfaits tant que c'est subventionné et tant que
(1:51:45) si vous avez des idées, si vous si vous si vous pensez que vous êtes capable de générer des revenus via les tokens qui
(1:51:52) vont être générés par vos par vos agents, bingo, allez-y. aujourd'hui, c'est vraiment voilà, rien qu'apprendre
(1:51:58) à utiliser ces ces services là et et en et en créer des des flux de travail,
(1:52:06) c'est déjà une compétence en soi. Et cette compétence là, elle disparaîtra
(1:52:12) pas parce que les forfaits subventionnés vont disparaître. Il va il là encore aujourd'hui, j'adore
(1:52:20) cette expression, on a plein qui l'utilisent. On utilise des des tronçonsuses pour couper du beurre. Bon,
(1:52:26) OK. Euh, peut-être que demain on pourra plus utiliser ces mêmes transodins parce qu'elles coûteront beaucoup trop cher
(1:52:31) par rapport à à couper un petit morceau de beurre. Donc, on ira chercher un couteau suisse qui sera plus peut-être
(1:52:37) plus adapté à à couper du beurre. Mais du coup euh il n'empêche que la personne
(1:52:43) qui aura appris à l'utiliser via des abonnements, elle sera tout à fait capable derrière d'aller trouver les informations nécessaires pour les
(1:52:48) utiliser sur leur PC. Et donc oui, elles auront pas des modèles capables de faire
(1:52:54) les derniers euh modèles graphiques qu'on peut faire avec
(1:52:59) Bender en quelques minutes certes, mais elles sont tout à fait capables de
(1:53:05) d'utiliser une API. Elles sont tout à fait capables d'aller chercher une donnée et d'en faire un résumé. Elles seront tout à fait capables avec les les
(1:53:12) bons outils, le bon rag, les bonnes informations en mémoire d' de de de
(1:53:18) communiquer avec vous et de vous permettre de gagner du temps sur des tâches. Mais par contre, il faut pas confondre
(1:53:25) un modèle avec 27 milliards et se dire que demain euh il sera capable de faire le logiciel que j'ai fabriqué, que j'ai
(1:53:31) conçu là avec les modèles frontières. Pour moi, ça aujourd'hui c'est pas vrai.
(1:53:37) Voilà. ou du moins pas le modèle brut euh 27B que vous trouvez sur internet.
(1:53:43) Il va falloir il va falloir faire du du renforcement learning avec vos pratiques, vos votre
(1:53:50) façon d'agir et peut-être éventuellement avoir plusieurs lauras d'un modèle pour le perfectionner dans certains types de
(1:53:57) tâches plutôt que d'autres parce que vous vous êtes je sais pas comptable, vous êtes travailleur dans le bâtiment,
(1:54:04) euh [grognement] vous avez peut-être besoin d'un petit logiciel pour gérer des choses sur votre
(1:54:10) PC euh euh et que et que ce logiciel il est disponible sur internet mais à des
(1:54:16) prix pharoniques. Bon voilà, tout ça se fait. Mais après, il faut rester conscient qu'aujourd'hui les abonnements
(1:54:23) sont fortement subventionnés et les Chinois c'est pareil quand Typs qui vous propose
(1:54:30) de faire la même tâche en 7 centimes que l'autre il vous fait faire en 15 dollars. Alors quand on vous dit déjà
(1:54:35) que le 15 dollars est subventionné, qu'est-ce que vous pensez des 4 centimes ? Voilà. Au moment, il faut être tout à
(1:54:42) fait honnête aussi. Tout le monde aujourd'hui subventionne. Il subventionne parce que ça les arrange bien parce qu'entre
(1:54:50) entre être dans son garage en train de faire son petit modèle et se dire meilleur que tout le monde et avoir des
(1:54:56) millions d'utilisateurs qui communiquent avec votre modèle qui vous font obtenir des datas parce que ça
(1:55:02) c'est une réalité aussi. Il faut arrêter de croire que vos datas elles restent sur votre PC, elles sont sécurisées.
(1:55:08) Non, à partir du moment où le LM a lu un article sur un bout de votre code base, ben cet article ou ce ce bout de votre
(1:55:15) code base, il peut tout à fait être enregistré sur un serveur quelque part.
(1:55:20) Ça vous en avez aucune idée. Donc il faut garder en tête ce genre de choses. Si vous si vous faites des choses
(1:55:26) sensibles, si vous utilisez des données sensibles ou des données personnelles, il faut pas utiliser les modèles euh des
(1:55:34) providers américains et des providers chinois sans garde fou au minimum. Et là, je dis
(1:55:40) bien au minimum parce que aujourd'hui, je crois même que avec les nouvelles règles
(1:55:46) de l'Europe euh l'é Acte, je il me semble bien ne pas dire de bêtises en
(1:55:51) disant que si [grognement] même avec des données pseudonymisées ou anonymisées,
(1:55:58) euh aller sur le cloud américain, c'est pas
(1:56:04) c'est pas dans la loi, je crois. Voilà. Donc euh il faut se renseigner là-dessus mais voilà, il faut être prudent. Et
(1:56:10) après, il est pour ceux qui cherchent à à quand même utiliser des gros modèles et tout ça, bah vous pouvez tout à fait
(1:56:16) louer des serveurs, vous pouvez y mettre des gros modèles. Il y a des Kimic à 3, il y a des dipsic B celui que j'utilise
(1:56:22) là, le 4.1 Flash, ça s'héberge tout à fait sur des GX Park et cetera ou des ou
(1:56:28) des Mac avec des grosses quantités de RAM. Et donc là, on atteint des on a des
(1:56:34) modèles qui atteignent des niveaux frontières sur certaines parties, ce qui sont la majorité des tâches qu'ont les
(1:56:40) gens au quotidien. Tout le monde n'est pas développeur de logiciel, je suis désolé. Euh j'aimerais bien, ça me
(1:56:47) ferait des des super conversations avec tout le monde au au long de l'année,
(1:56:52) mais tout le monde n'est pas intéressé par créer un logiciel. Voilà, donc tout le monde n'a pas besoin des derniers
(1:56:58) modèles et même les développeurs logiciels, on s'aperçoit au jour le jour qu'on a pas vraiment besoin d'un fable
(1:57:03) 5.1 max pour réaliser toutes les tâches qu'on fait au jour le jour. C'est pas vrai. C'est absolument pas vrai. Au
(1:57:10) début, on le fait parce que ben déjà, on peut le faire, qu'on a le forfait et que quit à l'avoir, on l'utilise, mais la
(1:57:15) réalité, c'est que très vite vous vous elle vous rattrape la réalité. Là, ce soir pour les deux bêtises qu'on a fait
(1:57:22) avec Claude, on a utilisé 4 % de mon de mon de mon forfait
(1:57:28) hebdomadaire pour coder les trois petits trucs qu'on a fait là. C'est pharaonique
(1:57:34) honnêtement. Euh 4 % de mon forfait hebdo, si je m'arrange bien, en une
(1:57:40) journée de boulot où je travaille beaucoup, où je vais avoir peu de peu de peu de choses à tester, beaucoup de
(1:57:47) choses à développer, par exemple. Bah et oui, je peux utiliser jusqu'à 10 % de mon forfait. Donc là, en 30 minutes de
(1:57:55) déconnade pour des trucs qui n'ont aucune importance et qui et qui pour le coup a été la transformation à l'électricité euh vers des tokens qui ne
(1:58:04) serviront pas. Et ben oui, effectivement, c'est très cher 4 % c'est voilà. J'espère que cette
(1:58:11) vidéo vous a plu. On va s'arrêter là. Ça commence à faire très très long. Je crois que c'est la plus longue des
(1:58:16) vidéos. Je sais même pas si je vais pas la couper. [grognement] On verra ça et
(1:58:23) je vous souhaite une belle soirée et si le cœur vous en dit à demain.
