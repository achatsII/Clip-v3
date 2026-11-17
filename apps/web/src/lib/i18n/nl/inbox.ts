import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('nl-NL')

export const inbox: typeof Fr = {
  title: 'Te bekijken',
  open: (n: number) => (n ? `Te bekijken: ${num(n)} nieuw` : 'Te bekijken'),
  empty: 'Voorlopig niets te bekijken',
  emptyHint: 'Goed te keuren instructies, gemelde gevaren en vastgelegde afwijkingen verschijnen hier.',
  kinds: {
    review: 'Goed te keuren',
    changes: 'Wijzigingen gevraagd',
    danger: 'Gevaar gemeld',
    deviation: 'Afwijking vastgelegd',
    request: 'Aangevraagd',
    requalify: 'Opnieuw valideren',
    lateTraining: 'Opleiding te laat',
  },
  by: (name: string) => `door ${name}`,
  comesWith: (name: string) => `Met ${name}`,
  isNew: 'Nieuw',
}
