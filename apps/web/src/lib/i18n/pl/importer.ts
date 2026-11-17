import type { importer as Fr } from '../fr/importer'

/** L’import en lot des anciens documents. */
export const importer: typeof Fr = {
  title: 'Zaimportuj stare instrukcje',
  subtitle: 'Upuść swoje pliki PDF i Word, nawet po kilkanaście naraz: każdy stanie się uporządkowaną wersją roboczą, gotową do przeglądu.',
  readOnly: 'Twoja rola nie pozwala na import.',
  unavailableTitle: 'Import zbiorczy jest teraz niedostępny',
  unavailableText: 'Możesz upuścić dokument w nowej instrukcji.',
  drop: {
    title: 'Przeciągnij pliki tutaj lub dotknij, aby je wybrać',
    formats: 'PDF lub Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) lub PowerPoint (.pptx)',
  },
  onlyDocuments: 'Tutaj importuje się tylko pliki PDF i Word',
  onlyDocumentsText: 'Wideo i zdjęcia dodaje się w nowej instrukcji.',
  slides: 'Zapisz pliki PowerPoint jako PDF',
  slidesText: 'W PowerPoint: Plik › Eksportuj › PDF. Potem upuść tutaj plik PDF: jego obrazy staną się mediami kroków.',
  batch: {
    progress: (done: number, total: number) => `${done.toLocaleString('pl-PL')} z ${total.toLocaleString('pl-PL')} gotowe`,
    resume: (pending: number) => `Wznów analizę (${pending.toLocaleString('pl-PL')})`,
    running: 'W toku — nie zamykaj tej karty',
    review: 'Przejrzyj',
  },
  status: {
    waiting: 'Oczekuje',
    uploading: 'Przesyłanie i konwersja…',
    uploaded: 'Gotowe do analizy',
    analyzing: 'AI porządkuje treść…',
    server: 'AI analizuje to na serwerze: możesz zamknąć aplikację',
    done: 'Wersja robocza utworzona',
    error: 'Niepowodzenie',
  },
  errors: {
    interrupted: 'Przesyłanie przerwane: upuść plik ponownie.',
    upload: 'Nie udało się przesłać',
    analysis: 'Nie udało się przeanalizować',
  },
}
