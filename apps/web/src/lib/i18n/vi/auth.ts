import type { auth as Fr } from '../fr/auth'

/** Tiếng Việt : đăng nhập, đăng ký, quên mật khẩu, chào mừng; mở phiên và khung ứng dụng gốc. */
export const auth: typeof Fr = {
  login: {
    tagline: 'Hướng dẫn công việc',
    hero: {
      film: 'Quay phim.',
      aiWrites: 'AI viết.',
      floorFollows: 'Xưởng làm theo.',
      pitch: 'Một hướng dẫn công việc rõ ràng, trực quan chỉ sau vài phút, mỗi người vận hành đều tìm thấy đúng ở trạm của mình, không cần tài khoản.',
      inputs: 'Video, ảnh, ghi chú giọng nói hoặc PDF cũ',
      generated: 'Các bước, đoạn video và cảnh báo được tạo sẵn',
      qrAndTablet: 'Mã QR và máy tính bảng tại trạm, không cần tài khoản',
    },
    titles: { login: 'Chào mừng bạn quay lại', signup: 'Tạo tài khoản của bạn', forgot: 'Đặt lại mật khẩu' },
    intros: {
      login: 'Đăng nhập để soạn và quản lý hướng dẫn của bạn.',
      signup: 'Bắt đầu miễn phí. Không cần thẻ.',
      forgot: 'Chúng tôi sẽ gửi cho bạn một liên kết để chọn mật khẩu mới.',
    },
    sent: {
      title: 'Đã gửi email',
      body: (email: string) => `Nếu có tài khoản dùng ${email}, bạn sẽ nhận được liên kết trong vài phút.`,
      back: 'Quay lại đăng nhập',
    },
    fullname: 'Tên của bạn',
    fullnamePlaceholder: 'Nguyễn Minh Anh',
    company: 'Nhà máy hoặc công ty',
    optional: 'tùy chọn',
    companyPlaceholder: 'Nhà máy Bình Dương',
    email: 'Email',
    emailPlaceholder: 'ban@congty.com',
    password: 'Mật khẩu',
    forgotLink: 'Quên?',
    submit: { login: 'Đăng nhập', signup: 'Tạo tài khoản', forgot: 'Gửi liên kết' },
    aiNotice: {
      login: 'Khi đăng nhập, bạn đồng ý để AI của Google phân tích ảnh, video, ghi chú giọng nói và văn bản của bạn, và để OpenAI nhận một ảnh khi bạn yêu cầu tạo hình ảnh.',
      signup: 'Khi tạo tài khoản, bạn đồng ý để AI của Google phân tích ảnh, video, ghi chú giọng nói và văn bản của bạn, và để OpenAI nhận một ảnh khi bạn yêu cầu tạo hình ảnh.',
    },
    privacy: 'Chính sách quyền riêng tư',
    errors: {
      email: 'Hãy nhập email hợp lệ.',
      passwordTooShort: 'Mật khẩu phải có ít nhất 8 ký tự.',
      passwordMissing: 'Hãy nhập mật khẩu.',
    },
    newHere: 'Bạn mới dùng?',
    createFreeAccount: 'Tạo tài khoản miễn phí',
    askForInvitation: 'Chưa có tài khoản? Hãy nhờ quản trị viên gửi lời mời.',
    haveAccount: 'Tôi đã có tài khoản',
    language: 'Ngôn ngữ',
  },
  welcome: {
    setup: 'Thiết lập',
    progress: (step: number, total: number) => `${step.toLocaleString('vi-VN')} trên ${total.toLocaleString('vi-VN')}`,
    name: {
      title: 'Nhà máy của bạn tên là gì?',
      hint: 'Tên này sẽ hiện trên máy tính bảng tại trạm và trong tệp PDF.',
      placeholder: 'Nhà máy Bình Dương',
    },
    goals: {
      title: 'Bạn muốn lập tài liệu cho việc gì trước?',
      hint: 'Chọn bao nhiêu tùy bạn. Trang chủ sẽ sắp xếp theo các lựa chọn này.',
      sstAndLockout: 'An toàn sức khỏe và khóa – gắn thẻ',
    },
    approval: {
      title: 'Ai phê duyệt hướng dẫn?',
      hint: 'Bạn có thể đổi ý trong phần cài đặt.',
      none: 'Không ai: ban hành trực tiếp',
      noneHint: 'Người soạn chịu trách nhiệm về hướng dẫn của mình.',
      one: 'Một người phê duyệt kiểm tra trước',
      oneHint: 'Giám sát, chất lượng hoặc an toàn: họ xem những gì đã thay đổi rồi ban hành.',
    },
    ready: {
      title: (plant: string) => `Xong rồi, ${plant}!`,
      hint: 'Hướng dẫn đầu tiên chỉ mất vài phút: hãy quay phim một người đang làm việc và giải thích khi làm.',
      create: 'Tạo hướng dẫn đầu tiên',
      import: 'Nhập các tệp PDF cũ',
      later: 'Để sau',
    },
    finish: 'Hoàn tất',
    nothingPublished: 'Không có gì được ban hành nếu thiếu bạn.',
  },
  session: {
    defaultOrgName: 'Nhà máy của tôi',
    me: 'Tôi',
    openFailed: 'Không mở được CLIP',
    serverDown: 'Máy chủ hiện không phản hồi. Hãy kiểm tra kết nối rồi thử lại.',
  },
  native: {
    unavailable: 'Tính năng gốc không khả dụng',
    noResponse: 'Ứng dụng di động không phản hồi',
  },
}
