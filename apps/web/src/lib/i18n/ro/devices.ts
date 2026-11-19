import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Compania dumneavoastră folosește {app}',
    body: 'Acest cont aparține unei companii care lucrează cu {app}: acolo vă așteaptă instrucțiunile și posturile ei.',
    open: 'Deschide {app}',
    install: 'Instalează {app}',
    noStore: 'Echipa companiei dumneavoastră vă va da linkul aplicației {app}.',
    computer: 'Pe calculator: {host}',
  },
  getApp: {
    title: 'CLIP pe telefonul dumneavoastră',
    why: 'Filmați gestul la post și deschideți instrucțiunile cu codul lor QR.',
    scan: 'Îndreptați camera telefonului spre acest cod: deschide App Store sau Google Play.',
    ask: 'Niciun link pentru acest telefon? Vi-l va da echipa companiei dumneavoastră.',
    menu: 'Aplicația mobilă',
    later: 'Mai târziu',
    pageTitle: 'Instalează CLIP',
    pageBack: 'Continuă în browser',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'Pe calculatorul dumneavoastră',
    body: 'Lucrați pe un ecran mare: deschideți {host} în browser și conectați-vă cu același cont.',
    copy: 'Copiază adresa',
    copied: 'Adresă copiată',
    send: 'Trimite linkul',
    later: 'Mai târziu',
  },
}
