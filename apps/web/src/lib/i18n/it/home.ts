import type { home as Fr } from '../fr/home'

/** La home. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Ciao, ${name}`,
    morning: (name: string) => `Buongiorno, ${name}`,
    afternoon: (name: string) => `Buon pomeriggio, ${name}`,
    evening: (name: string) => `Buonasera, ${name}`,
  },
  hero: {
    eyebrow: 'Nuova istruzione',
    line1: 'Filma. Racconta.',
    line2: 'L’IA scrive.',
    video: 'Video',
    voiceNote: 'Nota vocale',
    document: 'PDF o Word',
  },
  reader: {
    find: 'Trova un’istruzione',
    myStations: 'Le mie postazioni',
  },
  setup: {
    title: 'Metti in funzione il tuo stabilimento',
    hint: 'Pochi minuti, un passaggio alla volta.',
    publish: 'Pubblica una prima istruzione',
    station: 'Crea una postazione e il suo codice QR',
    logo: 'Aggiungi il logo dello stabilimento',
    invite: 'Invita un collega',
    standard: 'Regola il tuo standard di redazione',
    hide: 'Nascondi la configurazione',
    hideShort: 'Nascondi',
    show: 'Mostra',
    compact: (done: number, total: number) => `Configurazione: ${done} di ${total}`,
  },
  tiles: {
    published: 'Pubblicate',
    coverage: (percent: number) => `${percent.toLocaleString('it-IT')}% delle postazioni coperte`,
    noStation: 'Ancora nessuna postazione',
    views: 'Visualizzazioni · 7 giorni',
    viewsHint: 'Tablet, codici QR e link',
    stations: 'Postazioni',
    stationsHint: 'Con le loro istruzioni',
    streak: 'Serie',
    streakWeeks: (weeks: number) => `${weeks !== 1 ? 'settimane consecutive' : 'settimana consecutiva'} con qualcosa di pubblicato`,
    streakStart: 'Pubblica questa settimana per iniziare la tua serie',
  },
  renewal: {
    title: (count: number) => `Da rivedere (${count.toLocaleString('it-IT')})`,
    hint: 'Si avvicinano alla data di revisione. Nulla è cambiato? Conferma con un tocco.',
  },
  review: {
    title: (count: number) => `Da approvare (${count.toLocaleString('it-IT')})`,
    hint: 'I passaggi modificati sono segnalati nell’editor.',
  },
  feedback: {
    title: 'Riscontri degli operatori',
    seeAll: 'Vedi tutti',
    quote: (comment: string) => `“${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Passaggio ${step.toLocaleString('it-IT')} · ${ago}`),
    none: 'Nessun nuovo riscontro.',
  },
  drafts: { title: 'Riprendi da dove eri', hint: 'Le tue bozze in corso' },
  forYou: { title: 'Per te', hint: 'In base alle tue responsabilità' },
  library: {
    count: (n: number) => `${n.toLocaleString('it-IT')} ${n !== 1 ? 'istruzioni pubblicate' : 'istruzione pubblicata'}`,
    hint: 'Il tuo reparto ha una biblioteca viva. Tienila aggiornata con i riscontri degli operatori.',
  },
}
