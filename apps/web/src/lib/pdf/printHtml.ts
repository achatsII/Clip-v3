/**
 * Le document imprimable d'une instruction (export PDF) : un HTML autonome, styles en ligne et
 * images en URL absolue, imprimé par le navigateur ou par la coquille native (expo-print).
 * Un code QR mène à la version à jour : le papier renvoie toujours vers l'instruction vivante.
 */
import { CATEGORIES, ENERGY, KINDS, PPE, WARNINGS } from '../model/catalog'
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

function annotationsSvg(m: StepMedia | undefined): string {
  if (!m || m.kind !== 'image' || !m.annotations?.length) return ''
  const colors: Record<string, string> = { red: '#FF2B5E', yellow: '#FFC800', green: '#18c480', blue: '#0078FF', white: '#ffffff' }
  const shapes = m.annotations
    .map((a) => {
      const c = colors[a.color] ?? '#FF2B5E'
      if (a.type === 'arrow') return `<line x1="${a.x * 1000}" y1="${a.y * 1000}" x2="${(a.x2 ?? a.x) * 1000}" y2="${(a.y2 ?? a.y) * 1000}" stroke="${c}" stroke-width="10" marker-end="url(#h)"/>`
      if (a.type === 'circle') return `<ellipse cx="${(a.x + (a.w ?? 0) / 2) * 1000}" cy="${(a.y + (a.h ?? 0) / 2) * 1000}" rx="${((a.w ?? 0.1) / 2) * 1000 + 8}" ry="${((a.h ?? 0.1) / 2) * 1000 + 8}" stroke="${c}" stroke-width="10" fill="none"/>`
      if (a.type === 'rect') return `<rect x="${a.x * 1000}" y="${a.y * 1000}" width="${(a.w ?? 0.1) * 1000}" height="${(a.h ?? 0.1) * 1000}" rx="14" stroke="${c}" stroke-width="10" fill="none"/>`
      if (a.type === 'number') return `<circle cx="${a.x * 1000}" cy="${a.y * 1000}" r="34" fill="${c}"/><text x="${a.x * 1000}" y="${a.y * 1000 + 14}" font-size="40" font-weight="900" text-anchor="middle" fill="#fff">${esc(a.text ?? '')}</text>`
      return ''
    })
    .join('')
  return `<svg class="ann" viewBox="0 0 1000 1000" preserveAspectRatio="none"><defs><marker id="h" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#FF2B5E"/></marker></defs>${shapes}</svg>`
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
        ${img ? `<div class="media"><img src="${esc(img)}" alt="">${annotationsSvg(s.media[0])}${s.media[0]?.kind === 'video' ? '<span class="vid">▶ extrait vidéo dans l’app</span>' : ''}</div>` : ''}
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
.media{position:relative;background:#0f172a;aspect-ratio:16/10}.media img{width:100%;height:100%;object-fit:contain;display:block}
.ann{position:absolute;inset:0;width:100%;height:100%}
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
