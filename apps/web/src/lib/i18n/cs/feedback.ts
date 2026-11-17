import type { feedback as Fr } from '../fr/feedback'

/** Les retours des opérateurs. */
export const feedback: typeof Fr = {
  list: {
    search: 'Hledat instrukci, slovo, osobu, pracoviště',
    title: 'Zpětná vazba operátorů',
    subtitle: 'Co hlásí dílna: opravte krok jedním klepnutím a operátor uvidí novou verzi.',
    open: (n: number) => `Otevřené${n ? ` (${n.toLocaleString('cs-CZ')})` : ''}`,
    handled: 'Vyřízené',
    all: 'Vše',
    emptyOpenTitle: 'Nic k vyřízení',
    emptyOpenDescription: 'Operátoři mohou z přehrávače dvěma klepnutími nahlásit nejasný krok. Jejich zpětná vazba se zobrazí tady.',
    emptyHandledTitle: 'Žádná vyřízená zpětná vazba',
    emptyHandledDescription: 'Zpětná vazba, kterou vyřídíte, se zobrazí tady.',
    untitled: 'Instrukce',
    step: (n: number) => `krok ${n.toLocaleString('cs-CZ')}`,
    comment: (text: string) => `„${text}“`,
    operator: 'Operátor',
    station: 'pracoviště',
    sources: { kiosk: 'tablet', link: 'odkaz', app: 'aplikace' },
    photo: 'Přiložená fotka',
    fix: 'Opravit',
    markHandled: 'Vyřízeno',
    dismiss: 'Zamítnout',
    handledBy: (name: string) => `Vyřídil(a) ${name}`,
    dismissedBy: (name: string) => `Zamítl(a) ${name}`,
    markedHandled: 'Zpětná vazba označena jako vyřízená',
    dismissed: 'Zpětná vazba zamítnuta',
    updateFailed: 'Zpětnou vazbu se nepodařilo aktualizovat',
  },
}
