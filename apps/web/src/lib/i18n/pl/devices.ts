import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Twoja firma korzysta z {app}',
    body: 'To konto należy do firmy, która pracuje w {app}: tam czekają na Ciebie jej instrukcje i stanowiska.',
    open: 'Otwórz {app}',
    install: 'Zainstaluj {app}',
    noStore: 'Zespół Twojej firmy przekaże Ci link do aplikacji {app}.',
    computer: 'Na komputerze: {host}',
  },
  getApp: {
    title: 'CLIP w Twoim telefonie',
    why: 'Nagrywaj czynność na stanowisku i otwieraj instrukcje kodem QR.',
    scan: 'Skieruj aparat telefonu na ten kod: otworzy App Store lub Google Play.',
    ask: 'Brak linku dla tego telefonu? Przekaże Ci go zespół Twojej firmy.',
    menu: 'Aplikacja mobilna',
    later: 'Później',
    pageTitle: 'Zainstaluj CLIP',
    pageBack: 'Kontynuuj w przeglądarce',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'Na Twoim komputerze',
    body: 'Pisz na dużym ekranie: otwórz {host} w przeglądarce i zaloguj się na to samo konto.',
    copy: 'Kopiuj adres',
    copied: 'Adres skopiowany',
    send: 'Wyślij link',
    later: 'Później',
  },
}
