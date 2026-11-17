import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('pt-BR')

export const inbox: typeof Fr = {
  title: 'Para ver',
  open: (n: number) => (n ? `Para ver: ${num(n)} ${n === 1 ? 'nova' : 'novas'}` : 'Para ver'),
  empty: 'Nada para ver por enquanto',
  emptyHint: 'As aprovações pendentes, os perigos informados e os desvios registrados aparecerão aqui.',
  kinds: {
    review: 'Para aprovar',
    changes: 'Alterações solicitadas',
    danger: 'Perigo informado',
    deviation: 'Desvio registrado',
    request: 'Solicitado',
    requalify: 'Para revalidar',
    lateTraining: 'Treinamento atrasado',
  },
  by: (name: string) => `por ${name}`,
  comesWith: (name: string) => `Incluído em ${name}`,
  isNew: 'Novo',
}
