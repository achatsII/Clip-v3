'use client'

import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Download, Printer, Search, TriangleAlert, X } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CHECK_ICONS } from '@/components/editor/CheckDialog'
import { Trends } from '@/components/records/Trends'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, errorText, ErrorState, SkeletonRows } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/ui/Surface'
import { useStations } from '@/hooks/queries'
import { nativeEnv } from '@/lib/bridge/native'
import { useEntitlement, useGate } from '@/lib/billing/state'
import type { Doc } from '@/lib/gateway/data'
import { getLang, useMessages } from '@/lib/i18n'
import { answerLimits, answerValue, doneBy, listExecutions } from '@/lib/model/executions'
import { executionsCsv, trendsOf } from '@/lib/model/trends'
import type { Execution } from '@/lib/model/types'
import { executionSheet } from '@/lib/pdf/executionSheet'
import { printHtml } from '@/lib/pdf/print'
import { FALLBACK_TOGGLES } from '@/lib/toggleDefaults'
import { usePublicConfig } from '@/lib/toggles'
import { cn, formatDateTime, formatDuration, normalizeText, timeAgo } from '@/lib/util/cn'
import { csvDate, csvSeparator, downloadCsv } from '@/lib/util/csv'

/**
 * Le registre : le travail fait aux postes, du plus récent au plus ancien. Un coup d'œil dit ce qui
 * est conforme et ce qui a des écarts ; un toucher ouvre le travail, chaque relevé et ce qui a été
 * fait devant un écart, à imprimer. `?instruction=` : le registre d'une instruction ; `?ecarts=1` :
 * seulement les écarts.
 */
