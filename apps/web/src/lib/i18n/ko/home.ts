import type { home as Fr } from '../fr/home'

/** 홈. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `안녕하세요, ${name} 님`,
    morning: (name: string) => `좋은 아침입니다, ${name} 님`,
    afternoon: (name: string) => `안녕하세요, ${name} 님`,
    evening: (name: string) => `좋은 저녁입니다, ${name} 님`,
  },
  hero: {
    eyebrow: '새 지시서',
    line1: '찍고, 말하세요.',
    line2: '쓰는 건 AI가 합니다.',
    video: '동영상',
    voiceNote: '음성 메모',
    document: 'PDF 또는 Word',
  },
  reader: {
    find: '지시서 찾기',
    myStations: '내 작업대',
  },
  setup: {
    title: '공장 시작하기',
    hint: '몇 분이면 됩니다. 한 번에 한 단계씩.',
    publish: '첫 지시서 게시하기',
    station: '작업대와 QR 코드 만들기',
    logo: '공장 로고 추가하기',
    invite: '동료 초대하기',
    standard: '작성 기준 조정하기',
    hide: '시작 안내 숨기기',
    hideShort: '숨기기',
    show: '보기',
    compact: (done: number, total: number) => `시작 안내: ${total}개 중 ${done}개`,
  },
  tiles: {
    published: '게시됨',
    coverage: (percent: number) => `작업대 ${percent.toLocaleString('ko-KR')}% 적용`,
    noStation: '작업대가 아직 없습니다',
    views: '조회 · 7일',
    viewsHint: '태블릿, QR 코드, 링크',
    stations: '작업대',
    stationsHint: '지시서 포함',
    streak: '연속 게시',
    streakWeeks: (weeks: number) => `주 연속 게시`,
    streakStart: '이번 주에 게시하면 연속 기록이 시작됩니다',
  },
  renewal: {
    title: (count: number) => `검토 필요 (${count.toLocaleString('ko-KR')})`,
    hint: '검토일이 다가오고 있습니다. 변경이 없다면 한 번 눌러 확인하세요.',
  },
  review: {
    title: (count: number) => `승인 필요 (${count.toLocaleString('ko-KR')})`,
    hint: '변경된 단계는 편집기에 표시됩니다.',
  },
  feedback: {
    title: '작업자 의견',
    seeAll: '모두 보기',
    quote: (comment: string) => `“${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `${step.toLocaleString('ko-KR')}단계 · ${ago}`),
    none: '새 의견이 없습니다.',
  },
  drafts: { title: '이어서 작업', hint: '작성 중인 초안' },
  forYou: { title: '내 업무', hint: '담당 업무 기준' },
  library: {
    count: (n: number) => `게시된 지시서 ${n.toLocaleString('ko-KR')}개`,
    hint: '현장에는 살아 있는 라이브러리가 있습니다. 작업자 의견으로 최신 상태를 유지하세요.',
  },
}
