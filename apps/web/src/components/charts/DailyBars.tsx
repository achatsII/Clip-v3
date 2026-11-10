'use client'

import { useState } from 'react'
import { cn } from '@/lib/util/cn'

/**
 * Barres d'une seule série par jour (skill dataviz) : barres ≤ 24 px, bout arrondi de 4 px,
 * carrées à la ligne de base, 2 px d'air entre elles, info-bulle au survol et au toucher, axe
 * discret, vue en tableau. Une seule série : pas de légende, le titre la nomme.
 */
export function DailyBars({ days, label, unit }: { days: Array<{ date: string; value: number }>; label: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const max = Math.max(1, ...days.map((d) => d.value))
  const total = days.reduce((s, d) => s + d.value, 0)
  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
  const ticks = [0, Math.round(max / 2), max]

  return (
    <figure>
      <figcaption className="mb-3 flex items-end justify-between gap-3">
        <span>
          <span className="block text-lg font-black tracking-tight">{label}</span>
          <span className="block text-sm font-bold text-slate-500 tabular-nums">
            {total.toLocaleString('fr-CA')} {unit} sur {days.length} jours
          </span>
        </span>
        <button type="button" onClick={() => setTable((t) => !t)} className="btn-press glass-card h-10 rounded-xl px-3 text-xs font-black">
          {table ? 'Voir le graphique' : 'Voir le tableau'}
        </button>
      </figcaption>
      {table ? (
        <div className="max-h-72 overflow-y-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-2 font-black">Jour</th>
                <th className="py-2 text-right font-black">{unit}</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-t border-slate-900/5 dark:border-white/5">
                  <td className="py-1.5 font-bold">{fmt(d.date)}</td>
                  <td className="py-1.5 text-right font-black tabular-nums">{d.value.toLocaleString('fr-CA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative flex h-56 gap-3">
          <div className="flex flex-col justify-between pb-6 text-right text-[11px] font-bold text-slate-400 tabular-nums" aria-hidden>
            {[...ticks].reverse().map((t, i) => (
              <span key={i}>{t}</span>
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
                  aria-label={`${fmt(d.date)} : ${d.value} ${unit}`}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onTouchStart={() => setHover(i)}
                >
                  <div className={cn('w-full max-w-6 rounded-t-[4px] bg-[#0078FF] transition-opacity dark:bg-[#1a85ff]', hover !== null && hover !== i && 'opacity-50')} style={{ height: d.value ? `${Math.max(2, (d.value / max) * 100)}%` : 0 }} />
                  {hover === i && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold whitespace-nowrap text-white shadow-lg dark:bg-white dark:text-slate-900">
                      {fmt(d.date)} · <span className="tabular-nums">{d.value.toLocaleString('fr-CA')}</span> {unit}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
