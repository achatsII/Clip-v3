import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `Cần phê duyệt: ${instruction}`,
    body: (who: string) => `${who} đang xin bạn phê duyệt.`,
  },
  changes: {
    title: (instruction: string) => `Yêu cầu chỉnh sửa: ${instruction}`,
    body: (who: string, text: string) => `${who} yêu cầu chỉnh sửa: “${text}”`,
  },
  published: {
    title: (instruction: string) => `Đã ban hành: ${instruction}`,
    body: 'Đã đủ chữ ký: hướng dẫn đã có tại trạm.',
  },
  danger: {
    title: (station: string) => `Có báo nguy hiểm${station ? ` tại ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `bởi ${who}` : '', text ? `“${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Đã ghi nhận sai lệch${station ? ` tại ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `bởi ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} muốn có: ${what}`,
    body: (target: string) => (target ? `Tính năng này đi kèm ${target}. Mọi thông tin có trong Gói đăng ký và tín dụng.` : 'Mọi thông tin có trong Gói đăng ký và tín dụng.'),
  },
  test: {
    title: 'Thử cảnh báo CLIP',
    body: 'Cảnh báo đã đến được với bạn.',
  },
  open: 'Mở trong CLIP',
  footer: 'Bạn nhận cảnh báo CLIP này vì nhà máy của bạn yêu cầu. Bạn có thể tắt trong CLIP, Tài khoản của tôi.',
}
