import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Vaše firma používá {app}',
    body: 'Tento účet patří firmě, která pracuje s {app}: tam na vás čekají její instrukce a pracoviště.',
    open: 'Otevřít {app}',
    install: 'Nainstalovat {app}',
    noStore: 'Odkaz na aplikaci {app} vám dá tým vaší firmy.',
    computer: 'Na počítači: {host}',
  },
  getApp: {
    title: 'CLIP ve vašem telefonu',
    why: 'Natočte úkon na pracovišti a otevírejte instrukce pomocí jejich QR kódu.',
    scan: 'Namiřte fotoaparát telefonu na tento kód: otevře App Store nebo Google Play.',
    ask: 'Pro tento telefon chybí odkaz? Dá vám ho tým vaší firmy.',
    menu: 'Mobilní aplikace',
    later: 'Později',
    pageTitle: 'Nainstalovat CLIP',
    pageBack: 'Pokračovat v prohlížeči',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'Na vašem počítači',
    body: 'Pracujte na velké obrazovce: otevřete {host} v prohlížeči a přihlaste se stejným účtem.',
    copy: 'Kopírovat adresu',
    copied: 'Adresa zkopírována',
    send: 'Poslat odkaz',
    later: 'Později',
  },
}
