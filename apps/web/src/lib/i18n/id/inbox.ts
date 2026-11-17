import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('id-ID')

export const inbox: typeof Fr = {
  title: 'Perlu dilihat',
  open: (n: number) => (n ? `Perlu dilihat: ${num(n)} baru` : 'Perlu dilihat'),
  empty: 'Belum ada yang perlu dilihat',
  emptyHint: 'Persetujuan yang harus diberikan, bahaya yang dilaporkan, dan penyimpangan yang tercatat akan muncul di sini.',
  kinds: {
    review: 'Perlu disetujui',
    changes: 'Perubahan diminta',
    danger: 'Bahaya dilaporkan',
    deviation: 'Penyimpangan tercatat',
    request: 'Diminta',
    requalify: 'Perlu validasi ulang',
    lateTraining: 'Pelatihan terlambat',
  },
  by: (name: string) => `oleh ${name}`,
  comesWith: (name: string) => `Termasuk dalam ${name}`,
  isNew: 'Baru',
}
