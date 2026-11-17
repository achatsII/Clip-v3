import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('es-MX')

export const inbox: typeof Fr = {
  title: 'Por ver',
  open: (n: number) => (n ? `Por ver: ${num(n)} nuevo${n !== 1 ? 's' : ''}` : 'Por ver'),
  empty: 'Nada por ver por ahora',
  emptyHint: 'Aquí aparecerán las aprobaciones pendientes, los peligros reportados y las desviaciones registradas.',
  kinds: {
    review: 'Por aprobar',
    changes: 'Cambios solicitados',
    danger: 'Peligro reportado',
    deviation: 'Desviación registrada',
    request: 'Solicitado',
    requalify: 'Por revalidar',
    lateTraining: 'Formación atrasada',
  },
  by: (name: string) => `por ${name}`,
  comesWith: (name: string) => `Con ${name}`,
  isNew: 'Nuevo',
}
