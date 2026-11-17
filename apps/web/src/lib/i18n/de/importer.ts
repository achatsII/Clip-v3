import type { importer as Fr } from '../fr/importer'

// Sammelimport alter Dokumente.
export const importer: typeof Fr = {
  title: 'Alte Anweisungen importieren',
  subtitle: 'Ziehen Sie Ihre PDFs und Word-Dokumente hinein, auch dutzendweise: Jedes wird zu einem strukturierten Entwurf, bereit zur Durchsicht.',
  readOnly: 'Ihre Rolle erlaubt keinen Import.',
  unavailableTitle: 'Der Sammelimport ist gerade nicht verfügbar',
  unavailableText: 'Sie können ein Dokument in eine neue Anweisung ziehen.',
  drop: {
    title: 'Dateien hierher ziehen oder zum Auswählen tippen',
    formats: 'PDF oder Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) oder PowerPoint (.pptx)',
  },
  onlyDocuments: 'Hier werden nur PDFs und Word-Dokumente importiert',
  onlyDocumentsText: 'Videos und Fotos gehören in eine neue Anweisung.',
  slides: 'Speichern Sie Ihre PowerPoint-Dateien als PDF',
  slidesText: 'In PowerPoint: Datei › Exportieren › PDF. Ziehen Sie dann das PDF hierher: Seine Bilder werden zu den Medien der Schritte.',
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('de-DE')} von ${total.toLocaleString('de-DE')} fertig`,
    resume: (pending: number) => `Analyse fortsetzen (${pending.toLocaleString('de-DE')})`,
    running: 'Läuft – lassen Sie diesen Tab geöffnet',
    review: 'Durchsehen',
  },
  status: {
    waiting: 'Wartet',
    uploading: 'Wird hochgeladen und konvertiert …',
    uploaded: 'Bereit zur Analyse',
    analyzing: 'Die KI strukturiert um …',
    server: 'Die KI analysiert es auf dem Server: Sie können die App schließen',
    done: 'Entwurf erstellt',
    error: 'Fehlgeschlagen',
  },
  errors: {
    interrupted: 'Upload unterbrochen: Ziehen Sie die Datei erneut hinein.',
    upload: 'Upload nicht möglich',
    analysis: 'Analyse nicht möglich',
  },
}
