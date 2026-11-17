import type { auth as Fr } from '../fr/auth'

/** Connexion, inscription, mot de passe oublié, bienvenue ; l’ouverture de la session et la coquille native. */
export const auth: typeof Fr = {
  login: {
    tagline: 'Instrucțiuni de lucru',
    hero: {
      film: 'Filmați.',
      aiWrites: 'AI redactează.',
      floorFollows: 'Producția urmează.',
      pitch: 'O instrucțiune de lucru clară și vizuală în câteva minute, găsită la postul potrivit de fiecare operator, fără cont.',
      inputs: 'Videoclipuri, fotografii, note vocale sau vechi PDF-uri',
      generated: 'Pași generați, secvențe video și avertismente',
      qrAndTablet: 'Cod QR și tabletă la post, fără cont',
    },
    titles: { login: 'Bine ați revenit', signup: 'Creați-vă contul', forgot: 'Resetați-vă parola' },
    intros: {
      login: 'Conectați-vă pentru a crea și a gestiona instrucțiunile.',
      signup: 'Gratuit la început. Fără card.',
      forgot: 'Vă trimitem un link pentru a alege o parolă nouă.',
    },
    sent: {
      title: 'E-mail trimis',
      body: (email: string) => `Dacă există un cont pentru ${email}, veți primi un link în câteva minute.`,
      back: 'Înapoi la conectare',
    },
    fullname: 'Numele dumneavoastră',
    fullnamePlaceholder: 'Elena Popescu',
    company: 'Fabrica sau compania',
    optional: 'opțional',
    companyPlaceholder: 'Fabrica Bellechasse',
    email: 'E-mail',
    emailPlaceholder: 'you@company.com',
    password: 'Parolă',
    forgotLink: 'Ați uitat-o?',
    submit: { login: 'Conectare', signup: 'Creează-mi contul', forgot: 'Trimite linkul' },
    aiNotice: {
      login: 'Conectându-vă, acceptați ca AI de la Google să vă analizeze fotografiile, videoclipurile, notele vocale și textul și ca OpenAI să primească o fotografie atunci când cereți o imagine.',
      signup: 'Creându-vă contul, acceptați ca AI de la Google să vă analizeze fotografiile, videoclipurile, notele vocale și textul și ca OpenAI să primească o fotografie atunci când cereți o imagine.',
    },
    privacy: 'Politica de confidențialitate',
    errors: {
      email: 'Introduceți o adresă de e-mail validă.',
      passwordTooShort: 'Parola trebuie să aibă cel puțin 8 caractere.',
      passwordMissing: 'Introduceți parola.',
    },
    newHere: 'Sunteți nou aici?',
    createFreeAccount: 'Creați un cont gratuit',
    askForInvitation: 'Nu aveți încă un cont? Cereți o invitație administratorului.',
    haveAccount: 'Am deja un cont',
    language: 'Limba',
  },
  welcome: {
    setup: 'Configurare',
    progress: (step: number, total: number) => `${step.toLocaleString('ro-RO')} din ${total.toLocaleString('ro-RO')}`,
    name: {
      title: 'Cum se numește fabrica dumneavoastră?',
      hint: 'Numele va apărea pe tabletele de la posturi și în PDF-uri.',
      placeholder: 'Fabrica Bellechasse',
    },
    goals: {
      title: 'Ce vreți să documentați mai întâi?',
      hint: 'Alegeți oricâte. Pagina de start se organizează în jurul lor.',
      sstAndLockout: 'SSM și blocare',
    },
    approval: {
      title: 'Cine aprobă instrucțiunile?',
      hint: 'Vă puteți răzgândi oricând în setări.',
      none: 'Nimeni: se publică direct',
      noneHint: 'Cine o scrie răspunde de ea.',
      one: 'Un aprobator verifică mai întâi',
      oneHint: 'Șef de schimb, calitate sau SSM: vede ce s-a schimbat și publică.',
    },
    ready: {
      title: (plant: string) => `Totul este gata, ${plant}!`,
      hint: 'Prima instrucțiune durează câteva minute: filmați pe cineva care execută sarcina în timp ce explică.',
      create: 'Creează prima mea instrucțiune',
      import: 'Importă vechile mele PDF-uri',
      later: 'Mai târziu',
    },
    finish: 'Terminat',
    nothingPublished: 'Nimic nu se publică fără dumneavoastră.',
  },
  session: {
    defaultOrgName: 'Fabrica mea',
    me: 'Eu',
    openFailed: 'CLIP nu s-a putut deschide',
    serverDown: 'Serverul nu răspunde acum. Verificați conexiunea, apoi încercați din nou.',
  },
  native: {
    unavailable: 'Funcția nativă nu este disponibilă',
    noResponse: 'Aplicația mobilă nu răspunde',
  },
}
