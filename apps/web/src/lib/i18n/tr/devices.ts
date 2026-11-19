import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Şirketiniz {app} kullanıyor',
    body: 'Bu hesap {app} ile çalışan bir şirkete ait: talimatları ve istasyonları sizi orada bekliyor.',
    open: '{app} uygulamasını aç',
    install: '{app} uygulamasını yükle',
    noStore: '{app} uygulamasının bağlantısını şirketinizin ekibi verecek.',
    computer: 'Bilgisayarda: {host}',
  },
  getApp: {
    title: 'Telefonunuzda CLIP',
    why: 'İstasyonda işlemi filme alın ve talimatları QR kodlarıyla açın.',
    scan: 'Telefonunuzun kamerasını bu koda tutun: App Store veya Google Play açılır.',
    ask: 'Bu telefon için bağlantı yok mu? Şirketinizin ekibi verecek.',
    menu: 'Mobil uygulama',
    later: 'Sonra',
    pageTitle: 'CLIP uygulamasını yükle',
    pageBack: 'Tarayıcıda devam et',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'Bilgisayarınızda',
    body: 'Büyük ekranda çalışın: tarayıcınızda {host} adresini açın ve aynı hesapla giriş yapın.',
    copy: 'Adresi kopyala',
    copied: 'Adres kopyalandı',
    send: 'Bağlantıyı gönder',
    later: 'Sonra',
  },
}
