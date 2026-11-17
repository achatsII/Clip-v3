import type { importer as Fr } from '../fr/importer'

/** L’import en lot des anciens documents. */
export const importer: typeof Fr = {
  title: 'Impor instruksi lama Anda',
  subtitle: 'Letakkan PDF dan dokumen Word Anda, bahkan puluhan sekaligus: tiap dokumen menjadi draf terstruktur, siap ditinjau.',
  readOnly: 'Peran Anda tidak boleh mengimpor.',
  unavailableTitle: 'Impor massal sedang tidak tersedia',
  unavailableText: 'Anda bisa menaruh dokumen di instruksi baru.',
  drop: {
    title: 'Seret file Anda ke sini, atau ketuk untuk memilihnya',
    formats: 'PDF atau Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) atau PowerPoint (.pptx)',
  },
  onlyDocuments: 'Hanya PDF dan dokumen Word yang diimpor di sini',
  onlyDocumentsText: 'Video dan foto masuk ke instruksi baru.',
  slides: 'Simpan file PowerPoint Anda sebagai PDF',
  slidesText: 'Di PowerPoint: File › Export › PDF. Lalu letakkan PDF-nya di sini: gambarnya menjadi media langkah.',
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('id-ID')} dari ${total.toLocaleString('id-ID')} selesai`,
    resume: (pending: number) => `Lanjutkan analisis (${pending.toLocaleString('id-ID')})`,
    running: 'Sedang berjalan — biarkan tab ini tetap terbuka',
    review: 'Tinjau',
  },
  status: {
    waiting: 'Menunggu',
    uploading: 'Mengunggah dan mengonversi…',
    uploaded: 'Siap dianalisis',
    analyzing: 'AI sedang menyusun ulang…',
    server: 'AI menganalisisnya di server: Anda boleh menutup aplikasi',
    done: 'Draf dibuat',
    error: 'Gagal',
  },
  errors: {
    interrupted: 'Pengunggahan terputus: letakkan filenya lagi.',
    upload: 'Gagal mengunggah',
    analysis: 'Gagal menganalisis',
  },
}
