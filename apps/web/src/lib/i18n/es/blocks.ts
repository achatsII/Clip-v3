import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('es-MX')
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export const blocks: typeof Fr = {
  make: 'Crear un bloque compartido',
  insert: 'Insertar un bloque compartido',
  makeIntro: 'Los pasos elegidos se convierten en un bloque: se redacta una vez, se reutiliza en otras instrucciones y se actualiza en todas partes.',
  name: 'Nombre del bloque',
  namePlaceholder: 'Bloqueo de la prensa P-12',
  pick: 'Los pasos del bloque',
  makeConfirm: 'Crear el bloque',
  made: (title: string) => `Bloque «${title}» creado`,
  madeHint: 'Sus pasos ahora se editan en el bloque.',
  makeFailed: 'No se creó el bloque',
  search: 'Buscar un bloque',
  empty: 'Aún no hay ningún bloque compartido',
  emptyHint: 'Crea uno a partir de los pasos de una instrucción (menú «…»).',
  already: 'Ya está en esta instrucción',
  inserted: (title: string) => `Bloque «${title}» insertado`,
  insertFailed: 'No se insertó el bloque',
  steps: (n: number) => `${num(n)} ${plural(n, 'paso', 'pasos')}`,
  stepNotice: (title: string, version: number) => `Paso del bloque compartido «${title}» (v${num(version)}): se edita en el bloque, en todas partes a la vez.`,
  more: 'Más acciones del bloque',
  open: 'Abrir el bloque',
  detach: 'Desvincular',
  detachConfirm: { title: '¿Desvincular estos pasos del bloque?', description: 'Pasan a ser pasos propios de esta instrucción: puedes editarlos aquí, pero ya no siguen al bloque.', confirm: 'Desvincular' },
  remove: 'Quitar el bloque',
  removeConfirm: { title: '¿Quitar el bloque de esta instrucción?', description: 'Sus pasos salen de esta instrucción; el bloque se queda para las demás.', confirm: 'Quitar' },
  thumb: 'Bloque',
  chip: 'Bloque compartido',
  editing: (n: number) => (n ? `Bloque compartido usado en ${num(n)} ${plural(n, 'instrucción', 'instrucciones')}: al publicarlo se actualizan.` : 'Bloque compartido: todavía no está en ninguna instrucción. Insértalo desde una instrucción, menú «…».'),
  info: 'Título y detalles',
  infoOpen: 'Editar el título y los detalles',
  infoTitle: 'Detalles del bloque',
  summaryPlaceholder: 'Para qué sirve este bloque, en una frase',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Sale de la lista de bloques. Sus versiones se conservan.'
      : n === 1
        ? 'La instrucción que lo usa conserva sus pasos tal como están; para cambiarlos, desvincúlalos allí.'
        : `Las ${num(n)} instrucciones que lo usan conservan sus pasos tal como están; para cambiarlos, desvincúlalos en cada una.`,
  archived: 'Bloque archivado',
  publishImpact: (n: number) => (n ? `Al publicar se actualizan ${num(n)} ${plural(n, 'instrucción', 'instrucciones')}: las que están al día se vuelven a publicar y las demás reciben el bloque en su borrador.` : 'Ninguna instrucción lo usa todavía: insértalo en una instrucción, menú «…».'),
  propagating: (done: number, total: number) => `Actualizando instrucciones… ${num(done)} de ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} ${plural(republished, 'instrucción vuelta a publicar', 'instrucciones vueltas a publicar')}` : '', drafts ? `${num(drafts)} ${plural(drafts, 'borrador actualizado', 'borradores actualizados')}` : ''].filter(Boolean).join(' · ') || 'Ninguna instrucción por actualizar',
  propagateFailed: (n: number) => `${num(n)} ${plural(n, 'instrucción no se actualizó', 'instrucciones no se actualizaron')}: vuelve a publicar el bloque para reintentar.`,
  filter: 'Bloques compartidos',
  newBlock: 'Nuevo bloque',
  newTitle: 'Nuevo bloque compartido',
  total: (n: number) => (n > 1 ? `${num(n)} bloques compartidos` : n === 1 ? '1 bloque compartido' : 'Ningún bloque compartido'),
  emptyList: 'Los pasos que se repiten en todas partes (bloqueo, arranque, EPP): se redactan una vez y están al día en cada instrucción. Crea uno aquí o a partir de los pasos de una instrucción (menú «…»).',
  changelog: (title: string, version: number) => `Bloque compartido «${title}» v${num(version)}.`,
  errors: {
    noSteps: 'Elige al menos un paso.',
    locked: (title: string) => `Este paso viene del bloque compartido «${title}»: se edita en el bloque.`,
  },
}
