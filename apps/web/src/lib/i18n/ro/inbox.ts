import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('ro-RO')

export const inbox: typeof Fr = {
  title: 'De văzut',
  open: (n: number) => (n ? `De văzut: ${num(n)} ${n === 1 ? 'nou' : 'noi'}` : 'De văzut'),
  empty: 'Nimic de văzut deocamdată',
  emptyHint: 'Aprobările de făcut, pericolele raportate și abaterile înregistrate vor apărea aici.',
  kinds: {
    review: 'De aprobat',
    changes: 'Modificări cerute',
    danger: 'Pericol raportat',
    deviation: 'Abatere înregistrată',
    request: 'Cerere',
    requalify: 'De revalidat',
    lateTraining: 'Instruire întârziată',
  },
  by: (name: string) => `de ${name}`,
  comesWith: (name: string) => `Cu ${name}`,
  isNew: 'Nou',
}
