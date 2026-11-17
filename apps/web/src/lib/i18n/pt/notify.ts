import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `Para aprovar: ${instruction}`,
    body: (who: string) => `${who} está pedindo a sua aprovação.`,
  },
  changes: {
    title: (instruction: string) => `Alterações solicitadas: ${instruction}`,
    body: (who: string, text: string) => `${who} solicita alterações: “${text}”`,
  },
  published: {
    title: (instruction: string) => `Publicada: ${instruction}`,
    body: 'Todas as assinaturas foram feitas: a instrução está no posto.',
  },
  danger: {
    title: (station: string) => `Perigo informado${station ? ` em ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `por ${who}` : '', text ? `“${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Desvio registrado${station ? ` em ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `por ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} gostaria de: ${what}`,
    body: (target: string) => (target ? `Está incluído em ${target}. Tudo fica em Assinatura e créditos.` : 'Tudo fica em Assinatura e créditos.'),
  },
  test: {
    title: 'Teste de alertas do CLIP',
    body: 'Os alertas estão chegando até você.',
  },
  open: 'Abrir no CLIP',
  footer: 'Você recebe este alerta do CLIP porque a sua fábrica pediu. Você pode desativá-lo no CLIP, em Minha conta.',
}
