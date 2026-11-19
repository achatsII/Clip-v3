import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Perusahaan Anda memakai {app}',
    body: 'Akun ini milik perusahaan yang bekerja dengan {app}: instruksi dan stasiunnya menunggu Anda di sana.',
    open: 'Buka {app}',
    install: 'Pasang {app}',
    noStore: 'Tim perusahaan Anda akan memberikan tautan aplikasi {app}.',
    computer: 'Di komputer: {host}',
  },
  getApp: {
    title: 'CLIP di ponsel Anda',
    why: 'Rekam gerakan di stasiun dan buka instruksi lewat kode QR-nya.',
    scan: 'Arahkan kamera ponsel ke kode ini: kode ini membuka App Store atau Google Play.',
    ask: 'Tidak ada tautan untuk ponsel ini? Tim perusahaan Anda akan memberikannya.',
    menu: 'Aplikasi seluler',
    later: 'Nanti',
    pageTitle: 'Pasang CLIP',
    pageBack: 'Lanjutkan di peramban',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'Di komputer Anda',
    body: 'Bekerja di layar besar: buka {host} di peramban dan masuk dengan akun yang sama.',
    copy: 'Salin alamat',
    copied: 'Alamat disalin',
    send: 'Kirim tautan',
    later: 'Nanti',
  },
}
