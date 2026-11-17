import type { importer as Fr } from '../fr/importer'

/** L’importazione in blocco dei vecchi documenti. */
export const importer: typeof Fr = {
  title: 'Importa le tue vecchie istruzioni',
  subtitle: 'Trascina i tuoi PDF e documenti Word, anche a decine: ognuno diventa una bozza strutturata, pronta da rivedere.',
  readOnly: 'Il tuo ruolo non consente di importare.',
  unavailableTitle: 'L’importazione in blocco non è disponibile al momento',
  unavailableText: 'Puoi trascinare un documento in una nuova istruzione.',
  drop: {
    title: 'Trascina qui i file o tocca per sceglierli',
    formats: 'PDF o Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) o PowerPoint (.pptx)',
  },
  onlyDocuments: 'Qui si importano solo PDF e documenti Word',
  onlyDocumentsText: 'Video e foto vanno in una nuova istruzione.',
  slides: 'Salva i tuoi file PowerPoint come PDF',
  slidesText: 'In PowerPoint: File › Esporta › PDF. Poi trascina qui il PDF: le sue immagini diventano i contenuti multimediali dei passaggi.',
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('it-IT')} di ${total.toLocaleString('it-IT')} completati`,
    resume: (pending: number) => `Riprendi l’analisi (${pending.toLocaleString('it-IT')})`,
    running: 'In corso — tieni aperta questa scheda',
    review: 'Rivedi',
  },
  status: {
    waiting: 'In attesa',
    uploading: 'Caricamento e conversione…',
    uploaded: 'Pronto per l’analisi',
    analyzing: 'L’IA sta riorganizzando…',
    server: 'L’IA lo sta analizzando sul server: puoi chiudere l’app',
    done: 'Bozza creata',
    error: 'Non riuscito',
  },
  errors: {
    interrupted: 'Caricamento interrotto: trascina di nuovo il file.',
    upload: 'Impossibile caricare',
    analysis: 'Impossibile analizzare',
  },
}
