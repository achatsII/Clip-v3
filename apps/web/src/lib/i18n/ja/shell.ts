import type { shell as Fr } from '../fr/shell'

/** La coquille : navigation, menus, compte, lecteur de code. */
export const shell: typeof Fr = {
  opening: 'CLIPを開いています…',
  mainNav: 'メインナビゲーション',
  nav: {
    home: 'ホーム',
    instructions: '手順書',
    stations: 'ステーション',
    feedback: 'フィードバック',
    stats: '統計',
    team: 'チーム',
    records: '記録簿',
    import: '書類の取り込み',
    billing: 'プランとクレジット',
    settings: '設定',
    more: 'その他',
  },
  newInstruction: '新しい手順書',
  account: 'マイアカウント',
  appearance: '外観',
  signOut: 'ログアウト',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `バージョン ${v}`,
    built: (date: string) => `${date}リリース`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `${platform === 'ios' ? 'iPhone' : 'Android'}アプリ ${v}${build ? `（${build}）` : ''}`,
    title: 'CLIPについて',
    hint: '最後の数字は、更新のたびに増えます。お知らせした番号と見比べてください。',
  },
  aiConsent: {
    title: 'AIを使う前に',
    body: '手順書の作成と編集のため、CLIPは、写真、動画、音声メモ、テキストを、Intelligence Industrielleのプラットフォームを通じて、GoogleとOpenAIの人工知能サービスに送信します。',
    more: 'あなたの同意なしに送信されることはありません。同意は、設定 › データでいつでも取り消せます。',
    privacy: 'プライバシーポリシー',
    accept: '同意する',
    refuse: '今はしない',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `${title ? `「${title}」` : '手順書'}を${device === 'app' ? 'モバイルアプリ' : '別のパソコン'}で編集中です`,
  },
  scan: {
    title: 'コードをスキャン',
    prompt: 'ステーションまたは部品のコードをスキャン',
    failed: 'コードリーダーを開けませんでした',
    aim: 'QRコードまたはバーコードに向けてください',
    noCamera: 'カメラを使えません。ブラウザーで許可するか、検索欄にコードを入力してください。',
  },
}
