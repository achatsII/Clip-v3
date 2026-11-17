import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `Ke schválení: ${instruction}`,
    body: (who: string) => `${who} vás žádá o schválení.`,
  },
  changes: {
    title: (instruction: string) => `Vyžádané změny: ${instruction}`,
    body: (who: string, text: string) => `${who} požaduje změny: „${text}“`,
  },
  published: {
    title: (instruction: string) => `Publikováno: ${instruction}`,
    body: 'Všechny podpisy jsou hotové: instrukce je na pracovišti.',
  },
  danger: {
    title: (station: string) => `Nahlášené nebezpečí${station ? `: ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `od ${who}` : '', text ? `„${text}“` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Zaznamenaná odchylka${station ? `: ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `od ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} by chtěl(a): ${what}`,
    body: (target: string) => (target ? `Je součástí: ${target}. Vše najdete v části Předplatné a kredity.` : 'Vše najdete v části Předplatné a kredity.'),
  },
  test: {
    title: 'Test oznámení CLIP',
    body: 'Oznámení vám docházejí.',
  },
  open: 'Otevřít v CLIP',
  footer: 'Toto oznámení CLIP dostáváte, protože si ho váš závod vyžádal. Můžete ho vypnout v CLIP, Můj účet.',
}
