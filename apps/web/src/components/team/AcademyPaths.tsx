'use client'

/**
 * Les parcours (Académie) : le parcours d'un poste, ce sont ses instructions publiées. Chaque poste
 * dit combien il en a, combien ont leurs questions, et combien de personnes sont à former ; ouvert,
 * il montre chaque instruction, et « Préparer les questions » mène droit à celles de l'instruction
 * (`?formation=1`). Les instructions d'un poste ne se lisent qu'à l'ouverture.
 */
import { ChevronDown, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { SkeletonRows } from '@/components/ui/States'
import { useStationInstructions } from '@/hooks/queries'
import { useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'

export interface PathRow {
  id: string
  name: string
  /** Les instructions publiées au poste, et celles qui ont des questions. */
  total: number
  withQuestions: number
  /** Les personnes à former à ce poste (« À faire »). */
  learners: number
}

export function AcademyPaths({ rows }: { rows: PathRow[] }) {
  const t = useMessages().academy
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="space-y-2">
      <p className="px-1 text-sm font-medium text-slate-500 dark:text-slate-400">{t.paths.hint}</p>
      {rows.map((r) => (
        <section key={r.id} className="glass-card overflow-hidden rounded-[22px]">
          <button type="button" aria-expanded={open === r.id} onClick={() => setOpen((o) => (o === r.id ? null : r.id))} className="btn-press flex w-full items-center gap-3 p-4 text-left">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', r.withQuestions ? 'bg-[var(--primary-soft)] text-[var(--primary-strong)] dark:text-[var(--primary-light)]' : 'bg-slate-900/5 text-slate-500 dark:bg-white/10 dark:text-slate-400')}>
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-black">{r.name}</span>
              <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                {t.paths.summary(r.total, r.withQuestions)}
                {r.learners ? ` · ${t.paths.learners(r.learners)}` : ''}
              </span>
            </span>
            <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform', open === r.id && 'rotate-180')} />
          </button>
          {open === r.id && <PathInstructions stationId={r.id} />}
        </section>
      ))}
    </div>
  )
}

function PathInstructions({ stationId }: { stationId: string }) {
  const t = useMessages().academy
  const list = useStationInstructions(stationId)
  if (list.isLoading) return <div className="px-4 pb-4"><SkeletonRows count={2} /></div>
  const published = (list.data ?? []).filter((d) => (d.json_data.publishedVersion ?? 0) > 0)
  if (!published.length) return <p className="px-4 pb-4 text-sm font-bold text-slate-500 dark:text-slate-400">{t.noPath}</p>
  return (
    <ul className="space-y-1.5 px-3 pb-3">
      {published.map((d) => {
        const n = d.json_data.publishedQuiz ?? 0
        return (
          <li key={d._id} className="flex items-center gap-3 rounded-2xl bg-slate-900/[0.03] p-3 dark:bg-white/5">
            <Link href={`/instructions/${d._id}`} className="min-w-0 flex-1 text-[15px] leading-snug font-black hover:underline">
              {d.json_data.title}
            </Link>
            {n ? (
              <span className="shrink-0 rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">{t.paths.questions(n)}</span>
            ) : (
              <Link href={`/instructions/${d._id}?formation=1`} className="btn-press shrink-0 rounded-xl bg-[var(--primary-soft)] px-3 py-2 text-xs font-black text-[var(--primary-strong)] dark:text-[var(--primary-light)]">
                {t.paths.prepare}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}
