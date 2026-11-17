import type { stats as Fr } from '../fr/stats'

const pl = (n: number, one: string, few: string, other: string) => (n === 1 ? one : n >= 2 && n <= 4 ? few : other)

/** Un nombre entier du dossier imprimé. */
const whole = (n: number) => Math.round(n).toLocaleString('cs-CZ')
const usd = (n: number) => `${n.toLocaleString('cs-CZ')} $`

/** Les statistiques et le dossier pour la direction. */
export const stats: typeof Fr = {
  page: {
    title: 'Statistiky',
    subtitle: (days: number) => `Posledních ${days.toLocaleString('cs-CZ')} dní: co se zobrazuje v provozu, co se hlásí a kolik vám to ušetří.`,
    views: 'Zobrazení',
    viewsHint: (kiosk: number, link: number, app: number) => `Tablety ${kiosk.toLocaleString('cs-CZ')} · odkazy ${link.toLocaleString('cs-CZ')} · aplikace ${app.toLocaleString('cs-CZ')}`,
    completions: 'Provedení',
    completionsHint: (rate: number) => `${rate.toLocaleString('cs-CZ')} % zobrazení dojde do konce`,
    feedback: 'Zpětná vazba',
    feedbackHint: (done: number) => `${done.toLocaleString('cs-CZ')} vyřízeno`,
    value: 'Odhadovaná hodnota',
    money: (n: number) => usd(n),
    valueLocked: 'Návratnost investice přichází s vyšším tarifem',
    valueHint: (hours: number) => `${hours.toLocaleString('cs-CZ')} h ušetřeno · klepnutím zobrazíte své předpoklady`,
    chartTitle: 'Zobrazení za den',
    chartUnit: 'zobrazení',
    top: 'Nejzobrazovanější',
    topEmpty: 'Zobrazení se objeví, jakmile operátoři otevřou instrukce (tablet, QR kód, odkaz).',
    watch: 'Stojí za bližší pohled',
    unseen: (n: number) => `${n.toLocaleString('cs-CZ')} ${pl(n, 'publikovaná instrukce nebyla nikdy zobrazena', 'publikované instrukce nebyly nikdy zobrazeny', 'publikovaných instrukcí nebylo nikdy zobrazeno')}: jsou na správném pracovišti?`,
    allSeen: 'Každá publikovaná instrukce byla zobrazena.',
    openFeedback: (n: number) => `K vyřízení: ${n.toLocaleString('cs-CZ')} ${pl(n, 'podnět', 'podněty', 'podnětů')}.`,
    aiUse: (generations: number, imports: number) =>
      `Tento měsíc AI vygenerovala ${generations.toLocaleString('cs-CZ')} ${pl(generations, 'instrukci', 'instrukce', 'instrukcí')} a provedla ${imports.toLocaleString('cs-CZ')} ${pl(imports, 'import', 'importy', 'importů')}.`,
    medianDuration: (minutes: number) => `Medián provedení trvá ${minutes.toLocaleString('cs-CZ')} min.`,
  },
  roi: {
    title: 'Jak se hodnota počítá',
    intro: 'Transparentní odhad založený na vašich předpokladech: čas ušetřený psaním každé vytvořené instrukce a čas ušetřený při každém vedeném provedení (méně dotazů, méně chyb).',
    hoursPerInstruction: 'Ušetřené hodiny na instrukci',
    minutesPerCompletion: 'Minuty na provedení',
    hourlyRate: 'Hodinová sazba ($)',
    save: 'Uložit mé předpoklady',
    formula: (f) =>
      `${f.created.toLocaleString('cs-CZ')} ${pl(f.created, 'instrukce', 'instrukce', 'instrukcí')} × ${f.hoursPerInstruction.toLocaleString('cs-CZ')} h + ${f.completions.toLocaleString('cs-CZ')} ${pl(f.completions, 'provedení', 'provedení', 'provedení')} × ${f.minutesPerCompletion.toLocaleString('cs-CZ')} min = ${f.hours.toLocaleString('cs-CZ')} h × ${usd(f.hourlyRate)} = ${usd(f.value)}`,
  },
  chart: {
    total: (total: number, unit: string, days: number) => `${total.toLocaleString('cs-CZ')} ${unit} za ${days.toLocaleString('cs-CZ')} ${pl(days, 'den', 'dny', 'dní')}`,
    showChart: 'Zobrazit graf',
    showTable: 'Zobrazit tabulku',
    day: 'Den',
    bar: (date: string, value: number, unit: string) => `${date}: ${value.toLocaleString('cs-CZ')} ${unit}`,
    empty: 'Za toto období zatím nic: sloupce se objeví s prvním zobrazením.',
  },
  report: {
    title: 'Zpráva pro vedení',
    unavailableTitle: 'Zpráva tu není dostupná',
    unavailableDescription: 'Čísla zůstávají na stránce Statistiky.',
    backToStats: 'Zpět na statistiky',
    lockedTitle: 'Zpráva je součástí statistik využití',
    lockedDescription: 'Ukažte vedení ušetřený čas a jeho hodnotu: funkce se otevře s tarifem, který ji obsahuje.',
    seePlan: 'Zobrazit tarif, který ji obsahuje',
    hint: 'Zpráva pro vedení — pro odeslání zvolte „Uložit jako PDF“.',
    print: 'Vytisknout nebo uložit jako PDF',
    printShort: 'PDF',
    propose: 'Navrhnout',
    noPlan: 'Žádný tarif',
    preview: 'Náhled zprávy',
  },
  pdf: {
    docTitle: (org: string) => `Zpráva CLIP — ${org}`,
    eyebrow: (org: string) => `Zpráva CLIP · ${org}`,
    headline: (days: number) => `Co vám CLIP ušetřil za ${days.toLocaleString('cs-CZ')} ${pl(days, 'den', 'dny', 'dní')}`,
    period: (from: string, to: string) => `Od ${from} do ${to}`,
    number: (n: number) => whole(n),
    money: (n: number) => usd(Math.round(n)),
    leadEyebrow: 'Odhadovaná hodnota na základě vašich předpokladů',
    hoursSaved: (hours: number) => `Ušetřeno ${whole(hours)} ${pl(Math.abs(Math.round(hours)), 'hodina', 'hodiny', 'hodin')} při psaní instrukcí a vedení práce na pracovišti`,
    views: 'Zobrazení v provozu',
    viewsHint: (rate: number) => `${rate.toLocaleString('cs-CZ')} % dojelo do konce`,
    completions: 'Vedená provedení',
    completionsHint: 'úkoly provedené s instrukcí před očima',
    created: 'Napsané instrukce',
    createdHint: (published: number) => `celkem ${whole(published)} publikováno`,
    stations: 'Pokrytá pracoviště',
    stationsHint: 'pracoviště, která mají své instrukce',
    top: 'Nejzobrazovanější',
    topEmpty: 'Zobrazení se objeví, jakmile operátoři otevřou instrukce.',
    watch: 'Mějte na očích',
    feedback: (total: number, done: number) => `Operátoři nahlásili ${whole(total)} ${pl(Math.abs(total), 'podnět', 'podněty', 'podnětů')}, vyřízeno ${whole(done)}`,
    unseen: (n: number) => `${whole(n)} ${pl(Math.abs(n), 'publikovaná instrukce nebyla nikdy zobrazena', 'publikované instrukce nebyly nikdy zobrazeny', 'publikovaných instrukcí nebylo nikdy zobrazeno')}: umístěte je na správné pracoviště`,
    allSeen: 'Každá publikovaná instrukce byla zobrazena',
    next: 'Další krok',
    upgrade: (plan: string) => `Přejít na tarif ${plan}`,
    today: (usage: string) => `Dnes: ${usage}.`,
    perMonth: (price: string) => `${price}/měsíc`,
    perYear: (price: string) => `${price}/rok`,
    orYearly: (price: string) => `nebo ${price}`,
    ratio: (days: number, ratio: number) =>
      `Odhadovaná hodnota za těchto ${days.toLocaleString('cs-CZ')} dní odpovídá ${ratio.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })}× měsíční ceně tarifu.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `Transparentní odhad založený na předpokladech závodu: ${hoursPerInstruction.toLocaleString('cs-CZ')} h ušetřeno na každou napsanou instrukci, ${minutesPerCompletion.toLocaleString('cs-CZ')} min na každé vedené provedení, ${usd(hourlyRate)} za hodinu. Můžete je změnit v CLIP, na stránce Statistiky. Připraveno ${date}.`,
  },
}
