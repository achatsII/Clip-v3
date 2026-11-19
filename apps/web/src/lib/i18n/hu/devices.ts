import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Az Ön cége ezt használja: {app}',
    body: 'Ez a fiók egy olyan cégé, amely ezt az alkalmazást használja: {app}. Az utasításai és munkaállomásai ott várják Önt.',
    open: 'Megnyitás: {app}',
    install: 'Telepítés: {app}',
    noStore: 'Az alkalmazás ({app}) linkjét cége csapatától kapja meg.',
    computer: 'Számítógépen: {host}',
  },
  getApp: {
    title: 'CLIP a telefonján',
    why: 'Filmezze le a mozdulatot a munkaállomásnál, és nyissa meg az utasításokat a QR-kódjukkal.',
    scan: 'Irányítsa a telefon kameráját erre a kódra: megnyitja az App Store-t vagy a Google Playt.',
    ask: 'Nincs link ehhez a telefonhoz? Cége csapatától kapja meg.',
    menu: 'A mobilalkalmazás',
    later: 'Később',
    pageTitle: 'CLIP telepítése',
    pageBack: 'Folytatás a böngészőben',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'A számítógépén',
    body: 'Dolgozzon nagy képernyőn: nyissa meg ezt a címet a böngészőben: {host}, és jelentkezzen be ugyanazzal a fiókkal.',
    copy: 'Cím másolása',
    copied: 'Cím kimásolva',
    send: 'Link küldése',
    later: 'Később',
  },
}
