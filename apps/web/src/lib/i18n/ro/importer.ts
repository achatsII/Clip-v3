import type { importer as Fr } from '../fr/importer'

/** L’import en lot des anciens documents. */
export const importer: typeof Fr = {
  title: 'Importați vechile instrucțiuni',
  subtitle: 'Trageți PDF-urile și documentele Word, chiar cu duzina: fiecare devine o ciornă structurată, gata de verificat.',
  readOnly: 'Rolul dumneavoastră nu permite importul.',
  unavailableTitle: 'Importul în lot nu este disponibil acum',
  unavailableText: 'Puteți trage un document într-o instrucțiune nouă.',
  drop: {
    title: 'Trageți fișierele aici sau atingeți pentru a le alege',
    formats: 'PDF sau Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) sau PowerPoint (.pptx)',
  },
  onlyDocuments: 'Aici se importă doar PDF-uri și documente Word',
  onlyDocumentsText: 'Videoclipurile și fotografiile merg într-o instrucțiune nouă.',
  slides: 'Salvați fișierele PowerPoint ca PDF',
  slidesText: 'În PowerPoint: Fișier › Export › PDF. Apoi trageți PDF-ul aici: imaginile lui devin media pașilor.',
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('ro-RO')} din ${total.toLocaleString('ro-RO')} terminate`,
    resume: (pending: number) => `Reia analiza (${pending.toLocaleString('ro-RO')})`,
    running: 'În curs — țineți această filă deschisă',
    review: 'Verifică',
  },
  status: {
    waiting: 'În așteptare',
    uploading: 'Se încarcă și se convertește…',
    uploaded: 'Gata de analizat',
    analyzing: 'AI restructurează…',
    server: 'AI o analizează pe server: puteți închide aplicația',
    done: 'Ciornă creată',
    error: 'Eșuat',
  },
  errors: {
    interrupted: 'Încărcare întreruptă: trageți din nou fișierul.',
    upload: 'Nu s-a putut încărca',
    analysis: 'Nu s-a putut analiza',
  },
}
