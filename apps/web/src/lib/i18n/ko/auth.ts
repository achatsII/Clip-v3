import type { auth as Fr } from '../fr/auth'

/** 로그인, 가입, 비밀번호 찾기, 환영 화면, 세션 시작과 네이티브 셸. */
export const auth: typeof Fr = {
  login: {
    tagline: '작업 지시서',
    hero: {
      film: '찍으면,',
      aiWrites: 'AI가 쓰고,',
      floorFollows: '현장이 따릅니다.',
      pitch: '명확하고 시각적인 작업 지시서를 몇 분 만에 만들고, 모든 작업자가 계정 없이 맞는 작업대에서 찾아봅니다.',
      inputs: '동영상, 사진, 음성 메모, 기존 PDF',
      generated: '자동 생성된 단계, 동영상 클립, 주의사항',
      qrAndTablet: 'QR 코드와 작업대 태블릿, 계정 불필요',
    },
    titles: { login: '다시 오신 것을 환영합니다', signup: '계정 만들기', forgot: '비밀번호 재설정' },
    intros: {
      login: '로그인해서 지시서를 만들고 관리하세요.',
      signup: '무료로 시작하세요. 카드는 필요 없습니다.',
      forgot: '새 비밀번호를 정할 수 있는 링크를 보내 드립니다.',
    },
    sent: {
      title: '이메일을 보냈습니다',
      body: (email: string) => `${email} 계정이 있다면 몇 분 안에 링크가 도착합니다.`,
      back: '로그인으로 돌아가기',
    },
    fullname: '이름',
    fullnamePlaceholder: '김서연',
    company: '공장 또는 회사',
    optional: '선택',
    companyPlaceholder: '벨셰즈 공장',
    email: '이메일',
    emailPlaceholder: 'you@company.com',
    password: '비밀번호',
    forgotLink: '비밀번호 찾기',
    submit: { login: '로그인', signup: '계정 만들기', forgot: '링크 보내기' },
    /** 로그인으로 AI 사용에 동의합니다 (Apple 규정 5.1.2(i)). */
    aiNotice: {
      login: '로그인하면 Google의 AI가 사진, 동영상, 음성 메모, 텍스트를 분석하는 것과, 이미지를 요청할 때 OpenAI가 사진을 받는 것에 동의하게 됩니다.',
      signup: '계정을 만들면 Google의 AI가 사진, 동영상, 음성 메모, 텍스트를 분석하는 것과, 이미지를 요청할 때 OpenAI가 사진을 받는 것에 동의하게 됩니다.',
    },
    privacy: '개인정보 처리방침',
    errors: {
      email: '올바른 이메일을 입력하세요.',
      passwordTooShort: '비밀번호는 8자 이상이어야 합니다.',
      passwordMissing: '비밀번호를 입력하세요.',
    },
    newHere: '처음이세요?',
    createFreeAccount: '무료 계정 만들기',
    askForInvitation: '계정이 없나요? 관리자에게 초대를 요청하세요.',
    haveAccount: '이미 계정이 있습니다',
    language: '언어',
  },
  welcome: {
    setup: '설정',
    progress: (step: number, total: number) => `${total.toLocaleString('ko-KR')}단계 중 ${step.toLocaleString('ko-KR')}단계`,
    name: {
      title: '공장 이름이 무엇인가요?',
      hint: '작업대 태블릿과 PDF에 표시됩니다.',
      placeholder: '벨셰즈 공장',
    },
    goals: {
      title: '가장 먼저 문서화하고 싶은 것은 무엇인가요?',
      hint: '여러 개를 골라도 됩니다. 홈 화면이 이에 맞춰 구성됩니다.',
      sstAndLockout: '안전보건 및 잠금',
    },
    approval: {
      title: '누가 지시서를 승인하나요?',
      hint: '설정에서 언제든 바꿀 수 있습니다.',
      none: '승인 없음: 바로 게시',
      noneHint: '작성한 사람이 책임집니다.',
      one: '승인자가 먼저 확인',
      oneHint: '감독자, 품질 또는 안전보건 담당자가 변경 내용을 보고 게시합니다.',
    },
    ready: {
      title: (plant: string) => `${plant} 준비 완료!`,
      hint: '첫 지시서는 몇 분이면 됩니다. 작업하는 사람이 설명하는 모습을 촬영하세요.',
      create: '첫 지시서 만들기',
      import: '기존 PDF 가져오기',
      later: '나중에',
    },
    finish: '완료',
    nothingPublished: '본인 확인 없이는 아무것도 게시되지 않습니다.',
  },
  session: {
    defaultOrgName: '내 공장',
    me: '나',
    openFailed: 'CLIP 앱을 열지 못했습니다',
    serverDown: '서버가 지금 응답하지 않습니다. 연결 상태를 확인한 뒤 다시 시도하세요.',
  },
  native: {
    unavailable: '네이티브 기능을 사용할 수 없습니다',
    noResponse: '모바일 앱이 응답하지 않습니다',
  },
}
