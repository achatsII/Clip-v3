import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `To approve: ${instruction}`,
    body: (who: string) => `${who} is asking for your approval.`,
  },
  changes: {
    title: (instruction: string) => `Changes requested: ${instruction}`,
    body: (who: string, text: string) => `${who} requests changes: “${text}”`,
  },
  published: {
    title: (instruction: string) => `Published: ${instruction}`,
    body: 'All signatures are in: the instruction is at the station.',
  },
  danger: {
    title: (station: string) => `Danger reported${station ? ` at ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `by ${who}` : '', text ? `“${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Deviation recorded${station ? ` at ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `by ${who}` : '', text].filter(Boolean).join(' · '),
  },
  test: {
    title: 'CLIP alerts test',
    body: 'Alerts are reaching you.',
  },
  open: 'Open in CLIP',
  footer: 'You receive this CLIP alert because your plant asked for it. You can stop it in CLIP, My account.',
}
