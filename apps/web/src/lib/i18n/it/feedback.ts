import type { feedback as Fr } from '../fr/feedback'

/** I riscontri degli operatori. */
export const feedback: typeof Fr = {
  list: {
    search: 'Cerca un’istruzione, una parola, una persona, una postazione',
    title: 'Riscontri degli operatori',
    subtitle: 'Ciò che segnala il reparto: correggi il passaggio con un tocco e l’operatore vede la nuova versione.',
    open: (n: number) => `Aperti${n ? ` (${n.toLocaleString('it-IT')})` : ''}`,
    handled: 'Gestiti',
    all: 'Tutti',
    emptyOpenTitle: 'Niente da gestire',
    emptyOpenDescription: 'Gli operatori segnalano un passaggio poco chiaro dal lettore con due tocchi. I loro riscontri arriveranno qui.',
    emptyHandledTitle: 'Nessun riscontro gestito',
    emptyHandledDescription: 'I riscontri che gestisci compaiono qui.',
    untitled: 'Istruzione',
    step: (n: number) => `passaggio ${n.toLocaleString('it-IT')}`,
    comment: (text: string) => `“${text}”`,
    operator: 'Operatore',
    station: 'postazione',
    sources: { kiosk: 'tablet', link: 'link', app: 'app' },
    photo: 'Foto allegata',
    fix: 'Correggi',
    markHandled: 'Gestito',
    dismiss: 'Scarta',
    handledBy: (name: string) => `Gestito da ${name}`,
    dismissedBy: (name: string) => `Scartato da ${name}`,
    markedHandled: 'Riscontro segnato come gestito',
    dismissed: 'Riscontro scartato',
    updateFailed: 'Il riscontro non è stato aggiornato',
  },
}
