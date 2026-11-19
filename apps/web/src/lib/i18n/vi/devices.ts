import type { devices as Fr } from '../fr/devices'

export const devices: typeof Fr = {
  elsewhere: {
    title: 'Công ty của bạn dùng {app}',
    body: 'Tài khoản này thuộc một công ty làm việc với {app}: hướng dẫn và trạm của công ty đang chờ bạn ở đó.',
    open: 'Mở {app}',
    install: 'Cài {app}',
    noStore: 'Đội ngũ công ty bạn sẽ gửi cho bạn liên kết ứng dụng {app}.',
    computer: 'Trên máy tính: {host}',
  },
  getApp: {
    title: 'CLIP trên điện thoại của bạn',
    why: 'Quay thao tác tại trạm và mở hướng dẫn bằng mã QR.',
    scan: 'Hướng camera điện thoại vào mã này: nó mở App Store hoặc Google Play.',
    ask: 'Không có liên kết cho điện thoại này? Đội ngũ công ty bạn sẽ gửi cho bạn.',
    menu: 'Ứng dụng di động',
    later: 'Để sau',
    pageTitle: 'Cài CLIP',
    pageBack: 'Tiếp tục trên trình duyệt',
    appStore: 'App Store',
    googlePlay: 'Google Play',
  },
  computer: {
    title: 'Trên máy tính của bạn',
    body: 'Làm việc trên màn hình lớn: mở {host} trong trình duyệt và đăng nhập bằng cùng tài khoản.',
    copy: 'Sao chép địa chỉ',
    copied: 'Đã sao chép địa chỉ',
    send: 'Gửi liên kết',
    later: 'Để sau',
  },
}
