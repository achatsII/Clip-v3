/**
 * Le document imprimable d'une instruction (export PDF) : un HTML autonome, styles en ligne et
 * images en URL absolue, imprimé par le navigateur ou par la coquille native (expo-print).
 * Un code QR mène à la version à jour : le papier renvoie toujours vers l'instruction vivante.
 */
import { CATEGORIES, ENERGY, KINDS, PPE, WARNINGS } from '../model/catalog'
import { annotationsMarkup } from '../annotations/markup'
import type { Branding, InstructionContent, StepMedia } from '../model/types'

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
  return m.pageImageUrl ?? null
}

/** L'image d'une étape et ses annotations, cadrées ensemble : la boîte prend les proportions de l'image. */
function mediaBlock(m: StepMedia | undefined, img: string, ratio: number | undefined, key: string): string {
  const r = ratio && ratio > 0 ? ratio : null
  const marks = m?.kind === 'image' && m.annotations?.length ? annotationsMarkup(m.annotations, { ratio: r ?? 16 / 10, idPrefix: `p${key}`, print: true }) : ''
  const frame = r ? `aspect-ratio:${r};width:min(100%, calc(62mm * ${r}))` : 'aspect-ratio:16/10;width:100%'
  const vid = m?.kind === 'video' ? '<span class="vid">▶ extrait vidéo dans l’app</span>' : ''
  return `<div class="media"><div class="frame" style="${frame}"><img src="${esc(img)}" alt="" style="object-fit:${r ? 'fill' : 'contain'}"><div class="ann">${marks}</div></div>${vid}</div>`
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
  const color = meta.branding.color || '#0078FF'
  const date = meta.publishedAt ? new Date(meta.publishedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('fr-CA')
  const ppe = content.ppe.map((p) => `<span class="chip">${esc(PPE[p] ?? p)}</span>`).join('')
  const steps = content.steps
    .map((s, i) => {
      const img = mediaImage(s.media[0])
      const w = s.warning
      return `<article class="step">
        ${img ? mediaBlock(s.media[0], img, meta.ratios?.[img], String(i)) : ''}
        <div class="body">
          <h3><span class="n">${i + 1}</span>${esc(s.title)}</h3>
          ${w ? `<p class="warn ${w.level}"><b>${esc(WARNINGS[w.level].label)} :</b> ${esc(w.text)}</p>` : ''}
          ${s.text ? `<p class="text">${esc(s.text)}</p>` : ''}
          ${s.keyPoints?.length ? `<ul class="kp">${s.keyPoints.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}
        </div>
      </article>`
    })
    .join('')
  const lockout =
    content.kind === 'lockout' && content.lockout?.energyPoints.length
      ? `<section class="block"><h2>Sources d’énergie à isoler</h2>
        <table><thead><tr><th>Repère</th><th>Énergie</th><th>Dispositif d’isolement</th><th>Emplacement</th><th>Cadenassage</th><th>Vérification</th></tr></thead><tbody>
        ${content.lockout.energyPoints
          .map((e) => `<tr><td><b>${esc(e.tag)}</b></td><td>${esc(ENERGY[e.type]?.label)}${e.magnitude ? ` — ${esc(e.magnitude)}` : ''}<br><small>${esc(e.description)}</small></td><td>${esc(e.isolationDevice)}</td><td>${esc(e.location)}</td><td>${esc(e.lockingMethod)}</td><td>${esc(e.verification)}</td></tr>`)
          .join('')}
        </tbody></table>
        ${content.lockout.material?.filter(Boolean).length ? `<p><b>Matériel :</b> ${content.lockout.material.filter(Boolean).map(esc).join(', ')}</p>` : ''}
        ${content.lockout.restartSteps?.filter(Boolean).length ? `<h3>Retrait des cadenas et remise en marche</h3><ol>${content.lockout.restartSteps.filter(Boolean).map((r) => `<li>${esc(r)}</li>`).join('')}</ol>` : ''}
      </section>`
      : ''

  return `<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
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
.vid{position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,.6);color:#fff;font-size:9px;font-weight:800;padding:3px 6px;border-radius:6px}
.body{padding:10px 12px}.step h3{font-size:15px;margin:0 0 6px;font-weight:900;display:flex;gap:8px;align-items:flex-start}
.n{display:inline-flex;min-width:24px;height:24px;border-radius:8px;background:${esc(color)};color:#fff;align-items:center;justify-content:center;font-size:13px}
.text{font-size:13px;margin:4px 0;font-weight:600;color:#334155}.kp{margin:4px 0 0 18px;padding:0;font-size:12px;color:#334155}
.warn{font-size:12px;padding:6px 8px;border-radius:8px;margin:4px 0}.warn.danger{background:#ffe4e6;color:#9f1239}.warn.caution{background:#fef9c3;color:#854d0e}.warn.info{background:#e0f2fe;color:#075985}
table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #e2e8f0;padding:6px;text-align:left;vertical-align:top}th{background:#f1f5f9;font-size:10px;text-transform:uppercase;letter-spacing:.06em}
footer{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:10px;color:#64748b;display:flex;justify-content:space-between}
@media screen{body{max-width:900px;margin:0 auto}}
</style></head><body>
${meta.draft ? '<div class="draft">Brouillon — non publié</div>' : ''}
<header>
  ${meta.branding.logoUrl ? `<img class="logo" src="${esc(meta.branding.logoUrl)}" alt="">` : ''}
  <div class="t">
    <div class="eyebrow">${esc(meta.branding.orgName)} · ${esc(KINDS[content.kind].label)} · ${esc(CATEGORIES[content.category]?.label ?? '')}</div>
    <h1>${esc(content.title)}</h1>
    <div class="meta">${meta.version ? `Version ${meta.version} du ${esc(date)}` : `Imprimé le ${esc(date)}`}${meta.approvedByName ? ` · Approuvée par ${esc(meta.approvedByName)}` : ''}${meta.stationNames.length ? ` · Poste : ${meta.stationNames.map(esc).join(', ')}` : ''}${content.durationMin ? ` · ${content.durationMin} min` : ''}${content.frequency ? ` · ${esc(content.frequency)}` : ''}</div>
    ${content.summary ? `<p class="text">${esc(content.summary)}</p>` : ''}
  </div>
  ${meta.qrSvg ? `<div class="qr">${meta.qrSvg}<div>Version à jour</div></div>` : ''}
</header>
<div class="grid">
  ${ppe ? `<section class="block"><h2>Équipements de protection</h2>${ppe}</section>` : ''}
  ${content.tools.filter(Boolean).length ? `<section class="block"><h2>Outils et matériel</h2>${content.tools.filter(Boolean).map((t) => `<span class="chip" style="background:#f1f5f9;color:#334155">${esc(t)}</span>`).join('')}</section>` : ''}
</div>
${content.safety.filter(Boolean).length ? `<section class="block safety"><h2>Mises en garde</h2><ul>${content.safety.filter(Boolean).map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>` : ''}
${lockout}
<section class="steps">${steps}</section>
<footer><span>${meta.liveUrl ? `Version à jour : ${esc(meta.liveUrl)}` : 'Toute copie imprimée peut être périmée : vérifiez la version dans l’app.'}</span><span>${meta.showClipMention ? 'Créé avec CLIP' : ''}</span></footer>
</body></html>`
}
