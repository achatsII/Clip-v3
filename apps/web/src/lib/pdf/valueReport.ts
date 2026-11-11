/**
 * Le dossier pour la direction : une page à imprimer ou à enregistrer en PDF, qui dit ce que CLIP
 * a fait gagner à l'usine sur une période — consultations au plancher, réalisations guidées,
 * instructions rédigées, temps gagné et sa valeur selon les hypothèses de l'usine — et, si la
 * personne le veut, le plan à demander. HTML autonome, styles en ligne : le navigateur ou la
 * coquille native (expo-print) l'imprime. Aucun prix n'y entre sans `proposal.price`.
 */
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

/** fr-CA sépare les milliers par une espace fine insécable, que la police serrée efface : une espace insécable ordinaire. */
const num = (n: number) => Math.round(n).toLocaleString('fr-CA').replace(/\u202f/g, '\u00a0')
const money = (n: number) => `${num(n)} $`
const plural = (n: number, one: string, many: string) => (Math.abs(n) > 1 ? many : one)
/** Une couleur de marque sûre dans du CSS ; sinon le bleu de CLIP. */
const safeColor = (c?: string | null) => (c && /^#[0-9a-f]{3,8}$/i.test(c) ? c : '#0078FF')

function tile(label: string, value: string, hint: string) {
  return `<div class="tile"><p class="eyebrow">${esc(label)}</p><p class="big">${esc(value)}</p><p class="hint">${esc(hint)}</p></div>`
}

export function buildValueReportHtml(r: ValueReport): string {
  const color = safeColor(r.color)
  const p = r.proposal
  const tiles = [
    tile('Consultations au plancher', num(r.views), `${r.completionRate} % vont jusqu’au bout`),
    tile('Réalisations guidées', num(r.completions), 'tâches faites avec l’instruction sous les yeux'),
    tile('Instructions rédigées', num(r.created), `${num(r.published)} ${plural(r.published, 'publiée', 'publiées')} au total`),
    tile('Postes équipés', `${num(r.stations.covered)} / ${num(r.stations.total)}`, 'postes qui ont leurs instructions'),
  ].join('')
  const top = r.top.filter((t) => t.views > 0).slice(0, 5)
  const topBlock = top.length
    ? `<ol class="top">${top.map((t) => `<li><span>${esc(t.title)}</span><b>${num(t.views)}</b></li>`).join('')}</ol>`
    : '<p class="muted">Les consultations apparaîtront dès que les opérateurs ouvriront les instructions.</p>'
  const watch = [
    `${num(r.feedback.total)} ${plural(r.feedback.total, 'retour signalé', 'retours signalés')} par les opérateurs, ${num(r.feedback.done)} ${plural(r.feedback.done, 'traité', 'traités')}`,
    r.unseen ? `${num(r.unseen)} ${plural(r.unseen, 'instruction publiée jamais consultée', 'instructions publiées jamais consultées')} : à placer au bon poste` : 'Toutes les instructions publiées ont été consultées',
  ]
  const proposal = p
    ? `<section class="proposal">
  <p class="eyebrow">Pour la suite</p>
  <h2>Passer au plan ${esc(p.planName)}</h2>
  <p class="pitch">${esc(p.pitch)}</p>
  ${p.usage.length ? `<p class="usage">Aujourd’hui : ${p.usage.map(esc).join(' · ')}.</p>` : ''}
  <ul>${p.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
  ${p.price ? `<p class="price">${esc(p.price)}${p.yearly ? `<small> ou ${esc(p.yearly)}</small>` : ''}</p>` : ''}
  ${p.ratio && p.ratio >= 1.5 ? `<p class="ratio">La valeur estimée de ces ${r.days} jours représente ${p.ratio.toLocaleString('fr-CA', { maximumFractionDigits: 1 })} fois le prix mensuel du plan.</p>` : ''}
</section>`
    : ''
  return `<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><title>${esc(`Bilan CLIP — ${r.orgName}`)}</title>
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
  <div class="who"><p class="eyebrow">Bilan CLIP · ${esc(r.orgName)}</p><h1>Ce que CLIP vous a fait gagner en ${r.days} jours</h1></div>
  <div class="meta">${esc(r.periodLabel)}</div>
</header>
<section class="lead">
  <p class="eyebrow">Valeur estimée, selon vos hypothèses</p>
  <p class="big">≈ ${esc(money(r.value))}</p>
  <p class="sub">${num(r.hours)} ${plural(Math.round(r.hours), 'heure gagnée', 'heures gagnées')} à rédiger et à guider les tâches au poste</p>
</section>
<div class="tiles">${tiles}</div>
<div class="cols">
  <section><h2>Les plus consultées</h2>${topBlock}</section>
  <section><h2>À surveiller</h2><ul class="watch">${watch.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></section>
</div>
${proposal}
<footer>Estimation transparente, selon les hypothèses de l’usine : ${esc(r.roi.hoursSavedPerInstruction.toLocaleString('fr-CA'))} h gagnées par instruction rédigée, ${esc(r.roi.minutesSavedPerCompletion.toLocaleString('fr-CA'))} min par réalisation guidée, ${esc(r.roi.hourlyRate.toLocaleString('fr-CA'))} $ de l’heure. Elles se modifient dans CLIP, page Statistiques. Document préparé le ${esc(r.generatedOn)}.</footer>
</body></html>`
}
