import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `Freizugeben: ${instruction}`,
    body: (who: string) => `${who} bittet um Ihre Freigabe.`,
  },
  changes: {
    title: (instruction: string) => `Änderungen angefordert: ${instruction}`,
    body: (who: string, text: string) => `${who} fordert Änderungen an: „${text}“`,
  },
  published: {
    title: (instruction: string) => `Veröffentlicht: ${instruction}`,
    body: 'Alle Unterschriften liegen vor: Die Anweisung ist am Arbeitsplatz.',
  },
  danger: {
    title: (station: string) => `Gefahr gemeldet${station ? ` an ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `von ${who}` : '', text ? `„${text}“` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Abweichung erfasst${station ? ` an ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `von ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} wünscht: ${what}`,
    body: (target: string) => (target ? `Enthalten in ${target}. Alles finden Sie unter Abonnement und Credits.` : 'Alles finden Sie unter Abonnement und Credits.'),
  },
  test: {
    title: 'Test der CLIP-Benachrichtigungen',
    body: 'Die Benachrichtigungen erreichen Sie.',
  },
  open: 'In CLIP öffnen',
  footer: 'Sie erhalten diese CLIP-Benachrichtigung, weil Ihr Werk sie eingerichtet hat. Sie können sie in CLIP unter „Mein Konto“ abbestellen.',
}
