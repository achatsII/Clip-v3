import type { feedback as Fr } from '../fr/feedback'

/** Les retours des opérateurs. */
export const feedback: typeof Fr = {
  list: {
    search: 'Căutați o instrucțiune, un cuvânt, o persoană, un post',
    title: 'Reacțiile operatorilor',
    subtitle: 'Ce raportează producția: corectați pasul dintr-o atingere, iar operatorul vede noua versiune.',
    open: (n: number) => `Deschise${n ? ` (${n.toLocaleString('ro-RO')})` : ''}`,
    handled: 'Tratate',
    all: 'Toate',
    emptyOpenTitle: 'Nimic de tratat',
    emptyOpenDescription: 'Operatorii semnalează un pas neclar din player în două atingeri. Reacțiile lor vor apărea aici.',
    emptyHandledTitle: 'Nicio reacție tratată',
    emptyHandledDescription: 'Reacțiile pe care le tratați apar aici.',
    untitled: 'Instrucțiune',
    step: (n: number) => `pasul ${n.toLocaleString('ro-RO')}`,
    comment: (text: string) => `„${text}”`,
    operator: 'Operator',
    station: 'post',
    sources: { kiosk: 'tabletă', link: 'link', app: 'aplicație' },
    photo: 'Fotografie atașată',
    fix: 'Corectează',
    markHandled: 'Tratată',
    dismiss: 'Respinge',
    handledBy: (name: string) => `Tratată de ${name}`,
    dismissedBy: (name: string) => `Respinsă de ${name}`,
    markedHandled: 'Reacția a fost marcată ca tratată',
    dismissed: 'Reacția a fost respinsă',
    updateFailed: 'Reacția nu a fost actualizată',
  },
}
