import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `Jóváhagyandó: ${instruction}`,
    body: (who: string) => `${who} jóváhagyást kér Öntől.`,
  },
  changes: {
    title: (instruction: string) => `Módosítást kértek: ${instruction}`,
    body: (who: string, text: string) => `${who} módosítást kér: „${text}”`,
  },
  published: {
    title: (instruction: string) => `Közzétéve: ${instruction}`,
    body: 'Minden aláírás megvan: az utasítás a munkaállomáson van.',
  },
  danger: {
    title: (station: string) => `Veszélyt jeleztek${station ? `: ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `${who} által` : '', text ? `„${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Eltérést rögzítettek${station ? `: ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `${who} által` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} szeretné: ${what}`,
    body: (target: string) => (target ? `Ezzel jár: ${target}. Minden az Előfizetés és kreditek oldalon található.` : 'Minden az Előfizetés és kreditek oldalon található.'),
  },
  test: {
    title: 'CLIP értesítések tesztje',
    body: 'Az értesítések megérkeznek Önhöz.',
  },
  open: 'Megnyitás: CLIP',
  footer: 'Azért kapja ezt a CLIP értesítést, mert az üzeme kérte. A CLIP Fiókom oldalán leállíthatja.',
}
