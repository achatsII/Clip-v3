import type { home as Fr } from '../fr/home'

const pl = (n: number, one: string, few: string, other: string) => (n === 1 ? one : n >= 2 && n <= 4 ? few : other)

/** L’accueil. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Dobrý den, ${name}`,
    morning: (name: string) => `Dobré ráno, ${name}`,
    afternoon: (name: string) => `Dobré odpoledne, ${name}`,
    evening: (name: string) => `Dobrý večer, ${name}`,
  },
  hero: {
    eyebrow: 'Nová instrukce',
    line1: 'Natočte to. Řekněte to.',
    line2: 'AI to napíše.',
    video: 'Video',
    voiceNote: 'Hlasová poznámka',
    document: 'PDF nebo Word',
  },
  reader: {
    find: 'Najít instrukci',
    myStations: 'Moje pracoviště',
  },
  setup: {
    title: 'Zprovozněte svůj závod',
    hint: 'Pár minut, krok za krokem.',
    publish: 'Publikovat první instrukci',
    station: 'Vytvořit pracoviště a jeho QR kód',
    logo: 'Přidat logo závodu',
    invite: 'Pozvat kolegu',
    standard: 'Upravit standard psaní',
    hide: 'Skrýt nastavení',
    hideShort: 'Skrýt',
    show: 'Zobrazit',
    compact: (done: number, total: number) => `Nastavení: ${done} z ${total}`,
  },
  tiles: {
    published: 'Publikováno',
    coverage: (percent: number) => `Pokryto ${percent.toLocaleString('cs-CZ')} % pracovišť`,
    noStation: 'Zatím žádná pracoviště',
    views: 'Zobrazení · 7 dní',
    viewsHint: 'Tablety, QR kódy a odkazy',
    stations: 'Pracoviště',
    stationsHint: 'S jejich instrukcemi',
    streak: 'Série',
    streakWeeks: (weeks: number) => `${pl(weeks, 'týden', 'týdny', 'týdnů')} v řadě s publikací`,
    streakStart: 'Publikujte tento týden a začněte sérii',
  },
  renewal: {
    title: (count: number) => `Ke kontrole (${count.toLocaleString('cs-CZ')})`,
    hint: 'Blíží se termín jejich kontroly. Nic se nezměnilo? Potvrďte to jedním klepnutím.',
  },
  review: {
    title: (count: number) => `Ke schválení (${count.toLocaleString('cs-CZ')})`,
    hint: 'Změněné kroky jsou v editoru označeny.',
  },
  feedback: {
    title: 'Zpětná vazba operátorů',
    seeAll: 'Zobrazit vše',
    quote: (comment: string) => `„${comment}“`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Krok ${step.toLocaleString('cs-CZ')} · ${ago}`),
    none: 'Žádná nová zpětná vazba.',
  },
  drafts: { title: 'Vraťte se k práci', hint: 'Vaše rozpracované koncepty' },
  forYou: { title: 'Pro vás', hint: 'Podle vašich odpovědností' },
  library: {
    count: (n: number) => `${n.toLocaleString('cs-CZ')} ${pl(n, 'publikovaná instrukce', 'publikované instrukce', 'publikovaných instrukcí')}`,
    hint: 'Vaše výroba má živou knihovnu. Udržujte ji aktuální díky zpětné vazbě operátorů.',
  },
}
