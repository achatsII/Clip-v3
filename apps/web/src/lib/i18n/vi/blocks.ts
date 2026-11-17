import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('vi-VN')

export const blocks: typeof Fr = {
  make: 'Tạo khối dùng chung',
  insert: 'Chèn khối dùng chung',
  makeIntro: 'Các bước đã chọn trở thành một khối: viết một lần, dùng lại trong các hướng dẫn khác và được cập nhật ở mọi nơi.',
  name: 'Tên khối',
  namePlaceholder: 'Khóa máy ép P-12',
  pick: 'Các bước của khối',
  makeConfirm: 'Tạo khối',
  made: (title: string) => `Đã tạo khối “${title}”`,
  madeHint: 'Từ nay các bước này được sửa trong khối.',
  makeFailed: 'Chưa tạo được khối',
  search: 'Tìm một khối',
  empty: 'Chưa có khối dùng chung nào',
  emptyHint: 'Hãy tạo từ các bước của một hướng dẫn (menu “…”).',
  already: 'Đã có trong hướng dẫn này',
  inserted: (title: string) => `Đã chèn khối “${title}”`,
  insertFailed: 'Chưa chèn được khối',
  steps: (n: number) => `${num(n)} bước`,
  stepNotice: (title: string, version: number) => `Bước thuộc khối dùng chung “${title}” (v${num(version)}): được sửa trong khối, cập nhật ở mọi nơi cùng lúc.`,
  more: 'Thêm thao tác với khối',
  open: 'Mở khối',
  detach: 'Tách ra',
  detachConfirm: { title: 'Tách các bước này khỏi khối?', description: 'Chúng trở thành bước riêng của hướng dẫn này: bạn có thể sửa tại đây, nhưng sẽ không còn theo khối nữa.', confirm: 'Tách ra' },
  remove: 'Gỡ khối',
  removeConfirm: { title: 'Gỡ khối khỏi hướng dẫn này?', description: 'Các bước của khối rời khỏi hướng dẫn này; khối vẫn còn cho các hướng dẫn khác.', confirm: 'Gỡ' },
  thumb: 'Khối',
  chip: 'Khối dùng chung',
  editing: (n: number) => (n ? `Khối dùng chung đang được dùng trong ${num(n)} hướng dẫn: ban hành khối sẽ cập nhật chúng.` : 'Khối dùng chung: chưa có hướng dẫn nào dùng. Hãy chèn nó từ một hướng dẫn, menu “…”.'),
  info: 'Tiêu đề và chi tiết',
  infoOpen: 'Sửa tiêu đề và chi tiết',
  infoTitle: 'Chi tiết của khối',
  summaryPlaceholder: 'Khối này dùng để làm gì, trong một câu',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Khối rời khỏi danh sách khối. Các phiên bản của nó vẫn được giữ.'
      : n === 1
        ? 'Hướng dẫn đang dùng khối giữ nguyên các bước của nó; muốn đổi, hãy tách chúng ra ở đó.'
        : `${num(n)} hướng dẫn đang dùng khối giữ nguyên các bước của nó; muốn đổi, hãy tách chúng ra ở từng hướng dẫn.`,
  archived: 'Đã lưu trữ khối',
  publishImpact: (n: number) => (n ? `Ban hành sẽ cập nhật ${num(n)} hướng dẫn: những hướng dẫn đã cập nhật được ban hành lại, các hướng dẫn còn lại nhận khối vào bản nháp.` : 'Chưa có hướng dẫn nào dùng khối này: hãy chèn nó vào một hướng dẫn, menu “…”.'),
  propagating: (done: number, total: number) => `Đang cập nhật các hướng dẫn… ${num(done)} trên ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} hướng dẫn được ban hành lại` : '', drafts ? `${num(drafts)} bản nháp được cập nhật` : ''].filter(Boolean).join(' · ') || 'Không có hướng dẫn nào cần cập nhật',
  propagateFailed: (n: number) => `${num(n)} hướng dẫn chưa được cập nhật: hãy ban hành lại khối để thử lại.`,
  filter: 'Khối dùng chung',
  newBlock: 'Khối mới',
  newTitle: 'Khối dùng chung mới',
  total: (n: number) => (n > 0 ? `${num(n)} khối dùng chung` : 'Không có khối dùng chung'),
  emptyList: 'Những bước lặp lại ở mọi nơi (khóa – gắn thẻ, khởi động, PPE): viết một lần, luôn cập nhật trong mọi hướng dẫn. Hãy tạo một khối tại đây, hoặc từ các bước của một hướng dẫn (menu “…”).',
  changelog: (title: string, version: number) => `Khối dùng chung “${title}” v${num(version)}.`,
  errors: {
    noSteps: 'Hãy chọn ít nhất một bước.',
    locked: (title: string) => `Bước này thuộc khối dùng chung “${title}”: hãy sửa trong khối.`,
  },
}
