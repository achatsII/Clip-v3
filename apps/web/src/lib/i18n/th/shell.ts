import type { shell as Fr } from '../fr/shell'

// โครงหลักของแอป: เมนู บัญชี ตัวสแกนโค้ด
export const shell: typeof Fr = {
  opening: 'กำลังเปิด CLIP…',
  mainNav: 'เมนูหลัก',
  nav: {
    home: 'หน้าแรก',
    instructions: 'วิธีปฏิบัติงาน',
    stations: 'สถานีงาน',
    feedback: 'ข้อเสนอแนะ',
    stats: 'สถิติ',
    team: 'ทีม',
    records: 'ทะเบียนบันทึก',
    import: 'นำเข้าเอกสาร',
    billing: 'แพ็กเกจและเครดิต',
    settings: 'การตั้งค่า',
    more: 'เพิ่มเติม',
  },
  newInstruction: 'วิธีปฏิบัติงานใหม่',
  account: 'บัญชีของฉัน',
  appearance: 'การแสดงผล',
  signOut: 'ออกจากระบบ',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `เวอร์ชัน ${v}`,
    built: (date: string) => `เผยแพร่เมื่อ ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `แอป ${platform === 'ios' ? 'iPhone' : 'Android'} ${v}${build ? ` (${build})` : ''}`,
    title: 'เกี่ยวกับ CLIP',
    hint: 'ตัวเลขสุดท้ายจะเพิ่มขึ้นทุกครั้งที่อัปเดต ลองเทียบกับเลขที่คุณได้รับแจ้ง',
  },
  aiConsent: {
    title: 'ก่อนใช้ AI',
    body: 'เพื่อเขียนและแก้ไขวิธีปฏิบัติงานของคุณ CLIP จะส่งรูปภาพ วิดีโอ บันทึกเสียง และข้อความของคุณไปยังบริการปัญญาประดิษฐ์ของ Google และ OpenAI ผ่านแพลตฟอร์ม Intelligence Industrielle',
    more: 'จะไม่มีการส่งข้อมูลใดๆ หากคุณไม่ยินยอม คุณถอนความยินยอมได้ที่ การตั้งค่า › ข้อมูล',
    privacy: 'นโยบายความเป็นส่วนตัว',
    accept: 'ฉันยอมรับ',
    refuse: 'ไว้ก่อน',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `คุณกำลังแก้ไข${title ? ` “${title}”` : 'วิธีปฏิบัติงาน'}จาก${device === 'app' ? 'แอปบนมือถือ' : 'คอมพิวเตอร์เครื่องอื่น'}`,
  },
  scan: {
    title: 'สแกนโค้ด',
    prompt: 'สแกนโค้ดของสถานีงานหรือชิ้นส่วน',
    failed: 'เปิดตัวสแกนโค้ดไม่ได้',
    aim: 'เล็งไปที่ QR code หรือบาร์โค้ด',
    noCamera: 'ใช้กล้องไม่ได้ โปรดอนุญาตในเบราว์เซอร์ หรือพิมพ์โค้ดในช่องค้นหา',
  },
}
