'use client'

import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/util/cn'

type Tone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  tone: Tone
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

interface ToastApi {
  success: (title: string, description?: string, action?: ToastItem['action']) => void
  error: (title: string, description?: string, action?: ToastItem['action']) => void
  info: (title: string, description?: string, action?: ToastItem['action']) => void
}

const Ctx = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const remove = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), [])
  const push = useCallback(
    (tone: Tone, title: string, description?: string, action?: ToastItem['action']) => {
      const id = ++seq.current
      setItems((l) => [...l.slice(-3), { id, tone, title, description, action }])
      setTimeout(() => remove(id), action ? 7000 : 4000)
    },
    [remove],
  )
  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d, a) => push('success', t, d, a),
      error: (t, d, a) => push('error', t, d, a),
      info: (t, d, a) => push('info', t, d, a),
    }),
    [push],
  )
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <AlertTriangle className="h-5 w-5 text-rose-500" />,
    info: <Info className="h-5 w-5 text-[var(--primary)]" />,
  }
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed top-3 right-3 left-3 z-[90] flex flex-col items-end gap-2 sm:top-5 sm:right-5 sm:left-auto sm:w-96" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn('pointer-events-auto animate-slide-up flex w-full items-start gap-3 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/90')}
          >
            <span className="mt-0.5 shrink-0">{icons[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900 dark:text-white">{t.title}</p>
              {t.description && <p className="mt-0.5 text-sm font-medium text-slate-600 dark:text-slate-300">{t.description}</p>}
              {t.action && (
                <button
                  type="button"
                  className="mt-2 text-sm font-black text-[var(--primary)]"
                  onClick={() => {
                    t.action?.onClick()
                    remove(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button type="button" aria-label="Fermer" onClick={() => remove(t.id)} className="-mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-900/5">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast hors de ToastProvider')
  return ctx
}
