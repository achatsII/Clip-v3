'use client'

import { useQuery } from '@tanstack/react-query'
import { Check, FileText, Mic, PenLine, Search, Video } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useMessages } from '@/lib/i18n'
import { libraryGroups, type LibraryKind } from '@/lib/model/library'
import { T } from '@/lib/model/repo'
import type { Instruction, Source } from '@/lib/model/types'
import { cn, formatDuration, timeAgo } from '@/lib/util/cn'

const KINDS: LibraryKind[] = ['all', 'video', 'photo', 'audio', 'note', 'document']

/**
 * Les médias déjà pris, à reprendre dans la capture : ceux des instructions déjà générées (les plus
 * récentes d'abord), sans celle en cours. On choisit, on ajoute ; le fichier reste le même.
 */
export function MediaLibraryDialog({ open, onClose, excludeId, onAdd }: { open: boolean; onClose: () => void; excludeId?: string | null; onAdd: (sources: Source[]) => void }) {
  const t = useMessages()
  const tl = t.capture.library
  const { data } = useSession()
  const [kind, setKind] = useState<LibraryKind>('all')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Map<string, Source>>(new Map())
  const docs = useQuery({
    queryKey: ['media-library'],
    queryFn: () =>
      data.filter<Instruction>(T.instruction, {
        filter: { 'json_data.status': { $ne: 'archived' }, 'json_data.draft': { $ne: null } },
        projection: { 'json_data.title': 1, 'json_data.sources': 1, 'json_data.updatedAt': 1 },
        sort: { 'json_data.updatedAt': -1 },
        limit: 40,
      }),
    enabled: open,
    staleTime: 60_000,
  })
  const groups = useMemo(() => libraryGroups(docs.data ?? [], { exclude: excludeId, kind, query }), [docs.data, excludeId, kind, query])
  const toggle = (groupId: string, s: Source) =>
    setPicked((m) => {
      const next = new Map(m)
      const k = `${groupId}:${s.id}`
      if (next.has(k)) next.delete(k)
      else next.set(k, s)
      return next
    })
  const close = () => {
    setPicked(new Map())
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={tl.title}
      size="lg"
      footer={
        <>
          <Button onClick={close}>{t.common.cancel}</Button>
          <Button
            variant="primary"
            disabled={!picked.size}
            onClick={() => {
              onAdd([...picked.values()])
              setPicked(new Map())
            }}
          >
            {tl.add(picked.size)}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm font-medium text-slate-500">{tl.intro}</p>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-11" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tl.search} />
      </div>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {KINDS.map((k) => (
          // À l'ouverture, le focus va aux filtres, pas à la recherche : pas de clavier qui surgit au
          // téléphone (et l'écran ne bouge pas sous le doigt au premier toucher).
          <button key={k} type="button" aria-pressed={kind === k} data-autofocus={k === 'all' ? true : undefined} onClick={() => setKind(k)} className={cn('btn-press h-11 shrink-0 rounded-2xl px-4 text-sm font-black', kind === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card')}>
            {tl.kinds[k]}
          </button>
        ))}
      </div>
      {docs.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : docs.isError ? (
        <ErrorState error={docs.error} onRetry={() => void docs.refetch()} />
      ) : !groups.length ? (
        <EmptyState icon={<Video className="h-7 w-7" />} title={query || kind !== 'all' ? tl.noMatch : tl.empty} />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.id}>
              <p className="mb-2 flex items-baseline justify-between gap-3">
                <span className="truncate font-black">{g.title}</span>
                <span className="shrink-0 text-xs font-bold text-slate-400">{timeAgo(g.updatedAt)}</span>
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {g.sources.map((s) => {
                  const on = picked.has(`${g.id}:${s.id}`)
                  return (
                    <button key={s.id} type="button" aria-pressed={on} onClick={() => toggle(g.id, s)} className={cn('btn-press relative flex h-28 flex-col overflow-hidden rounded-2xl text-left ring-2 transition', on ? 'ring-[var(--primary)]' : 'ring-transparent')}>
                      <SourcePreview source={s} pagesText={tl.pages} />
                      {on && (
                        <span className="bg-gradient-primary absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-white shadow" aria-label={tl.selected}>
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </Modal>
  )
}

/** L'aperçu d'un média : l'image, ou une tuile avec son type, sa durée et le début de son texte. */
function SourcePreview({ source: s, pagesText }: { source: Source; pagesText: (n: number) => string }) {
  const thumb = s.kind === 'photo' ? (s.thumbnailUrl ?? s.url) : s.kind === 'video' ? s.thumbnailUrl : undefined
  if (thumb)
    return (
      <span className="relative block h-full w-full bg-slate-900">
        <img src={thumb} alt={s.name ?? ''} className="h-full w-full object-cover" loading="lazy" />
        {s.kind === 'video' && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-lg bg-black/60 px-2 py-0.5 text-xs font-black text-white">
            <Video className="h-3.5 w-3.5" /> {formatDuration(s.durationSec)}
          </span>
        )}
      </span>
    )
  const icon = s.kind === 'video' ? <Video className="h-5 w-5" /> : s.kind === 'audio' ? <Mic className="h-5 w-5" /> : s.kind === 'note' ? <PenLine className="h-5 w-5" /> : <FileText className="h-5 w-5" />
  const tone = s.kind === 'video' ? 'from-sky-500 to-blue-600' : s.kind === 'audio' ? 'from-violet-500 to-indigo-600' : s.kind === 'note' ? 'from-amber-400 to-orange-500' : 'from-slate-500 to-slate-700'
  const line = s.kind === 'document' ? [s.originalName ?? s.name, s.pageCount ? pagesText(s.pageCount) : ''].filter(Boolean).join(' · ') : s.text ?? s.name ?? ''
  return (
    <span className={cn('flex h-full w-full flex-col justify-between bg-gradient-to-br p-3 text-white', tone)}>
      <span className="flex items-center gap-2 text-xs font-black">
        {icon} {s.durationSec ? formatDuration(s.durationSec) : null}
      </span>
      <span className="line-clamp-3 text-xs font-bold opacity-95">{line}</span>
    </span>
  )
}
