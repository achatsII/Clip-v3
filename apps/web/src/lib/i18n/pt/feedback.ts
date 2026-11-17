import type { feedback as Fr } from '../fr/feedback'

/** Os retornos dos operadores. */
export const feedback: typeof Fr = {
  list: {
    search: 'Buscar uma instrução, uma palavra, uma pessoa, um posto',
    title: 'Retornos dos operadores',
    subtitle: 'O que o chão de fábrica informa: corrija a etapa com um toque e o operador vê a nova versão.',
    open: (n: number) => `Abertos${n ? ` (${n.toLocaleString('pt-BR')})` : ''}`,
    handled: 'Tratados',
    all: 'Todos',
    emptyOpenTitle: 'Nada a tratar',
    emptyOpenDescription: 'Os operadores sinalizam uma etapa pouco clara pelo player em dois toques. Os retornos aparecerão aqui.',
    emptyHandledTitle: 'Nenhum retorno tratado',
    emptyHandledDescription: 'Os retornos que você tratar aparecerão aqui.',
    untitled: 'Instrução',
    step: (n: number) => `etapa ${n.toLocaleString('pt-BR')}`,
    comment: (text: string) => `“${text}”`,
    operator: 'Operador',
    station: 'posto',
    sources: { kiosk: 'tablet', link: 'link', app: 'app' },
    photo: 'Foto anexada',
    fix: 'Corrigir',
    markHandled: 'Tratado',
    dismiss: 'Descartar',
    handledBy: (name: string) => `Tratado por ${name}`,
    dismissedBy: (name: string) => `Descartado por ${name}`,
    markedHandled: 'Retorno marcado como tratado',
    dismissed: 'Retorno descartado',
    updateFailed: 'O retorno não foi atualizado',
  },
}
