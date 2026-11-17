import type { importer as Fr } from '../fr/importer'

/** Tiếng Việt : nhập hàng loạt tài liệu cũ. */
export const importer: typeof Fr = {
  title: 'Nhập các hướng dẫn cũ của bạn',
  subtitle: 'Thả vào các tệp PDF và Word, dù cả chục tệp: mỗi tệp trở thành một bản nháp có cấu trúc, sẵn sàng để xem lại.',
  readOnly: 'Vai trò của bạn không được phép nhập.',
  unavailableTitle: 'Hiện chưa nhập hàng loạt được',
  unavailableText: 'Bạn có thể thả một tài liệu vào hướng dẫn mới.',
  drop: {
    title: 'Kéo tệp vào đây, hoặc chạm để chọn',
    formats: 'PDF hoặc Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) hoặc PowerPoint (.pptx)',
  },
  onlyDocuments: 'Ở đây chỉ nhập PDF và tài liệu Word',
  onlyDocumentsText: 'Video và ảnh hãy đưa vào một hướng dẫn mới.',
  slides: 'Hãy lưu tệp PowerPoint thành PDF',
  slidesText: 'Trong PowerPoint: Tệp › Xuất › PDF. Sau đó thả tệp PDF vào đây: các hình ảnh trong đó sẽ thành phương tiện của các bước.',
  batch: {
    progress: (done: number, total: number) => `Đã xong ${done.toLocaleString('vi-VN')} trên ${total.toLocaleString('vi-VN')}`,
    resume: (pending: number) => `Tiếp tục phân tích (${pending.toLocaleString('vi-VN')})`,
    running: 'Đang xử lý — hãy để tab này mở',
    review: 'Xem lại',
  },
  status: {
    waiting: 'Đang chờ',
    uploading: 'Đang tải lên và chuyển đổi…',
    uploaded: 'Sẵn sàng phân tích',
    analyzing: 'AI đang sắp xếp lại cấu trúc…',
    server: 'AI đang phân tích trên máy chủ: bạn có thể đóng ứng dụng',
    done: 'Đã tạo bản nháp',
    error: 'Thất bại',
  },
  errors: {
    interrupted: 'Việc tải lên bị gián đoạn: hãy thả lại tệp.',
    upload: 'Không tải lên được',
    analysis: 'Không phân tích được',
  },
}
