import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `승인 필요: ${instruction}`,
    body: (who: string) => `${who} 님이 승인을 요청했습니다.`,
  },
  changes: {
    title: (instruction: string) => `수정 요청: ${instruction}`,
    body: (who: string, text: string) => `${who} 님이 수정을 요청했습니다: “${text}”`,
  },
  published: {
    title: (instruction: string) => `게시됨: ${instruction}`,
    body: '모든 서명이 완료되었습니다. 지시서가 작업대에 게시되었습니다.',
  },
  danger: {
    title: (station: string) => `위험 보고${station ? `: ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `보고자 ${who}` : '', text ? `“${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `이탈 기록${station ? `: ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `기록자 ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} 님의 요청: ${what}`,
    body: (target: string) => (target ? `${target}에 포함되어 있습니다. 자세한 내용은 구독 및 크레딧에서 확인하세요.` : '자세한 내용은 구독 및 크레딧에서 확인하세요.'),
  },
  test: {
    title: 'CLIP 알림 테스트',
    body: '알림이 정상적으로 도착했습니다.',
  },
  open: 'CLIP에서 열기',
  footer: '공장의 설정에 따라 이 CLIP 알림을 받고 있습니다. CLIP의 내 계정에서 해제할 수 있습니다.',
}
