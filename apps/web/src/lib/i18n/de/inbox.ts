import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('de-DE')

export const inbox: typeof Fr = {
  title: 'Zu sehen',
  open: (n: number) => (n ? `Zu sehen: ${num(n)} neu` : 'Zu sehen'),
  empty: 'Im Moment nichts zu sehen',
  emptyHint: 'Anstehende Freigaben, gemeldete Gefahren und erfasste Abweichungen erscheinen hier.',
  kinds: {
    review: 'Freizugeben',
    changes: 'Änderungen angefordert',
    danger: 'Gefahr gemeldet',
    deviation: 'Abweichung erfasst',
    request: 'Angefragt',
    requalify: 'Neu zu bestätigen',
    lateTraining: 'Überfällige Schulung',
  },
  by: (name: string) => `von ${name}`,
  comesWith: (name: string) => `Enthalten in ${name}`,
  isNew: 'Neu',
}
