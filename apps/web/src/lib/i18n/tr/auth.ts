import type { auth as Fr } from '../fr/auth'

/** Giriş, kayıt, şifremi unuttum, hoş geldiniz; oturum açma ve yerel kabuk. */
export const auth: typeof Fr = {
  login: {
    tagline: 'İş talimatları',
    hero: {
      film: 'Çekin.',
      aiWrites: 'Yapay zekâ yazsın.',
      floorFollows: 'Saha uygulasın.',
      pitch: 'Dakikalar içinde net, görsel bir iş talimatı; her operatör doğru istasyonda bulur, hesap gerekmez.',
      inputs: 'Videolar, fotoğraflar, ses notları veya eski PDF’ler',
      generated: 'Üretilen adımlar, video klipler ve uyarılar',
      qrAndTablet: 'QR kod ve istasyon tableti, hesapsız',
    },
    titles: { login: 'Tekrar hoş geldiniz', signup: 'Hesabınızı oluşturun', forgot: 'Şifrenizi sıfırlayın' },
    intros: {
      login: 'Talimatlarınızı oluşturmak ve yönetmek için giriş yapın.',
      signup: 'Ücretsiz başlayın. Kart gerekmez.',
      forgot: 'Yeni şifre seçmeniz için size bir bağlantı göndereceğiz.',
    },
    sent: {
      title: 'E-posta gönderildi',
      body: (email: string) => `${email} adresine ait bir hesap varsa birkaç dakika içinde bir bağlantı alacaksınız.`,
      back: 'Girişe dön',
    },
    fullname: 'Adınız',
    fullnamePlaceholder: 'Elif Yılmaz',
    company: 'Tesis veya şirket',
    optional: 'isteğe bağlı',
    companyPlaceholder: 'Bursa Tesisi',
    email: 'E-posta',
    emailPlaceholder: 'siz@sirket.com',
    password: 'Şifre',
    forgotLink: 'Unuttunuz mu?',
    submit: { login: 'Giriş yap', signup: 'Hesabımı oluştur', forgot: 'Bağlantıyı gönder' },
    aiNotice: {
      login: 'Giriş yaparak, Google’ın yapay zekâsının fotoğraflarınızı, videolarınızı, ses notlarınızı ve metinlerinizi analiz etmesini ve görsel istediğinizde OpenAI’ın bir fotoğraf almasını kabul etmiş olursunuz.',
      signup: 'Hesabınızı oluşturarak, Google’ın yapay zekâsının fotoğraflarınızı, videolarınızı, ses notlarınızı ve metinlerinizi analiz etmesini ve görsel istediğinizde OpenAI’ın bir fotoğraf almasını kabul etmiş olursunuz.',
    },
    privacy: 'Gizlilik politikası',
    errors: {
      email: 'Geçerli bir e-posta girin.',
      passwordTooShort: 'Şifreniz en az 8 karakter olmalı.',
      passwordMissing: 'Şifrenizi girin.',
    },
    newHere: 'Yeni misiniz?',
    createFreeAccount: 'Ücretsiz hesap oluştur',
    askForInvitation: 'Henüz hesabınız yok mu? Yöneticinizden davet isteyin.',
    haveAccount: 'Zaten hesabım var',
    language: 'Dil',
  },
  welcome: {
    setup: 'Kurulum',
    progress: (step: number, total: number) => `${step.toLocaleString('tr-TR')} / ${total.toLocaleString('tr-TR')}`,
    name: {
      title: 'Tesisinizin adı nedir?',
      hint: 'İstasyon tabletlerinde ve PDF’lerde görünecek.',
      placeholder: 'Bursa Tesisi',
    },
    goals: {
      title: 'Önce neyi belgelemek istiyorsunuz?',
      hint: 'İstediğiniz kadar seçin. Ana sayfanız bunlara göre düzenlenir.',
      sstAndLockout: 'İSG ve kilitleme',
    },
    approval: {
      title: 'Talimatları kim onaylıyor?',
      hint: 'Ayarlardan fikrinizi değiştirebilirsiniz.',
      none: 'Kimse: doğrudan yayınla',
      noneHint: 'Yazan kişi sorumludur.',
      one: 'Önce bir onaylayan kontrol eder',
      oneHint: 'Süpervizör, kalite veya İSG: neyin değiştiğini görür ve yayınlar.',
    },
    ready: {
      title: (plant: string) => `Hazırsınız, ${plant}!`,
      hint: 'İlk talimatınız birkaç dakika sürer: işi yapan birini, anlatırken çekin.',
      create: 'İlk talimatımı oluştur',
      import: 'Eski PDF’lerimi aktar',
      later: 'Sonra',
    },
    finish: 'Bitir',
    nothingPublished: 'Siz onaylamadan hiçbir şey yayınlanmaz.',
  },
  session: {
    defaultOrgName: 'Tesisim',
    me: 'Ben',
    openFailed: 'CLIP açılamadı',
    serverDown: 'Sunucu şu anda yanıt vermiyor. Bağlantınızı kontrol edip tekrar deneyin.',
  },
  native: {
    unavailable: 'Yerel özellik kullanılamıyor',
    noResponse: 'Mobil uygulama yanıt vermiyor',
  },
}
