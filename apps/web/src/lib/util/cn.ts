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
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} Ko`
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0).replace('.', ',')} Mo`
}

const rtf = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('fr-CA', { numeric: 'auto' }) : null

export function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const diff = (Date.parse(iso) - Date.now()) / 1000
  if (!Number.isFinite(diff) || !rtf) return ''
  const abs = Math.abs(diff)
  if (abs < 60) return 'à l’instant'
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDate(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function plural(n: number, one: string, many?: string): string {
  return `${n.toLocaleString('fr-CA')} ${n > 1 ? many ?? `${one}s` : one}`
}

export function initials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
