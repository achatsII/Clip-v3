'use client'

import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { inNativeShell } from '@/lib/bridge/native'
import { useMessages } from '@/lib/i18n'
import { realtimeReason, realtimeStart, retryRealtime, type RealtimeState } from '@/lib/realtime/client'
import { cn } from '@/lib/util/cn'

/**
 * Le direct, en un coup d'œil : vert quand ce qui change sur un autre appareil s'affiche ici
 * aussitôt ; ambre quand le direct ne passe pas et que l'écran se relit seul toutes les 8 s.
 * Toucher le témoin dit pourquoi le direct ne passe pas, et offre de le rebrancher. Resté coupé,
 * l'appareil le dit aussi au serveur, une fois (diagnostic, rien de personnel).
 */
export function LiveBadge({ state }: { state: RealtimeState }) {
  const t = useMessages().editor.page.liveBadge
  const [open, setOpen] = useState(false)
  const look = state === 'live' ? { dot: 'bg-emerald-500 animate-pulse', text: t.on, hint: t.onHint } : state === 'connecting' ? { dot: 'bg-slate-400', text: t.connecting, hint: t.connectingHint } : { dot: 'bg-amber-500', text: t.polling, hint: t.pollingHint }
  const start = realtimeStart()
  const why = state === 'off' ? (start && !start.available ? t.notOffered : start && !start.hasOrg ? t.noOrg : t.notStarted) : state === 'down' ? realtimeReason() || t.unknown : ''

  // Coupé plus de 15 s : on le dit au serveur, une fois par raison.
  const told = useRef(new Set<string>())
  useEffect(() => {
    if (state === 'live' || state === 'connecting') return
    const timer = setTimeout(() => {
      const key = `${state}:${realtimeReason()}`
      if (told.current.has(key)) return
      told.current.add(key)
      const s = realtimeStart()
      void fetch('/api/realtime/diag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, reason: realtimeReason(), available: s?.available, hasOrg: s?.hasOrg, via: inNativeShell() ? 'app' : 'web' }),
        keepalive: true,
      }).catch(() => undefined)
    }, 15_000)
    return () => clearTimeout(timer)
  }, [state])

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={look.text}
        title={look.hint}
        className="btn-press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-slate-900/[0.05] px-2.5 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300"
      >
        <span className={cn('h-2 w-2 shrink-0 rounded-full', look.dot)} aria-hidden />
        <span className="max-sm:hidden" role="status">
          {look.text}
        </span>
      </button>
      {open && (
        <span className="glass-panel absolute top-10 right-0 z-30 w-72 rounded-2xl p-3 text-left text-xs font-bold text-slate-700 shadow-xl dark:text-slate-200" role="dialog" aria-label={look.text}>
          <span className="block text-sm font-black text-slate-900 dark:text-white">{look.text}</span>
          <span className="mt-1 block">{look.hint}</span>
          {why && (
            <span className="mt-2 block rounded-xl bg-slate-900/[0.05] p-2 font-mono text-[11px] break-words dark:bg-white/10">
              {t.reason} {why}
            </span>
          )}
          {state !== 'live' && (
            <button
              type="button"
              onClick={() => {
                retryRealtime()
                setOpen(false)
              }}
              className="btn-press mt-2 inline-flex h-11 items-center gap-1.5 rounded-2xl bg-white/80 px-3 text-sm font-black text-slate-900 ring-1 ring-slate-900/10 dark:bg-white/15 dark:text-white"
            >
              <RefreshCw className="h-4 w-4" /> {t.reconnect}
            </button>
          )}
        </span>
      )}
    </span>
  )
}
