/**
 * Le dossier pour la direction : une page à imprimer ou à enregistrer en PDF, qui dit ce que CLIP
 * a fait gagner à l'usine sur une période — consultations au plancher, réalisations guidées,
 * instructions rédigées, temps gagné et sa valeur selon les hypothèses de l'usine — et, si la
 * personne le veut, le plan à demander. HTML autonome, styles en ligne : le navigateur ou la
 * coquille native (expo-print) l'imprime. Aucun prix n'y entre sans `proposal.price`. Il suit la
 * langue de l'outil : textes, `lang` du document, nombres et montants (les dates arrivent écrites).
 */
import { locale, messages } from '../i18n'
import type { Roi } from '../stats/adoption'

export interface ValueReportProposal {
  planName: string
  pitch: string
  /** Ce que le plan donne, en mots (« 25 postes », « Traduction pour les opérateurs »…). */
  lines: string[]
  /** « 299 $ / mois » ; absent dans la coquille native, où aucun prix ne s'affiche. */
  price?: string | null
  yearly?: string | null
  /** Où l'on en est des limites d'aujourd'hui (« 4 postes sur 5 »). */
  usage: string[]
  /** La valeur estimée de la période, en nombre de fois le prix mensuel (affiché à partir de 1,5). */
  ratio?: number | null
}

