import type { shell as Fr } from '../fr/shell'

/** 셸: 탐색, 메뉴, 계정, 코드 리더. */
export const shell: typeof Fr = {
  opening: 'CLIP 여는 중…',
  mainNav: '주 메뉴',
  nav: {
    home: '홈',
    instructions: '지시서',
    stations: '작업대',
    feedback: '의견',
    stats: '통계',
    team: '팀',
    records: '기록부',
    import: '문서 가져오기',
    billing: '요금제와 크레딧',
    settings: '설정',
    more: '더보기',
  },
  newInstruction: '새 지시서',
  account: '내 계정',
  appearance: '화면 설정',
  signOut: '로그아웃',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `버전 ${v}`,
    built: (date: string) => `${date} 배포`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `${platform === 'ios' ? 'iPhone' : 'Android'} 앱 ${v}${build ? ` (${build})` : ''}`,
    title: 'CLIP 정보',
    hint: '마지막 숫자는 업데이트할 때마다 올라갑니다. 안내받은 번호와 비교해 보세요.',
  },
  aiConsent: {
    title: 'AI 사용 전 안내',
    body: '지시서를 작성하고 수정하기 위해, 사진, 동영상, 음성 메모, 텍스트를 CLIP에서 Intelligence Industrielle 플랫폼을 통해 Google과 OpenAI의 인공지능 서비스로 전송합니다.',
    more: '동의 없이는 아무것도 전송되지 않습니다. 설정 › 데이터에서 동의를 철회할 수 있습니다.',
    privacy: '개인정보 처리방침',
    accept: '동의합니다',
    refuse: '나중에',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `${device === 'app' ? '모바일 앱' : '다른 컴퓨터'}에서 ${title ? `“${title}”` : '지시서'}을(를) 편집 중입니다`,
  },
  scan: {
    title: '코드 스캔',
    prompt: '작업대 또는 부품 코드를 스캔하세요',
    failed: '코드 리더를 열지 못했습니다',
    aim: 'QR 코드나 바코드에 맞추세요',
    noCamera: '카메라를 사용할 수 없습니다. 브라우저에서 허용하거나, 검색창에 코드를 입력하세요.',
  },
}
