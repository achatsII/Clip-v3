import type { feedback as Fr } from '../fr/feedback'

// ข้อเสนอแนะจากผู้ปฏิบัติงาน
export const feedback: typeof Fr = {
  list: {
    search: 'ค้นหาวิธีปฏิบัติงาน คำ บุคคล หรือสถานีงาน',
    title: 'ข้อเสนอแนะจากผู้ปฏิบัติงาน',
    subtitle: 'สิ่งที่หน้างานแจ้งมา: แก้ขั้นตอนได้ในแตะเดียว แล้วผู้ปฏิบัติงานจะเห็นเวอร์ชันใหม่',
    open: (n: number) => `ยังเปิดอยู่${n ? ` (${n.toLocaleString('th-TH')})` : ''}`,
    handled: 'จัดการแล้ว',
    all: 'ทั้งหมด',
    emptyOpenTitle: 'ไม่มีเรื่องที่ต้องจัดการ',
    emptyOpenDescription: 'ผู้ปฏิบัติงานแจ้งขั้นตอนที่ไม่ชัดเจนได้จากหน้าปฏิบัติงานด้วยการแตะสองครั้ง ข้อเสนอแนะจะมาแสดงที่นี่',
    emptyHandledTitle: 'ยังไม่มีข้อเสนอแนะที่จัดการแล้ว',
    emptyHandledDescription: 'ข้อเสนอแนะที่คุณจัดการแล้วจะแสดงที่นี่',
    untitled: 'วิธีปฏิบัติงาน',
    step: (n: number) => `ขั้นตอนที่ ${n.toLocaleString('th-TH')}`,
    comment: (text: string) => `“${text}”`,
    operator: 'ผู้ปฏิบัติงาน',
    station: 'สถานีงาน',
    sources: { kiosk: 'แท็บเล็ต', link: 'ลิงก์', app: 'แอป' },
    photo: 'รูปภาพที่แนบ',
    fix: 'แก้ไข',
    markHandled: 'จัดการแล้ว',
    dismiss: 'ไม่ดำเนินการ',
    handledBy: (name: string) => `จัดการโดย ${name}`,
    dismissedBy: (name: string) => `ไม่ดำเนินการโดย ${name}`,
    markedHandled: 'ทำเครื่องหมายว่าจัดการแล้ว',
    dismissed: 'ข้ามข้อเสนอแนะแล้ว',
    updateFailed: 'อัปเดตข้อเสนอแนะไม่สำเร็จ',
  },
}
