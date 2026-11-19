import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Sua empresa usa {app}',
    body: 'Esta conta pertence a uma empresa que trabalha com {app}: as instruções e os postos dela esperam por você lá.',
    open: 'Abrir {app}',
    install: 'Instalar {app}',
    noStore: 'A equipe da sua empresa vai passar o link do app {app}.',
    computer: 'No computador: {host}',
  },
  getApp: {
    title: 'CLIP no seu celular',
    why: 'Filme o gesto no posto e abra as instruções pelo QR code.',
    scan: 'Aponte a câmera do celular para este código: ele abre a App Store ou o Google Play.',
    ask: 'Sem link para este celular? A equipe da sua empresa vai passar.',
    menu: 'O app para celular',
    later: 'Depois',
    pageTitle: 'Instalar o CLIP',
    pageBack: 'Continuar no navegador',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'No seu computador',
    body: 'Escreva numa tela grande: abra {host} no navegador e entre com a mesma conta.',
    copy: 'Copiar o endereço',
    copied: 'Endereço copiado',
    send: 'Enviar o link',
    later: 'Depois',
  },
}
