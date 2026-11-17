import type { importer as Fr } from '../fr/importer'

/** 批量导入旧文档。 */
export const importer: typeof Fr = {
  title: '导入你的旧作业指导书',
  subtitle: '拖入你的 PDF 和 Word 文档，一次几十份也行：每份都会变成结构清晰的草稿，等你检查。',
  readOnly: '你的角色无权导入。',
  unavailableTitle: '批量导入暂时不可用',
  unavailableText: '你可以把文档放入一份新的作业指导书中。',
  drop: {
    title: '将文件拖到此处，或轻点选择',
    formats: 'PDF 或 Word（.docx、.doc、.odt）',
    formatsSlides: 'PDF、Word（.docx、.doc、.odt）或 PowerPoint（.pptx）',
  },
  onlyDocuments: '此处只能导入 PDF 和 Word 文档',
  onlyDocumentsText: '视频和照片请放入新建的作业指导书中。',
  slides: '请将 PowerPoint 文件另存为 PDF',
  slidesText: '在 PowerPoint 中：文件 › 导出 › PDF。然后把 PDF 拖到这里：其中的图片会成为步骤的媒体内容。',
  batch: {
    progress: (done: number, total: number) => `已完成 ${done.toLocaleString('zh-CN')} / ${total.toLocaleString('zh-CN')}`,
    resume: (pending: number) => `继续分析（${pending.toLocaleString('zh-CN')}）`,
    running: '进行中，请保持此标签页打开',
    review: '检查',
  },
  status: {
    waiting: '等待中',
    uploading: '正在上传并转换…',
    uploaded: '可开始分析',
    analyzing: 'AI 正在重新整理结构…',
    server: 'AI 正在服务器上分析：你可以关闭应用',
    done: '草稿已创建',
    error: '失败',
  },
  errors: {
    interrupted: '上传已中断：请重新拖入该文件。',
    upload: '无法上传',
    analysis: '无法分析',
  },
}
