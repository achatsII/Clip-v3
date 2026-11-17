import type { home as Fr } from '../fr/home'

/** De startpagina. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Hallo, ${name}`,
    morning: (name: string) => `Goedemorgen, ${name}`,
    afternoon: (name: string) => `Goedemiddag, ${name}`,
    evening: (name: string) => `Goedenavond, ${name}`,
  },
  hero: {
    eyebrow: 'Nieuwe instructie',
    line1: 'Film het. Zeg het.',
    line2: 'AI schrijft het.',
    video: 'Video',
    voiceNote: 'Spraaknotitie',
    document: 'PDF of Word',
  },
  reader: {
    find: 'Een instructie zoeken',
    myStations: 'Mijn stations',
  },
  setup: {
    title: 'Zet je fabriek in beweging',
    hint: 'Een paar minuten, stap voor stap.',
    publish: 'Een eerste instructie publiceren',
    station: 'Een station en zijn QR-code maken',
    logo: 'Het logo van de fabriek toevoegen',
    invite: 'Een collega uitnodigen',
    standard: 'Je schrijfstandaard aanpassen',
    hide: 'De installatie verbergen',
    hideShort: 'Verbergen',
    show: 'Tonen',
    compact: (done: number, total: number) => `Installatie: ${done} van ${total}`,
  },
  tiles: {
    published: 'Gepubliceerd',
    coverage: (percent: number) => `${percent.toLocaleString('nl-NL')}% van de stations gedekt`,
    noStation: 'Nog geen stations',
    views: 'Weergaven · 7 dagen',
    viewsHint: 'Tablets, QR-codes en links',
    stations: 'Stations',
    stationsHint: 'Met hun instructies',
    streak: 'Reeks',
    streakWeeks: (weeks: number) => `${weeks !== 1 ? 'weken' : 'week'} op rij met iets gepubliceerd`,
    streakStart: 'Publiceer deze week om je reeks te starten',
  },
  renewal: {
    title: (count: number) => `Te herzien (${count.toLocaleString('nl-NL')})`,
    hint: 'Hun herzieningsdatum nadert. Niets veranderd? Bevestig het met één tik.',
  },
  review: {
    title: (count: number) => `Goed te keuren (${count.toLocaleString('nl-NL')})`,
    hint: 'Gewijzigde stappen zijn in de editor gemarkeerd.',
  },
  feedback: {
    title: 'Terugmeldingen van operators',
    seeAll: 'Alles bekijken',
    quote: (comment: string) => `“${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Stap ${step.toLocaleString('nl-NL')} · ${ago}`),
    none: 'Geen nieuwe terugmeldingen.',
  },
  drafts: { title: 'Pak de draad weer op', hint: 'Je concepten in uitvoering' },
  forYou: { title: 'Voor jou', hint: 'Op basis van je verantwoordelijkheden' },
  library: {
    count: (n: number) => `${n.toLocaleString('nl-NL')} ${n !== 1 ? 'gepubliceerde instructies' : 'gepubliceerde instructie'}`,
    hint: 'Je werkvloer heeft een levende bibliotheek. Houd haar actueel met de terugmeldingen van operators.',
  },
}
