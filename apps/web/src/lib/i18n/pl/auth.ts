import type { auth as Fr } from '../fr/auth'

/** Connexion, inscription, mot de passe oublié, bienvenue ; l’ouverture de la session et la coquille native. */
export const auth: typeof Fr = {
  login: {
    tagline: 'Instrukcje stanowiskowe',
    hero: {
      film: 'Nagraj to.',
      aiWrites: 'AI to opisze.',
      floorFollows: 'Hala za tym pójdzie.',
      pitch: 'Czytelna, obrazkowa instrukcja stanowiskowa w kilka minut, którą każdy operator znajdzie na swoim stanowisku, bez konta.',
      inputs: 'Wideo, zdjęcia, notatki głosowe lub stare PDF-y',
      generated: 'Wygenerowane kroki, klipy wideo i ostrzeżenia',
      qrAndTablet: 'Kod QR i tablet na stanowisku, bez konta',
    },
    titles: { login: 'Witaj ponownie', signup: 'Utwórz konto', forgot: 'Zresetuj hasło' },
    intros: {
      login: 'Zaloguj się, aby tworzyć instrukcje i nimi zarządzać.',
      signup: 'Na start za darmo. Bez karty.',
      forgot: 'Wyślemy Ci link do ustawienia nowego hasła.',
    },
    sent: {
      title: 'E-mail wysłany',
      body: (email: string) => `Jeśli istnieje konto dla ${email}, w ciągu kilku minut dostaniesz link.`,
      back: 'Wróć do logowania',
    },
    fullname: 'Imię i nazwisko',
    fullnamePlaceholder: 'Anna Kowalska',
    company: 'Zakład lub firma',
    optional: 'opcjonalnie',
    companyPlaceholder: 'Zakład w Bellechasse',
    email: 'E-mail',
    emailPlaceholder: 'ty@firma.pl',
    password: 'Hasło',
    forgotLink: 'Nie pamiętasz?',
    submit: { login: 'Zaloguj się', signup: 'Utwórz konto', forgot: 'Wyślij link' },
    /** Consent to the AI, given by signing in (Apple's rule 5.1.2(i)). */
    aiNotice: {
      login: 'Logując się, zgadzasz się, aby AI Google analizowało Twoje zdjęcia, wideo, notatki głosowe i tekst oraz aby OpenAI otrzymywało zdjęcie, gdy poprosisz o obraz.',
      signup: 'Tworząc konto, zgadzasz się, aby AI Google analizowało Twoje zdjęcia, wideo, notatki głosowe i tekst oraz aby OpenAI otrzymywało zdjęcie, gdy poprosisz o obraz.',
    },
    privacy: 'Polityka prywatności',
    errors: {
      email: 'Wpisz poprawny adres e-mail.',
      passwordTooShort: 'Hasło musi mieć co najmniej 8 znaków.',
      passwordMissing: 'Wpisz hasło.',
    },
    newHere: 'Pierwszy raz tutaj?',
    createFreeAccount: 'Utwórz bezpłatne konto',
    askForInvitation: 'Nie masz jeszcze konta? Poproś administratora o zaproszenie.',
    haveAccount: 'Mam już konto',
    language: 'Język',
  },
  welcome: {
    setup: 'Konfiguracja',
    progress: (step: number, total: number) => `${step.toLocaleString('pl-PL')} z ${total.toLocaleString('pl-PL')}`,
    name: {
      title: 'Jak nazywa się Twój zakład?',
      hint: 'Nazwa pojawi się na tabletach na stanowiskach i w plikach PDF.',
      placeholder: 'Zakład w Bellechasse',
    },
    goals: {
      title: 'Co chcesz udokumentować najpierw?',
      hint: 'Wybierz tyle, ile chcesz. Strona startowa ułoży się wokół tych wyborów.',
      sstAndLockout: 'BHP i blokady (LOTO)',
    },
    approval: {
      title: 'Kto zatwierdza instrukcje?',
      hint: 'Możesz to zmienić w ustawieniach.',
      none: 'Nikt: publikuję od razu',
      noneHint: 'Kto napisał instrukcję, ten za nią odpowiada.',
      one: 'Najpierw sprawdza zatwierdzający',
      oneHint: 'Kierownik, jakość lub BHP: widzi, co się zmieniło, i publikuje.',
    },
    ready: {
      title: (plant: string) => `Wszystko gotowe, ${plant}!`,
      hint: 'Pierwsza instrukcja zajmie kilka minut: nagraj osobę wykonującą zadanie, gdy je opisuje.',
      create: 'Utwórz moją pierwszą instrukcję',
      import: 'Zaimportuj moje stare PDF-y',
      later: 'Później',
    },
    finish: 'Zakończ',
    nothingPublished: 'Nic nie zostanie opublikowane bez Ciebie.',
  },
  session: {
    defaultOrgName: 'Mój zakład',
    me: 'Ja',
    openFailed: 'Nie udało się otworzyć CLIP',
    serverDown: 'Serwer w tej chwili nie odpowiada. Sprawdź połączenie i spróbuj ponownie.',
  },
  native: {
    unavailable: 'Funkcja natywna niedostępna',
    noResponse: 'Aplikacja mobilna nie odpowiada',
  },
}
