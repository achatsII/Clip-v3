import type { auth as Fr } from '../fr/auth'

/** Connexion, inscription, mot de passe oublié, bienvenue ; l’ouverture de la session et la coquille native. */
export const auth: typeof Fr = {
  login: {
    tagline: 'Pracovní instrukce',
    hero: {
      film: 'Natočte to.',
      aiWrites: 'AI to napíše.',
      floorFollows: 'Provoz podle toho pracuje.',
      pitch: 'Srozumitelná vizuální pracovní instrukce za pár minut, kterou každý operátor najde na správném pracovišti, bez účtu.',
      inputs: 'Videa, fotky, hlasové poznámky nebo staré PDF',
      generated: 'Vygenerované kroky, videoklipy a upozornění',
      qrAndTablet: 'QR kód a tablet na pracovišti, bez účtu',
    },
    titles: { login: 'Vítejte zpět', signup: 'Vytvořte si účet', forgot: 'Obnovení hesla' },
    intros: {
      login: 'Přihlaste se a vytvářejte a spravujte své instrukce.',
      signup: 'Začátek je zdarma. Bez platební karty.',
      forgot: 'Pošleme vám odkaz pro nastavení nového hesla.',
    },
    sent: {
      title: 'E-mail odeslán',
      body: (email: string) => `Pokud pro adresu ${email} existuje účet, během několika minut vám přijde odkaz.`,
      back: 'Zpět na přihlášení',
    },
    fullname: 'Vaše jméno',
    fullnamePlaceholder: 'Jana Nováková',
    company: 'Závod nebo firma',
    optional: 'nepovinné',
    companyPlaceholder: 'Závod Kladno',
    email: 'E-mail',
    emailPlaceholder: 'vase.jmeno@firma.cz',
    password: 'Heslo',
    forgotLink: 'Zapomněli jste?',
    submit: { login: 'Přihlásit se', signup: 'Vytvořit účet', forgot: 'Odeslat odkaz' },
    /** Consent to the AI, given by signing in (Apple's rule 5.1.2(i)). */
    aiNotice: {
      login: 'Přihlášením souhlasíte s tím, že AI od Google analyzuje vaše fotky, videa, hlasové poznámky a texty a že OpenAI obdrží fotku, když si vyžádáte obrázek.',
      signup: 'Vytvořením účtu souhlasíte s tím, že AI od Google analyzuje vaše fotky, videa, hlasové poznámky a texty a že OpenAI obdrží fotku, když si vyžádáte obrázek.',
    },
    privacy: 'Zásady ochrany osobních údajů',
    errors: {
      email: 'Zadejte platný e-mail.',
      passwordTooShort: 'Heslo musí mít alespoň 8 znaků.',
      passwordMissing: 'Zadejte heslo.',
    },
    newHere: 'Jste tu poprvé?',
    createFreeAccount: 'Vytvořit účet zdarma',
    askForInvitation: 'Ještě nemáte účet? Požádejte správce o pozvánku.',
    haveAccount: 'Už mám účet',
    language: 'Jazyk',
  },
  welcome: {
    setup: 'Nastavení',
    progress: (step: number, total: number) => `${step.toLocaleString('cs-CZ')} z ${total.toLocaleString('cs-CZ')}`,
    name: {
      title: 'Jak se váš závod jmenuje?',
      hint: 'Zobrazí se na tabletech na pracovištích a v souborech PDF.',
      placeholder: 'Závod Kladno',
    },
    goals: {
      title: 'Co chcete dokumentovat jako první?',
      hint: 'Vyberte, kolik chcete. Podle toho se uspořádá vaše domovská stránka.',
      sstAndLockout: 'BOZP a blokování',
    },
    approval: {
      title: 'Kdo schvaluje instrukce?',
      hint: 'Můžete to později změnit v nastavení.',
      none: 'Nikdo: publikuje se přímo',
      noneHint: 'Kdo instrukci napíše, ten za ni odpovídá.',
      one: 'Nejdřív ji zkontroluje schvalovatel',
      oneHint: 'Vedoucí, kvalita nebo BOZP: vidí, co se změnilo, a publikují.',
    },
    ready: {
      title: (plant: string) => `Vše je připraveno, ${plant}!`,
      hint: 'První instrukce zabere pár minut: natočte, jak někdo dělá danou práci a přitom ji vysvětluje.',
      create: 'Vytvořit první instrukci',
      import: 'Importovat staré PDF',
      later: 'Později',
    },
    finish: 'Dokončit',
    nothingPublished: 'Bez vás se nic nepublikuje.',
  },
  session: {
    defaultOrgName: 'Můj závod',
    me: 'Já',
    openFailed: 'CLIP se nepodařilo otevřít',
    serverDown: 'Server teď neodpovídá. Zkontrolujte připojení a zkuste to znovu.',
  },
  native: {
    unavailable: 'Nativní funkce není dostupná',
    noResponse: 'Mobilní aplikace neodpovídá',
  },
}
