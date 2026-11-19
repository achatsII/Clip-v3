import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Je bedrijf gebruikt {app}',
    body: 'Dit account hoort bij een bedrijf dat met {app} werkt: daar staan de instructies en stations voor je klaar.',
    open: '{app} openen',
    install: '{app} installeren',
    noStore: 'Het team van je bedrijf geeft je de link naar de app {app}.',
    computer: 'Op de computer: {host}',
  },
  getApp: {
    title: 'CLIP op je telefoon',
    why: 'Film de handeling aan het station en open instructies via hun QR-code.',
    scan: 'Richt de camera van je telefoon op deze code: hij opent de App Store of Google Play.',
    ask: 'Geen link voor deze telefoon? Het team van je bedrijf geeft hem je.',
    menu: 'De mobiele app',
    later: 'Later',
    pageTitle: 'CLIP installeren',
    pageBack: 'Verder in de browser',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'Op je computer',
    body: 'Werk op een groot scherm: open {host} in je browser en log in met hetzelfde account.',
    copy: 'Adres kopiëren',
    copied: 'Adres gekopieerd',
    send: 'Link versturen',
    later: 'Later',
  },
}
