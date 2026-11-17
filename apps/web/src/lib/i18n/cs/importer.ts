import type { importer as Fr } from '../fr/importer'

/** L’import en lot des anciens documents. */
export const importer: typeof Fr = {
  title: 'Importujte své staré instrukce',
  subtitle: 'Přetáhněte své soubory PDF a dokumenty Word, klidně po desítkách: z každého vznikne strukturovaný koncept připravený ke kontrole.',
  readOnly: 'Vaše role neumožňuje import.',
  unavailableTitle: 'Hromadný import teď není dostupný',
  unavailableText: 'Dokument můžete přetáhnout do nové instrukce.',
  drop: {
    title: 'Přetáhněte soubory sem, nebo klepnutím vyberte',
    formats: 'PDF nebo Word (.docx, .doc, .odt)',
    formatsSlides: 'PDF, Word (.docx, .doc, .odt) nebo PowerPoint (.pptx)',
  },
  onlyDocuments: 'Zde se importují jen soubory PDF a dokumenty Word',
  onlyDocumentsText: 'Videa a fotky patří do nové instrukce.',
  slides: 'Uložte své soubory PowerPoint jako PDF',
  slidesText: 'V PowerPointu: Soubor › Exportovat › PDF. Pak sem přetáhněte PDF: jeho obrázky se stanou médii kroků.',
  batch: {
    progress: (done: number, total: number) => `Hotovo ${done.toLocaleString('cs-CZ')} z ${total.toLocaleString('cs-CZ')}`,
    resume: (pending: number) => `Pokračovat v analýze (${pending.toLocaleString('cs-CZ')})`,
    running: 'Probíhá — nechte tuto kartu otevřenou',
    review: 'Zkontrolovat',
  },
  status: {
    waiting: 'Čeká',
    uploading: 'Nahrává se a převádí…',
    uploaded: 'Připraveno k analýze',
    analyzing: 'AI zpracovává strukturu…',
    server: 'AI to analyzuje na serveru: aplikaci můžete zavřít',
    done: 'Koncept vytvořen',
    error: 'Selhalo',
  },
  errors: {
    interrupted: 'Nahrávání bylo přerušeno: přetáhněte soubor znovu.',
    upload: 'Nahrání se nezdařilo',
    analysis: 'Analýza se nezdařila',
  },
}
