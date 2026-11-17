import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `承認待ち：${instruction}`,
    body: (who: string) => `${who}さんが承認を求めています。`,
  },
  changes: {
    title: (instruction: string) => `修正依頼：${instruction}`,
    body: (who: string, text: string) => `${who}さんが修正を依頼しています：「${text}」`,
  },
  published: {
    title: (instruction: string) => `公開しました：${instruction}`,
    body: 'すべての署名がそろいました。手順書がステーションに届いています。',
  },
  danger: {
    title: (station: string) => `危険の報告${station ? `（${station}）` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `${who}さん` : '', text ? `「${text}」` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `逸脱の記録${station ? `（${station}）` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `${who}さん` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who}さんの希望：${what}`,
    body: (target: string) => (target ? `${target}に含まれます。詳細は「サブスクリプションとクレジット」にあります。` : '詳細は「サブスクリプションとクレジット」にあります。'),
  },
  test: {
    title: 'CLIPアラートのテスト',
    body: 'アラートは届いています。',
  },
  open: 'CLIPで開く',
  footer: 'このCLIPのアラートは、工場の設定により送信されています。CLIPの「マイアカウント」で停止できます。',
}
