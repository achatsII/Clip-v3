import type { feedback as Fr } from '../fr/feedback'

// Rückmeldungen der Werker.
export const feedback: typeof Fr = {
  list: {
    search: 'Anweisung, Wort, Person oder Arbeitsplatz suchen',
    title: 'Rückmeldungen der Werker',
    subtitle: 'Was die Halle meldet: Beheben Sie den Schritt mit einem Tipp, und der Werker sieht die neue Version.',
    open: (n: number) => `Offen${n ? ` (${n.toLocaleString('de-DE')})` : ''}`,
    handled: 'Erledigt',
    all: 'Alle',
    emptyOpenTitle: 'Nichts zu bearbeiten',
    emptyOpenDescription: 'Werker melden einen unklaren Schritt im Player mit zwei Tipps. Ihre Rückmeldungen erscheinen hier.',
    emptyHandledTitle: 'Keine erledigten Rückmeldungen',
    emptyHandledDescription: 'Rückmeldungen, die Sie erledigen, erscheinen hier.',
    untitled: 'Anweisung',
    step: (n: number) => `Schritt ${n.toLocaleString('de-DE')}`,
    comment: (text: string) => `„${text}“`,
    operator: 'Werker',
    station: 'Arbeitsplatz',
    sources: { kiosk: 'Tablet', link: 'Link', app: 'App' },
    photo: 'Angehängtes Foto',
    fix: 'Beheben',
    markHandled: 'Erledigt',
    dismiss: 'Verwerfen',
    handledBy: (name: string) => `Erledigt von ${name}`,
    dismissedBy: (name: string) => `Verworfen von ${name}`,
    markedHandled: 'Rückmeldung als erledigt markiert',
    dismissed: 'Rückmeldung verworfen',
    updateFailed: 'Die Rückmeldung wurde nicht aktualisiert',
  },
}
