import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Ihr Unternehmen nutzt {app}',
    body: 'Dieses Konto gehört zu einem Unternehmen, das mit {app} arbeitet: Dort warten seine Anweisungen und Arbeitsplätze auf Sie.',
    open: '{app} öffnen',
    install: '{app} installieren',
    noStore: 'Das Team Ihres Unternehmens gibt Ihnen den Link zur App {app}.',
    computer: 'Am Computer: {host}',
  },
  getApp: {
    title: 'CLIP auf Ihrem Smartphone',
    why: 'Filmen Sie den Handgriff am Arbeitsplatz und öffnen Sie Anweisungen über ihren QR-Code.',
    scan: 'Richten Sie die Kamera Ihres Smartphones auf diesen Code: Er öffnet den App Store oder Google Play.',
    ask: 'Kein Link für dieses Smartphone? Das Team Ihres Unternehmens gibt ihn Ihnen.',
    menu: 'Die mobile App',
    later: 'Später',
    pageTitle: 'CLIP installieren',
    pageBack: 'Im Browser weitermachen',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'Auf Ihrem Computer',
    body: 'Arbeiten Sie auf einem großen Bildschirm: Öffnen Sie {host} im Browser und melden Sie sich mit demselben Konto an.',
    copy: 'Adresse kopieren',
    copied: 'Adresse kopiert',
    send: 'Link senden',
    later: 'Später',
  },
}
