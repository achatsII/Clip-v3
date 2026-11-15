/**
 * Les textes du site public, en français du Québec (la langue source). L'anglais (`en.ts`) a
 * exactement les mêmes clés : le contrôle de types y veille, et `tests/site-content.test.ts` refuse
 * un texte vide, une phrase copiée ou un titre trop long.
 *
 * Règles :
 * - aucun prix, forfait ni quantité du catalogue ici : ils viennent du manifeste (`pricing.ts`) ;
 *   un texte qui en a besoin le reçoit par un jeton (`{credits}`), rempli au rendu ;
 * - les faits du produit (`{languages}`…) sont lus dans le code et remplis par `content()` ;
 * - aucune fonction : les textes passent aux composants client, qui ne reçoivent que des valeurs ;
 * - rien qui ne soit dans l'app (VISION.md) ; aucune note, aucun client, aucun témoignage inventé ;
 *   jamais la valeur en argent d'un crédit d'IA.
 */

export const fr = {
  brand: {
    name: 'Clip',
    wordmark: 'CLIP',
    tagline: 'Instructions de travail par l’IA',
    poweredBy: 'Propulsé par',
    company: 'Intelligence Industrielle',
    companyUrl: 'https://www.intelligenceindustrielle.com',
    privacyUrl: 'https://www.intelligenceindustrielle.com/privacy-policy',
  },

  a11y: {
    skip: 'Aller au contenu',
    home: 'Clip, accueil du site',
    mainNav: 'Navigation principale',
    menu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    breadcrumb: 'Fil d’Ariane',
    switchLang: 'Read this page in English',
    pause: 'Mettre la vidéo en pause',
    play: 'Lire la vidéo',
    close: 'Fermer',
    newTab: 'nouvel onglet',
    footerNav: 'Liens du site',
    included: 'Inclus',
    notIncluded: 'Non inclus',
  },

  nav: {
    features: 'Fonctionnalités',
    solutions: 'Solutions',
    pricing: 'Tarifs',
    login: 'Se connecter',
    langShort: 'EN',
    langName: 'English',
    solutionsTitle: 'Clip pour votre usine',
  },

  cta: {
    trial: 'Essayer gratuitement',
    book: 'Réserver une démo',
    film: 'Voir le film',
    filmLength: '1 min',
    pricing: 'Voir les tarifs',
    features: 'Voir toutes les fonctions',
    noCard: 'Forfait gratuit, sans date de fin',
    bookHint: 'Une rencontre en ligne avec notre équipe',
  },

  /** Le menu Solutions et les liens entre pages. */
  solutions: {
    knowledge: { menu: 'Transfert de savoir-faire', teaser: 'Captez ce que vos experts savent avant leur retraite.' },
    training: { menu: 'Formation des opérateurs', teaser: 'Formez au poste, une étape à la fois.' },
    lockout: { menu: 'Cadenassage et SST', teaser: 'Des fiches de cadenassage claires, au pied de la machine.' },
    translation: { menu: 'Traduction des instructions', teaser: 'Chaque opérateur lit dans sa langue.' },
  },

  breadcrumb: { home: 'Accueil', solutions: 'Solutions' },

  /** Titre (≤ 60 caractères) et description (≤ 155) de chaque page. */
  meta: {
    home: {
      title: 'Clip — Instructions de travail générées par l’IA',
      description: 'Filmez l’expert pendant qu’il explique : Clip rédige l’instruction de travail étape par étape, la traduit et l’affiche au poste, sans compte.',
    },
    features: {
      title: 'Fonctionnalités de Clip — Capturer, générer, déployer',
      description: 'Capturer, générer, retoucher, traduire, approuver, déployer au poste et exporter en PDF : toutes les fonctions de Clip, avec des démos.',
    },
    pricing: {
      title: 'Tarifs de Clip — Forfaits et crédits d’IA',
      description: 'Des forfaits clairs en dollars canadiens, du gratuit à l’usine entière. Les opérateurs ne sont jamais facturés. À l’année, {freeMonths} mois offerts.',
    },
    knowledge: {
      title: 'Transfert de savoir-faire avant la retraite — Clip',
      description: 'Vos experts partent à la retraite ? Filmez-les pendant qu’ils expliquent : Clip en fait des instructions de travail claires, au poste.',
    },
    training: {
      title: 'Formation des opérateurs au poste — Clip',
      description: 'Formez vos opérateurs au poste : instructions visuelles, lecture à voix haute et quelques questions à la fin pour valider. Sans compte.',
    },
    lockout: {
      title: 'Fiches de cadenassage et SST — Clip',
      description: 'Des fiches de cadenassage claires au pied de la machine : sources d’énergie, dispositifs d’isolement, vérification, EPI et mises en garde.',
    },
    translation: {
      title: 'Traduction des instructions de travail — Clip',
      description: 'Traduisez vos instructions de travail dans {languages} langues, textes et images compris. Chaque opérateur choisit sa langue au poste.',
    },
    book: {
      title: 'Réserver une démo de Clip',
      description: 'Choisissez un moment : notre équipe vous montre Clip, de la vidéo de l’expert à la tablette du poste, et répond à vos questions.',
    },
  },

  /** Le texte des images Open Graph (court) et leur texte de remplacement. */
  og: {
    alt: 'Clip, instructions de travail générées par l’IA',
    kicker: 'Instructions de travail par l’IA',
    home: 'Le savoir-faire de vos experts, au poste, en quelques minutes.',
    features: 'Capturer, générer, traduire, déployer au poste.',
    pricing: 'Les opérateurs ne sont jamais comptés.',
    knowledge: 'Captez le savoir-faire avant la retraite.',
    training: 'Formez vos opérateurs au poste.',
    lockout: 'Des fiches de cadenassage claires.',
    translation: 'Chaque opérateur lit dans sa langue.',
    book: 'Voyez Clip avec notre équipe.',
  },

  home: {
    hero: {
      pill: 'L’IA rédige, vous approuvez',
      h1: { before: 'Le savoir-faire de vos experts, ', highlight: 'au poste', after: ', en quelques minutes.' },
      sub: 'Filmez l’expert pendant qu’il explique. Clip rédige l’instruction de travail étape par étape, la traduit dans la langue de vos opérateurs et l’affiche sur la tablette du poste.',
      trust: ['Sans compte au poste', 'Opérateurs jamais facturés', 'Web, iPhone et Android'],
      videoLabel: 'Aperçu de Clip : la capture au téléphone, l’instruction rédigée par l’IA, puis le pas-à-pas au poste.',
      chips: ['Vidéo 720p, légère', 'D’habitude moins de 2 minutes', '{languages} langues au poste'],
    },
    problem: {
      eyebrow: 'Le constat',
      lead: 'D’ici 2030,',
      stat: 'de 20 à 30 %',
      statLine: 'des technologues partiront à la retraite.',
      kicker: 'Leur savoir-faire n’est écrit nulle part.',
      photoAlt: 'Un machiniste d’expérience explique le fonctionnement de sa machine (image d’illustration).',
      photoTag: 'Son savoir-faire : nulle part par écrit',
      timeline: ['Aujourd’hui', '2030'],
      pains: [
        {
          icon: 'brain',
          title: 'Le savoir part avec les gens',
          text: 'Les réglages fins, les trucs du métier, les « attention à… » : tout est dans la tête de vos experts. Quand ils partent, il faut tout réapprendre.',
        },
        {
          icon: 'binder',
          title: 'Les cartables ne sont jamais à jour',
          text: 'Rédiger une procédure dans Word prend des heures. Les photos sont éparpillées, la version au poste est périmée, et personne ne la lit.',
        },
        { icon: 'clock', title: 'Former prend trop de temps', text: 'Un nouvel opérateur suit un collègue pendant des semaines. Chacun explique à sa façon, et souvent dans une seule langue.' },
      ],
    },
    how: {
      eyebrow: 'Comment ça marche',
      title: 'Trois temps, une instruction prête pour le plancher.',
      steps: [
        {
          eyebrow: 'Capturer',
          title: 'Filmez l’expert pendant qu’il explique.',
          text: 'Avec son téléphone, dans l’app : la vidéo, des photos, une note vocale. Ajoutez vos vieux PDF et documents Word. La vidéo reste légère, en 720p.',
          alt: 'Une technicienne filme un machiniste avec son téléphone, puis ses notes s’ajoutent dans Clip.',
        },
        {
          eyebrow: 'Générer',
          title: 'L’IA rédige l’instruction.',
          text: 'Une action par étape, le bon extrait vidéo à la seconde près, les mises en garde et les équipements de protection au bon moment. D’habitude en moins de 2 minutes.',
          alt: 'Clip analyse les notes, puis affiche l’instruction rédigée, étape par étape.',
        },
        {
          eyebrow: 'Déployer au poste',
          title: 'Sur la tablette, sans compte.',
          text: 'Publiez, puis affichez l’instruction sur la tablette du poste ou par code QR. L’opérateur trouve la sienne en un toucher.',
          alt: 'Un opérateur suit l’instruction sur la tablette fixée à sa machine.',
        },
      ],
    },
    demo: {
      eyebrow: 'Essayez-le',
      title: 'Voyez l’IA rédiger une instruction.',
      text: 'Cinq notes prises au téléphone, un seul bouton. Voici ce que Clip en fait.',
    },
    showcase: {
      eyebrow: 'Après la génération',
      title: 'Rédiger, c’est le début. Clip garde l’instruction vivante.',
      rows: [
        {
          key: 'edit',
          eyebrow: 'Retoucher, annoter, traduire',
          title: 'Corrigez d’un mot. Annotez d’un clic.',
          text: 'Demandez à l’assistant : « simplifie », « ajoute les gants ». L’IA place les flèches et les cercles sur la photo, puis traduit l’instruction dans la langue de chaque opérateur.',
          points: ['L’assistant modifie sous vos yeux ; un clic pour annuler', 'Annotations par l’IA, ajustables au crayon', '{languages} langues, légendes et schémas compris'],
          alt: 'L’assistant d’édition modifie une étape, puis l’IA annote une photo et l’instruction s’affiche traduite sur un téléphone.',
        },
        {
          key: 'modernize',
          eyebrow: 'Moderniser',
          title: 'Vos vieilles procédures, remises à neuf.',
          text: 'Déposez un PDF ou un document Word : l’IA en fait un brouillon structuré, étape par étape, prêt à relire. Avec l’import en lot, déposez-en des dizaines d’un coup.',
          points: ['Un document, un brouillon à relire', 'Rien n’est publié sans vous', 'Import en lot avec {plans:bulk_import}'],
          alt: 'Un vieux cartable de procédures, puis des dizaines de documents importés dans Clip.',
        },
        {
          key: 'approve',
          eyebrow: 'Approuver et publier',
          title: 'Rien n’est publié sans votre accord.',
          text: 'L’approbateur voit ce qui a changé et approuve d’un clic. La nouvelle version remplace l’ancienne partout : même tablette, même code QR, même lien.',
          points: ['Une personne approuve, ou chaque groupe signe', 'Historique des versions', 'Tablettes et codes QR toujours à jour'],
          alt: 'Une approbatrice voit les étapes modifiées, approuve et publie la nouvelle version.',
        },
        {
          key: 'station',
          eyebrow: 'Au poste',
          title: 'Un pas-à-pas qui se comprend sans lire.',
          text: 'Grosses images, le bon extrait vidéo, une action à la fois. L’opérateur fait lire l’étape à voix haute et signale ce qui n’est pas clair en deux touchers.',
          points: ['Lecture à voix haute, à tous les forfaits', 'Pas clair, erreur, danger, idée : le retour va à qui a rédigé', 'Assistant vocal au poste avec {plans:voice_assistant}'],
          alt: 'Démo du lecteur au poste : une instruction étape par étape sur une tablette.',
        },
        {
          key: 'export',
          eyebrow: 'Exporter',
          title: 'Un PDF propre, en un clic.',
          text: 'PDF et JSON à tous les forfaits : vos instructions vous appartiennent. Le PDF porte un code QR qui mène à la version à jour.',
          points: ['Chaque instruction, à tous les forfaits', 'Logo et couleurs de l’usine avec {plans:brand_kit}', 'Export complet avec {plans:full_export}'],
          alt: 'L’instruction exportée en PDF, avec ses photos et son code QR.',
        },
      ],
      tryIt: 'Essayez le poste',
    },
    roles: {
      eyebrow: 'Pour qui',
      title: 'Un seul outil pour l’usine, pensé pour chaque rôle.',
      items: [
        { icon: 'pen', title: 'Méthodes et ingénierie', text: 'Documentez des dizaines de postes sans jamais refaire une mise en page. Les retours du plancher arrivent avec l’étape en cause.' },
        { icon: 'hand', title: 'Opérateurs', text: 'La bonne instruction au bon poste, de grosses images, la vidéo au bon moment et la lecture à voix haute. Sans compte ni mot de passe.' },
        { icon: 'wrench', title: 'Maintenance', text: 'Scannez le code QR de l’équipement : ses procédures et sa fiche de cadenassage d’abord. Capturez la réparation que vous seul savez faire.' },
        { icon: 'shield', title: 'Qualité et SST', text: 'Rien de faux ni de dangereux n’est publié : approbation, versions, mises en garde, et un avis dès qu’un opérateur signale un danger.' },
        { icon: 'chart', title: 'Direction', text: 'Standardisez le travail, formez plus vite et voyez ce qui est consulté, ce qui est signalé et le temps gagné.' },
      ],
    },
    facts: {
      eyebrow: 'Ce qui est vrai',
      title: 'Des faits, pas des promesses.',
      items: [
        { value: '0', label: 'compte à créer pour vos opérateurs : tablette, code QR ou lien' },
        { value: '{languages}', label: 'langues pour les opérateurs, de droite à gauche comprises' },
        { value: '< 2 min', label: 'pour générer une instruction, d’habitude' },
        { value: 'PDF', label: 'et JSON à tous les forfaits : vos instructions vous appartiennent' },
      ],
    },
    pricing: {
      eyebrow: 'Tarifs',
      title: 'Commencez gratuitement. Grandissez avec l’usine.',
      text: 'Vous payez la création, les postes et l’IA, jamais la consultation : opérateurs et lecteurs ne sont pas comptés.',
      link: 'Comparer les forfaits',
    },
    faq: {
      eyebrow: 'Questions fréquentes',
      title: 'Vos questions, nos réponses.',
      items: [
        {
          q: 'Qu’est-ce que Clip ?',
          a: 'Une application qui transforme les explications de vos experts (vidéo, photos, notes vocales, anciens documents) en instructions de travail claires, étape par étape, consultées au poste sur tablette, téléphone ou code QR.',
        },
        {
          q: 'Combien de temps faut-il pour créer une instruction ?',
          a: 'Filmer prend le temps de la tâche. La génération prend d’habitude moins de 2 minutes. Vous relisez, corrigez d’un mot et publiez.',
        },
        {
          q: 'Mes opérateurs ont-ils besoin d’un compte ?',
          a: 'Non. Tablette du poste, code QR ou lien direct, sans nom d’utilisateur ni mot de passe. Les opérateurs et les lecteurs ne sont jamais comptés dans le prix.',
        },
        { q: 'L’IA publie-t-elle toute seule ?', a: 'Non. L’IA propose, vous décidez : rien n’est publié sans un geste humain, et vous pouvez exiger une approbation avec {plans:approvals}.' },
        {
          q: 'Puis-je reprendre mes anciennes procédures ?',
          a: 'Oui. Déposez un PDF ou un document Word dans une nouvelle instruction, à tous les forfaits. Avec {plans:bulk_import}, l’import en lot en traite des dizaines d’un coup.',
        },
        {
          q: 'Dans quelles langues ?',
          a: 'Clip s’utilise en français et en anglais. Avec {plans:translations}, vos instructions se traduisent dans {languages} langues pour les opérateurs, y compris celles qui s’écrivent de droite à gauche.',
        },
        {
          q: 'Mes instructions m’appartiennent-elles ?',
          a: 'Oui. Chaque instruction s’exporte en PDF et en JSON, à tous les forfaits. Avec {plans:full_export}, l’export complet les prend toutes d’un coup.',
        },
        {
          q: 'Qu’est-ce qu’un crédit d’IA ?',
          a: 'L’IA se paie à son coût réel : chaque réponse est débitée, une fois terminée, de ce qu’elle a vraiment coûté, et le nombre de crédits s’affiche après. Générer une instruction à partir de beaucoup de vidéo coûte plus qu’une retouche d’étape. Chaque forfait donne une banque de crédits par mois.',
        },
        { q: 'Sur quels appareils ?', a: 'Dans le navigateur, sur ordinateur, tablette et téléphone, et dans l’app mobile pour iPhone et Android, faite pour la capture.' },
        {
          q: 'Clip remplace-t-il notre LMS ou notre MES ?',
          a: 'Non. Clip fait les instructions de travail et vérifie la compréhension au poste. Il se branche sur vos numéros (codes, étiquettes, codes QR) sans remplacer vos systèmes.',
        },
      ],
    },
    final: {
      title: 'Captez le savoir-faire avant qu’il parte à la retraite.',
      text: 'Une première instruction en quelques minutes. Vos opérateurs la trouvent au bon poste.',
    },
  },

  features: {
    eyebrow: 'Fonctionnalités',
    h1: 'Tout ce que fait Clip, du téléphone de l’expert à la tablette du poste.',
    sub: 'Capturer, générer, retoucher, traduire, approuver, déployer, suivre et exporter. Les fonctions réservées à un forfait le disent.',
    jump: 'Aller à une section',
    planBadge: 'Avec {plans}',
    groups: [
      {
        id: 'capturer',
        nav: 'Capturer',
        title: 'Tout ce que sait l’expert, pris sur le vif.',
        text: 'L’expert explique comme à un collègue ; Clip garde tout.',
        media: 'capture',
        items: [
          { title: 'Vidéo, photos, notes vocales', text: 'Dans l’app mobile ou le navigateur. Déposez aussi une vidéo filmée avec une autre caméra.', feature: '' },
          { title: 'Des médias légers', text: 'Vidéo en 720p et photos de 1920 px au plus : environ 19 Mo la minute plutôt que 400 Mo en 4K.', feature: '' },
          { title: 'Vos anciens documents', text: 'Ajoutez un PDF ou un document Word à vos notes : l’IA s’en sert pour rédiger.', feature: '' },
        ],
      },
      {
        id: 'generer',
        nav: 'Générer',
        title: 'Un bouton, une instruction structurée.',
        text: 'L’IA regarde la vidéo, écoute les notes et lit les documents.',
        media: 'generateDemo',
        items: [
          { title: 'Une action par étape', text: 'Titres courts, texte clair, points clés et mises en garde à leur niveau : danger, attention, bon à savoir.', feature: '' },
          { title: 'Le bon extrait vidéo', text: 'Chaque étape garde le bon extrait de votre vidéo, à la seconde près.', feature: '' },
          { title: 'Classée d’office', text: 'Catégorie, équipement, durée, EPI et outils : l’IA les propose, vous confirmez.', feature: '' },
          { title: 'Votre standard de rédaction', text: '« On commence toujours par la sécurité » : décrivez vos règles une fois, l’IA les suit à chaque instruction.', feature: '' },
        ],
      },
      {
        id: 'retoucher',
        nav: 'Retoucher',
        title: 'Corrigez d’un mot, montrez d’un clic.',
        text: 'L’IA propose, vous gardez la main à chaque étape.',
        media: 'annotateDemo',
        items: [
          { title: 'Assistant d’édition', text: '« Simplifie l’étape 3 », « ajoute les gants » : l’assistant modifie l’instruction sous vos yeux.', feature: '' },
          { title: 'Annotations par l’IA', text: 'Flèches et cercles sur ce qu’il faut voir, ajustables au crayon, à la flèche ou au texte.', feature: '' },
          { title: 'Illustrations et schémas', text: 'Une illustration claire tirée d’une photo, ou un schéma généré quand une photo ne suffit pas.', feature: '' },
          { title: 'Annuler, rétablir, revenir', text: 'Chaque modification s’annule, et des points de retour gardent vos versions de travail.', feature: '' },
          { title: 'Blocs communs', text: 'Les étapes qui se répètent (cadenassage, démarrage) rédigées une fois, à jour partout.', feature: 'shared_blocks' },
        ],
      },
      {
        id: 'traduire',
        nav: 'Traduire',
        title: 'Dans la langue de chaque opérateur.',
        text: 'Une instruction, toutes les langues de votre équipe.',
        media: 'edit',
        items: [
          { title: '{languages} langues', text: 'De l’espagnol au tagalog, de l’arabe au pendjabi, y compris celles qui s’écrivent de droite à gauche.', feature: 'translations' },
          { title: 'Les médias aussi', text: 'Légendes, annotations et texte des schémas sont traduits ; en option, les images refaites avec leur texte traduit.', feature: 'translations' },
          { title: 'Au poste, chacun choisit', text: 'L’opérateur choisit sa langue sur la tablette ; la lecture à voix haute suit.', feature: 'translations' },
        ],
      },
      {
        id: 'moderniser',
        nav: 'Moderniser',
        title: 'Vos cartables, remis à neuf.',
        text: 'Les procédures d’hier deviennent des instructions d’aujourd’hui.',
        media: 'modernize',
        items: [
          { title: 'Un document, un brouillon', text: 'Chaque PDF ou Word devient un brouillon structuré, étape par étape, prêt à relire.', feature: '' },
          { title: 'Par dizaines', text: 'L’import en lot traite vos anciennes procédures d’un coup.', feature: 'bulk_import' },
          { title: 'Rien n’est publié sans vous', text: 'Les brouillons attendent votre relecture.', feature: '' },
        ],
      },
      {
        id: 'approuver',
        nav: 'Approuver',
        title: 'Le bon contrôle, sans ralentir l’équipe.',
        text: 'Chaque usine choisit ses règles : une personne approuve, plusieurs signent, ou personne.',
        media: 'deploy',
        items: [
          { title: 'Approbation avant publication', text: 'Une personne approuve, ou chaque groupe signe : qualité, SST, chef d’atelier.', feature: 'approvals' },
          { title: 'Ce qui a changé', text: 'L’approbateur voit les modifications avant d’approuver, ou demande une correction.', feature: '' },
          { title: 'Versions', text: 'Chaque publication crée une version ; l’historique se garde.', feature: '' },
          { title: 'Toujours la version publiée', text: 'Tablettes, codes QR et liens montrent la version publiée, jamais le brouillon.', feature: '' },
        ],
      },
      {
        id: 'deployer',
        nav: 'Déployer',
        title: 'La bonne instruction, au bon poste.',
        text: 'Sans compte ni mot de passe pour les opérateurs.',
        media: 'station',
        items: [
          { title: 'La tablette du poste', text: 'Un lien par poste : la tablette montre d’abord ses instructions, ou seulement les siennes.', feature: '' },
          { title: 'Code QR et lien direct', text: 'Un code QR imprimé mène toujours à la version à jour : rien à réimprimer.', feature: '' },
          { title: 'Qui est à la tablette', text: 'Chaque personne de l’équipe a un nom et un code à 4 chiffres, sans compte : le registre sait qui a fait quoi.', feature: '' },
        ],
      },
      {
        id: 'au-poste',
        nav: 'Au poste',
        title: 'Pensé pour le plancher : debout, avec des gants.',
        text: 'Média géant, une action par étape, gros boutons.',
        media: 'playerDemo',
        items: [
          { title: 'Lecture à voix haute', text: 'Chaque étape se fait lire, dans la langue choisie au poste.', feature: '' },
          { title: 'Signaler en deux touchers', text: 'Pas clair, erreur, danger, idée : avec une photo si on veut. Le retour va à la personne qui a rédigé.', feature: '' },
          { title: 'Relevés et formation', text: 'Une étape peut demander une mesure ou une photo ; quelques questions à la fin valident la formation.', feature: '' },
          { title: 'Assistant vocal', text: 'L’opérateur pose sa question à voix haute et obtient la réponse tirée de l’instruction.', feature: 'voice_assistant' },
        ],
      },
      {
        id: 'suivre',
        nav: 'Suivre',
        title: 'Voyez ce qui est consulté, corrigez ce qui accroche.',
        text: 'Les retours du plancher reviennent à la personne qui a écrit l’instruction.',
        media: 'plantPhoto',
        items: [
          { title: 'Retours du plancher', text: 'Chaque retour arrive avec l’étape en cause ; l’IA aide à corriger.', feature: '' },
          { title: 'Les bonnes personnes averties', text: 'Dans l’app, par courriel et sur le téléphone : à approuver, danger signalé, écart relevé.', feature: '' },
          { title: 'Statistiques et retour sur investissement', text: 'Consultations, réalisations, retours et valeur estimée selon vos hypothèses.', feature: 'adoption_stats' },
          { title: 'Rapports prêts', text: 'Temps par instruction, écarts, formation : chaque chiffre calculé, commenté par l’IA.', feature: '' },
        ],
      },
      {
        id: 'exporter',
        nav: 'Exporter',
        title: 'Vos instructions vous appartiennent.',
        text: 'Le papier renvoie toujours à l’instruction vivante.',
        media: 'export',
        items: [
          { title: 'PDF et JSON', text: 'Chaque instruction, à tous les forfaits ; le PDF porte un code QR vers la version à jour.', feature: '' },
          { title: 'Aux couleurs de l’usine', text: 'Votre logo et vos couleurs ; le PDF sans mention de Clip.', feature: 'brand_kit' },
          { title: 'Export complet', text: 'Toutes les instructions d’un coup.', feature: 'full_export' },
        ],
      },
    ],
    modules: {
      eyebrow: 'Modules',
      title: 'Allez plus loin quand l’usine en a besoin.',
      text: 'Des modules en option, avec {modulePlans}. {trialDays} jours offerts.',
    },
    platforms: {
      title: 'Partout où l’on travaille.',
      text: 'Dans le navigateur, sur ordinateur, tablette et téléphone, et dans l’app mobile pour iPhone et Android. L’app mobile filme en 720p et envoie les gros fichiers même sur un réseau instable.',
    },
  },

  pricing: {
    eyebrow: 'Tarifs',
    h1: 'Des forfaits simples. Les opérateurs ne sont jamais comptés.',
    sub: 'Vous payez la création, les postes et l’IA, jamais la consultation. Prix en dollars canadiens.',
    monthly: 'Mensuel',
    yearly: 'Annuel',
    yearlyBonus: '{freeMonths} mois offerts',
    intervalLabel: 'Facturation',
    perMonth: '/mois',
    perYear: '/année',
    billedMonthly: 'Facturé chaque mois',
    billedYearly: 'Payez {paidMonths} mois, profitez de 12',
    freeForever: 'Sans date de fin',
    featured: 'Recommandé',
    quote: 'Sur devis',
    enterprise: {
      name: 'Entreprise',
      pitch: 'Pour plusieurs usines ou des besoins sur mesure.',
      points: ['Plusieurs usines', 'Contrat et facturation sur mesure'],
    },
    credits: '{credits} crédits d’IA par mois',
    choose: 'Choisir {plan}',
    everythingIn: 'Tout {plan}, plus :',
    start: 'Commencer gratuitement',
    contact: 'Parler à l’équipe',
    allPlans: {
      title: 'Dans tous les forfaits',
      points: ['Lecture à voix haute au poste', 'Export PDF et JSON de chaque instruction', 'Opérateurs et lecteurs sans compte, jamais comptés', 'Web, iPhone et Android'],
    },
    compare: {
      title: 'Comparer les forfaits',
      feature: 'Fonction',
    },
    modules: {
      eyebrow: 'Modules en option',
      title: 'Ajoutez un module quand l’usine en a besoin.',
      text: 'Avec {modulePlans}, sur le web. {trialDays} jours offerts, une fois par organisation.',
      priceWith: '{price} {per} avec {plan}',
      trial: '{trialDays} jours offerts',
    },
    creditsInfo: {
      eyebrow: 'Crédits d’IA',
      title: 'L’IA se paie à ce qu’elle coûte vraiment.',
      text: 'Votre forfait donne une banque de crédits chaque mois ; elle ne se reporte pas. Aucun prix fixe, aucune estimation : chaque réponse de l’IA est débitée de son coût réel, une fois terminée.',
      how: [
        'Une réponse est débitée une fois terminée, de ce qu’elle a vraiment coûté.',
        'Le nombre de crédits s’affiche après, jamais avant : rien ne se devine.',
        'Une génération à partir de beaucoup de vidéo coûte plus qu’une retouche d’étape.',
        'Si l’IA échoue en route, seul ce qu’elle a déjà fait compte.',
      ],
      perMonthTitle: 'La banque de crédits de chaque forfait',
    },
    faq: {
      title: 'Questions sur les forfaits',
      items: [
        { q: 'Qui est compté dans le prix ?', a: 'Les rédacteurs et les approbateurs. Les opérateurs et les lecteurs ne sont jamais comptés : déployez Clip sur tout le plancher.' },
        { q: 'Puis-je essayer avant de payer ?', a: 'Oui. Le forfait {freePlan} n’a pas de date de fin : il suffit pour essayer toute la boucle, de la capture au poste.' },
        {
          q: 'Que se passe-t-il quand mes crédits sont épuisés ?',
          a: 'Les fonctions d’IA attendent le mois suivant ou un forfait supérieur. Tout le reste fonctionne : vos instructions restent consultables au poste.',
        },
        { q: 'Les crédits non utilisés se reportent-ils ?', a: 'Non : la banque de crédits se renouvelle chaque mois.' },
        { q: 'Comment fonctionne le forfait annuel ?', a: 'Vous payez {paidMonths} mois et profitez de 12 : {freeMonths} mois offerts sur chaque forfait payant.' },
        { q: 'Comment paie-t-on ?', a: 'En ligne, par carte de crédit. Dans l’app mobile, l’abonnement se prend aussi dans l’App Store ou Google Play.' },
        { q: 'Que deviennent mes instructions si j’arrête ?', a: 'Elles restent à vous : chaque instruction s’exporte en PDF et en JSON, à tous les forfaits.' },
        { q: 'Et pour plusieurs usines ?', a: 'Le forfait Entreprise se prépare sur mesure : réservez une rencontre et parlons-en.' },
      ],
    },
  },

  /** Les pages « solution » : même gabarit, contenu propre à chacune. */
  solutionPages: {
    knowledge: {
      eyebrow: 'Départs à la retraite',
      h1: 'Captez le savoir-faire de vos experts avant leur départ.',
      sub: 'D’ici 2030, de 20 à 30 % des technologues partiront à la retraite. Filmez vos experts pendant qu’ils expliquent : Clip en fait des instructions de travail que toute l’équipe peut suivre.',
      photo: 'filming',
      photoAlt: 'Une technicienne en méthodes filme un machiniste qui explique sa machine (image d’illustration).',
      problem: {
        title: 'Ce qui part avec eux',
        items: [
          { title: 'Des années de métier', text: 'Les réglages fins et les trucs du métier ne sont écrits nulle part.' },
          { title: 'Des procédures dépassées', text: 'Écrites il y a dix ans, elles ne disent plus ce qu’on fait vraiment.' },
          { title: 'Jamais le temps', text: 'Rédiger prend des heures, et l’expert est toujours sur une urgence.' },
        ],
      },
      solution: {
        title: 'Comment Clip le règle',
        items: [
          { icon: 'video', title: 'Filmer suffit', text: 'L’expert explique comme à un collègue. Pas de formulaire, pas de mise en page.' },
          { icon: 'sparkles', title: 'L’IA structure', text: 'Clip découpe en étapes, garde le bon extrait vidéo et place les mises en garde.' },
          { icon: 'check', title: 'L’expert valide', text: 'Il relit, corrige d’un mot et publie, ou fait approuver.' },
          { icon: 'shield', title: 'Le savoir reste', text: 'L’instruction appartient à l’usine : elle se traduit, se met à jour et s’exporte en PDF.' },
        ],
      },
      demo: { title: 'Cinq notes, une instruction.', text: 'Une vidéo, des photos, une note vocale et une vieille procédure : voici ce que Clip en fait.', kind: 'generate' },
      faq: [
        { q: 'Combien de temps faut-il à l’expert ?', a: 'Le temps de faire la tâche en l’expliquant. La génération prend d’habitude moins de 2 minutes, puis quelques minutes de relecture.' },
        { q: 'L’expert doit-il savoir écrire ou se servir d’un ordinateur ?', a: 'Non. Il parle et il montre ; un collègue peut le filmer avec son téléphone.' },
        {
          q: 'Que fait-on des anciennes procédures ?',
          a: 'Déposez-les : chaque PDF ou Word devient un brouillon à relire. Avec {plans:bulk_import}, l’import en lot en traite des dizaines d’un coup.',
        },
        { q: 'Qui possède les instructions ?', a: 'Votre usine. Chaque instruction s’exporte en PDF et en JSON, à tous les forfaits.' },
        { q: 'Et si l’IA se trompe ?', a: 'Rien n’est publié sans un geste humain. Vous corrigez d’un mot ou à la main, et vous pouvez exiger une approbation.' },
      ],
    },
    training: {
      eyebrow: 'Formation au poste',
      h1: 'Formez vos opérateurs au poste, une étape à la fois.',
      sub: 'Des instructions qui se comprennent sans lire, la lecture à voix haute, et quelques questions à la fin pour valider la formation. Sans compte pour les opérateurs.',
      photo: 'tablet',
      photoAlt: 'Un opérateur suit une instruction sur la tablette fixée à sa machine (image d’illustration).',
      problem: {
        title: 'Pourquoi la formation coince',
        items: [
          { title: 'Le jumelage s’étire', text: 'Il dure des semaines et dépend de qui forme.' },
          { title: 'Des procédures trop longues', text: 'Au poste, personne ne lit trois pages de texte.' },
          { title: 'Tout le monde ne lit pas', text: 'Certains lisent difficilement, d’autres pas en français.' },
        ],
      },
      solution: {
        title: 'Comment Clip le règle',
        items: [
          { icon: 'layers', title: 'Une action par étape', text: 'Média géant, le bon extrait vidéo, gros boutons : l’opérateur avance à son rythme.' },
          { icon: 'volume', title: 'Lecture à voix haute', text: 'Chaque étape se fait lire, dans la langue de l’opérateur.' },
          { icon: 'graduation', title: 'Quelques questions à la fin', text: 'L’IA prépare 3 à 5 questions, l’auteur les retouche ; réussies, la formation est notée.' },
          { icon: 'users', title: 'Qui est formé, à quel poste', text: 'La matrice de compétences croise personnes et postes ; une nouvelle version peut demander de se re-former.' },
        ],
      },
      academy: {
        title: 'Le module Académie',
        text: 'Avec {modulePlans} : le parcours de chaque poste, la validation sur le terrain par un superviseur, la revalidation et un registre prêt pour l’audit.',
      },
      demo: { title: 'Suivez l’instruction, puis validez.', text: 'Avancez dans les étapes, écoutez-les, puis répondez aux questions de la fin.', kind: 'player' },
      faq: [
        { q: 'Les opérateurs ont-ils besoin d’un compte ?', a: 'Non : tablette du poste, code QR ou lien. Pour noter qui est formé, chaque personne a un nom et un code à 4 chiffres.' },
        { q: 'Est-ce un LMS ?', a: 'Non. Clip vérifie la compréhension d’une instruction au poste et garde la trace de qui est formé, et où. Pas de catalogue de cours ni d’examens certifiants.' },
        { q: 'Comment sont faites les questions ?', a: 'L’IA les prépare à partir de l’instruction et l’auteur les retouche. Elles se traduisent avec l’instruction.' },
        { q: 'Que se passe-t-il quand l’instruction change ?', a: 'À la publication, vous pouvez demander de se re-former : les formations d’avant ne comptent plus.' },
        {
          q: 'Qu’ajoute l’Académie ?',
          a: 'Un parcours par poste fait de ses instructions publiées, la validation sur le terrain par un superviseur, la revalidation à intervalle fixe et un registre pour l’audit. {trialDays} jours offerts.',
        },
      ],
    },
    lockout: {
      eyebrow: 'Cadenassage et SST',
      h1: 'Des fiches de cadenassage claires, au pied de la machine.',
      sub: 'Sources d’énergie, dispositifs d’isolement, vérification et remise en marche : une fiche structurée et visuelle, que l’opérateur trouve en scannant l’équipement.',
      photo: 'lock',
      photoAlt: 'Une main gantée pose un cadenas et une étiquette sur un sectionneur (image d’illustration).',
      problem: {
        title: 'Ce qui rend le cadenassage risqué',
        items: [
          { title: 'Des fiches introuvables', text: 'Sur papier, perdues ou périmées, loin de la machine.' },
          { title: 'Des dispositifs mal repérés', text: 'La vanne ou le sectionneur sont difficiles à trouver sur l’équipement.' },
          { title: 'Une étape sautée', text: 'La procédure est trop longue à lire au moment d’intervenir.' },
        ],
      },
      solution: {
        title: 'Comment Clip le règle',
        items: [
          { icon: 'lock', title: 'Une fiche dédiée', text: 'Chaque source d’énergie avec son repère (E1, P1…), son dispositif d’isolement, sa méthode et la vérification de l’absence d’énergie.' },
          {
            icon: 'sparkles',
            title: 'Rédigée dans le bon ordre',
            text: 'L’IA suit les exigences du RSST et de la norme CSA Z460. Une source probable mais non confirmée est marquée « À confirmer ».',
          },
          { icon: 'qr', title: 'Au bon endroit', text: 'Le code QR de l’équipement ouvre d’abord ses procédures et sa fiche de cadenassage.' },
          { icon: 'shield', title: 'Les mises en garde au bon moment', text: 'Danger, attention et EPI en pictogrammes ; un danger signalé avertit les bonnes personnes.' },
        ],
      },
      sheetTitle: 'Une fiche, au poste',
      sheetText: 'Ce que voit l’opérateur avant d’intervenir.',
      disclaimer: 'Clip aide à rédiger, tenir à jour et diffuser vos fiches. Votre programme de cadenassage et sa validation restent la responsabilité de l’usine.',
      demo: { title: 'Montrez où agir, en un clic.', text: 'Touchez « Annoter par IA » : les marques se posent sur ce qu’il faut voir.', kind: 'annotate' },
      faq: [
        {
          q: 'Que contient une fiche de cadenassage ?',
          a: 'L’équipement et son emplacement, le nombre de cadenas, le matériel requis, chaque source d’énergie (repère, type, magnitude, dispositif, emplacement, méthode, vérification) et les étapes de remise en marche.',
        },
        { q: 'L’IA peut-elle rédiger la fiche ?', a: 'Oui, à partir de vos notes, photos et anciennes fiches. Elle la propose ; une personne compétente la relit, la corrige et la publie.' },
        { q: 'Les fiches se traduisent-elles ?', a: 'Oui, avec {plans:translations} : les sources d’énergie, les dispositifs et les étapes comprises.' },
        { q: 'Comment l’opérateur trouve-t-il la fiche ?', a: 'En scannant le code QR de l’équipement, ou sur la tablette du poste. Sans compte.' },
        { q: 'Qui est averti d’un danger ?', a: 'Un retour « Danger » apparaît tout de suite aux responsables dans l’app, et peut aussi partir par courriel et sur leur téléphone.' },
      ],
    },
    translation: {
      eyebrow: 'Équipes multilingues',
      h1: 'Des instructions de travail dans la langue de chaque opérateur.',
      sub: 'Clip traduit vos instructions dans {languages} langues, textes, annotations et schémas compris. Au poste, chaque opérateur choisit sa langue et fait lire l’étape à voix haute.',
      photo: 'plant',
      photoAlt: 'Un opérateur marche dans une allée d’usine bordée de machines (image d’illustration).',
      problem: {
        title: 'Ce que coûte une seule langue',
        items: [
          { title: 'On devine au lieu de lire', text: 'Une consigne mal comprise, c’est une erreur ou un accident.' },
          { title: 'Des traductions de corridor', text: 'Un collègue traduit à la volée, quand il a le temps.' },
          { title: 'Jamais à jour', text: 'Une traduction faite une fois ne suit pas les nouvelles versions.' },
        ],
      },
      solution: {
        title: 'Comment Clip le règle',
        items: [
          { icon: 'languages', title: '{languages} langues', text: 'Espagnol, arabe, tagalog, vietnamien, pendjabi, ukrainien… y compris de droite à gauche.' },
          {
            icon: 'image',
            title: 'Tout est traduit',
            text: 'Étapes, mises en garde, légendes, annotations, texte des schémas et fiche de cadenassage. En option, les images refaites avec leur texte traduit.',
          },
          { icon: 'hand', title: 'Chacun sa langue', text: 'L’opérateur choisit sa langue sur la tablette ; la lecture à voix haute suit.' },
          { icon: 'refresh', title: 'À jour à chaque version', text: 'Une nouvelle version se retraduit en quelques secondes.' },
        ],
      },
      demo: { title: 'Changez de langue, comme au poste.', text: 'Touchez une langue : l’étape se traduit, de droite à gauche pour l’arabe.', kind: 'player' },
      faq: [
        {
          q: 'Quelles langues ?',
          a: '{languages} langues, dont l’espagnol, le portugais, l’arabe, le créole haïtien, le tagalog, le vietnamien, le chinois, l’ukrainien, le pendjabi, l’hindi et le persan.',
        },
        {
          q: 'Combien coûte une traduction ?',
          a: 'La traduction vient avec {plans:translations}. Elle se paie en crédits d’IA, à son coût réel, comme le reste de l’IA.',
        },
        { q: 'L’outil lui-même est-il traduit ?', a: 'Clip s’utilise en français et en anglais. Au poste, les boutons du lecteur parlent aussi espagnol.' },
        { q: 'La lecture à voix haute suit-elle la langue ?', a: 'Oui : elle lit l’étape dans la langue choisie au poste, à tous les forfaits.' },
        { q: 'Et quand l’instruction change ?', a: 'Retraduisez la nouvelle version en un geste. Un média modifié ne garde pas sa vieille traduction.' },
      ],
    },
  },

  solutionCommon: {
    demoEyebrow: 'Démo',
    faqTitle: 'Questions fréquentes',
    related: 'Pour aller plus loin',
    relatedFeatures: 'Toutes les fonctions',
    relatedFeaturesText: 'Capturer, générer, traduire, déployer : tout ce que fait Clip.',
    relatedPricing: 'Les tarifs',
    relatedPricingText: 'Des forfaits clairs ; les opérateurs ne sont jamais comptés.',
    otherSolutions: 'Les autres solutions',
  },

  book: {
    eyebrow: 'Démo',
    h1: 'Réservez une démo de Clip.',
    sub: 'Choisissez un moment : notre équipe vous montre Clip, de la vidéo de l’expert à la tablette du poste, et répond à vos questions.',
    agendaTitle: 'Ce qu’on regarde ensemble',
    agenda: ['Une instruction générée à partir d’une vidéo', 'Le poste : tablette, code QR, lecture à voix haute', 'Le forfait qui convient à votre usine'],
    calendarTitle: 'Calendrier de réservation de Clip',
    loading: 'Chargement du calendrier…',
    fallback: 'Le calendrier ne s’affiche pas ? Ouvrez-le dans un nouvel onglet.',
    selfServe: 'Vous préférez essayer seul ?',
    booked: 'Merci ! Votre rencontre est réservée. Vous recevrez une invitation par courriel.',
  },

  footer: {
    tagline: 'Le savoir-faire de vos experts, au poste, en quelques minutes.',
    product: 'Produit',
    solutions: 'Solutions',
    company: 'Légal',
    language: 'Langue',
    privacy: 'Politique de confidentialité',
    cookies: 'Témoins',
    rights: '© {year} Intelligence Industrielle. Tous droits réservés.',
    imagesNote: 'Les photos du site sont des images d’illustration.',
  },

  consent: {
    title: 'Témoins',
    text: 'Avec votre accord, nous utilisons les témoins de HubSpot pour mesurer l’audience du site et améliorer nos communications. Rien n’est activé sans votre accord.',
    accept: 'Accepter',
    refuse: 'Refuser',
    policy: 'Politique de confidentialité',
  },

  film: {
    title: 'Clip en une minute',
    note: 'Avec le son et les sous-titres.',
    poster: 'Une technicienne filme un machiniste avec son téléphone.',
  },

  demo: {
    badge: 'Démo interactive',
    accelerated: 'Démo accélérée',
    restart: 'Recommencer',
    generate: {
      board: 'Nouvelle instruction',
      whatLabel: 'De quoi s’agit-il ?',
      what: 'Nettoyage des rails de la machine 1234, une fois par mois',
      notesTitle: 'Vos notes',
      notes: [
        { kind: 'video', name: 'nettoyage-rails-M1234.mp4', detail: 'Vidéo · 4:12' },
        { kind: 'photo', name: 'rails-copeaux.jpg', detail: 'Photo' },
        { kind: 'audio', name: 'Note vocale', detail: '0:48 · « Toujours cadenasser avant d’ouvrir la porte »' },
        { kind: 'file', name: 'procedure-rails-2019.pdf', detail: 'Document · 3 pages' },
        { kind: 'file', name: 'methode-nettoyage.docx', detail: 'Document · 2 pages' },
      ],
      ready: '5 notes prêtes. L’IA va les analyser.',
      emptyHint: 'L’instruction rédigée apparaîtra ici.',
      button: 'Générer l’instruction',
      running: 'L’IA rédige votre instruction',
      elapsed: '{clock} · d’habitude moins de 2 minutes',
      stages: ['Préparation des médias', 'L’IA regarde et écoute vos notes', 'Mise en forme des étapes', 'Annotation des images'],
      thumbs: 'Vignettes des extraits',
      tip: 'Chaque étape garde le bon extrait de votre vidéo, à la seconde près.',
      category: 'Maintenance',
      steps: '{count} étapes',
      duration: '15 min',
      locks: '1 cadenas',
      ppe: ['Lunettes', 'Gants anticoupure'],
      draft: 'Brouillon créé : relisez, puis publiez.',
      seeStation: 'Voir au poste',
      announceStage: 'Étape en cours : {stage}',
      announceDone: 'Instruction générée : {title}, {count} étapes.',
    },
    player: {
      operatorLanguage: 'Langue de l’opérateur',
      voiceNote: 'Démo : la lecture utilise la voix de votre navigateur. Dans Clip, une voix naturelle lit l’étape.',
      noVoice: 'Aucune voix pour cette langue dans ce navigateur.',
      stepPhoto: 'Photo de l’étape {n}',
      sent: 'Démo : rien n’est envoyé.',
    },
    annotate: {
      title: 'Annoter l’image',
      ai: 'Annoter par IA',
      save: 'Enregistrer',
      working: 'L’IA repère ce qu’il faut voir…',
      toast: 'Marques ajoutées par l’IA',
      toastHint: 'Touchez une marque pour la déplacer, l’agrandir ou la retirer.',
      labels: { start: 'Démarrer ici', estop: 'Arrêt d’urgence', stop: 'Arrêt : appuyer 2 s' },
      tools: ['Sélection', 'Crayon', 'Surligneur', 'Flèche', 'Ligne', 'Cercle', 'Cadre', 'Texte'],
      photoAlt: 'Le panneau de commande d’une machine : boutons vert et rouge, deux sélecteurs et un arrêt d’urgence.',
    },
    lockout: {
      title: 'Fiche de cadenassage — Machine 1234',
      steps: '{count} étapes',
      locks: '{count} cadenas',
      ppeTitle: 'Équipements de protection',
      ppe: ['Lunettes', 'Gants'],
      safetyTitle: 'Mises en garde',
      safety: 'Ne jamais ouvrir la porte sans cadenas.',
      energyTitle: 'Sources d’énergie à isoler',
      device: 'Dispositif :',
      verify: 'Vérifier :',
      points: [
        {
          tag: 'E1',
          type: 'electric',
          name: 'Électrique · 600 V',
          description: 'Alimentation du moteur de broche',
          device: 'Sectionneur principal',
          location: 'armoire électrique, côté gauche',
          verify: 'Appuyer sur Démarrer : rien ne bouge.',
        },
        {
          tag: 'P1',
          type: 'pneumatic',
          name: 'Pneumatique · 90 psi',
          description: 'Air comprimé du changeur d’outils',
          device: 'Vanne d’isolement quart de tour',
          location: 'arrière de la machine',
          verify: 'Purger, puis lire 0 psi au manomètre.',
        },
      ],
      restartTitle: 'Remise en marche',
      restart: ['Retirez outils et chiffons de la machine.', 'Retirez votre cadenas et votre étiquette.', 'Rétablissez l’air, puis le courant.'],
    },
  },

  /** Les noms des forfaits qui ne s'écrivent pas comme au manifeste (vide : le nom du manifeste). */
  planNames: {} as Record<string, string>,
  /** Une phrase par forfait, par code ; un forfait sans phrase n'en montre pas. */
  planPitch: {
    free: 'Pour essayer avec vos premières instructions.',
    solo: 'Pour la personne qui documente son travail et le partage par code QR.',
    equipe: 'Pour un atelier ou une petite usine : l’équipe rédige, approuve et traduit.',
    usine: 'Pour toute l’usine : postes et tablettes partout, support prioritaire.',
  } as Record<string, string>,
  /** Les modules, par feature : nom, phrase et points (le prix vient du manifeste). */
  modules: {
    academy: {
      name: 'Académie',
      pitch: 'Former chaque personne et la garder qualifiée, poste par poste.',
      points: [
        'Un parcours de formation par poste, prêt d’avance',
        'Validation pratique par le superviseur',
        'Revalidation de la qualification, rappelée un mois avant',
        'Couverture par quart et registre pour l’audit',
      ],
    },
    records_plus: {
      name: 'Relevés',
      pitch: 'Des données fiables du plancher, sans papier.',
      points: ['Listes de vérification et mesures répétées', 'Tendances et limites de chaque mesure', 'Export pour la qualité et l’audit', 'Numéro de lot, photos et écart autorisé'],
    },
  } as Record<string, { name: string; pitch: string; points: string[] }>,
  /** Ce que veut dire une limite, au pluriel, par feature (« 25 postes »). */
  limits: {
    published_instructions: 'instructions publiées',
    stations: 'postes',
    editors: 'rédacteurs',
  } as Record<string, string>,
  /** Une limite sans plafond, par feature. */
  limitsUnlimited: {
    published_instructions: 'Instructions publiées illimitées',
    stations: 'Postes illimités',
    editors: 'Rédacteurs illimités',
  } as Record<string, string>,
  /** La même chose dans une cellule du tableau comparatif. */
  unlimitedCell: {
    published_instructions: 'Illimitées',
    stations: 'Illimités',
    editors: 'Illimités',
  } as Record<string, string>,
  limitsOne: {
    published_instructions: 'instruction publiée',
    stations: 'poste',
    editors: 'rédacteur',
  } as Record<string, string>,
}

export type SiteContent = typeof fr
