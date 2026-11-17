import type { feedback as Fr } from '../fr/feedback'

/** Les retours des opérateurs. */
export const feedback: typeof Fr = {
  list: {
    search: 'Szukaj instrukcji, słowa, osoby, stanowiska',
    title: 'Opinie operatorów',
    subtitle: 'To, co zgłasza hala: popraw krok jednym dotknięciem, a operator zobaczy nową wersję.',
    open: (n: number) => `Otwarte${n ? ` (${n.toLocaleString('pl-PL')})` : ''}`,
    handled: 'Załatwione',
    all: 'Wszystkie',
    emptyOpenTitle: 'Nic do załatwienia',
    emptyOpenDescription: 'Operatorzy zgłaszają niejasny krok z odtwarzacza w dwóch dotknięciach. Ich opinie pojawią się tutaj.',
    emptyHandledTitle: 'Brak załatwionych opinii',
    emptyHandledDescription: 'Opinie, które załatwisz, pojawią się tutaj.',
    untitled: 'Instrukcja',
    step: (n: number) => `krok ${n.toLocaleString('pl-PL')}`,
    comment: (text: string) => `„${text}”`,
    operator: 'Operator',
    station: 'stanowisko',
    sources: { kiosk: 'tablet', link: 'link', app: 'aplikacja' },
    photo: 'Dołączone zdjęcie',
    fix: 'Popraw',
    markHandled: 'Załatwione',
    dismiss: 'Odrzuć',
    handledBy: (name: string) => `Załatwił(a): ${name}`,
    dismissedBy: (name: string) => `Odrzucił(a): ${name}`,
    markedHandled: 'Opinia oznaczona jako załatwiona',
    dismissed: 'Opinia odrzucona',
    updateFailed: 'Nie zaktualizowano opinii',
  },
}
