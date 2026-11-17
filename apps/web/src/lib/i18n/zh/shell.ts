import type { shell as Fr } from '../fr/shell'

/** 外壳：导航、菜单、账号、扫码。 */
export const shell: typeof Fr = {
  opening: '正在打开 CLIP…',
  mainNav: '主导航',
  nav: {
    home: '首页',
    instructions: '作业指导书',
    stations: '工位',
    feedback: '反馈',
    stats: '统计',
    team: '团队',
    records: '记录',
    import: '导入文档',
    billing: '套餐与额度',
    settings: '设置',
    more: '更多',
  },
  newInstruction: '新建作业指导书',
  account: '我的账号',
  appearance: '外观',
  signOut: '退出登录',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `版本 ${v}`,
    built: (date: string) => `发布于 ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `${platform === 'ios' ? 'iPhone' : 'Android'} 应用 ${v}${build ? `（${build}）` : ''}`,
    title: '关于 CLIP',
    hint: '每次更新，最后一个数字都会加一：请与通知你的版本号对照。',
  },
  aiConsent: {
    title: '使用 AI 之前',
    body: '为了编写和修改你的作业指导书，CLIP 会通过 Intelligence Industrielle 平台，将你的照片、视频、语音备注和文字发送给 Google 和 OpenAI 的人工智能服务。',
    more: '未经你同意，不会发送任何内容。你可以在“设置 › 数据”中撤回同意。',
    privacy: '隐私政策',
    accept: '我同意',
    refuse: '暂不',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `你正在${device === 'app' ? '通过手机应用' : '在另一台电脑上'}编辑${title ? `“${title}”` : '一份作业指导书'}`,
  },
  scan: {
    title: '扫描代码',
    prompt: '扫描工位或零件代码',
    failed: '扫码器未能打开',
    aim: '请对准二维码或条形码',
    noCamera: '无法使用相机。请在浏览器中允许使用，或在搜索框中输入代码。',
  },
}
