'use client'

import { Redo2, Undo2 } from 'lucide-react'
import type { DraftHistory } from '@/hooks/useDraftHistory'
import { useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'

const button = 'btn-press flex h-11 w-11 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-900/5 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-white/10'

/** Annuler et rétablir, en deux boutons : dans l'en-tête, sur ordinateur. */
export function UndoButtons({ history, className }: { history: DraftHistory; className?: string }) {
  const t = useMessages().editor.page.undo
  if (!history.enabled) return null
  return (
    <div className={cn('flex items-center', className)}>
      <button type="button" onClick={history.undo} disabled={!history.canUndo} aria-label={t.undo} title={t.undoTitle(history.mac)} className={button}>
        <Undo2 className="h-5 w-5" />
      </button>
      <button type="button" onClick={history.redo} disabled={!history.canRedo} aria-label={t.redo} title={t.redoTitle(history.mac)} className={button}>
        <Redo2 className="h-5 w-5" />
      </button>
    </div>
  )
}

/**
 * Au téléphone : annuler et rétablir sous le pouce, en bas à gauche (l'assistant est à droite). La
 * pastille n'apparaît qu'une fois quelque chose à annuler, et se cache quand le clavier est ouvert.
 */
export function UndoPill({ history }: { history: DraftHistory }) {
  const t = useMessages().editor.page.undo
  if (!history.enabled || (!history.canUndo && !history.canRedo)) return null
  return (
    <div className="glass-float kb-hide animate-pop-in fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-4 z-40 flex h-12 items-center rounded-full px-0.5 lg:hidden" role="group" aria-label={t.group}>
      <button type="button" onClick={history.undo} disabled={!history.canUndo} aria-label={t.undo} className={cn(button, 'rounded-full')}>
        <Undo2 className="h-5 w-5" />
      </button>
      <span className="h-6 w-px bg-slate-900/10 dark:bg-white/10" aria-hidden />
      <button type="button" onClick={history.redo} disabled={!history.canRedo} aria-label={t.redo} className={cn(button, 'rounded-full')}>
        <Redo2 className="h-5 w-5" />
      </button>
    </div>
  )
}
