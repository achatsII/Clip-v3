import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('ja-JP')

export const blocks: typeof Fr = {
  make: '共通ブロックを作成',
  insert: '共通ブロックを挿入',
  makeIntro: '選んだステップがブロックになります。一度書けば、ほかの手順書でも使え、すべて同時に更新されます。',
  name: 'ブロック名',
  namePlaceholder: 'プレスP-12のロックアウト',
  pick: 'ブロックのステップ',
  makeConfirm: 'ブロックを作成',
  made: (title: string) => `ブロック「${title}」を作成しました`,
  madeHint: 'ステップは、今後ブロックで編集します。',
  makeFailed: 'ブロックを作成できませんでした',
  search: 'ブロックを検索',
  empty: '共通ブロックはまだありません',
  emptyHint: '手順書のステップから作成できます（「…」メニュー）。',
  already: 'この手順書にすでにあります',
  inserted: (title: string) => `ブロック「${title}」を挿入しました`,
  insertFailed: 'ブロックを挿入できませんでした',
  steps: (n: number) => `${num(n)}ステップ`,
  stepNotice: (title: string, version: number) => `共通ブロック「${title}」（v${num(version)}）のステップです。ブロックで編集すると、すべてに同時に反映されます。`,
  more: 'ブロックのその他の操作',
  open: 'ブロックを開く',
  detach: '切り離す',
  detachConfirm: { title: 'これらのステップをブロックから切り離しますか？', description: 'この手順書だけのステップになります。ここで編集できますが、ブロックの変更は反映されなくなります。', confirm: '切り離す' },
  remove: 'ブロックを削除',
  removeConfirm: { title: 'この手順書からブロックを削除しますか？', description: 'ステップはこの手順書から削除されます。ほかの手順書にはブロックが残ります。', confirm: '削除' },
  thumb: 'ブロック',
  chip: '共通ブロック',
  editing: (n: number) => (n ? `${num(n)}件の手順書で使用中の共通ブロックです。公開すると、それらも更新されます。` : '共通ブロックです。まだどの手順書にもありません。手順書の「…」メニューから挿入してください。'),
  info: 'タイトルと詳細',
  infoOpen: 'タイトルと詳細を編集',
  infoTitle: 'ブロックの詳細',
  summaryPlaceholder: 'このブロックの用途を一文で',
  archiveDescription: (n: number) =>
    n === 0
      ? 'ブロックの一覧から外れます。バージョンは残ります。'
      : n === 1
        ? 'このブロックを使っている手順書には、ステップがそのまま残ります。変更するには、その手順書で切り離してください。'
        : `このブロックを使っている${num(n)}件の手順書には、ステップがそのまま残ります。変更するには、それぞれで切り離してください。`,
  archived: 'ブロックをアーカイブしました',
  publishImpact: (n: number) => (n ? `公開すると${num(n)}件の手順書が更新されます。最新の手順書は再公開され、ほかの手順書は下書きにブロックが反映されます。` : 'まだどの手順書でも使われていません。手順書の「…」メニューから挿入してください。'),
  propagating: (done: number, total: number) => `手順書を更新中… ${num(done)} / ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)}件の手順書を再公開` : '', drafts ? `${num(drafts)}件の下書きを更新` : ''].filter(Boolean).join(' · ') || '更新する手順書はありません',
  propagateFailed: (n: number) => `${num(n)}件の手順書を更新できませんでした。ブロックをもう一度公開して再試行してください。`,
  filter: '共通ブロック',
  newBlock: '新しいブロック',
  newTitle: '新しい共通ブロック',
  total: (n: number) => (n > 0 ? `共通ブロック${num(n)}件` : '共通ブロックなし'),
  emptyList: 'ロックアウト、起動、保護具など、あらゆる場面で繰り返すステップです。一度書けば、すべての手順書で最新になります。ここから、または手順書のステップから（「…」メニュー）作成できます。',
  changelog: (title: string, version: number) => `共通ブロック「${title}」v${num(version)}。`,
  errors: {
    noSteps: 'ステップを1つ以上選んでください。',
    locked: (title: string) => `このステップは共通ブロック「${title}」のものです。ブロックで編集してください。`,
  },
}
