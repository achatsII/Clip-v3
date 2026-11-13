'use client'

import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, LayoutGrid, List, Loader2, Plus, Search, SearchX, Upload, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CreditPill, LowBalanceBanner } from '@/components/billing/Billing'
import { UsageMeter } from '@/components/billing/Usage'
import { InstructionRow, InstructionTile } from '@/components/InstructionCard'
import { PlacePicker, placeStations, type Place } from '@/components/PlacePicker'
import { useSession } from '@/components/providers/Session'
import { Button, LinkButton } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { MicButton } from '@/components/ui/MicButton'
import { EmptyState, ErrorState, SkeletonCards } from '@/components/ui/States'
import { PageHeader } from '@/components/ui/Surface'
import { qk, useCategoriesInUse, useInstructionCount, useInstructionSearch, usePublishedCount, useStationRefs, useStations } from '@/hooks/queries'
import { useLimit } from '@/lib/billing/state'
import { useMessages } from '@/lib/i18n'
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/model/catalog'
import { backfillIndex, type LibraryQuery, type LibraryStatus } from '@/lib/model/search'
import type { CategoryKey } from '@/lib/model/types'
import { useToggle } from '@/lib/toggles'
import { cn } from '@/lib/util/cn'

function pref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(`clip_pref_${key}`) as T) || fallback
  } catch {
    return fallback
  }
}

/** La mise à jour de l'index des anciennes instructions : une fois par séance, en arrière-plan. */
let backfilled = false

/** Ce qu'on tape, une fois qu'on s'arrête (la recherche part au serveur). */
function useSettled(value: string, ms = 300): string {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return settled
}

/**
 * La bibliothèque : la recherche se fait au serveur, dans tout ce que dit une instruction (numéro,
 * titre, étiquettes, équipement, étapes, postes), une page à la fois. Les filtres : pour moi, statut,
 * lieu (un secteur ou un poste), catégorie.
 */
