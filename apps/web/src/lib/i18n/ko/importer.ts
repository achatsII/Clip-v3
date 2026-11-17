import type { importer as Fr } from '../fr/importer'

/** 기존 문서 일괄 가져오기. */
export const importer: typeof Fr = {
  title: '기존 지시서 가져오기',
  subtitle: 'PDF와 Word 문서를 수십 개씩 끌어다 놓으세요. 각 문서가 검토할 수 있는 구조화된 초안이 됩니다.',
  readOnly: '현재 권한으로는 가져올 수 없습니다.',
  unavailableTitle: '일괄 가져오기를 지금은 사용할 수 없습니다',
  unavailableText: '새 지시서에 문서를 끌어다 놓을 수 있습니다.',
  drop: {
    title: '파일을 여기로 끌어오거나, 눌러서 선택하세요',
    formats: 'PDF 또는 Word(.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word(.docx, .doc, .odt) 또는 PowerPoint(.pptx)',
  },
  onlyDocuments: '여기서는 PDF와 Word 문서만 가져옵니다',
  onlyDocumentsText: '동영상과 사진은 새 지시서에 넣으세요.',
  slides: 'PowerPoint 파일을 PDF로 저장하세요',
  slidesText: 'PowerPoint에서 파일 › 내보내기 › PDF를 선택하세요. 그 PDF를 여기에 놓으면 그림이 단계 미디어가 됩니다.',
  batch: {
    progress: (done: number, total: number) => `${total.toLocaleString('ko-KR')}개 중 ${done.toLocaleString('ko-KR')}개 완료`,
    resume: (pending: number) => `분석 계속하기 (${pending.toLocaleString('ko-KR')})`,
    running: '진행 중 — 이 탭을 열어 두세요',
    review: '검토',
  },
  status: {
    waiting: '대기 중',
    uploading: '업로드 및 변환 중…',
    uploaded: '분석 준비 완료',
    analyzing: 'AI가 구조화하는 중…',
    server: 'AI가 서버에서 분석 중입니다. 앱을 닫아도 됩니다',
    done: '초안이 만들어졌습니다',
    error: '실패',
  },
  errors: {
    interrupted: '업로드가 중단되었습니다. 파일을 다시 놓으세요.',
    upload: '업로드하지 못했습니다',
    analysis: '분석하지 못했습니다',
  },
}
