import type { stats as Fr } from '../fr/stats'

/** Basılı raporda tam sayı. */
const whole = (n: number) => Math.round(n).toLocaleString('tr-TR')

/** İstatistikler ve yönetim raporu. */
export const stats: typeof Fr = {
  page: {
    title: 'İstatistikler',
    subtitle: (days: number) => `Son ${days.toLocaleString('tr-TR')} gün: sahada neler görüntülendi, neler bildirildi, size ne kazandırdı.`,
    views: 'Görüntüleme',
    viewsHint: (kiosk: number, link: number, app: number) => `Tabletler ${kiosk.toLocaleString('tr-TR')} · bağlantılar ${link.toLocaleString('tr-TR')} · uygulama ${app.toLocaleString('tr-TR')}`,
    completions: 'Tamamlanan işler',
    completionsHint: (rate: number) => `Görüntülemelerin %${rate.toLocaleString('tr-TR')}’i sona ulaşıyor`,
    feedback: 'Geri bildirimler',
    feedbackHint: (done: number) => `${done.toLocaleString('tr-TR')} işlendi`,
    value: 'Tahmini değer',
    money: (n: number) => `$${n.toLocaleString('tr-TR')}`,
    valueLocked: 'Yatırım getirisi daha üst bir planla gelir',
    valueHint: (hours: number) => `${hours.toLocaleString('tr-TR')} saat kazanıldı · varsayımlarınızı görmek için dokunun`,
    chartTitle: 'Günlük görüntüleme',
    chartUnit: 'görüntüleme',
    top: 'En çok görüntülenen',
    topEmpty: 'Operatörler talimatları açar açmaz görüntülemeler burada görünür (tablet, QR kod, bağlantı).',
    watch: 'Yakından bakmaya değer',
    unseen: (n: number) =>
      n !== 1
        ? `${n.toLocaleString('tr-TR')} yayınlanmış talimat hiç görüntülenmedi: doğru istasyonlarda yer alıyorlar mı?`
        : `${n.toLocaleString('tr-TR')} yayınlanmış talimat hiç görüntülenmedi: doğru istasyonda yer alıyor mu?`,
    allSeen: 'Yayınlanan her talimat görüntülendi.',
    openFeedback: (n: number) => `İşlenecek ${n.toLocaleString('tr-TR')} geri bildirim var.`,
    aiUse: (generations: number, imports: number) =>
      `Bu ay yapay zekâyla ${generations.toLocaleString('tr-TR')} üretim ve ${imports.toLocaleString('tr-TR')} aktarım yapıldı.`,
    medianDuration: (minutes: number) => `Ortanca tamamlama süresi ${minutes.toLocaleString('tr-TR')} dk.`,
  },
  roi: {
    title: 'Değer nasıl hesaplanır',
    intro: 'Varsayımlarınıza dayanan şeffaf bir tahmin: oluşturulan her talimatı yazarken kazanılan zaman ve rehberli her tamamlamada kazanılan zaman (daha az soru, daha az hata).',
    hoursPerInstruction: 'Talimat başına kazanılan saat',
    minutesPerCompletion: 'Tamamlama başına dakika',
    hourlyRate: 'Saatlik ücret ($)',
    save: 'Varsayımlarımı kaydet',
    formula: (f) =>
      `${f.created.toLocaleString('tr-TR')} talimat × ${f.hoursPerInstruction.toLocaleString('tr-TR')} saat + ${f.completions.toLocaleString('tr-TR')} tamamlama × ${f.minutesPerCompletion.toLocaleString('tr-TR')} dk = ${f.hours.toLocaleString('tr-TR')} saat × $${f.hourlyRate.toLocaleString('tr-TR')} = $${f.value.toLocaleString('tr-TR')}`,
  },
  chart: {
    total: (total: number, unit: string, days: number) => `${days.toLocaleString('tr-TR')} günde ${total.toLocaleString('tr-TR')} ${unit}`,
    showChart: 'Grafiği göster',
    showTable: 'Tabloyu göster',
    day: 'Gün',
    bar: (date: string, value: number, unit: string) => `${date}: ${value.toLocaleString('tr-TR')} ${unit}`,
    empty: 'Bu dönem için henüz bir şey yok: çubuklar ilk görüntülemeyle belirecek.',
  },
  report: {
    title: 'Yönetim raporu',
    unavailableTitle: 'Rapor burada kullanılamıyor',
    unavailableDescription: 'Rakamlar İstatistikler sayfasında kalır.',
    backToStats: 'İstatistiklere dön',
    lockedTitle: 'Rapor, benimsenme istatistiklerinin parçasıdır',
    lockedDescription: 'Yönetime kazanılan zamanı ve değerini gösterin: özellik, onu içeren bir planla açılır.',
    seePlan: 'Onu içeren planı gör',
    hint: 'Yönetim raporu — göndermek için “PDF olarak kaydet” seçin.',
    print: 'Yazdır veya PDF olarak kaydet',
    printShort: 'PDF',
    propose: 'Öner',
    noPlan: 'Plan yok',
    preview: 'Rapor önizlemesi',
  },
  pdf: {
    docTitle: (org: string) => `CLIP raporu — ${org}`,
    eyebrow: (org: string) => `CLIP raporu · ${org}`,
    headline: (days: number) => `CLIP ${days.toLocaleString('tr-TR')} günde size neler kazandırdı`,
    period: (from: string, to: string) => `${from} – ${to} arası`,
    number: (n: number) => whole(n),
    money: (n: number) => `$${whole(n)}`,
    leadEyebrow: 'Varsayımlarınıza dayanan tahmini değer',
    hoursSaved: (hours: number) => `Talimat yazarken ve istasyonda işleri yönlendirirken ${whole(hours)} saat kazanıldı`,
    views: 'Sahada görüntüleme',
    viewsHint: (rate: number) => `%${rate.toLocaleString('tr-TR')} sonuna kadar izlendi`,
    completions: 'Rehberli tamamlamalar',
    completionsHint: 'talimat önlerindeyken yapılan işler',
    created: 'Yazılan talimatlar',
    createdHint: (published: number) => `toplamda ${whole(published)} yayınlandı`,
    stations: 'Kapsanan istasyonlar',
    stationsHint: 'talimatlarına sahip istasyonlar',
    top: 'En çok görüntülenen',
    topEmpty: 'Operatörler talimatları açar açmaz görüntülemeler burada görünür.',
    watch: 'Göz önünde tutun',
    feedback: (total: number, done: number) => `Operatörlerin bildirdiği ${whole(total)} geri bildirim, ${whole(done)} tanesi işlendi`,
    unseen: (n: number) => `${whole(n)} yayınlanmış talimat hiç görüntülenmedi: doğru istasyona yerleştirin`,
    allSeen: 'Yayınlanan her talimat görüntülendi',
    next: 'Sonraki adım',
    upgrade: (plan: string) => `${plan} planına geçin`,
    today: (usage: string) => `Bugün: ${usage}.`,
    perMonth: (price: string) => `${price}/ay`,
    perYear: (price: string) => `${price}/yıl`,
    orYearly: (price: string) => `veya ${price}`,
    ratio: (days: number, ratio: number) =>
      `Bu ${days.toLocaleString('tr-TR')} günün tahmini değeri, planın aylık fiyatının ${ratio.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} katıdır.`,
    footer: (hoursPerInstruction: number, minutesPerCompletion: number, hourlyRate: number, date: string) =>
      `Tesisin varsayımlarına dayanan şeffaf bir tahmin: yazılan talimat başına ${hoursPerInstruction.toLocaleString('tr-TR')} saat, rehberli tamamlama başına ${minutesPerCompletion.toLocaleString('tr-TR')} dk kazanç, saati $${hourlyRate.toLocaleString('tr-TR')}. Bunları CLIP’te İstatistikler sayfasından değiştirebilirsiniz. Hazırlanma tarihi: ${date}.`,
  },
}
