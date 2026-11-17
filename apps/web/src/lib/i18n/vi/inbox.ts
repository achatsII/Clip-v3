import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('vi-VN')

export const inbox: typeof Fr = {
  title: 'Cần xem',
  open: (n: number) => (n ? `Cần xem: ${num(n)} mới` : 'Cần xem'),
  empty: 'Hiện chưa có gì cần xem',
  emptyHint: 'Các mục cần phê duyệt, nguy hiểm được báo và sai lệch đã ghi nhận sẽ hiện ở đây.',
  kinds: {
    review: 'Cần phê duyệt',
    changes: 'Yêu cầu chỉnh sửa',
    danger: 'Có báo nguy hiểm',
    deviation: 'Đã ghi nhận sai lệch',
    request: 'Được yêu cầu',
    requalify: 'Cần xác nhận lại',
    lateTraining: 'Đào tạo trễ hạn',
  },
  by: (name: string) => `bởi ${name}`,
  comesWith: (name: string) => `Đi kèm ${name}`,
  isNew: 'Mới',
}
