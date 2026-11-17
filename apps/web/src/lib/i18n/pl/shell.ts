import type { shell as Fr } from '../fr/shell'

/** La coquille : navigation, menus, compte, lecteur de code. */
export const shell: typeof Fr = {
  opening: 'Otwieranie CLIP…',
  mainNav: 'Nawigacja główna',
  nav: {
    home: 'Start',
    instructions: 'Instrukcje',
    stations: 'Stanowiska',
    feedback: 'Opinie',
    stats: 'Statystyki',
    team: 'Zespół',
    records: 'Rejestr',
    import: 'Import dokumentów',
    billing: 'Plan i kredyty',
    settings: 'Ustawienia',
    more: 'Więcej',
  },
  newInstruction: 'Nowa instrukcja',
  account: 'Moje konto',
  appearance: 'Wygląd',
  signOut: 'Wyloguj się',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Wersja ${v}`,
    built: (date: string) => `wydana ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `Aplikacja ${platform === 'ios' ? 'iPhone' : 'Android'} ${v}${build ? ` (${build})` : ''}`,
    title: 'Informacje o CLIP',
    hint: 'Ostatnia liczba rośnie z każdą aktualizacją: porównaj ją z tą, o której Ci powiedziano.',
  },
  aiConsent: {
    title: 'Zanim użyjesz AI',
    body: 'Aby pisać i edytować Twoje instrukcje, CLIP wysyła Twoje zdjęcia, wideo, notatki głosowe i tekst do usług sztucznej inteligencji Google i OpenAI, za pośrednictwem platformy Intelligence Industrielle.',
    more: 'Nic nie jest wysyłane bez Twojej zgody. Możesz ją wycofać w Ustawieniach › Dane.',
    privacy: 'Polityka prywatności',
    accept: 'Zgadzam się',
    refuse: 'Nie teraz',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `Edytujesz ${title ? `„${title}”` : 'instrukcję'} ${device === 'app' ? 'w aplikacji mobilnej' : 'na innym komputerze'}`,
  },
  scan: {
    title: 'Zeskanuj kod',
    prompt: 'Zeskanuj kod stanowiska lub części',
    failed: 'Nie udało się otworzyć czytnika kodów',
    aim: 'Skieruj na kod QR lub kod kreskowy',
    noCamera: 'Aparat jest niedostępny. Zezwól na niego w przeglądarce lub wpisz kod w wyszukiwarce.',
  },
}
