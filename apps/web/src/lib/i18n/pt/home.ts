import type { home as Fr } from '../fr/home'

/** O início. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Olá, ${name}`,
    morning: (name: string) => `Bom dia, ${name}`,
    afternoon: (name: string) => `Boa tarde, ${name}`,
    evening: (name: string) => `Boa noite, ${name}`,
  },
  hero: {
    eyebrow: 'Nova instrução',
    line1: 'Filme. Fale.',
    line2: 'A IA redige.',
    video: 'Vídeo',
    voiceNote: 'Nota de voz',
    document: 'PDF ou Word',
  },
  reader: {
    find: 'Encontrar uma instrução',
    myStations: 'Meus postos',
  },
  setup: {
    title: 'Coloque sua fábrica em funcionamento',
    hint: 'Alguns minutos, uma etapa de cada vez.',
    publish: 'Publicar uma primeira instrução',
    station: 'Criar um posto e o seu QR code',
    logo: 'Adicionar o logotipo da fábrica',
    invite: 'Convidar um colega',
    standard: 'Ajustar o seu padrão de redação',
    hide: 'Ocultar a configuração',
    hideShort: 'Ocultar',
    show: 'Mostrar',
    compact: (done: number, total: number) => `Configuração: ${done} de ${total}`,
  },
  tiles: {
    published: 'Publicadas',
    coverage: (percent: number) => `${percent.toLocaleString('pt-BR')}% dos postos cobertos`,
    noStation: 'Nenhum posto ainda',
    views: 'Visualizações · 7 dias',
    viewsHint: 'Tablets, QR codes e links',
    stations: 'Postos',
    stationsHint: 'Com as suas instruções',
    streak: 'Sequência',
    streakWeeks: (weeks: number) => `${weeks !== 1 ? 'semanas seguidas' : 'semana seguida'} com algo publicado`,
    streakStart: 'Publique nesta semana para iniciar a sua sequência',
  },
  renewal: {
    title: (count: number) => `Para revisar (${count.toLocaleString('pt-BR')})`,
    hint: 'Estão chegando à data de revisão. Nada mudou? Confirme com um toque.',
  },
  review: {
    title: (count: number) => `Para aprovar (${count.toLocaleString('pt-BR')})`,
    hint: 'As etapas alteradas são marcadas no editor.',
  },
  feedback: {
    title: 'Retornos dos operadores',
    seeAll: 'Ver todos',
    quote: (comment: string) => `“${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Etapa ${step.toLocaleString('pt-BR')} · ${ago}`),
    none: 'Nenhum retorno novo.',
  },
  drafts: { title: 'Continue de onde parou', hint: 'Seus rascunhos em andamento' },
  forYou: { title: 'Para você', hint: 'Com base nas suas responsabilidades' },
  library: {
    count: (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'instrução publicada' : 'instruções publicadas'}`,
    hint: 'Seu chão de fábrica tem uma biblioteca viva. Mantenha-a atualizada com os retornos dos operadores.',
  },
}
