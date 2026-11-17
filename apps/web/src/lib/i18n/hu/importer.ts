import type { importer as Fr } from '../fr/importer'

/** A régi dokumentumok tömeges importálása. */
export const importer: typeof Fr = {
  title: 'Régi utasítások importálása',
  subtitle: 'Húzza ide a PDF- és Word-dokumentumait, akár tucatszám: mindegyikből strukturált piszkozat lesz, átnézésre készen.',
  readOnly: 'A szerepköre nem teszi lehetővé az importálást.',
  unavailableTitle: 'A tömeges importálás jelenleg nem érhető el',
  unavailableText: 'Egy dokumentumot behúzhat egy új utasításba.',
  drop: {
    title: 'Húzza ide a fájlokat, vagy érintse meg a kiválasztáshoz',
    formats: 'PDF vagy Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) vagy PowerPoint (.pptx)',
  },
  onlyDocuments: 'Itt csak PDF- és Word-dokumentumok importálhatók',
  onlyDocumentsText: 'A videók és a fotók új utasításba kerülnek.',
  slides: 'Mentse a PowerPoint-fájlokat PDF-ként',
  slidesText: 'A PowerPointban: Fájl › Exportálás › PDF. Majd húzza ide a PDF-et: a képei a lépések médiái lesznek.',
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('hu-HU')} / ${total.toLocaleString('hu-HU')} kész`,
    resume: (pending: number) => `Az elemzés folytatása (${pending.toLocaleString('hu-HU')})`,
    running: 'Folyamatban — tartsa nyitva ezt a lapot',
    review: 'Átnézés',
  },
  status: {
    waiting: 'Várakozik',
    uploading: 'Feltöltés és átalakítás…',
    uploaded: 'Elemzésre kész',
    analyzing: 'Az AI átstrukturálja…',
    server: 'Az AI a szerveren elemzi: bezárhatja az alkalmazást',
    done: 'Piszkozat létrehozva',
    error: 'Sikertelen',
  },
  errors: {
    interrupted: 'A feltöltés megszakadt: húzza ide újra a fájlt.',
    upload: 'A feltöltés nem sikerült',
    analysis: 'Az elemzés nem sikerült',
  },
}
