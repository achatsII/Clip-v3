import type { importer as Fr } from '../fr/importer'

/** L’import en lot des anciens documents. */
export const importer: typeof Fr = {
  title: 'Import your old instructions',
  subtitle: 'Drop your PDFs and Word documents, even by the dozen: each one becomes a structured draft, ready to review.',
  readOnly: 'Your role doesn’t allow importing.',
  unavailableTitle: 'Bulk import isn’t available right now',
  unavailableText: 'You can drop a document into a new instruction.',
  drop: {
    title: 'Drag your files here, or tap to choose them',
    formats: 'PDF or Word (.docx, .doc, .odt)',
  },
  onlyDocuments: 'Only PDFs and Word documents are imported here',
  onlyDocumentsText: 'Videos and photos go into a new instruction.',
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('en-CA')} of ${total.toLocaleString('en-CA')} done`,
    resume: (pending: number) => `Resume the analysis (${pending.toLocaleString('en-CA')})`,
    running: 'In progress — keep this tab open',
    review: 'Review',
  },
  status: {
    waiting: 'Waiting',
    uploading: 'Uploading and converting…',
    uploaded: 'Ready to analyze',
    analyzing: 'The AI is restructuring…',
    server: 'The AI is analyzing it on the server: you can close the app',
    done: 'Draft created',
    error: 'Failed',
  },
  errors: {
    interrupted: 'Upload interrupted: drop the file again.',
    upload: 'Couldn’t upload',
    analysis: 'Couldn’t analyze',
  },
}
