import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('it-IT')

export const inbox: typeof Fr = {
  title: 'Da vedere',
  open: (n: number) => (n ? `Da vedere: ${num(n)} ${n === 1 ? 'nuovo' : 'nuovi'}` : 'Da vedere'),
  empty: 'Per ora non c’è nulla da vedere',
  emptyHint: 'Qui compariranno le approvazioni da dare, i pericoli segnalati e gli scostamenti registrati.',
  kinds: {
    review: 'Da approvare',
    changes: 'Modifiche richieste',
    danger: 'Pericolo segnalato',
    deviation: 'Scostamento registrato',
    request: 'Richiesto',
    requalify: 'Da riconvalidare',
    lateTraining: 'Formazione in ritardo',
  },
  by: (name: string) => `da ${name}`,
  comesWith: (name: string) => `Con ${name}`,
  isNew: 'Nuovo',
}
