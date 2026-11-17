import type { stats as Fr } from '../fr/stats'

/** A nyomtatott dosszié egész száma. */
const whole = (n: number) => Math.round(n).toLocaleString('hu-HU')

/** A statisztikák és a vezetőségi dosszié. */
export const stats: typeof Fr = {
  page: {
    title: 'Statisztika',
    subtitle: (days: number) => `Az elmúlt ${days.toLocaleString('hu-HU')} nap: mit néznek meg a műhelyben, mit jeleznek, mennyit spórol Önnek.`,
    views: 'Megtekintések',
    viewsHint: (kiosk: number, link: number, app: number) => `Táblagépek ${kiosk.toLocaleString('hu-HU')} · hivatkozások ${link.toLocaleString('hu-HU')} · alkalmazás ${app.toLocaleString('hu-HU')}`,
    completions: 'Elvégzések',
    completionsHint: (rate: number) => `A megtekintések ${rate.toLocaleString('hu-HU')}%-a eljut a végéig`,
    feedback: 'Visszajelzések',
    feedbackHint: (done: number) => `${done.toLocaleString('hu-HU')} kezelve`,
    value: 'Becsült érték',
    money: (n: number) => `${n.toLocaleString('hu-HU')} $`,
    valueLocked: 'A megtérülés egy magasabb csomaggal érhető el',
    valueHint: (hours: number) => `${hours.toLocaleString('hu-HU')} óra megtakarítás · érintse meg a feltevések megtekintéséhez`,
    chartTitle: 'Megtekintések naponta',
    chartUnit: 'megtekintés',
    top: 'Legtöbbet megtekintett',
    topEmpty: 'A megtekintések azonnal megjelennek, amint az operátorok megnyitják az utasításokat (táblagép, QR-kód, hivatkozás).',
    watch: 'Érdemes közelebbről megnézni',
    unseen: (n: number) =>
      n !== 1
        ? `${n.toLocaleString('hu-HU')} közzétett utasítást még soha nem néztek meg: jó munkaállomáson vannak?`
        : `${n.toLocaleString('hu-HU')} közzétett utasítást még soha nem néztek meg: jó munkaállomáson van?`,
    allSeen: 'Minden közzétett utasítást megtekintettek.',
    openFeedback: (n: number) => `${n.toLocaleString('hu-HU')} visszajelzés kezelendő.`,
    aiUse: (generations: number, imports: number) =>
      `${generations.toLocaleString('hu-HU')} generálás és ${imports.toLocaleString('hu-HU')} importálás az AI-val ebben a hónapban.`,
    medianDuration: (minutes: number) => `Az elvégzések mediánideje ${minutes.toLocaleString('hu-HU')} perc.`,
  },
  roi: {
    title: 'Hogyan számoljuk az értéket',
    intro: 'Átlátható becslés az Ön feltevései alapján: az egyes létrehozott utasítások megírásán megtakarított idő, és az egyes vezetett elvégzéseken megtakarított idő (kevesebb kérdés, kevesebb hiba).',
    hoursPerInstruction: 'Utasításonként megtakarított órák',
    minutesPerCompletion: 'Percek elvégzésenként',
    hourlyRate: 'Óradíj ($)',
    save: 'Feltevések mentése',
    formula: (f) =>
      `${f.created.toLocaleString('hu-HU')} utasítás × ${f.hoursPerInstruction.toLocaleString('hu-HU')} óra + ${f.completions.toLocaleString('hu-HU')} elvégzés × ${f.minutesPerCompletion.toLocaleString('hu-HU')} perc = ${f.hours.toLocaleString('hu-HU')} óra × ${f.hourlyRate.toLocaleString('hu-HU')} $ = ${f.value.toLocaleString('hu-HU')} $`,
  },
  chart: {
    total: (total: number, unit: string, days: number) => `${total.toLocaleString('hu-HU')} ${unit} ${days.toLocaleString('hu-HU')} nap alatt`,
    showChart: 'Diagram mutatása',
    showTable: 'Táblázat mutatása',
    day: 'Nap',
    bar: (date: string, value: number, unit: string) => `${date}: ${value.toLocaleString('hu-HU')} ${unit}`,
    empty: 'Erre az időszakra még nincs adat: az oszlopok az első megtekintéssel jelennek meg.',
  },
  report: {
    title: 'Vezetőségi jelentés',
    unavailableTitle: 'A jelentés itt nem érhető el',
    unavailableDescription: 'A számok a Statisztika oldalon maradnak.',
    backToStats: 'Vissza a statisztikához',
    lockedTitle: 'A jelentés az alkalmazási statisztikák része',
    lockedDescription: 'Mutassa meg a vezetőségnek a megtakarított időt és annak értékét: a funkció a hozzá tartozó csomaggal nyílik meg.',
    seePlan: 'A hozzá tartozó csomag megtekintése',
    hint: 'Vezetőségi jelentés — az elküldéshez válassza a „Mentés PDF-ként” lehetőséget.',
    print: 'Nyomtatás vagy mentés PDF-ként',
    printShort: 'PDF',
    propose: 'Javaslat',
    noPlan: 'Nincs csomag',
    preview: 'A jelentés előnézete',
  },
  pdf: {
    docTitle: (org: string) => `CLIP jelentés — ${org}`,
    eyebrow: (org: string) => `CLIP jelentés · ${org}`,
    headline: (days: number) => `Amit a CLIP megspórolt Önnek ${days.toLocaleString('hu-HU')} nap alatt`,
    period: (from: string, to: string) => `${from} – ${to}`,
    number: (n: number) => whole(n),
    money: (n: number) => `${whole(n)} $`,
    leadEyebrow: 'Becsült érték, az Ön feltevései alapján',
    hoursSaved: (hours: number) => `${whole(hours)} óra megtakarítás az utasítások megírásán és a munkaállomáson végzett vezetett munkán`,
    views: 'Megtekintések a műhelyben',
    viewsHint: (rate: number) => `${rate.toLocaleString('hu-HU')}% a végéig követve`,
    completions: 'Vezetett elvégzések',
    completionsHint: 'az utasítás mellett elvégzett munkák',
    created: 'Megírt utasítások',
    createdHint: (published: number) => `összesen ${whole(published)} közzétéve`,
    stations: 'Lefedett munkaállomások',
    stationsHint: 'munkaállomások, amelyeknek megvannak az utasításai',
    top: 'Legtöbbet megtekintett',
    topEmpty: 'A megtekintések azonnal megjelennek, amint az operátorok megnyitják az utasításokat.',
    watch: 'Figyelendő',
    feedback: (total: number, done: number) => `${whole(total)} visszajelzés az operátoroktól, ${whole(done)} kezelve`,
    unseen: (n: number) =>
      Math.abs(n) !== 1
        ? `${whole(n)} közzétett utasítást még soha nem néztek meg: helyezze őket a megfelelő munkaállomásra`
        : `${whole(n)} közzétett utasítást még soha nem néztek meg: helyezze a megfelelő munkaállomásra`,
    allSeen: 'Minden közzétett utasítást megtekintettek',
    next: 'Következő lépés',
    upgrade: (plan: string) => `Váltás a(z) ${plan} csomagra`,
    today: (usage: string) => `Ma: ${usage}.`,
    perMonth: (price: string) => `${price}/hó`,
    perYear: (price: string) => `${price}/év`,
    orYearly: (price: string) => `vagy ${price}`,
    ratio: (days: number, ratio: number) =>
      `Ennek a ${days.toLocaleString('hu-HU')} napnak a becsült értéke ${ratio.toLocaleString('hu-HU', { maximumFractionDigits: 1 })}-szerese a csomag havi árának.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `Átlátható becslés az üzem feltevései alapján: megírt utasításonként ${hoursPerInstruction.toLocaleString('hu-HU')} óra megtakarítás, vezetett elvégzésenként ${minutesPerCompletion.toLocaleString('hu-HU')} perc, óránként ${hourlyRate.toLocaleString('hu-HU')} $. A CLIP Statisztika oldalán módosíthatja őket. Elkészítve: ${date}.`,
  },
}
