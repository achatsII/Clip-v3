import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('nl-NL')
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export const blocks: typeof Fr = {
  make: 'Een gedeeld blok maken',
  insert: 'Een gedeeld blok invoegen',
  makeIntro: 'De gekozen stappen worden een blok: eenmaal geschreven, hergebruikt in andere instructies en overal bijgewerkt.',
  name: 'Naam van het blok',
  namePlaceholder: 'Pers P-12 vergrendelen',
  pick: 'De stappen van het blok',
  makeConfirm: 'Het blok maken',
  made: (title: string) => `Blok “${title}” gemaakt`,
  madeHint: 'De stappen worden nu in het blok bewerkt.',
  makeFailed: 'Het blok is niet gemaakt',
  search: 'Een blok zoeken',
  empty: 'Nog geen gedeeld blok',
  emptyHint: 'Maak er een van de stappen van een instructie (menu “…”).',
  already: 'Al in deze instructie',
  inserted: (title: string) => `Blok “${title}” ingevoegd`,
  insertFailed: 'Het blok is niet ingevoegd',
  steps: (n: number) => `${num(n)} ${plural(n, 'stap', 'stappen')}`,
  stepNotice: (title: string, version: number) => `Stap uit het gedeelde blok “${title}” (v${num(version)}): hij wordt in het blok bewerkt, overal tegelijk.`,
  more: 'Meer blokacties',
  open: 'Het blok openen',
  detach: 'Loskoppelen',
  detachConfirm: { title: 'Deze stappen loskoppelen van het blok?', description: 'Ze worden eigen stappen van deze instructie: je kunt ze hier bewerken, maar ze volgen het blok niet meer.', confirm: 'Loskoppelen' },
  remove: 'Het blok verwijderen',
  removeConfirm: { title: 'Het blok uit deze instructie verwijderen?', description: 'De stappen verdwijnen uit deze instructie; het blok blijft bestaan voor de andere.', confirm: 'Verwijderen' },
  thumb: 'Blok',
  chip: 'Gedeeld blok',
  editing: (n: number) => (n ? `Gedeeld blok, gebruikt in ${num(n)} ${plural(n, 'instructie', 'instructies')}: publiceren werkt ze bij.` : 'Gedeeld blok: het zit nog in geen enkele instructie. Voeg het in vanuit een instructie, menu “…”.'),
  info: 'Titel en details',
  infoOpen: 'Titel en details bewerken',
  infoTitle: 'Details van het blok',
  summaryPlaceholder: 'Waar dit blok voor dient, in één zin',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Het verdwijnt uit de lijst met blokken. De versies blijven bewaard.'
      : n === 1
        ? 'De instructie die het gebruikt, houdt haar stappen zoals ze zijn; om ze te wijzigen, koppel je ze daar los.'
        : `De ${num(n)} instructies die het gebruiken, houden hun stappen zoals ze zijn; om ze te wijzigen, koppel je ze in elke instructie los.`,
  archived: 'Blok gearchiveerd',
  publishImpact: (n: number) => (n ? `Publiceren werkt ${num(n)} ${plural(n, 'instructie', 'instructies')} bij: actuele instructies worden opnieuw gepubliceerd, bij de andere komt het blok in het concept.` : 'Nog geen enkele instructie gebruikt het: voeg het in een instructie in, menu “…”.'),
  propagating: (done: number, total: number) => `Instructies bijwerken… ${num(done)} van ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} ${plural(republished, 'instructie opnieuw gepubliceerd', 'instructies opnieuw gepubliceerd')}` : '', drafts ? `${num(drafts)} ${plural(drafts, 'concept bijgewerkt', 'concepten bijgewerkt')}` : ''].filter(Boolean).join(' · ') || 'Geen instructie bij te werken',
  propagateFailed: (n: number) => `${num(n)} ${plural(n, 'instructie is', 'instructies zijn')} niet bijgewerkt: publiceer het blok opnieuw om het nogmaals te proberen.`,
  filter: 'Gedeelde blokken',
  newBlock: 'Nieuw blok',
  newTitle: 'Nieuw gedeeld blok',
  total: (n: number) => (n > 1 ? `${num(n)} gedeelde blokken` : n === 1 ? '1 gedeeld blok' : 'Geen gedeeld blok'),
  emptyList: 'De stappen die overal terugkomen (lock-out, opstarten, PBM): eenmaal geschreven, in elke instructie up-to-date. Maak er hier een, of van de stappen van een instructie (menu “…”).',
  changelog: (title: string, version: number) => `Gedeeld blok “${title}” v${num(version)}.`,
  errors: {
    noSteps: 'Kies minstens één stap.',
    locked: (title: string) => `Deze stap komt uit het gedeelde blok “${title}”: hij wordt in het blok bewerkt.`,
  },
}
