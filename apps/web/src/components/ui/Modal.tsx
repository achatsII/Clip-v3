'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/util/cn'
import { useMessages } from '@/lib/i18n'

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
  const t = useMessages()
  const panelRef = useRef<HTMLDivElement>(null)
  // `onClose` change à chaque rendu du parent (fonction écrite sur place) : on le lit dans une
  // référence, sinon l'effet repartait à chaque lettre tapée et volait le focus (le clavier du
  // téléphone se fermait).
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const dismissRef = useRef(dismissable)
  dismissRef.current = dismissable

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissRef.current) closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  // Une seule fois à l'ouverture : le champ marqué, sinon le premier champ ; jamais le bouton
  // « Fermer ». Rien si un champ a déjà le focus (autoFocus).
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      const panel = panelRef.current
      if (!panel || panel.contains(document.activeElement)) return
      const target = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel.querySelector<HTMLElement>('input:not([type=hidden]):not([type=file]), textarea, select')
      ;(target ?? panel).focus()
    }, 30)
    return () => clearTimeout(timer)
  }, [open])

  if (!open || typeof document === 'undefined') return null
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

  return createPortal(
    <div className="kb-frame fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="animate-fade-in absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => dismissable && onClose()} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'glass-panel animate-slide-up kb-fit relative flex max-h-[92dvh] w-full flex-col rounded-t-[32px] outline-none sm:animate-pop-in sm:rounded-[32px]',
          'bg-white/90 dark:bg-slate-850/95',
          widths[size],
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 sm:hidden dark:bg-slate-600" />
        {(title || dismissable) && !bare && (
          <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-4 pb-2 sm:pt-6">
            <div className="min-w-0 text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</div>
            {dismissable && (
              <button type="button" onClick={onClose} aria-label={t.common.close} className="btn-press -mt-1 -mr-2 flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10">
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
