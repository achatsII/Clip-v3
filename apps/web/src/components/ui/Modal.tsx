'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/util/cn'

/** Panneau centré sur grand écran, feuille du bas sur téléphone (5.17). */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  dismissable = true,
  bare,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  dismissable?: boolean
  bare?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => panelRef.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, button')?.focus(), 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, dismissable, onClose])

  if (!open || typeof document === 'undefined') return null
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="animate-fade-in absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => dismissable && onClose()} />
      <div
        ref={panelRef}
        className={cn(
          'glass-panel animate-slide-up relative flex max-h-[92dvh] w-full flex-col rounded-t-[32px] sm:animate-pop-in sm:rounded-[32px]',
          'bg-white/90 dark:bg-slate-850/95',
          widths[size],
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 sm:hidden dark:bg-slate-600" />
        {(title || dismissable) && !bare && (
          <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-4 pb-2 sm:pt-6">
            <div className="min-w-0 text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</div>
            {dismissable && (
              <button type="button" onClick={onClose} aria-label="Fermer" className="btn-press -mt-1 -mr-2 flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className={cn('min-h-0 flex-1 overflow-y-auto', bare ? '' : 'px-6 pb-6')}>{children}</div>
        {footer && <div className="pb-safe flex shrink-0 flex-col-reverse gap-2 border-t border-slate-900/5 px-6 pt-4 sm:flex-row sm:justify-end sm:pb-6 dark:border-white/5">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
