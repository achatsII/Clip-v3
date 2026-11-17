import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('ja-JP')

export const inbox: typeof Fr = {
  title: '確認事項',
  open: (n: number) => (n ? `確認事項：新着${num(n)}件` : '確認事項'),
  empty: '今のところ確認事項はありません',
  emptyHint: '承認待ち、報告された危険、記録された逸脱がここに表示されます。',
  kinds: {
    review: '承認待ち',
    changes: '修正依頼',
    danger: '危険の報告',
    deviation: '逸脱の記録',
    request: 'リクエスト',
    requalify: '再認定が必要',
    lateTraining: '教育の遅れ',
  },
  by: (name: string) => `${name}さん`,
  comesWith: (name: string) => `${name}に含まれます`,
  isNew: '新着',
}
