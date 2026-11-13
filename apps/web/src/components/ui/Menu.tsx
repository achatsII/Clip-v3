'use client'

import { Check, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/util/cn'
import { useMessages } from '@/lib/i18n'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean
  hidden?: boolean
  disabled?: boolean
  hint?: ReactNode
  /** Un trait le sépare des choix d'avant : un autre groupe d'actions. */
  divider?: boolean
  /** Une ligne de plus sous le libellé : ce que fait le choix. */
  description?: string
  /** Le choix en cours (une vue, un mode) : coché. */
  checked?: boolean
}

/**
 * `bare` : le déclencheur fourni porte déjà son allure ; le bouton ne lui ajoute rien.
 * `side="up"` : le menu s'ouvre au-dessus (un bouton en bas de l'écran).
 */
export function Menu({ items, label: givenLabel, trigger, align = 'right', bare = false, side = 'down' }: { items: MenuItem[]; label?: string; trigger?: ReactNode; align?: 'left' | 'right'; bare?: boolean; side?: 'down' | 'up' }) {
  const t = useMessages()
  const label = givenLabel ?? t.common.moreActions
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const visible = items.filter((i) => !i.hidden)
  if (!visible.length) return null
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={bare ? 'flex shrink-0 rounded-2xl' : 'btn-press glass-card flex h-12 min-w-12 items-center justify-center rounded-full px-3 text-slate-700 dark:text-slate-200'}
      >
        {trigger ?? <MoreHorizontal className="h-5 w-5" />}
      </button>
      {open && (
        <div className={cn('animate-pop-in absolute z-50 max-h-[min(70dvh,560px)] overflow-y-auto overscroll-contain rounded-3xl border border-white/80 bg-white p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-850', visible.some((i) => i.description) ? 'w-72' : 'w-64', align === 'right' ? 'right-0' : 'left-0', side === 'up' ? 'bottom-full mb-2' : 'mt-2')} role="menu">
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
              aria-checked={item.checked}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={cn(
                'flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-bold disabled:opacity-50',
                item.divider && 'relative mt-2 before:absolute before:inset-x-3 before:-top-1 before:h-px before:bg-slate-900/10 dark:before:bg-white/10',
                item.danger ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10' : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5',
              )}
            >
              <span className="shrink-0 opacity-80">{item.icon}</span>
              {item.description ? (
                <span className="min-w-0 flex-1">
                  <span className="block">{item.label}</span>
                  <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{item.description}</span>
                </span>
              ) : (
                <span className="flex-1">{item.label}</span>
              )}
              {item.hint}
              {item.checked && <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
