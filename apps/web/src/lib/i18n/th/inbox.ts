import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('th-TH')

export const inbox: typeof Fr = {
  title: 'รอดำเนินการ',
  open: (n: number) => (n ? `รอดำเนินการ: ใหม่ ${num(n)}` : 'รอดำเนินการ'),
  empty: 'ตอนนี้ไม่มีรายการรอดำเนินการ',
  emptyHint: 'การอนุมัติที่ต้องทำ อันตรายที่มีผู้แจ้ง และความเบี่ยงเบนที่บันทึกไว้ จะแสดงที่นี่',
  kinds: {
    review: 'รออนุมัติ',
    changes: 'ขอให้แก้ไข',
    danger: 'มีการแจ้งอันตราย',
    deviation: 'บันทึกความเบี่ยงเบน',
    request: 'มีคำขอ',
    requalify: 'ต้องรับรองใหม่',
    lateTraining: 'การอบรมเลยกำหนด',
  },
  by: (name: string) => `โดย ${name}`,
  comesWith: (name: string) => `มาพร้อม ${name}`,
  isNew: 'ใหม่',
}
