import type { stats as Fr } from '../fr/stats'

const whole = (n: number) => Math.round(n).toLocaleString('ro-RO')
const de = (n: number) => (new Intl.PluralRules('ro-RO').select(n) === 'other' ? 'de ' : '')

/** Les statistiques et le dossier pour la direction. */
export const stats: typeof Fr = {
  page: {
    title: 'Statistici',
    subtitle: (days: number) => `Ultimele ${days.toLocaleString('ro-RO')} ${de(days)}zile: ce se vizualizează în producție, ce se raportează, ce economisiți.`,
    views: 'Vizualizări',
    viewsHint: (kiosk: number, link: number, app: number) => `Tablete ${kiosk.toLocaleString('ro-RO')} · linkuri ${link.toLocaleString('ro-RO')} · aplicație ${app.toLocaleString('ro-RO')}`,
    completions: 'Execuții',
    completionsHint: (rate: number) => `${rate.toLocaleString('ro-RO')}% din vizualizări ajung la capăt`,
    feedback: 'Reacții',
    feedbackHint: (done: number) => `${done.toLocaleString('ro-RO')} tratate`,
    value: 'Valoare estimată',
    money: (n: number) => `${n.toLocaleString('ro-RO')} $`,
    valueLocked: 'Rentabilitatea investiției vine cu un plan superior',
    valueHint: (hours: number) => `${hours.toLocaleString('ro-RO')} h economisite · atingeți pentru a vedea ipotezele`,
    chartTitle: 'Vizualizări pe zi',
    chartUnit: 'vizualizări',
    top: 'Cele mai vizualizate',
    topEmpty: 'Vizualizările vor apărea de îndată ce operatorii deschid instrucțiunile (tabletă, cod QR, link).',
    watch: 'Merită o privire mai atentă',
    unseen: (n: number) =>
      n !== 1
        ? `${n.toLocaleString('ro-RO')} ${de(n)}instrucțiuni publicate nu au fost vizualizate niciodată: sunt la postul potrivit?`
        : `${n.toLocaleString('ro-RO')} instrucțiune publicată nu a fost vizualizată niciodată: este la postul potrivit?`,
    allSeen: 'Fiecare instrucțiune publicată a fost vizualizată.',
    openFeedback: (n: number) => `${n.toLocaleString('ro-RO')} ${n === 1 ? 'reacție de tratat' : `${de(n)}reacții de tratat`}.`,
    aiUse: (generations: number, imports: number) =>
      `${generations.toLocaleString('ro-RO')} ${generations === 1 ? 'generare' : `${de(generations)}generări`} și ${imports.toLocaleString('ro-RO')} ${imports === 1 ? 'import' : `${de(imports)}importuri`} de către AI luna aceasta.`,
    medianDuration: (minutes: number) => `Durata mediană a unei execuții este de ${minutes.toLocaleString('ro-RO')} min.`,
  },
  roi: {
    title: 'Cum se calculează valoarea',
    intro: 'O estimare transparentă, bazată pe ipotezele dumneavoastră: timpul economisit la redactarea fiecărei instrucțiuni create și timpul economisit la fiecare execuție ghidată (mai puține întrebări, mai puține greșeli).',
    hoursPerInstruction: 'Ore economisite pe instrucțiune',
    minutesPerCompletion: 'Minute pe execuție',
    hourlyRate: 'Tarif orar ($)',
    save: 'Salvează ipotezele mele',
    formula: (f) =>
      `${f.created.toLocaleString('ro-RO')} ${f.created === 1 ? 'instrucțiune' : `${de(f.created)}instrucțiuni`} × ${f.hoursPerInstruction.toLocaleString('ro-RO')} h + ${f.completions.toLocaleString('ro-RO')} ${f.completions === 1 ? 'execuție' : `${de(f.completions)}execuții`} × ${f.minutesPerCompletion.toLocaleString('ro-RO')} min = ${f.hours.toLocaleString('ro-RO')} h × ${f.hourlyRate.toLocaleString('ro-RO')} $ = ${f.value.toLocaleString('ro-RO')} $`,
  },
  chart: {
    total: (total: number, unit: string, days: number) => `${total.toLocaleString('ro-RO')} ${unit} în ${days.toLocaleString('ro-RO')} ${days === 1 ? 'zi' : `${de(days)}zile`}`,
    showChart: 'Arată graficul',
    showTable: 'Arată tabelul',
    day: 'Zi',
    bar: (date: string, value: number, unit: string) => `${date}: ${value.toLocaleString('ro-RO')} ${unit}`,
    empty: 'Încă nimic pentru această perioadă: barele vor apărea la prima vizualizare.',
  },
  report: {
    title: 'Raport pentru conducere',
    unavailableTitle: 'Raportul nu este disponibil aici',
    unavailableDescription: 'Cifrele rămân pe pagina Statistici.',
    backToStats: 'Înapoi la statistici',
    lockedTitle: 'Raportul face parte din statisticile de adopție',
    lockedDescription: 'Arătați conducerii timpul economisit și cât valorează: funcția se deschide cu un plan care o include.',
    seePlan: 'Vezi planul care o include',
    hint: 'Raport pentru conducere — alegeți „Salvare ca PDF” pentru a-l trimite.',
    print: 'Tipărește sau salvează ca PDF',
    printShort: 'PDF',
    propose: 'Propune',
    noPlan: 'Fără plan',
    preview: 'Previzualizarea raportului',
  },
  pdf: {
    docTitle: (org: string) => `Raport CLIP — ${org}`,
    eyebrow: (org: string) => `Raport CLIP · ${org}`,
    headline: (days: number) => `Ce v-a economisit CLIP în ${days.toLocaleString('ro-RO')} ${days === 1 ? 'zi' : `${de(days)}zile`}`,
    period: (from: string, to: string) => `De la ${from} până la ${to}`,
    number: (n: number) => whole(n),
    money: (n: number) => `${whole(n)} $`,
    leadEyebrow: 'Valoare estimată, pe baza ipotezelor dumneavoastră',
    hoursSaved: (hours: number) => `${whole(hours)} ${Math.abs(Math.round(hours)) === 1 ? 'oră economisită' : `${de(Math.abs(Math.round(hours)))}ore economisite`} la redactarea instrucțiunilor și la ghidarea sarcinilor la post`,
    views: 'Vizualizări în producție',
    viewsHint: (rate: number) => `${rate.toLocaleString('ro-RO')}% urmărite până la capăt`,
    completions: 'Execuții ghidate',
    completionsHint: 'sarcini făcute cu instrucțiunea în față',
    created: 'Instrucțiuni redactate',
    createdHint: (published: number) => `${whole(published)} publicate în total`,
    stations: 'Posturi acoperite',
    stationsHint: 'posturi care își au instrucțiunile',
    top: 'Cele mai vizualizate',
    topEmpty: 'Vizualizările vor apărea de îndată ce operatorii deschid instrucțiunile.',
    watch: 'De urmărit',
    feedback: (total: number, done: number) => `${whole(total)} ${Math.abs(total) === 1 ? 'reacție raportată' : `${de(Math.abs(total))}reacții raportate`} de operatori, ${whole(done)} tratate`,
    unseen: (n: number) =>
      Math.abs(n) !== 1
        ? `${whole(n)} ${de(Math.abs(n))}instrucțiuni publicate nu au fost vizualizate niciodată: plasați-le la postul potrivit`
        : `${whole(n)} instrucțiune publicată nu a fost vizualizată niciodată: plasați-o la postul potrivit`,
    allSeen: 'Fiecare instrucțiune publicată a fost vizualizată',
    next: 'Pasul următor',
    upgrade: (plan: string) => `Treceți la planul ${plan}`,
    today: (usage: string) => `Astăzi: ${usage}.`,
    perMonth: (price: string) => `${price}/lună`,
    perYear: (price: string) => `${price}/an`,
    orYearly: (price: string) => `sau ${price}`,
    ratio: (days: number, ratio: number) =>
      `Valoarea estimată a acestor ${days.toLocaleString('ro-RO')} ${de(days)}zile este de ${ratio.toLocaleString('ro-RO', { maximumFractionDigits: 1 })} ori prețul lunar al planului.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `O estimare transparentă, bazată pe ipotezele fabricii: ${hoursPerInstruction.toLocaleString('ro-RO')} h economisite pe instrucțiune redactată, ${minutesPerCompletion.toLocaleString('ro-RO')} min pe execuție ghidată, ${hourlyRate.toLocaleString('ro-RO')} $ pe oră. Le puteți modifica în CLIP, pe pagina Statistici. Pregătit la ${date}.`,
  },
}
