import type { feedback as Fr } from '../fr/feedback'

/** 操作员反馈。 */
export const feedback: typeof Fr = {
  list: {
    search: '搜索作业指导书、词语、人员或工位',
    title: '操作员反馈',
    subtitle: '现场反映的问题：轻点一下就能修正步骤，操作员随即看到新版本。',
    open: (n: number) => `待处理${n ? `（${n.toLocaleString('zh-CN')}）` : ''}`,
    handled: '已处理',
    all: '全部',
    emptyOpenTitle: '没有待处理的反馈',
    emptyOpenDescription: '操作员在播放器中轻点两下，就能反馈看不明白的步骤。他们的反馈会显示在这里。',
    emptyHandledTitle: '没有已处理的反馈',
    emptyHandledDescription: '你处理过的反馈会显示在这里。',
    untitled: '作业指导书',
    step: (n: number) => `第 ${n.toLocaleString('zh-CN')} 步`,
    comment: (text: string) => `“${text}”`,
    operator: '操作员',
    station: '工位',
    sources: { kiosk: '平板', link: '链接', app: '应用' },
    photo: '附带的照片',
    fix: '修正',
    markHandled: '已处理',
    dismiss: '忽略',
    handledBy: (name: string) => `由 ${name} 处理`,
    dismissedBy: (name: string) => `由 ${name} 忽略`,
    markedHandled: '反馈已标记为已处理',
    dismissed: '反馈已忽略',
    updateFailed: '反馈未能更新',
  },
}
