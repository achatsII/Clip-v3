import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('ko-KR')

export const inbox: typeof Fr = {
  title: '확인할 항목',
  open: (n: number) => (n ? `확인할 항목: 새 ${num(n)}건` : '확인할 항목'),
  empty: '지금은 확인할 항목이 없습니다',
  emptyHint: '승인할 건, 보고된 위험, 기록된 이탈이 여기에 표시됩니다.',
  kinds: {
    review: '승인 필요',
    changes: '수정 요청',
    danger: '위험 보고',
    deviation: '이탈 기록',
    request: '요청',
    requalify: '재검증 필요',
    lateTraining: '교육 지연',
  },
  by: (name: string) => `${name} 님`,
  comesWith: (name: string) => `${name} 포함`,
  isNew: '신규',
}
