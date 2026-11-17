import type { feedback as Fr } from '../fr/feedback'

/** Les retours des opérateurs. */
export const feedback: typeof Fr = {
  list: {
    search: '手順書、キーワード、人、ステーションで検索',
    title: '作業者からのフィードバック',
    subtitle: '現場からの報告です。ワンタップでステップを直すと、作業者に新しい版が表示されます。',
    open: (n: number) => `未対応${n ? `（${n.toLocaleString('ja-JP')}）` : ''}`,
    handled: '対応済み',
    all: 'すべて',
    emptyOpenTitle: '対応するものはありません',
    emptyOpenDescription: '作業者は、わかりにくいステップをプレーヤーから2タップで知らせられます。フィードバックはここに届きます。',
    emptyHandledTitle: '対応済みのフィードバックはありません',
    emptyHandledDescription: '対応したフィードバックがここに表示されます。',
    untitled: '手順書',
    step: (n: number) => `ステップ${n.toLocaleString('ja-JP')}`,
    comment: (text: string) => `「${text}」`,
    operator: '作業者',
    station: 'ステーション',
    sources: { kiosk: 'タブレット', link: 'リンク', app: 'アプリ' },
    photo: '添付写真',
    fix: '修正',
    markHandled: '対応済み',
    dismiss: '却下',
    handledBy: (name: string) => `${name}が対応`,
    dismissedBy: (name: string) => `${name}が却下`,
    markedHandled: 'フィードバックを対応済みにしました',
    dismissed: 'フィードバックを却下しました',
    updateFailed: 'フィードバックを更新できませんでした',
  },
}
