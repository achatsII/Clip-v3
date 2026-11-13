/** Les deux formes d’un nom qu’on compte : « poste », « postes ». */
type Noun = { one: string; many: string }

const fmt = (n: number) => n.toLocaleString('fr-CA')
/** En français, 0 et 1 prennent le singulier. */
const form = (n: number, noun: Noun) => (n > 1 ? noun.many : noun.one)
/** « 150 crédits ». */
const credits = (n: number) => `${fmt(n)} crédit${n > 1 ? 's' : ''}`
/** « jusqu’au 23 novembre 2026 », ou rien sans date. */
const until = (date: string | null) => (date ? ` jusqu’au ${date}` : '')
/** Le magasin avec son article, là où la phrase en demande un : « l’App Store », « Google Play ». */
const theStore = (store: string) => (store === 'App Store' ? 'l’App Store' : store)

/** L’abonnement, les crédits, les plans, la fenêtre des refus, l’achat dans le magasin. */
export const billing = {
  /** Un prix ou un solde en crédits : « 150 crédits ». */
  credits,
  aiCredits: 'Crédits IA',
  /** Un plan sans prix, et le plan d’un compte sans abonnement. */
  free: 'Gratuit',
  perMonth: '/ mois',
  perYear: '/ an',
  renewsOn: (date: string) => `Renouvellement le ${date}.`,
  managedByAdmin: 'Votre plan se gère par l’administrateur de votre usine.',
  retrySoon: 'Réessayez dans un instant.',
  interval: {
    monthly: 'Mensuel',
    yearly: 'Annuel',
    /** Le choix annuel de la fenêtre des refus, avec l’économie sur le mensuel. */
    yearlySaving: (pct: number) => `Annuel · −${fmt(pct)} %`,
    /** Le choix annuel de la page Abonnement, sur le web (annuel = 10 mois). */
    yearlyTwoMonthsFree: 'Annuel · 2 mois offerts',
  },
  /** Les cartes des plans : la phrase de chaque plan et ce qu’il donne. */
  plans: {
    /** Phrase de présentation de chaque plan (le manifeste n’a pas de champ de description). */
    pitch: {
      free: 'Pour essayer avec vos premières instructions.',
      solo: 'Pour la personne qui documente son travail et le partage par code QR.',
      equipe: 'Pour un atelier ou une petite usine : l’équipe rédige, approuve et traduit.',
      usine: 'Pour toute l’usine : postes et tablettes partout, support prioritaire.',
    },
    /** « 2 500 crédits par mois ». */
    perMonth: (amount: string) => `${amount} par mois`,
    /** « Instructions publiées : illimitées » : l’accord suit la feature. */
    unlimited: (label: string, feature: string) => `${label} : illimité${feature === 'published_instructions' ? 'es' : 's'}`,
  },
  /** La pastille de solde et sa fenêtre. */
  pill: {
    available: 'crédits disponibles',
    thisMonth: 'Ce mois-ci',
    granted: (n: number) => `${fmt(n)} accordés`,
    used: 'Utilisés',
    howItWorks: 'Chaque action d’IA affiche son coût sur son bouton. Une action qui échoue ne coûte rien.',
    viewSubscription: 'Voir mon abonnement',
  },
  /** Le petit cadenas à côté d’une action hors plan. */
  lockBadge: 'Plus',
  /** Le bandeau de solde bas. */
  lowBalance: {
    text: (n: number, date: string | null) => `Il vous reste ${credits(n)}${until(date)}.`,
    more: 'Plus de crédits',
  },
  /** Pourquoi la fenêtre des crédits s’ouvre : un refus réel de la plateforme, ou le solde du mois. */
  balance: {
    refused: 'Plus assez de crédits IA pour cette action. Rien n’a été débité.',
    monthly: 'Vos crédits IA de ce mois-ci.',
    exhausted: (date: string | null, refused: boolean) => `Vos crédits IA sont épuisés${until(date)}.${refused ? ' Rien n’a été débité pour l’action refusée.' : ''}`,
    notEnough: (left: number) => `Il vous reste ${credits(left)} : pas assez pour cette action. Rien n’a été débité.`,
    left: (left: number, date: string | null) => `Il vous reste ${credits(left)}${until(date)}.`,
    /** Aucun plan ne donne plus de crédits : on dit quand ils reviennent. */
    renewal: (date: string | null) => `Aucun plan n’en donne davantage.${date ? ` Vos crédits se renouvellent le ${date}.` : ''}`,
  },
  /** Les limites du plan que l’app compte : postes, rédacteurs, instructions publiées. */
  limits: {
    nouns: {
      stations: { one: 'poste', many: 'postes' },
      editors: { one: 'rédacteur', many: 'rédacteurs' },
      published_instructions: { one: 'instruction publiée', many: 'instructions publiées' },
    },
    /** « 5 postes », « 1 rédacteur ». */
    count: (n: number, noun: Noun) => `${fmt(n)} ${form(n, noun)}`,
    /** « 21 postes sur 25 ». */
    outOf: (used: number, limit: number, noun: Noun) => `${fmt(used)} ${form(used, noun)} sur ${fmt(limit)}`,
    /** Le titre de la fenêtre quand une limite la fait ouvrir. */
    title: {
      stations: 'Plus de postes',
      editors: 'Plus de rédacteurs',
      published_instructions: 'Plus d’instructions publiées',
    },
    noLimit: 'Votre plan n’a pas de limite ici.',
    notIncluded: 'Votre plan actuel n’en comprend pas.',
    allows: (count: string) => `Votre plan permet ${count}.`,
    reached: (count: string) => `Votre plan permet ${count} : la limite est atteinte.`,
    at: (outOf: string) => `Vous en êtes à ${outOf}.`,
    /** Ajouté à ce que la fenêtre dit des rédacteurs. */
    notCounted: 'Les lecteurs et les opérateurs ne se comptent jamais.',
    /** Ce que le plan conseillé donne pour cette limite : « Équipe : 25 postes ». */
    offer: (plan: string, count: string) => `${plan} : ${count}`,
    offerUnlimited: (plan: string, noun: Noun) => `${plan} : ${noun.many} sans limite`,
  },
  /** La jauge d’une limite. */
  usage: {
    inPlan: (outOf: string) => `${outOf} dans votre plan`,
    full: 'Limite atteinte',
    near: 'Bientôt plein',
    view: (plan: string) => `Voir ${plan}`,
  },
  /** La fenêtre des refus. */
  paywall: {
    moreCredits: 'Plus de crédits ce mois-ci',
    unlockMore: 'Débloquez plus',
    suspended: 'Votre abonnement est suspendu : réglez la facture pour retrouver vos fonctions.',
    notInPlan: 'Cette fonction n’est pas incluse dans votre plan actuel.',
    recommended: 'Plan conseillé',
    seePlansPage: 'Voyez les plans sur la page Abonnement.',
    managedByAdmin: 'Ce plan se gère par l’administrateur de votre usine.',
    upgradeTo: (plan: string) => `Passer à ${plan}`,
    askAdmin: (plan: string) => `Demandez à l’administrateur de votre usine de passer au plan ${plan}.`,
    valueReport: 'Préparer le dossier pour la direction',
    allPlans: 'Voir tous les plans',
    manageFromPage: 'Gérez votre abonnement depuis la page Abonnement',
  },
  /** Le paiement et le portail Stripe, sur le web. */
  checkout: {
    adminOnly: 'Seul l’administrateur peut acheter',
    askToUpgrade: 'Demandez-lui de passer au plan supérieur.',
    failed: 'Le paiement ne s’est pas ouvert',
    notOnSale: 'Ce plan ne s’achète pas encore',
    noPayment: 'Aucun paiement encore',
    choosePlan: 'Choisissez un plan pour commencer.',
    portalFailed: 'Le portail ne s’est pas ouvert',
  },
  /** L’achat dans le magasin (App Store, Google Play), dans l’app mobile. */
  store: {
    privacy: 'Politique de confidentialité',
    appleTerms: 'Conditions d’utilisation (Apple)',
    comingSoon: 'L’abonnement dans l’app arrive bientôt.',
    planComingSoon: (store: string) => `Ce plan arrive bientôt dans ${theStore(store)}.`,
    /** L’offre de bienvenue du magasin : son prix et sa durée (unité du magasin : DAY, WEEK, MONTH, YEAR). */
    intro: (price: string, n: number, unit: string) => `Offre de bienvenue : ${price} pour ${fmt(n)} ${unit === 'DAY' ? (n > 1 ? 'jours' : 'jour') : unit === 'WEEK' ? (n > 1 ? 'semaines' : 'semaine') : unit === 'YEAR' ? (n > 1 ? 'ans' : 'an') : 'mois'}`,
    subscribeTo: (plan: string) => `S’abonner à ${plan}`,
    /** Les mentions que les magasins exigent avant l’achat. */
    disclosure: (plan: string, price: string, yearly: boolean, store: string) =>
      `Abonnement ${plan} : ${price} par ${yearly ? 'an' : 'mois'}, renouvelé automatiquement jusqu’à l’annulation. Le paiement est débité de votre compte ${store} à la confirmation de l’achat. Annulez au moins 24 heures avant la fin de la période, dans les abonnements de votre compte ${store}.`,
    welcome: (plan: string) => `Bienvenue dans ${plan}`,
    planOpen: 'Votre plan est ouvert.',
    pending: 'Achat en cours de validation',
    pendingBody: (store: string) => `Le plan s’ouvrira dès que ${store} l’aura confirmé.`,
    failed: 'L’achat n’a pas abouti',
    unresolved: 'L’achat n’a pas pu être rattaché à votre usine',
    unresolvedBody: 'Écrivez au soutien de CLIP : nous réglerons le compte.',
    manageIn: (store: string) => `Gérer mon abonnement dans ${store}`,
    managedWhereBought: 'Votre abonnement se gère là où il a été pris.',
    managedIn: (store: string) => `Votre abonnement se gère dans ${store}.`,
    restore: 'Restaurer mes achats',
    restored: 'Achats restaurés',
    nothingToRestore: 'Aucun achat à restaurer',
    nothingToRestoreBody: (store: string) => `Aucun abonnement de ce compte ${store} n’appartient à cette usine.`,
    restoreFailed: 'La restauration n’a pas abouti',
    /** Ce qui empêche un achat, dans les mots de l’app (jamais le message du magasin). */
    failure: {
      notReady: 'Le magasin se prépare : réessayez dans un instant.',
      productMissing: (store: string) => `Ce plan n’est pas encore offert dans ${theStore(store)}.`,
      otherAccount: (store: string) => `Cet achat ${store} appartient déjà à un autre compte CLIP : connectez-vous avec le compte qui l’a payé.`,
      network: 'Pas de connexion : réessayez quand le réseau revient.',
      notAllowed: 'Les achats sont bloqués sur cet appareil (contrôle parental ou réglage de l’appareil).',
      other: (store: string) => `${store} n’a pas pu terminer l’achat. Rien n’a été débité.`,
    },
    /** Pourquoi l’achat n’est pas offert ici, en une phrase, sans lien ni prix d’un paiement hors du magasin. */
    blocked: {
      team: 'Dans l’app, l’abonnement est personnel : il se prend depuis un compte à une seule personne. Votre usine gère son plan par son administrateur.',
      elsewhere: (store: string) => `Votre abonnement est déjà en place : il se gère dans ${store}.`,
      elsewhereUnknown: 'Votre abonnement est déjà en place : il se gère là où il a été pris.',
      unresolved: 'L’achat n’est pas possible pour ce compte. Écrivez au soutien de CLIP.',
    },
  },
  /** Les modules en option (Académie, Relevés), à ajouter à Équipe ou à Usine. */
  modules: {
    title: 'Modules',
    subtitle: 'À ajouter à Équipe ou à Usine, quand l’usine en a besoin.',
    eyebrow: 'Module',
    trial: (days: number) => `${fmt(days)} jours offerts`,
    tryFree: (days: number) => `Essayer ${fmt(days)} jours`,
    add: (name: string) => `Ajouter ${name}`,
    /** Sous l’essai : « Puis 1 490 $ / an ». */
    after: (price: string) => `Puis ${price}`,
    active: 'Actif',
    /** Un module actif : aller là où il vit dans l’app. */
    open: 'Ouvrir',
    withPlans: 'S’ajoute à Équipe ou à Usine',
    /** Pourquoi la fenêtre s’ouvre pour un module que le plan ne reçoit pas. */
    needsPlan: (name: string, plan: string) => `Le module ${name} s’ajoute au plan ${plan}.`,
    notOnSale: 'Ce module ne s’achète pas encore.',
    academy: {
      name: 'Académie',
      pitch: 'Former chaque personne et la garder qualifiée, poste par poste.',
      points: ['Un parcours de formation par poste, prêt d’avance', 'Revalidation et rappels avant l’échéance', 'Validation pratique par le superviseur', 'Couverture par quart et registre pour l’audit'],
    },
    records: {
      name: 'Relevés',
      pitch: 'Des données fiables du plancher, sans papier.',
      points: ['Listes de vérification et mesures répétées', 'Tendances et limites de chaque mesure', 'Export pour la qualité et l’audit', 'Numéro de lot, photos et écart autorisé'],
    },
  },
  /** L’aperçu de la facturation (le paiement n’est pas encore ouvert) : voir l’app comme une usine abonnée. */
  preview: {
    eyebrow: 'Aperçu',
    title: 'Voyez CLIP comme une usine abonnée',
    text: 'Le paiement n’est pas encore ouvert. Choisissez ce que l’usine aurait : toute l’app suit, et rien n’est acheté.',
    plan: 'Plan',
    modules: 'Modules',
    modulesNeed: 'Les modules s’ajoutent à Équipe ou à Usine.',
    credits: 'Crédits IA',
    creditLevels: { full: 'Plein', low: 'Bas', empty: 'Épuisés' },
    deviceOnly: 'Seulement dans cet appareil.',
    reset: 'Tout ouvrir de nouveau',
    /** Au retour d’un « achat » dans l’aperçu. */
    taken: (name: string) => `Aperçu : ${name} est maintenant actif`,
    takenHint: 'Une fois le paiement ouvert, c’est ici que l’achat se fera.',
    /** Dans l’app mobile : l’aperçu ne vend rien, ni prix ni achat d’ailleurs. */
    appHint: 'Rien ne s’achète dans cet aperçu : changez le plan, les modules ou les crédits en haut de la page, et toute l’app suit.',
    moduleOff: 'Pas dans cet aperçu : ajoutez-le en haut de la page.',
    seeWith: (name: string) => `Voir CLIP avec ${name}`,
  },
  /** Le conseiller d’achat : de temps en temps, l’offre qui sert l’usine (à l’accueil). */
  advisor: {
    eyebrow: 'Pour votre usine',
    see: 'Voir l’offre',
    later: 'Plus tard',
    limitTitle: {
      stations: 'Vos postes se remplissent',
      editors: 'Votre équipe grandit',
      published_instructions: 'Votre bibliothèque grandit',
    },
    /** « 5 postes sur 5 : la limite est atteinte. Équipe : 25 postes. » */
    limitFull: (outOf: string, offer: string) => `${outOf} : la limite est atteinte. ${offer}.`,
    limitNear: (outOf: string, offer: string) => `${outOf}. ${offer}.`,
    /** Une fonction fermée essayée plusieurs fois ce mois-ci. */
    tried: (n: number, plan: string) => `Essayé ${fmt(n)} fois ce mois-ci : c’est compris dans ${plan}.`,
    triedModule: (n: number, module: string, trial: string) => `Essayé ${fmt(n)} fois ce mois-ci : c’est le module ${module}${trial ? `, ${trial}` : ''}.`,
    triedModulePlan: (n: number, module: string, plan: string) => `Essayé ${fmt(n)} fois ce mois-ci : le module ${module} s’ajoute au plan ${plan}.`,
    creditsTitle: 'Vos crédits IA s’épuisent',
    credits: (n: number, offer: string) => `Épuisés ${fmt(n)} fois ce mois-ci. ${offer}.`,
    /** Un module que l’usage appelle. */
    academyTitle: 'Vos formations prennent de l’ampleur',
    academy: (n: number, trial: string) => `${fmt(n)} formations validées ce mois-ci. L’Académie suit les revalidations et la couverture de chaque quart${trial ? ` : ${trial}` : ''}.`,
    recordsTitle: 'Vos relevés s’accumulent',
    records: (n: number, trial: string) => `${fmt(n)} relevés ce mois-ci. Le module Relevés montre leurs tendances et les exporte pour la qualité${trial ? ` : ${trial}` : ''}.`,
  },
  /** Demander à l’administrateur, quand on ne peut pas acheter soi-même. */
  request: {
    ask: 'Demander à l’administrateur',
    sent: 'Demande envoyée',
    sentHint: 'Votre administrateur la verra dans « À voir ».',
    already: 'Déjà demandé : votre administrateur le voit dans « À voir ».',
    failed: 'La demande n’est pas partie',
  },
  /** La page Abonnement. */
  subscription: {
    title: 'Abonnement',
    subtitle: 'Les opérateurs ne sont jamais comptés : vous payez la création, les postes et l’IA.',
    currentPlan: 'Plan actuel',
    /** L’état de l’abonnement, par son code à la plateforme. */
    states: {
      none: 'Aucun abonnement',
      trialing: 'Essai en cours',
      active: 'Actif',
      grace: 'Paiement en retard — vos fonctions restent ouvertes',
      suspended: 'Suspendu — réglez la facture',
      canceled: 'Annulé',
      expired: 'Expiré',
    },
    endsOn: (date: string) => `se termine le ${date}`,
    manage: 'Gérer l’abonnement et les factures',
    unreadable: 'L’état de l’abonnement n’a pas pu être lu',
    usage: 'Ce que vous utilisez',
    plans: 'Les plans',
    current: 'Actuel',
    beforeTax: 'avant taxes',
    choose: (plan: string) => `Choisir ${plan}`,
    askAdmin: 'Demandez à l’administrateur',
    enterprise: 'Besoin de plusieurs usines, de l’authentification unique ou d’un contrat ? Écrivez-nous : un plan Entreprise se prépare sur mesure.',
    /** Le forfait choisi sur le site public, présélectionné après l’inscription. */
    intent: {
      label: 'Le forfait choisi sur notre site',
      continue: 'Continuer vers le paiement',
    },
  },
  /** Les erreurs du client de facturation. */
  errors: {
    signedOut: 'Aucun utilisateur connecté',
    status: (status: number) => `Erreur ${status}`,
  },
}
