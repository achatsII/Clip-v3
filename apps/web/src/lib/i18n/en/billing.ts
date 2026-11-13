import type { billing as Fr } from '../fr/billing'

/** Les deux formes d’un nom qu’on compte : « station », « stations ». */
type Noun = { one: string; many: string }

const fmt = (n: number) => n.toLocaleString('en-CA')
/** En anglais, seul 1 prend le singulier. */
const form = (n: number, noun: Noun) => (n !== 1 ? noun.many : noun.one)
/** « 150 credits ». */
const credits = (n: number) => `${fmt(n)} credit${n !== 1 ? 's' : ''}`
/** « until November 23, 2026 », ou rien sans date. */
const until = (date: string | null) => (date ? ` until ${date}` : '')
/** Le magasin avec son article : « the App Store », « Google Play ». */
const theStore = (store: string) => (store === 'App Store' ? 'the App Store' : store)
/** Les durées de l’offre de bienvenue, par unité du magasin (le mois à défaut). */
const PERIODS: Record<string, Noun> = {
  DAY: { one: 'day', many: 'days' },
  WEEK: { one: 'week', many: 'weeks' },
  MONTH: { one: 'month', many: 'months' },
  YEAR: { one: 'year', many: 'years' },
}

/** L’abonnement, les crédits, les plans, la fenêtre des refus, l’achat dans le magasin. */
export const billing: typeof Fr = {
  credits,
  aiCredits: 'AI credits',
  free: 'Free',
  perMonth: '/ month',
  perYear: '/ year',
  renewsOn: (date: string) => `Renews on ${date}.`,
  managedByAdmin: 'Your plan is managed by your plant’s administrator.',
  retrySoon: 'Try again in a moment.',
  interval: {
    monthly: 'Monthly',
    yearly: 'Yearly',
    yearlySaving: (pct: number) => `Yearly · −${fmt(pct)}%`,
    yearlyTwoMonthsFree: 'Yearly · 2 months free',
  },
  plans: {
    pitch: {
      free: 'To try it out with your first instructions.',
      solo: 'For the person who documents their work and shares it by QR code.',
      equipe: 'For a workshop or a small plant: the team writes, approves and translates.',
      usine: 'For the whole plant: stations and tablets everywhere, priority support.',
    },
    perMonth: (amount: string) => `${amount} per month`,
    unlimited: (label: string, _feature: string) => `${label}: unlimited`,
  },
  pill: {
    available: 'credits available',
    thisMonth: 'This month',
    granted: (n: number) => `${fmt(n)} granted`,
    used: 'Used',
    howItWorks: 'Each AI action shows its cost on its button. An action that fails costs nothing.',
    viewSubscription: 'View my subscription',
  },
  lockBadge: 'Upgrade',
  lowBalance: {
    text: (n: number, date: string | null) => `You have ${credits(n)} left${until(date)}.`,
    more: 'More credits',
  },
  balance: {
    refused: 'Not enough AI credits for this action. Nothing was charged.',
    monthly: 'Your AI credits for this month.',
    exhausted: (date: string | null, refused: boolean) => `You’re out of AI credits${until(date)}.${refused ? ' Nothing was charged for the declined action.' : ''}`,
    notEnough: (left: number) => `You have ${credits(left)} left: not enough for this action. Nothing was charged.`,
    left: (left: number, date: string | null) => `You have ${credits(left)} left${until(date)}.`,
    renewal: (date: string | null) => `No plan offers more.${date ? ` Your credits renew on ${date}.` : ''}`,
  },
  limits: {
    nouns: {
      stations: { one: 'station', many: 'stations' },
      editors: { one: 'editor', many: 'editors' },
      published_instructions: { one: 'published instruction', many: 'published instructions' },
    },
    count: (n: number, noun: Noun) => `${fmt(n)} ${form(n, noun)}`,
    /** « 21 of 25 stations » : en anglais, le nom suit le total. */
    outOf: (used: number, limit: number, noun: Noun) => `${fmt(used)} of ${fmt(limit)} ${form(limit, noun)}`,
    title: {
      stations: 'More stations',
      editors: 'More editors',
      published_instructions: 'More published instructions',
    },
    noLimit: 'Your plan has no limit here.',
    notIncluded: 'Your current plan doesn’t include any.',
    allows: (count: string) => `Your plan allows ${count}.`,
    reached: (count: string) => `Your plan allows ${count}, and you’ve reached the limit.`,
    at: (outOf: string) => `You’re at ${outOf}.`,
    notCounted: 'Readers and operators are never counted.',
    offer: (plan: string, count: string) => `${plan}: ${count}`,
    offerUnlimited: (plan: string, noun: Noun) => `${plan}: unlimited ${noun.many}`,
  },
  usage: {
    inPlan: (outOf: string) => `${outOf} in your plan`,
    full: 'Limit reached',
    near: 'Almost full',
    view: (plan: string) => `View ${plan}`,
  },
  paywall: {
    moreCredits: 'More credits this month',
    unlockMore: 'Unlock more',
    suspended: 'Your subscription is suspended: pay the invoice to get your features back.',
    notInPlan: 'This feature isn’t included in your current plan.',
    recommended: 'Recommended plan',
    seePlansPage: 'See the plans on the Subscription page.',
    managedByAdmin: 'This plan is managed by your plant’s administrator.',
    upgradeTo: (plan: string) => `Upgrade to ${plan}`,
    askAdmin: (plan: string) => `Ask your plant’s administrator to upgrade to the ${plan} plan.`,
    valueReport: 'Prepare the report for management',
    allPlans: 'View all plans',
    manageFromPage: 'Manage your subscription from the Subscription page',
  },
  checkout: {
    adminOnly: 'Only the administrator can buy',
    askToUpgrade: 'Ask them to upgrade the plan.',
    failed: 'Checkout didn’t open',
    notOnSale: 'This plan can’t be bought yet',
    noPayment: 'No payments yet',
    choosePlan: 'Choose a plan to get started.',
    portalFailed: 'The billing portal didn’t open',
  },
  store: {
    privacy: 'Privacy policy',
    appleTerms: 'Terms of use (Apple)',
    comingSoon: 'In-app subscriptions are coming soon.',
    planComingSoon: (store: string) => `This plan is coming soon to ${theStore(store)}.`,
    intro: (price: string, n: number, unit: string) => `Welcome offer: ${price} for ${fmt(n)} ${form(n, PERIODS[unit] ?? PERIODS.MONTH)}`,
    subscribeTo: (plan: string) => `Subscribe to ${plan}`,
    /** La formulation standard d’Apple et de Google. */
    disclosure: (plan: string, price: string, yearly: boolean, store: string) =>
      `${plan} subscription: ${price} per ${yearly ? 'year' : 'month'}. Payment will be charged to your ${store} account at confirmation of purchase. The subscription renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel it in your ${store} account settings.`,
    welcome: (plan: string) => `Welcome to ${plan}`,
    planOpen: 'Your plan is active.',
    pending: 'Purchase pending',
    pendingBody: (store: string) => `Your plan will unlock as soon as ${theStore(store)} confirms it.`,
    failed: 'The purchase didn’t go through',
    unresolved: 'The purchase couldn’t be linked to your plant',
    unresolvedBody: 'Contact CLIP support: we’ll sort out the account.',
    manageIn: (store: string) => `Manage my subscription on ${theStore(store)}`,
    managedWhereBought: 'Your subscription is managed where it was purchased.',
    managedIn: (store: string) => `Your subscription is managed on ${theStore(store)}.`,
    restore: 'Restore purchases',
    restored: 'Purchases restored',
    nothingToRestore: 'No purchases to restore',
    nothingToRestoreBody: (store: string) => `No subscription on this ${store} account belongs to this plant.`,
    restoreFailed: 'The restore didn’t go through',
    failure: {
      notReady: 'The store is getting ready: try again in a moment.',
      productMissing: (store: string) => `This plan isn’t offered on ${theStore(store)} yet.`,
      otherAccount: (store: string) => `This ${store} purchase already belongs to another CLIP account: sign in with the account that paid for it.`,
      network: 'No connection: try again when the network is back.',
      notAllowed: 'Purchases are blocked on this device (parental controls or a device setting).',
      other: (store: string) => `${store === 'App Store' ? 'The App Store' : store} couldn’t complete the purchase. Nothing was charged.`,
    },
    blocked: {
      team: 'In the app, subscriptions are personal: they’re bought from a one-person account. Your plant manages its plan through its administrator.',
      elsewhere: (store: string) => `You already have a subscription: it’s managed on ${theStore(store)}.`,
      elsewhereUnknown: 'You already have a subscription: it’s managed where it was purchased.',
      unresolved: 'Purchases aren’t possible for this account. Contact CLIP support.',
    },
  },
  modules: {
    title: 'Modules',
    subtitle: 'Add them to Team or Plant when the plant needs them.',
    eyebrow: 'Module',
    trial: (days: number) => `${fmt(days)} days free`,
    tryFree: (days: number) => `Try ${fmt(days)} days free`,
    add: (name: string) => `Add ${name}`,
    after: (price: string) => `Then ${price}`,
    active: 'Active',
    withPlans: 'Adds on to Team or Plant',
    needsPlan: (name: string, plan: string) => `The ${name} module adds on to the ${plan} plan.`,
    notOnSale: 'This module is not for sale yet.',
    academy: {
      name: 'Academy',
      pitch: 'Train every person and keep them qualified, station by station.',
      points: ['A ready-made training path for each station', 'Revalidation and reminders before the due date', 'Hands-on sign-off by the supervisor', 'Coverage per shift and an audit-ready register'],
    },
    records: {
      name: 'Records',
      pitch: 'Reliable data from the floor, without paper.',
      points: ['Checklists and repeated measurements', 'Trends and limits for each measurement', 'Export for quality and audits', 'Lot number, photos and authorized deviation'],
    },
  },
  advisor: {
    eyebrow: 'For your plant',
    see: 'See the offer',
    later: 'Later',
    limitTitle: {
      stations: 'Your stations are filling up',
      editors: 'Your team is growing',
      published_instructions: 'Your library is growing',
    },
    limitFull: (outOf: string, offer: string) => `${outOf}: the limit is reached. ${offer}.`,
    limitNear: (outOf: string, offer: string) => `${outOf}. ${offer}.`,
    tried: (n: number, plan: string) => `Tried ${fmt(n)} times this month: it comes with ${plan}.`,
    triedModule: (n: number, module: string, trial: string) => `Tried ${fmt(n)} times this month: it is the ${module} module${trial ? `, ${trial}` : ''}.`,
    triedModulePlan: (n: number, module: string, plan: string) => `Tried ${fmt(n)} times this month: the ${module} module adds on to the ${plan} plan.`,
    creditsTitle: 'Your AI credits run out',
    credits: (n: number, offer: string) => `Ran out ${fmt(n)} times this month. ${offer}.`,
    academyTitle: 'Your training is taking off',
    academy: (n: number, trial: string) => `${fmt(n)} trainings passed this month. The Academy tracks revalidations and the coverage of every shift${trial ? `: ${trial}` : ''}.`,
    recordsTitle: 'Your records are piling up',
    records: (n: number, trial: string) => `${fmt(n)} records this month. The Records module shows their trends and exports them for quality${trial ? `: ${trial}` : ''}.`,
  },
  request: {
    ask: 'Ask the administrator',
    sent: 'Request sent',
    sentHint: 'Your administrator will see it in “To see”.',
    already: 'Already requested: your administrator sees it in “To see”.',
    failed: 'The request did not go through',
  },
  subscription: {
    title: 'Subscription',
    subtitle: 'Operators are never counted: you pay for authoring, stations and AI.',
    currentPlan: 'Current plan',
    states: {
      none: 'No subscription',
      trialing: 'Trial in progress',
      active: 'Active',
      grace: 'Payment overdue — your features stay available',
      suspended: 'Suspended — pay the invoice',
      canceled: 'Cancelled',
      expired: 'Expired',
    },
    endsOn: (date: string) => `ends on ${date}`,
    manage: 'Manage subscription and invoices',
    unreadable: 'Couldn’t read the subscription status',
    usage: 'What you’re using',
    plans: 'Plans',
    current: 'Current',
    beforeTax: 'before tax',
    choose: (plan: string) => `Choose ${plan}`,
    askAdmin: 'Ask your administrator',
    enterprise: 'Need several plants, single sign-on or a contract? Write to us: we’ll tailor an Enterprise plan for you.',
  },
  errors: {
    signedOut: 'No user signed in',
    status: (status: number) => `Error ${status}`,
  },
}
