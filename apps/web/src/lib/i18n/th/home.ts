import type { home as Fr } from '../fr/home'

// หน้าแรก
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `สวัสดีคุณ${name}`,
    morning: (name: string) => `อรุณสวัสดิ์คุณ${name}`,
    afternoon: (name: string) => `สวัสดียามบ่ายคุณ${name}`,
    evening: (name: string) => `สวัสดียามเย็นคุณ${name}`,
  },
  hero: {
    eyebrow: 'วิธีปฏิบัติงานใหม่',
    line1: 'ถ่ายวิดีโอ พูดอธิบาย',
    line2: 'ให้ AI เขียนให้',
    video: 'วิดีโอ',
    voiceNote: 'บันทึกเสียง',
    document: 'PDF หรือ Word',
  },
  reader: {
    find: 'ค้นหาวิธีปฏิบัติงาน',
    myStations: 'สถานีงานของฉัน',
  },
  setup: {
    title: 'เริ่มใช้งานโรงงานของคุณ',
    hint: 'ใช้เวลาไม่กี่นาที ทำทีละขั้น',
    publish: 'เผยแพร่วิธีปฏิบัติงานแรก',
    station: 'สร้างสถานีงานและ QR code',
    logo: 'เพิ่มโลโก้โรงงาน',
    invite: 'เชิญเพื่อนร่วมงาน',
    standard: 'ปรับมาตรฐานการเขียน',
    hide: 'ซ่อนขั้นตอนเริ่มต้น',
    hideShort: 'ซ่อน',
    show: 'แสดง',
    compact: (done: number, total: number) => `เริ่มต้นใช้งาน: ${done} จาก ${total}`,
  },
  tiles: {
    published: 'เผยแพร่แล้ว',
    coverage: (percent: number) => `ครอบคลุมสถานีงาน ${percent.toLocaleString('th-TH')}%`,
    noStation: 'ยังไม่มีสถานีงาน',
    views: 'ครั้งที่เปิดดู · 7 วัน',
    viewsHint: 'แท็บเล็ต QR code และลิงก์',
    stations: 'สถานีงาน',
    stationsHint: 'พร้อมวิธีปฏิบัติงานของแต่ละสถานี',
    streak: 'ต่อเนื่อง',
    streakWeeks: (weeks: number) => `สัปดาห์ติดต่อกันที่มีการเผยแพร่`,
    streakStart: 'เผยแพร่ในสัปดาห์นี้เพื่อเริ่มสถิติต่อเนื่อง',
  },
  renewal: {
    title: (count: number) => `ต้องทบทวน (${count.toLocaleString('th-TH')})`,
    hint: 'ใกล้ถึงกำหนดทบทวนแล้ว ไม่มีอะไรเปลี่ยน ยืนยันได้ในแตะเดียว',
  },
  review: {
    title: (count: number) => `รออนุมัติ (${count.toLocaleString('th-TH')})`,
    hint: 'ขั้นตอนที่เปลี่ยนจะมีเครื่องหมายในตัวแก้ไข',
  },
  feedback: {
    title: 'ข้อเสนอแนะจากผู้ปฏิบัติงาน',
    seeAll: 'ดูทั้งหมด',
    quote: (comment: string) => `“${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `ขั้นตอนที่ ${step.toLocaleString('th-TH')} · ${ago}`),
    none: 'ไม่มีข้อเสนอแนะใหม่',
  },
  drafts: { title: 'ทำต่อจากเดิม', hint: 'ฉบับร่างที่คุณกำลังทำ' },
  forYou: { title: 'สำหรับคุณ', hint: 'ตามหน้าที่ของคุณ' },
  library: {
    count: (n: number) => `วิธีปฏิบัติงานที่เผยแพร่แล้ว ${n.toLocaleString('th-TH')} รายการ`,
    hint: 'หน้างานของคุณมีคลังที่มีชีวิต ปรับให้ทันสมัยอยู่เสมอด้วยข้อเสนอแนะจากผู้ปฏิบัติงาน',
  },
}
