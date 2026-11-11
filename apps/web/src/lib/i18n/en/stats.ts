import type { stats as Fr } from '../fr/stats'

/** Un nombre entier du dossier imprimé. */
const whole = (n: number) => Math.round(n).toLocaleString('en-CA')

/** Les statistiques et le dossier pour la direction. */
export const stats: typeof Fr = {
  page: {
    title: 'Statistics',
    subtitle: (days: number) => `The last ${days.toLocaleString('en-CA')} days: what gets viewed on the floor, what gets reported, what it saves you.`,
    views: 'Views',
    viewsHint: (kiosk: number, link: number, app: number) => `Tablets ${kiosk.toLocaleString('en-CA')} · links ${link.toLocaleString('en-CA')} · app ${app.toLocaleString('en-CA')}`,
    completions: 'Completions',
    completionsHint: (rate: number) => `${rate.toLocaleString('en-CA')}% of views reach the end`,
    feedback: 'Feedback',
    feedbackHint: (done: number) => `${done.toLocaleString('en-CA')} handled`,
    value: 'Estimated value',
    money: (n: number) => `$${n.toLocaleString('en-CA')}`,
    valueLocked: 'Return on investment comes with a higher plan',
    valueHint: (hours: number) => `${hours.toLocaleString('en-CA')} h saved · tap to see your assumptions`,
    chartTitle: 'Views per day',
    chartUnit: 'views',
    top: 'Most viewed',
    topEmpty: 'Views will show up as soon as operators open the instructions (tablet, QR code, link).',
    watch: 'Worth a closer look',
    unseen: (n: number) =>
      n !== 1
        ? `${n.toLocaleString('en-CA')} published instructions never viewed: are they at the right station?`
        : `${n.toLocaleString('en-CA')} published instruction never viewed: is it at the right station?`,
    allSeen: 'Every published instruction has been viewed.',
    openFeedback: (n: number) => `${n.toLocaleString('en-CA')} feedback item${n !== 1 ? 's' : ''} to handle.`,
    aiUse: (generations: number, imports: number) =>
      `${generations.toLocaleString('en-CA')} generation${generations !== 1 ? 's' : ''} and ${imports.toLocaleString('en-CA')} import${imports !== 1 ? 's' : ''} by the AI this month.`,
    medianDuration: (minutes: number) => `The median completion takes ${minutes.toLocaleString('en-CA')} min.`,
  },
  roi: {
    title: 'How the value is calculated',
    intro: 'A transparent estimate, based on your assumptions: the time saved writing each instruction created, and the time saved on each guided completion (fewer questions, fewer mistakes).',
    hoursPerInstruction: 'Hours saved per instruction',
    minutesPerCompletion: 'Minutes per completion',
    hourlyRate: 'Hourly rate ($)',
    save: 'Save my assumptions',
    formula: (f) =>
      `${f.created.toLocaleString('en-CA')} instruction${f.created !== 1 ? 's' : ''} × ${f.hoursPerInstruction.toLocaleString('en-CA')} h + ${f.completions.toLocaleString('en-CA')} completion${f.completions !== 1 ? 's' : ''} × ${f.minutesPerCompletion.toLocaleString('en-CA')} min = ${f.hours.toLocaleString('en-CA')} h × $${f.hourlyRate.toLocaleString('en-CA')} = $${f.value.toLocaleString('en-CA')}`,
  },
  chart: {
    total: (total: number, unit: string, days: number) => `${total.toLocaleString('en-CA')} ${unit} in ${days.toLocaleString('en-CA')} day${days !== 1 ? 's' : ''}`,
    showChart: 'Show chart',
    showTable: 'Show table',
    day: 'Day',
    bar: (date: string, value: number, unit: string) => `${date}: ${value.toLocaleString('en-CA')} ${unit}`,
    empty: 'Nothing yet for this period: the bars will appear with the first view.',
  },
  report: {
    title: 'Management report',
    unavailableTitle: 'The report isn’t available here',
    unavailableDescription: 'The numbers stay on the Statistics page.',
    backToStats: 'Back to statistics',
    lockedTitle: 'The report is part of adoption statistics',
    lockedDescription: 'Show management the time saved and what it’s worth: the feature opens with a plan that includes it.',
    seePlan: 'See the plan that includes it',
    hint: 'Management report — choose “Save as PDF” to send it.',
    print: 'Print or save as PDF',
    printShort: 'PDF',
    propose: 'Propose',
    noPlan: 'No plan',
    preview: 'Report preview',
  },
  pdf: {
    docTitle: (org: string) => `CLIP report — ${org}`,
    eyebrow: (org: string) => `CLIP report · ${org}`,
    headline: (days: number) => `What CLIP saved you in ${days.toLocaleString('en-CA')} days`,
    period: (from: string, to: string) => `From ${from} to ${to}`,
    number: (n: number) => whole(n),
    money: (n: number) => `$${whole(n)}`,
    leadEyebrow: 'Estimated value, based on your assumptions',
    hoursSaved: (hours: number) => `${whole(hours)} ${Math.abs(Math.round(hours)) !== 1 ? 'hours' : 'hour'} saved writing instructions and guiding tasks at the station`,
    views: 'Views on the floor',
    viewsHint: (rate: number) => `${rate.toLocaleString('en-CA')}% followed to the end`,
    completions: 'Guided completions',
    completionsHint: 'tasks done with the instruction in front of them',
    created: 'Instructions written',
    createdHint: (published: number) => `${whole(published)} published in total`,
    stations: 'Stations covered',
    stationsHint: 'stations that have their instructions',
    top: 'Most viewed',
    topEmpty: 'Views will show up as soon as operators open the instructions.',
    watch: 'Keep an eye on',
    feedback: (total: number, done: number) => `${whole(total)} feedback ${Math.abs(total) !== 1 ? 'items' : 'item'} reported by operators, ${whole(done)} handled`,
    unseen: (n: number) =>
      Math.abs(n) !== 1
        ? `${whole(n)} published instructions never viewed: place them at the right station`
        : `${whole(n)} published instruction never viewed: place it at the right station`,
    allSeen: 'Every published instruction has been viewed',
    next: 'Next step',
    upgrade: (plan: string) => `Upgrade to the ${plan} plan`,
    today: (usage: string) => `Today: ${usage}.`,
    perMonth: (price: string) => `${price}/month`,
    perYear: (price: string) => `${price}/year`,
    orYearly: (price: string) => `or ${price}`,
    ratio: (days: number, ratio: number) =>
      `The estimated value of these ${days.toLocaleString('en-CA')} days is ${ratio.toLocaleString('en-CA', { maximumFractionDigits: 1 })} times the plan’s monthly price.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `A transparent estimate, based on the plant’s assumptions: ${hoursPerInstruction.toLocaleString('en-CA')} h saved per instruction written, ${minutesPerCompletion.toLocaleString('en-CA')} min per guided completion, $${hourlyRate.toLocaleString('en-CA')} an hour. You can change them in CLIP, on the Statistics page. Prepared on ${date}.`,
  },
}
