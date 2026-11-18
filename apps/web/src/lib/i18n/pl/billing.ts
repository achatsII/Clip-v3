import type { billing as Fr } from '../fr/billing'

/** Les deux formes d’un nom qu’on compte : « station », « stations ». Ici, `many` porte « nominatif pluriel|génitif pluriel|génitif singulier ». */
type Noun = { one: string; many: string }

const fmt = (n: number) => n.toLocaleString('pl-PL')
/** Les trois formes du polonais : 1, 2 à 4, 5 et plus. */
const plural = (n: number, one: string, few: string, many: string) => (n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many)
const parts = (noun: Noun) => noun.many.split('|')
const form = (n: number, noun: Noun) => {
  const [few, many] = parts(noun)
  return plural(n, noun.one, few, many ?? few)
}
/** « 150 kredytów ». */
const credits = (n: number) => `${fmt(n)} ${plural(n, 'kredyt', 'kredyty', 'kredytów')}`
/** « do 23 listopada 2026 », ou rien sans date. */
const until = (date: string | null) => (date ? ` do ${date}` : '')
const theStore = (store: string) => store
const dni = (n: number) => (n === 1 ? 'dzień' : 'dni')
const razy = (n: number) => (n === 1 ? 'raz' : 'razy')
/** Les durées de l’offre de bienvenue, par unité du magasin (le mois à défaut). */
const PERIODS: Record<string, [string, string, string]> = {
  DAY: ['dzień', 'dni', 'dni'],
  WEEK: ['tydzień', 'tygodnie', 'tygodni'],
  MONTH: ['miesiąc', 'miesiące', 'miesięcy'],
  YEAR: ['rok', 'lata', 'lat'],
}

