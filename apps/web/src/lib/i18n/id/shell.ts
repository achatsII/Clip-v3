import type { shell as Fr } from '../fr/shell'

/** La coquille : navigation, menus, compte, lecteur de code. */
export const shell: typeof Fr = {
  opening: 'Membuka CLIP…',
  mainNav: 'Navigasi utama',
  nav: {
    home: 'Beranda',
    instructions: 'Instruksi',
    stations: 'Stasiun',
    feedback: 'Masukan',
    stats: 'Statistik',
    team: 'Tim',
    records: 'Register',
    import: 'Impor dokumen',
    billing: 'Paket dan kredit',
    settings: 'Pengaturan',
    more: 'Lainnya',
  },
  newInstruction: 'Instruksi baru',
  account: 'Akun saya',
  appearance: 'Tampilan',
  signOut: 'Keluar',
  version: {
    short: (v: string) => `CLIP ${v}`,
    label: (v: string) => `Versi ${v}`,
    built: (date: string) => `dirilis pada ${date}`,
    app: (platform: 'ios' | 'android', v: string, build?: string) => `Aplikasi ${platform === 'ios' ? 'iPhone' : 'Android'} ${v}${build ? ` (${build})` : ''}`,
    title: 'Tentang CLIP',
    hint: 'Angka terakhir naik setiap pembaruan: bandingkan dengan angka yang diberitahukan kepada Anda.',
  },
  aiConsent: {
    title: 'Sebelum memakai AI',
    body: 'Untuk menulis dan mengedit instruksi Anda, CLIP mengirim foto, video, catatan suara, dan teks Anda ke layanan kecerdasan buatan dari Google dan OpenAI, melalui platform Intelligence Industrielle.',
    more: 'Tidak ada yang dikirim tanpa persetujuan Anda. Anda bisa menariknya kembali di Pengaturan › Data.',
    privacy: 'Kebijakan privasi',
    accept: 'Saya setuju',
    refuse: 'Jangan sekarang',
  },
  live: {
    editingElsewhere: (title: string, device: 'app' | 'web') => `Anda sedang mengedit ${title ? `“${title}”` : 'sebuah instruksi'} dari ${device === 'app' ? 'aplikasi seluler' : 'komputer lain'}`,
  },
  scan: {
    title: 'Pindai kode',
    prompt: 'Pindai kode stasiun atau komponen',
    failed: 'Pemindai kode tidak terbuka',
    aim: 'Arahkan ke kode QR atau barcode',
    noCamera: 'Kamera tidak tersedia. Izinkan di browser Anda, atau ketik kodenya di kolom pencarian.',
  },
}
