/**
 * La fiche d'un travail fait, à imprimer ou à garder en PDF : l'instruction, qui, quand, où, et
 * chaque relevé avec son verdict et la note d'un écart. Les photos de preuve y sont en vignette.
 */
import type { Messages } from '../i18n/core'
import { answerLimits, answerValue, doneBy } from '../model/executions'
import type { Execution } from '../model/types'
import { escapeHtml } from './print'

export interface SheetMeta {
  stationName: string | null
  /** Les dates, déjà écrites dans la langue de l'outil. */
  when: string
  printedAt: string
  duration: string | null
  lang: string
}

export function executionSheet(e: Execution, t: Messages['records'], meta: SheetMeta): string {
  const rows = e.answers
    .map((a) => {
      const verdict = a.ok === true ? `<span class="ok">✓ ${escapeHtml(t.ok)}</span>` : a.ok === false ? `<span class="bad">✗ ${escapeHtml(t.bad)}</span>` : ''
      const limits = answerLimits(a, t)
      const photos = a.kind === 'photo' ? (a.photos?.length ? a.photos : typeof a.value === 'string' ? [a.value] : []).filter((u) => /^https:\/\//i.test(u)) : []
      const value = photos.length ? `<div class="pics">${photos.map((u) => `<img src="${escapeHtml(u)}" alt="">`).join('')}</div>` : `<b>${escapeHtml(answerValue(a, t))}</b>`
      const items = a.items?.length ? `<div class="items">${a.items.map((i) => `<span class="${i.state}">${escapeHtml(t.itemLine(i.label, t.itemStates[i.state]))}</span>`).join('')}</div>` : ''
      const note = a.note ? `<div class="note">${escapeHtml(t.note)} : ${escapeHtml(a.note)}</div>` : ''
      const authorized = a.authorizedBy ? `<div class="note">${escapeHtml(t.authorizedBy)} : ${escapeHtml(a.authorizedBy)}</div>` : ''
      return `<tr class="${a.ok === false ? 'dev' : ''}"><td><div class="step">${escapeHtml(a.stepTitle)}</div>${escapeHtml(a.label)}${limits ? `<div class="lim">${escapeHtml(limits)}</div>` : ''}</td><td>${value}${items}${note}${authorized}</td><td class="v">${verdict}</td></tr>`
    })
    .join('')
  const facts = [
    [t.by, doneBy(e) ?? t.nobody],
    [t.when, meta.when],
    meta.stationName ? [t.station, meta.stationName] : null,
    meta.duration ? [t.duration, meta.duration] : null,
    typeof e.version === 'number' ? [t.version(e.version), ''] : null,
  ]
    .filter((x): x is string[] => !!x)
    .map(([k, v]) => `<div><span>${escapeHtml(k)}</span>${v ? ` <b>${escapeHtml(v)}</b>` : ''}</div>`)
    .join('')
  const status = e.deviations ? `<p class="status bad">✗ ${escapeHtml(t.deviationCount(e.deviations))}</p>` : `<p class="status ok">✓ ${escapeHtml(t.conform)}</p>`
  return `<!doctype html><html lang="${escapeHtml(meta.lang)}"><head><meta charset="utf-8"><title>${escapeHtml(e.instructionTitle)}</title><style>@page{margin:14mm}body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;margin:0;font-size:13px}h1{font-size:20px;margin:0 0 6px}.facts{display:flex;flex-wrap:wrap;gap:6px 18px;color:#475569;margin-bottom:10px}.facts b{color:#0f172a}.status{font-weight:800;margin:6px 0 14px}.ok{color:#047857}.bad{color:#be123c}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;padding:6px}td{border-bottom:1px solid #e2e8f0;padding:8px 6px;vertical-align:top}tr.dev td{background:#fff1f2}.step{font-size:11px;color:#64748b}.lim{font-size:11px;color:#64748b;margin-top:2px}.note{margin-top:4px;color:#9f1239}.v{white-space:nowrap;font-weight:800}.pics{display:flex;flex-wrap:wrap;gap:6px}img{width:90px;height:90px;object-fit:cover;border-radius:8px}.items{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.items span{font-size:11px;font-weight:700;border-radius:6px;padding:2px 6px;background:#f1f5f9}.items .ok{background:#d1fae5;color:#065f46}.items .ko{background:#ffe4e6;color:#9f1239}footer{margin-top:16px;font-size:11px;color:#94a3b8}</style></head><body><h1>${escapeHtml(e.instructionTitle)}</h1><div class="facts">${facts}</div>${status}${e.answers.length ? `<table><thead><tr><th>${escapeHtml(t.answers)}</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table>` : `<p>${escapeHtml(t.noAnswers)}</p>`}<footer>${escapeHtml(t.printFooter(meta.printedAt))}</footer></body></html>`
}