/** L’abonnement, les crédits, les plans, la fenêtre des refus, l’achat dans le magasin. */
export const billing: typeof Fr = {
  credits,
  aiCredits: 'Kredyty AI',
  free: 'Bezpłatny',
  quote: 'Wycena indywidualna',
  contactSales: 'Porozmawiaj z zespołem CLIP',
  quoteInApp: 'Dla całego zakładu: zespół CLIP konfiguruje to razem z Twoją organizacją.',
  multiYear: 'Umowa na 3 lub 5 lat: do 25% taniej.',
  perMonth: '/ miesiąc',
  perYear: '/ rok',
  renewsOn: (date: string) => `Odnawia się ${date}.`,
  forecastLine: (date: string, days: number) => `Przy tym tempie skończą się około ${date}, ${fmt(days)} ${dni(days)} przed odnowieniem.`,
  forecastOffer: (plan: string, amount: string) => `${plan}: ${amount} miesięcznie.`,
  managedByAdmin: 'Twoim planem zarządza administrator zakładu.',
  retrySoon: 'Spróbuj ponownie za chwilę.',
  interval: {
    monthly: 'Miesięcznie',
    yearly: 'Rocznie',
    yearlySaving: (pct: number) => `Rocznie · −${fmt(pct)}%`,
    yearlyTwoMonthsFree: 'Rocznie · 2 miesiące gratis',
  },
  plans: {
    names: { free: 'Brak subskrypcji', solo: 'Solo', equipe: 'Zespół', usine: 'Zakład' },
    trialNote: (days: number) => `${days}-dniowy bezpłatny okres próbny przy pierwszej subskrypcji`,
    trialTerms: (after: string) => `Karta wymagana na początku; potem ${after}, chyba że zrezygnujesz przed końcem okresu próbnego.`,
    tryPlan: (plan: string, days: number) => `Wypróbuj plan ${plan} przez ${fmt(days)} ${dni(days)}`,
    pitch: {
      free: 'Brak subskrypcji: AI wchodzi w skład planów Solo i Zespół; plan Zespół można wypróbować za darmo przez 7 dni.',
      solo: 'Dla osoby, która dokumentuje swoją pracę i udostępnia ją kodem QR.',
      equipe: 'Dla kilku osób testujących to na jednej linii: zespół pisze, zatwierdza i tłumaczy.',
      usine: 'Dla całego zakładu lub kilku: wycena indywidualna, z prowadzonym wdrożeniem.',
    },
    perMonth: (amount: string) => `${amount} miesięcznie`,
    unlimited: (label: string, _feature: string) => `${label}: bez limitu`,
  },
  spent: {
    amount: (n: number) => `AI · wykorzystano ${credits(n)}`,
    preview: 'Podgląd: nic nie jest pobierane',
  },
  pill: {
    available: 'dostępnych kredytów',
    thisMonth: 'W tym miesiącu',
    granted: (n: number) => `${fmt(n)} przyznanych`,
    used: 'Wykorzystano',
    howItWorks: 'Każda odpowiedź AI jest rozliczana według rzeczywistego kosztu, po jej zakończeniu: liczba kredytów pokazuje się potem, nigdy wcześniej. Jeśli AI zawiedzie w połowie, liczy się tylko to, co już zrobiło.',
    viewSubscription: 'Zobacz moją subskrypcję',
  },
  lockBadge: 'Ulepsz',
  lowBalance: {
    text: (n: number, date: string | null) => `Zostało Ci ${credits(n)}${until(date)}.`,
    more: 'Więcej kredytów',
  },
  balance: {
    refused: 'Za mało kredytów AI na to działanie. Nic nie zostało pobrane.',
    monthly: 'Twoje kredyty AI na ten miesiąc.',
    exhausted: (date: string | null, refused: boolean) => `Brak kredytów AI${until(date)}.${refused ? ' Za odrzucone działanie nic nie pobrano.' : ''}`,
    notEnough: (left: number) => `Zostało Ci ${credits(left)}: to za mało na to działanie. Nic nie zostało pobrane.`,
    left: (left: number, date: string | null) => `Zostało Ci ${credits(left)}${until(date)}.`,
    renewal: (date: string | null) => `Żaden plan nie daje więcej.${date ? ` Twoje kredyty odnawiają się ${date}.` : ''}`,
  },
  limits: {
    nouns: {
      stations: { one: 'stanowisko', many: 'stanowiska|stanowisk|stanowiska' },
      editors: { one: 'autor', many: 'autorzy|autorów|autora' },
      published_instructions: { one: 'opublikowana instrukcja', many: 'opublikowane instrukcje|opublikowanych instrukcji|opublikowanej instrukcji' },
    },
    count: (n: number, noun: Noun) => `${fmt(n)} ${form(n, noun)}`,
    /** « 21 z 25 stanowisk » : le nom suit le total, au génitif. */
    outOf: (used: number, limit: number, noun: Noun) => `${fmt(used)} z ${fmt(limit)} ${limit === 1 ? parts(noun)[2] : parts(noun)[1]}`,
    title: {
      stations: 'Więcej stanowisk',
      editors: 'Więcej autorów',
      published_instructions: 'Więcej opublikowanych instrukcji',
    },
    noLimit: 'Twój plan nie ma tu limitu.',
    notIncluded: 'Twój obecny plan tego nie obejmuje.',
    allows: (count: string) => `Twój plan umożliwia: ${count}.`,
    reached: (count: string) => `Twój plan umożliwia: ${count}. Limit został osiągnięty.`,
    at: (outOf: string) => `Masz już: ${outOf}.`,
    notCounted: 'Czytelnicy i operatorzy nigdy nie są liczeni.',
    offer: (plan: string, count: string) => `${plan}: ${count}`,
    offerUnlimited: (plan: string, noun: Noun) => `${plan}: ${parts(noun)[0]} bez limitu`,
  },
  usage: {
    inPlan: (outOf: string) => `${outOf} w Twoim planie`,
    full: 'Limit osiągnięty',
    near: 'Prawie pełne',
    view: (plan: string) => `Zobacz plan ${plan}`,
  },
  paywall: {
    moreCredits: 'Więcej kredytów w tym miesiącu',
    unlockMore: 'Odblokuj więcej',
    suspended: 'Twoja subskrypcja jest zawieszona: zapłać fakturę, aby odzyskać funkcje.',
    notInPlan: 'Ta funkcja nie jest dostępna w Twoim obecnym planie.',
    recommended: 'Polecany plan',
    seePlansPage: 'Zobacz plany na stronie Subskrypcji.',
    managedByAdmin: 'Tym planem zarządza administrator zakładu.',
    upgradeTo: (plan: string) => `Przejdź na plan ${plan}`,
    askAdmin: (plan: string) => `Poproś administratora zakładu o przejście na plan ${plan}.`,
    valueReport: 'Przygotuj raport dla kierownictwa',
    allPlans: 'Zobacz wszystkie plany',
    manageFromPage: 'Zarządzaj subskrypcją na stronie Subskrypcji',
  },
  checkout: {
    adminOnly: 'Kupić może tylko administrator',
    askToUpgrade: 'Poproś go o zmianę planu.',
    failed: 'Nie otworzyło się okno płatności',
    notOnSale: 'Tego planu nie można jeszcze kupić',
    noPayment: 'Płatności jeszcze nie ma',
    choosePlan: 'Wybierz plan, aby zacząć.',
    portalFailed: 'Nie otworzył się portal rozliczeń',
  },
  store: {
    privacy: 'Polityka prywatności',
    appleTerms: 'Warunki użytkowania (Apple)',
    comingSoon: 'Subskrypcje w aplikacji pojawią się wkrótce.',
    planComingSoon: (store: string) => `Ten plan wkrótce pojawi się w ${theStore(store)}.`,
    intro: (price: string, n: number, unit: string) => {
      const p = PERIODS[unit] ?? PERIODS.MONTH
      return `Oferta powitalna: ${price} na ${fmt(n)} ${plural(n, p[0], p[1], p[2])}`
    },
    subscribeTo: (plan: string) => `Subskrybuj ${plan}`,
    /** La formulation standard d’Apple et de Google. */
    disclosure: (plan: string, price: string, yearly: boolean, store: string) =>
      `Subskrypcja ${plan}: ${price} ${yearly ? 'rocznie' : 'miesięcznie'}. Płatność zostanie pobrana z Twojego konta ${store} po potwierdzeniu zakupu. Subskrypcja odnawia się automatycznie, chyba że zostanie anulowana co najmniej 24 godziny przed końcem bieżącego okresu. Zarządzaj nią lub anuluj ją w ustawieniach konta ${store}.`,
    welcome: (plan: string) => `Witamy w planie ${plan}`,
    planOpen: 'Twój plan jest aktywny.',
    pending: 'Zakup oczekuje',
    pendingBody: (store: string) => `Twój plan odblokuje się, gdy tylko ${theStore(store)} to potwierdzi.`,
    failed: 'Zakup się nie powiódł',
    unresolved: 'Nie udało się powiązać zakupu z Twoim zakładem',
    unresolvedBody: 'Skontaktuj się z pomocą CLIP: uporządkujemy konto.',
    manageIn: (store: string) => `Zarządzaj moją subskrypcją w ${theStore(store)}`,
    managedWhereBought: 'Twoją subskrypcją zarządza się tam, gdzie została kupiona.',
    managedIn: (store: string) => `Twoją subskrypcją zarządza się w ${theStore(store)}.`,
    restore: 'Przywróć zakupy',
    restored: 'Zakupy przywrócone',
    nothingToRestore: 'Brak zakupów do przywrócenia',
    nothingToRestoreBody: (store: string) => `Żadna subskrypcja na tym koncie ${store} nie należy do tego zakładu.`,
    restoreFailed: 'Nie udało się przywrócić',
    failure: {
      notReady: 'Sklep się przygotowuje: spróbuj ponownie za chwilę.',
      productMissing: (store: string) => `Ten plan nie jest jeszcze dostępny w ${theStore(store)}.`,
      otherAccount: (store: string) => `Ten zakup w ${store} należy już do innego konta CLIP: zaloguj się na konto, które za niego zapłaciło.`,
      network: 'Brak połączenia: spróbuj ponownie, gdy sieć wróci.',
      notAllowed: 'Zakupy są zablokowane na tym urządzeniu (kontrola rodzicielska lub ustawienie urządzenia).',
      other: (store: string) => `Nie udało się zakończyć zakupu w ${theStore(store)}. Nic nie zostało pobrane.`,
    },
    blocked: {
      team: 'W aplikacji subskrypcje są osobiste: kupuje się je z konta jednoosobowego. Twój zakład zarządza swoim planem przez administratora.',
      elsewhere: (store: string) => `Masz już subskrypcję: zarządza się nią w ${theStore(store)}.`,
      elsewhereUnknown: 'Masz już subskrypcję: zarządza się nią tam, gdzie została kupiona.',
      unresolved: 'Zakupy nie są możliwe dla tego konta. Skontaktuj się z pomocą CLIP.',
    },
  },
  modules: {
    title: 'Moduły',
    subtitle: 'Dodaj je do planu Zespół lub Zakład, gdy zakład ich potrzebuje.',
    eyebrow: 'Moduł',
    trial: (days: number) => `${fmt(days)} ${dni(days)} gratis`,
    tryFree: (days: number) => `Wypróbuj za darmo przez ${fmt(days)} ${dni(days)}`,
    add: (name: string) => `Dodaj: ${name}`,
    after: (price: string) => `Potem ${price}`,
    active: 'Aktywny',
    /** An active module: go where it lives in the app. */
    open: 'Otwórz',
    withPlans: 'Dodatek do planu Zakład, na wycenę indywidualną',
    needsPlan: (name: string, plan: string) => `Moduł ${name} jest dodatkiem do planu ${plan}.`,
    notOnSale: 'Ten moduł nie jest jeszcze w sprzedaży.',
    academy: {
      name: 'Akademia',
      pitch: 'Szkol każdą osobę i utrzymuj jej kwalifikacje, stanowisko po stanowisku.',
      points: ['Gotowa ścieżka szkoleniowa dla każdego stanowiska', 'Ponowna walidacja i przypomnienia przed terminem', 'Zatwierdzenie praktyczne przez kierownika', 'Pokrycie według zmian i rejestr gotowy na audyt'],
    },
    records: {
      name: 'Odczyty',
      pitch: 'Wiarygodne dane z hali, bez papieru.',
      points: ['Listy kontrolne i powtarzane pomiary', 'Trendy i granice każdego pomiaru', 'Eksport na potrzeby jakości i audytów', 'Numer partii, zdjęcia i autoryzowane odchylenie'],
    },
  },
  /** The billing preview (payment not open yet): see the app as a subscribed plant. */
  preview: {
    eyebrow: 'Podgląd',
    title: 'Zobacz CLIP jako zakład z subskrypcją',
    text: 'Płatności nie są jeszcze otwarte. Wybierz, co miałby zakład: cała aplikacja się dostosuje, a nic nie jest kupowane.',
    plan: 'Plan',
    modules: 'Moduły',
    modulesNeed: 'Moduły są dodatkiem do planu Zespół lub Zakład.',
    credits: 'Kredyty AI',
    creditLevels: { full: 'Pełne', low: 'Niskie', empty: 'Wyczerpane' },
    deviceOnly: 'Tylko na tym urządzeniu.',
    reset: 'Otwórz wszystko ponownie',
    /** Back from a preview "purchase". */
    taken: (name: string) => `Podgląd: ${name} jest teraz aktywny`,
    takenHint: 'Gdy płatności zostaną otwarte, tu odbędzie się zakup.',
    appHint: 'W tym podglądzie nic nie jest kupowane: zmień plan, moduły lub kredyty u góry strony, a cała aplikacja się dostosuje.',
    moduleOff: 'Nie ma go w tym podglądzie: dodaj go u góry strony.',
    seeWith: (name: string) => `Zobacz CLIP z: ${name}`,
  },
  advisor: {
    eyebrow: 'Dla Twojego zakładu',
    see: 'Zobacz ofertę',
    later: 'Później',
    limitTitle: {
      stations: 'Twoje stanowiska się zapełniają',
      editors: 'Twój zespół rośnie',
      published_instructions: 'Twoja biblioteka rośnie',
    },
    limitFull: (outOf: string, offer: string) => `${outOf}: limit osiągnięty. ${offer}.`,
    limitNear: (outOf: string, offer: string) => `${outOf}. ${offer}.`,
    tried: (n: number, plan: string) => `Wypróbowano ${fmt(n)} ${razy(n)} w tym miesiącu: wchodzi w skład planu ${plan}.`,
    triedModule: (n: number, module: string, trial: string) => `Wypróbowano ${fmt(n)} ${razy(n)} w tym miesiącu: to moduł ${module}${trial ? `, ${trial}` : ''}.`,
    triedModulePlan: (n: number, module: string, plan: string) => `Wypróbowano ${fmt(n)} ${razy(n)} w tym miesiącu: moduł ${module} jest dodatkiem do planu ${plan}.`,
    creditsTitle: 'Twoje kredyty AI się kończą',
    credits: (n: number, offer: string) => `Kredyty skończyły się ${fmt(n)} ${razy(n)} w tym miesiącu. ${offer}.`,
    forecastTitle: 'Twoje kredyty skończą się przed odnowieniem',
    forecast: (date: string, days: number, offer: string) => `Przy tym tempie około ${date}, ${fmt(days)} ${dni(days)} przed odnowieniem. ${offer}.`,
    academyTitle: 'Twoje szkolenia nabierają tempa',
    academy: (n: number, trial: string) => `W tym miesiącu zaliczono ${fmt(n)} ${plural(n, 'szkolenie', 'szkolenia', 'szkoleń')}. Akademia śledzi ponowne walidacje i pokrycie każdej zmiany${trial ? `: ${trial}` : ''}.`,
    recordsTitle: 'Twoje odczyty się piętrzą',
    records: (n: number, trial: string) => `W tym miesiącu zapisano ${fmt(n)} ${plural(n, 'odczyt', 'odczyty', 'odczytów')}. Moduł Odczyty pokazuje ich trendy i eksportuje je na potrzeby jakości${trial ? `: ${trial}` : ''}.`,
  },
  request: {
    ask: 'Poproś administratora',
    sent: 'Prośba wysłana',
    sentHint: 'Twój administrator zobaczy ją w „Do zobaczenia”.',
    already: 'Już zgłoszono: administrator widzi to w „Do zobaczenia”.',
    failed: 'Prośba nie została wysłana',
  },
  subscription: {
    title: 'Subskrypcja',
    subtitle: 'Operatorzy nigdy nie są liczeni: płacisz za redagowanie, stanowiska i AI.',
    currentPlan: 'Obecny plan',
    states: {
      none: 'Brak subskrypcji',
      trialing: 'Trwa okres próbny',
      active: 'Aktywna',
      grace: 'Płatność zaległa — funkcje pozostają dostępne',
      suspended: 'Zawieszona — zapłać fakturę',
      canceled: 'Anulowana',
      expired: 'Wygasła',
    },
    endsOn: (date: string) => `kończy się ${date}`,
    trialUntil: (date: string) => `Okres próbny do ${date}: potem zaczyna się subskrypcja, chyba że wcześniej zrezygnujesz.`,
    manage: 'Zarządzaj subskrypcją i fakturami',
    unreadable: 'Nie udało się odczytać stanu subskrypcji',
    usage: 'Z czego korzystasz',
    plans: 'Plany',
    current: 'Obecny',
    beforeTax: 'netto',
    choose: (plan: string) => `Wybierz ${plan}`,
    askAdmin: 'Poproś administratora',
    enterprise: 'Kilka zakładów, jednokrotne logowanie lub umowa indywidualna? Zespół CLIP przygotuje z Tobą plan Zakład.',
    intent: {
      label: 'Plan wybrany na naszej stronie',
      continue: 'Przejdź do płatności',
    },
  },
  feature: {
    ai_credits: 'Kredyty AI miesięcznie',
    published_instructions: 'Opublikowane instrukcje',
    stations: 'Stanowiska z kodem QR i tabletem',
    editors: 'Autorzy i zatwierdzający',
    approvals: 'Zatwierdzenie przed publikacją',
    bulk_import: 'Import zbiorczy starych plików PDF i Word',
    translations: 'Tłumaczenie dla operatorów',
    voice_assistant: 'Asystent głosowy na stanowisku',
    adoption_stats: 'Statystyki wdrożenia i zwrot z inwestycji',
    brand_kit: 'Logo i kolory zakładu, pliki PDF bez znaków CLIP',
    full_export: 'Pełny eksport wszystkich instrukcji',
    shared_blocks: 'Wspólne bloki: kroki napisane raz, aktualne wszędzie',
    screen_capture: 'Nagrywanie ekranu programu: jeden krok na kliknięcie',
    ai_learning: 'AI uczy się z poprawek całego zespołu',
    academy: 'Akademia',
    records_plus: 'Zaawansowane odczyty',
  },
  count: {
    ai_credits: (n: number) => credits(n),
    published_instructions: (n: number) => `${fmt(n)} ${plural(n, 'instrukcja', 'instrukcje', 'instrukcji')}`,
    stations: (n: number) => `${fmt(n)} ${plural(n, 'stanowisko', 'stanowiska', 'stanowisk')}`,
    editors: (n: number) => `${fmt(n)} ${plural(n, 'autor', 'autorzy', 'autorów')}`,
  },
  errors: {
    signedOut: 'Nie zalogowano żadnego użytkownika',
    status: (status: number) => `Błąd ${status}`,
  },
}
