/**
 * Un fichier CSV que le tableur ouvre sans surprise.
 *
 * - En français, le point-virgule sépare les colonnes et la virgule les décimales : Excel en français
 *   mettrait sinon chaque ligne entière dans une seule colonne. En anglais, la virgule et le point.
 * - Un nombre reste un nombre (sans espace de milliers), pour qu'on puisse calculer et tracer.
 * - Une cellule n'est jamais une formule : un texte qui commence par = + - @ ou une tabulation prend
 *   une apostrophe devant (un nombre négatif, lui, reste tel quel).
 */
export type CsvSep = ',' | ';'

/** Le séparateur qu'attend le tableur dans cette langue. */
export const csvSeparator = (lang: string): CsvSep => (lang === 'fr' ? ';' : ',')

const NUMBER = /^-?\d+(?:[.,]\d+)?$/

/** Un nombre pour le tableur : la virgule décimale avec le point-virgule ; jamais de bruit de calcul. */
export function csvNumber(n: number, sep: CsvSep): string {
  const s = String(Math.round(n * 1e6) / 1e6)
  return sep === ';' ? s.replace('.', ',') : s
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Une date que tout tableur comprend, à l'heure locale : « 2026-11-13 14:05 » ; sans l'heure : « 2026-11-13 ». */
export function csvDate(iso: string | null | undefined, withTime = true): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return withTime ? `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}` : day
}

export function csvCell(v: unknown, sep: CsvSep = ','): string {
  if (typeof v === 'number') return Number.isFinite(v) ? csvNumber(v, sep) : ''
  const s = v === null || v === undefined ? '' : String(v)
  const safe = /^[=+\-@\t\r]/.test(s) && !NUMBER.test(s) ? `'${s}` : s
  return safe.includes('"') || safe.includes('\n') || safe.includes('\r') || safe.includes(sep) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export const toCsv = (rows: unknown[][], sep: CsvSep = ','): string => rows.map((r) => r.map((c) => csvCell(c, sep)).join(sep)).join('\n')

/** Télécharge le CSV (le BOM fait lire les accents au tableur). */
export function downloadCsv(name: string, csv: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
