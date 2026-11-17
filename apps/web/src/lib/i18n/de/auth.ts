import type { auth as Fr } from '../fr/auth'

// Anmeldung, Registrierung, Passwort vergessen, Willkommen; Sitzungsstart und native Hülle.
export const auth: typeof Fr = {
  login: {
    tagline: 'Arbeitsanweisungen',
    hero: {
      film: 'Filmen.',
      aiWrites: 'KI schreibt.',
      floorFollows: 'Die Halle folgt.',
      pitch: 'Eine klare, bebilderte Arbeitsanweisung in Minuten, am richtigen Arbeitsplatz für jeden Werker auffindbar, ganz ohne Konto.',
      inputs: 'Videos, Fotos, Sprachnotizen oder alte PDFs',
      generated: 'Erstellte Schritte, Videoausschnitte und Warnhinweise',
      qrAndTablet: 'QR-Code und Tablet am Arbeitsplatz, ohne Konto',
    },
    titles: { login: 'Willkommen zurück', signup: 'Konto erstellen', forgot: 'Passwort zurücksetzen' },
    intros: {
      login: 'Melden Sie sich an, um Ihre Anweisungen zu erstellen und zu verwalten.',
      signup: 'Kostenlos starten. Keine Karte nötig.',
      forgot: 'Wir senden Ihnen einen Link, um ein neues Passwort zu wählen.',
    },
    sent: {
      title: 'E-Mail gesendet',
      body: (email: string) => `Falls es ein Konto für ${email} gibt, erhalten Sie in wenigen Minuten einen Link.`,
      back: 'Zurück zur Anmeldung',
    },
    fullname: 'Ihr Name',
    fullnamePlaceholder: 'Erika Mustermann',
    company: 'Werk oder Unternehmen',
    optional: 'optional',
    companyPlaceholder: 'Werk Bellechasse',
    email: 'E-Mail',
    emailPlaceholder: 'sie@unternehmen.de',
    password: 'Passwort',
    forgotLink: 'Vergessen?',
    submit: { login: 'Anmelden', signup: 'Konto erstellen', forgot: 'Link senden' },
    aiNotice: {
      login: 'Mit der Anmeldung stimmen Sie zu, dass die KI von Google Ihre Fotos, Videos, Sprachnotizen und Texte auswertet und dass OpenAI ein Foto erhält, wenn Sie ein Bild anfordern.',
      signup: 'Mit der Kontoerstellung stimmen Sie zu, dass die KI von Google Ihre Fotos, Videos, Sprachnotizen und Texte auswertet und dass OpenAI ein Foto erhält, wenn Sie ein Bild anfordern.',
    },
    privacy: 'Datenschutzerklärung',
    errors: {
      email: 'Geben Sie eine gültige E-Mail-Adresse ein.',
      passwordTooShort: 'Ihr Passwort muss mindestens 8 Zeichen lang sein.',
      passwordMissing: 'Geben Sie Ihr Passwort ein.',
    },
    newHere: 'Neu hier?',
    createFreeAccount: 'Kostenloses Konto erstellen',
    askForInvitation: 'Noch kein Konto? Bitten Sie Ihre Administration um eine Einladung.',
    haveAccount: 'Ich habe bereits ein Konto',
    language: 'Sprache',
  },
  welcome: {
    setup: 'Einrichtung',
    progress: (step: number, total: number) => `${step.toLocaleString('de-DE')} von ${total.toLocaleString('de-DE')}`,
    name: {
      title: 'Wie heißt Ihr Werk?',
      hint: 'Der Name erscheint auf den Tablets an den Arbeitsplätzen und in PDFs.',
      placeholder: 'Werk Bellechasse',
    },
    goals: {
      title: 'Was möchten Sie zuerst dokumentieren?',
      hint: 'Wählen Sie beliebig viele. Ihre Startseite richtet sich danach aus.',
      sstAndLockout: 'Arbeitssicherheit und Freischaltung',
    },
    approval: {
      title: 'Wer gibt Anweisungen frei?',
      hint: 'Sie können das später in den Einstellungen ändern.',
      none: 'Niemand: direkt veröffentlichen',
      noneHint: 'Wer sie schreibt, ist dafür verantwortlich.',
      one: 'Zuerst prüft eine Freigabe',
      oneHint: 'Vorgesetzte, Qualität oder Arbeitssicherheit: Sie sehen, was sich geändert hat, und veröffentlichen.',
    },
    ready: {
      title: (plant: string) => `Alles bereit, ${plant}!`,
      hint: 'Ihre erste Anweisung dauert nur wenige Minuten: Filmen Sie jemanden bei der Arbeit, während er sie erklärt.',
      create: 'Meine erste Anweisung erstellen',
      import: 'Meine alten PDFs importieren',
      later: 'Später',
    },
    finish: 'Fertig',
    nothingPublished: 'Ohne Sie wird nichts veröffentlicht.',
  },
  session: {
    defaultOrgName: 'Mein Werk',
    me: 'Ich',
    openFailed: 'CLIP konnte nicht geöffnet werden',
    serverDown: 'Der Server antwortet gerade nicht. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
  },
  native: {
    unavailable: 'Native Funktion nicht verfügbar',
    noResponse: 'Die Mobil-App antwortet nicht',
  },
}
