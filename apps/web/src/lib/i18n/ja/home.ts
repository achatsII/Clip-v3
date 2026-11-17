import type { home as Fr } from '../fr/home'

/** L’accueil. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `こんにちは、${name}さん`,
    morning: (name: string) => `おはようございます、${name}さん`,
    afternoon: (name: string) => `こんにちは、${name}さん`,
    evening: (name: string) => `こんばんは、${name}さん`,
  },
  hero: {
    eyebrow: '新しい手順書',
    line1: '撮って、話す。',
    line2: 'AIが書く。',
    video: '動画',
    voiceNote: '音声メモ',
    document: 'PDFまたはWord',
  },
  reader: {
    find: '手順書を探す',
    myStations: '自分のステーション',
  },
  setup: {
    title: '工場の準備を整えましょう',
    hint: '数分で、ひとつずつ進められます。',
    publish: '最初の手順書を公開',
    station: 'ステーションとQRコードを作成',
    logo: '工場のロゴを追加',
    invite: '同僚を招待',
    standard: '文章の基準を調整',
    hide: '初期設定を隠す',
    hideShort: '隠す',
    show: '表示',
    compact: (done: number, total: number) => `初期設定：${total}項目中${done}項目`,
  },
  tiles: {
    published: '公開中',
    coverage: (percent: number) => `ステーションの${percent.toLocaleString('ja-JP')}%に対応`,
    noStation: 'ステーションはまだありません',
    views: '閲覧数 · 7日間',
    viewsHint: 'タブレット、QRコード、リンク',
    stations: 'ステーション',
    stationsHint: '手順書つき',
    streak: '連続',
    streakWeeks: (weeks: number) => `週連続で公開`,
    streakStart: '今週公開すると、連続記録が始まります',
  },
  renewal: {
    title: (count: number) => `見直し（${count.toLocaleString('ja-JP')}）`,
    hint: '見直しの期日が近づいています。変更がなければ、ワンタップで確認できます。',
  },
  review: {
    title: (count: number) => `承認待ち（${count.toLocaleString('ja-JP')}）`,
    hint: '変更されたステップは、エディターに印が付いています。',
  },
  feedback: {
    title: '作業者からのフィードバック',
    seeAll: 'すべて見る',
    quote: (comment: string) => `「${comment}」`,
    when: (step: number | null, ago: string) => (step === null ? ago : `ステップ${step.toLocaleString('ja-JP')} · ${ago}`),
    none: '新しいフィードバックはありません。',
  },
  drafts: { title: '続きから', hint: '作成中の下書き' },
  forYou: { title: 'あなたへ', hint: '担当に合わせて表示' },
  library: {
    count: (n: number) => `公開中の手順書 ${n.toLocaleString('ja-JP')}件`,
    hint: '現場には、生きたライブラリーがあります。作業者のフィードバックで最新に保ちましょう。',
  },
}
