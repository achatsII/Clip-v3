import type { home as Fr } from '../fr/home'

const de = (n: number) => (new Intl.PluralRules('ro-RO').select(n) === 'other' ? 'de ' : '')

/** L’accueil. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Bună, ${name}`,
    morning: (name: string) => `Bună dimineața, ${name}`,
    afternoon: (name: string) => `Bună ziua, ${name}`,
    evening: (name: string) => `Bună seara, ${name}`,
  },
  hero: {
    eyebrow: 'Instrucțiune nouă',
    line1: 'Filmați. Spuneți.',
    line2: 'AI redactează.',
    video: 'Video',
    voiceNote: 'Notă vocală',
    document: 'PDF sau Word',
  },
  reader: {
    find: 'Găsiți o instrucțiune',
    myStations: 'Posturile mele',
  },
  setup: {
    title: 'Puneți fabrica în mișcare',
    hint: 'Câteva minute, un pas pe rând.',
    publish: 'Publicați o primă instrucțiune',
    station: 'Creați un post și codul lui QR',
    logo: 'Adăugați sigla fabricii',
    invite: 'Invitați un coleg',
    standard: 'Ajustați standardul de redactare',
    hide: 'Ascunde configurarea',
    hideShort: 'Ascunde',
    show: 'Arată',
    compact: (done: number, total: number) => `Configurare: ${done} din ${total}`,
  },
  tiles: {
    published: 'Publicate',
    coverage: (percent: number) => `${percent.toLocaleString('ro-RO')}% din posturi acoperite`,
    noStation: 'Încă niciun post',
    views: 'Vizualizări · 7 zile',
    viewsHint: 'Tablete, coduri QR și linkuri',
    stations: 'Posturi',
    stationsHint: 'Cu instrucțiunile lor',
    streak: 'Serie',
    streakWeeks: (weeks: number) => `${weeks === 1 ? 'săptămână' : 'săptămâni'} la rând cu ceva publicat`,
    streakStart: 'Publicați săptămâna aceasta pentru a începe seria',
  },
  renewal: {
    title: (count: number) => `De revizuit (${count.toLocaleString('ro-RO')})`,
    hint: 'Se apropie data revizuirii. Nimic nu s-a schimbat? Confirmați dintr-o atingere.',
  },
  review: {
    title: (count: number) => `De aprobat (${count.toLocaleString('ro-RO')})`,
    hint: 'Pașii modificați sunt marcați în editor.',
  },
  feedback: {
    title: 'Reacțiile operatorilor',
    seeAll: 'Vezi tot',
    quote: (comment: string) => `„${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Pasul ${step.toLocaleString('ro-RO')} · ${ago}`),
    none: 'Nicio reacție nouă.',
  },
  drafts: { title: 'Reluați de unde ați rămas', hint: 'Ciornele dumneavoastră în lucru' },
  forYou: { title: 'Pentru dumneavoastră', hint: 'În funcție de responsabilitățile dumneavoastră' },
  library: {
    count: (n: number) => `${n.toLocaleString('ro-RO')} ${n === 1 ? 'instrucțiune publicată' : `${de(n)}instrucțiuni publicate`}`,
    hint: 'Producția dumneavoastră are o bibliotecă vie. Țineți-o la zi cu reacțiile operatorilor.',
  },
}
