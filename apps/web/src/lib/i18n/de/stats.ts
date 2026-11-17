import type { stats as Fr } from '../fr/stats'

const whole = (n: number) => Math.round(n).toLocaleString('de-DE')

// Statistiken und Bericht für die Geschäftsleitung.
export const stats: typeof Fr = {
  page: {
    title: 'Statistiken',
    subtitle: (days: number) => `Die letzten ${days.toLocaleString('de-DE')} Tage: was in der Halle angesehen wird, was gemeldet wird, was es Ihnen einspart.`,
    views: 'Aufrufe',
    viewsHint: (kiosk: number, link: number, app: number) => `Tablets ${kiosk.toLocaleString('de-DE')} · Links ${link.toLocaleString('de-DE')} · App ${app.toLocaleString('de-DE')}`,
    completions: 'Ausführungen',
    completionsHint: (rate: number) => `${rate.toLocaleString('de-DE')} % der Aufrufe gehen bis zum Ende`,
    feedback: 'Rückmeldungen',
    feedbackHint: (done: number) => `${done.toLocaleString('de-DE')} erledigt`,
    value: 'Geschätzter Wert',
    money: (n: number) => `${n.toLocaleString('de-DE')} $`,
    valueLocked: 'Die Rendite gibt es mit einem höheren Tarif',
    valueHint: (hours: number) => `${hours.toLocaleString('de-DE')} Std. gespart · tippen Sie, um Ihre Annahmen zu sehen`,
    chartTitle: 'Aufrufe pro Tag',
    chartUnit: 'Aufrufe',
    top: 'Am häufigsten angesehen',
    topEmpty: 'Aufrufe erscheinen, sobald Werker die Anweisungen öffnen (Tablet, QR-Code, Link).',
    watch: 'Genauer hinsehen',
    unseen: (n: number) =>
      n !== 1
        ? `${n.toLocaleString('de-DE')} veröffentlichte Anweisungen wurden nie angesehen: Sind sie am richtigen Arbeitsplatz?`
        : `${n.toLocaleString('de-DE')} veröffentlichte Anweisung wurde nie angesehen: Ist sie am richtigen Arbeitsplatz?`,
    allSeen: 'Jede veröffentlichte Anweisung wurde angesehen.',
    openFeedback: (n: number) => `${n.toLocaleString('de-DE')} ${n !== 1 ? 'Rückmeldungen' : 'Rückmeldung'} zu bearbeiten.`,
    aiUse: (generations: number, imports: number) =>
      `${generations.toLocaleString('de-DE')} ${generations !== 1 ? 'Erstellungen' : 'Erstellung'} und ${imports.toLocaleString('de-DE')} ${imports !== 1 ? 'Importe' : 'Import'} durch die KI in diesem Monat.`,
    medianDuration: (minutes: number) => `Eine Ausführung dauert im Median ${minutes.toLocaleString('de-DE')} Min.`,
  },
  roi: {
    title: 'Wie der Wert berechnet wird',
    intro: 'Eine transparente Schätzung auf Grundlage Ihrer Annahmen: die Zeit, die beim Schreiben jeder erstellten Anweisung gespart wird, und die Zeit, die bei jeder geführten Ausführung gespart wird (weniger Fragen, weniger Fehler).',
    hoursPerInstruction: 'Gesparte Stunden pro Anweisung',
    minutesPerCompletion: 'Minuten pro Ausführung',
    hourlyRate: 'Stundensatz ($)',
    save: 'Meine Annahmen speichern',
    formula: (f) =>
      `${f.created.toLocaleString('de-DE')} ${f.created !== 1 ? 'Anweisungen' : 'Anweisung'} × ${f.hoursPerInstruction.toLocaleString('de-DE')} Std. + ${f.completions.toLocaleString('de-DE')} ${f.completions !== 1 ? 'Ausführungen' : 'Ausführung'} × ${f.minutesPerCompletion.toLocaleString('de-DE')} Min. = ${f.hours.toLocaleString('de-DE')} Std. × ${f.hourlyRate.toLocaleString('de-DE')} $ = ${f.value.toLocaleString('de-DE')} $`,
  },
  chart: {
    total: (total: number, unit: string, days: number) => `${total.toLocaleString('de-DE')} ${unit} in ${days.toLocaleString('de-DE')} ${days !== 1 ? 'Tagen' : 'Tag'}`,
    showChart: 'Diagramm anzeigen',
    showTable: 'Tabelle anzeigen',
    day: 'Tag',
    bar: (date: string, value: number, unit: string) => `${date}: ${value.toLocaleString('de-DE')} ${unit}`,
    empty: 'Für diesen Zeitraum noch nichts: Die Balken erscheinen mit dem ersten Aufruf.',
  },
  report: {
    title: 'Bericht für die Geschäftsleitung',
    unavailableTitle: 'Der Bericht ist hier nicht verfügbar',
    unavailableDescription: 'Die Zahlen bleiben auf der Seite Statistiken.',
    backToStats: 'Zurück zu den Statistiken',
    lockedTitle: 'Der Bericht gehört zu den Adoptionsstatistiken',
    lockedDescription: 'Zeigen Sie der Geschäftsleitung die gesparte Zeit und ihren Wert: Die Funktion gibt es mit einem Tarif, der sie enthält.',
    seePlan: 'Tarif ansehen, der sie enthält',
    hint: 'Bericht für die Geschäftsleitung – wählen Sie „Als PDF speichern“, um ihn zu versenden.',
    print: 'Drucken oder als PDF speichern',
    printShort: 'PDF',
    propose: 'Vorschlagen',
    noPlan: 'Kein Tarif',
    preview: 'Berichtsvorschau',
  },
  pdf: {
    docTitle: (org: string) => `CLIP-Bericht – ${org}`,
    eyebrow: (org: string) => `CLIP-Bericht · ${org}`,
    headline: (days: number) => `Was CLIP Ihnen in ${days.toLocaleString('de-DE')} Tagen eingespart hat`,
    period: (from: string, to: string) => `Vom ${from} bis ${to}`,
    number: (n: number) => whole(n),
    money: (n: number) => `${whole(n)} $`,
    leadEyebrow: 'Geschätzter Wert auf Grundlage Ihrer Annahmen',
    hoursSaved: (hours: number) => `${whole(hours)} ${Math.abs(Math.round(hours)) !== 1 ? 'Stunden' : 'Stunde'} gespart beim Schreiben von Anweisungen und bei der Führung von Aufgaben am Arbeitsplatz`,
    views: 'Aufrufe in der Halle',
    viewsHint: (rate: number) => `${rate.toLocaleString('de-DE')} % bis zum Ende befolgt`,
    completions: 'Geführte Ausführungen',
    completionsHint: 'Aufgaben, die mit der Anweisung vor Augen erledigt wurden',
    created: 'Geschriebene Anweisungen',
    createdHint: (published: number) => `${whole(published)} insgesamt veröffentlicht`,
    stations: 'Abgedeckte Arbeitsplätze',
    stationsHint: 'Arbeitsplätze, die ihre Anweisungen haben',
    top: 'Am häufigsten angesehen',
    topEmpty: 'Aufrufe erscheinen, sobald Werker die Anweisungen öffnen.',
    watch: 'Im Auge behalten',
    feedback: (total: number, done: number) => `${whole(total)} ${Math.abs(total) !== 1 ? 'Rückmeldungen' : 'Rückmeldung'} von Werkern gemeldet, ${whole(done)} erledigt`,
    unseen: (n: number) =>
      Math.abs(n) !== 1
        ? `${whole(n)} veröffentlichte Anweisungen wurden nie angesehen: Legen Sie sie am richtigen Arbeitsplatz ab`
        : `${whole(n)} veröffentlichte Anweisung wurde nie angesehen: Legen Sie sie am richtigen Arbeitsplatz ab`,
    allSeen: 'Jede veröffentlichte Anweisung wurde angesehen',
    next: 'Nächster Schritt',
    upgrade: (plan: string) => `Auf den Tarif ${plan} wechseln`,
    today: (usage: string) => `Heute: ${usage}.`,
    perMonth: (price: string) => `${price}/Monat`,
    perYear: (price: string) => `${price}/Jahr`,
    orYearly: (price: string) => `oder ${price}`,
    ratio: (days: number, ratio: number) =>
      `Der geschätzte Wert dieser ${days.toLocaleString('de-DE')} Tage entspricht dem ${ratio.toLocaleString('de-DE', { maximumFractionDigits: 1 })}-Fachen des Monatspreises des Tarifs.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `Eine transparente Schätzung auf Grundlage der Annahmen des Werks: ${hoursPerInstruction.toLocaleString('de-DE')} Std. gespart pro geschriebener Anweisung, ${minutesPerCompletion.toLocaleString('de-DE')} Min. pro geführter Ausführung, ${hourlyRate.toLocaleString('de-DE')} $ pro Stunde. Sie können sie in CLIP auf der Seite Statistiken ändern. Erstellt am ${date}.`,
  },
}
