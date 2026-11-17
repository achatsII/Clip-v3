import type { GuidesDict } from '../types'

/** Les guides du site, en français du Québec : la source. */
export const fr: GuidesDict = {
  index: {
    title: 'Guides : instructions de travail et formation au poste',
    description: 'Rédiger une instruction de travail, la filmer, choisir un modèle, former un nouvel employé, bâtir une matrice de compétences : des guides pour le plancher.',
    h1: 'Des guides pour documenter le travail et former au poste',
    lead: 'Des méthodes concrètes, de la première instruction de travail à la matrice de compétences. Chaque guide se lit en quelques minutes, au bureau comme sur le plancher.',
  },

  ui: {
    guides: 'Guides',
    readingTime: (m) => `${m} min de lecture`,
    updated: (d) => `Mis à jour le ${d}`,
    contents: 'Dans ce guide',
    faq: 'Questions fréquentes',
    related: 'À lire aussi',
  },

  guides: {
    write: {
      keyword: 'comment rédiger une instruction de travail',
      title: 'Comment rédiger une instruction de travail, étape par étape',
      description: 'Choisir la tâche, filmer l’expert, écrire une action par étape avec ses points clés et leur raison, placer les mises en garde, tester, faire approuver.',
      h1: 'Comment rédiger une instruction de travail que les opérateurs suivent vraiment',
      lead: 'Comment rédiger une instruction de travail utile ? Partez de la tâche réelle et faites-la montrer par la personne qui la maîtrise. Écrivez ensuite une action par étape, avec ses points clés et leur raison, puis testez l’instruction avec quelqu’un qui ne connaît pas la tâche avant de la publier au poste.',
      minutes: 6,
      sections: [
        {
          heading: 'Quelle tâche documenter en premier ?',
          paragraphs: [
            'Une instruction de travail couvre une seule tâche, avec un début et une fin clairs. « Faire le changement de format de la ligne d’emballage 2 » est une tâche ; « La ligne d’emballage 2 » n’en est pas une. Donnez à chaque instruction un titre qui commence par un verbe, avec les mots du plancher.',
            'Commencez là où une erreur coûte le plus cher. Quatre sortes de tâches passent en premier :',
          ],
          list: {
            items: [
              'Celles qui peuvent blesser : cadenassage, levage, produits chimiques',
              'Celles qui causent du rebut, des reprises ou des retours de clients',
              'Les tâches rares, qu’on oublie d’une fois à l’autre, comme un entretien annuel',
              'Celles qu’un seul expert sait faire, surtout s’il approche de la retraite',
            ],
          },
        },
        {
          heading: 'Observer l’expert et filmer la tâche',
          paragraphs: [
            'N’écrivez pas de mémoire, au bureau. Allez au poste et demandez à la personne qui maîtrise la tâche de la faire à son rythme normal, en l’expliquant à voix haute comme à un nouveau collègue. Filmez-la au téléphone, près des mains.',
            'Posez des questions à chaque moment délicat : « Pourquoi tu fais ça ? », « Qu’est-ce qui arrive si on l’oublie ? », « Comment tu sais que c’est assez serré ? » Les réponses deviendront vos points clés. Notez aussi les outils, les pièces, les EPI et les réglages.',
            'Si deux experts font la tâche différemment, ne tranchez pas seul. Réunissez-les, comparez, et entendez-vous sur la meilleure façon avant d’écrire.',
          ],
        },
        {
          heading: 'Comment rédiger une instruction de travail : une action par étape',
          paragraphs: [
            'Découpez la tâche en étapes importantes : les moments où le travail avance. Chaque étape est une action qui commence par un verbe : « Desserrez les quatre vis du carter », et non « Il faut ensuite procéder au desserrage des vis ».',
            'Une étape qui contient « puis » ou « et ensuite » en cache souvent deux. À l’inverse, ne descendez pas jusqu’au mouvement : « Prenez la clé » n’est pas une étape importante. Si la liste s’allonge, scindez la tâche en deux instructions, par exemple le démontage et le remontage.',
            'Écrivez court et précis. Remplacez chaque mot vague par un critère qu’on peut vérifier : pas « serrez bien », mais « serrez à 25 N·m » ; pas « nettoyez », mais « essuyez jusqu’à ce qu’il ne reste aucune trace d’huile ».',
          ],
        },
        {
          heading: 'Points clés et raisons : ce qui fait réussir la tâche',
          paragraphs: [
            'C’est le cœur de la méthode Job Instruction du TWI (Training Within Industry), un programme né aux États-Unis pendant la Seconde Guerre mondiale. Pour chaque étape importante, notez ses points clés, puis la raison de chacun.',
            'Un point clé est ce qui, dans l’étape, peut faire réussir ou rater le travail, blesser la personne, ou rendre le geste plus facile : le tour de main. La sécurité est toujours un point clé. La raison dit pourquoi : on retient mieux un point clé, et on le respecte davantage, quand on sait ce qu’il évite. Deux ou trois points clés par étape suffisent ; s’il y en a dix, l’étape est trop grosse.',
            'Un exemple, au poste d’assemblage :',
          ],
          list: {
            items: [
              'Étape : serrez les quatre vis du couvercle.',
              'Point clé : en croix, au couple indiqué sur le dessin.',
              'Raison : serrer dans cet ordre évite de pincer le joint, qui fuirait.',
            ],
          },
        },
        {
          heading: 'Ajouter les visuels et placer les mises en garde',
          paragraphs: [
            'Une photo ou un court extrait vidéo par étape, pris du point de vue de l’opérateur, vaut mieux qu’un paragraphe. Cadrez serré sur ce qui compte et ajoutez une flèche ou un cercle. Quand une erreur revient souvent, montrez côte à côte le bon et le mauvais : l’étiquette bien placée et celle qui est de travers.',
            'Placez chaque mise en garde à l’étape où le danger existe, juste avant l’action, et non dans un bloc en première page que personne ne relit. Trois niveaux suffisent : danger (risque de blessure), attention (risque de bris ou de défaut) et bon à savoir.',
            'Les outils et les EPI vont en tête, dans une section « Avant de commencer ». La personne les rassemble d’abord, au lieu de les découvrir à l’étape 6.',
          ],
        },
        {
          heading: 'Tester avec une personne nouvelle, puis faire approuver',
          paragraphs: [
            'Donnez l’instruction à quelqu’un qui n’a jamais fait la tâche et regardez-le la suivre seul, sans l’aider. Chaque hésitation, chaque question, chaque erreur montre un endroit à corriger dans l’instruction, pas chez la personne.',
            'Une fois l’instruction corrigée, faites-la approuver par une deuxième personne : superviseur, qualité ou santé et sécurité, selon la tâche. L’approbation porte une date et un numéro de version. C’est cette version, et seulement celle-là, qui va au poste.',
          ],
        },
        {
          heading: 'Mettre l’instruction au poste et la garder à jour',
          paragraphs: [
            'Une instruction sert là où le travail se fait : sur la tablette du poste, dans un cartable au pied de la machine ou derrière un code QR collé sur l’équipement. Retirez les vieilles copies : deux versions au même poste, c’est une erreur qui attend son heure.',
            'Révisez l’instruction à chaque changement : nouvel outil, nouvelle pièce, incident, quasi-accident ou retour d’un opérateur. Fixez aussi une date de révision, par exemple un an après la publication, pour qu’aucune instruction ne vieillisse en silence. Et quand un opérateur signale une étape pas claire, corrigez vite : c’est la preuve que l’instruction est lue.',
          ],
        },
      ],
      faq: [
        {
          q: 'Quelle est la différence entre une procédure et une instruction de travail ?',
          a: 'La procédure décrit un processus : qui fait quoi, quand et pourquoi. L’instruction de travail décrit comment faire une seule tâche, geste par geste, au poste. Une procédure renvoie souvent à plusieurs instructions.',
        },
        {
          q: 'Qui devrait rédiger une instruction de travail ?',
          a: 'La personne qui maîtrise la tâche l’explique et la montre. Un superviseur ou quelqu’un des méthodes la structure et la rédige. Une personne qui ne connaît pas la tâche la teste, puis une deuxième personne l’approuve.',
        },
        {
          q: 'Combien d’étapes doit contenir une instruction ?',
          a: 'Autant qu’il y a d’étapes importantes, une action chacune. Si l’instruction devient longue, coupez la tâche en phases qui ont chacune leur instruction, comme le démontage et le remontage.',
        },
        {
          q: 'Faut-il une photo à chaque étape ?',
          a: 'Presque toujours, pour une tâche manuelle. Une photo prise du point de vue de l’opérateur, avec une flèche sur ce qui compte, se comprend plus vite qu’une phrase. Pour un geste ou un tour de main, un court extrait vidéo fait encore mieux.',
        },
        {
          q: 'À quelle fréquence réviser une instruction de travail ?',
          a: 'À chaque changement du travail, et à une date fixe, par exemple une fois par an. Une tâche critique mérite une révision plus fréquente. Chaque révision approuvée change le numéro de version.',
        },
      ],
      cta: {
        title: 'Filmez la tâche, l’IA rédige les étapes',
        text: 'Avec Clip, l’expert filme la tâche en l’expliquant. L’IA rédige une action par étape, avec les points clés, les mises en garde et le bon extrait vidéo ; vous relisez, corrigez et publiez au poste.',
      },
    },

    template: {
      keyword: 'modèle d’instruction de travail',
      title: 'Modèle d’instruction de travail : à copier et à remplir',
      description: 'Un modèle d’instruction de travail à copier : en-tête, outils et EPI, étapes avec points clés, contrôles, approbation et révision, rubrique par rubrique.',
      h1: 'Modèle d’instruction de travail : chaque rubrique, et comment la remplir',
      lead: 'Voici un modèle d’instruction de travail à copier tel quel, suivi de la façon de remplir chaque rubrique. Il tient sur une ou deux pages : qui, où et quoi ; ce qu’il faut avant de commencer ; les étapes avec leurs points clés ; les contrôles ; l’approbation et la date de révision.',
      minutes: 6,
      sections: [
        {
          heading: 'Le modèle d’instruction de travail, à copier',
          paragraphs: [
            'Copiez cette liste dans un document ou un tableur. Gardez l’ordre : c’est celui dans lequel l’opérateur a besoin de l’information. Remplacez tout ce qui est entre crochets. Si une rubrique ne s’applique pas à une tâche, supprimez-la plutôt que d’écrire « s. o. ».',
          ],
          list: {
            ordered: true,
            items: [
              'Titre : [verbe + objet, p. ex. « Changer la courroie du convoyeur C-3 »]',
              'Numéro et version : [IT-0042], version [3], en vigueur le [date]',
              'Poste, secteur et équipement : [où la tâche se fait, sur quelle machine]',
              'Durée et fréquence : [environ 20 min], [à chaque changement de format]',
              'Qui fait la tâche : [rôle et qualification exigée]',
              'Outils et matériel : [chaque outil et chaque pièce, avec sa référence]',
              'EPI : [lunettes, gants anticoupure, protection auditive…]',
              'Mises en garde générales : [dangers présents pendant toute la tâche]',
              'Étapes : [n°, action, points clés, raison, photo]',
              'Contrôles et relevés : [quoi vérifier, avec quel instrument, limites, où noter, quoi faire si c’est hors limites]',
              'Approbation : rédigée par [nom], approuvée par [nom], le [date]',
              'Révision : prochaine révision le [date] ; historique des versions',
            ],
          },
        },
        {
          heading: 'L’en-tête : titre, numéro, version et poste',
          paragraphs: [
            'Le titre dit l’action, avec les mots du plancher : « Changer la courroie du convoyeur C-3 », pas « Procédure de maintenance mécanique ». C’est ce que l’opérateur cherchera.',
            'Le numéro identifie le document pour de bon : un préfixe et un compteur suffisent (IT-0042), et un numéro ne se réutilise jamais. La version change à chaque modification approuvée. La règle à tenir : la version au poste est toujours la dernière approuvée.',
            'Le poste, le secteur et l’équipement disent où l’instruction s’applique. La durée et la fréquence aident à planifier le travail et la formation. Indiquez enfin qui peut faire la tâche : un opérateur formé, un électricien, un cariste.',
          ],
        },
        {
          heading: 'Avant de commencer : outils, EPI et mises en garde',
          paragraphs: [
            'Cette section évite les allers-retours au coffre à outils. Soyez précis : « clé de 13 mm » plutôt que « une clé », la référence exacte de la courroie, la quantité de chaque consommable.',
            'Pour les EPI, un pictogramme et un mot chacun, sans phrase. Les mises en garde générales ne gardent que les dangers présents du début à la fin, comme une surface chaude ou le bruit. Les autres vont à l’étape où le danger apparaît.',
            'Ajoutez les conditions de départ, s’il y en a : machine arrêtée et cadenassée, pièces de rechange sur place, zone dégagée.',
          ],
        },
        {
          heading: 'Les étapes : action, points clés et raison',
          paragraphs: [
            'Le corps du modèle est un tableau à cinq colonnes : numéro, action, points clés, raison et visuel. Une ligne par étape importante, c’est-à-dire par moment où le travail avance.',
            'Un exemple, au poste de perçage : « Placez la pièce dans le gabarit » ; point clé : face usinée en bas, contre les deux butées ; raison : sinon, le trou sort de la cote.',
          ],
          list: {
            items: [
              'Action : un verbe à l’impératif et un objet. « Retirez le protecteur. »',
              'Points clés : ce qui fait réussir l’étape, la sécurité, le tour de main. Deux ou trois au plus.',
              'Raison : pourquoi le point clé compte, en une courte phrase.',
              'Visuel : une photo prise du point de vue de l’opérateur, avec une flèche ou un cercle, ou un court extrait vidéo.',
            ],
          },
        },
        {
          heading: 'Contrôles et relevés : la preuve que c’est bien fait',
          paragraphs: [
            'Quand une étape demande une vérification, écrivez quoi vérifier, avec quel instrument et dans quelles limites. Prenez toujours les limites dans le dessin, la spécification ou la gamme ; ne les inventez jamais.',
            'Dites où noter le résultat (le formulaire, le registre) et quoi faire s’il est hors limites : arrêter, isoler la pièce, appeler le superviseur. Ce relevé devient l’enregistrement qui prouve que la tâche a été faite comme prévu.',
            'Un exemple, après l’usinage d’un arbre : mesurez le diamètre au micromètre, à deux endroits ; limites : celles du dessin ; notez les deux valeurs sur la feuille du lot ; hors limites, isolez la pièce avec une étiquette rouge et appelez le superviseur.',
          ],
        },
        {
          heading: 'Approbation et date de révision',
          paragraphs: [
            'Une instruction est rédigée par une personne et approuvée par une autre, qui vérifie le contenu et la sécurité. Notez les deux noms et la date. Choisissez l’approbateur selon le risque : santé et sécurité pour une tâche dangereuse, qualité quand une étape porte un contrôle, superviseur pour le reste.',
            'Fixez une date de révision, par exemple un an après la publication, et tenez un historique court : version, date, ce qui a changé, qui a approuvé. Quand un changement touche une étape ou un point clé, prévoyez de re-former les personnes concernées.',
          ],
        },
        {
          heading: 'Les erreurs qui rendent un modèle inutile',
          paragraphs: ['Un modèle n’aide que s’il reste simple. Méfiez-vous de ces pièges :'],
          list: {
            items: [
              'Trop de rubriques : si l’en-tête prend une page, personne ne lit la suite.',
              'Des paragraphes au lieu d’étapes : l’œil cherche une action à la fois.',
              'Toutes les mises en garde en première page, loin de l’étape dangereuse.',
              'Des titres vagues, qu’on ne retrouve pas en cherchant.',
              'De vieilles copies qui traînent au poste à côté de la nouvelle version.',
            ],
          },
        },
      ],
      faq: [
        {
          q: 'Existe-t-il un modèle d’instruction de travail officiel ?',
          a: 'Non. La norme ISO 9001 demande des « informations documentées », mais laisse à chaque organisation le choix de leur forme. Votre système qualité ou un client peut exiger certaines rubriques ; sinon, ce modèle couvre l’essentiel.',
        },
        {
          q: 'Document, tableur ou application : quel format choisir ?',
          a: 'Pour quelques instructions, un document suffit. Quand elles se comptent par dizaines, le vrai défi devient les versions : savoir laquelle est en vigueur et la remplacer partout. Une application qui affiche au poste la dernière version approuvée règle ce problème.',
        },
        {
          q: 'Combien de pages doit faire une instruction de travail ?',
          a: 'Le moins possible : une ou deux pages pour la plupart des tâches. Si elle s’allonge, la tâche est sans doute trop large ; coupez-la en plusieurs instructions.',
        },
        {
          q: 'Comment numéroter les instructions de travail ?',
          a: 'Un préfixe et un compteur suffisent, comme IT-0042. Certaines usines ajoutent le code du secteur. Gardez la version à part du numéro, et ne réutilisez jamais un numéro retiré.',
        },
        {
          q: 'Ce modèle convient-il à la maintenance ?',
          a: 'Oui. Ajoutez les conditions de départ, comme le cadenassage, et les pièces de rechange avec leur référence. Pour une intervention rare, les photos et les points clés comptent encore plus : personne ne s’en souvient d’une fois à l’autre.',
        },
        {
          q: 'Peut-on reprendre une ancienne procédure dans ce modèle ?',
          a: 'Oui. Reprenez ses étapes une par une, une action chacune, et ajoutez ce qui manque presque toujours : les points clés, leurs raisons et les photos. Vérifiez ensuite au poste que la tâche se fait encore comme c’est écrit.',
        },
      ],
      cta: {
        title: 'Le modèle, rempli à partir d’une vidéo',
        text: 'Avec Clip, l’IA rédige les étapes, les points clés et les mises en garde, et propose catégorie, équipement, durée, EPI et outils ; vous confirmez. Chaque publication crée une version, et le code QR du poste mène toujours à la dernière.',
      },
    },

    video: {
      keyword: 'instructions de travail en vidéo',
      title: 'Instructions de travail en vidéo : comment bien filmer',
      description: 'Quand la vidéo vaut mieux que le texte, comment filmer au téléphone, le son, le passage aux étapes écrites, les sous-titres et les limites de la vidéo seule.',
      h1: 'Instructions de travail en vidéo : filmer le geste, puis en tirer des étapes claires',
      lead: 'Des instructions de travail en vidéo montrent ce que le texte décrit mal : un geste, un son, une position. Filmez au téléphone, à l’horizontale et près des mains, pendant que l’expert explique à voix haute ; tirez-en ensuite des étapes écrites, chacune avec son extrait.',
      minutes: 6,
      sections: [
        {
          heading: 'Quand la vidéo vaut mieux que le texte',
          paragraphs: [
            'La vidéo gagne quand le mouvement compte : un geste qui demande du doigté, une suite rapide de manipulations, un son ou un déclic qui confirme qu’une pièce est en place, le comportement d’une machine qu’il faut apprendre à reconnaître.',
            'Elle aide aussi pour les tâches rares, comme un entretien annuel dont personne ne se souvient, et pour les personnes qui lisent difficilement ou qui lisent dans une autre langue.',
            'Pour un réglage simple, une valeur à lire ou une liste de vérification, une photo et une phrase suffisent. Une vidéo de trois minutes pour dire « mettez le sélecteur sur 2 » fait perdre du temps à tout le monde.',
          ],
        },
        {
          heading: 'Préparer le tournage',
          paragraphs: [
            'Choisissez un moment où la tâche se fait vraiment : un changement de format prévu, un entretien planifié. Demandez à la personne qui la maîtrise de la faire à son rythme normal.',
            'Avant de filmer, faites-lui raconter la tâche et notez la liste des étapes. Vous saurez où couper, et rien ne sera oublié.',
            'La sécurité passe avant l’image. Ne demandez jamais de sauter un cadenassage, d’ouvrir un protecteur ou de ralentir un geste dangereux pour la caméra. Filmez seulement là où c’est permis, et prévenez les collègues qui seront dans le champ.',
            'Côté matériel : batterie chargée, espace libre sur le téléphone, objectif essuyé. Côté poste : zone de travail dégagée et bien éclairée.',
          ],
        },
        {
          heading: 'Comment filmer au téléphone',
          paragraphs: ['Pas besoin de matériel professionnel : un téléphone récent suffit, si vous suivez quelques règles.'],
          list: {
            ordered: true,
            items: [
              'Tenez le téléphone à l’horizontale : l’image remplit l’écran d’une tablette ou d’un ordinateur.',
              'Filmez près des mains, du point de vue de l’opérateur, par-dessus son épaule.',
              'Gardez l’appareil stable : à deux mains, les coudes appuyés, ou sur un support.',
              'Éclairez la zone de travail et évitez le contre-jour, comme une fenêtre derrière la machine.',
              'Faites un extrait par étape : arrêtez, puis reprenez à l’étape suivante.',
              'Montrez à la fin le résultat attendu, et l’erreur à éviter si c’est sans danger.',
              'Laissez tourner deux secondes avant et après chaque geste : le montage sera plus facile.',
            ],
          },
        },
        {
          heading: 'Le son : la voix de l’expert',
          paragraphs: [
            'Ce que l’expert dit vaut souvent plus que l’image. Demandez-lui d’expliquer à voix haute ce qu’il fait et pourquoi, comme à un nouveau collègue. Ces explications deviendront les points clés et leurs raisons. Laissez-le parler avec ses mots ; vous corrigerez le texte ensuite.',
            'Dans un atelier bruyant, rapprochez le téléphone de la personne qui parle ou utilisez un micro-cravate. Si c’est impossible, enregistrez l’explication juste après, au calme, en regardant la vidéo ensemble.',
            'Demandez-lui de nommer les choses comme sur le plancher (« le levier rouge », « la vanne du bas ») et de dire les valeurs clairement : couple, cote, pression.',
          ],
        },
        {
          heading: 'Des instructions de travail en vidéo aux étapes écrites',
          paragraphs: [
            'Une longue vidéo ne s’utilise pas telle quelle au poste. Regardez-la et notez chaque étape importante avec le moment où elle commence. Écrivez ensuite une action par étape, puis tirez des paroles de l’expert les points clés et leurs raisons.',
            'Coupez la vidéo en courts extraits, un par étape, et placez chacun à côté de son texte. Pour une étape où il faut voir un détail, une image fixe annotée d’une flèche fait souvent mieux qu’un extrait. Gardez la vidéo complète comme source : elle servira à la prochaine révision.',
            'Relisez enfin chaque étape sans regarder la vidéo. Si elle ne se comprend pas seule, il manque un mot, une valeur ou un critère.',
          ],
        },
        {
          heading: 'Sous-titres et traduction',
          paragraphs: [
            'Sur un plancher bruyant, on entend mal la voix : les sous-titres et les étapes écrites portent le message. Ils aident aussi les personnes qui comprennent mieux une langue à l’écrit qu’à l’oral. Côté voix, des phrases courtes donnent des sous-titres lisibles : une idée par phrase, un geste à la fois.',
            'Pour traduire, partez du texte des étapes et des sous-titres, pas de l’audio. Évitez le texte incrusté dans l’image, difficile à traduire et à corriger. Faites relire les termes techniques par une personne du plancher qui parle les deux langues.',
          ],
        },
        {
          heading: 'Les limites de la vidéo seule',
          paragraphs: [
            'Une vidéo seule se parcourt mal : on ne peut pas la survoler ni y chercher un mot. Au poste, il faut l’arrêter, revenir en arrière et la relancer, souvent avec des gants.',
            'Elle fixe aussi mal le standard. L’œil suit les mains et rate le critère : le couple, la cote, le nombre de tours. Et la moindre modification oblige à refilmer. La bonne combinaison : une action écrite par étape, ses points clés, et l’extrait qui montre le geste.',
            'Une vidéo seule s’approuve mal, elle aussi : pour vérifier une valeur, l’approbateur doit tout regarder. Les étapes écrites se relisent, se comparent d’une version à l’autre et se signent.',
          ],
        },
      ],
      faq: [
        {
          q: 'Quelle durée pour une vidéo d’instruction de travail ?',
          a: 'Filmez la tâche entière au besoin, mais découpez-la : au poste, chaque extrait ne montre qu’une étape, le temps du geste. On regarde un extrait court au moment où on en a besoin ; on décroche d’une longue vidéo.',
        },
        {
          q: 'Faut-il un équipement professionnel ?',
          a: 'Non. Un téléphone récent filme assez bien. Un support et un micro-cravate aident dans un atelier bruyant, et un bon éclairage compte plus que la caméra.',
        },
        {
          q: 'Peut-on filmer des employés au travail ?',
          a: 'Prévenez les personnes filmées, expliquez à quoi servira la vidéo et cadrez sur les mains plutôt que sur les visages. Suivez les règles de votre usine sur les images, et ne filmez rien de confidentiel sans accord.',
        },
        {
          q: 'Une vidéo peut-elle remplacer l’instruction écrite ?',
          a: 'Pas à elle seule. La vidéo montre le geste ; l’étape écrite fixe le standard, se cherche, se traduit et s’approuve. Les deux ensemble donnent la meilleure instruction.',
        },
        {
          q: 'Faut-il filmer à l’horizontale ou à la verticale ?',
          a: 'À l’horizontale dans la plupart des cas : on voit à la fois les mains, la pièce et l’outil, et l’image remplit l’écran d’une tablette. La verticale convient à un sujet haut et étroit, comme un panneau électrique.',
        },
        {
          q: 'Faut-il tout refilmer quand la tâche change ?',
          a: 'Non, si vous avez filmé un extrait par étape : refilmez seulement l’étape qui change et remplacez son extrait. Mettez aussi à jour le texte de l’étape et le numéro de version de l’instruction.',
        },
      ],
      cta: {
        title: 'Filmez une fois, obtenez les étapes',
        text: 'Avec Clip, l’expert filme la tâche dans l’app en l’expliquant. L’IA rédige une action par étape et garde pour chacune le bon extrait de la vidéo, à la seconde près ; la vidéo reste légère, en 720p.',
      },
    },

    sopVsWi: {
      keyword: 'différence entre procédure et instruction de travail',
      title: 'La différence entre procédure et instruction de travail',
      description: 'Procédure (SOP) ou instruction de travail : définitions, portée, lecteur, niveau de détail, pyramide documentaire, exemples et laquelle écrire d’abord.',
      h1: 'La différence entre procédure et instruction de travail, et laquelle écrire d’abord',
      lead: 'La différence entre procédure et instruction de travail tient à la portée et au niveau de détail. La procédure, ou SOP, dit qui fait quoi, quand et pourquoi dans un processus ; l’instruction de travail dit comment faire une seule tâche, geste par geste, au poste.',
      minutes: 6,
      sections: [
        {
          heading: 'Qu’est-ce qu’une procédure (SOP) ?',
          paragraphs: [
            'Une procédure décrit un processus de bout en bout : son but, ce qu’il couvre, qui en est responsable, l’ordre des activités et les documents à remplir. En anglais, on parle de SOP, pour standard operating procedure ; en français, de procédure, ou de procédure opérationnelle normalisée.',
            'Elle s’adresse aux responsables, aux superviseurs, aux auditeurs et à toute personne qui doit comprendre comment le travail s’organise. Elle traverse souvent plusieurs postes ou services, et change rarement. On la lit au bureau, d’un bout à l’autre, quand on veut comprendre le processus.',
            'Exemple : la procédure de traitement des produits non conformes dit qui détecte le problème, qui décide de la suite, où l’on isole les pièces et comment on documente. Elle ne dit jamais comment poser l’étiquette rouge : c’est le rôle d’une instruction de travail.',
          ],
        },
        {
          heading: 'Qu’est-ce qu’une instruction de travail ?',
          paragraphs: [
            'Une instruction de travail décrit une seule tâche, à un poste, étape par étape : les actions, les points clés, les outils, les EPI et les photos. En France, on l’appelle souvent mode opératoire.',
            'Elle s’adresse à la personne qui fait la tâche, au moment où elle la fait. Elle est donc très détaillée et très visuelle, et elle change plus souvent que la procédure : nouvel outil, nouvelle pièce, retour du plancher. On la lit debout, souvent avec des gants : une action par étape, une photo, peu de texte.',
            'Exemple : « Étiqueter et isoler une palette non conforme au poste d’emballage » montre où poser l’étiquette rouge, quoi y écrire et où déplacer la palette.',
          ],
        },
        {
          heading: 'La différence entre procédure et instruction de travail, en un coup d’œil',
          paragraphs: ['Les deux documents se complètent, mais ils ne répondent pas à la même question.'],
          list: {
            items: [
              'Portée : la procédure couvre un processus ; l’instruction, une tâche.',
              'Question : la procédure répond à quoi, qui, quand et pourquoi ; l’instruction, à comment.',
              'Lecteur : la procédure vise les responsables et les auditeurs ; l’instruction, l’opérateur au poste.',
              'Détail : la procédure reste générale ; l’instruction décrit chaque geste et ses critères.',
              'Forme : la procédure se lit comme un texte ou un logigramme ; l’instruction, comme une suite d’étapes illustrées.',
              'Mise à jour : la procédure change rarement ; l’instruction suit chaque changement au poste.',
            ],
          },
        },
        {
          heading: 'La pyramide documentaire',
          paragraphs: [
            'Beaucoup d’usines rangent leurs documents en quatre niveaux, du plus général au plus concret, chacun appuyé sur celui du dessus. Plus on descend, plus les documents sont nombreux et précis, et plus ils changent souvent. C’est un modèle pratique, pas une obligation : la norme ISO 9001 parle d’« informations documentées » et laisse à chaque organisation le choix de leur structure.',
            'Un exemple avec le cadenassage :',
          ],
          list: {
            ordered: true,
            items: [
              'Politique : l’engagement de la direction. « Personne n’intervient sur une machine sans l’avoir mise à l’énergie zéro. »',
              'Procédure : le programme de cadenassage. Qui peut cadenasser, avec quel matériel, quelle formation, quelles vérifications.',
              'Instruction de travail : la fiche de cadenassage de la presse P-12. Chaque source d’énergie, son dispositif d’isolement et la vérification de l’absence d’énergie.',
              'Formulaire et enregistrement : la feuille où l’on note chaque cadenas posé et retiré. C’est la preuve que le travail a été fait.',
            ],
          },
        },
        {
          heading: 'Deux autres exemples',
          paragraphs: [
            'En qualité, la procédure de contrôle à la réception dit quels lots on contrôle, qui le fait et ce qu’on fait d’un lot refusé. L’instruction de travail montre comment mesurer le diamètre d’un arbre au micromètre : où le prendre, combien de mesures, quelles limites.',
            'En maintenance, la procédure de maintenance préventive dit comment on planifie, qui exécute et comment on ferme un bon de travail. L’instruction de travail montre comment graisser les paliers du convoyeur C-3 : quelle graisse, quelle quantité, quels points, dans quel ordre.',
            'Remarquez la question que chaque document règle : la procédure organise, l’instruction montre.',
          ],
        },
        {
          heading: 'Laquelle écrire en premier ?',
          paragraphs: [
            'Si une procédure existe déjà, parce que votre système qualité ou un client l’exige, écrivez les instructions des tâches qu’elle couvre, en commençant par les plus risquées ou celles qui causent le plus d’erreurs.',
            'Si rien n’existe, commencez par le plancher. Rédigez d’abord les instructions des tâches qui font mal : blessures, défauts, savoir-faire détenu par une seule personne. Quand les pratiques sont stables, écrivez la procédure qui les relie. Vous saurez alors à quoi le processus ressemble vraiment, et pas seulement sur papier.',
            'Dans les deux cas, reliez-les : la procédure cite le numéro de ses instructions, et chaque instruction cite sa procédure. Et ne mélangez pas les niveaux : quand une procédure se met à décrire des gestes, cette partie appartient à une instruction de travail.',
          ],
        },
        {
          heading: 'Les pièges à éviter',
          paragraphs: ['Quelques erreurs brouillent la différence entre les deux documents :'],
          list: {
            items: [
              'Une procédure de cinquante pages qui décrit chaque geste : personne ne la lit, et elle vieillit à chaque changement au poste.',
              'Une instruction de travail qui recopie le but, la portée et les responsabilités de la procédure avant d’arriver à la première étape.',
              'Deux documents qui disent des choses différentes sur la même tâche.',
              'Des instructions sans numéro ni version, qu’une procédure ne peut pas citer.',
            ],
          },
        },
      ],
      faq: [
        {
          q: 'Une SOP et une procédure, est-ce la même chose ?',
          a: 'Le plus souvent, oui : SOP est l’abréviation anglaise de standard operating procedure. Certaines entreprises appellent pourtant SOP leurs instructions de travail. L’important est d’avoir des définitions claires dans votre propre système.',
        },
        {
          q: 'Une instruction de travail peut-elle exister sans procédure ?',
          a: 'Oui. Un petit atelier peut très bien fonctionner avec des instructions de travail seulement. La procédure devient utile quand plusieurs rôles ou services doivent se coordonner autour d’un même processus.',
        },
        {
          q: 'Qui rédige la procédure, et qui rédige l’instruction ?',
          a: 'La procédure revient au responsable du processus, souvent avec la qualité. L’instruction de travail se rédige au poste, avec la personne qui maîtrise la tâche et un superviseur ou quelqu’un des méthodes. Les deux sont approuvées avant d’être diffusées.',
        },
        {
          q: 'Mode opératoire et instruction de travail, est-ce différent ?',
          a: 'Non, sur le fond : les deux décrivent une tâche étape par étape. « Mode opératoire » est surtout employé en France. Choisissez un terme et gardez-le dans tous vos documents.',
        },
        {
          q: 'Combien de détails mettre dans une procédure ?',
          a: 'Assez pour savoir qui fait quoi, quand, et avec quel document. Dès que vous décrivez des gestes, des réglages ou des valeurs à respecter au poste, ce contenu appartient à une instruction de travail.',
        },
        {
          q: 'Où vont les formulaires et les enregistrements ?',
          a: 'Au bas de la pyramide. Un formulaire est un modèle vide, comme une feuille de relevé ; une fois rempli, il devient un enregistrement, la preuve que le travail a été fait. L’instruction de travail dit lequel remplir, et à quelle étape.',
        },
      ],
      cta: {
        title: 'Vos procédures, déclinées en instructions de travail',
        text: 'Avec Clip, l’expert filme la tâche en l’expliquant et l’IA rédige l’instruction étape par étape. Vos anciens documents servent aussi : déposez un PDF ou un document Word, l’IA en fait un brouillon structuré, prêt à relire.',
      },
    },

    onboarding: {
      keyword: 'former un nouvel employé en usine',
      title: 'Former un nouvel employé en usine : la méthode TWI',
      description: 'Préparer, présenter, faire essayer, suivre : former un nouvel employé au poste avec la méthode TWI, l’instruction de travail, des questions et une validation.',
      h1: 'Former un nouvel employé en usine, au poste, avec la méthode TWI',
      lead: 'Pour former un nouvel employé en usine, suivre un collègue ne suffit pas : il faut une méthode et un document. La méthode Job Instruction du TWI tient en quatre temps (préparer, présenter, faire essayer, suivre) et s’appuie sur une instruction de travail écrite.',
      minutes: 6,
      sections: [
        {
          heading: 'Pourquoi le jumelage seul ne suffit pas',
          paragraphs: [
            'Le jumelage, où la recrue suit un collègue d’expérience, est une façon répandue de former au poste. Il a ses limites : chaque formateur explique à sa façon, saute ce qui lui semble évident, transmet ses raccourcis avec ses bons gestes, et rien ne garde la trace de ce qui a été appris.',
            'Le TWI (Training Within Industry) est né aux États-Unis pendant la Seconde Guerre mondiale pour former vite un grand nombre de nouveaux travailleurs. Son volet Job Instruction apprend aux superviseurs et aux employés d’expérience à former les autres, toujours de la même façon. Sa carte se termine sur cette phrase : si la personne n’a pas appris, c’est que le formateur n’a pas enseigné.',
            'Le jumelage garde sa place : un collègue d’expérience reste un bon formateur, s’il suit la méthode et le même document que les autres.',
          ],
        },
        {
          heading: 'Avant la formation : se préparer',
          paragraphs: [
            'L’instruction de travail sert de décomposition de la tâche : bien faite, elle contient déjà les étapes importantes, leurs points clés et leurs raisons. Relisez-la au poste avant chaque formation, pour vérifier qu’elle dit encore ce qui se fait.',
            'La carte Job Instruction demande au formateur de se préparer en quatre points :',
          ],
          list: {
            items: [
              'Un échéancier : quelles compétences chaque personne doit avoir, et pour quelle date.',
              'La tâche décomposée : les étapes importantes, leurs points clés et leurs raisons. La sécurité est toujours un point clé.',
              'Tout le nécessaire prêt : outils, pièces, matériel et EPI.',
              'Le poste rangé comme la personne devra le garder.',
            ],
          },
        },
        {
          heading: 'Former un nouvel employé en usine en quatre étapes',
          paragraphs: ['Voici les quatre étapes telles que les décrit la carte Job Instruction, et ce qu’elles donnent au poste. Chacune compte : sauter l’essai, c’est découvrir les erreurs en production.'],
          list: {
            ordered: true,
            items: [
              'Préparer la personne. Mettez-la à l’aise, nommez la tâche, demandez ce qu’elle sait déjà, montrez à quoi sert la pièce, et placez-la là où elle voit bien vos mains.',
              'Présenter l’opération. Dites, montrez et illustrez une étape importante à la fois. Insistez sur chaque point clé et sa raison. N’en donnez pas plus que la personne peut retenir d’un coup : d’abord les étapes, puis les points clés, puis les raisons.',
              'Faire essayer. La personne fait la tâche et vous corrigez les erreurs. Puis elle la refait en expliquant chaque étape, chaque point clé et sa raison. Continuez jusqu’à ce que vous sachiez qu’elle sait.',
              'Suivre. Laissez-la travailler seule, dites-lui à qui demander de l’aide, passez souvent et encouragez les questions. Espacez ensuite le suivi, peu à peu.',
            ],
          },
        },
        {
          heading: 'Former au poste, avec l’instruction de travail',
          paragraphs: [
            'Formez au vrai poste, sur de vraies pièces, et laissez la cadence monter peu à peu jusqu’au rythme normal. L’instruction de travail sert de fil conducteur : chaque formateur la suit, alors chaque recrue apprend la même chose.',
            'Après la formation, la personne garde l’instruction comme référence au poste. Si un formateur fait la tâche autrement que ce qui est écrit, ne laissez pas passer : soit l’instruction est à corriger, soit la pratique l’est.',
            'Choisissez des formateurs qui maîtrisent la tâche et qui ont envie de transmettre, et donnez-leur la méthode. Bien faire et bien enseigner sont deux compétences différentes.',
          ],
        },
        {
          heading: 'Vérifier la compréhension en quelques questions',
          paragraphs: [
            'Pendant l’essai, la personne montre qu’elle sait faire. Quelques questions montrent qu’elle a compris pourquoi. Trois à cinq questions sur les points clés et leurs raisons suffisent : « Pourquoi serre-t-on en croix ? », « Que faites-vous si la cote est hors limites ? »',
            'Questionnez sur ce qui peut mal tourner, pas sur des détails à apprendre par cœur. Une mauvaise réponse n’est pas une faute : c’est le signal qu’il faut réexpliquer ce point. Posez les questions au poste, devant la pièce : la personne peut montrer autant que dire.',
          ],
        },
        {
          heading: 'La validation par le superviseur',
          paragraphs: [
            'Avant de déclarer une personne qualifiée, un superviseur la regarde faire la tâche seule, au poste : de façon sécuritaire, avec la qualité attendue et au rythme normal. Il signe et date la validation.',
            'Notez à quelle version de l’instruction elle se rapporte. Une échelle simple aide à suivre la progression : en formation, qualifiée, peut former.',
            'Si la personne n’y arrive pas encore, ce n’est pas un échec : reprenez la présentation sur l’étape qui accroche, puis refaites l’essai.',
          ],
        },
        {
          heading: 'Garder la trace, et re-former quand l’instruction change',
          paragraphs: [
            'Pour chaque formation, gardez qui, quelle tâche ou quel poste, quelle version de l’instruction, la date et qui a validé. Un tableau ou une fiche signée suffit, pourvu qu’on les retrouve vite. Ces traces alimentent la matrice de compétences : elles disent qui peut remplacer qui.',
            'Quand une instruction change sur un point qui compte (une étape, un point clé, la sécurité), re-formez les personnes concernées. Montrer ce qui a changé, puis refaire l’essai, suffit souvent. Pour une tâche rare ou critique, prévoyez aussi une revalidation à intervalle fixe.',
          ],
        },
      ],
      faq: [
        {
          q: 'Combien de temps faut-il pour former un nouvel opérateur ?',
          a: 'Cela dépend de la tâche, d’où l’échéancier du TWI : pour chaque personne, quelles tâches, pour quelle date. Formez en courtes séances, une tâche à la fois, et passez à la suivante quand l’essai est réussi.',
        },
        {
          q: 'Qui devrait former : le superviseur ou un opérateur d’expérience ?',
          a: 'L’un ou l’autre. La méthode Job Instruction a été conçue pour les superviseurs comme pour les employés d’expérience. Ce qui compte, c’est de maîtriser la tâche et la méthode.',
        },
        {
          q: 'Que faire si la personne lit difficilement le français ?',
          a: 'Montrez plus que vous ne dites : photos, extraits vidéo, démonstration. Donnez-lui l’instruction dans sa langue si possible, et vérifiez la compréhension en lui faisant faire et expliquer la tâche, pas par un test écrit.',
        },
        {
          q: 'Faut-il une formation en sécurité avant le poste ?',
          a: 'Oui. L’accueil couvre les règles de l’usine, les urgences et les EPI. Au poste, la sécurité reste un point clé de chaque tâche, expliqué au moment où il compte.',
        },
        {
          q: 'Comment savoir si la formation a fonctionné ?',
          a: 'La personne fait la tâche seule, sans erreur, de façon sécuritaire et au rythme normal. Pendant le suivi, regardez la qualité de ses premières pièces et les questions qu’elle pose encore.',
        },
        {
          q: 'Et pour une recrue qui a déjà de l’expérience ?',
          a: 'Gardez la méthode, mais allez plus vite là où elle sait déjà : c’est le but de demander ce qu’elle connaît, à la première étape. Insistez sur vos points clés, car les façons de faire changent d’une usine à l’autre, même pour un métier connu.',
        },
      ],
      cta: {
        title: 'Former au poste, une étape à la fois',
        text: 'Avec Clip, la personne suit l’instruction sur la tablette du poste et fait lire chaque étape à voix haute. À la fin, quelques questions préparées par l’IA et retouchées par l’auteur ; réussies, la formation est notée.',
      },
    },

    skillsMatrix: {
      keyword: 'matrice de compétences',
      title: 'Matrice de compétences en usine : comment la bâtir',
      description: 'Personnes et postes, niveaux, couverture par quart, revalidation et erreurs à éviter : comment bâtir et tenir à jour une matrice de compétences en usine.',
      h1: 'Matrice de compétences : qui sait faire quoi, à quel poste',
      lead: 'Une matrice de compétences croise les personnes et les postes, et dit pour chaque case où en est la personne : en formation, qualifiée ou capable de former. Bien tenue, elle montre d’un coup d’œil les trous de chaque quart et qui former en premier.',
      minutes: 6,
      sections: [
        {
          heading: 'À quoi sert une matrice de compétences ?',
          paragraphs: [
            'En usine, on l’appelle aussi matrice de polyvalence. C’est un tableau simple qui répond à des questions de tous les jours : qui peut remplacer quelqu’un au poste de soudure cette fin de semaine ? Qui former avant le départ à la retraite de l’expert de la presse 4 ? Ce quart a-t-il assez de monde qualifié pour démarrer la ligne ?',
            'Elle sert aussi à planifier la formation et à montrer, lors d’un audit, qui est qualifié pour quoi. Elle dit ce qu’une personne est qualifiée pour faire, pas si c’est un bon employé : ce n’est pas une évaluation du rendement. Elle ne remplace pas la formation : elle dit où la mettre.',
          ],
        },
        {
          heading: 'Les lignes et les colonnes',
          paragraphs: [
            'Mettez les personnes en lignes, regroupées par quart ou par équipe, dans l’ordre alphabétique : l’attention va à la couverture, pas au classement. Mettez les postes ou les tâches en colonnes, regroupés par ligne de production ou par secteur.',
            'Choisissez le bon niveau de détail. Le poste suffit quand ses tâches vont ensemble. Séparez les tâches quand elles demandent des qualifications différentes : conduire la machine, faire le changement de format, la nettoyer à fond. Vos instructions de travail donnent une bonne liste de départ ; regroupez celles qui vont toujours ensemble.',
            'Ajoutez un total au bas de chaque colonne (combien de personnes qualifiées par poste) et au bout de chaque ligne (combien de postes par personne).',
          ],
        },
        {
          heading: 'Des niveaux simples et vérifiables',
          paragraphs: [
            'Trois ou quatre niveaux suffisent ; au-delà, la note devient une affaire d’opinion. Écrivez la définition de chaque niveau en tête de la matrice, pour que tous les superviseurs notent de la même façon.',
            'Chaque niveau a un critère qu’on peut observer, et le passage à « qualifié » se fait après une observation au poste par un superviseur, jamais sur une autoévaluation seule. Un exemple d’échelle :',
          ],
          list: {
            items: [
              'Niveau 0 : pas formé.',
              'Niveau 1 : en formation, fait la tâche avec quelqu’un à côté.',
              'Niveau 2 : qualifié, fait la tâche seul, de façon sécuritaire, avec la qualité et au rythme attendus.',
              'Niveau 3 : peut former, maîtrise la tâche et sait l’enseigner.',
            ],
          },
        },
        {
          heading: 'Comment bâtir une matrice de compétences, étape par étape',
          paragraphs: ['Un tableur suffit pour commencer. Ce qui compte, c’est la méthode :'],
          list: {
            ordered: true,
            items: [
              'Commencez par une ligne ou un secteur, pas par toute l’usine.',
              'Listez les postes et les tâches qui demandent une qualification, à partir de vos instructions de travail.',
              'Listez les personnes, par quart.',
              'Définissez les niveaux et qui les valide.',
              'Remplissez à partir de preuves : formations notées, validations au poste. Pas de mémoire.',
              'Fixez le besoin : combien de personnes qualifiées il faut par poste et par quart.',
              'Repérez les écarts et planifiez les formations, les plus urgentes d’abord.',
              'Mettez la matrice à jour à chaque formation, arrivée, départ ou nouvelle version d’instruction.',
            ],
          },
        },
        {
          heading: 'La couverture par quart',
          paragraphs: [
            'Une matrice qui a l’air complète peut cacher un quart fragile. Comptez les personnes qualifiées pour chaque poste, quart par quart, en regardant aussi les nuits, les fins de semaine et les vacances.',
            'Fixez une règle simple, par exemple au moins deux personnes qualifiées par poste et par quart : une absence ne doit pas arrêter la ligne. Cherchez ensuite les points faibles : un poste qu’une seule personne sait tenir, ou une personne qui est la seule qualifiée à plusieurs postes. C’est là que la formation croisée rapporte le plus : formez une deuxième personne à ces postes avant d’en former une troisième ailleurs.',
            'Une couleur par niveau aide à lire la matrice d’un coup d’œil. Ajoutez une ligne « besoin » sous chaque colonne et marquez en rouge les postes où le compte n’y est pas. Vérifiez la couverture avant d’accepter des vacances ou de déplacer du monde d’une ligne à l’autre, pas après.',
          ],
        },
        {
          heading: 'Revalider les qualifications',
          paragraphs: [
            'Une compétence qu’on ne pratique pas s’use : une personne qualifiée sur un changement de format qu’elle a fait il y a un an ne l’est peut-être plus. Fixez un intervalle de revalidation selon le risque, par exemple six mois pour une tâche critique pour la sécurité, douze ou vingt-quatre mois pour les autres. Une revalidation qui approche se planifie comme une formation.',
            'Revalidez aussi quand une personne n’a pas fait la tâche depuis longtemps, et quand l’instruction change sur un point qui compte. La revalidation n’est pas un cours : une observation au poste et quelques questions suffisent souvent. Notez dans chaque case la date de la dernière validation : la matrice montre alors ce qui arrive à échéance.',
          ],
        },
        {
          heading: 'Les erreurs courantes',
          paragraphs: ['Ce qui fait échouer une matrice de compétences :'],
          list: {
            items: [
              'Des centaines de colonnes, que personne ne tient à jour.',
              'Des niveaux flous, que chacun interprète à sa façon.',
              'Des cases remplies de mémoire ou par autoévaluation.',
              'Aucune mise à jour après une formation ou une nouvelle version d’instruction.',
              'Un affichage en palmarès : la matrice décrit des qualifications, pas des performances.',
              'Des quarts ignorés, qui cachent un poste tenu par une seule personne la nuit.',
              'Une matrice tenue par une seule personne, dans un fichier que les superviseurs ne voient pas.',
            ],
          },
        },
      ],
      faq: [
        {
          q: 'Quelle différence entre matrice de compétences et matrice de formation ?',
          a: 'La matrice de formation suit les formations suivies ; la matrice de compétences dit qui peut vraiment faire la tâche, après validation. On tient souvent un seul tableau pour les deux. Retenez qu’une formation suivie ne veut pas dire qualifié.',
        },
        {
          q: 'Combien de niveaux utiliser ?',
          a: 'Trois ou quatre. Au-delà, l’écart entre deux niveaux devient une affaire d’opinion. L’échelle ILUO, connue dans les usines qui pratiquent le lean, en compte quatre ; l’important est que chaque niveau ait un critère observable.',
        },
        {
          q: 'Un tableur suffit-il ?',
          a: 'Pour une ligne ou une petite équipe, oui. Avec des dizaines de personnes et des instructions qui changent, le plus dur est de la tenir à jour : reliez-la aux formations notées plutôt que de la remplir à la main. Sinon, la matrice finit par décrire l’équipe de l’an dernier.',
        },
        {
          q: 'Qui tient la matrice à jour ?',
          a: 'Un responsable par secteur ou par quart, souvent le superviseur. Revoyez-la à date fixe, par exemple à la réunion mensuelle de l’équipe, et après chaque formation.',
        },
        {
          q: 'Peut-on afficher la matrice au plancher ?',
          a: 'Oui, si elle sert à planifier et non à classer les gens. Triez par ordre alphabétique, montrez des qualifications plutôt que des notes, et expliquez à l’équipe à quoi elle sert.',
        },
        {
          q: 'Qui former en premier ?',
          a: 'Commencez par les postes qu’une seule personne sait tenir, puis par les quarts sous le besoin, puis par les départs connus, comme une retraite. Choisissez de préférence des personnes qui tiennent déjà un poste voisin : elles partent avec une partie des gestes.',
        },
      ],
      cta: {
        title: 'Qui est formé, et à quel poste',
        text: 'Dans Clip, une formation réussie au poste est notée, et la matrice de compétences croise personnes et postes. Quand une instruction change, la nouvelle version peut demander de se re-former.',
      },
    },
  },
}
