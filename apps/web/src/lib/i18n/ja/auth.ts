import type { auth as Fr } from '../fr/auth'

/** Connexion, inscription, mot de passe oublié, bienvenue ; l’ouverture de la session et la coquille native. */
export const auth: typeof Fr = {
  login: {
    tagline: '作業手順書',
    hero: {
      film: '撮影する。',
      aiWrites: 'AIが書く。',
      floorFollows: '現場が従う。',
      pitch: 'わかりやすいビジュアルの作業手順書が数分で完成。作業者はアカウントなしで、自分のステーションの手順書をすぐに開けます。',
      inputs: '動画、写真、音声メモ、古いPDF',
      generated: '自動で作られるステップ、動画クリップ、注意',
      qrAndTablet: 'QRコードとステーションのタブレット、アカウント不要',
    },
    titles: { login: 'おかえりなさい', signup: 'アカウントを作成', forgot: 'パスワードをリセット' },
    intros: {
      login: 'ログインして、手順書を作成・管理します。',
      signup: '無料で始められます。カードは不要です。',
      forgot: '新しいパスワードを設定するためのリンクをお送りします。',
    },
    sent: {
      title: 'メールを送信しました',
      body: (email: string) => `${email}のアカウントがある場合は、数分以内にリンクが届きます。`,
      back: 'ログインに戻る',
    },
    fullname: 'お名前',
    fullnamePlaceholder: '山田 花子',
    company: '工場または会社',
    optional: '任意',
    companyPlaceholder: '東京工場',
    email: 'メールアドレス',
    emailPlaceholder: 'you@company.com',
    password: 'パスワード',
    forgotLink: 'お忘れですか？',
    submit: { login: 'ログイン', signup: 'アカウントを作成', forgot: 'リンクを送信' },
    /** Consent to the AI, given by signing in (Apple's rule 5.1.2(i)). */
    aiNotice: {
      login: 'ログインすると、写真、動画、音声メモ、テキストをGoogleのAIが分析すること、および画像を依頼したときに写真がOpenAIに送信されることに同意したものとみなされます。',
      signup: 'アカウントを作成すると、写真、動画、音声メモ、テキストをGoogleのAIが分析すること、および画像を依頼したときに写真がOpenAIに送信されることに同意したものとみなされます。',
    },
    privacy: 'プライバシーポリシー',
    errors: {
      email: '有効なメールアドレスを入力してください。',
      passwordTooShort: 'パスワードは8文字以上にしてください。',
      passwordMissing: 'パスワードを入力してください。',
    },
    newHere: 'はじめてですか？',
    createFreeAccount: '無料アカウントを作成',
    askForInvitation: 'アカウントがない場合は、管理者に招待を依頼してください。',
    haveAccount: 'アカウントをお持ちの方',
    language: '言語',
  },
  welcome: {
    setup: '初期設定',
    progress: (step: number, total: number) => `${step.toLocaleString('ja-JP')} / ${total.toLocaleString('ja-JP')}`,
    name: {
      title: '工場の名前は？',
      hint: 'ステーションのタブレットとPDFに表示されます。',
      placeholder: '東京工場',
    },
    goals: {
      title: '最初に手順書にしたいものは？',
      hint: 'いくつでも選べます。ホーム画面はこの選択に合わせて整えられます。',
      sstAndLockout: '安全衛生とロックアウト',
    },
    approval: {
      title: '手順書は誰が承認しますか？',
      hint: '設定であとから変更できます。',
      none: '承認なし：そのまま公開',
      noneHint: '書いた人が責任を持ちます。',
      one: '承認者が先に確認',
      oneHint: '監督者、品質、安全衛生の担当者が変更点を確認して公開します。',
    },
    ready: {
      title: (plant: string) => `${plant}の準備ができました！`,
      hint: '最初の手順書は数分で作れます。作業をしている人に説明してもらいながら撮影してください。',
      create: '最初の手順書を作成',
      import: '古いPDFを取り込む',
      later: 'あとで',
    },
    finish: '完了',
    nothingPublished: 'あなたの確認なしに公開されることはありません。',
  },
  session: {
    defaultOrgName: '自分の工場',
    me: '自分',
    openFailed: 'CLIPを開けませんでした',
    serverDown: '現在サーバーが応答していません。接続を確認して、もう一度お試しください。',
  },
  native: {
    unavailable: 'この機能は利用できません',
    noResponse: 'モバイルアプリが応答していません',
  },
}
