'use client'

import { BookOpen, LayoutGrid, List, Plus, Search, SearchX, Upload, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { CreditPill, LowBalanceBanner } from '@/components/billing/Billing'
import { UsageMeter } from '@/components/billing/Usage'
import { InstructionRow, InstructionTile } from '@/components/InstructionCard'
import { useSession } from '@/components/providers/Session'
import { LinkButton } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { EmptyState, ErrorState, SkeletonCards } from '@/components/ui/States'
import { PageHeader } from '@/components/ui/Surface'
import { MicButton } from '@/components/ui/MicButton'
import { useInstructions, useStations } from '@/hooks/queries'
import { useLimit } from '@/lib/billing/state'
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/model/catalog'
import type { CategoryKey } from '@/lib/model/types'
import { cn, normalizeText } from '@/lib/util/cn'

type StatusFilter = 'all' | 'published' | 'draft' | 'review'

function pref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(`clip_pref_${key}`) as T) || fallback
  } catch {
    return fallback
  }
}

export default function InstructionsPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { me, can, profile } = useSession()
  const instructions = useInstructions()
  const stations = useStations()
  // Rien tant qu'on est loin de la limite : la jauge ne s'allume qu'à 80 % des instructions publiées.
  const publishLimit = useLimit('published_instructions', instructions.data?.filter((d) => d.json_data.publishedVersion).length)
  const [query, setQuery] = useState(params.get('q') ?? '')
  const hasFocus = me.categories.length > 0 || me.stationIds.length > 0
  const [scope, setScope] = useState<'mine' | 'all'>(hasFocus ? 'mine' : 'all')
  const [category, setCategory] = useState<CategoryKey | null>(null)
  const [status, setStatus] = useState<StatusFilter>(params.get('statut') === 'review' ? 'review' : 'all')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  useEffect(() => setView(pref('library_view', 'grid')), [])
  useEffect(() => {
    const q = params.get('q')
    if (q !== null) setQuery(q)
  }, [params])

  const stationName = useMemo(() => new Map((stations.data ?? []).map((s) => [s._id, s.json_data.name])), [stations.data])
  const stationText = useMemo(() => new Map((stations.data ?? []).map((s) => [s._id, `${s.json_data.name} ${s.json_data.code ?? ''}`])), [stations.data])

  const list = useMemo(() => {
    const q = normalizeText(query.trim())
    return (instructions.data ?? []).filter((d) => {
      const i = d.json_data
      // Brouillon vide de plus d'une heure (rien n'a été capturé) : on ne l'affiche pas.
      if (!q && !(i.stepCount ?? 0) && !(i.sourceCount ?? 0) && !i.publishedVersion && Date.now() - Date.parse(i.createdAt) > 3600_000) return false
      if (scope === 'mine' && hasFocus) {
        const byCat = me.categories.includes(i.category)
        const byStation = i.stationIds.some((s) => me.stationIds.includes(s))
        if (!byCat && !byStation && i.authorId !== profile.userId) return false
      }
      if (category && i.category !== category) return false
      if (status === 'published' && !i.publishedVersion) return false
      if (status === 'draft' && i.publishedVersion && !i.dirty) return false
      if (status === 'review' && i.status !== 'review') return false
      if (q) {
        const hay = normalizeText([i.title, i.tags.join(' '), ...i.stationIds.map((s) => stationText.get(s) ?? '')].join(' '))
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [instructions.data, query, scope, hasFocus, me, category, status, stationText])

  // Un code scanné qui correspond à une seule instruction l'ouvre directement.
  useEffect(() => {
    if (params.get('q') && list.length === 1 && instructions.data) router.replace(`/instructions/${list[0]._id}`)
  }, [params, list, instructions.data, router])

  const categoriesInUse = useMemo(() => new Set((instructions.data ?? []).map((d) => d.json_data.category)), [instructions.data])

  return (
    <div>
      <PageHeader
        title="Instructions"
        subtitle={instructions.data ? `${list.length} sur ${instructions.data.length}` : undefined}
        actions={
          <>
            <CreditPill />
            {can('instructions', 'write') && (
              <>
                <LinkButton href="/import" icon={<Upload className="h-4 w-4" />} className="max-sm:hidden">
                  Importer
                </LinkButton>
                {/* Sur téléphone, le « + » du bas suffit : une seule action principale à l'écran. */}
                <LinkButton href="/instructions/nouvelle" variant="primary" icon={<Plus className="h-5 w-5" />} className="max-sm:hidden">
                  Nouvelle
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
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un titre, un poste, un numéro de pièce…" className="h-14 min-w-0 flex-1 bg-transparent text-[15px] font-bold focus:outline-none" aria-label="Chercher" />
        <MicButton label="Chercher en parlant" onText={(t) => setQuery((q) => (q ? `${q} ${t}` : t))} />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="btn-press flex h-10 w-10 items-center justify-center rounded-xl text-slate-400" aria-label="Effacer">
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
              { value: 'mine', label: 'Pour moi' },
              { value: 'all', label: 'Tout' },
            ]}
          />
        )}
        <Segmented
          size="sm"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Toutes' },
            { value: 'published', label: 'Publiées' },
            { value: 'draft', label: 'Brouillons' },
            { value: 'review', label: 'À approuver' },
          ]}
        />
        {CATEGORY_KEYS.filter((k) => categoriesInUse.has(k)).map((k) => (
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
            { value: 'grid', label: <LayoutGrid className="h-4 w-4" aria-label="Tuiles" /> },
            { value: 'list', label: <List className="h-4 w-4" aria-label="Liste" /> },
          ]}
        />
      </div>

      {instructions.isLoading ? (
        <SkeletonCards />
      ) : instructions.error ? (
        <ErrorState error={instructions.error} onRetry={() => instructions.refetch()} />
      ) : !instructions.data?.length ? (
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title="Créez votre première instruction"
          description="Filmez un expert qui montre la tâche, ajoutez une note vocale : l’IA rédige les étapes en quelques minutes."
          action={can('instructions', 'write') ? <LinkButton href="/instructions/nouvelle" variant="primary" size="lg" icon={<Plus className="h-5 w-5" />}>Nouvelle instruction</LinkButton> : undefined}
        />
      ) : !list.length ? (
        <EmptyState icon={<SearchX className="h-7 w-7" />} title="Rien ne correspond" description="Essayez un autre mot, ou retirez un filtre." action={<button type="button" className="font-black text-[var(--primary)]" onClick={() => { setQuery(''); setCategory(null); setStatus('all'); setScope('all') }}>Tout afficher</button>} />
      ) : view === 'grid' ? (
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
    </div>
  )
}
