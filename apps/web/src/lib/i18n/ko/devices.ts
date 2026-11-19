import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: '회사에서 사용하는 앱: {app}',
    body: '이 계정의 회사는 {app} 앱을 사용합니다. 지시서와 작업대는 그곳에 있습니다.',
    open: '{app} 열기',
    install: '{app} 설치',
    noStore: '{app} 앱 링크는 회사 담당 팀에서 받으세요.',
    computer: '컴퓨터에서: {host}',
  },
  getApp: {
    title: '휴대폰에서 CLIP 사용하기',
    why: '작업대에서 작업을 촬영하고 QR 코드로 지시서를 여세요.',
    scan: '휴대폰 카메라로 이 코드를 비추세요. App Store 또는 Google Play가 열립니다.',
    ask: '이 휴대폰용 링크가 없나요? 회사 담당 팀에서 받으세요.',
    menu: '모바일 앱',
    later: '나중에',
    pageTitle: 'CLIP 설치',
    pageBack: '브라우저에서 계속',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: '컴퓨터에서',
    body: '큰 화면에서 작업하세요. {host} 주소를 브라우저에서 열고 같은 계정으로 로그인하세요.',
    copy: '주소 복사',
    copied: '주소를 복사했습니다',
    send: '링크 보내기',
    later: '나중에',
  },
}
