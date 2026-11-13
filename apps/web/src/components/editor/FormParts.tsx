'use client'

import type { ReactNode } from 'react'
import type { MenuItem } from '@/components/ui/Menu'
import { cn } from '@/lib/util/cn'

/**
 * Une carte de la fiche : un titre court en capitales, une phrase d'aide au besoin, puis ce qu'on
 * règle. Une carte, une chose : le texte, le média, la mise en garde…
 */
export function FormCard({ icon, title, hint, children, className, tone }: { icon?: ReactNode; title: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; tone?: 'accent' }) {
  return (
    <section className={cn('glass-panel rounded-[28px] p-4 sm:p-5', tone === 'accent' && 'ring-1 ring-violet-200 dark:ring-violet-500/30', className)}>
      <header className="mb-3">
        <h3 className="label-caps flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          {icon && <span className="shrink-0 text-[var(--primary)] dark:text-sky-300">{icon}</span>}
          {title}
        </h3>
        {hint && <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

/**
 * Les outils de l'instruction, à découvert : une tuile par outil, chacune ouvre sa fenêtre ou fait
 * son geste. Ce qui détruit (archiver) vient à part, en dernier.
 */
export function ToolsGrid({ items }: { items: MenuItem[] }) {
  const visible = items.filter((i) => !i.hidden)
  const tile = (item: MenuItem) => (
    <button
      key={item.label}
      type="button"
      onClick={item.onClick}
      disabled={item.disabled}
      className={cn(
        'btn-press glass-card flex min-h-16 items-center gap-2.5 rounded-2xl p-2.5 text-left text-sm leading-tight font-black disabled:opacity-50',
        item.danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100',
      )}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', item.danger ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-primary-soft text-[var(--primary-strong)] dark:text-sky-300')}>{item.icon}</span>
      <span className="min-w-0 flex-1">{item.label}</span>
      {item.hint}
    </button>
  )
  const safe = visible.filter((i) => !i.danger)
  const danger = visible.filter((i) => i.danger)
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{safe.map(tile)}</div>
      {danger.length > 0 && <div className="grid grid-cols-2 gap-2 border-t border-slate-900/5 pt-2 sm:grid-cols-3 dark:border-white/5">{danger.map(tile)}</div>}
    </div>
  )
}
