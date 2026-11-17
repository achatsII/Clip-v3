'use client'

/**
 * « À faire » (Académie) : chaque personne qui doit tenir un poste et n'y est pas encore qualifiée,
 * la plus pressée d'abord (`todoList`). D'un coup d'œil : où elle en est des questions du poste,
 * son échéance, et « Prêt à valider » quand il ne reste que la validation sur le terrain.
 */
import { GraduationCap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/States'
import { useMessages } from '@/lib/i18n'
import type { TodoItem } from '@/lib/model/assignments'
import { cn, formatDate } from '@/lib/util/cn'

/** Un jour (AAAA-MM-JJ) à midi : le même jour dans tous les fuseaux. */
export const dayLabel = (day: string) => formatDate(`${day}T12:00:00`)

export function AcademyTodo({ items, onOpen, action }: { items: TodoItem[]; onOpen: (item: TodoItem) => void; action?: ReactNode }) {
  const t = useMessages().academy
  if (!items.length) return <EmptyState icon={<GraduationCap className="h-7 w-7" />} title={t.todo.empty} description={t.todo.emptyHint} action={action} />
  return (
    <ul className="space-y-2">
      {items.map((it) => {
        const s = it.standing
        const pct = s.required ? Math.round((s.done / s.required) * 100) : 0
        const due = it.due ? (it.dueState === 'overdue' ? t.todo.overdue(dayLabel(it.due)) : t.todo.due(dayLabel(it.due))) : it.reason === 'usual' ? t.todo.usual : null
        return (
          <li key={`${it.operator._id}:${it.station.id}`}>
            <button type="button" onClick={() => onOpen(it)} className="btn-press glass-card flex w-full items-center gap-3 rounded-[22px] p-3 text-left sm:p-4">
              <Avatar name={it.operator.json_data.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black">
                  {it.operator.json_data.name} <span className="font-bold text-slate-500 dark:text-slate-400">· {it.station.name}</span>
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {it.ready ? (
                    <span className="rounded-lg bg-emerald-100 px-2 py-0.5 font-black text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">{t.todo.ready}</span>
                  ) : s.required ? (
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10" aria-hidden>
                        <span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                      </span>
                      {t.todo.progress(s.done, s.required)}
                    </span>
                  ) : (
                    <span>{t.todo.noQuestions}</span>
                  )}
                  {s.level === 'expired' && <span className="font-black text-orange-700 dark:text-orange-300">{t.levels.expired}</span>}
                  {due && <span className={cn(it.dueState === 'overdue' && 'font-black text-rose-600 dark:text-rose-400', it.dueState === 'soon' && 'font-black text-amber-700 dark:text-amber-300')}>{due}</span>}
                </span>
              </span>
              <span className={cn('shrink-0 rounded-xl px-3 py-2 text-sm font-black', it.ready ? 'bg-emerald-500 text-white' : 'bg-slate-900/5 text-slate-700 dark:bg-white/10 dark:text-slate-200')}>{it.ready ? t.todo.validate : t.todo.open}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
