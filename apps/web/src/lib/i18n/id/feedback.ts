import type { feedback as Fr } from '../fr/feedback'

/** Les retours des opérateurs. */
export const feedback: typeof Fr = {
  list: {
    search: 'Cari instruksi, kata, orang, atau stasiun',
    title: 'Masukan operator',
    subtitle: 'Apa yang dilaporkan lapangan: perbaiki langkahnya dengan satu ketukan, dan operator akan melihat versi barunya.',
    open: (n: number) => `Terbuka${n ? ` (${n.toLocaleString('id-ID')})` : ''}`,
    handled: 'Selesai ditangani',
    all: 'Semua',
    emptyOpenTitle: 'Tidak ada yang perlu ditangani',
    emptyOpenDescription: 'Operator menandai langkah yang kurang jelas dari pemutar dengan dua ketukan. Masukan mereka akan muncul di sini.',
    emptyHandledTitle: 'Belum ada masukan yang selesai ditangani',
    emptyHandledDescription: 'Masukan yang sudah Anda tangani muncul di sini.',
    untitled: 'Instruksi',
    step: (n: number) => `langkah ${n.toLocaleString('id-ID')}`,
    comment: (text: string) => `“${text}”`,
    operator: 'Operator',
    station: 'stasiun',
    sources: { kiosk: 'tablet', link: 'tautan', app: 'aplikasi' },
    photo: 'Foto terlampir',
    fix: 'Perbaiki',
    markHandled: 'Selesai',
    dismiss: 'Abaikan',
    handledBy: (name: string) => `Ditangani oleh ${name}`,
    dismissedBy: (name: string) => `Diabaikan oleh ${name}`,
    markedHandled: 'Masukan ditandai selesai ditangani',
    dismissed: 'Masukan diabaikan',
    updateFailed: 'Masukan tidak diperbarui',
  },
}
