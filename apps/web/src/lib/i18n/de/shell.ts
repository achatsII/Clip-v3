import type { shell as Fr } from '../fr/shell'

// Rahmen der App: Navigation, Menüs, Konto, Code-Scanner.
export const shell: typeof Fr = {
  opening: 'CLIP wird geöffnet …',
  mainNav: 'Hauptnavigation',
  nav: {
    home: 'Start',
    instructions: 'Anweisungen',
    stations: 'Arbeitsplätze',
    feedback: 'Rückmeldungen',
    stats: 'Statistiken',
    team: 'Team',
    records: 'Protokoll',
    import: 'Dokumente importieren',
    billing: 'Tarif und Credits',
    settings: 'Einstellungen',
    more: 'Mehr',
  },
  newInstruction: 'Neue Anweisung',
  account: 'Mein Konto',
  appearance: 'Darstellung',
  signOut: 'Abmelden',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Version ${v}`,
    built: (date: string) => `veröffentlicht am ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `${platform === 'ios' ? 'iPhone' : 'Android'}-App ${v}${build ? ` (${build})` : ''}`,
    title: 'Über CLIP',
    hint: 'Die letzte Ziffer steigt mit jedem Update: Vergleichen Sie sie mit der Version, die man Ihnen genannt hat.',
  },
  aiConsent: {
    title: 'Vor der Nutzung der KI',
    body: 'Um Ihre Anweisungen zu schreiben und zu bearbeiten, sendet CLIP Ihre Fotos, Videos, Sprachnotizen und Texte über die Plattform von Intelligence Industrielle an KI-Dienste von Google und OpenAI.',
    more: 'Ohne Ihre Zustimmung wird nichts gesendet. Sie können sie unter Einstellungen › Daten widerrufen.',
    privacy: 'Datenschutzerklärung',
    accept: 'Einverstanden',
    refuse: 'Jetzt nicht',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `Sie bearbeiten ${title ? `„${title}“` : 'eine Anweisung'} ${device === 'app' ? 'in der Mobil-App' : 'an einem anderen Computer'}`,
  },
  scan: {
    title: 'Code scannen',
    prompt: 'Code des Arbeitsplatzes oder Teils scannen',
    failed: 'Der Code-Scanner konnte nicht geöffnet werden',
    aim: 'Auf den QR-Code oder Strichcode richten',
    noCamera: 'Die Kamera ist nicht verfügbar. Erlauben Sie sie im Browser oder geben Sie den Code in die Suche ein.',
  },
}
