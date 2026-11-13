import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('en-CA')

export const inbox: typeof Fr = {
  title: 'To see',
  open: (n: number) => (n ? `To see: ${num(n)} new` : 'To see'),
  empty: 'Nothing to see for now',
  emptyHint: 'Approvals to do, reported dangers and recorded deviations will show up here.',
  kinds: {
    review: 'To approve',
    changes: 'Changes requested',
    danger: 'Danger reported',
    deviation: 'Deviation recorded',
    request: 'Requested',
  },
  by: (name: string) => `by ${name}`,
  comesWith: (name: string) => `With ${name}`,
  isNew: 'New',
}
