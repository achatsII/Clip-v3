import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `待审批：${instruction}`,
    body: (who: string) => `${who} 请求你审批。`,
  },
  changes: {
    title: (instruction: string) => `要求修改：${instruction}`,
    body: (who: string, text: string) => `${who} 要求修改：“${text}”`,
  },
  published: {
    title: (instruction: string) => `已发布：${instruction}`,
    body: '所有签字已完成：作业指导书已在工位上线。',
  },
  danger: {
    title: (station: string) => `已上报危险${station ? `（${station}）` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `来自 ${who}` : '', text ? `“${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `已记录偏差${station ? `（${station}）` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `来自 ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} 希望使用：${what}`,
    body: (target: string) => (target ? `它包含在 ${target} 中。详情请见“订阅与额度”。` : '详情请见“订阅与额度”。'),
  },
  test: {
    title: 'CLIP 提醒测试',
    body: '提醒已送达你。',
  },
  open: '在 CLIP 中打开',
  footer: '你收到这条 CLIP 提醒，是因为你所在的工厂要求发送。你可以在 CLIP 的“我的账号”中停止接收。',
}
