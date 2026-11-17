import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('ro-RO')
const de = (n: number) => (new Intl.PluralRules('ro-RO').select(n) === 'other' ? 'de ' : '')
const plural = (n: number, one: string, many: string) => (n === 1 ? one : `${de(n)}${many}`)

export const blocks: typeof Fr = {
  make: 'Creați un bloc comun',
  insert: 'Inserați un bloc comun',
  makeIntro: 'Pașii aleși devin un bloc: scris o singură dată, este refolosit în alte instrucțiuni și actualizat peste tot.',
  name: 'Numele blocului',
  namePlaceholder: 'Blocarea presei P-12',
  pick: 'Pașii blocului',
  makeConfirm: 'Creează blocul',
  made: (title: string) => `Blocul „${title}” a fost creat`,
  madeHint: 'Pașii lui se editează acum în bloc.',
  makeFailed: 'Blocul nu a fost creat',
  search: 'Căutați un bloc',
  empty: 'Încă niciun bloc comun',
  emptyHint: 'Creați unul din pașii unei instrucțiuni (meniul „…”).',
  already: 'Deja în această instrucțiune',
  inserted: (title: string) => `Blocul „${title}” a fost inserat`,
  insertFailed: 'Blocul nu a fost inserat',
  steps: (n: number) => `${num(n)} ${plural(n, 'pas', 'pași')}`,
  stepNotice: (title: string, version: number) => `Pas din blocul comun „${title}” (v${num(version)}): se editează în bloc, peste tot odată.`,
  more: 'Mai multe acțiuni pentru bloc',
  open: 'Deschide blocul',
  detach: 'Detașează',
  detachConfirm: { title: 'Detașați acești pași de bloc?', description: 'Devin pașii proprii ai acestei instrucțiuni: îi puteți edita aici, dar nu mai urmează blocul.', confirm: 'Detașează' },
  remove: 'Elimină blocul',
  removeConfirm: { title: 'Eliminați blocul din această instrucțiune?', description: 'Pașii lui ies din această instrucțiune; blocul rămâne pentru celelalte.', confirm: 'Elimină' },
  thumb: 'Bloc',
  chip: 'Bloc comun',
  editing: (n: number) => (n ? `Bloc comun folosit în ${num(n)} ${plural(n, 'instrucțiune', 'instrucțiuni')}: publicarea le actualizează.` : 'Bloc comun: nu se află încă în nicio instrucțiune. Inserați-l dintr-o instrucțiune, meniul „…”.'),
  info: 'Titlu și detalii',
  infoOpen: 'Editați titlul și detaliile',
  infoTitle: 'Detaliile blocului',
  summaryPlaceholder: 'La ce folosește acest bloc, într-o propoziție',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Iese din lista de blocuri. Versiunile lui se păstrează.'
      : n === 1
        ? 'Instrucțiunea care îl folosește își păstrează pașii așa cum sunt; pentru a-i schimba, detașați-i acolo.'
        : `Cele ${num(n)} instrucțiuni care îl folosesc își păstrează pașii așa cum sunt; pentru a-i schimba, detașați-i în fiecare.`,
  archived: 'Bloc arhivat',
  publishImpact: (n: number) => (n ? `Publicarea actualizează ${num(n)} ${plural(n, 'instrucțiune', 'instrucțiuni')}: cele la zi se republică, celelalte primesc blocul în ciornă.` : 'Nicio instrucțiune nu îl folosește încă: inserați-l într-o instrucțiune, meniul „…”.'),
  propagating: (done: number, total: number) => `Se actualizează instrucțiunile… ${num(done)} din ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} ${plural(republished, 'instrucțiune republicată', 'instrucțiuni republicate')}` : '', drafts ? `${num(drafts)} ${plural(drafts, 'ciornă actualizată', 'ciorne actualizate')}` : ''].filter(Boolean).join(' · ') || 'Nicio instrucțiune de actualizat',
  propagateFailed: (n: number) => `${num(n)} ${plural(n, 'instrucțiune nu a fost actualizată', 'instrucțiuni nu au fost actualizate')}: publicați din nou blocul pentru a reîncerca.`,
  filter: 'Blocuri comune',
  newBlock: 'Bloc nou',
  newTitle: 'Bloc comun nou',
  total: (n: number) => (n > 1 ? `${num(n)} ${de(n)}blocuri comune` : n === 1 ? '1 bloc comun' : 'Niciun bloc comun'),
  emptyList: 'Pașii care revin peste tot (blocare, pornire, EPI): scriși o singură dată, la zi în fiecare instrucțiune. Creați unul aici sau din pașii unei instrucțiuni (meniul „…”).',
  changelog: (title: string, version: number) => `Blocul comun „${title}” v${num(version)}.`,
  errors: {
    noSteps: 'Alegeți cel puțin un pas.',
    locked: (title: string) => `Acest pas provine din blocul comun „${title}”: se editează în bloc.`,
  },
}
