import type { stats as Fr } from '../fr/stats'

/** Een geheel getal uit het afgedrukte dossier. */
const whole = (n: number) => Math.round(n).toLocaleString('nl-NL')

/** De statistieken en het dossier voor de directie. */
export const stats: typeof Fr = {
  page: {
    title: 'Statistieken',
    subtitle: (days: number) => `De laatste ${days.toLocaleString('nl-NL')} dagen: wat er op de werkvloer wordt bekeken, wat er wordt gemeld, wat het je bespaart.`,
    views: 'Weergaven',
    viewsHint: (kiosk: number, link: number, app: number) => `Tablets ${kiosk.toLocaleString('nl-NL')} · links ${link.toLocaleString('nl-NL')} · app ${app.toLocaleString('nl-NL')}`,
    completions: 'Uitvoeringen',
    completionsHint: (rate: number) => `${rate.toLocaleString('nl-NL')}% van de weergaven haalt het einde`,
    feedback: 'Terugmeldingen',
    feedbackHint: (done: number) => `${done.toLocaleString('nl-NL')} afgehandeld`,
    value: 'Geschatte waarde',
    money: (n: number) => `$${n.toLocaleString('nl-NL')}`,
    valueLocked: 'Het rendement op je investering hoort bij een hoger abonnement',
    valueHint: (hours: number) => `${hours.toLocaleString('nl-NL')} u bespaard · tik om je aannames te zien`,
    chartTitle: 'Weergaven per dag',
    chartUnit: 'weergaven',
    top: 'Meest bekeken',
    topEmpty: 'Weergaven verschijnen zodra operators de instructies openen (tablet, QR-code, link).',
    watch: 'Een nadere blik waard',
    unseen: (n: number) =>
      n !== 1
        ? `${n.toLocaleString('nl-NL')} gepubliceerde instructies nooit bekeken: staan ze op het juiste station?`
        : `${n.toLocaleString('nl-NL')} gepubliceerde instructie nooit bekeken: staat ze op het juiste station?`,
    allSeen: 'Elke gepubliceerde instructie is bekeken.',
    openFeedback: (n: number) => `${n.toLocaleString('nl-NL')} ${n !== 1 ? 'terugmeldingen' : 'terugmelding'} af te handelen.`,
    aiUse: (generations: number, imports: number) =>
      `${generations.toLocaleString('nl-NL')} ${generations !== 1 ? 'generaties' : 'generatie'} en ${imports.toLocaleString('nl-NL')} ${imports !== 1 ? 'imports' : 'import'} door de AI deze maand.`,
    medianDuration: (minutes: number) => `Een mediane uitvoering duurt ${minutes.toLocaleString('nl-NL')} min.`,
  },
  roi: {
    title: 'Hoe de waarde wordt berekend',
    intro: 'Een transparante schatting, gebaseerd op jouw aannames: de tijd die je bespaart bij het schrijven van elke gemaakte instructie, en de tijd die je bespaart bij elke begeleide uitvoering (minder vragen, minder fouten).',
    hoursPerInstruction: 'Bespaarde uren per instructie',
    minutesPerCompletion: 'Minuten per uitvoering',
    hourlyRate: 'Uurtarief ($)',
    save: 'Mijn aannames opslaan',
    formula: (f) =>
      `${f.created.toLocaleString('nl-NL')} ${f.created !== 1 ? 'instructies' : 'instructie'} × ${f.hoursPerInstruction.toLocaleString('nl-NL')} u + ${f.completions.toLocaleString('nl-NL')} ${f.completions !== 1 ? 'uitvoeringen' : 'uitvoering'} × ${f.minutesPerCompletion.toLocaleString('nl-NL')} min = ${f.hours.toLocaleString('nl-NL')} u × $${f.hourlyRate.toLocaleString('nl-NL')} = $${f.value.toLocaleString('nl-NL')}`,
  },
  chart: {
    total: (total: number, unit: string, days: number) => `${total.toLocaleString('nl-NL')} ${unit} in ${days.toLocaleString('nl-NL')} ${days !== 1 ? 'dagen' : 'dag'}`,
    showChart: 'Grafiek tonen',
    showTable: 'Tabel tonen',
    day: 'Dag',
    bar: (date: string, value: number, unit: string) => `${date}: ${value.toLocaleString('nl-NL')} ${unit}`,
    empty: 'Nog niets voor deze periode: de balken verschijnen bij de eerste weergave.',
  },
  report: {
    title: 'Rapport voor de directie',
    unavailableTitle: 'Het rapport is hier niet beschikbaar',
    unavailableDescription: 'De cijfers blijven op de pagina Statistieken.',
    backToStats: 'Terug naar statistieken',
    lockedTitle: 'Het rapport hoort bij de adoptiestatistieken',
    lockedDescription: 'Laat de directie de bespaarde tijd en haar waarde zien: de functie opent met een abonnement dat haar bevat.',
    seePlan: 'Het abonnement bekijken dat haar bevat',
    hint: 'Rapport voor de directie — kies “Opslaan als PDF” om het te versturen.',
    print: 'Afdrukken of opslaan als PDF',
    printShort: 'PDF',
    propose: 'Voorstellen',
    noPlan: 'Geen abonnement',
    preview: 'Voorbeeld van het rapport',
  },
  pdf: {
    docTitle: (org: string) => `CLIP-rapport — ${org}`,
    eyebrow: (org: string) => `CLIP-rapport · ${org}`,
    headline: (days: number) => `Wat CLIP je in ${days.toLocaleString('nl-NL')} dagen heeft bespaard`,
    period: (from: string, to: string) => `Van ${from} tot ${to}`,
    number: (n: number) => whole(n),
    money: (n: number) => `$${whole(n)}`,
    leadEyebrow: 'Geschatte waarde, gebaseerd op jouw aannames',
    hoursSaved: (hours: number) => `${whole(hours)} uur bespaard bij het schrijven van instructies en het begeleiden van taken op het station`,
    views: 'Weergaven op de werkvloer',
    viewsHint: (rate: number) => `${rate.toLocaleString('nl-NL')}% tot het einde gevolgd`,
    completions: 'Begeleide uitvoeringen',
    completionsHint: 'taken uitgevoerd met de instructie voor zich',
    created: 'Geschreven instructies',
    createdHint: (published: number) => `${whole(published)} in totaal gepubliceerd`,
    stations: 'Gedekte stations',
    stationsHint: 'stations die hun instructies hebben',
    top: 'Meest bekeken',
    topEmpty: 'Weergaven verschijnen zodra operators de instructies openen.',
    watch: 'In de gaten houden',
    feedback: (total: number, done: number) => `${whole(total)} ${Math.abs(total) !== 1 ? 'terugmeldingen' : 'terugmelding'} gemeld door operators, ${whole(done)} afgehandeld`,
    unseen: (n: number) =>
      Math.abs(n) !== 1
        ? `${whole(n)} gepubliceerde instructies nooit bekeken: zet ze op het juiste station`
        : `${whole(n)} gepubliceerde instructie nooit bekeken: zet haar op het juiste station`,
    allSeen: 'Elke gepubliceerde instructie is bekeken',
    next: 'Volgende stap',
    upgrade: (plan: string) => `Upgraden naar het abonnement ${plan}`,
    today: (usage: string) => `Vandaag: ${usage}.`,
    perMonth: (price: string) => `${price}/maand`,
    perYear: (price: string) => `${price}/jaar`,
    orYearly: (price: string) => `of ${price}`,
    ratio: (days: number, ratio: number) =>
      `De geschatte waarde van deze ${days.toLocaleString('nl-NL')} dagen is ${ratio.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} keer de maandprijs van het abonnement.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `Een transparante schatting, gebaseerd op de aannames van de fabriek: ${hoursPerInstruction.toLocaleString('nl-NL')} u bespaard per geschreven instructie, ${minutesPerCompletion.toLocaleString('nl-NL')} min per begeleide uitvoering, $${hourlyRate.toLocaleString('nl-NL')} per uur. Je kunt ze wijzigen in CLIP, op de pagina Statistieken. Opgesteld op ${date}.`,
  },
}
