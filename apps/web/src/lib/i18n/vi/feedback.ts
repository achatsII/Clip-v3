import type { feedback as Fr } from '../fr/feedback'

/** Tiếng Việt : phản hồi của người vận hành. */
export const feedback: typeof Fr = {
  list: {
    search: 'Tìm hướng dẫn, từ khóa, người hoặc trạm',
    title: 'Phản hồi của người vận hành',
    subtitle: 'Những gì xưởng báo lại: sửa bước đó chỉ bằng một chạm, và người vận hành sẽ thấy phiên bản mới.',
    open: (n: number) => `Đang mở${n ? ` (${n.toLocaleString('vi-VN')})` : ''}`,
    handled: 'Đã xử lý',
    all: 'Tất cả',
    emptyOpenTitle: 'Không có gì cần xử lý',
    emptyOpenDescription: 'Người vận hành báo một bước chưa rõ từ trình xem chỉ với hai chạm. Phản hồi của họ sẽ hiện ở đây.',
    emptyHandledTitle: 'Chưa có phản hồi nào đã xử lý',
    emptyHandledDescription: 'Các phản hồi bạn đã xử lý sẽ hiện ở đây.',
    untitled: 'Hướng dẫn',
    step: (n: number) => `bước ${n.toLocaleString('vi-VN')}`,
    comment: (text: string) => `“${text}”`,
    operator: 'Người vận hành',
    station: 'trạm',
    sources: { kiosk: 'máy tính bảng', link: 'liên kết', app: 'ứng dụng' },
    photo: 'Ảnh đính kèm',
    fix: 'Sửa',
    markHandled: 'Đã xử lý',
    dismiss: 'Bỏ qua',
    handledBy: (name: string) => `Đã xử lý bởi ${name}`,
    dismissedBy: (name: string) => `Đã bỏ qua bởi ${name}`,
    markedHandled: 'Đã đánh dấu phản hồi là đã xử lý',
    dismissed: 'Đã bỏ qua phản hồi',
    updateFailed: 'Chưa cập nhật được phản hồi',
  },
}
