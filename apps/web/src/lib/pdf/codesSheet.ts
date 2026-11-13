/**
 * La feuille des codes de l'équipe, à imprimer et à découper : un carton par personne (son nom et
 * son code à 4 chiffres). Les codes ne s'affichent qu'une fois ; cette feuille est leur seule copie.
 */
import { escapeHtml } from './print'

export interface CodeCard {
  name: string
  pin: string
}

export function codesSheet(codes: CodeCard[], t: { printTitle: string; printHint: string }, lang: string): string {
  const cards = codes.map((c) => `<div class="card"><div class="n">${escapeHtml(c.name)}</div><div class="c">${escapeHtml(c.pin)}</div></div>`).join('')
  return `<!doctype html><html lang="${escapeHtml(lang)}"><head><meta charset="utf-8"><title>${escapeHtml(t.printTitle)}</title><style>@page{margin:14mm}body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;margin:0}h1{font-size:20px;margin:0 0 4px}p{color:#64748b;margin:0 0 16px;font-size:13px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.card{border:2px dashed #cbd5e1;border-radius:14px;padding:14px 16px;break-inside:avoid}.n{font-size:17px;font-weight:800}.c{font-size:34px;font-weight:900;letter-spacing:.25em;margin-top:6px;font-variant-numeric:tabular-nums}</style></head><body><h1>${escapeHtml(t.printTitle)}</h1><p>${escapeHtml(t.printHint)}</p><div class="grid">${cards}</div></body></html>`
}

