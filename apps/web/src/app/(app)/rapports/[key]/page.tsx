'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart3, Lock, Printer } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { PlacePicker, placeStations, type Place } from '@/components/PlacePicker'
import { useSession } from '@/components/providers/Session'
import { FAMILY_LOOK, REPORT_ICONS } from '@/components/reports/icons'
import { ReportAi } from '@/components/reports/ReportAi'
import { ReportBlocks } from '@/components/reports/ReportBlocks'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { PageHeader } from '@/components/ui/Surface'
import { useStations } from '@/hooks/queries'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { getLang, num, useMessages } from '@/lib/i18n'
import { listOperators } from '@/lib/model/operators'
import type { Shift } from '@/lib/model/types'
import { printHtml } from '@/lib/pdf/print'
import { reportOf, type Block, type ReportContext, type ReportDef } from '@/lib/reports/catalog'
import { DAY, PERIOD_CHOICES, periodOf, previousOf, type PeriodDays } from '@/lib/reports/facts'
import { EVENTS_CAP, loadCards, loadEvents, loadExecutions, loadFeedback, loadLibrary, loadTraining, type EventKind } from '@/lib/reports/load'
import { reportHtml } from '@/lib/reports/print'
import { useToggle } from '@/lib/toggles'
import { cn, formatDate, formatDateTime } from '@/lib/util/cn'

const SHIFTS: Shift[] = ['jour', 'soir', 'nuit', 'fds', 'rotation']

/** Un rapport : la question, les filtres (période, lieu, quart), les blocs calculés, l'analyse. */
export default function ReportPage() {
  const t = useMessages().reports
  const { key } = useParams<{ key: string }>()
  const def = reportOf(key)
  const { can } = useSession()
  const on = useToggle('reports')
  const ent = useEntitlement('adoption_stats')
  const gate = useGate()
  if (!on || !can('stats') || !def) return <EmptyState icon={<BarChart3 className="h-7 w-7" />} title={t.title} description={t.subtitle} action={<BackLink />} />
  if (!def.free && ent === 'locked')
    return (
      <EmptyState
        icon={<Lock className="h-7 w-7" />}
        title={t.list[def.key].title}
        description={t.locked}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <BackLink />
            <Button variant="primary" onClick={() => gate(ent, 'adoption_stats', () => undefined)}>
              {t.list[def.key].title}
            </Button>
          </div>
        }
      />
    )
  return <Report def={def} />
}

function BackLink() {
  const t = useMessages().reports
  return (
    <Link href="/rapports" className="btn-press glass-card inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-black">
      <ArrowLeft className="h-4 w-4" /> {t.back}
    </Link>
  )
}

