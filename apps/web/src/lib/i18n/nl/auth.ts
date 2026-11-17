import type { auth as Fr } from '../fr/auth'

/** Inloggen, registreren, wachtwoord vergeten, welkom; het openen van de sessie en de native schil. */
export const auth: typeof Fr = {
  login: {
    tagline: 'Werkinstructies',
    hero: {
      film: 'Film het.',
      aiWrites: 'AI schrijft het.',
      floorFollows: 'De werkvloer volgt.',
      pitch: 'In enkele minuten een duidelijke, visuele werkinstructie, door elke operator op het juiste station te vinden, zonder account.',
      inputs: 'Video’s, foto’s, spraaknotities of oude pdf’s',
      generated: 'Gegenereerde stappen, videofragmenten en waarschuwingen',
      qrAndTablet: 'QR-code en tablet op het station, zonder account',
    },
    titles: { login: 'Welkom terug', signup: 'Maak je account aan', forgot: 'Stel je wachtwoord opnieuw in' },
    intros: {
      login: 'Log in om je instructies te maken en te beheren.',
      signup: 'Gratis om te beginnen. Geen kaart nodig.',
      forgot: 'We sturen je een link om een nieuw wachtwoord te kiezen.',
    },
    sent: {
      title: 'E-mail verstuurd',
      body: (email: string) => `Als er een account bestaat voor ${email}, ontvang je binnen enkele minuten een link.`,
      back: 'Terug naar inloggen',
    },
    fullname: 'Je naam',
    fullnamePlaceholder: 'Emma de Vries',
    company: 'Fabriek of bedrijf',
    optional: 'optioneel',
    companyPlaceholder: 'Fabriek Bellechasse',
    email: 'E-mail',
    emailPlaceholder: 'jij@bedrijf.nl',
    password: 'Wachtwoord',
    forgotLink: 'Vergeten?',
    submit: { login: 'Inloggen', signup: 'Mijn account aanmaken', forgot: 'Link versturen' },
    /** Toestemming voor de AI, gegeven door in te loggen (regel 5.1.2(i) van Apple). */
    aiNotice: {
      login: 'Door in te loggen ga je ermee akkoord dat de AI van Google je foto’s, video’s, spraaknotities en tekst analyseert, en dat OpenAI een foto ontvangt wanneer je om een afbeelding vraagt.',
      signup: 'Door je account aan te maken ga je ermee akkoord dat de AI van Google je foto’s, video’s, spraaknotities en tekst analyseert, en dat OpenAI een foto ontvangt wanneer je om een afbeelding vraagt.',
    },
    privacy: 'Privacybeleid',
    errors: {
      email: 'Vul een geldig e-mailadres in.',
      passwordTooShort: 'Je wachtwoord moet minstens 8 tekens bevatten.',
      passwordMissing: 'Vul je wachtwoord in.',
    },
    newHere: 'Nieuw hier?',
    createFreeAccount: 'Maak een gratis account aan',
    askForInvitation: 'Nog geen account? Vraag je beheerder om een uitnodiging.',
    haveAccount: 'Ik heb al een account',
    language: 'Taal',
  },
  welcome: {
    setup: 'Instelling',
    progress: (step: number, total: number) => `${step.toLocaleString('nl-NL')} van ${total.toLocaleString('nl-NL')}`,
    name: {
      title: 'Hoe heet je fabriek?',
      hint: 'De naam verschijnt op de tablets op de stations en in pdf’s.',
      placeholder: 'Fabriek Bellechasse',
    },
    goals: {
      title: 'Wat wil je eerst documenteren?',
      hint: 'Kies er zoveel je wilt. Je startpagina wordt eromheen opgebouwd.',
      sstAndLockout: 'Veiligheid en lock-out',
    },
    approval: {
      title: 'Wie keurt instructies goed?',
      hint: 'Je kunt je keuze later wijzigen in de instellingen.',
      none: 'Niemand: direct publiceren',
      noneHint: 'Wie het schrijft, is er verantwoordelijk voor.',
      one: 'Een beoordelaar controleert eerst',
      oneHint: 'Leidinggevende, kwaliteit of veiligheid: die ziet wat er is gewijzigd en publiceert.',
    },
    ready: {
      title: (plant: string) => `Alles klaar, ${plant}!`,
      hint: 'Je eerste instructie kost enkele minuten: film iemand die de taak uitvoert terwijl diegene uitleg geeft.',
      create: 'Mijn eerste instructie maken',
      import: 'Mijn oude pdf’s importeren',
      later: 'Later',
    },
    finish: 'Afronden',
    nothingPublished: 'Er wordt niets gepubliceerd zonder jou.',
  },
  session: {
    defaultOrgName: 'Mijn fabriek',
    me: 'Ik',
    openFailed: 'CLIP kon niet worden geopend',
    serverDown: 'De server reageert nu niet. Controleer je verbinding en probeer het opnieuw.',
  },
  native: {
    unavailable: 'Native functie niet beschikbaar',
    noResponse: 'De mobiele app reageert niet',
  },
}
