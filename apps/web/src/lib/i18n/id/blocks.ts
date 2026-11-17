import type { blocks as Fr } from '../fr/blocks'

const num = (n: number) => n.toLocaleString('id-ID')

export const blocks: typeof Fr = {
  make: 'Buat blok bersama',
  insert: 'Sisipkan blok bersama',
  makeIntro: 'Langkah yang dipilih menjadi sebuah blok: ditulis sekali, dipakai ulang di instruksi lain, dan diperbarui di semua tempat.',
  name: 'Nama blok',
  namePlaceholder: 'Kunci mesin press P-12 (LOTO)',
  pick: 'Langkah-langkah blok',
  makeConfirm: 'Buat blok',
  made: (title: string) => `Blok “${title}” dibuat`,
  madeHint: 'Langkah-langkahnya kini diedit di dalam blok.',
  makeFailed: 'Blok tidak dibuat',
  search: 'Cari blok',
  empty: 'Belum ada blok bersama',
  emptyHint: 'Buat dari langkah-langkah sebuah instruksi (menu “…”).',
  already: 'Sudah ada di instruksi ini',
  inserted: (title: string) => `Blok “${title}” disisipkan`,
  insertFailed: 'Blok tidak disisipkan',
  steps: (n: number) => `${num(n)} langkah`,
  stepNotice: (title: string, version: number) => `Langkah dari blok bersama “${title}” (v${num(version)}): diedit di dalam blok, sekaligus di semua tempat.`,
  more: 'Tindakan blok lainnya',
  open: 'Buka blok',
  detach: 'Lepaskan',
  detachConfirm: { title: 'Lepaskan langkah-langkah ini dari blok?', description: 'Langkah-langkah ini menjadi milik instruksi ini sendiri: Anda bisa mengeditnya di sini, tetapi tidak lagi mengikuti blok.', confirm: 'Lepaskan' },
  remove: 'Hapus blok',
  removeConfirm: { title: 'Hapus blok dari instruksi ini?', description: 'Langkah-langkahnya keluar dari instruksi ini; blok tetap ada untuk instruksi lain.', confirm: 'Hapus' },
  thumb: 'Blok',
  chip: 'Blok bersama',
  editing: (n: number) => (n ? `Blok bersama yang dipakai di ${num(n)} instruksi: menerbitkannya akan memperbarui instruksi tersebut.` : 'Blok bersama: belum ada di instruksi mana pun. Sisipkan dari sebuah instruksi, menu “…”.'),
  info: 'Judul dan keterangan',
  infoOpen: 'Edit judul dan keterangan',
  infoTitle: 'Keterangan blok',
  summaryPlaceholder: 'Kegunaan blok ini, dalam satu kalimat',
  archiveDescription: (n: number) =>
    n === 0
      ? 'Blok keluar dari daftar blok. Versi-versinya tetap disimpan.'
      : n === 1
        ? 'Instruksi yang memakainya tetap menyimpan langkah-langkahnya apa adanya; untuk mengubahnya, lepaskan di sana.'
        : `${num(n)} instruksi yang memakainya tetap menyimpan langkah-langkahnya apa adanya; untuk mengubahnya, lepaskan di masing-masing instruksi.`,
  archived: 'Blok diarsipkan',
  publishImpact: (n: number) => (n ? `Menerbitkan akan memperbarui ${num(n)} instruksi: yang sudah mutakhir diterbitkan ulang, yang lain mendapat blok ini di drafnya.` : 'Belum ada instruksi yang memakainya: sisipkan di sebuah instruksi, menu “…”.'),
  propagating: (done: number, total: number) => `Memperbarui instruksi… ${num(done)} dari ${num(total)}`,
  propagated: (republished: number, drafts: number) =>
    [republished ? `${num(republished)} instruksi diterbitkan ulang` : '', drafts ? `${num(drafts)} draf diperbarui` : ''].filter(Boolean).join(' · ') || 'Tidak ada instruksi yang perlu diperbarui',
  propagateFailed: (n: number) => `${num(n)} instruksi tidak diperbarui: terbitkan blok lagi untuk mencoba ulang.`,
  filter: 'Blok bersama',
  newBlock: 'Blok baru',
  newTitle: 'Blok bersama baru',
  total: (n: number) => (n >= 1 ? `${num(n)} blok bersama` : 'Tidak ada blok bersama'),
  emptyList: 'Langkah-langkah yang muncul di mana-mana (LOTO, penyalaan mesin, APD): ditulis sekali, mutakhir di setiap instruksi. Buat di sini, atau dari langkah-langkah sebuah instruksi (menu “…”).',
  changelog: (title: string, version: number) => `Blok bersama “${title}” v${num(version)}.`,
  errors: {
    noSteps: 'Pilih setidaknya satu langkah.',
    locked: (title: string) => `Langkah ini berasal dari blok bersama “${title}”: diedit di dalam blok.`,
  },
}
