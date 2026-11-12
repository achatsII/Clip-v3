'use client'

import { Loader2, PauseCircle, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { launchedFrom } from '@/components/capture/GenerationProgress'
import { SectionTitle } from '@/components/ui/Surface'
import { useCreations, useRecentCreations } from '@/hooks/useCreations'
import { creationOf, stageLabel } from '@/lib/ai/creation'
import { useMessages } from '@/lib/i18n'
import { markCreatedSeen, useSeenCreated } from '@/lib/prefs'
import { cn, timeAgo } from '@/lib/util/cn'

/**
 * Les instructions en création, sur cet appareil ou un autre : on voit qu'elles avancent (le
 * dégradé coule, l'étape s'écrit), et elles s'ouvrent d'un toucher. Une fois prêtes, elles restent
 * là (24 h au plus) jusqu'à ce qu'on les ouvre sur cet appareil, ou qu'on les écarte.
 */
export function CreationList() {
  const t = useMessages().instructions
  const creations = useCreations()
  const recent = useRecentCreations()
  const seen = useSeenCreated()
  const now = Date.now()
  const items = (creations.data ?? []).map((d) => ({ d, c: creationOf(d.json_data, now) })).filter((x) => x.c.kind !== 'none')
  const busyIds = new Set(items.map((x) => x.d._id))
  const ready = (recent.data ?? []).filter((d) => !busyIds.has(d._id) && !d.json_data.generating && !seen.includes(d._id))
  if (!items.length && !ready.length) return null
  return (
    <section>
      <SectionTitle title={items.length ? t.creations.title : t.creations.readyTitle} hint={items.length ? t.creations.hint : t.creations.readyHint} />
      <div className="space-y-2">
        {items.map(({ d, c }) =>
          c.kind === 'none' ? null : (
            <Link key={d._id} href={`/instructions/${d._id}`} className={cn('btn-press glass-card flex items-center gap-4 rounded-[24px] p-3 pr-4', c.kind === 'running' && 'ring-2 ring-[rgba(var(--primary-rgb),0.3)]')}>
              <span className={cn('relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white', c.kind === 'running' ? 'creating-flow creating-sweep shadow-primary' : 'bg-gradient-to-br from-amber-400 to-orange-500')}>
                {c.kind === 'running' ? <Loader2 className="h-6 w-6 animate-spin" /> : <PauseCircle className="h-6 w-6" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-black text-slate-900 dark:text-white">{d.json_data.title}</span>
                <span className={cn('block truncate text-xs font-bold', c.kind === 'running' ? 'text-[var(--primary-strong)] dark:text-sky-300' : 'text-slate-500')}>
                  {c.kind === 'running' ? t.creations.running(stageLabel(c.info.stage) ?? t.creations.inProgress, launchedFrom(c.info.device, c.info.byName, true), timeAgo(c.info.startedAt)) : t.creations.interrupted}
                </span>
              </span>
              <span className={cn('shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-black tracking-widest text-white uppercase', c.kind === 'running' ? 'bg-violet-500' : 'bg-amber-500')}>{c.kind === 'running' ? t.status.creating : t.status.interrupted}</span>
            </Link>
          ),
        )}
        {ready.map((d) => (
          <div key={d._id} className="glass-card animate-pop-in flex items-center gap-2 rounded-[24px] p-3 pr-2">
            <Link href={`/instructions/${d._id}`} onClick={() => markCreatedSeen(d._id)} className="btn-press flex min-w-0 flex-1 items-center gap-4">
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                {d.json_data.coverUrl ? <img src={d.json_data.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Sparkles className="h-6 w-6" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-black text-slate-900 dark:text-white">{d.json_data.title}</span>
                <span className="block truncate text-xs font-bold text-slate-500">{t.creations.ready(timeAgo(d.json_data.generation?.at), d.json_data.stepCount ?? 0)}</span>
              </span>
              <span className="shrink-0 rounded-xl bg-emerald-500 px-2.5 py-1 text-[10px] font-black tracking-widest text-white uppercase">{t.creations.readyChip}</span>
            </Link>
            <button type="button" onClick={() => markCreatedSeen(d._id)} aria-label={t.creations.dismiss(d.json_data.title)} title={t.creations.dismissShort} className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
