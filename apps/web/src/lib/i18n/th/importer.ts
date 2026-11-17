import type { importer as Fr } from '../fr/importer'

// การนำเข้าเอกสารเก่าเป็นชุด
export const importer: typeof Fr = {
  title: 'นำเข้าวิธีปฏิบัติงานเดิมของคุณ',
  subtitle: 'วางไฟล์ PDF และเอกสาร Word ได้ครั้งละหลายสิบไฟล์ แต่ละไฟล์จะกลายเป็นฉบับร่างที่มีโครงสร้าง พร้อมให้ตรวจทาน',
  readOnly: 'บทบาทของคุณไม่มีสิทธิ์นำเข้า',
  unavailableTitle: 'ตอนนี้ยังนำเข้าเป็นชุดไม่ได้',
  unavailableText: 'คุณวางเอกสารลงในวิธีปฏิบัติงานใหม่ได้',
  drop: {
    title: 'ลากไฟล์มาวางที่นี่ หรือแตะเพื่อเลือกไฟล์',
    formats: 'PDF หรือ Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) หรือ PowerPoint (.pptx)',
  },
  onlyDocuments: 'ที่นี่นำเข้าได้เฉพาะ PDF และเอกสาร Word',
  onlyDocumentsText: 'วิดีโอและรูปภาพให้ใส่ในวิธีปฏิบัติงานใหม่',
  slides: 'บันทึกไฟล์ PowerPoint เป็น PDF',
  slidesText: 'ใน PowerPoint: ไฟล์ › ส่งออก › PDF แล้วนำ PDF มาวางที่นี่ รูปภาพในไฟล์จะกลายเป็นสื่อของแต่ละขั้นตอน',
  batch: {
    progress: (done: number, total: number) => `เสร็จ ${done.toLocaleString('th-TH')} จาก ${total.toLocaleString('th-TH')}`,
    resume: (pending: number) => `วิเคราะห์ต่อ (${pending.toLocaleString('th-TH')})`,
    running: 'กำลังทำงาน — เปิดแท็บนี้ไว้',
    review: 'ตรวจทาน',
  },
  status: {
    waiting: 'รอคิว',
    uploading: 'กำลังอัปโหลดและแปลงไฟล์…',
    uploaded: 'พร้อมวิเคราะห์',
    analyzing: 'AI กำลังจัดโครงสร้างใหม่…',
    server: 'AI กำลังวิเคราะห์บนเซิร์ฟเวอร์ คุณปิดแอปได้',
    done: 'สร้างฉบับร่างแล้ว',
    error: 'ไม่สำเร็จ',
  },
  errors: {
    interrupted: 'การอัปโหลดถูกขัดจังหวะ โปรดวางไฟล์อีกครั้ง',
    upload: 'อัปโหลดไม่สำเร็จ',
    analysis: 'วิเคราะห์ไม่สำเร็จ',
  },
}