export default function RecordsPage() {
  const t = useMessages().records
  const { data, can } = useSession()
  const config = usePublicConfig()
  const on = config.data?.toggles.records ?? FALLBACK_TOGGLES.records
  const params = useSearchParams()
  const instructionId = params.get('instruction')
  const [onlyDeviations, setOnlyDeviations] = useState(params.get('ecarts') === '1')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Doc<Execution> | null>(null)
  const stations = useStations()
  const allowed = can('feedback')
  // Le module Relevés : les tendances et l'export ; hors plan, une invitation à l'essai.
  const plusOn = config.data?.toggles.recordsPlus ?? FALLBACK_TOGGLES.recordsPlus
  const plus = useEntitlement('records_plus')
  const plusOpen = plusOn && (plus === 'open' || plus === 'off')
  const [view, setView] = useState<'list' | 'trends'>('list')
  const [exporting, setExporting] = useState(false)
  const toast = useToast()
  const list = useQuery({
    queryKey: ['executions', instructionId, onlyDeviations],
    queryFn: () => listExecutions(data, { instructionId, deviations: onlyDeviations }),
    enabled: on && allowed,
    refetchInterval: 60_000,
  })
  const stationName = useMemo(() => new Map((stations.data ?? []).map((s) => [s._id, s.json_data.name])), [stations.data])
  const trends = useMemo(() => (plusOpen && view === 'trends' ? trendsOf(list.data ?? []) : []), [plusOpen, view, list.data])

  if (config.isLoading) return <SkeletonRows />
  if (!on || !allowed) return <EmptyState icon={<ClipboardCheck className="h-7 w-7" />} title={t.title} description={t.emptyHint} />

  const q = normalizeText(query.trim())
  const rows = (list.data ?? []).filter((d) => {
    if (!q) return true
    const e = d.json_data
    return normalizeText(`${e.instructionTitle} ${doneBy(e) ?? ''} ${stationName.get(e.stationId ?? '') ?? ''}`).includes(q)
  })
  const forInstruction = instructionId ? list.data?.[0]?.json_data.instructionTitle : null
  // L'export prend tout le registre de la vue (jusqu'à 5 000 travaux), pas seulement les 300 affichés.
  async function exportCsv() {
    setExporting(true)
    try {
      const all = await listExecutions(data, { instructionId, deviations: onlyDeviations, limit: 5000 })
      const docs = all.filter((d) => !q || normalizeText(`${d.json_data.instructionTitle} ${doneBy(d.json_data) ?? ''} ${stationName.get(d.json_data.stationId ?? '') ?? ''}`).includes(q))
      const csv = executionsCsv(docs, {
        head: [...t.exportHead],
        sep: csvSeparator(getLang()),
        text: (a) => answerValue(a, t),
        item: (label, state) => t.itemLine(label, t.itemStates[state]),
        verdict: (ok) => (ok === null ? '' : ok ? t.ok : t.bad),
        date: (iso) => csvDate(iso),
        station: (id) => (id ? (stationName.get(id) ?? '') : ''),
      })
      downloadCsv(t.exportFile(csvDate(new Date().toISOString(), false)), csv)
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader title={t.title} subtitle={t.subtitle} />

      {plusOn && plus === 'locked' && <RecordsTeaser />}

      {/* Au téléphone, les choix côte à côte quand ils tiennent, la recherche sur sa ligne. */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        {plusOpen && (
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'list' as const, label: t.views.list },
              { value: 'trends' as const, label: t.views.trends },
            ]}
          />
        )}
        <Segmented
          value={onlyDeviations ? 'dev' : 'all'}
          onChange={(v) => setOnlyDeviations(v === 'dev')}
          options={[
            { value: 'all' as const, label: t.all },
            { value: 'dev' as const, label: t.deviations, icon: <TriangleAlert className="h-4 w-4" /> },
          ]}
        />
        {instructionId && (
          <Link href="/registre" className="btn-press glass-card flex h-11 max-w-full items-center gap-2 self-start rounded-2xl px-3 text-sm font-black sm:self-auto">
            <span className="truncate">{forInstruction ? t.forInstruction(forInstruction) : t.allInstructions}</span>
            <X className="h-4 w-4 shrink-0" aria-label={t.allInstructions} />
          </Link>
        )}
        {plusOpen && !nativeEnv() && rows.length > 0 && (
          <Button size="sm" className="self-start sm:order-last sm:self-auto" icon={<Download className="h-4 w-4" />} loading={exporting} onClick={() => void exportCsv()}>
            {t.export}
          </Button>
        )}
        {(list.data?.length ?? 0) > 8 && (
          <div className="glass-panel flex flex-1 basis-full items-center gap-3 rounded-[24px] px-4 sm:basis-0">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="h-12 min-w-0 flex-1 bg-transparent text-[15px] font-bold focus:outline-none" />
          </div>
        )}
      </div>

      {list.isLoading ? (
        <SkeletonRows />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data?.length ? (
        <EmptyState icon={<ClipboardCheck className="h-7 w-7" />} title={onlyDeviations ? t.emptyDeviationsTitle : t.emptyTitle} description={onlyDeviations ? t.emptyDeviationsHint : t.emptyHint} />
      ) : !rows.length ? (
        <p className="glass-card rounded-[24px] p-6 text-center font-bold text-slate-500">{t.noMatch}</p>
      ) : plusOpen && view === 'trends' ? (
        <Trends trends={trends} />
      ) : (
        <>
          <p className="label-caps mb-2 px-1 text-slate-500">{t.count(rows.length)}</p>
          <div className="space-y-2">
            {rows.map((d) => {
              const e = d.json_data
              const meta = [doneBy(e) ?? t.nobody, e.stationId ? stationName.get(e.stationId) : null, timeAgo(e.finishedAt)].filter(Boolean).join(' · ')
              return (
                <button key={d._id} type="button" onClick={() => setOpen(d)} className="glass-card btn-press flex w-full items-center gap-3 rounded-[24px] p-3 text-left">
                  <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white', e.deviations ? 'bg-rose-500' : 'bg-gradient-to-br from-[#2EE59D] to-[#18c480]')}>
                    {e.deviations ? <TriangleAlert className="h-6 w-6" /> : <ClipboardCheck className="h-6 w-6" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-black text-slate-900 dark:text-white">{e.instructionTitle}</span>
                    <span className="block truncate text-xs font-bold text-slate-500">{meta}</span>
                  </span>
                  <span className={cn('shrink-0 rounded-lg px-2 py-1 text-[11px] font-black tracking-wide uppercase', e.deviations ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200')}>
                    {e.deviations ? t.deviationCount(e.deviations) : t.conform}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {open && <ExecutionDetail doc={open} stationName={open.json_data.stationId ? (stationName.get(open.json_data.stationId) ?? null) : null} onClose={() => setOpen(null)} />}
    </div>
  )
}

/** Un travail : qui, quand, où, puis chaque relevé, son verdict et ce qui a été fait devant un écart. */
function ExecutionDetail({ doc, stationName, onClose }: { doc: Doc<Execution>; stationName: string | null; onClose: () => void }) {
  const words = useMessages()
  const t = words.records
  const e = doc.json_data
  const seconds = Math.max(0, Math.round((Date.parse(e.finishedAt) - Date.parse(e.startedAt)) / 1000))
  const duration = seconds > 0 ? formatDuration(seconds) : null
  const print = () => void printHtml(executionSheet(e, t, { stationName, when: formatDateTime(e.finishedAt), printedAt: formatDateTime(new Date().toISOString()), duration, lang: getLang() }))
  return (
    <Modal
      open
      onClose={onClose}
      title={e.instructionTitle}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>{words.common.close}</Button>
          <Button variant="primary" icon={<Printer className="h-4 w-4" />} onClick={print}>
            {t.print}
          </Button>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t.by, doneBy(e) ?? t.nobody],
          [t.when, formatDateTime(e.finishedAt)],
          [t.station, stationName ?? t.sources[e.source]],
          [t.duration, duration ?? '—'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-slate-900/5 p-3 dark:bg-white/5">
            <p className="label-caps text-slate-500">{k}</p>
            <p className="mt-0.5 truncate font-black">{v}</p>
          </div>
        ))}
      </div>
      <p className={cn('mb-4 flex items-center gap-2 font-black', e.deviations ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}>
        {e.deviations ? <TriangleAlert className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />} {e.deviations ? t.deviationCount(e.deviations) : t.conform}
      </p>
      {e.answers.length ? (
        <ul className="space-y-2">
          {e.answers.map((a) => {
            const limits = answerLimits(a, t)
            return (
              <li key={`${a.stepId}:${a.checkId}`} className={cn('rounded-2xl p-3', a.ok === false ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-slate-900/[0.03] dark:bg-white/5')}>
                <p className="text-xs font-bold text-slate-500">{a.stepTitle}</p>
                <div className="mt-1 flex items-start gap-3">
                  <span className="mt-0.5 text-[var(--primary)]">{CHECK_ICONS[a.kind]()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 dark:text-white">{a.label}</p>
                    {limits && <p className="text-xs font-bold text-slate-500">{limits}</p>}
                    {a.note && (
                      <p className="mt-1 text-sm font-bold text-rose-700 dark:text-rose-300">
                        {t.note} : {a.note}
                      </p>
                    )}
                    {a.authorizedBy && (
                      <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                        {t.authorizedBy} : {a.authorizedBy}
                      </p>
                    )}
                    {a.items && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {a.items.map((i) => (
                          <li key={i.label} className={cn('rounded-lg px-2 py-0.5 text-xs font-black', i.state === 'ok' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200' : i.state === 'ko' ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200' : 'bg-slate-900/5 text-slate-600 dark:bg-white/10 dark:text-slate-300')}>
                            {i.label} · {t.itemStates[i.state]}
                          </li>
                        ))}
                      </ul>
                    )}
                    {a.photos && a.photos.length > 1 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {a.photos.map((u) => (
                          <a key={u} href={u} target="_blank" rel="noreferrer">
                            <img src={u} alt={a.label} className="h-16 w-16 rounded-xl object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {a.kind === 'photo' && typeof a.value === 'string' && !(a.photos && a.photos.length > 1) ? (
                      <a href={a.value} target="_blank" rel="noreferrer">
                        <img src={a.value} alt={a.label} className="h-16 w-16 rounded-xl object-cover" />
                      </a>
                    ) : (
                      <p className="text-lg font-black tabular-nums">{answerValue(a, t)}</p>
                    )}
                    {a.ok !== null && <p className={cn('text-xs font-black', a.ok ? 'text-emerald-600' : 'text-rose-600')}>{a.ok ? t.ok : t.bad}</p>}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="font-bold text-slate-500">{t.noAnswers}</p>
      )}
    </Modal>
  )
}

/** Sans le module : une invitation à l'essai (les tendances et l'export). */
function RecordsTeaser() {
  const t = useMessages().records.teaser
  const ent = useEntitlement('records_plus')
  const gate = useGate()
  return (
    <section className="glass-panel mb-4 flex flex-col gap-4 rounded-[28px] p-5 sm:flex-row sm:items-center">
      <span className="bg-gradient-accent shadow-accent flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">
        <ClipboardCheck className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-black tracking-tight">{t.title}</p>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t.text}</p>
      </div>
      <Button className="self-end sm:self-auto" onClick={() => gate(ent, 'records_plus', () => undefined)}>
        {t.cta}
      </Button>
    </section>
  )
}
