import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('zh-CN')

export const inbox: typeof Fr = {
  title: '待查看',
  open: (n: number) => (n ? `待查看：${num(n)} 条新消息` : '待查看'),
  empty: '暂时没有需要查看的内容',
  emptyHint: '待审批事项、上报的危险和记录的偏差会显示在这里。',
  kinds: {
    review: '待审批',
    changes: '要求修改',
    danger: '已上报危险',
    deviation: '已记录偏差',
    request: '申请',
    requalify: '待重新确认',
    lateTraining: '培训逾期',
  },
  by: (name: string) => `来自 ${name}`,
  comesWith: (name: string) => `包含在 ${name} 中`,
  isNew: '新',
}
