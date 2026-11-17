import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `De aprobat: ${instruction}`,
    body: (who: string) => `${who} vă cere aprobarea.`,
  },
  changes: {
    title: (instruction: string) => `Modificări cerute: ${instruction}`,
    body: (who: string, text: string) => `${who} cere modificări: „${text}”`,
  },
  published: {
    title: (instruction: string) => `Publicată: ${instruction}`,
    body: 'Toate semnăturile sunt strânse: instrucțiunea este la post.',
  },
  danger: {
    title: (station: string) => `Pericol raportat${station ? ` la ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `de ${who}` : '', text ? `„${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Abatere înregistrată${station ? ` la ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `de ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} ar dori: ${what}`,
    body: (target: string) => (target ? `Vine cu ${target}. Totul se găsește în Abonament și credite.` : 'Totul se găsește în Abonament și credite.'),
  },
  test: {
    title: 'Test al alertelor CLIP',
    body: 'Alertele vă ajung.',
  },
  open: 'Deschide în CLIP',
  footer: 'Primiți această alertă CLIP pentru că fabrica dumneavoastră a cerut-o. O puteți opri în CLIP, Contul meu.',
}
