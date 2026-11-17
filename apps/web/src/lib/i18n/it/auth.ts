import type { auth as Fr } from '../fr/auth'

/** Accesso, registrazione, password dimenticata, benvenuto; l’apertura della sessione e il guscio nativo. */
export const auth: typeof Fr = {
  login: {
    tagline: 'Istruzioni di lavoro',
    hero: {
      film: 'Filma.',
      aiWrites: 'L’IA scrive.',
      floorFollows: 'Il reparto segue.',
      pitch: 'Un’istruzione di lavoro chiara e visiva in pochi minuti, che ogni operatore trova alla postazione giusta, senza bisogno di un account.',
      inputs: 'Video, foto, note vocali o vecchi PDF',
      generated: 'Passaggi, clip video e avvertenze generati',
      qrAndTablet: 'Codice QR e tablet di postazione, senza account',
    },
    titles: { login: 'Bentornato', signup: 'Crea il tuo account', forgot: 'Reimposta la password' },
    intros: {
      login: 'Accedi per creare e gestire le tue istruzioni.',
      signup: 'Gratis per iniziare. Nessuna carta richiesta.',
      forgot: 'Ti invieremo un link per scegliere una nuova password.',
    },
    sent: {
      title: 'Email inviata',
      body: (email: string) => `Se esiste un account per ${email}, riceverai un link entro pochi minuti.`,
      back: 'Torna all’accesso',
    },
    fullname: 'Il tuo nome',
    fullnamePlaceholder: 'Giulia Rossi',
    company: 'Stabilimento o azienda',
    optional: 'facoltativo',
    companyPlaceholder: 'Stabilimento Bellechasse',
    email: 'Email',
    emailPlaceholder: 'tu@azienda.com',
    password: 'Password',
    forgotLink: 'Dimenticata?',
    submit: { login: 'Accedi', signup: 'Crea il mio account', forgot: 'Invia il link' },
    aiNotice: {
      login: 'Accedendo, accetti che l’IA di Google analizzi le tue foto, i video, le note vocali e i testi, e che OpenAI riceva una foto quando chiedi un’immagine.',
      signup: 'Creando l’account, accetti che l’IA di Google analizzi le tue foto, i video, le note vocali e i testi, e che OpenAI riceva una foto quando chiedi un’immagine.',
    },
    privacy: 'Informativa sulla privacy',
    errors: {
      email: 'Inserisci un’email valida.',
      passwordTooShort: 'La password deve avere almeno 8 caratteri.',
      passwordMissing: 'Inserisci la password.',
    },
    newHere: 'Sei nuovo?',
    createFreeAccount: 'Crea un account gratuito',
    askForInvitation: 'Non hai ancora un account? Chiedi un invito al tuo amministratore.',
    haveAccount: 'Ho già un account',
    language: 'Lingua',
  },
  welcome: {
    setup: 'Configurazione',
    progress: (step: number, total: number) => `${step.toLocaleString('it-IT')} di ${total.toLocaleString('it-IT')}`,
    name: {
      title: 'Come si chiama il tuo stabilimento?',
      hint: 'Comparirà sui tablet delle postazioni e nei PDF.',
      placeholder: 'Stabilimento Bellechasse',
    },
    goals: {
      title: 'Cosa vuoi documentare per prima cosa?',
      hint: 'Scegline quante vuoi. La tua home è organizzata attorno a queste scelte.',
      sstAndLockout: 'Sicurezza e lockout',
    },
    approval: {
      title: 'Chi approva le istruzioni?',
      hint: 'Puoi cambiare idea nelle impostazioni.',
      none: 'Nessuno: si pubblica direttamente',
      noneHint: 'Chi la scrive ne è responsabile.',
      one: 'Prima la controlla un approvatore',
      oneHint: 'Supervisore, qualità o sicurezza: vedono cosa è cambiato e pubblicano.',
    },
    ready: {
      title: (plant: string) => `Tutto pronto, ${plant}!`,
      hint: 'La tua prima istruzione richiede pochi minuti: filma qualcuno che esegue il lavoro mentre lo spiega.',
      create: 'Crea la mia prima istruzione',
      import: 'Importa i miei vecchi PDF',
      later: 'Più tardi',
    },
    finish: 'Fine',
    nothingPublished: 'Nulla viene pubblicato senza di te.',
  },
  session: {
    defaultOrgName: 'Il mio stabilimento',
    me: 'Io',
    openFailed: 'Impossibile aprire CLIP',
    serverDown: 'Il server non risponde al momento. Controlla la connessione, poi riprova.',
  },
  native: {
    unavailable: 'Funzione nativa non disponibile',
    noResponse: 'L’app mobile non risponde',
  },
}
