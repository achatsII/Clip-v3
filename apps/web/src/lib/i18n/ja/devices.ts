import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'あなたの会社は {app} を使っています',
    body: 'このアカウントは {app} を使う会社のものです。手順書とステーションはそちらにあります。',
    open: '{app} を開く',
    install: '{app} をインストール',
    noStore: '{app} アプリのリンクは、会社の担当チームから受け取ってください。',
    computer: 'パソコンでは：{host}',
  },
  getApp: {
    title: 'スマートフォンで CLIP',
    why: 'ステーションで作業を撮影し、QR コードから手順書を開けます。',
    scan: 'スマートフォンのカメラをこのコードに向けてください。App Store または Google Play が開きます。',
    ask: 'このスマートフォン用のリンクがない場合は、会社の担当チームから受け取ってください。',
    menu: 'モバイルアプリ',
    later: 'あとで',
    pageTitle: 'CLIP をインストール',
    pageBack: 'ブラウザーで続ける',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'パソコンで',
    body: '大きな画面で作業できます。ブラウザーで {host} を開き、同じアカウントでログインしてください。',
    copy: 'アドレスをコピー',
    copied: 'アドレスをコピーしました',
    send: 'リンクを送る',
    later: 'あとで',
  },
}
