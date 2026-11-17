import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('pt-BR')
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export const blocks: typeof Fr = {
  make: 'Criar um bloco compartilhado',
  insert: 'Inserir um bloco compartilhado',
  makeIntro: 'As etapas escolhidas viram um bloco: escrito uma vez, ele é reutilizado em outras instruções e atualizado em todas.',
  name: 'Nome do bloco',
  namePlaceholder: 'Bloquear a prensa P-12',
  pick: 'As etapas do bloco',
  makeConfirm: 'Criar o bloco',
  made: (title: string) => `Bloco “${title}” criado`,
  madeHint: 'As etapas dele agora são editadas no bloco.',
  makeFailed: 'O bloco não foi criado',
  search: 'Buscar um bloco',
  empty: 'Nenhum bloco compartilhado ainda',
  emptyHint: 'Crie um a partir das etapas de uma instrução (menu “…”).',
  already: 'Já está nesta instrução',
  inserted: (title: string) => `Bloco “${title}” inserido`,
  insertFailed: 'O bloco não foi inserido',
  steps: (n: number) => `${num(n)} ${plural(n, 'etapa', 'etapas')}`,
  stepNotice: (title: string, version: number) => `Etapa do bloco compartilhado “${title}” (v${num(version)}): ela é editada no bloco, em todos os lugares de uma vez.`,
  more: 'Mais ações do bloco',
  open: 'Abrir o bloco',
  detach: 'Desvincular',
  detachConfirm: { title: 'Desvincular estas etapas do bloco?', description: 'Elas passam a ser etapas próprias desta instrução: você pode editá-las aqui, mas elas deixam de acompanhar o bloco.', confirm: 'Desvincular' },
  remove: 'Remover o bloco',
  removeConfirm: { title: 'Remover o bloco desta instrução?', description: 'As etapas dele saem desta instrução; o bloco continua nas outras.', confirm: 'Remover' },
  thumb: 'Bloco',
  chip: 'Bloco compartilhado',
  editing: (n: number) => (n ? `Bloco compartilhado usado em ${num(n)} ${plural(n, 'instrução', 'instruções')}: publicá-lo atualiza todas.` : 'Bloco compartilhado: ainda não está em nenhuma instrução. Insira-o a partir de uma instrução, menu “…”.'),
  info: 'Título e detalhes',
  infoOpen: 'Editar o título e os detalhes',
  infoTitle: 'Detalhes do bloco',
  summaryPlaceholder: 'Para que serve este bloco, em uma frase',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Ele sai da lista de blocos. As versões dele são mantidas.'
      : n === 1
        ? 'A instrução que o usa mantém as etapas como estão; para alterá-las, desvincule-as lá.'
        : `As ${num(n)} instruções que o usam mantêm as etapas como estão; para alterá-las, desvincule-as em cada uma.`,
  archived: 'Bloco arquivado',
  publishImpact: (n: number) => (n ? `Publicar atualiza ${num(n)} ${plural(n, 'instrução', 'instruções')}: as que estão em dia são republicadas, as outras recebem o bloco no rascunho.` : 'Nenhuma instrução o usa ainda: insira-o em uma instrução, menu “…”.'),
  propagating: (done: number, total: number) => `Atualizando as instruções… ${num(done)} de ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} ${plural(republished, 'instrução republicada', 'instruções republicadas')}` : '', drafts ? `${num(drafts)} ${plural(drafts, 'rascunho atualizado', 'rascunhos atualizados')}` : ''].filter(Boolean).join(' · ') || 'Nenhuma instrução a atualizar',
  propagateFailed: (n: number) => `${num(n)} ${plural(n, 'instrução não foi atualizada', 'instruções não foram atualizadas')}: publique o bloco novamente para tentar de novo.`,
  filter: 'Blocos compartilhados',
  newBlock: 'Novo bloco',
  newTitle: 'Novo bloco compartilhado',
  total: (n: number) => (n > 1 ? `${num(n)} blocos compartilhados` : n === 1 ? '1 bloco compartilhado' : 'Nenhum bloco compartilhado'),
  emptyList: 'As etapas que se repetem em toda parte (bloqueio, partida, EPI): escritas uma vez, atualizadas em todas as instruções. Crie um aqui ou a partir das etapas de uma instrução (menu “…”).',
  changelog: (title: string, version: number) => `Bloco compartilhado “${title}” v${num(version)}.`,
  errors: {
    noSteps: 'Escolha pelo menos uma etapa.',
    locked: (title: string) => `Esta etapa vem do bloco compartilhado “${title}”: ela é editada no bloco.`,
  },
}
