import type { shell as Fr } from '../fr/shell'

/** Tiếng Việt : khung ứng dụng, menu, tài khoản, trình quét mã. */
export const shell: typeof Fr = {
  opening: 'Đang mở CLIP…',
  mainNav: 'Điều hướng chính',
  nav: {
    home: 'Trang chủ',
    instructions: 'Hướng dẫn',
    stations: 'Trạm',
    feedback: 'Phản hồi',
    stats: 'Thống kê',
    team: 'Nhóm',
    records: 'Nhật ký',
    import: 'Nhập tài liệu',
    billing: 'Gói và tín dụng',
    settings: 'Cài đặt',
    more: 'Thêm',
  },
  newInstruction: 'Hướng dẫn mới',
  account: 'Tài khoản của tôi',
  appearance: 'Giao diện',
  signOut: 'Đăng xuất',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Phiên bản ${v}`,
    built: (date: string) => `phát hành ngày ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `Ứng dụng ${platform === 'ios' ? 'iPhone' : 'Android'} ${v}${build ? ` (${build})` : ''}`,
    title: 'Giới thiệu CLIP',
    hint: 'Số cuối tăng lên sau mỗi lần cập nhật: hãy so với số bạn được thông báo.',
  },
  aiConsent: {
    title: 'Trước khi dùng AI',
    body: 'Để viết và sửa hướng dẫn của bạn, CLIP gửi ảnh, video, ghi chú giọng nói và văn bản của bạn đến các dịch vụ trí tuệ nhân tạo của Google và OpenAI, thông qua nền tảng Intelligence Industrielle.',
    more: 'Sẽ không có gì được gửi nếu bạn chưa đồng ý. Bạn có thể rút lại sự đồng ý trong Cài đặt › Dữ liệu.',
    privacy: 'Chính sách quyền riêng tư',
    accept: 'Tôi đồng ý',
    refuse: 'Để sau',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `Bạn đang sửa ${title ? `“${title}”` : 'một hướng dẫn'} từ ${device === 'app' ? 'ứng dụng di động' : 'một máy tính khác'}`,
  },
  scan: {
    title: 'Quét mã',
    prompt: 'Quét mã của trạm hoặc chi tiết',
    failed: 'Không mở được trình quét mã',
    aim: 'Hướng vào mã QR hoặc mã vạch',
    noCamera: 'Không dùng được máy ảnh. Hãy cho phép trong trình duyệt, hoặc nhập mã vào ô tìm kiếm.',
  },
}
