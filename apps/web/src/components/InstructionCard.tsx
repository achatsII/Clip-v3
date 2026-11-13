'use client'

import { renewalState } from '@/lib/model/renewal'
import { useToggle } from '@/lib/toggles'
import { CalendarClock, Loader2, Lock, MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { CategoryIcon } from '@/components/icons'
import { useCreations } from '@/hooks/useCreations'
import { creationOf, stageLabel } from '@/lib/ai/creation'
import type { Doc } from '@/lib/gateway/data'
import { messages, useMessages } from '@/lib/i18n'
import { CATEGORIES } from '@/lib/model/catalog'
import type { Instruction } from '@/lib/model/types'
import { cn, timeAgo } from '@/lib/util/cn'

/** Les listes ne lisent pas le brouillon ni les sources : on se fie aux copies légères. */
export function statusOf(i: Instruction, now = Date.now()): { label: string; className: string; busy?: boolean } {
  const t = messages().instructions.status
  const hasDraft = (i.stepCount ?? 0) > 0 || !!i.draft
  const sources = i.sourceCount ?? i.sources?.length ?? 0
  // Une création en cours sur un appareil, ou qui s'est arrêtée en route.
  const creation = creationOf(i, now)
  if (creation.kind === 'running') return { label: t.creating, className: 'bg-violet-500', busy: true }
  if (creation.kind === 'stale' && !hasDraft) return { label: t.interrupted, className: 'bg-amber-500' }
  if (i.status === 'review') return { label: t.review, className: 'bg-amber-500' }
  if (!hasDraft && sources === 0 && !i.publishedVersion) return { label: t.empty, className: 'bg-slate-400' }
  if (!hasDraft && !i.publishedVersion) return { label: t.toGenerate, className: 'bg-violet-500' }
  if (i.publishedVersion && i.dirty) return { label: t.edited(i.publishedVersion), className: 'bg-sky-500' }
  if (i.publishedVersion) return { label: t.published(i.publishedVersion), className: 'bg-emerald-500' }
  return { label: t.draft, className: 'bg-slate-500' }
}

/**
 * Ce qu'une création en cours dit d'elle : l'étape où en est l'IA. L'état se lit dans la petite
 * lecture des créations (relue toutes les 10 s pendant une création, et à chaque annonce en temps
 * réel) ; la liste, elle, ne se relit qu'au début et à la fin.
 */
function useRunningStage(id: string, i: Instruction): string | null {
  const live = useCreations().data?.find((d) => d._id === id)?.json_data
  const c = creationOf(live ? { ...i, generating: live.generating } : i)
  return c.kind === 'running' ? (stageLabel(c.info.stage) ?? messages().instructions.creations.inProgress) : null
}

/**
 * Tuile « TV grid » : la couleur porte la catégorie, la pastille le statut. Une instruction en
 * création se voit de loin : le dégradé de la marque coule, un reflet passe, l'étape s'écrit.
 */
/** « À revoir » un mois avant la date de relecture, « Révision en retard » après (toggle `renewal`). */
function RenewalChip({ i, className }: { i: Instruction; className?: string }) {
  const t = useMessages().instructions.renewal
  const on = useToggle('renewal')
  const state = on ? renewalState(i) : 'none'
  if (state !== 'soon' && state !== 'late') return null
  return (
    <span className={cn('flex shrink-0 items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-black tracking-widest uppercase shadow-sm', state === 'late' ? 'bg-rose-500 text-white' : 'bg-amber-400 text-amber-950', className)}>
      <CalendarClock className="h-3 w-3" /> {state === 'late' ? t.late : t.soon}
    </span>
  )
}

export function InstructionTile({ doc, stationNames }: { doc: Doc<Instruction>; stationNames: string[] }) {
  const t = useMessages().instructions.card
  const i = doc.json_data
  const cat = CATEGORIES[i.category] ?? CATEGORIES.autre
  const st = statusOf(i)
  const stage = useRunningStage(doc._id, i)
  return (
    <Link href={`/instructions/${doc._id}`} className={cn('btn-press lift group relative flex flex-col overflow-hidden rounded-[28px] text-white shadow-[0_15px_35px_rgba(15,23,42,0.12)]', stage && 'shadow-primary ring-2 ring-[rgba(var(--primary-rgb),0.35)]')}>
      <span className={cn('relative block h-40 overflow-hidden', stage ? 'creating-flow creating-sweep' : cn('bg-gradient-to-br', cat.tile))}>
        {stage ? (
          <Sparkles className="absolute top-[42%] left-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-pulse text-white/85" aria-hidden />
        ) : i.coverUrl ? (
          <img src={i.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="grid-pattern absolute inset-0" />
        )}
        <span className={cn('absolute inset-0 bg-gradient-to-t to-transparent', stage ? 'from-black/45' : 'from-black/80 via-black/20')} />
        <span className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-2.5 py-1.5 text-[10px] font-black tracking-widest uppercase backdrop-blur-md">
          {i.kind === 'lockout' ? <Lock className="h-3.5 w-3.5" /> : <CategoryIcon category={i.category} className="h-3.5 w-3.5" />} {i.kind === 'lockout' ? t.lockout : cat.short}
        </span>
        <span className="absolute top-3 right-3 flex flex-col items-end gap-1">
          <span className={cn('flex items-center gap-1 rounded-xl border border-white/20 px-2.5 py-1.5 text-[10px] font-black tracking-widest uppercase shadow-lg', st.className)}>
            {st.busy && <Loader2 className="h-3 w-3 animate-spin" />} {st.label}
          </span>
          <RenewalChip i={i} />
        </span>
        {!i.coverUrl && !stage && <CategoryIcon category={i.category} className="absolute top-1/2 right-6 h-16 w-16 -translate-y-1/2 text-white/25" />}
        <span className="absolute inset-x-4 bottom-3">
          <span className={cn('text-lg leading-tight font-black tracking-tight text-balance', stage ? 'line-clamp-1' : 'line-clamp-2')}>{i.title}</span>
          {stage && (
            <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-white/90">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> <span className="truncate">{stage}</span>
            </span>
          )}
        </span>
      </span>
      <span className="glass-card flex items-center gap-2 rounded-none border-0 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{stationNames.length ? stationNames.join(', ') : t.noStation}</span>
        <span className="ml-auto shrink-0">
          {i.number && <span className="font-black text-slate-600 tabular-nums dark:text-slate-300">{i.number} · </span>}
          {i.stepCount ? `${t.steps(i.stepCount)} · ` : ''}
          {timeAgo(i.updatedAt)}
        </span>
      </span>
    </Link>
  )
}

export function InstructionRow({ doc, stationNames }: { doc: Doc<Instruction>; stationNames: string[] }) {
  const t = useMessages().instructions.card
  const i = doc.json_data
  const cat = CATEGORIES[i.category] ?? CATEGORIES.autre
  const st = statusOf(i)
  const stage = useRunningStage(doc._id, i)
  return (
    <Link href={`/instructions/${doc._id}`} className={cn('btn-press glass-card flex items-center gap-4 rounded-[24px] p-3 pr-4', stage && 'ring-2 ring-[rgba(var(--primary-rgb),0.3)]')}>
      <span className={cn('relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white', stage ? 'creating-flow creating-sweep' : cn('bg-gradient-to-br', cat.tile))}>
        {stage ? <Loader2 className="h-6 w-6 animate-spin" /> : i.coverUrl ? <img src={i.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <CategoryIcon category={i.category} className="h-6 w-6" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-black text-slate-900 dark:text-white">{i.title}</span>
        <span className={cn('block truncate text-xs font-bold', stage ? 'text-[var(--primary-strong)] dark:text-sky-300' : 'text-slate-500')}>
          {stage ?? [i.number, cat.label, stationNames.length ? stationNames.join(', ') : t.noStation, timeAgo(i.updatedAt)].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={cn('flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-black tracking-widest text-white uppercase', st.className)}>
          {st.busy && <Loader2 className="h-3 w-3 animate-spin" />} {st.label}
        </span>
        <RenewalChip i={i} />
      </span>
    </Link>
  )
}
