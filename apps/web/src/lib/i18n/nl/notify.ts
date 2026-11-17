import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `Goed te keuren: ${instruction}`,
    body: (who: string) => `${who} vraagt om je goedkeuring.`,
  },
  changes: {
    title: (instruction: string) => `Wijzigingen gevraagd: ${instruction}`,
    body: (who: string, text: string) => `${who} vraagt wijzigingen: “${text}”`,
  },
  published: {
    title: (instruction: string) => `Gepubliceerd: ${instruction}`,
    body: 'Alle handtekeningen zijn binnen: de instructie staat op het station.',
  },
  danger: {
    title: (station: string) => `Gevaar gemeld${station ? ` bij ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `door ${who}` : '', text ? `“${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Afwijking vastgelegd${station ? ` bij ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `door ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} wil graag: ${what}`,
    body: (target: string) => (target ? `Het hoort bij ${target}. Alles staat onder Abonnement en credits.` : 'Alles staat onder Abonnement en credits.'),
  },
  test: {
    title: 'Test van de CLIP-meldingen',
    body: 'De meldingen komen bij je aan.',
  },
  open: 'Openen in CLIP',
  footer: 'Je ontvangt deze CLIP-melding omdat je fabriek erom heeft gevraagd. Je kunt ze stoppen in CLIP, Mijn account.',
}
