import type { stats as Fr } from '../fr/stats'

const L = 'pl-PL'
const plural = (n: number, one: string, few: string, many: string) => (n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many)
const days = (n: number) => (n === 1 ? 'dnia' : 'dni')

/** Un nombre entier du dossier imprimé. */
const whole = (n: number) => Math.round(n).toLocaleString(L)

/** Les statistiques et le dossier pour la direction. */
export const stats: typeof Fr = {
  page: {
    title: 'Statystyki',
    subtitle: (d: number) => `Ostatnie ${d.toLocaleString(L)} dni: co jest oglądane na hali, co jest zgłaszane i ile Ci to oszczędza.`,
    views: 'Wyświetlenia',
    viewsHint: (kiosk: number, link: number, app: number) => `Tablety ${kiosk.toLocaleString(L)} · linki ${link.toLocaleString(L)} · aplikacja ${app.toLocaleString(L)}`,
    completions: 'Wykonania',
    completionsHint: (rate: number) => `${rate.toLocaleString(L)}% wyświetleń dociera do końca`,
    feedback: 'Opinie',
    feedbackHint: (done: number) => `${done.toLocaleString(L)} załatwionych`,
    value: 'Szacowana wartość',
    money: (n: number) => `${n.toLocaleString(L)} $`,
    valueLocked: 'Zwrot z inwestycji jest dostępny w wyższym planie',
    valueHint: (hours: number) => `${hours.toLocaleString(L)} h zaoszczędzone · dotknij, aby zobaczyć założenia`,
    chartTitle: 'Wyświetlenia dziennie',
    chartUnit: 'wyświetleń',
    top: 'Najczęściej oglądane',
    topEmpty: 'Wyświetlenia pojawią się, gdy tylko operatorzy otworzą instrukcje (tablet, kod QR, link).',
    watch: 'Warto się przyjrzeć',
    unseen: (n: number) =>
      n !== 1
        ? `Nigdy nie wyświetlono ${n.toLocaleString(L)} opublikowanych instrukcji: czy są na właściwym stanowisku?`
        : `Nigdy nie wyświetlono ${n.toLocaleString(L)} opublikowanej instrukcji: czy jest na właściwym stanowisku?`,
    allSeen: 'Każda opublikowana instrukcja została wyświetlona.',
    openFeedback: (n: number) => `${n.toLocaleString(L)} ${plural(n, 'opinia', 'opinie', 'opinii')} do załatwienia.`,
    aiUse: (generations: number, imports: number) =>
      `W tym miesiącu AI wykonało ${generations.toLocaleString(L)} ${plural(generations, 'generowanie', 'generowania', 'generowań')} i ${imports.toLocaleString(L)} ${plural(imports, 'import', 'importy', 'importów')}.`,
    medianDuration: (minutes: number) => `Mediana czasu wykonania to ${minutes.toLocaleString(L)} min.`,
  },
  roi: {
    title: 'Jak liczona jest wartość',
    intro: 'Przejrzyste oszacowanie oparte na Twoich założeniach: czas zaoszczędzony na pisaniu każdej utworzonej instrukcji i na każdym wykonaniu z przewodnikiem (mniej pytań, mniej błędów).',
    hoursPerInstruction: 'Zaoszczędzone godziny na instrukcję',
    minutesPerCompletion: 'Minuty na wykonanie',
    hourlyRate: 'Stawka godzinowa ($)',
    save: 'Zapisz moje założenia',
    formula: (f) =>
      `${f.created.toLocaleString(L)} ${plural(f.created, 'instrukcja', 'instrukcje', 'instrukcji')} × ${f.hoursPerInstruction.toLocaleString(L)} h + ${f.completions.toLocaleString(L)} ${plural(f.completions, 'wykonanie', 'wykonania', 'wykonań')} × ${f.minutesPerCompletion.toLocaleString(L)} min = ${f.hours.toLocaleString(L)} h × ${f.hourlyRate.toLocaleString(L)} $ = ${f.value.toLocaleString(L)} $`,
  },
  chart: {
    total: (total: number, unit: string, d: number) => `${total.toLocaleString(L)} ${unit} w ciągu ${d.toLocaleString(L)} ${days(d)}`,
    showChart: 'Pokaż wykres',
    showTable: 'Pokaż tabelę',
    day: 'Dzień',
    bar: (date: string, value: number, unit: string) => `${date}: ${value.toLocaleString(L)} ${unit}`,
    empty: 'Na razie nic w tym okresie: słupki pojawią się wraz z pierwszym wyświetleniem.',
  },
  report: {
    title: 'Raport dla kierownictwa',
    unavailableTitle: 'Raport nie jest tu dostępny',
    unavailableDescription: 'Liczby pozostają na stronie Statystyk.',
    backToStats: 'Wróć do statystyk',
    lockedTitle: 'Raport należy do statystyk wdrożenia',
    lockedDescription: 'Pokaż kierownictwu zaoszczędzony czas i jego wartość: funkcja jest dostępna w planie, który ją obejmuje.',
    seePlan: 'Zobacz plan, który ją obejmuje',
    hint: 'Raport dla kierownictwa — wybierz „Zapisz jako PDF”, aby go wysłać.',
    print: 'Drukuj lub zapisz jako PDF',
    printShort: 'PDF',
    propose: 'Zaproponuj',
    noPlan: 'Brak planu',
    preview: 'Podgląd raportu',
  },
  pdf: {
    docTitle: (org: string) => `Raport CLIP — ${org}`,
    eyebrow: (org: string) => `Raport CLIP · ${org}`,
    headline: (d: number) => `Co CLIP Ci zaoszczędził w ciągu ${d.toLocaleString(L)} ${days(d)}`,
    period: (from: string, to: string) => `Od ${from} do ${to}`,
    number: (n: number) => whole(n),
    money: (n: number) => `${whole(n)} $`,
    leadEyebrow: 'Szacowana wartość, oparta na Twoich założeniach',
    hoursSaved: (hours: number) => `Zaoszczędzono ${whole(hours)} ${plural(Math.round(hours), 'godzinę', 'godziny', 'godzin')} na pisaniu instrukcji i prowadzeniu zadań na stanowisku`,
    views: 'Wyświetlenia na hali',
    viewsHint: (rate: number) => `${rate.toLocaleString(L)}% obejrzanych do końca`,
    completions: 'Wykonania z przewodnikiem',
    completionsHint: 'zadania wykonane z instrukcją przed oczami',
    created: 'Napisane instrukcje',
    createdHint: (published: number) => `${whole(published)} opublikowanych łącznie`,
    stations: 'Objęte stanowiska',
    stationsHint: 'stanowiska, które mają swoje instrukcje',
    top: 'Najczęściej oglądane',
    topEmpty: 'Wyświetlenia pojawią się, gdy tylko operatorzy otworzą instrukcje.',
    watch: 'Miej na oku',
    feedback: (total: number, done: number) => `${whole(total)} ${plural(total, 'opinia zgłoszona', 'opinie zgłoszone', 'opinii zgłoszonych')} przez operatorów, załatwionych: ${whole(done)}`,
    unseen: (n: number) =>
      Math.abs(n) !== 1
        ? `Nigdy nie wyświetlono ${whole(n)} opublikowanych instrukcji: umieść je na właściwym stanowisku`
        : `Nigdy nie wyświetlono ${whole(n)} opublikowanej instrukcji: umieść ją na właściwym stanowisku`,
    allSeen: 'Każda opublikowana instrukcja została wyświetlona',
    next: 'Następny krok',
    upgrade: (plan: string) => `Przejdź na plan ${plan}`,
    today: (usage: string) => `Dziś: ${usage}.`,
    perMonth: (price: string) => `${price}/miesiąc`,
    perYear: (price: string) => `${price}/rok`,
    orYearly: (price: string) => `lub ${price}`,
    ratio: (d: number, ratio: number) =>
      `Szacowana wartość tych ${d.toLocaleString(L)} dni to ${ratio.toLocaleString(L, { maximumFractionDigits: 1 })} razy więcej niż miesięczna cena planu.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `Przejrzyste oszacowanie oparte na założeniach zakładu: ${hoursPerInstruction.toLocaleString(L)} h zaoszczędzone na każdą napisaną instrukcję, ${minutesPerCompletion.toLocaleString(L)} min na wykonanie z przewodnikiem, ${hourlyRate.toLocaleString(L)} $ za godzinę. Możesz je zmienić w CLIP, na stronie Statystyk. Przygotowano ${date}.`,
  },
}
