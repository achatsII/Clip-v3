import type { home as Fr } from '../fr/home'

const plural = (n: number, one: string, few: string, many: string) => (n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many)

/** L’accueil. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Cześć, ${name}`,
    morning: (name: string) => `Dzień dobry, ${name}`,
    afternoon: (name: string) => `Dzień dobry, ${name}`,
    evening: (name: string) => `Dobry wieczór, ${name}`,
  },
  hero: {
    eyebrow: 'Nowa instrukcja',
    line1: 'Nagraj. Powiedz.',
    line2: 'AI to napisze.',
    video: 'Wideo',
    voiceNote: 'Notatka głosowa',
    document: 'PDF lub Word',
  },
  reader: {
    find: 'Znajdź instrukcję',
    myStations: 'Moje stanowiska',
  },
  setup: {
    title: 'Uruchom swój zakład',
    hint: 'Kilka minut, krok po kroku.',
    publish: 'Opublikuj pierwszą instrukcję',
    station: 'Utwórz stanowisko i jego kod QR',
    logo: 'Dodaj logo zakładu',
    invite: 'Zaproś współpracownika',
    standard: 'Dostosuj standard redagowania',
    hide: 'Ukryj konfigurację',
    hideShort: 'Ukryj',
    show: 'Pokaż',
    compact: (done: number, total: number) => `Konfiguracja: ${done} z ${total}`,
  },
  tiles: {
    published: 'Opublikowane',
    coverage: (percent: number) => `${percent.toLocaleString('pl-PL')}% stanowisk objętych`,
    noStation: 'Brak stanowisk',
    views: 'Wyświetlenia · 7 dni',
    viewsHint: 'Tablety, kody QR i linki',
    stations: 'Stanowiska',
    stationsHint: 'Z ich instrukcjami',
    streak: 'Seria',
    streakWeeks: (weeks: number) => `${plural(weeks, 'tydzień', 'tygodnie', 'tygodni')} z rzędu z publikacją`,
    streakStart: 'Opublikuj w tym tygodniu, aby zacząć serię',
  },
  renewal: {
    title: (count: number) => `Do przeglądu (${count.toLocaleString('pl-PL')})`,
    hint: 'Zbliża się termin ich przeglądu. Nic się nie zmieniło? Potwierdź jednym dotknięciem.',
  },
  review: {
    title: (count: number) => `Do zatwierdzenia (${count.toLocaleString('pl-PL')})`,
    hint: 'Zmienione kroki są oznaczone w edytorze.',
  },
  feedback: {
    title: 'Opinie operatorów',
    seeAll: 'Zobacz wszystkie',
    quote: (comment: string) => `„${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Krok ${step.toLocaleString('pl-PL')} · ${ago}`),
    none: 'Brak nowych opinii.',
  },
  drafts: { title: 'Wróć do pracy', hint: 'Twoje wersje robocze w toku' },
  forYou: { title: 'Dla Ciebie', hint: 'Na podstawie Twoich obowiązków' },
  library: {
    count: (n: number) => `${n.toLocaleString('pl-PL')} ${plural(n, 'opublikowana instrukcja', 'opublikowane instrukcje', 'opublikowanych instrukcji')}`,
    hint: 'Na hali działa żywa biblioteka. Aktualizuj ją dzięki opiniom operatorów.',
  },
}
