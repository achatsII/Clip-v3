import type { stats as Fr } from '../fr/stats'

/** Un numero intero del dossier stampato. */
const whole = (n: number) => Math.round(n).toLocaleString('it-IT')

/** Le statistiche e il dossier per la direzione. */
export const stats: typeof Fr = {
  page: {
    title: 'Statistiche',
    subtitle: (days: number) => `Gli ultimi ${days.toLocaleString('it-IT')} giorni: cosa viene consultato in reparto, cosa viene segnalato, quanto ti fa risparmiare.`,
    views: 'Visualizzazioni',
    viewsHint: (kiosk: number, link: number, app: number) => `Tablet ${kiosk.toLocaleString('it-IT')} · link ${link.toLocaleString('it-IT')} · app ${app.toLocaleString('it-IT')}`,
    completions: 'Esecuzioni',
    completionsHint: (rate: number) => `Il ${rate.toLocaleString('it-IT')}% delle visualizzazioni arriva in fondo`,
    feedback: 'Riscontri',
    feedbackHint: (done: number) => `${done.toLocaleString('it-IT')} ${done === 1 ? 'gestito' : 'gestiti'}`,
    value: 'Valore stimato',
    money: (n: number) => `${n.toLocaleString('it-IT')} $`,
    valueLocked: 'Il ritorno sull’investimento è incluso in un piano superiore',
    valueHint: (hours: number) => `${hours.toLocaleString('it-IT')} h risparmiate · tocca per vedere le tue ipotesi`,
    chartTitle: 'Visualizzazioni al giorno',
    chartUnit: 'visualizzazioni',
    top: 'Più consultate',
    topEmpty: 'Le visualizzazioni compariranno non appena gli operatori apriranno le istruzioni (tablet, codice QR, link).',
    watch: 'Da tenere d’occhio',
    unseen: (n: number) =>
      n !== 1
        ? `${n.toLocaleString('it-IT')} istruzioni pubblicate mai consultate: sono alla postazione giusta?`
        : `${n.toLocaleString('it-IT')} istruzione pubblicata mai consultata: è alla postazione giusta?`,
    allSeen: 'Tutte le istruzioni pubblicate sono state consultate.',
    openFeedback: (n: number) => `${n.toLocaleString('it-IT')} ${n !== 1 ? 'riscontri da gestire' : 'riscontro da gestire'}.`,
    aiUse: (generations: number, imports: number) =>
      `${generations.toLocaleString('it-IT')} ${generations !== 1 ? 'generazioni' : 'generazione'} e ${imports.toLocaleString('it-IT')} ${imports !== 1 ? 'importazioni' : 'importazione'} dell’IA questo mese.`,
    medianDuration: (minutes: number) => `L’esecuzione mediana dura ${minutes.toLocaleString('it-IT')} min.`,
  },
  roi: {
    title: 'Come si calcola il valore',
    intro: 'Una stima trasparente, basata sulle tue ipotesi: il tempo risparmiato nella scrittura di ogni istruzione creata e il tempo risparmiato a ogni esecuzione guidata (meno domande, meno errori).',
    hoursPerInstruction: 'Ore risparmiate per istruzione',
    minutesPerCompletion: 'Minuti per esecuzione',
    hourlyRate: 'Costo orario ($)',
    save: 'Salva le mie ipotesi',
    formula: (f) =>
      `${f.created.toLocaleString('it-IT')} ${f.created !== 1 ? 'istruzioni' : 'istruzione'} × ${f.hoursPerInstruction.toLocaleString('it-IT')} h + ${f.completions.toLocaleString('it-IT')} ${f.completions !== 1 ? 'esecuzioni' : 'esecuzione'} × ${f.minutesPerCompletion.toLocaleString('it-IT')} min = ${f.hours.toLocaleString('it-IT')} h × ${f.hourlyRate.toLocaleString('it-IT')} $ = ${f.value.toLocaleString('it-IT')} $`,
  },
  chart: {
    total: (total: number, unit: string, days: number) => `${total.toLocaleString('it-IT')} ${unit} in ${days.toLocaleString('it-IT')} ${days !== 1 ? 'giorni' : 'giorno'}`,
    showChart: 'Mostra il grafico',
    showTable: 'Mostra la tabella',
    day: 'Giorno',
    bar: (date: string, value: number, unit: string) => `${date}: ${value.toLocaleString('it-IT')} ${unit}`,
    empty: 'Ancora niente per questo periodo: le barre compariranno con la prima visualizzazione.',
  },
  report: {
    title: 'Rapporto per la direzione',
    unavailableTitle: 'Il rapporto non è disponibile qui',
    unavailableDescription: 'I numeri restano nella pagina Statistiche.',
    backToStats: 'Torna alle statistiche',
    lockedTitle: 'Il rapporto fa parte delle statistiche di adozione',
    lockedDescription: 'Mostra alla direzione il tempo risparmiato e quanto vale: la funzione si apre con un piano che la include.',
    seePlan: 'Vedi il piano che la include',
    hint: 'Rapporto per la direzione — scegli “Salva come PDF” per inviarlo.',
    print: 'Stampa o salva come PDF',
    printShort: 'PDF',
    propose: 'Proponi',
    noPlan: 'Nessun piano',
    preview: 'Anteprima del rapporto',
  },
  pdf: {
    docTitle: (org: string) => `Rapporto CLIP — ${org}`,
    eyebrow: (org: string) => `Rapporto CLIP · ${org}`,
    headline: (days: number) => `Cosa ti ha fatto risparmiare CLIP in ${days.toLocaleString('it-IT')} giorni`,
    period: (from: string, to: string) => `Dal ${from} al ${to}`,
    number: (n: number) => whole(n),
    money: (n: number) => `${whole(n)} $`,
    leadEyebrow: 'Valore stimato, in base alle tue ipotesi',
    hoursSaved: (hours: number) => `${whole(hours)} ${Math.abs(Math.round(hours)) !== 1 ? 'ore risparmiate' : 'ora risparmiata'} nella scrittura delle istruzioni e nella guida dei lavori in postazione`,
    views: 'Visualizzazioni in reparto',
    viewsHint: (rate: number) => `${rate.toLocaleString('it-IT')}% seguite fino in fondo`,
    completions: 'Esecuzioni guidate',
    completionsHint: 'lavori svolti con l’istruzione davanti',
    created: 'Istruzioni scritte',
    createdHint: (published: number) => `${whole(published)} pubblicate in totale`,
    stations: 'Postazioni coperte',
    stationsHint: 'postazioni che hanno le loro istruzioni',
    top: 'Più consultate',
    topEmpty: 'Le visualizzazioni compariranno non appena gli operatori apriranno le istruzioni.',
    watch: 'Da tenere d’occhio',
    feedback: (total: number, done: number) => `${whole(total)} ${Math.abs(total) !== 1 ? 'riscontri segnalati' : 'riscontro segnalato'} dagli operatori, ${whole(done)} ${Math.abs(done) !== 1 ? 'gestiti' : 'gestito'}`,
    unseen: (n: number) =>
      Math.abs(n) !== 1
        ? `${whole(n)} istruzioni pubblicate mai consultate: collocale alla postazione giusta`
        : `${whole(n)} istruzione pubblicata mai consultata: collocala alla postazione giusta`,
    allSeen: 'Tutte le istruzioni pubblicate sono state consultate',
    next: 'Prossimo passo',
    upgrade: (plan: string) => `Passa al piano ${plan}`,
    today: (usage: string) => `Oggi: ${usage}.`,
    perMonth: (price: string) => `${price}/mese`,
    perYear: (price: string) => `${price}/anno`,
    orYearly: (price: string) => `oppure ${price}`,
    ratio: (days: number, ratio: number) =>
      `Il valore stimato di questi ${days.toLocaleString('it-IT')} giorni è ${ratio.toLocaleString('it-IT', { maximumFractionDigits: 1 })} volte il prezzo mensile del piano.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `Una stima trasparente, basata sulle ipotesi dello stabilimento: ${hoursPerInstruction.toLocaleString('it-IT')} h risparmiate per istruzione scritta, ${minutesPerCompletion.toLocaleString('it-IT')} min per esecuzione guidata, ${hourlyRate.toLocaleString('it-IT')} $ l’ora. Puoi modificarle in CLIP, nella pagina Statistiche. Preparato il ${date}.`,
  },
}
