import { getLang, locale, messages } from '@/lib/i18n'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return ''
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (!m) return `${s} s`
  return `${m} min${s ? ` ${String(s).padStart(2, '0')}` : ''}`
}

export function formatClock(sec: number): string {
  const t = Math.max(0, Math.floor(sec))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export function formatBytes(n?: number | null): string {
  if (!n || n <= 0) return ''
  const t = messages().common
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} ${t.kilobytes}`
  const mb = n / (1024 * 1024)
  return `${mb.toLocaleString(locale(), { maximumFractionDigits: mb < 10 ? 1 : 0, minimumFractionDigits: mb < 10 ? 1 : 0 })} ${t.megabytes}`
}

const relative = new Map<string, Intl.RelativeTimeFormat>()

export function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const diff = (Date.parse(iso) - Date.now()) / 1000
  if (!Number.isFinite(diff) || typeof Intl === 'undefined') return ''
  const loc = locale()
  let rtf = relative.get(loc)
  if (!rtf) relative.set(loc, (rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' })))
  const abs = Math.abs(diff)
  if (abs < 60) return messages().common.justNow
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
  return new Date(iso).toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDate(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * « 3 étapes » : le nombre dans la langue de l'outil et le mot qu'on lui donne, déjà traduit.
 * Le pluriel suit la règle de la langue (en français, 0 et 1 sont au singulier). Pour une phrase,
 * préférer une fonction du dictionnaire.
 */
export function plural(n: number, one: string, many?: string): string {
  const several = getLang() === 'fr' ? n > 1 : n !== 1
  return `${n.toLocaleString(locale())} ${several ? many ?? `${one}s` : one}`
}

export function initials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
