import type { shell as Fr } from '../fr/shell'

/** Il guscio: navigazione, menu, account, lettore di codici. */
export const shell: typeof Fr = {
  opening: 'Apertura di CLIP…',
  mainNav: 'Navigazione principale',
  nav: {
    home: 'Home',
    instructions: 'Istruzioni',
    stations: 'Postazioni',
    feedback: 'Riscontri',
    stats: 'Statistiche',
    team: 'Team',
    records: 'Registro',
    import: 'Importa documenti',
    billing: 'Piano e crediti',
    settings: 'Impostazioni',
    more: 'Altro',
  },
  newInstruction: 'Nuova istruzione',
  account: 'Il mio account',
  appearance: 'Aspetto',
  signOut: 'Esci',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Versione ${v}`,
    built: (date: string) => `rilasciata il ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `App per ${platform === 'ios' ? 'iPhone' : 'Android'} ${v}${build ? ` (${build})` : ''}`,
    title: 'Informazioni su CLIP',
    hint: 'L’ultimo numero aumenta a ogni aggiornamento: confrontalo con quello che ti è stato indicato.',
  },
  aiConsent: {
    title: 'Prima di usare l’IA',
    body: 'Per scrivere e modificare le tue istruzioni, CLIP invia le tue foto, i video, le note vocali e i testi a servizi di intelligenza artificiale di Google e OpenAI, tramite la piattaforma Intelligence Industrielle.',
    more: 'Non viene inviato nulla senza il tuo consenso. Puoi revocarlo in Impostazioni › Dati.',
    privacy: 'Informativa sulla privacy',
    accept: 'Accetto',
    refuse: 'Non ora',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `Stai modificando ${title ? `“${title}”` : 'un’istruzione'} ${device === 'app' ? 'dall’app mobile' : 'da un altro computer'}`,
  },
  scan: {
    title: 'Scansiona un codice',
    prompt: 'Scansiona il codice della postazione o del pezzo',
    failed: 'Il lettore di codici non si è aperto',
    aim: 'Inquadra il codice QR o il codice a barre',
    noCamera: 'La fotocamera non è disponibile. Consentila nel browser oppure digita il codice nella ricerca.',
  },
}
