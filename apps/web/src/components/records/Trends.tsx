'use client'

import { Gauge } from 'lucide-react'
import { useId, useState } from 'react'
import { EmptyState } from '@/components/ui/States'
import { useMessages } from '@/lib/i18n'
import type { Trend } from '@/lib/model/trends'
import { cn, formatDate, formatDateTime } from '@/lib/util/cn'

/**
 * Les tendances (module Relevés) : une carte par mesure, la valeur dans le temps avec sa bande de
 * limites. Une seule teinte (la série), le vert pour la norme, le rouge pour un écart ; les textes
 * restent dans les couleurs du texte. Une bulle dit la valeur, la date et qui, au survol ou au toucher.
 */
export function Trends({ trends }: { trends: Trend[] }) {
  const t = useMessages().records
  if (!trends.length) return <EmptyState icon={<Gauge className="h-7 w-7" />} title={t.trendsEmpty} description={t.trendsEmptyHint} />
  return (
    <div className="space-y-3">
      <p className="px-1 text-sm font-bold text-slate-500">{t.trendsHint}</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {trends.map((tr) => (
          <TrendCard key={tr.key} trend={tr} />
        ))}
      </div>
    </div>
  )
}

const W = 600
const H = 150
const PAD = { l: 8, r: 8, t: 12, b: 12 }

function TrendCard({ trend }: { trend: Trend }) {
  const t = useMessages().records
  const id = useId()
  const [hover, setHover] = useState<number | null>(null)
  const pts = trend.points
  const values = pts.flatMap((p) => [p.value, p.low ?? p.value, p.high ?? p.value])
  const limits = [trend.min, trend.max].filter((x): x is number => typeof x === 'number')
  let lo = Math.min(...values, ...limits)
  let hi = Math.max(...values, ...limits)
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const span = hi - lo
  lo -= span * 0.12
  hi += span * 0.12
  const x = (i: number) => (pts.length === 1 ? W / 2 : PAD.l + (i / (pts.length - 1)) * (W - PAD.l - PAD.r))
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const fmt = (v: number) => t.value(v, trend.unit)
  const band = typeof trend.min === 'number' || typeof trend.max === 'number' ? { top: y(typeof trend.max === 'number' ? trend.max : hi), bottom: y(typeof trend.min === 'number' ? trend.min : lo) } : null
  const shown = hover !== null ? pts[hover] : null
  // La bulle reste dans la carte : alignée à gauche au début de la série, à droite à la fin.
  const at = hover !== null ? x(hover) / W : 0.5
  const align = at < 0.25 ? 'translate-x-0' : at > 0.75 ? '-translate-x-full' : '-translate-x-1/2'
  return (
    <section className="glass-panel min-w-0 rounded-[28px] p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black tracking-tight">{trend.label}</p>
          <p className="truncate text-xs font-bold text-slate-500">
            {trend.instructionTitle} · {t.trendCount(pts.length)} · <span className={trend.deviations ? 'text-rose-600 dark:text-rose-400' : ''}>{t.trendDeviations(trend.deviations)}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="label-caps text-slate-400">{t.last}</p>
          <p className={cn('text-2xl font-black tabular-nums', last.ok === false && 'text-rose-600 dark:text-rose-400')}>{fmt(last.value)}</p>
        </div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full overflow-visible" role="img" aria-labelledby={`${id}-t`} onPointerLeave={() => setHover(null)}>
          <title id={`${id}-t`}>{`${trend.label} : ${pts.map((p) => fmt(p.value)).join(', ')}`}</title>
          {/* La norme : une bande, ses bords en tirets. */}
          {band && <rect x={0} y={band.top} width={W} height={Math.max(0, band.bottom - band.top)} className="fill-emerald-500/10" />}
          {typeof trend.max === 'number' && <line x1={0} x2={W} y1={y(trend.max)} y2={y(trend.max)} className="stroke-emerald-600/60" strokeWidth={1.5} strokeDasharray="6 5" />}
          {typeof trend.min === 'number' && <line x1={0} x2={W} y1={y(trend.min)} y2={y(trend.min)} className="stroke-emerald-600/60" strokeWidth={1.5} strokeDasharray="6 5" />}
          {/* Une mesure répétée : l'écart entre la plus basse et la plus haute lecture. */}
          {pts.map((p, i) => (typeof p.low === 'number' && typeof p.high === 'number' && p.high > p.low ? <line key={`r${i}`} x1={x(i)} x2={x(i)} y1={y(p.low)} y2={y(p.high)} className="stroke-[var(--primary)]/35" strokeWidth={4} strokeLinecap="round" /> : null))}
          <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => (p.ok === false || hover === i || pts.length <= 24 ? <circle key={`p${i}`} cx={x(i)} cy={y(p.value)} r={p.ok === false ? 5.5 : hover === i ? 5 : 3.5} className={cn('stroke-white dark:stroke-[#151e2e]', p.ok === false ? 'fill-rose-600' : 'fill-[var(--primary)]')} strokeWidth={2} /> : null))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className="stroke-slate-400/60" strokeWidth={1} />}
          {/* Des cibles plus grandes que les points, pour le survol et le toucher. */}
          {pts.map((p, i) => (
            <rect key={`h${i}`} x={x(i) - Math.max(6, (W / Math.max(1, pts.length)) / 2)} y={0} width={Math.max(12, W / Math.max(1, pts.length))} height={H} fill="transparent" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} aria-label={t.pointLabel(fmt(p.value), formatDateTime(p.at))} />
          ))}
        </svg>
        {shown && (
          <div className={cn('pointer-events-none absolute top-0 z-10 w-max max-w-64 rounded-xl bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg sm:max-w-none sm:whitespace-nowrap dark:bg-white dark:text-slate-900', align)} style={{ left: `${at * 100}%` }}>
            <span className="font-black tabular-nums">{fmt(shown.value)}</span>
            {typeof shown.low === 'number' && typeof shown.high === 'number' ? ` (${t.value(shown.low, '')}–${t.value(shown.high, '')}, ${t.mean})` : ''} · {formatDateTime(shown.at)}
            {shown.who ? ` · ${shown.who}` : ''}
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-400">
        <span>{formatDate(pts[0].at)}</span>
        <span>{pts.length > 1 ? formatDate(last.at) : ''}</span>
      </div>
    </section>
  )
}