export interface ValueReport {
  orgName: string
  logoUrl?: string | null
  color?: string | null
  days: number
  periodLabel: string
  generatedOn: string
  views: number
  completions: number
  completionRate: number
  created: number
  published: number
  stations: { total: number; covered: number }
  hours: number
  value: number
  roi: Roi
  top: { title: string; views: number }[]
  feedback: { total: number; done: number }
  unseen: number
  proposal?: ValueReportProposal | null
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Une couleur de marque sûre dans du CSS ; sinon le bleu de CLIP. */
const safeColor = (c?: string | null) => (c && /^#[0-9a-f]{3,8}$/i.test(c) ? c : '#0078FF')

function tile(label: string, value: string, hint: string) {
  return `<div class="tile"><p class="eyebrow">${esc(label)}</p><p class="big">${esc(value)}</p><p class="hint">${esc(hint)}</p></div>`
}

export function buildValueReportHtml(r: ValueReport): string {
  // Les textes et les nombres dans la langue de l'outil, lus au moment de bâtir le dossier.
  const t = messages().stats.pdf
  const num = t.number
  const color = safeColor(r.color)
  const p = r.proposal
  const tiles = [
    tile(t.views, num(r.views), t.viewsHint(r.completionRate)),
    tile(t.completions, num(r.completions), t.completionsHint),
    tile(t.created, num(r.created), t.createdHint(r.published)),
    tile(t.stations, `${num(r.stations.covered)} / ${num(r.stations.total)}`, t.stationsHint),
  ].join('')
  const top = r.top.filter((x) => x.views > 0).slice(0, 5)
  const topBlock = top.length
    ? `<ol class="top">${top.map((x) => `<li><span>${esc(x.title)}</span><b>${num(x.views)}</b></li>`).join('')}</ol>`
    : `<p class="muted">${esc(t.topEmpty)}</p>`
  const watch = [t.feedback(r.feedback.total, r.feedback.done), r.unseen ? t.unseen(r.unseen) : t.allSeen]
  const proposal = p
    ? `<section class="proposal">
  <p class="eyebrow">${esc(t.next)}</p>
  <h2>${esc(t.upgrade(p.planName))}</h2>
  <p class="pitch">${esc(p.pitch)}</p>
  ${p.usage.length ? `<p class="usage">${t.today(p.usage.map(esc).join(' · '))}</p>` : ''}
  <ul>${p.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
  ${p.price ? `<p class="price">${esc(p.price)}${p.yearly ? `<small> ${t.orYearly(esc(p.yearly))}</small>` : ''}</p>` : ''}
  ${p.ratio && p.ratio >= 1.5 ? `<p class="ratio">${esc(t.ratio(r.days, p.ratio))}</p>` : ''}
</section>`
    : ''
  return `<!doctype html><html lang="${locale()}"><head><meta charset="utf-8"><title>${esc(t.docTitle(r.orgName))}</title>
<style>
@page{size:letter;margin:12mm}
*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;color:#0f172a;margin:0;padding:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
header{display:flex;align-items:center;gap:16px;border-bottom:4px solid ${color};padding-bottom:14px;margin-bottom:18px}
header img{height:44px;max-width:140px;object-fit:contain}
header .who{flex:1}.eyebrow{font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#64748b;margin:0}
h1{font-size:26px;line-height:1.1;letter-spacing:-.02em;margin:4px 0 0;font-weight:900}
.meta{font-size:12px;color:#475569;font-weight:600;text-align:right}
.lead{border-radius:18px;background:${color};color:#fff;padding:18px 22px;margin-bottom:16px}
.lead .big{font-size:40px;font-weight:900;letter-spacing:-.03em;margin:2px 0}.lead p{margin:0}.lead .eyebrow{color:rgba(255,255,255,.85)}
.lead .sub{font-size:13px;font-weight:700;opacity:.92}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.tile{border:1.5px solid #e2e8f0;border-radius:14px;padding:12px}.tile .big{font-size:24px;font-weight:900;margin:4px 0 2px;letter-spacing:-.02em}.tile .hint{font-size:10.5px;color:#64748b;font-weight:600;margin:0}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px;color:#334155}
.top{margin:0;padding:0;list-style:none;counter-reset:t}.top li{display:flex;gap:10px;justify-content:space-between;font-size:12.5px;font-weight:700;padding:5px 0;border-bottom:1px solid #f1f5f9}
.top li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.top li b{font-variant-numeric:tabular-nums}
.watch{margin:0;padding-left:16px;font-size:12.5px;font-weight:600;line-height:1.5}
.muted{font-size:12px;color:#64748b;font-weight:600}
.proposal{border:2px solid ${color};border-radius:18px;padding:16px 20px;margin-bottom:16px;break-inside:avoid}
.proposal h2{font-size:20px;letter-spacing:-.01em;text-transform:none;color:#0f172a;margin:2px 0 4px}
.proposal .pitch{font-size:13px;font-weight:600;color:#334155;margin:0 0 8px}.proposal .usage{font-size:12.5px;font-weight:800;margin:0 0 8px}
.proposal ul{columns:2;margin:0 0 10px;padding-left:16px;font-size:12px;font-weight:600;line-height:1.55}
.proposal .price{font-size:22px;font-weight:900;margin:0}.proposal .price small{font-size:13px;font-weight:700;color:#475569}
.proposal .ratio{font-size:12.5px;font-weight:800;color:${color};margin:6px 0 0}
footer{font-size:10.5px;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;padding-top:10px;line-height:1.5}
@media screen and (max-width:640px){body{padding:16px}header{flex-wrap:wrap}.meta{text-align:left;width:100%}.tiles{grid-template-columns:repeat(2,1fr)}.cols{grid-template-columns:1fr}.proposal ul{columns:1}.lead .big{font-size:34px}}
</style></head><body>
<header>
  ${r.logoUrl ? `<img src="${esc(r.logoUrl)}" alt="">` : ''}
  <div class="who"><p class="eyebrow">${esc(t.eyebrow(r.orgName))}</p><h1>${esc(t.headline(r.days))}</h1></div>
  <div class="meta">${esc(r.periodLabel)}</div>
</header>
<section class="lead">
  <p class="eyebrow">${esc(t.leadEyebrow)}</p>
  <p class="big">≈ ${esc(t.money(r.value))}</p>
  <p class="sub">${esc(t.hoursSaved(r.hours))}</p>
</section>
<div class="tiles">${tiles}</div>
<div class="cols">
  <section><h2>${esc(t.top)}</h2>${topBlock}</section>
  <section><h2>${esc(t.watch)}</h2><ul class="watch">${watch.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></section>
</div>
${proposal}
<footer>${esc(t.footer(r.roi.hoursSavedPerInstruction, r.roi.minutesSavedPerCompletion, r.roi.hourlyRate, r.generatedOn))}</footer>
</body></html>`
}
