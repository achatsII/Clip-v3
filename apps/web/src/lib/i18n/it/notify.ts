import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `Da approvare: ${instruction}`,
    body: (who: string) => `${who} chiede la tua approvazione.`,
  },
  changes: {
    title: (instruction: string) => `Modifiche richieste: ${instruction}`,
    body: (who: string, text: string) => `${who} chiede delle modifiche: “${text}”`,
  },
  published: {
    title: (instruction: string) => `Pubblicata: ${instruction}`,
    body: 'Tutte le firme sono arrivate: l’istruzione è in postazione.',
  },
  danger: {
    title: (station: string) => `Pericolo segnalato${station ? ` in ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `da ${who}` : '', text ? `“${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Scostamento registrato${station ? ` in ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `da ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} vorrebbe: ${what}`,
    body: (target: string) => (target ? `È incluso in ${target}. Tutto si trova in Abbonamento e crediti.` : 'Tutto si trova in Abbonamento e crediti.'),
  },
  test: {
    title: 'Test degli avvisi di CLIP',
    body: 'Gli avvisi ti stanno arrivando.',
  },
  open: 'Apri in CLIP',
  footer: 'Ricevi questo avviso di CLIP perché il tuo stabilimento lo ha richiesto. Puoi disattivarlo in CLIP, nel tuo account.',
}
