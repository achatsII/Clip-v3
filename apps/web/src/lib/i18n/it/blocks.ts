import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('it-IT')
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export const blocks: typeof Fr = {
  make: 'Crea un blocco condiviso',
  insert: 'Inserisci un blocco condiviso',
  makeIntro: 'I passaggi scelti diventano un blocco: scritto una sola volta, si riutilizza in altre istruzioni e si aggiorna ovunque.',
  name: 'Nome del blocco',
  namePlaceholder: 'Lockout della pressa P-12',
  pick: 'I passaggi del blocco',
  makeConfirm: 'Crea il blocco',
  made: (title: string) => `Blocco “${title}” creato`,
  madeHint: 'I suoi passaggi ora si modificano nel blocco.',
  makeFailed: 'Il blocco non è stato creato',
  search: 'Cerca un blocco',
  empty: 'Ancora nessun blocco condiviso',
  emptyHint: 'Creane uno dai passaggi di un’istruzione (menu “…”).',
  already: 'Già in questa istruzione',
  inserted: (title: string) => `Blocco “${title}” inserito`,
  insertFailed: 'Il blocco non è stato inserito',
  steps: (n: number) => `${num(n)} ${plural(n, 'passaggio', 'passaggi')}`,
  stepNotice: (title: string, version: number) => `Passaggio del blocco condiviso “${title}” (v${num(version)}): si modifica nel blocco, ovunque in una volta.`,
  more: 'Altre azioni del blocco',
  open: 'Apri il blocco',
  detach: 'Scollega',
  detachConfirm: { title: 'Scollegare questi passaggi dal blocco?', description: 'Diventano passaggi propri di questa istruzione: puoi modificarli qui, ma non seguono più il blocco.', confirm: 'Scollega' },
  remove: 'Rimuovi il blocco',
  removeConfirm: { title: 'Rimuovere il blocco da questa istruzione?', description: 'I suoi passaggi escono da questa istruzione; il blocco resta per le altre.', confirm: 'Rimuovi' },
  thumb: 'Blocco',
  chip: 'Blocco condiviso',
  editing: (n: number) => (n ? `Blocco condiviso usato in ${num(n)} ${plural(n, 'istruzione', 'istruzioni')}: pubblicandolo le aggiorni.` : 'Blocco condiviso: non è ancora in nessuna istruzione. Inseriscilo da un’istruzione, menu “…”.'),
  info: 'Titolo e dettagli',
  infoOpen: 'Modifica titolo e dettagli',
  infoTitle: 'Dettagli del blocco',
  summaryPlaceholder: 'A cosa serve questo blocco, in una frase',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Esce dall’elenco dei blocchi. Le sue versioni vengono conservate.'
      : n === 1
        ? 'L’istruzione che lo usa conserva i suoi passaggi così come sono; per modificarli, scollegali lì.'
        : `Le ${num(n)} istruzioni che lo usano conservano i suoi passaggi così come sono; per modificarli, scollegali in ciascuna.`,
  archived: 'Blocco archiviato',
  publishImpact: (n: number) => (n ? `Pubblicando aggiorni ${num(n)} ${plural(n, 'istruzione', 'istruzioni')}: quelle aggiornate vengono ripubblicate, le altre ricevono il blocco nella bozza.` : 'Nessuna istruzione lo usa ancora: inseriscilo in un’istruzione, menu “…”.'),
  propagating: (done: number, total: number) => `Aggiornamento delle istruzioni… ${num(done)} di ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} ${plural(republished, 'istruzione ripubblicata', 'istruzioni ripubblicate')}` : '', drafts ? `${num(drafts)} ${plural(drafts, 'bozza aggiornata', 'bozze aggiornate')}` : ''].filter(Boolean).join(' · ') || 'Nessuna istruzione da aggiornare',
  propagateFailed: (n: number) => `${num(n)} ${plural(n, 'istruzione non è stata aggiornata', 'istruzioni non sono state aggiornate')}: pubblica di nuovo il blocco per riprovare.`,
  filter: 'Blocchi condivisi',
  newBlock: 'Nuovo blocco',
  newTitle: 'Nuovo blocco condiviso',
  total: (n: number) => (n > 1 ? `${num(n)} blocchi condivisi` : n === 1 ? '1 blocco condiviso' : 'Nessun blocco condiviso'),
  emptyList: 'I passaggi che tornano ovunque (lockout, avvio, DPI): scritti una sola volta, sempre aggiornati in ogni istruzione. Creane uno qui, oppure dai passaggi di un’istruzione (menu “…”).',
  changelog: (title: string, version: number) => `Blocco condiviso “${title}” v${num(version)}.`,
  errors: {
    noSteps: 'Scegli almeno un passaggio.',
    locked: (title: string) => `Questo passaggio proviene dal blocco condiviso “${title}”: si modifica nel blocco.`,
  },
}
