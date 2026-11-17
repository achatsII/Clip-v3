import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('hu-HU')

export const inbox: typeof Fr = {
  title: 'Megtekintendő',
  open: (n: number) => (n ? `Megtekintendő: ${num(n)} új` : 'Megtekintendő'),
  empty: 'Egyelőre nincs megtekintendő',
  emptyHint: 'Itt jelennek meg a jóváhagyandó dolgok, a jelzett veszélyek és a rögzített eltérések.',
  kinds: {
    review: 'Jóváhagyandó',
    changes: 'Módosítást kértek',
    danger: 'Veszélyt jeleztek',
    deviation: 'Eltérést rögzítettek',
    request: 'Kérés',
    requalify: 'Megújítandó',
    lateTraining: 'Késő betanítás',
  },
  by: (name: string) => `${name} által`,
  comesWith: (name: string) => `Ezzel jár: ${name}`,
  isNew: 'Új',
}
