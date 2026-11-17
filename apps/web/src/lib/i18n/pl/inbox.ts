import type { inbox as Fr } from '../fr/inbox'

const num = (n: number) => n.toLocaleString('pl-PL')

export const inbox: typeof Fr = {
  title: 'Do zobaczenia',
  open: (n: number) => (n ? `Do zobaczenia: ${num(n)} nowe` : 'Do zobaczenia'),
  empty: 'Na razie nic do zobaczenia',
  emptyHint: 'Zatwierdzenia do wykonania, zgłoszone zagrożenia i zapisane odchylenia pojawią się tutaj.',
  kinds: {
    review: 'Do zatwierdzenia',
    changes: 'Poproszono o zmiany',
    danger: 'Zgłoszono zagrożenie',
    deviation: 'Zapisano odchylenie',
    request: 'Zgłoszona prośba',
    requalify: 'Do ponownej walidacji',
    lateTraining: 'Zaległe szkolenie',
  },
  by: (name: string) => `od: ${name}`,
  comesWith: (name: string) => `Z: ${name}`,
  isNew: 'Nowe',
}
