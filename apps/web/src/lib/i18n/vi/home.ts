import type { home as Fr } from '../fr/home'

/** Tiếng Việt : trang chủ. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Xin chào, ${name}`,
    morning: (name: string) => `Chào buổi sáng, ${name}`,
    afternoon: (name: string) => `Chào buổi chiều, ${name}`,
    evening: (name: string) => `Chào buổi tối, ${name}`,
  },
  hero: {
    eyebrow: 'Hướng dẫn mới',
    line1: 'Quay phim. Nói ra.',
    line2: 'AI viết giúp bạn.',
    video: 'Video',
    voiceNote: 'Ghi chú giọng nói',
    document: 'PDF hoặc Word',
  },
  reader: {
    find: 'Tìm một hướng dẫn',
    myStations: 'Trạm của tôi',
  },
  setup: {
    title: 'Đưa nhà máy của bạn vào hoạt động',
    hint: 'Vài phút, từng bước một.',
    publish: 'Ban hành hướng dẫn đầu tiên',
    station: 'Tạo một trạm và mã QR của trạm',
    logo: 'Thêm logo của nhà máy',
    invite: 'Mời một đồng nghiệp',
    standard: 'Điều chỉnh chuẩn soạn thảo',
    hide: 'Ẩn phần thiết lập',
    hideShort: 'Ẩn',
    show: 'Hiện',
    compact: (done: number, total: number) => `Thiết lập: ${done} trên ${total}`,
  },
  tiles: {
    published: 'Đã ban hành',
    coverage: (percent: number) => `${percent.toLocaleString('vi-VN')}% trạm đã có hướng dẫn`,
    noStation: 'Chưa có trạm nào',
    views: 'Lượt xem · 7 ngày',
    viewsHint: 'Máy tính bảng, mã QR và liên kết',
    stations: 'Trạm',
    stationsHint: 'Cùng các hướng dẫn của trạm',
    streak: 'Chuỗi tuần',
    streakWeeks: (weeks: number) => `tuần liên tiếp có hướng dẫn được ban hành`,
    streakStart: 'Hãy ban hành tuần này để bắt đầu chuỗi',
  },
  renewal: {
    title: (count: number) => `Cần xem lại (${count.toLocaleString('vi-VN')})`,
    hint: 'Sắp đến hạn xem lại. Không có gì thay đổi? Xác nhận chỉ bằng một chạm.',
  },
  review: {
    title: (count: number) => `Cần phê duyệt (${count.toLocaleString('vi-VN')})`,
    hint: 'Các bước đã thay đổi được đánh dấu trong trình soạn.',
  },
  feedback: {
    title: 'Phản hồi của người vận hành',
    seeAll: 'Xem tất cả',
    quote: (comment: string) => `“${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Bước ${step.toLocaleString('vi-VN')} · ${ago}`),
    none: 'Không có phản hồi mới.',
  },
  drafts: { title: 'Làm tiếp', hint: 'Các bản nháp đang soạn của bạn' },
  forYou: { title: 'Dành cho bạn', hint: 'Dựa trên trách nhiệm của bạn' },
  library: {
    count: (n: number) => `${n.toLocaleString('vi-VN')} hướng dẫn đã ban hành`,
    hint: 'Xưởng của bạn có một thư viện sống. Hãy cập nhật nó theo phản hồi của người vận hành.',
  },
}
