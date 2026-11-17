import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('tr-TR')

export const blocks: typeof Fr = {
  make: 'Ortak blok yap',
  insert: 'Ortak blok ekle',
  makeIntro: 'Seçilen adımlar bir blok olur: bir kez yazılır, diğer talimatlarda yeniden kullanılır ve her yerde güncellenir.',
  name: 'Blok adı',
  namePlaceholder: 'P-12 presini kilitle',
  pick: 'Bloğun adımları',
  makeConfirm: 'Bloğu yap',
  made: (title: string) => `“${title}” bloğu oluşturuldu`,
  madeHint: 'Adımları artık blokta düzenlenir.',
  makeFailed: 'Blok oluşturulamadı',
  search: 'Blok ara',
  empty: 'Henüz ortak blok yok',
  emptyHint: 'Bir talimatın adımlarından yapın (“…” menüsü).',
  already: 'Zaten bu talimatta',
  inserted: (title: string) => `“${title}” bloğu eklendi`,
  insertFailed: 'Blok eklenemedi',
  steps: (n: number) => `${num(n)} adım`,
  stepNotice: (title: string, version: number) => `“${title}” ortak bloğundan bir adım (v${num(version)}): blokta, her yerde aynı anda düzenlenir.`,
  more: 'Diğer blok işlemleri',
  open: 'Bloğu aç',
  detach: 'Ayır',
  detachConfirm: { title: 'Bu adımlar bloktan ayrılsın mı?', description: 'Bu talimatın kendi adımları olurlar: burada düzenleyebilirsiniz ama artık bloğu izlemezler.', confirm: 'Ayır' },
  remove: 'Bloğu kaldır',
  removeConfirm: { title: 'Blok bu talimattan kaldırılsın mı?', description: 'Adımları bu talimattan çıkar; blok diğerleri için kalır.', confirm: 'Kaldır' },
  thumb: 'Blok',
  chip: 'Ortak blok',
  editing: (n: number) => (n ? `${num(n)} talimatta kullanılan ortak blok: yayınlamak onları günceller.` : 'Ortak blok: henüz hiçbir talimatta yok. Bir talimattan, “…” menüsüyle ekleyin.'),
  info: 'Başlık ve ayrıntılar',
  infoOpen: 'Başlığı ve ayrıntıları düzenle',
  infoTitle: 'Blok ayrıntıları',
  summaryPlaceholder: 'Bu blok ne için, tek cümleyle',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Blok listesinden çıkar. Sürümleri saklanır.'
      : n === 1
        ? 'Kullanan talimat adımlarını olduğu gibi korur; değiştirmek için orada ayırın.'
        : `Kullanan ${num(n)} talimat adımlarını olduğu gibi korur; değiştirmek için her birinde ayırın.`,
  archived: 'Blok arşivlendi',
  publishImpact: (n: number) => (n ? `Yayınlamak ${num(n)} talimatı günceller: güncel olanlar yeniden yayınlanır, diğerlerinin taslağına blok eklenir.` : 'Henüz hiçbir talimat kullanmıyor: bir talimata, “…” menüsüyle ekleyin.'),
  propagating: (done: number, total: number) => `Talimatlar güncelleniyor… ${num(done)} / ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} talimat yeniden yayınlandı` : '', drafts ? `${num(drafts)} taslak güncellendi` : ''].filter(Boolean).join(' · ') || 'Güncellenecek talimat yok',
  propagateFailed: (n: number) => `${num(n)} talimat güncellenemedi: yeniden denemek için bloğu tekrar yayınlayın.`,
  filter: 'Ortak bloklar',
  newBlock: 'Yeni blok',
  newTitle: 'Yeni ortak blok',
  total: (n: number) => (n > 1 ? `${num(n)} ortak blok` : n === 1 ? '1 ortak blok' : 'Ortak blok yok'),
  emptyList: 'Her yerde tekrar eden adımlar (kilitleme, başlatma, KKD): bir kez yazılır, her talimatta güncel kalır. Burada veya bir talimatın adımlarından (“…” menüsü) oluşturun.',
  changelog: (title: string, version: number) => `“${title}” ortak bloğu v${num(version)}.`,
  errors: {
    noSteps: 'En az bir adım seçin.',
    locked: (title: string) => `Bu adım “${title}” ortak bloğundan geliyor: blokta düzenlenir.`,
  },
}
