import type { shell as Fr } from '../fr/shell'

/** Kabuk: gezinme, menüler, hesap, kod okuyucu. */
export const shell: typeof Fr = {
  opening: 'CLIP açılıyor…',
  mainNav: 'Ana gezinme',
  nav: {
    home: 'Ana sayfa',
    instructions: 'Talimatlar',
    stations: 'İstasyonlar',
    feedback: 'Geri bildirimler',
    stats: 'İstatistikler',
    team: 'Ekip',
    records: 'Kayıt defteri',
    import: 'Belge aktar',
    billing: 'Plan ve krediler',
    settings: 'Ayarlar',
    more: 'Diğer',
  },
  newInstruction: 'Yeni talimat',
  account: 'Hesabım',
  appearance: 'Görünüm',
  signOut: 'Çıkış yap',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Sürüm ${v}`,
    built: (date: string) => `yayın tarihi: ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `${platform === 'ios' ? 'iPhone' : 'Android'} uygulaması ${v}${build ? ` (${build})` : ''}`,
    title: 'CLIP hakkında',
    hint: 'Son sayı her güncellemede artar: size bildirilen sayıyla karşılaştırın.',
  },
  aiConsent: {
    title: 'Yapay zekâyı kullanmadan önce',
    body: 'Talimatlarınızı yazmak ve düzenlemek için CLIP; fotoğraflarınızı, videolarınızı, ses notlarınızı ve metinlerinizi Intelligence Industrielle platformu üzerinden Google ve OpenAI’ın yapay zekâ hizmetlerine gönderir.',
    more: 'Onayınız olmadan hiçbir şey gönderilmez. Onayınızı Ayarlar › Veriler bölümünden geri çekebilirsiniz.',
    privacy: 'Gizlilik politikası',
    accept: 'Kabul ediyorum',
    refuse: 'Şimdi değil',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `${title ? `“${title}” talimatını` : 'Bir talimatı'} ${device === 'app' ? 'mobil uygulamadan' : 'başka bir bilgisayardan'} düzenliyorsunuz`,
  },
  scan: {
    title: 'Kod tara',
    prompt: 'İstasyon veya parça kodunu tarayın',
    failed: 'Kod okuyucu açılamadı',
    aim: 'QR koda veya barkoda doğrultun',
    noCamera: 'Kamera kullanılamıyor. Tarayıcınızda izin verin veya kodu aramaya yazın.',
  },
}
