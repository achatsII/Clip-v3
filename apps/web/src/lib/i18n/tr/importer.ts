import type { importer as Fr } from '../fr/importer'

/** Eski belgelerin toplu aktarımı. */
export const importer: typeof Fr = {
  title: 'Eski talimatlarınızı aktarın',
  subtitle: 'PDF ve Word belgelerinizi, düzinelercesini bile bırakın: her biri incelemeye hazır, yapılandırılmış bir taslak olur.',
  readOnly: 'Rolünüz aktarmaya izin vermiyor.',
  unavailableTitle: 'Toplu aktarım şu anda kullanılamıyor',
  unavailableText: 'Bir belgeyi yeni bir talimata bırakabilirsiniz.',
  drop: {
    title: 'Dosyalarınızı buraya sürükleyin veya seçmek için dokunun',
    formats: 'PDF veya Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) veya PowerPoint (.pptx)',
  },
  onlyDocuments: 'Burada yalnızca PDF ve Word belgeleri aktarılır',
  onlyDocumentsText: 'Videolar ve fotoğraflar yeni bir talimata girer.',
  slides: 'PowerPoint dosyalarınızı PDF olarak kaydedin',
  slidesText: 'PowerPoint’te: Dosya › Dışa aktar › PDF. Sonra PDF’i buraya bırakın: görselleri adım medyası olur.',
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('tr-TR')} / ${total.toLocaleString('tr-TR')} tamamlandı`,
    resume: (pending: number) => `Analize devam et (${pending.toLocaleString('tr-TR')})`,
    running: 'Devam ediyor — bu sekmeyi açık tutun',
    review: 'İncele',
  },
  status: {
    waiting: 'Bekliyor',
    uploading: 'Yükleniyor ve dönüştürülüyor…',
    uploaded: 'Analize hazır',
    analyzing: 'Yapay zekâ yeniden yapılandırıyor…',
    server: 'Yapay zekâ bunu sunucuda analiz ediyor: uygulamayı kapatabilirsiniz',
    done: 'Taslak oluşturuldu',
    error: 'Başarısız',
  },
  errors: {
    interrupted: 'Yükleme yarıda kesildi: dosyayı yeniden bırakın.',
    upload: 'Yüklenemedi',
    analysis: 'Analiz edilemedi',
  },
}
