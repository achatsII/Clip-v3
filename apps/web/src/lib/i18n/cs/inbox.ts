import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('cs-CZ')

export const inbox: typeof Fr = {
  title: 'K pozornosti',
  open: (n: number) => (n ? `K pozornosti: ${num(n)} nových` : 'K pozornosti'),
  empty: 'Zatím nic k vyřízení',
  emptyHint: 'Zde se objeví schválení k vyřízení, nahlášená nebezpečí a zaznamenané odchylky.',
  kinds: {
    review: 'Ke schválení',
    changes: 'Vyžádané změny',
    danger: 'Nahlášené nebezpečí',
    deviation: 'Zaznamenaná odchylka',
    request: 'Požadováno',
    requalify: 'K opětovnému ověření',
    lateTraining: 'Zpožděné školení',
  },
  by: (name: string) => `od ${name}`,
  comesWith: (name: string) => `S ${name}`,
  isNew: 'Nové',
}
