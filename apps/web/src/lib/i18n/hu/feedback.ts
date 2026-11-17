import type { feedback as Fr } from '../fr/feedback'

/** Az operátorok visszajelzései. */
export const feedback: typeof Fr = {
  list: {
    search: 'Utasítás, szó, személy vagy munkaállomás keresése',
    title: 'Operátori visszajelzések',
    subtitle: 'Amit a műhely jelez: javítsa a lépést egy érintéssel, és az operátor látja az új verziót.',
    open: (n: number) => `Nyitott${n ? ` (${n.toLocaleString('hu-HU')})` : ''}`,
    handled: 'Kezelt',
    all: 'Mind',
    emptyOpenTitle: 'Nincs teendő',
    emptyOpenDescription: 'Az operátorok két érintéssel jelezhetik a nem érthető lépést a lejátszóból. A visszajelzéseik itt jelennek meg.',
    emptyHandledTitle: 'Nincs kezelt visszajelzés',
    emptyHandledDescription: 'A kezelt visszajelzések itt jelennek meg.',
    untitled: 'Utasítás',
    step: (n: number) => `${n.toLocaleString('hu-HU')}. lépés`,
    comment: (text: string) => `„${text}”`,
    operator: 'Operátor',
    station: 'munkaállomás',
    sources: { kiosk: 'táblagép', link: 'hivatkozás', app: 'alkalmazás' },
    photo: 'Csatolt fotó',
    fix: 'Javítás',
    markHandled: 'Kezelve',
    dismiss: 'Elvetés',
    handledBy: (name: string) => `Kezelte: ${name}`,
    dismissedBy: (name: string) => `Elvetette: ${name}`,
    markedHandled: 'A visszajelzés kezeltnek jelölve',
    dismissed: 'A visszajelzés elvetve',
    updateFailed: 'A visszajelzés nem frissült',
  },
}
