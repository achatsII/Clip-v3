/**
 * Le document imprimable d'une instruction (export PDF) : un HTML autonome, styles en ligne et
 * images en URL absolue, imprimé par le navigateur ou par la coquille native (expo-print).
 * Un code QR mène à la version à jour : le papier renvoie toujours vers l'instruction vivante.
 * Il s'écrit dans la langue de l'instruction (`content.language`), pas dans celle de l'outil : les
 * titres que le lecteur des opérateurs a déjà viennent de ses mots, le reste du groupe `print`.
 */
import { strings, type PlayerStrings } from '@/components/player/i18n'
import { LANGS, messagesIn, type Messages } from '../i18n'
import { annotationsMarkup } from '../annotations/markup'
import { layoutOf } from '../model/media'
import type { Branding, InstructionContent, Step, StepMedia } from '../model/types'

/** Les mots du document : ceux du lecteur (`player`), ceux de l'impression (`print`) et ceux du métier (`catalog`). */
interface Words {
  player: PlayerStrings
  print: Messages['instructions']['print']
  catalog: Messages['catalog']
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function mediaImage(m: StepMedia | undefined): string | null {
  if (!m) return null
  if (m.kind === 'image') return m.url
  if (m.kind === 'video') return m.posterUrl ?? null
  if (m.kind === 'document') return m.pageImageUrl ?? null
  return null
}

/** L'image d'une étape et ses annotations, cadrées ensemble : la boîte prend les proportions de l'image. */
function mediaBlock(m: StepMedia | undefined, img: string, ratio: number | undefined, key: string, w: Words): string {
  const r = ratio && ratio > 0 ? ratio : null
  const marks = m?.kind === 'image' && m.annotations?.length ? annotationsMarkup(m.annotations, { ratio: r ?? 16 / 10, idPrefix: `p${key}`, print: true }) : ''
  const frame = r ? `aspect-ratio:${r};width:min(100%, calc(62mm * ${r}))` : 'aspect-ratio:16/10;width:100%'
  const vid = m?.kind === 'video' ? `<span class="vid">${w.print.videoClip}</span>` : ''
  return `<div class="media"><div class="frame" style="${frame}"><img src="${esc(img)}" alt="" style="object-fit:${r ? 'fill' : 'contain'}"><div class="ann">${marks}</div></div>${vid}</div>`
}

/** Un schéma interactif ne s'imprime pas : la page renvoie à l'app (le code QR de la version à jour). */
const htmlPlaceholder = (w: Words) => `<div class="ph">${w.print.visual}<small>${w.print.visualHint}</small></div>`

/** Les médias d'une étape selon sa disposition : un seul, ou une grille de deux à quatre. */
function stepMediaBlock(s: Step, ratios: Record<string, number> | undefined, key: string, w: Words): string {
  const layout = layoutOf(s)
  const list = layout === 'focus' ? s.media.slice(0, 1) : layout === 'compare' ? s.media.slice(0, 2) : s.media.slice(0, 4)
  const one = (m: StepMedia, k: string) => {
    if (m.kind === 'html') return htmlPlaceholder(w)
    const img = mediaImage(m)
    return img ? mediaBlock(m, img, ratios?.[img], k, w) : ''
  }
  const label = (m: StepMedia) =>
    `${m.verdict ? `<span class="verdict">${m.verdict === 'do' ? `✓ ${esc(w.player.doIt)}` : `✕ ${esc(w.player.avoid)}`}</span>` : ''}${m.caption ? `<span class="cap">${esc(m.caption)}</span>` : ''}`
  if (list.length <= 1) return list[0] ? `<div class="tile ${list[0].verdict ?? ''}">${one(list[0], key)}${label(list[0])}</div>` : ''
  return `<div class="mgrid">${list.map((m, j) => `<div class="tile ${m.verdict ?? ''}">${one(m, `${key}-${j}`)}${label(m)}</div>`).join('')}</div>`
}

export interface PrintMeta {
  branding: Branding
  version: number | null
  publishedAt?: string | null
  approvedByName?: string | null
  stationNames: string[]
  liveUrl?: string | null
  qrSvg?: string | null
  showClipMention: boolean
  draft: boolean
  /** Largeur / hauteur de chaque image (par URL), lue avant l'impression : les annotations tombent juste. */
  ratios?: Record<string, number>
}

export function buildPrintHtml(content: InstructionContent, meta: PrintMeta): string {
  // La langue de l'instruction ; un contenu d'avant les langues est en français.
  const lang = content.language || 'fr'
  const words: Words = { player: strings(lang), print: messagesIn(lang).instructions.print, catalog: messagesIn(lang).catalog }
  const t = words.print
  const p = words.player
  const cat = words.catalog
  // « fr-CA », « en-CA » ; une langue que l'outil ne parle pas garde son code.
  const htmlLang = (LANGS as readonly string[]).includes(lang) ? t.locale : lang
  const color = meta.branding.color || '#0078FF'
  const date = meta.publishedAt ? t.date(meta.publishedAt) : t.today()
  const ppe = content.ppe.map((k) => `<span class="chip">${esc((cat.ppe as Record<string, string>)[k] ?? k)}</span>`).join('')
  const steps = content.steps
    .map((s, i) => {
      const w = s.warning
      return `<article class="step">
        ${stepMediaBlock(s, meta.ratios, String(i), words)}
        <div class="body">
          <h3><span class="n">${i + 1}</span>${esc(s.title)}</h3>
          ${w ? `<p class="warn ${w.level}"><b>${t.warning(esc(cat.warnings[w.level]))}</b> ${esc(w.text)}</p>` : ''}
          ${s.text ? `<p class="text">${esc(s.text)}</p>` : ''}
          ${s.keyPoints?.length ? `<ul class="kp">${s.keyPoints.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}
        </div>
      </article>`
    })
    .join('')
  const lockout =
    content.kind === 'lockout' && content.lockout?.energyPoints.length
      ? `<section class="block"><h2>${esc(p.energy)}</h2>
        <table><thead><tr><th>${t.tag}</th><th>${t.energy}</th><th>${t.isolationDevice}</th><th>${esc(p.location)}</th><th>${esc(p.method)}</th><th>${t.verification}</th></tr></thead><tbody>
        ${content.lockout.energyPoints
          .map((e) => `<tr><td><b>${esc(e.tag)}</b></td><td>${esc((cat.energy as Record<string, string>)[e.type])}${e.magnitude ? ` — ${esc(e.magnitude)}` : ''}<br><small>${esc(e.description)}</small></td><td>${esc(e.isolationDevice)}</td><td>${esc(e.location)}</td><td>${esc(e.lockingMethod)}</td><td>${esc(e.verification)}</td></tr>`)
          .join('')}
        </tbody></table>
        ${content.lockout.material?.filter(Boolean).length ? `<p><b>${t.material}</b> ${content.lockout.material.filter(Boolean).map(esc).join(', ')}</p>` : ''}
        ${content.lockout.restartSteps?.filter(Boolean).length ? `<h3>${t.restart}</h3><ol>${content.lockout.restartSteps.filter(Boolean).map((r) => `<li>${esc(r)}</li>`).join('')}</ol>` : ''}
      </section>`
      : ''

  return `<!doctype html><html lang="${esc(htmlLang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(content.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
<style>
@page{size:letter;margin:12mm}
*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;color:#0f172a;margin:0;padding:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
header{display:flex;align-items:flex-start;gap:18px;border-bottom:4px solid ${esc(color)};padding-bottom:14px;margin-bottom:16px}
header img.logo{max-height:52px;max-width:140px;object-fit:contain}
header .t{flex:1}header h1{font-size:26px;line-height:1.1;margin:4px 0 6px;font-weight:900;letter-spacing:-.02em}
.eyebrow{font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#64748b}
.meta{font-size:12px;color:#475569;font-weight:600}
.qr{width:92px;text-align:center;font-size:8px;font-weight:800;color:#475569}.qr svg{width:92px;height:92px}
.draft{background:#fef3c7;color:#92400e;padding:6px 10px;border-radius:8px;font-weight:800;font-size:12px;margin-bottom:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.block{border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;break-inside:avoid;margin-bottom:12px}
.block h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px;color:#334155}
.chip{display:inline-block;background:#e0f2fe;color:#075985;border-radius:8px;padding:4px 8px;margin:0 6px 6px 0;font-size:12px;font-weight:800}
.safety{background:#fff1f2;border-color:#fecdd3}.safety li{font-weight:700}
.steps{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.step{border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;break-inside:avoid;page-break-inside:avoid}
.media{position:relative;background:#0f172a;display:flex;justify-content:center}.frame{position:relative}.frame img{width:100%;height:100%;display:block}
.ann{position:absolute;inset:0;container-type:inline-size}
.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:3px;background:#0f172a}.tile{position:relative}.tile.do{outline:3px solid #10b981;outline-offset:-3px}.tile.dont{outline:3px solid #f43f5e;outline-offset:-3px}
.verdict{position:absolute;left:5px;top:5px;color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:6px}.do .verdict{background:#10b981}.dont .verdict{background:#f43f5e}
.cap{display:block;background:#0f172a;color:#fff;font-size:9px;font-weight:800;padding:3px 6px}
.ph{aspect-ratio:16/10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:#f1f5f9;color:#334155;font-size:11px;font-weight:900;text-align:center}.ph small{font-size:9px;font-weight:700;color:#64748b}
.vid{position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,.6);color:#fff;font-size:9px;font-weight:800;padding:3px 6px;border-radius:6px}
.body{padding:10px 12px}.step h3{font-size:15px;margin:0 0 6px;font-weight:900;display:flex;gap:8px;align-items:flex-start}
.n{display:inline-flex;min-width:24px;height:24px;border-radius:8px;background:${esc(color)};color:#fff;align-items:center;justify-content:center;font-size:13px}
.text{font-size:13px;margin:4px 0;font-weight:600;color:#334155}.kp{margin:4px 0 0 18px;padding:0;font-size:12px;color:#334155}
.warn{font-size:12px;padding:6px 8px;border-radius:8px;margin:4px 0}.warn.danger{background:#ffe4e6;color:#9f1239}.warn.caution{background:#fef9c3;color:#854d0e}.warn.info{background:#e0f2fe;color:#075985}
table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #e2e8f0;padding:6px;text-align:left;vertical-align:top}th{background:#f1f5f9;font-size:10px;text-transform:uppercase;letter-spacing:.06em}
footer{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:10px;color:#64748b;display:flex;justify-content:space-between}
@media screen{body{max-width:900px;margin:0 auto}}
</style></head><body>
${meta.draft ? `<div class="draft">${t.draft}</div>` : ''}
<header>
  ${meta.branding.logoUrl ? `<img class="logo" src="${esc(meta.branding.logoUrl)}" alt="">` : ''}
  <div class="t">
    <div class="eyebrow">${esc(meta.branding.orgName)} · ${esc(cat.kinds[content.kind].label)} · ${esc((cat.categories as Record<string, { label: string }>)[content.category]?.label ?? '')}</div>
    <h1>${esc(content.title)}</h1>
    <div class="meta">${meta.version ? t.version(meta.version, esc(date)) : t.printedOn(esc(date))}${meta.approvedByName ? ` · ${t.approvedBy(esc(meta.approvedByName))}` : ''}${meta.stationNames.length ? ` · ${t.stations(meta.stationNames.map(esc).join(', '))}` : ''}${content.durationMin ? ` · ${t.minutes(content.durationMin)}` : ''}${content.frequency ? ` · ${esc(content.frequency)}` : ''}</div>
    ${content.summary ? `<p class="text">${esc(content.summary)}</p>` : ''}
  </div>
  ${meta.qrSvg ? `<div class="qr">${meta.qrSvg}<div>${t.upToDate}</div></div>` : ''}
</header>
<div class="grid">
  ${ppe ? `<section class="block"><h2>${esc(p.ppe)}</h2>${ppe}</section>` : ''}
  ${content.tools.filter(Boolean).length ? `<section class="block"><h2>${esc(p.tools)}</h2>${content.tools.filter(Boolean).map((tool) => `<span class="chip" style="background:#f1f5f9;color:#334155">${esc(tool)}</span>`).join('')}</section>` : ''}
</div>
${content.safety.filter(Boolean).length ? `<section class="block safety"><h2>${esc(p.safety)}</h2><ul>${content.safety.filter(Boolean).map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>` : ''}
${lockout}
<section class="steps">${steps}</section>
<footer><span>${meta.liveUrl ? t.liveUrl(esc(meta.liveUrl)) : t.mayBeStale}</span><span>${meta.showClipMention ? t.madeWithClip : ''}</span></footer>
</body></html>`
}
