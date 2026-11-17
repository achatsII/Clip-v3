import type { home as Fr } from '../fr/home'

/** Ana sayfa. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Merhaba ${name}`,
    morning: (name: string) => `Günaydın ${name}`,
    afternoon: (name: string) => `İyi günler ${name}`,
    evening: (name: string) => `İyi akşamlar ${name}`,
  },
  hero: {
    eyebrow: 'Yeni talimat',
    line1: 'Çekin. Anlatın.',
    line2: 'Yapay zekâ yazsın.',
    video: 'Video',
    voiceNote: 'Ses notu',
    document: 'PDF veya Word',
  },
  reader: {
    find: 'Talimat bul',
    myStations: 'İstasyonlarım',
  },
  setup: {
    title: 'Tesisinizi çalışır hale getirin',
    hint: 'Birkaç dakika, her seferinde bir adım.',
    publish: 'İlk talimatı yayınlayın',
    station: 'Bir istasyon ve QR kodunu oluşturun',
    logo: 'Tesisin logosunu ekleyin',
    invite: 'Bir iş arkadaşınızı davet edin',
    standard: 'Yazım standardınızı ayarlayın',
    hide: 'Kurulumu gizle',
    hideShort: 'Gizle',
    show: 'Göster',
    compact: (done: number, total: number) => `Kurulum: ${done} / ${total}`,
  },
  tiles: {
    published: 'Yayında',
    coverage: (percent: number) => `İstasyonların %${percent.toLocaleString('tr-TR')}’i kapsanıyor`,
    noStation: 'Henüz istasyon yok',
    views: 'Görüntüleme · 7 gün',
    viewsHint: 'Tabletler, QR kodlar ve bağlantılar',
    stations: 'İstasyonlar',
    stationsHint: 'Talimatlarıyla birlikte',
    streak: 'Seri',
    streakWeeks: (weeks: number) => `hafta üst üste yayın yapıldı`,
    streakStart: 'Serinizi başlatmak için bu hafta yayınlayın',
  },
  renewal: {
    title: (count: number) => `Gözden geçirilecek (${count.toLocaleString('tr-TR')})`,
    hint: 'Gözden geçirme tarihleri yaklaşıyor. Bir şey değişmediyse tek dokunuşla onaylayın.',
  },
  review: {
    title: (count: number) => `Onaylanacak (${count.toLocaleString('tr-TR')})`,
    hint: 'Değişen adımlar düzenleyicide işaretlidir.',
  },
  feedback: {
    title: 'Operatör geri bildirimleri',
    seeAll: 'Tümünü gör',
    quote: (comment: string) => `“${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Adım ${step.toLocaleString('tr-TR')} · ${ago}`),
    none: 'Yeni geri bildirim yok.',
  },
  drafts: { title: 'Kaldığınız yerden devam edin', hint: 'Devam eden taslaklarınız' },
  forYou: { title: 'Sizin için', hint: 'Sorumluluklarınıza göre' },
  library: {
    count: (n: number) => `${n.toLocaleString('tr-TR')} yayınlanmış talimat`,
    hint: 'Sahanızın yaşayan bir kitaplığı var. Operatör geri bildirimleriyle güncel tutun.',
  },
}