function Report({ def }: { def: ReportDef }) {
  const words = useMessages()
  const t = words.reports
  const params = useSearchParams()
  const { data, org } = useSession()
  const operatorsOn = useToggle('operators')
  const academyOn = useToggle('academy')
  const academyEnt = useEntitlement('academy')
  const withAcademy = academyOn && (academyEnt === 'open' || academyEnt === 'off')
  const requested = Number(params.get('periode'))
  const [days, setDays] = useState<PeriodDays>(PERIOD_CHOICES.includes(requested as PeriodDays) ? (requested as PeriodDays) : def.defaultDays)
  const [place, setPlace] = useState<Place>(null)
  const [shift, setShift] = useState<Shift | 'none' | 'all'>('all')
  const [now] = useState(() => Date.now())
  // Le début de la période d'avant, à l'heure près : la même clé de cache le temps d'une visite.
  const since = useMemo(() => new Date(Math.floor((now - 2 * days * DAY) / 3600_000) * 3600_000).toISOString(), [now, days])
  const need = (n: ReportDef['needs'][number]) => def.needs.includes(n) && (n !== 'training' || def.key !== 'semaine' || withAcademy)

  const kinds: EventKind[] = def.needs.includes('views') ? ['view', 'complete'] : ['complete']
  const events = useQuery({ queryKey: ['report', 'events', since, kinds.join()], queryFn: () => loadEvents(data, since, kinds), enabled: need('events') })
  const executions = useQuery({ queryKey: ['report', 'executions', since], queryFn: () => loadExecutions(data, since), enabled: need('executions') })
  const feedback = useQuery({ queryKey: ['report', 'feedback', since], queryFn: () => loadFeedback(data, since), enabled: need('feedback') })
  const training = useQuery({ queryKey: ['report', 'training', withAcademy], queryFn: () => loadTraining(data, withAcademy), enabled: need('training') })
  const library = useQuery({ queryKey: ['report', 'library'], queryFn: () => loadLibrary(data), enabled: need('library') })
  const cards = useQuery({ queryKey: ['report', 'cards'], queryFn: () => loadCards(data), staleTime: 10 * 60_000 })
  const stations = useStations()
  const ops = useQuery({ queryKey: ['operators'], queryFn: () => listOperators(data), enabled: operatorsOn })
  const queries = [events, executions, feedback, training, library, cards, stations]
  const loading = queries.some((q) => q.isLoading)
  const failed = queries.find((q) => q.error)

  const shiftOf = useMemo(() => new Map((ops.data ?? []).map((o) => [o._id, o.json_data.shift ?? 'none'] as const)), [ops.data])
  const shiftsHere = (['none', ...SHIFTS] as const).filter((s) => (ops.data ?? []).some((o) => (o.json_data.shift ?? 'none') === s))
  const stationIds = useMemo(() => (place ? new Set(placeStations(place, stations.data ?? [], words.instructions.list.place.noSector)) : null), [place, stations.data, words.instructions.list.place.noSector])
  const blocks: Block[] = useMemo(() => {
    if (loading || failed) return []
    const period = periodOf(days, now)
    const ctx: ReportContext = {
      period,
      previous: previousOf(period),
      scope: { stationIds, shift, shiftOf },
      events: events.data?.events ?? [],
      executions: executions.data ?? [],
      feedback: feedback.data ?? [],
      cards: cards.data ?? new Map(),
      stations: new Map((stations.data ?? []).map((s) => [s._id, { name: s.json_data.name, area: s.json_data.area?.trim() || null }])),
      training: training.data ?? null,
      library: library.data ?? null,
    }
    return def.build(ctx)
  }, [def, loading, failed, days, now, stationIds, shift, shiftOf, events.data, executions.data, feedback.data, cards.data, stations.data, training.data, library.data])

  const title = t.list[def.key].title
  const periodText = `${t.periodLong(days)} · ${t.dataUntil(formatDateTime(new Date(now).toISOString()))}`
  // Ce qui change le rapport : une analyse d'avant ne se montre plus.
  const signature = `${def.key}|${days}|${place ? JSON.stringify(place) : ''}|${shift}`

  function print() {
    void printHtml(reportHtml(blocks, { orgName: org.json_data.name, title, question: t.list[def.key].question, period: periodText, printedOn: t.printedOn(formatDate(new Date().toISOString())), lang: getLang(), dayLabel: words.stats.chart.day, previous: t.previous }))
  }

  return (
    <div className="space-y-5">
      <Link href="/rapports" className="inline-flex items-center gap-1 text-sm font-black text-slate-500">
        <ArrowLeft className="h-4 w-4" /> {t.back}
      </Link>
      <div className="flex items-start gap-4">
        <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm max-sm:hidden', FAMILY_LOOK[def.family])}>{REPORT_ICONS[def.key]}</span>
        <div className="min-w-0 flex-1">
          <PageHeader
            title={title}
            subtitle={t.list[def.key].question}
            actions={
              <Button icon={<Printer className="h-4 w-4" />} onClick={print} disabled={!blocks.length}>
                {t.print}
              </Button>
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={String(days) as `${PeriodDays}`} onChange={(v) => setDays(Number(v) as PeriodDays)} options={PERIOD_CHOICES.map((d) => ({ value: String(d) as `${PeriodDays}`, label: t.periods(d) }))} />
        {!!stations.data?.length && <PlacePicker value={place} onChange={setPlace} stations={stations.data} />}
        {def.byShift !== false && shiftsHere.length > 1 && (
          <div role="radiogroup" aria-label={words.team.shift} className="no-scrollbar flex max-w-full gap-2 overflow-x-auto">
            {(['all', ...shiftsHere] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={shift === s} onClick={() => setShift(s)} className={cn('btn-press h-11 shrink-0 rounded-2xl px-3 text-sm font-black', shift === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card text-slate-700 dark:text-slate-200')}>
                {s === 'all' ? t.allShifts : s === 'none' ? t.withoutShift : words.team.shifts[s]}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="px-1 text-xs font-bold text-slate-500">{periodText}</p>
      {events.data?.capped && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">{t.capped(num(EVENTS_CAP))}</p>}

      {failed ? (
        <ErrorState error={failed.error} onRetry={() => void Promise.all(queries.map((q) => q.refetch()))} />
      ) : loading ? (
        <SkeletonRows />
      ) : (
        <>
          <ReportBlocks blocks={blocks} reportKey={def.key} />
          <ReportAi title={title} period={periodText} blocks={blocks} signature={signature} />
        </>
      )}
    </div>
  )
}
