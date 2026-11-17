import type { feedback as Fr } from '../fr/feedback'

/** De terugmeldingen van operators. */
export const feedback: typeof Fr = {
  list: {
    search: 'Zoek een instructie, een woord, een persoon, een station',
    title: 'Terugmeldingen van operators',
    subtitle: 'Wat de werkvloer meldt: pas de stap met één tik aan en de operator ziet de nieuwe versie.',
    open: (n: number) => `Open${n ? ` (${n.toLocaleString('nl-NL')})` : ''}`,
    handled: 'Afgehandeld',
    all: 'Alle',
    emptyOpenTitle: 'Niets af te handelen',
    emptyOpenDescription: 'Operators melden een onduidelijke stap vanuit de speler met twee tikken. Hun terugmeldingen komen hier binnen.',
    emptyHandledTitle: 'Geen afgehandelde terugmeldingen',
    emptyHandledDescription: 'Terugmeldingen die je afhandelt, verschijnen hier.',
    untitled: 'Instructie',
    step: (n: number) => `stap ${n.toLocaleString('nl-NL')}`,
    comment: (text: string) => `“${text}”`,
    operator: 'Operator',
    station: 'station',
    sources: { kiosk: 'tablet', link: 'link', app: 'app' },
    photo: 'Bijgevoegde foto',
    fix: 'Aanpassen',
    markHandled: 'Afgehandeld',
    dismiss: 'Negeren',
    handledBy: (name: string) => `Afgehandeld door ${name}`,
    dismissedBy: (name: string) => `Genegeerd door ${name}`,
    markedHandled: 'Terugmelding gemarkeerd als afgehandeld',
    dismissed: 'Terugmelding genegeerd',
    updateFailed: 'De terugmelding is niet bijgewerkt',
  },
}
