import type { importer as Fr } from '../fr/importer'

/** Het in bulk importeren van oude documenten. */
export const importer: typeof Fr = {
  title: 'Importeer je oude instructies',
  subtitle: 'Zet je PDF’s en Word-documenten neer, ook tientallen tegelijk: elk wordt een gestructureerd concept, klaar om na te lezen.',
  readOnly: 'Met je rol kun je niet importeren.',
  unavailableTitle: 'Bulkimport is nu niet beschikbaar',
  unavailableText: 'Je kunt een document neerzetten in een nieuwe instructie.',
  drop: {
    title: 'Sleep je bestanden hierheen, of tik om ze te kiezen',
    formats: 'PDF of Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) of PowerPoint (.pptx)',
  },
  onlyDocuments: 'Hier worden alleen PDF’s en Word-documenten geïmporteerd',
  onlyDocumentsText: 'Video’s en foto’s gaan in een nieuwe instructie.',
  slides: 'Sla je PowerPoint-bestanden op als PDF',
  slidesText: 'In PowerPoint: Bestand › Exporteren › PDF. Zet de PDF daarna hier neer: de afbeeldingen worden de media van de stappen.',
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('nl-NL')} van ${total.toLocaleString('nl-NL')} klaar`,
    resume: (pending: number) => `De analyse hervatten (${pending.toLocaleString('nl-NL')})`,
    running: 'Bezig — houd dit tabblad open',
    review: 'Nalezen',
  },
  status: {
    waiting: 'Wacht',
    uploading: 'Uploaden en omzetten…',
    uploaded: 'Klaar om te analyseren',
    analyzing: 'De AI structureert opnieuw…',
    server: 'De AI analyseert het op de server: je kunt de app sluiten',
    done: 'Concept gemaakt',
    error: 'Mislukt',
  },
  errors: {
    interrupted: 'Uploaden onderbroken: zet het bestand opnieuw neer.',
    upload: 'Uploaden mislukt',
    analysis: 'Analyseren mislukt',
  },
}
