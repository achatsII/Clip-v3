import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('pl-PL')
const plural = (n: number, one: string, few: string, many: string) => (n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many)

export const blocks: typeof Fr = {
  make: 'Utwórz wspólny blok',
  insert: 'Wstaw wspólny blok',
  makeIntro: 'Wybrane kroki stają się blokiem: napisany raz, jest używany w innych instrukcjach i aktualizowany wszędzie.',
  name: 'Nazwa bloku',
  namePlaceholder: 'Zablokuj prasę P-12',
  pick: 'Kroki bloku',
  makeConfirm: 'Utwórz blok',
  made: (title: string) => `Blok „${title}” utworzony`,
  madeHint: 'Jego kroki edytuje się teraz w bloku.',
  makeFailed: 'Blok nie został utworzony',
  search: 'Szukaj bloku',
  empty: 'Brak wspólnych bloków',
  emptyHint: 'Utwórz go z kroków instrukcji (menu „…”).',
  already: 'Już w tej instrukcji',
  inserted: (title: string) => `Blok „${title}” wstawiony`,
  insertFailed: 'Blok nie został wstawiony',
  steps: (n: number) => `${num(n)} ${plural(n, 'krok', 'kroki', 'kroków')}`,
  stepNotice: (title: string, version: number) => `Krok ze wspólnego bloku „${title}” (v${num(version)}): edytuje się go w bloku, wszędzie naraz.`,
  more: 'Więcej działań na bloku',
  open: 'Otwórz blok',
  detach: 'Odłącz',
  detachConfirm: { title: 'Odłączyć te kroki od bloku?', description: 'Staną się własnymi krokami tej instrukcji: możesz je tu edytować, ale nie będą już podążać za blokiem.', confirm: 'Odłącz' },
  remove: 'Usuń blok',
  removeConfirm: { title: 'Usunąć blok z tej instrukcji?', description: 'Jego kroki znikną z tej instrukcji; blok zostaje w pozostałych.', confirm: 'Usuń' },
  thumb: 'Blok',
  chip: 'Wspólny blok',
  editing: (n: number) => (n ? `Wspólny blok używany w: ${num(n)} ${plural(n, 'instrukcji', 'instrukcjach', 'instrukcjach')}. Opublikowanie go aktualizuje je.` : 'Wspólny blok: nie ma go jeszcze w żadnej instrukcji. Wstaw go z instrukcji, menu „…”.'),
  info: 'Tytuł i szczegóły',
  infoOpen: 'Edytuj tytuł i szczegóły',
  infoTitle: 'Szczegóły bloku',
  summaryPlaceholder: 'Do czego służy ten blok, w jednym zdaniu',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Znika z listy bloków. Jego wersje są zachowane.'
      : n === 1
        ? 'Instrukcja, która go używa, zachowuje jego kroki bez zmian; aby je zmienić, odłącz je tam.'
        : `${num(n)} ${plural(n, 'instrukcja', 'instrukcje', 'instrukcji')}, które go używają, zachowują jego kroki bez zmian; aby je zmienić, odłącz je w każdej z nich.`,
  archived: 'Blok zarchiwizowany',
  publishImpact: (n: number) => (n ? `Opublikowanie zaktualizuje ${num(n)} ${plural(n, 'instrukcję', 'instrukcje', 'instrukcji')}: aktualne zostaną opublikowane ponownie, pozostałe dostaną blok w wersji roboczej.` : 'Żadna instrukcja go jeszcze nie używa: wstaw go do instrukcji, menu „…”.'),
  propagating: (done: number, total: number) => `Aktualizowanie instrukcji… ${num(done)} z ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} ${plural(republished, 'instrukcja opublikowana ponownie', 'instrukcje opublikowane ponownie', 'instrukcji opublikowanych ponownie')}` : '', drafts ? `${num(drafts)} ${plural(drafts, 'wersja robocza zaktualizowana', 'wersje robocze zaktualizowane', 'wersji roboczych zaktualizowanych')}` : ''].filter(Boolean).join(' · ') || 'Brak instrukcji do aktualizacji',
  propagateFailed: (n: number) => `${num(n)} ${plural(n, 'instrukcja nie została zaktualizowana', 'instrukcje nie zostały zaktualizowane', 'instrukcji nie zostało zaktualizowanych')}: opublikuj blok ponownie, aby spróbować jeszcze raz.`,
  filter: 'Wspólne bloki',
  newBlock: 'Nowy blok',
  newTitle: 'Nowy wspólny blok',
  total: (n: number) => (n > 1 ? `${num(n)} ${plural(n, 'wspólny blok', 'wspólne bloki', 'wspólnych bloków')}` : n === 1 ? '1 wspólny blok' : 'Brak wspólnych bloków'),
  emptyList: 'Kroki, które wracają wszędzie (blokada, uruchomienie, ŚOI): napisane raz, aktualne w każdej instrukcji. Utwórz blok tutaj lub z kroków instrukcji (menu „…”).',
  changelog: (title: string, version: number) => `Wspólny blok „${title}” v${num(version)}.`,
  errors: {
    noSteps: 'Wybierz co najmniej jeden krok.',
    locked: (title: string) => `Ten krok pochodzi ze wspólnego bloku „${title}”: edytuje się go w bloku.`,
  },
}
