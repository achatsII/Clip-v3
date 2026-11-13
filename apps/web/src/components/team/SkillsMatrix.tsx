'use client'

import { useQuery } from '@tanstack/react-query'
import { Check, CircleDashed, GraduationCap, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { useInstructions, useStations } from '@/hooks/queries'
import type { Doc } from '@/lib/gateway/data'
import { useMessages } from '@/lib/i18n'
import { buildMatrix, listTrainings, type CellState, type MatrixCell } from '@/lib/model/training'
import type { Operator } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

export const TRAININGS_KEY = ['trainings'] as const

/** L'apparence de chaque état : une couleur, et toujours une icône ou un compte (jamais la couleur seule). */
const LOOK: Record<CellState, string> = {
  done: 'bg-emerald-500 text-white',
  partial: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100',
  outdated: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
  none: 'border-2 border-dashed border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500',
}

function Mark({ cell }: { cell: MatrixCell }) {
  if (cell.state === 'done') return <Check className="h-5 w-5" strokeWidth={3} />
  if (cell.state === 'outdated') return <RotateCcw className="h-5 w-5" strokeWidth={2.5} />
  if (cell.state === 'none') return <CircleDashed className="h-5 w-5" />
  return <span className="text-xs font-black tabular-nums">{`${cell.done}/${cell.required.length}`}</span>
}

const ICONS: Record<CellState, ReactNode> = {
  done: <Check className="h-4 w-4" strokeWidth={3} />,
  partial: <span className="text-[10px] font-black">1/2</span>,
  none: <CircleDashed className="h-4 w-4" />,
  outdated: <RotateCcw className="h-4 w-4" />,
}

/**
 * La matrice de compétences (toggle `training`) : les personnes en lignes, les postes qui ont
 * quelque chose à apprendre en colonnes. Une case dit si la personne est formée à toutes les
 * instructions du poste ; touchée, elle dit lesquelles manquent.
 */
export function SkillsMatrix({ operators, query }: { operators: Doc<Operator>[]; query: (o: Doc<Operator>) => boolean }) {
  const t = useMessages().training
  const { data } = useSession()
  const stations = useStations()
  const instructions = useInstructions()
  const trainings = useQuery({ queryKey: TRAININGS_KEY, queryFn: () => listTrainings(data) })
  const [onlyGaps, setOnlyGaps] = useState(false)
  const [open, setOpen] = useState<{ person: string; station: string; cell: MatrixCell } | null>(null)
  const matrix = useMemo(
    () => (stations.data && instructions.data && trainings.data ? buildMatrix(operators, stations.data, instructions.data, trainings.data) : null),
    [operators, stations.data, instructions.data, trainings.data],
  )

  const failed = [stations, instructions, trainings].find((q) => q.error)
  if (failed) return <ErrorState error={failed.error} onRetry={() => void Promise.all([stations.refetch(), instructions.refetch(), trainings.refetch()])} />
  if (!matrix) return <SkeletonRows />
  if (!matrix.stations.length) return <EmptyState icon={<GraduationCap className="h-7 w-7" />} title={t.emptyTitle} description={t.emptyHint} />

  const gapsOf = (id: string) => matrix.stations.some((s) => matrix.cells[id]?.[s.id]?.state !== 'done')
  const rows = matrix.people.filter((p) => {
    const op = operators.find((o) => o._id === p.id)
    return (!op || query(op)) && (!onlyGaps || gapsOf(p.id))
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn('flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black', matrix.gaps ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200')}>
          {matrix.gaps ? <GraduationCap className="h-4 w-4" /> : <Check className="h-4 w-4" />} {t.gaps(matrix.gaps)}
        </p>
        {matrix.gaps > 0 && (
          <button type="button" aria-pressed={onlyGaps} onClick={() => setOnlyGaps(!onlyGaps)} className={cn('btn-press min-h-11 rounded-2xl px-4 text-sm font-black', onlyGaps ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card')}>
            {t.onlyGaps}
          </button>
        )}
      </div>

      {!operators.length ? (
        <p className="glass-card rounded-[24px] p-4 text-sm font-bold text-slate-500">{t.noPeople}</p>
      ) : (
        // Une surface pleine : la colonne des noms, collée à gauche, garde le même fond que le tableau.
        <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_10px_40px_-10px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#151e2e]">
          {/* Le tableau défile seul sur un téléphone ; les noms restent à gauche. */}
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th scope="col" className="label-caps sticky left-0 z-10 bg-white px-3 py-3 text-left text-slate-500 sm:px-4 dark:bg-[#151e2e]">
                    {t.people}
                  </th>
                  {matrix.stations.map((s) => (
                    <th key={s.id} scope="col" className="min-w-[4.5rem] px-1.5 py-3 text-center align-bottom text-xs font-black text-slate-700 sm:min-w-20 sm:px-2 dark:text-slate-200">
                      <span className="line-clamp-2 break-words">{s.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" title={p.name} className="sticky left-0 z-10 max-w-32 truncate border-t border-slate-900/5 bg-white px-3 py-2 text-left text-sm font-black text-slate-900 sm:max-w-44 sm:px-4 dark:border-white/5 dark:bg-[#151e2e] dark:text-white">
                      {p.name}
                    </th>
                    {matrix.stations.map((s) => {
                      const cell = matrix.cells[p.id]?.[s.id]
                      if (!cell) return <td key={s.id} className="border-t border-slate-900/5 dark:border-white/5" />
                      return (
                        <td key={s.id} className="border-t border-slate-900/5 px-1.5 py-2 text-center sm:px-2 dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => setOpen({ person: p.name, station: s.name, cell })}
                            aria-label={t.cellLabel(p.name, s.name, cell.done, cell.required.length)}
                            title={t.cellLabel(p.name, s.name, cell.done, cell.required.length)}
                            className={cn('btn-press mx-auto flex h-11 w-11 items-center justify-center rounded-2xl', LOOK[cell.state])}
                          >
                            <Mark cell={cell} />
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-2 px-1" aria-label={t.matrix}>
        {(['done', 'partial', 'outdated', 'none'] as const).map((k) => (
          <li key={k} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg', LOOK[k])}>{ICONS[k]}</span> {t.legend[k]}
          </li>
        ))}
      </ul>
      <p className="px-1 text-xs font-bold text-slate-400">{t.howTo}</p>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? t.cellTitle(open.person, open.station) : undefined}>
        <ul className="space-y-2">
          {open?.cell.required.map((r) => (
            <li key={r.id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
              <Link href={`/instructions/${r.id}`} className="min-w-0 flex-1 text-[15px] leading-snug font-black hover:underline" title={t.open}>
                {r.title}
              </Link>
              <span className={cn('flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-black', r.state === 'done' ? LOOK.done : r.state === 'outdated' ? LOOK.outdated : 'bg-slate-900/5 text-slate-600 dark:bg-white/10 dark:text-slate-300')}>
                {r.state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : r.state === 'outdated' ? <RotateCcw className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
                {t.states[r.state]}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}
