'use client'

import { ImageOff, Lock, MapPin } from 'lucide-react'
import Link from 'next/link'
import { CategoryIcon } from '@/components/icons'
import type { Doc } from '@/lib/gateway/data'
import { CATEGORIES } from '@/lib/model/catalog'
import type { Instruction } from '@/lib/model/types'
import { cn, timeAgo } from '@/lib/util/cn'

/** Les listes ne lisent pas le brouillon ni les sources : on se fie aux copies légères. */
export function statusOf(i: Instruction): { label: string; className: string } {
  const hasDraft = (i.stepCount ?? 0) > 0 || !!i.draft
  const sources = i.sourceCount ?? i.sources?.length ?? 0
  if (i.status === 'review') return { label: 'À approuver', className: 'bg-amber-500' }
  if (!hasDraft && sources === 0 && !i.publishedVersion) return { label: 'Vide', className: 'bg-slate-400' }
  if (!hasDraft && !i.publishedVersion) return { label: 'À générer', className: 'bg-violet-500' }
  if (i.publishedVersion && i.dirty) return { label: `v${i.publishedVersion} · modifiée`, className: 'bg-sky-500' }
  if (i.publishedVersion) return { label: `Publiée · v${i.publishedVersion}`, className: 'bg-emerald-500' }
  return { label: 'Brouillon', className: 'bg-slate-500' }
}

/** Tuile « TV grid » : la couleur porte la catégorie, la pastille le statut. */
export function InstructionTile({ doc, stationNames }: { doc: Doc<Instruction>; stationNames: string[] }) {
  const i = doc.json_data
  const cat = CATEGORIES[i.category] ?? CATEGORIES.autre
  const st = statusOf(i)
  return (
    <Link href={`/instructions/${doc._id}`} className="btn-press lift group relative flex flex-col overflow-hidden rounded-[28px] text-white shadow-[0_15px_35px_rgba(15,23,42,0.12)]">
      <span className={cn('relative block h-40 bg-gradient-to-br', cat.tile)}>
        {i.coverUrl ? <img src={i.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <span className="grid-pattern absolute inset-0" />}
        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <span className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-2.5 py-1.5 text-[10px] font-black tracking-widest uppercase backdrop-blur-md">
          {i.kind === 'lockout' ? <Lock className="h-3.5 w-3.5" /> : <CategoryIcon category={i.category} className="h-3.5 w-3.5" />} {i.kind === 'lockout' ? 'Cadenassage' : cat.short}
        </span>
        <span className={cn('absolute top-3 right-3 rounded-xl border border-white/20 px-2.5 py-1.5 text-[10px] font-black tracking-widest uppercase shadow-lg', st.className)}>{st.label}</span>
        {!i.coverUrl && !(i.stepCount ?? 0) && <ImageOff className="absolute inset-0 m-auto h-10 w-10 text-white/40" />}
        <span className="absolute inset-x-4 bottom-3">
          <span className="line-clamp-2 text-lg leading-tight font-black tracking-tight">{i.title}</span>
        </span>
      </span>
      <span className="glass-card flex items-center gap-2 rounded-none border-0 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{stationNames.length ? stationNames.join(', ') : 'Aucun poste'}</span>
        <span className="ml-auto shrink-0">{i.stepCount ? `${i.stepCount} étapes · ` : ''}{timeAgo(i.updatedAt)}</span>
      </span>
    </Link>
  )
}

export function InstructionRow({ doc, stationNames }: { doc: Doc<Instruction>; stationNames: string[] }) {
  const i = doc.json_data
  const cat = CATEGORIES[i.category] ?? CATEGORIES.autre
  const st = statusOf(i)
  return (
    <Link href={`/instructions/${doc._id}`} className="btn-press glass-card flex items-center gap-4 rounded-[24px] p-3 pr-4">
      <span className={cn('relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br text-white', cat.tile)}>
        {i.coverUrl ? <img src={i.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <CategoryIcon category={i.category} className="h-6 w-6" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-black text-slate-900 dark:text-white">{i.title}</span>
        <span className="block truncate text-xs font-bold text-slate-500">
          {cat.label} · {stationNames.length ? stationNames.join(', ') : 'Aucun poste'} · {timeAgo(i.updatedAt)}
        </span>
      </span>
      <span className={cn('shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-black tracking-widest text-white uppercase', st.className)}>{st.label}</span>
    </Link>
  )
}
