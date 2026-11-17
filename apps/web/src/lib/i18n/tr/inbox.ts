import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('tr-TR')

export const inbox: typeof Fr = {
  title: 'Görülecekler',
  open: (n: number) => (n ? `Görülecekler: ${num(n)} yeni` : 'Görülecekler'),
  empty: 'Şimdilik görülecek bir şey yok',
  emptyHint: 'Yapılacak onaylar, bildirilen tehlikeler ve kaydedilen sapmalar burada görünür.',
  kinds: {
    review: 'Onaylanacak',
    changes: 'Değişiklik istendi',
    danger: 'Tehlike bildirildi',
    deviation: 'Sapma kaydedildi',
    request: 'İstendi',
    requalify: 'Yeniden doğrulanacak',
    lateTraining: 'Geciken eğitim',
  },
  by: (name: string) => `${name} tarafından`,
  comesWith: (name: string) => `${name} ile`,
  isNew: 'Yeni',
}
