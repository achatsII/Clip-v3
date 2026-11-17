import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('cs-CZ')
const pl = (n: number, one: string, few: string, other: string) => (n === 1 ? one : n >= 2 && n <= 4 ? few : other)

export const blocks: typeof Fr = {
  make: 'Vytvořit sdílený blok',
  insert: 'Vložit sdílený blok',
  makeIntro: 'Vybrané kroky se stanou blokem: napsaný jednou se znovu používá v dalších instrukcích a všude se aktualizuje.',
  name: 'Název bloku',
  namePlaceholder: 'Zablokování lisu P-12',
  pick: 'Kroky bloku',
  makeConfirm: 'Vytvořit blok',
  made: (title: string) => `Blok „${title}“ vytvořen`,
  madeHint: 'Jeho kroky se nyní upravují v bloku.',
  makeFailed: 'Blok nebyl vytvořen',
  search: 'Hledat blok',
  empty: 'Zatím žádný sdílený blok',
  emptyHint: 'Vytvořte ho z kroků instrukce (nabídka „…“).',
  already: 'Už je v této instrukci',
  inserted: (title: string) => `Blok „${title}“ vložen`,
  insertFailed: 'Blok nebyl vložen',
  steps: (n: number) => `${num(n)} ${pl(n, 'krok', 'kroky', 'kroků')}`,
  stepNotice: (title: string, version: number) => `Krok ze sdíleného bloku „${title}“ (v${num(version)}): upravuje se v bloku, všude najednou.`,
  more: 'Další akce bloku',
  open: 'Otevřít blok',
  detach: 'Odpojit',
  detachConfirm: { title: 'Odpojit tyto kroky od bloku?', description: 'Stanou se vlastními kroky této instrukce: můžete je zde upravovat, ale už nenásledují blok.', confirm: 'Odpojit' },
  remove: 'Odebrat blok',
  removeConfirm: { title: 'Odebrat blok z této instrukce?', description: 'Jeho kroky z této instrukce zmizí; blok zůstane pro ostatní.', confirm: 'Odebrat' },
  thumb: 'Blok',
  chip: 'Sdílený blok',
  editing: (n: number) => (n ? `Sdílený blok použitý v ${num(n)} ${pl(n, 'instrukci', 'instrukcích', 'instrukcích')}: jeho publikací se aktualizují.` : 'Sdílený blok: zatím není v žádné instrukci. Vložte ho z instrukce, nabídka „…“.'),
  info: 'Název a podrobnosti',
  infoOpen: 'Upravit název a podrobnosti',
  infoTitle: 'Podrobnosti bloku',
  summaryPlaceholder: 'K čemu tento blok slouží, jednou větou',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Zmizí ze seznamu bloků. Jeho verze se zachovají.'
      : n === 1
        ? 'Instrukce, která ho používá, si ponechá jeho kroky tak, jak jsou; chcete-li je změnit, odpojte je tam.'
        : `${num(n)} ${pl(n, 'instrukce', 'instrukce', 'instrukcí')}, které ho používají, si ponechají jeho kroky tak, jak jsou; chcete-li je změnit, odpojte je v každé z nich.`,
  archived: 'Blok archivován',
  publishImpact: (n: number) => (n ? `Publikace aktualizuje ${num(n)} ${pl(n, 'instrukci', 'instrukce', 'instrukcí')}: aktuální se publikují znovu, ostatní dostanou blok do konceptu.` : 'Zatím ho nepoužívá žádná instrukce: vložte ho do instrukce, nabídka „…“.'),
  propagating: (done: number, total: number) => `Aktualizují se instrukce… ${num(done)} z ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} ${pl(republished, 'instrukce znovu publikována', 'instrukce znovu publikovány', 'instrukcí znovu publikováno')}` : '', drafts ? `${num(drafts)} ${pl(drafts, 'koncept aktualizován', 'koncepty aktualizovány', 'konceptů aktualizováno')}` : ''].filter(Boolean).join(' · ') || 'Žádná instrukce k aktualizaci',
  propagateFailed: (n: number) => `${num(n)} ${pl(n, 'instrukce nebyla aktualizována', 'instrukce nebyly aktualizovány', 'instrukcí nebylo aktualizováno')}: publikujte blok znovu a zkuste to znovu.`,
  filter: 'Sdílené bloky',
  newBlock: 'Nový blok',
  newTitle: 'Nový sdílený blok',
  total: (n: number) => (n > 1 ? `${num(n)} ${pl(n, 'sdílený blok', 'sdílené bloky', 'sdílených bloků')}` : n === 1 ? '1 sdílený blok' : 'Žádný sdílený blok'),
  emptyList: 'Kroky, které se vracejí všude (blokování, spuštění, OOPP): napsané jednou, aktuální v každé instrukci. Vytvořte ho zde nebo z kroků instrukce (nabídka „…“).',
  changelog: (title: string, version: number) => `Sdílený blok „${title}“ v${num(version)}.`,
  errors: {
    noSteps: 'Vyberte alespoň jeden krok.',
    locked: (title: string) => `Tento krok pochází ze sdíleného bloku „${title}“: upravuje se v bloku.`,
  },
}
