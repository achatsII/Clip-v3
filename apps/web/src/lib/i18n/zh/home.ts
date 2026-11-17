import type { home as Fr } from '../fr/home'

/** 首页。 */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `你好，${name}`,
    morning: (name: string) => `早上好，${name}`,
    afternoon: (name: string) => `下午好，${name}`,
    evening: (name: string) => `晚上好，${name}`,
  },
  hero: {
    eyebrow: '新建作业指导书',
    line1: '拍下来，说出来。',
    line2: '交给 AI 来写。',
    video: '视频',
    voiceNote: '语音备注',
    document: 'PDF 或 Word',
  },
  reader: {
    find: '查找作业指导书',
    myStations: '我的工位',
  },
  setup: {
    title: '让你的工厂跑起来',
    hint: '只需几分钟，一步一步来。',
    publish: '发布第一份作业指导书',
    station: '创建工位及其二维码',
    logo: '添加工厂标志',
    invite: '邀请一位同事',
    standard: '调整你的编写规范',
    hide: '隐藏设置向导',
    hideShort: '隐藏',
    show: '显示',
    compact: (done: number, total: number) => `设置：${done} / ${total}`,
  },
  tiles: {
    published: '已发布',
    coverage: (percent: number) => `已覆盖 ${percent.toLocaleString('zh-CN')}% 的工位`,
    noStation: '还没有工位',
    views: '查看次数 · 7 天',
    viewsHint: '平板、二维码和链接',
    stations: '工位',
    stationsHint: '及其作业指导书',
    streak: '连续周数',
    streakWeeks: (weeks: number) => `周连续有内容发布`,
    streakStart: '本周发布内容，开始连续记录',
  },
  renewal: {
    title: (count: number) => `待复审（${count.toLocaleString('zh-CN')}）`,
    hint: '即将到复审日期。没有变化？轻点一下即可确认。',
  },
  review: {
    title: (count: number) => `待审批（${count.toLocaleString('zh-CN')}）`,
    hint: '修改过的步骤会在编辑器中标出。',
  },
  feedback: {
    title: '操作员反馈',
    seeAll: '查看全部',
    quote: (comment: string) => `“${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `第 ${step.toLocaleString('zh-CN')} 步 · ${ago}`),
    none: '没有新的反馈。',
  },
  drafts: { title: '继续编辑', hint: '你正在编写的草稿' },
  forYou: { title: '为你推荐', hint: '根据你的职责' },
  library: {
    count: (n: number) => `${n.toLocaleString('zh-CN')} 份已发布的作业指导书`,
    hint: '你的现场拥有一个持续更新的资料库。请根据操作员的反馈保持更新。',
  },
}
