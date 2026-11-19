import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'La tua azienda usa {app}',
    body: 'Questo account appartiene a un’azienda che lavora con {app}: lì ti aspettano le sue istruzioni e le sue postazioni.',
    open: 'Apri {app}',
    install: 'Installa {app}',
    noStore: 'Il team della tua azienda ti darà il link dell’app {app}.',
    computer: 'Al computer: {host}',
  },
  getApp: {
    title: 'CLIP sul tuo telefono',
    why: 'Filma il gesto in postazione e apri le istruzioni dal loro codice QR.',
    scan: 'Inquadra questo codice con la fotocamera del telefono: apre l’App Store o Google Play.',
    ask: 'Nessun link per questo telefono? Te lo darà il team della tua azienda.',
    menu: 'L’app mobile',
    later: 'Più tardi',
    pageTitle: 'Installa CLIP',
    pageBack: 'Continua nel browser',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'Sul tuo computer',
    body: 'Scrivi su uno schermo grande: apri {host} nel browser e accedi con lo stesso account.',
    copy: 'Copia l’indirizzo',
    copied: 'Indirizzo copiato',
    send: 'Invia il link',
    later: 'Più tardi',
  },
}
