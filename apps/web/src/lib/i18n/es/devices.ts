import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Tu empresa usa {app}',
    body: 'Esta cuenta pertenece a una empresa que trabaja con {app}: allí te esperan sus instrucciones y sus puestos.',
    open: 'Abrir {app}',
    install: 'Instalar {app}',
    noStore: 'El equipo de tu empresa te dará el enlace de la app {app}.',
    computer: 'En la computadora: {host}',
  },
  getApp: {
    title: 'CLIP en tu teléfono',
    why: 'Filma el gesto en el puesto y abre las instrucciones con su código QR.',
    scan: 'Apunta la cámara del teléfono a este código: abre la App Store o Google Play.',
    ask: '¿No hay enlace para este teléfono? El equipo de tu empresa te lo dará.',
    menu: 'La app móvil',
    later: 'Más tarde',
    pageTitle: 'Instalar CLIP',
    pageBack: 'Seguir en el navegador',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'En tu computadora',
    body: 'Redacta en una pantalla grande: abre {host} en tu navegador e inicia sesión con la misma cuenta.',
    copy: 'Copiar la dirección',
    copied: 'Dirección copiada',
    send: 'Enviar el enlace',
    later: 'Más tarde',
  },
}
