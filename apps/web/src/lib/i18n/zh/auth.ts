import type { auth as Fr } from '../fr/auth'

/** 登录、注册、忘记密码、欢迎；会话打开和原生外壳。 */
export const auth: typeof Fr = {
  login: {
    tagline: '作业指导书',
    hero: {
      film: '拍下来。',
      aiWrites: 'AI 来编写。',
      floorFollows: '现场照着做。',
      pitch: '几分钟生成一份清晰、直观的作业指导书，每位操作员在对应工位就能找到，无需账号。',
      inputs: '视频、照片、语音备注或旧 PDF',
      generated: '自动生成的步骤、视频片段和警示',
      qrAndTablet: '二维码和工位平板，无需账号',
    },
    titles: { login: '欢迎回来', signup: '创建你的账号', forgot: '重置密码' },
    intros: {
      login: '登录后即可创建和管理你的作业指导书。',
      signup: '免费开始，无需银行卡。',
      forgot: '我们会发送一个链接，供你设置新密码。',
    },
    sent: {
      title: '邮件已发送',
      body: (email: string) => `如果 ${email} 对应的账号存在，几分钟内你会收到一个链接。`,
      back: '返回登录',
    },
    fullname: '你的姓名',
    fullnamePlaceholder: '张伟',
    company: '工厂或公司',
    optional: '选填',
    companyPlaceholder: '苏州工厂',
    email: '邮箱',
    emailPlaceholder: 'you@company.com',
    password: '密码',
    forgotLink: '忘记密码？',
    submit: { login: '登录', signup: '创建我的账号', forgot: '发送链接' },
    aiNotice: {
      login: '登录即表示你同意：Google 的 AI 会分析你的照片、视频、语音备注和文字；当你要求生成图像时，OpenAI 会收到一张照片。',
      signup: '创建账号即表示你同意：Google 的 AI 会分析你的照片、视频、语音备注和文字；当你要求生成图像时，OpenAI 会收到一张照片。',
    },
    privacy: '隐私政策',
    errors: {
      email: '请输入有效的邮箱。',
      passwordTooShort: '密码至少需要 8 个字符。',
      passwordMissing: '请输入密码。',
    },
    newHere: '第一次使用？',
    createFreeAccount: '创建免费账号',
    askForInvitation: '还没有账号？请向管理员索取邀请。',
    haveAccount: '我已有账号',
    language: '语言',
  },
  welcome: {
    setup: '设置',
    progress: (step: number, total: number) => `第 ${step.toLocaleString('zh-CN')} 步，共 ${total.toLocaleString('zh-CN')} 步`,
    name: {
      title: '你的工厂叫什么？',
      hint: '名称会显示在工位平板和 PDF 上。',
      placeholder: '苏州工厂',
    },
    goals: {
      title: '你想先整理哪些作业？',
      hint: '可多选。你的首页会围绕这些内容来安排。',
      sstAndLockout: '健康安全与上锁挂牌',
    },
    approval: {
      title: '谁来审批作业指导书？',
      hint: '你之后可以在设置中更改。',
      none: '无人审批：直接发布',
      noneHint: '谁编写，谁负责。',
      one: '由审批人先检查',
      oneHint: '主管、质量或安全人员：他们会看到改动内容，再由其发布。',
    },
    ready: {
      title: (plant: string) => `${plant}，一切就绪！`,
      hint: '第一份作业指导书只需几分钟：请拍下某人边讲解边操作的过程。',
      create: '创建我的第一份作业指导书',
      import: '导入我的旧 PDF',
      later: '以后再说',
    },
    finish: '完成',
    nothingPublished: '没有你的同意，不会发布任何内容。',
  },
  session: {
    defaultOrgName: '我的工厂',
    me: '我',
    openFailed: '无法打开 CLIP',
    serverDown: '服务器暂时没有响应。请检查网络连接后重试。',
  },
  native: {
    unavailable: '原生功能不可用',
    noResponse: '手机应用没有响应',
  },
}
