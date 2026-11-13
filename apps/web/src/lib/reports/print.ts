/**
 * Un rapport à imprimer (ou garder en PDF) : l'usine, le titre, la question, la période, puis chaque
 * bloc tel quel (chiffres clés avec la période d'avant, tableaux entiers, « à regarder »). Les barres
 * s'impriment en tableau : un chiffre se relit mieux qu'un dessin sur papier.
 */
import { escapeHtml } from '../pdf/print'
import type { Block } from './catalog'

export interface PrintMeta {
  orgName: string
  title: string
  question: string
  period: string
  /** « Imprimé le … », déjà écrit dans la langue de l'outil. */
  printedOn: string
  lang: string
  /** Les mots de l'en-tête des barres. */
  dayLabel: string
  previous: (value: string) => string
}

export function reportHtml(blocks: Block[], m: PrintMeta): string {
  const e = escapeHtml
  const parts = blocks.map((b) => {
    if (b.kind === 'kpis')
      return `<div class="kpis">${b.items.map((k) => `<div class="kpi"><span>${e(k.label)}</span><b>${e(k.value)}</b>${k.delta ? `<i class="${k.delta.tone}">${e(k.delta.text)}</i>` : ''}${k.previous !== null ? `<small>${e(m.previous(k.previous))}</small>` : ''}</div>`).join('')}</div>`
    if (b.kind === 'bars') return `<h2>${e(b.title)}</h2><table><thead><tr><th>${e(m.dayLabel)}</th><th class="n">${e(b.unit)}</th></tr></thead><tbody>${b.days.map((d) => `<tr><td>${e(d.date)}</td><td class="n">${d.value}</td></tr>`).join('')}</tbody></table>`
    if (b.kind === 'table')
      return `<h2>${e(b.title)}</h2>${b.hint ? `<p class="hint">${e(b.hint)}</p>` : ''}<table><thead><tr>${b.columns.map((c) => `<th${c.numeric ? ' class="n"' : ''}>${e(c.label)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${b.columns.map((c) => `<td class="${[c.numeric ? 'n' : '', r.cells[c.key]?.tone ?? ''].join(' ').trim()}">${e(r.cells[c.key]?.text ?? '')}${r.cells[c.key]?.low ? ' *' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    return `<h2>${e(b.title)}</h2>${b.items.length ? `<ul>${b.items.map((i) => `<li class="${i.tone}">${e(i.text)}</li>`).join('')}</ul>` : `<p class="hint">${e(b.empty)}</p>`}`
  })
  return `<!doctype html><html lang="${e(m.lang)}"><head><meta charset="utf-8"><title>${e(m.title)}</title><style>
@page{margin:14mm}body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;margin:0;font-size:12px}
header{border-bottom:3px solid #0078FF;padding-bottom:10px;margin-bottom:14px}.org{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#64748b}
h1{font-size:22px;margin:4px 0}.q{color:#475569;margin:0}.period{color:#475569;margin:4px 0 0;font-weight:700}
h2{font-size:15px;margin:18px 0 6px}.hint{color:#64748b;margin:0 0 6px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.kpi{border:1px solid #e2e8f0;border-radius:10px;padding:8px}.kpi span{display:block;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b}.kpi b{display:block;font-size:20px}.kpi i{font-style:normal;font-weight:800;margin-right:6px}.kpi small{color:#64748b}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;padding:4px}td{border-bottom:1px solid #e2e8f0;padding:5px 4px;vertical-align:top}.n{text-align:right}
.bad{color:#be123c}.good{color:#047857}ul{margin:0;padding-left:18px}li{margin:3px 0}footer{margin-top:16px;font-size:10px;color:#94a3b8}
</style></head><body><header><div class="org">${e(m.orgName)}</div><h1>${e(m.title)}</h1><p class="q">${e(m.question)}</p><p class="period">${e(m.period)}</p></header>${parts.join('')}<footer>${e(m.printedOn)}</footer></body></html>`
}
