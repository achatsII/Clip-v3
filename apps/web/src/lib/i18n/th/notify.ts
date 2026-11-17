import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `รออนุมัติ: ${instruction}`,
    body: (who: string) => `${who} ขอให้คุณอนุมัติ`,
  },
  changes: {
    title: (instruction: string) => `ขอให้แก้ไข: ${instruction}`,
    body: (who: string, text: string) => `${who} ขอให้แก้ไข: “${text}”`,
  },
  published: {
    title: (instruction: string) => `เผยแพร่แล้ว: ${instruction}`,
    body: 'ลงนามครบแล้ว: วิธีปฏิบัติงานนี้ถึงสถานีงานแล้ว',
  },
  danger: {
    title: (station: string) => `มีการแจ้งอันตราย${station ? ` ที่ ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `โดย ${who}` : '', text ? `“${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `บันทึกความเบี่ยงเบน${station ? ` ที่ ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `โดย ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} ต้องการ: ${what}`,
    body: (target: string) => (target ? `ฟีเจอร์นี้มาพร้อม ${target} ดูรายละเอียดทั้งหมดได้ที่ การสมัครใช้และเครดิต` : 'ดูรายละเอียดทั้งหมดได้ที่ การสมัครใช้และเครดิต'),
  },
  test: {
    title: 'ทดสอบการแจ้งเตือนของ CLIP',
    body: 'การแจ้งเตือนส่งถึงคุณแล้ว',
  },
  open: 'เปิดใน CLIP',
  footer: 'คุณได้รับการแจ้งเตือนจาก CLIP นี้เพราะโรงงานของคุณตั้งค่าไว้ คุณปิดการแจ้งเตือนได้ใน CLIP ที่ บัญชีของฉัน',
}
