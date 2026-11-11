'use client'

import { useState } from 'react'
import { locale, num, useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'

/**
 * Barres d'une seule série par jour (skill dataviz) : barres ≤ 24 px, bout arrondi de 4 px,
 * carrées à la ligne de base, 2 px d'air entre elles, info-bulle au survol et au toucher, axe
 * discret, vue en tableau. Une seule série : pas de légende, le titre la nomme.
 */
/** Haut d'axe « rond » dont la moitié est entière : les trois repères tombent sur des valeurs lisibles. */
export function niceMax(v: number) {
  if (v <= 2) return 2
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    const n = Math.round(m * p)
    if (n >= v && Number.isInteger(n / 2)) return n
  }
  return Math.ceil(v / p) * p * 2
}

export function DailyBars({ days, label, unit }: { days: Array<{ date: string; value: number }>; label: string; unit: string }) {
  const t = useMessages().stats.chart
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const max = niceMax(Math.max(0, ...days.map((d) => d.value)))
  const total = days.reduce((s, d) => s + d.value, 0)
  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
  const ticks = [0, max / 2, max]

  return (
    <figure>
      <figcaption className="mb-3 flex items-end justify-between gap-3">
        <span>
          <span className="block text-lg font-black tracking-tight">{label}</span>
          <span className="block text-sm font-bold text-slate-500 tabular-nums">{t.total(total, unit, days.length)}</span>
        </span>
        <button type="button" onClick={() => setTable((v) => !v)} className="btn-press glass-card h-10 rounded-xl px-3 text-xs font-black">
          {table ? t.showChart : t.showTable}
        </button>
      </figcaption>
      {table ? (
        <div className="max-h-72 overflow-y-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-2 font-black">{t.day}</th>
                <th className="py-2 text-right font-black">{unit}</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-t border-slate-900/5 dark:border-white/5">
                  <td className="py-1.5 font-bold">{fmt(d.date)}</td>
                  <td className="py-1.5 text-right font-black tabular-nums">{num(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative flex h-56 gap-3">
          <div className="flex flex-col justify-between pb-6 text-right text-[11px] font-bold text-slate-400 tabular-nums" aria-hidden>
            {[...ticks].reverse().map((tick, i) => (
              <span key={i}>{num(tick)}</span>
            ))}
          </div>
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden>
              {ticks.map((_, i) => (
                <span key={i} className="border-t border-dashed border-slate-900/[0.07] dark:border-white/[0.06]" />
              ))}
            </div>
            <div className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-[2px]" role="list" aria-label={label}>
              {days.map((d, i) => (
                <div
                  key={d.date}
                  role="listitem"
                  aria-label={t.bar(fmt(d.date), d.value, unit)}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onTouchStart={() => setHover(i)}
                >
                  <div className={cn('w-full max-w-6 rounded-t-[4px] bg-[#0078FF] transition-opacity dark:bg-[#1a85ff]', hover !== null && hover !== i && 'opacity-50')} style={{ height: d.value ? `${Math.max(2, (d.value / max) * 100)}%` : 0 }} />
                  {hover === i && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold whitespace-nowrap text-white shadow-lg dark:bg-white dark:text-slate-900">
                      {fmt(d.date)} · <span className="tabular-nums">{num(d.value)}</span> {unit}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {total === 0 && (
              <p className="absolute inset-x-0 top-1/3 text-center text-sm font-bold text-slate-400">{t.empty}</p>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] font-bold text-slate-400" aria-hidden>
              <span>{days[0] && fmt(days[0].date)}</span>
              <span>{days[days.length - 1] && fmt(days[days.length - 1].date)}</span>
            </div>
          </div>
        </div>
      )}
    </figure>
  )
}
