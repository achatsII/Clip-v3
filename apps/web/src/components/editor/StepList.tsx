'use client'

import { ImageOff, Plus, TriangleAlert } from 'lucide-react'
import { mediaThumb } from '@/components/media/MediaView'
import { useMessages } from '@/lib/i18n'
import type { StepChange } from '@/lib/model/diff'
import type { Step } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

export function StepList({ steps, selectedId, onSelect, onAdd, changes, readOnly, feedbackByStep }: { steps: Step[]; selectedId: string | null; onSelect: (id: string) => void; onAdd?: () => void; changes?: Record<string, StepChange>; readOnly?: boolean; feedbackByStep?: Record<string, number> }) {
  const t = useMessages().editor.stepList
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const thumb = mediaThumb(s.media[0])
        const ch = changes?.[s.id]
        const fb = feedbackByStep?.[s.id] ?? 0
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-current={selectedId === s.id}
            className={cn(
              'btn-press flex w-full items-center gap-3 rounded-[22px] p-2 pr-3 text-left transition',
              selectedId === s.id ? 'bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-2 ring-[var(--primary)] dark:bg-slate-800' : 'glass-card',
            )}
          >
            <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-700">
              {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-slate-400"><ImageOff className="h-5 w-5" /></span>}
              <span className="absolute top-1 left-1 flex h-6 min-w-6 items-center justify-center rounded-lg bg-black/60 px-1 text-xs font-black text-white tabular-nums">{i + 1}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm leading-snug font-black text-slate-900 dark:text-white">{s.title || t.untitled}</span>
              <span className="mt-1 flex flex-wrap gap-1">
                {s.warning && (
                  <span className={cn('inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-black uppercase', s.warning.level === 'danger' ? 'bg-rose-100 text-rose-700' : s.warning.level === 'caution' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-700')}>
                    <TriangleAlert className="h-3 w-3" /> {s.warning.level === 'danger' ? t.warnings.danger : s.warning.level === 'caution' ? t.warnings.caution : t.warnings.info}
                  </span>
                )}
                {ch === 'added' && <span className="rounded-lg bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 uppercase">{t.added}</span>}
                {ch === 'modified' && <span className="rounded-lg bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800 uppercase">{t.modified}</span>}
                {fb > 0 && <span className="rounded-lg bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white uppercase">{t.feedback(fb)}</span>}
              </span>
            </span>
          </button>
        )
      })}
      {!readOnly && onAdd && (
        <button type="button" onClick={onAdd} className="btn-press flex h-14 w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-slate-300 text-sm font-black text-slate-500 hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-slate-600">
          <Plus className="h-4 w-4" /> {t.add}
        </button>
      )}
    </div>
  )
}
