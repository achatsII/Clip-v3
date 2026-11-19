import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: '你的公司使用 {app}',
    body: '此账号属于使用 {app} 的公司：它的作业指导书和工位都在那里。',
    open: '打开 {app}',
    install: '安装 {app}',
    noStore: '你公司的团队会把 {app} 应用的链接发给你。',
    computer: '在电脑上：{host}',
  },
  getApp: {
    title: '手机上的 CLIP',
    why: '在工位拍下操作，扫二维码打开作业指导书。',
    scan: '用手机相机对准这个二维码：它会打开 App Store 或 Google Play。',
    ask: '这部手机没有链接？你公司的团队会发给你。',
    menu: '手机应用',
    later: '以后再说',
    pageTitle: '安装 CLIP',
    pageBack: '继续在浏览器中使用',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: '在你的电脑上',
    body: '在大屏幕上工作：在浏览器中打开 {host}，用同一账号登录。',
    copy: '复制地址',
    copied: '地址已复制',
    send: '发送链接',
    later: '以后再说',
  },
}
