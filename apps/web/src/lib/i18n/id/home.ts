import type { home as Fr } from '../fr/home'

/** L’accueil. */
export const home: typeof Fr = {
  greeting: {
    night: (name: string) => `Halo, ${name}`,
    morning: (name: string) => `Selamat pagi, ${name}`,
    afternoon: (name: string) => `Selamat siang, ${name}`,
    evening: (name: string) => `Selamat malam, ${name}`,
  },
  hero: {
    eyebrow: 'Instruksi baru',
    line1: 'Rekam. Ucapkan.',
    line2: 'AI yang menulisnya.',
    video: 'Video',
    voiceNote: 'Catatan suara',
    document: 'PDF atau Word',
  },
  reader: {
    find: 'Cari instruksi',
    myStations: 'Stasiun saya',
  },
  setup: {
    title: 'Siapkan pabrik Anda',
    hint: 'Beberapa menit saja, selangkah demi selangkah.',
    publish: 'Terbitkan instruksi pertama',
    station: 'Buat stasiun dan kode QR-nya',
    logo: 'Tambahkan logo pabrik',
    invite: 'Undang rekan kerja',
    standard: 'Sesuaikan standar penulisan Anda',
    hide: 'Sembunyikan penyiapan',
    hideShort: 'Sembunyikan',
    show: 'Tampilkan',
    compact: (done: number, total: number) => `Penyiapan: ${done} dari ${total}`,
  },
  tiles: {
    published: 'Diterbitkan',
    coverage: (percent: number) => `${percent.toLocaleString('id-ID')}% stasiun tercakup`,
    noStation: 'Belum ada stasiun',
    views: 'Dilihat · 7 hari',
    viewsHint: 'Tablet, kode QR, dan tautan',
    stations: 'Stasiun',
    stationsHint: 'Beserta instruksinya',
    streak: 'Beruntun',
    streakWeeks: (_weeks: number) => `minggu berturut-turut ada yang diterbitkan`,
    streakStart: 'Terbitkan sesuatu minggu ini untuk memulai rangkaian',
  },
  renewal: {
    title: (count: number) => `Perlu ditinjau (${count.toLocaleString('id-ID')})`,
    hint: 'Tanggal tinjauannya hampir tiba. Tidak ada yang berubah? Konfirmasi dengan satu ketukan.',
  },
  review: {
    title: (count: number) => `Perlu disetujui (${count.toLocaleString('id-ID')})`,
    hint: 'Langkah yang berubah ditandai di editor.',
  },
  feedback: {
    title: 'Masukan operator',
    seeAll: 'Lihat semua',
    quote: (comment: string) => `“${comment}”`,
    when: (step: number | null, ago: string) => (step === null ? ago : `Langkah ${step.toLocaleString('id-ID')} · ${ago}`),
    none: 'Tidak ada masukan baru.',
  },
  drafts: { title: 'Lanjutkan', hint: 'Draf Anda yang sedang dikerjakan' },
  forYou: { title: 'Untuk Anda', hint: 'Sesuai tanggung jawab Anda' },
  library: {
    count: (n: number) => `${n.toLocaleString('id-ID')} instruksi diterbitkan`,
    hint: 'Lapangan Anda punya pustaka yang hidup. Jaga agar tetap mutakhir dengan masukan operator.',
  },
}
