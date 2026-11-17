import type { feedback as Fr } from '../fr/feedback'

/** 작업자 의견. */
export const feedback: typeof Fr = {
  list: {
    search: '지시서, 단어, 사람, 작업대 검색',
    title: '작업자 의견',
    subtitle: '현장에서 올라온 의견입니다. 한 번에 단계를 고치면 작업자가 새 버전을 보게 됩니다.',
    open: (n: number) => `미처리${n ? ` (${n.toLocaleString('ko-KR')})` : ''}`,
    handled: '처리됨',
    all: '전체',
    emptyOpenTitle: '처리할 의견이 없습니다',
    emptyOpenDescription: '작업자는 플레이어에서 두 번 눌러 불명확한 단계를 알릴 수 있습니다. 그 의견이 여기에 도착합니다.',
    emptyHandledTitle: '처리된 의견이 없습니다',
    emptyHandledDescription: '처리한 의견이 여기에 표시됩니다.',
    untitled: '지시서',
    step: (n: number) => `${n.toLocaleString('ko-KR')}단계`,
    comment: (text: string) => `“${text}”`,
    operator: '작업자',
    station: '작업대',
    sources: { kiosk: '태블릿', link: '링크', app: '앱' },
    photo: '첨부 사진',
    fix: '수정',
    markHandled: '처리됨',
    dismiss: '닫기',
    handledBy: (name: string) => `${name} 님이 처리함`,
    dismissedBy: (name: string) => `${name} 님이 닫음`,
    markedHandled: '의견을 처리됨으로 표시했습니다',
    dismissed: '의견을 닫았습니다',
    updateFailed: '의견을 업데이트하지 못했습니다',
  },
}
