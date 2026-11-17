import type { notify as Fr } from '../fr/notify'

export const notify: typeof Fr = {
  review: {
    title: (instruction: string) => `Onaylanacak: ${instruction}`,
    body: (who: string) => `${who} onayınızı istiyor.`,
  },
  changes: {
    title: (instruction: string) => `Değişiklik istendi: ${instruction}`,
    body: (who: string, text: string) => `${who} değişiklik istiyor: “${text}”`,
  },
  published: {
    title: (instruction: string) => `Yayınlandı: ${instruction}`,
    body: 'Tüm imzalar tamam: talimat istasyonda.',
  },
  danger: {
    title: (station: string) => `${station ? `${station} istasyonunda ` : ''}tehlike bildirildi`.replace(/^./, (c) => c.toLocaleUpperCase('tr-TR')),
    body: (instruction: string, who: string, text: string) => [instruction, who ? `${who} tarafından` : '', text ? `“${text}”` : ''].filter(Boolean).join(' · '),
  },
  deviation: {
    title: (station: string) => `${station ? `${station} istasyonunda ` : ''}sapma kaydedildi`.replace(/^./, (c) => c.toLocaleUpperCase('tr-TR')),
    body: (instruction: string, who: string, text: string) => [instruction, who ? `${who} tarafından` : '', text].filter(Boolean).join(' · '),
  },
  request: {
    title: (who: string, what: string) => `${who} şunu istiyor: ${what}`,
    body: (target: string) => (target ? `${target} ile birlikte gelir. Her şey Abonelik ve krediler bölümünde.` : 'Her şey Abonelik ve krediler bölümünde.'),
  },
  test: {
    title: 'CLIP uyarı denemesi',
    body: 'Uyarılar size ulaşıyor.',
  },
  open: 'CLIP’te aç',
  footer: 'Bu CLIP uyarısını tesisiniz istediği için alıyorsunuz. CLIP’te Hesabım bölümünden durdurabilirsiniz.',
}
