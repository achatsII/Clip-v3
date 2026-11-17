import type { importer as Fr } from '../fr/importer'

/** L’import en lot des anciens documents. */
export const importer: typeof Fr = {
  title: '古い手順書を取り込む',
  subtitle: 'PDFやWordを、何十件でもドロップしてください。それぞれが構造化された下書きになり、すぐに確認できます。',
  readOnly: 'あなたの権限では取り込めません。',
  unavailableTitle: '一括取り込みは現在利用できません',
  unavailableText: '新しい手順書に書類をドロップできます。',
  drop: {
    title: 'ここにファイルをドラッグ、またはタップして選択',
    formats: 'PDFまたはWord（.docx、.doc、.odt）',
    formatsSlides: 'PDF、Word（.docx、.doc、.odt）、PowerPoint（.pptx）',
  },
  onlyDocuments: 'ここで取り込めるのはPDFとWordだけです',
  onlyDocumentsText: '動画と写真は、新しい手順書に入れてください。',
  slides: 'PowerPointファイルをPDFとして保存してください',
  slidesText: 'PowerPointで：ファイル › エクスポート › PDF。そのPDFをここにドロップすると、中の画像がステップのメディアになります。',
  batch: {
    progress: (done: number, total: number) => `${total.toLocaleString('ja-JP')}件中${done.toLocaleString('ja-JP')}件が完了`,
    resume: (pending: number) => `分析を再開（${pending.toLocaleString('ja-JP')}）`,
    running: '処理中 — このタブを開いたままにしてください',
    review: '確認',
  },
  status: {
    waiting: '待機中',
    uploading: 'アップロードと変換中…',
    uploaded: '分析の準備ができました',
    analyzing: 'AIが再構成中…',
    server: 'AIがサーバーで分析中です。アプリを閉じてもかまいません',
    done: '下書きを作成しました',
    error: '失敗しました',
  },
  errors: {
    interrupted: 'アップロードが中断されました。ファイルをもう一度ドロップしてください。',
    upload: 'アップロードできませんでした',
    analysis: '分析できませんでした',
  },
}
