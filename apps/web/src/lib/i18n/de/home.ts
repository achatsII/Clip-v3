import type { home as Fr } from '../fr/home'

// Startseite.
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Hallo ${name}`,
    morning: (name: string) => `Guten Morgen, ${name}`,
    afternoon: (name: string) => `Guten Tag, ${name}`,
    evening: (name: string) => `Guten Abend, ${name}`,
  },
  hero: {
    eyebrow: 'Neue Anweisung',
    line1: 'Filmen. Erklären.',
    line2: 'KI schreibt.',
    video: 'Video',
    voiceNote: 'Sprachnotiz',
    document: 'PDF oder Word',
  },
  reader: {
    find: 'Anweisung suchen',
    myStations: 'Meine Arbeitsplätze',
  },
  setup: {
    title: 'Bringen Sie Ihr Werk in Gang',
    hint: 'Ein paar Minuten, Schritt für Schritt.',
    publish: 'Erste Anweisung veröffentlichen',
    station: 'Arbeitsplatz und QR-Code erstellen',
    logo: 'Logo des Werks hinzufügen',
    invite: 'Eine Kollegin oder einen Kollegen einladen',
    standard: 'Redaktionsstandard anpassen',
    hide: 'Einrichtung ausblenden',
    hideShort: 'Ausblenden',
    show: 'Anzeigen',
    compact: (done: number, total: number) => `Einrichtung: ${done} von ${total}`,
  },
  tiles: {
    published: 'Veröffentlicht',
    coverage: (percent: number) => `${percent.toLocaleString('de-DE')} % der Arbeitsplätze abgedeckt`,
    noStation: 'Noch keine Arbeitsplätze',
    views: 'Aufrufe · 7 Tage',
    viewsHint: 'Tablets, QR-Codes und Links',
    stations: 'Arbeitsplätze',
    stationsHint: 'Mit ihren Anweisungen',
    streak: 'Serie',
    streakWeeks: (weeks: number) => (weeks === 1 ? 'Woche in Folge mit einer Veröffentlichung' : 'Wochen in Folge mit einer Veröffentlichung'),
    streakStart: 'Veröffentlichen Sie diese Woche, um Ihre Serie zu starten',
  },
  renewal: {
    title: (count: number) => `Zu überprüfen (${count.toLocaleString('de-DE')})`,
    hint: 'Das Prüfdatum rückt näher. Nichts geändert? Bestätigen Sie es mit einem Tipp.',
  },
  review: {
    title: (count: number) => `Freizugeben (${count.toLocaleString('de-DE')})`,
    hint: 'Geänderte Schritte sind im Editor markiert.',
  },
  feedback: {
    title: 'Rückmeldungen der Werker',
    seeAll: 'Alle anzeigen',
    quote: (comment: string) => `„${comment}“`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Schritt ${step.toLocaleString('de-DE')} · ${ago}`),
    none: 'Keine neuen Rückmeldungen.',
  },
  drafts: { title: 'Weitermachen', hint: 'Ihre laufenden Entwürfe' },
  forYou: { title: 'Für Sie', hint: 'Nach Ihren Aufgaben' },
  library: {
    count: (n: number) => `${n.toLocaleString('de-DE')} veröffentlichte ${n === 1 ? 'Anweisung' : 'Anweisungen'}`,
    hint: 'Ihre Halle hat eine lebendige Bibliothek. Halten Sie sie mit den Rückmeldungen der Werker aktuell.',
  },
}
