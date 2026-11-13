/**
 * L'attestation de qualification d'une personne (Académie), à imprimer : l'usine, la personne, et
 * chaque poste où elle est qualifiée aujourd'hui (qui l'a validée sur le terrain, quand, jusqu'à
 * quand). Une page autonome : elle s'imprime telle quelle, par le navigateur ou par la coquille.
 */
import type { QualificationLevel } from '../model/types'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const safeColor = (c: string | null | undefined) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : '#0078FF')
const safeUrl = (u: string | null | undefined) => (u && /^https:\/\//i.test(u) ? u : null)

export interface AttestationRow {
  stationName: string
  level: Exclude<QualificationLevel, 'none'>
  byName: string
  at: string
  validUntil: string | null
}

export interface AttestationMeta {
  orgName: string
  logoUrl?: string | null
  color?: string | null
  person: string
  rows: AttestationRow[]
  texts: { title: string; intro: string; head: string[]; none: string; printedOn: string; noExpiry: string; signature: string; levels: Record<AttestationRow['level'], string> }
  /** Une date dans la langue de l'outil. */
  date: (iso: string) => string
}

export function buildAttestationHtml(m: AttestationMeta): string {
  const color = safeColor(m.color)
  const logo = safeUrl(m.logoUrl)
  const rows = m.rows
    .map((r) => `<tr><td><b>${esc(r.stationName)}</b></td><td>${esc(m.texts.levels[r.level])}</td><td>${esc(r.byName)}</td><td>${esc(m.date(r.at))}</td><td>${esc(r.validUntil ? m.date(r.validUntil) : m.texts.noExpiry)}</td></tr>`)
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(m.texts.title)} — ${esc(m.person)}</title><style>
@page{size:letter;margin:16mm}
*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;color:#0f172a;margin:0;padding:32px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
header{display:flex;align-items:center;gap:16px;border-bottom:4px solid ${color};padding-bottom:16px;margin-bottom:28px}
header img{max-height:56px;max-width:180px;object-fit:contain}
.org{font-size:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#475569}
h1{font-size:30px;letter-spacing:-.02em;margin:0 0 6px}
.person{font-size:24px;font-weight:900;color:${color};margin:0 0 18px}
p.intro{font-size:15px;color:#334155;margin:0 0 22px;line-height:1.5}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;padding:8px 10px}
td{border-bottom:1px solid #e2e8f0;padding:10px}
.none{font-size:15px;color:#64748b;padding:16px 0}
footer{margin-top:48px;display:flex;justify-content:space-between;gap:24px;font-size:12px;color:#64748b}
.sign{border-top:1px solid #94a3b8;padding-top:6px;min-width:240px;margin-top:36px}
</style></head><body>
<header>${logo ? `<img src="${esc(logo)}" alt="">` : ''}<span class="org">${esc(m.orgName)}</span></header>
<h1>${esc(m.texts.title)}</h1>
<p class="person">${esc(m.person)}</p>
<p class="intro">${esc(m.texts.intro)}</p>
${m.rows.length ? `<table><thead><tr>${m.texts.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>` : `<p class="none">${esc(m.texts.none)}</p>`}
<footer><span>${esc(m.texts.printedOn)}</span><span class="sign">${esc(m.texts.signature)}</span></footer>
</body></html>`
}
