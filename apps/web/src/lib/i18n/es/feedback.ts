import type { feedback as Fr } from '../fr/feedback'

/** Los comentarios de los operadores. */
export const feedback: typeof Fr = {
  list: {
    search: 'Busca una instrucción, una palabra, una persona, un puesto',
    title: 'Comentarios de los operadores',
    subtitle: 'Lo que reporta el piso: corrige el paso con un toque y el operador verá la nueva versión.',
    open: (n: number) => `Abiertos${n ? ` (${n.toLocaleString('es-MX')})` : ''}`,
    handled: 'Atendidos',
    all: 'Todos',
    emptyOpenTitle: 'Nada que atender',
    emptyOpenDescription: 'Los operadores señalan un paso poco claro desde el lector en dos toques. Sus comentarios llegarán aquí.',
    emptyHandledTitle: 'Sin comentarios atendidos',
    emptyHandledDescription: 'Los comentarios que atiendas aparecerán aquí.',
    untitled: 'Instrucción',
    step: (n: number) => `paso ${n.toLocaleString('es-MX')}`,
    comment: (text: string) => `«${text}»`,
    operator: 'Operador',
    station: 'puesto',
    sources: { kiosk: 'tableta', link: 'enlace', app: 'app' },
    photo: 'Foto adjunta',
    fix: 'Corregir',
    markHandled: 'Atendido',
    dismiss: 'Descartar',
    handledBy: (name: string) => `Atendido por ${name}`,
    dismissedBy: (name: string) => `Descartado por ${name}`,
    markedHandled: 'Comentario marcado como atendido',
    dismissed: 'Comentario descartado',
    updateFailed: 'No se actualizó el comentario',
  },
}
