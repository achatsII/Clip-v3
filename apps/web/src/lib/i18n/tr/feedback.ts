import type { feedback as Fr } from '../fr/feedback'

/** Operatör geri bildirimleri. */
export const feedback: typeof Fr = {
  list: {
    search: 'Talimat, sözcük, kişi veya istasyon arayın',
    title: 'Operatör geri bildirimleri',
    subtitle: 'Sahanın bildirdikleri: adımı tek dokunuşla düzeltin, operatör yeni sürümü görsün.',
    open: (n: number) => `Açık${n ? ` (${n.toLocaleString('tr-TR')})` : ''}`,
    handled: 'İşlendi',
    all: 'Tümü',
    emptyOpenTitle: 'İşlenecek bir şey yok',
    emptyOpenDescription: 'Operatörler anlaşılmayan bir adımı oynatıcıdan iki dokunuşla bildirir. Geri bildirimleri buraya düşecek.',
    emptyHandledTitle: 'İşlenmiş geri bildirim yok',
    emptyHandledDescription: 'İşlediğiniz geri bildirimler burada görünür.',
    untitled: 'Talimat',
    step: (n: number) => `adım ${n.toLocaleString('tr-TR')}`,
    comment: (text: string) => `“${text}”`,
    operator: 'Operatör',
    station: 'istasyon',
    sources: { kiosk: 'tablet', link: 'bağlantı', app: 'uygulama' },
    photo: 'Ekli fotoğraf',
    fix: 'Düzelt',
    markHandled: 'İşlendi',
    dismiss: 'Yoksay',
    handledBy: (name: string) => `İşleyen: ${name}`,
    dismissedBy: (name: string) => `Yok sayan: ${name}`,
    markedHandled: 'Geri bildirim işlendi olarak işaretlendi',
    dismissed: 'Geri bildirim yok sayıldı',
    updateFailed: 'Geri bildirim güncellenemedi',
  },
}