export default function InstructionsPage() {
  const router = useRouter()
  const params = useSearchParams()
  const qc = useQueryClient()
  const { me, can, profile, data } = useSession()
  const t = useMessages()
  const tl = t.instructions.list
  const stations = useStations()
  const refs = useStationRefs()
  // Rien tant qu'on est loin de la limite : la jauge ne s'allume qu'à 80 % des instructions publiées.
  const publishedCount = usePublishedCount()
  const publishLimit = useLimit('published_instructions', publishedCount.data)
  const categoriesInUse = useCategoriesInUse()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const q = useSettled(query.trim())
  const hasFocus = me.categories.length > 0 || me.stationIds.length > 0
  const [scope, setScope] = useState<'mine' | 'all'>(hasFocus ? 'mine' : 'all')
  const [category, setCategory] = useState<CategoryKey | null>(null)
  const [status, setStatus] = useState<LibraryStatus>(params.get('statut') === 'review' ? 'review' : params.get('statut') === 'revoir' ? 'renew' : 'all')
  const [place, setPlace] = useState<Place>(() => (params.get('poste') ? { kind: 'station', id: params.get('poste')! } : params.get('secteur') ? { kind: 'sector', name: params.get('secteur')! } : null))
  const renewalOn = useToggle('renewal')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  useEffect(() => setView(pref('library_view', 'grid')), [])
  useEffect(() => {
    const p = params.get('q')
    if (p !== null) setQuery(p)
  }, [params])

  // Les anciennes instructions reçoivent leur index et leur numéro, sans rien bloquer.
  useEffect(() => {
    if (backfilled || !can('instructions', 'write')) return
    backfilled = true
    const timer = setTimeout(() => {
      void backfillIndex(data)
        .then((r) => {
          if (r.indexed || r.numbered || r.cards) void qc.invalidateQueries({ queryKey: qk.instructions })
        })
        .catch(() => undefined)
    }, 2500)
    return () => clearTimeout(timer)
  }, [can, data, qc])

  const noSector = tl.place.noSector
  const stationIds = useMemo(() => placeStations(place, stations.data ?? [], noSector), [place, stations.data, noSector])
  const search: LibraryQuery = useMemo(
    () => ({ q, status, category, stationIds, mine: scope === 'mine' && hasFocus ? { userId: profile.userId, categories: me.categories, stationIds: me.stationIds } : null }),
    [q, status, category, stationIds, scope, hasFocus, profile.userId, me.categories, me.stationIds],
  )
  const ready = !stations.isLoading
  const results = useInstructionSearch(search, refs, ready)
  const shown = useInstructionCount(search, refs, ready)
  const total = useInstructionCount({}, refs, ready)
  const list = useMemo(() => results.data?.pages.flatMap((p) => p.docs) ?? [], [results.data])
  const filtered = !!(q || category || status !== 'all' || stationIds || (scope === 'mine' && hasFocus))

  // Un code scanné qui correspond à une seule instruction l'ouvre directement.
  useEffect(() => {
    if (params.get('q') && q === params.get('q')?.trim() && results.data && list.length === 1 && !results.hasNextPage) router.replace(`/instructions/${list[0]._id}`)
  }, [params, q, list, results.data, results.hasNextPage, router])

  // La page suivante se charge quand on arrive au bas de la liste.
  const more = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = more.current
    if (!el || !results.hasNextPage) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !results.isFetchingNextPage) void results.fetchNextPage()
    }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [results])

  const stationName = useMemo(() => new Map((stations.data ?? []).map((s) => [s._id, s.json_data.name])), [stations.data])
  const reset = () => {
    setQuery('')
    setCategory(null)
    setStatus('all')
    setScope('all')
    setPlace(null)
  }

  return (
    <div>
      <PageHeader
        title={tl.title}
        subtitle={total.data === undefined ? undefined : filtered && shown.data !== undefined ? tl.count(shown.data, total.data) : tl.total(total.data)}
        actions={
          <>
            <CreditPill />
            {can('instructions', 'write') && (
              <>
                <LinkButton href="/import" icon={<Upload className="h-4 w-4" />} className="max-sm:hidden">
                  {tl.import}
                </LinkButton>
                {/* Sur téléphone, le « + » du bas suffit : une seule action principale à l'écran. */}
                <LinkButton href="/instructions/nouvelle" variant="primary" icon={<Plus className="h-5 w-5" />} className="max-sm:hidden">
                  {tl.new}
                </LinkButton>
              </>
            )}
          </>
        }
      />
      <LowBalanceBanner />
      {can('publish', 'write') && <UsageMeter feature="published_instructions" limit={publishLimit} quiet className="mb-5" />}

      <div className="glass-panel mb-4 flex items-center gap-3 rounded-[24px] px-4">
        <Search className="h-5 w-5 shrink-0 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tl.searchPlaceholder} className="h-14 min-w-0 flex-1 bg-transparent text-[15px] font-bold focus:outline-none" aria-label={tl.search} />
        {results.isFetching && !results.isFetchingNextPage && q && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden />}
        <MicButton label={tl.searchByVoice} onText={(text) => setQuery((v) => (v ? `${v} ${text}` : text))} />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="btn-press flex h-10 w-10 items-center justify-center rounded-xl text-slate-400" aria-label={tl.clear}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="no-scrollbar mb-6 flex items-center gap-2 overflow-x-auto pr-8 pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)]">
        {hasFocus && (
          <Segmented
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'mine', label: tl.scope.mine },
              { value: 'all', label: tl.scope.all },
            ]}
          />
        )}
        {/* « Où ? » d'abord : au téléphone, il se voit sans faire défiler. */}
        <PlacePicker value={place} onChange={setPlace} stations={stations.data ?? []} />
        <Segmented
          size="sm"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: tl.filters.all },
            { value: 'published', label: tl.filters.published },
            { value: 'draft', label: tl.filters.draft },
            { value: 'review', label: tl.filters.review },
            ...(renewalOn ? [{ value: 'renew' as const, label: tl.filters.renew }] : []),
          ]}
        />
        {CATEGORY_KEYS.filter((k) => categoriesInUse.data?.has(k)).map((k) => (
          <button key={k} type="button" onClick={() => setCategory(category === k ? null : k)} className={cn('btn-press h-11 shrink-0 rounded-2xl px-3 text-xs font-black', category === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : CATEGORIES[k].soft)}>
            {CATEGORIES[k].label}
          </button>
        ))}
        <span className="flex-1" />
        <Segmented
          size="sm"
          value={view}
          onChange={(v) => {
            setView(v)
            try {
              localStorage.setItem('clip_pref_library_view', v)
            } catch {
              /* facultatif */
            }
          }}
          options={[
            { value: 'grid', label: <LayoutGrid className="h-4 w-4" aria-label={tl.tiles} /> },
            { value: 'list', label: <List className="h-4 w-4" aria-label={tl.rows} /> },
          ]}
        />
      </div>

      {results.isLoading || !ready ? (
        <SkeletonCards />
      ) : results.error ? (
        <ErrorState error={results.error} onRetry={() => results.refetch()} />
      ) : !list.length && !filtered && total.data === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title={tl.emptyTitle}
          description={tl.emptyText}
          action={can('instructions', 'write') ? <LinkButton href="/instructions/nouvelle" variant="primary" size="lg" icon={<Plus className="h-5 w-5" />}>{tl.newInstruction}</LinkButton> : undefined}
        />
      ) : !list.length ? (
        <EmptyState icon={<SearchX className="h-7 w-7" />} title={tl.noMatchTitle} description={tl.noMatchText} action={<button type="button" className="font-black text-[var(--primary)]" onClick={reset}>{tl.showAll}</button>} />
      ) : (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((d) => (
                <InstructionTile key={d._id} doc={d} stationNames={d.json_data.stationIds.map((s) => stationName.get(s)).filter(Boolean) as string[]} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((d) => (
                <InstructionRow key={d._id} doc={d} stationNames={d.json_data.stationIds.map((s) => stationName.get(s)).filter(Boolean) as string[]} />
              ))}
            </div>
          )}
          {results.hasNextPage && (
            <div ref={more} className="mt-6 flex justify-center">
              <Button onClick={() => void results.fetchNextPage()} loading={results.isFetchingNextPage}>
                {results.isFetchingNextPage ? tl.loadingMore : tl.more}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
