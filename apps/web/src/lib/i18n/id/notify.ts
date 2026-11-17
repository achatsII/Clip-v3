import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `Perlu disetujui: ${instruction}`,
    body: (who: string) => `${who} meminta persetujuan Anda.`,
  },
  changes: {
    title: (instruction: string) => `Perubahan diminta: ${instruction}`,
    body: (who: string, text: string) => `${who} meminta perubahan: “${text}”`,
  },
  published: {
    title: (instruction: string) => `Diterbitkan: ${instruction}`,
    body: 'Semua tanda tangan sudah masuk: instruksi sudah ada di stasiun.',
  },
  danger: {
    title: (station: string) => `Bahaya dilaporkan${station ? ` di ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `oleh ${who}` : '', text ? `“${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `Penyimpangan tercatat${station ? ` di ${station}` : ''}`,
    body: (instruction: string, who: string, text: string) => [instruction, who ? `oleh ${who}` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} menginginkan: ${what}`,
    body: (target: string) => (target ? `Termasuk dalam ${target}. Semuanya ada di Langganan dan kredit.` : 'Semuanya ada di Langganan dan kredit.'),
  },
  test: {
    title: 'Uji peringatan CLIP',
    body: 'Peringatan sampai kepada Anda.',
  },
  open: 'Buka di CLIP',
  footer: 'Anda menerima peringatan CLIP ini karena pabrik Anda memintanya. Anda bisa menghentikannya di CLIP, Akun saya.',
}
