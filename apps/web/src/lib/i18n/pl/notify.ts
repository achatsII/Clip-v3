import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `Do zatwierdzenia: ${instruction}`,
    body: (who: string) => `${who} prosi o Twoje zatwierdzenie.`,
  },
  changes: {
    title: (instruction: string) => `Poproszono o zmiany: ${instruction}`,
    body: (who: string, text: string) => `${who} prosi o zmiany: „${text}”`,
  },
  published: {
    title: (instruction: string) => `Opublikowano: ${instruction}`,
    body: 'Wszystkie podpisy złożone: instrukcja jest na stanowisku.',
  },
  danger: {
    title: (station: string) => `Zgłoszono zagrożenie${station ? ` na stanowisku ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `od: ${who}` : '', text ? `„${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Zapisano odchylenie${station ? ` na stanowisku ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `od: ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} chce: ${what}`,
    body: (target: string) => (target ? `Wchodzi w skład: ${target}. Wszystko znajdziesz w Subskrypcji i kredytach.` : 'Wszystko znajdziesz w Subskrypcji i kredytach.'),
  },
  test: {
    title: 'Test alertów CLIP',
    body: 'Alerty do Ciebie docierają.',
  },
  open: 'Otwórz w CLIP',
  footer: 'Otrzymujesz ten alert CLIP, ponieważ Twój zakład o to poprosił. Możesz go wyłączyć w CLIP, w sekcji Moje konto.',
}
