import type { stats as Fr } from '../fr/stats'

/** Un número entero del informe impreso. */
const whole = (n: number) => Math.round(n).toLocaleString('es-MX')

/** Las estadísticas y el informe para la dirección. */
export const stats: typeof Fr = {
  page: {
    title: 'Estadísticas',
    subtitle: (days: number) => `Los últimos ${days.toLocaleString('es-MX')} días: lo que se consulta en el piso, lo que se reporta, lo que te ahorra.`,
    views: 'Consultas',
    viewsHint: (kiosk: number, link: number, app: number) => `Tabletas ${kiosk.toLocaleString('es-MX')} · enlaces ${link.toLocaleString('es-MX')} · app ${app.toLocaleString('es-MX')}`,
    completions: 'Realizaciones',
    completionsHint: (rate: number) => `${rate.toLocaleString('es-MX')} % de las consultas llegan hasta el final`,
    feedback: 'Comentarios',
    feedbackHint: (done: number) => `${done.toLocaleString('es-MX')} atendido${done !== 1 ? 's' : ''}`,
    value: 'Valor estimado',
    money: (n: number) => `$${n.toLocaleString('es-MX')}`,
    valueLocked: 'El retorno de la inversión viene con un plan superior',
    valueHint: (hours: number) => `${hours.toLocaleString('es-MX')} h ahorradas · toca para ver tus supuestos`,
    chartTitle: 'Consultas por día',
    chartUnit: 'consultas',
    top: 'Las más consultadas',
    topEmpty: 'Las consultas aparecerán en cuanto los operadores abran las instrucciones (tableta, código QR, enlace).',
    watch: 'Conviene revisar',
    unseen: (n: number) =>
      n !== 1
        ? `${n.toLocaleString('es-MX')} instrucciones publicadas nunca consultadas: ¿están en el puesto correcto?`
        : `${n.toLocaleString('es-MX')} instrucción publicada nunca consultada: ¿está en el puesto correcto?`,
    allSeen: 'Todas las instrucciones publicadas se han consultado.',
    openFeedback: (n: number) => `${n.toLocaleString('es-MX')} comentario${n !== 1 ? 's' : ''} por atender.`,
    aiUse: (generations: number, imports: number) =>
      `${generations.toLocaleString('es-MX')} generación${generations !== 1 ? 'es' : ''} y ${imports.toLocaleString('es-MX')} importación${imports !== 1 ? 'es' : ''} de la IA este mes.`,
    medianDuration: (minutes: number) => `La realización mediana dura ${minutes.toLocaleString('es-MX')} min.`,
  },
  roi: {
    title: 'Cómo se calcula el valor',
    intro: 'Una estimación transparente, basada en tus supuestos: el tiempo ahorrado al redactar cada instrucción creada y el tiempo ahorrado en cada realización guiada (menos preguntas, menos errores).',
    hoursPerInstruction: 'Horas ahorradas por instrucción',
    minutesPerCompletion: 'Minutos por realización',
    hourlyRate: 'Costo por hora ($)',
    save: 'Guardar mis supuestos',
    formula: (f) =>
      `${f.created.toLocaleString('es-MX')} instrucción${f.created !== 1 ? 'es' : ''} × ${f.hoursPerInstruction.toLocaleString('es-MX')} h + ${f.completions.toLocaleString('es-MX')} realización${f.completions !== 1 ? 'es' : ''} × ${f.minutesPerCompletion.toLocaleString('es-MX')} min = ${f.hours.toLocaleString('es-MX')} h × $${f.hourlyRate.toLocaleString('es-MX')} = $${f.value.toLocaleString('es-MX')}`,
  },
  chart: {
    total: (total: number, unit: string, days: number) => `${total.toLocaleString('es-MX')} ${unit} en ${days.toLocaleString('es-MX')} día${days !== 1 ? 's' : ''}`,
    showChart: 'Mostrar la gráfica',
    showTable: 'Mostrar la tabla',
    day: 'Día',
    bar: (date: string, value: number, unit: string) => `${date}: ${value.toLocaleString('es-MX')} ${unit}`,
    empty: 'Todavía no hay nada en este período: las barras aparecerán con la primera consulta.',
  },
  report: {
    title: 'Informe para la dirección',
    unavailableTitle: 'El informe no está disponible aquí',
    unavailableDescription: 'Las cifras se quedan en la página de Estadísticas.',
    backToStats: 'Volver a las estadísticas',
    lockedTitle: 'El informe forma parte de las estadísticas de adopción',
    lockedDescription: 'Muestra a la dirección el tiempo ahorrado y cuánto vale: la función se abre con un plan que la incluya.',
    seePlan: 'Ver el plan que la incluye',
    hint: 'Informe para la dirección: elige «Guardar como PDF» para enviarlo.',
    print: 'Imprimir o guardar como PDF',
    printShort: 'PDF',
    propose: 'Proponer',
    noPlan: 'Sin plan',
    preview: 'Vista previa del informe',
  },
  pdf: {
    docTitle: (org: string) => `Informe CLIP — ${org}`,
    eyebrow: (org: string) => `Informe CLIP · ${org}`,
    headline: (days: number) => `Lo que CLIP te ahorró en ${days.toLocaleString('es-MX')} días`,
    period: (from: string, to: string) => `Del ${from} al ${to}`,
    number: (n: number) => whole(n),
    money: (n: number) => `$${whole(n)}`,
    leadEyebrow: 'Valor estimado, según tus supuestos',
    hoursSaved: (hours: number) => `${whole(hours)} ${Math.abs(Math.round(hours)) !== 1 ? 'horas ahorradas' : 'hora ahorrada'} al redactar instrucciones y guiar las tareas en el puesto`,
    views: 'Consultas en el piso',
    viewsHint: (rate: number) => `${rate.toLocaleString('es-MX')} % seguidas hasta el final`,
    completions: 'Realizaciones guiadas',
    completionsHint: 'tareas hechas con la instrucción a la vista',
    created: 'Instrucciones redactadas',
    createdHint: (published: number) => `${whole(published)} publicada${Math.abs(published) !== 1 ? 's' : ''} en total`,
    stations: 'Puestos cubiertos',
    stationsHint: 'puestos que ya tienen sus instrucciones',
    top: 'Las más consultadas',
    topEmpty: 'Las consultas aparecerán en cuanto los operadores abran las instrucciones.',
    watch: 'A vigilar',
    feedback: (total: number, done: number) => `${whole(total)} ${Math.abs(total) !== 1 ? 'comentarios reportados' : 'comentario reportado'} por los operadores, ${whole(done)} atendido${Math.abs(done) !== 1 ? 's' : ''}`,
    unseen: (n: number) =>
      Math.abs(n) !== 1
        ? `${whole(n)} instrucciones publicadas nunca consultadas: colócalas en el puesto correcto`
        : `${whole(n)} instrucción publicada nunca consultada: colócala en el puesto correcto`,
    allSeen: 'Todas las instrucciones publicadas se han consultado',
    next: 'Siguiente paso',
    upgrade: (plan: string) => `Pasa al plan ${plan}`,
    today: (usage: string) => `Hoy: ${usage}.`,
    perMonth: (price: string) => `${price}/mes`,
    perYear: (price: string) => `${price}/año`,
    orYearly: (price: string) => `o ${price}`,
    ratio: (days: number, ratio: number) =>
      `El valor estimado de estos ${days.toLocaleString('es-MX')} días equivale a ${ratio.toLocaleString('es-MX', { maximumFractionDigits: 1 })} veces el precio mensual del plan.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `Una estimación transparente, basada en los supuestos de la planta: ${hoursPerInstruction.toLocaleString('es-MX')} h ahorradas por instrucción redactada, ${minutesPerCompletion.toLocaleString('es-MX')} min por realización guiada, $${hourlyRate.toLocaleString('es-MX')} la hora. Puedes cambiarlos en CLIP, en la página de Estadísticas. Preparado el ${date}.`,
  },
}
