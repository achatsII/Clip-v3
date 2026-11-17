import type { auth as Fr } from '../fr/auth'

/** Connexion, inscription, mot de passe oublié, bienvenue ; l’ouverture de la session et la coquille native. */
export const auth: typeof Fr = {
  login: {
    tagline: 'Instruksi kerja',
    hero: {
      film: 'Rekam.',
      aiWrites: 'AI menulisnya.',
      floorFollows: 'Lapangan mengikutinya.',
      pitch: 'Instruksi kerja yang jelas dan visual dalam hitungan menit, ditemukan operator di stasiun yang tepat, tanpa akun.',
      inputs: 'Video, foto, catatan suara, atau PDF lama',
      generated: 'Langkah, klip video, dan peringatan yang dihasilkan',
      qrAndTablet: 'Kode QR dan tablet stasiun, tanpa akun',
    },
    titles: { login: 'Selamat datang kembali', signup: 'Buat akun Anda', forgot: 'Atur ulang kata sandi' },
    intros: {
      login: 'Masuk untuk membuat dan mengelola instruksi Anda.',
      signup: 'Gratis untuk memulai. Tanpa kartu kredit.',
      forgot: 'Kami akan mengirim tautan untuk memilih kata sandi baru.',
    },
    sent: {
      title: 'Email terkirim',
      body: (email: string) => `Jika ada akun untuk ${email}, tautannya akan sampai dalam beberapa menit.`,
      back: 'Kembali ke halaman masuk',
    },
    fullname: 'Nama Anda',
    fullnamePlaceholder: 'Budi Santoso',
    company: 'Pabrik atau perusahaan',
    optional: 'opsional',
    companyPlaceholder: 'Pabrik Cikarang',
    email: 'Email',
    emailPlaceholder: 'anda@perusahaan.com',
    password: 'Kata sandi',
    forgotLink: 'Lupa?',
    submit: { login: 'Masuk', signup: 'Buat akun saya', forgot: 'Kirim tautan' },
    /** Consent to the AI, given by signing in (Apple's rule 5.1.2(i)). */
    aiNotice: {
      login: 'Dengan masuk, Anda menyetujui bahwa AI Google menganalisis foto, video, catatan suara, dan teks Anda, dan bahwa OpenAI menerima sebuah foto saat Anda meminta gambar.',
      signup: 'Dengan membuat akun, Anda menyetujui bahwa AI Google menganalisis foto, video, catatan suara, dan teks Anda, dan bahwa OpenAI menerima sebuah foto saat Anda meminta gambar.',
    },
    privacy: 'Kebijakan privasi',
    errors: {
      email: 'Masukkan email yang valid.',
      passwordTooShort: 'Kata sandi minimal 8 karakter.',
      passwordMissing: 'Masukkan kata sandi Anda.',
    },
    newHere: 'Baru di sini?',
    createFreeAccount: 'Buat akun gratis',
    askForInvitation: 'Belum punya akun? Minta undangan dari administrator Anda.',
    haveAccount: 'Saya sudah punya akun',
    language: 'Bahasa',
  },
  welcome: {
    setup: 'Penyiapan',
    progress: (step: number, total: number) => `${step.toLocaleString('id-ID')} dari ${total.toLocaleString('id-ID')}`,
    name: {
      title: 'Apa nama pabrik Anda?',
      hint: 'Nama ini tampil di tablet stasiun dan di PDF.',
      placeholder: 'Pabrik Cikarang',
    },
    goals: {
      title: 'Apa yang ingin Anda dokumentasikan lebih dulu?',
      hint: 'Pilih sebanyak yang Anda mau. Beranda Anda disusun berdasarkan pilihan ini.',
      sstAndLockout: 'K3 dan LOTO',
    },
    approval: {
      title: 'Siapa yang menyetujui instruksi?',
      hint: 'Anda bisa mengubahnya nanti di pengaturan.',
      none: 'Tidak ada: langsung terbitkan',
      noneHint: 'Penulisnya bertanggung jawab atas isinya.',
      one: 'Seorang penyetuju memeriksa dulu',
      oneHint: 'Supervisor, mutu, atau K3: mereka melihat apa yang berubah dan menerbitkannya.',
    },
    ready: {
      title: (plant: string) => `Semua siap, ${plant}!`,
      hint: 'Instruksi pertama Anda hanya butuh beberapa menit: rekam seseorang yang mengerjakan tugas sambil menjelaskannya.',
      create: 'Buat instruksi pertama saya',
      import: 'Impor PDF lama saya',
      later: 'Nanti',
    },
    finish: 'Selesai',
    nothingPublished: 'Tidak ada yang terbit tanpa persetujuan Anda.',
  },
  session: {
    defaultOrgName: 'Pabrik saya',
    me: 'Saya',
    openFailed: 'CLIP tidak bisa dibuka',
    serverDown: 'Server sedang tidak merespons. Periksa koneksi Anda, lalu coba lagi.',
  },
  native: {
    unavailable: 'Fitur bawaan tidak tersedia',
    noResponse: 'Aplikasi seluler tidak merespons',
  },
}
