import type { stats as Fr } from '../fr/stats'

/** Um número inteiro do relatório impresso. */
const whole = (n: number) => Math.round(n).toLocaleString('pt-BR')

/** As estatísticas e o relatório para a diretoria. */
export const stats: typeof Fr = {
  page: {
    title: 'Estatísticas',
    subtitle: (days: number) => `Os últimos ${days.toLocaleString('pt-BR')} dias: o que é visto no chão de fábrica, o que é informado, o que isso economiza para você.`,
    views: 'Visualizações',
    viewsHint: (kiosk: number, link: number, app: number) => `Tablets ${kiosk.toLocaleString('pt-BR')} · links ${link.toLocaleString('pt-BR')} · app ${app.toLocaleString('pt-BR')}`,
    completions: 'Execuções concluídas',
    completionsHint: (rate: number) => `${rate.toLocaleString('pt-BR')}% das visualizações vão até o fim`,
    feedback: 'Retornos',
    feedbackHint: (done: number) => `${done.toLocaleString('pt-BR')} ${done !== 1 ? 'tratados' : 'tratado'}`,
    value: 'Valor estimado',
    money: (n: number) => `$${n.toLocaleString('pt-BR')}`,
    valueLocked: 'O retorno sobre o investimento vem com um plano superior',
    valueHint: (hours: number) => `${hours.toLocaleString('pt-BR')} h economizadas · toque para ver as suas premissas`,
    chartTitle: 'Visualizações por dia',
    chartUnit: 'visualizações',
    top: 'Mais vistas',
    topEmpty: 'As visualizações aparecerão assim que os operadores abrirem as instruções (tablet, QR code, link).',
    watch: 'Vale uma olhada mais de perto',
    unseen: (n: number) =>
      n !== 1
        ? `${n.toLocaleString('pt-BR')} instruções publicadas nunca foram vistas: estão no posto certo?`
        : `${n.toLocaleString('pt-BR')} instrução publicada nunca foi vista: está no posto certo?`,
    allSeen: 'Todas as instruções publicadas foram vistas.',
    openFeedback: (n: number) => `${n.toLocaleString('pt-BR')} ${n !== 1 ? 'retornos' : 'retorno'} para tratar.`,
    aiUse: (generations: number, imports: number) =>
      `${generations.toLocaleString('pt-BR')} ${generations !== 1 ? 'gerações' : 'geração'} e ${imports.toLocaleString('pt-BR')} ${imports !== 1 ? 'importações' : 'importação'} pela IA neste mês.`,
    medianDuration: (minutes: number) => `A execução mediana leva ${minutes.toLocaleString('pt-BR')} min.`,
  },
  roi: {
    title: 'Como o valor é calculado',
    intro: 'Uma estimativa transparente, baseada nas suas premissas: o tempo economizado na redação de cada instrução criada e o tempo economizado em cada execução guiada (menos dúvidas, menos erros).',
    hoursPerInstruction: 'Horas economizadas por instrução',
    minutesPerCompletion: 'Minutos por execução',
    hourlyRate: 'Valor da hora ($)',
    save: 'Salvar as minhas premissas',
    formula: (f) =>
      `${f.created.toLocaleString('pt-BR')} ${f.created !== 1 ? 'instruções' : 'instrução'} × ${f.hoursPerInstruction.toLocaleString('pt-BR')} h + ${f.completions.toLocaleString('pt-BR')} ${f.completions !== 1 ? 'execuções' : 'execução'} × ${f.minutesPerCompletion.toLocaleString('pt-BR')} min = ${f.hours.toLocaleString('pt-BR')} h × $${f.hourlyRate.toLocaleString('pt-BR')} = $${f.value.toLocaleString('pt-BR')}`,
  },
  chart: {
    total: (total: number, unit: string, days: number) => `${total.toLocaleString('pt-BR')} ${unit} em ${days.toLocaleString('pt-BR')} ${days !== 1 ? 'dias' : 'dia'}`,
    showChart: 'Mostrar o gráfico',
    showTable: 'Mostrar a tabela',
    day: 'Dia',
    bar: (date: string, value: number, unit: string) => `${date}: ${value.toLocaleString('pt-BR')} ${unit}`,
    empty: 'Nada ainda neste período: as barras aparecerão com a primeira visualização.',
  },
  report: {
    title: 'Relatório para a diretoria',
    unavailableTitle: 'O relatório não está disponível aqui',
    unavailableDescription: 'Os números continuam na página Estatísticas.',
    backToStats: 'Voltar às estatísticas',
    lockedTitle: 'O relatório faz parte das estatísticas de adoção',
    lockedDescription: 'Mostre à diretoria o tempo economizado e quanto ele vale: o recurso é liberado com um plano que o inclua.',
    seePlan: 'Ver o plano que o inclui',
    hint: 'Relatório para a diretoria — escolha “Salvar como PDF” para enviá-lo.',
    print: 'Imprimir ou salvar como PDF',
    printShort: 'PDF',
    propose: 'Propor',
    noPlan: 'Sem plano',
    preview: 'Prévia do relatório',
  },
  pdf: {
    docTitle: (org: string) => `Relatório CLIP — ${org}`,
    eyebrow: (org: string) => `Relatório CLIP · ${org}`,
    headline: (days: number) => `O que o CLIP economizou para você em ${days.toLocaleString('pt-BR')} dias`,
    period: (from: string, to: string) => `De ${from} a ${to}`,
    number: (n: number) => whole(n),
    money: (n: number) => `$${whole(n)}`,
    leadEyebrow: 'Valor estimado, com base nas suas premissas',
    hoursSaved: (hours: number) => `${whole(hours)} ${Math.abs(Math.round(hours)) !== 1 ? 'horas economizadas' : 'hora economizada'} na redação de instruções e no acompanhamento das tarefas no posto`,
    views: 'Visualizações no chão de fábrica',
    viewsHint: (rate: number) => `${rate.toLocaleString('pt-BR')}% seguidas até o fim`,
    completions: 'Execuções guiadas',
    completionsHint: 'tarefas feitas com a instrução à frente',
    created: 'Instruções redigidas',
    createdHint: (published: number) => `${whole(published)} publicadas no total`,
    stations: 'Postos cobertos',
    stationsHint: 'postos que têm as suas instruções',
    top: 'Mais vistas',
    topEmpty: 'As visualizações aparecerão assim que os operadores abrirem as instruções.',
    watch: 'Fique de olho',
    feedback: (total: number, done: number) => `${whole(total)} ${Math.abs(total) !== 1 ? 'retornos informados' : 'retorno informado'} pelos operadores, ${whole(done)} ${Math.abs(done) !== 1 ? 'tratados' : 'tratado'}`,
    unseen: (n: number) =>
      Math.abs(n) !== 1
        ? `${whole(n)} instruções publicadas nunca foram vistas: coloque-as no posto certo`
        : `${whole(n)} instrução publicada nunca foi vista: coloque-a no posto certo`,
    allSeen: 'Todas as instruções publicadas foram vistas',
    next: 'Próximo passo',
    upgrade: (plan: string) => `Migre para o plano ${plan}`,
    today: (usage: string) => `Hoje: ${usage}.`,
    perMonth: (price: string) => `${price}/mês`,
    perYear: (price: string) => `${price}/ano`,
    orYearly: (price: string) => `ou ${price}`,
    ratio: (days: number, ratio: number) =>
      `O valor estimado destes ${days.toLocaleString('pt-BR')} dias equivale a ${ratio.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} vezes o preço mensal do plano.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `Uma estimativa transparente, baseada nas premissas da fábrica: ${hoursPerInstruction.toLocaleString('pt-BR')} h economizadas por instrução redigida, ${minutesPerCompletion.toLocaleString('pt-BR')} min por execução guiada, $${hourlyRate.toLocaleString('pt-BR')} por hora. Você pode alterá-las no CLIP, na página Estatísticas. Preparado em ${date}.`,
  },
}
