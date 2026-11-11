'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, FileText, FileUp, Loader2, Play, RotateCcw, Upload } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { LockBadge } from '@/components/billing/Billing'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { PageHeader, Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { qk, useStations } from '@/hooks/queries'
import { enrichMedia, importDocument } from '@/lib/ai/generate'
import { matchStation } from '@/lib/ai/normalize'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { messages, useMessages } from '@/lib/i18n'
import { ingestFile } from '@/lib/media/ingest'
import { nowIso, T } from '@/lib/model/repo'
import { createInstruction, saveDraft } from '@/lib/model/service'
import type { Source } from '@/lib/model/types'
import { useToggle } from '@/lib/toggles'
import { cn } from '@/lib/util/cn'

type ItemStatus = 'waiting' | 'uploading' | 'uploaded' | 'analyzing' | 'done' | 'error'

interface ImportItem {
  id: string
  name: string
  status: ItemStatus
  source?: Source
  instructionId?: string
  title?: string
  error?: string
}

interface ImportJob {
  items: ImportItem[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export default function ImportPage() {
  const session = useSession()
  const { data, files, ai, org, profile, displayName, can } = session
  const t = useMessages()
  const toast = useToast()
  const qc = useQueryClient()
  const stations = useStations()
  const toggle = useToggle('bulkImport')
  const entitlement = useEntitlement('bulk_import')
  const gate = useGate()
  const [jobId, setJobId] = useState<string | null>(null)
  const [items, setItems] = useState<ImportItem[]>([])
  const [running, setRunning] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const actor = { id: profile.userId, name: displayName }

  // Le dernier lot non terminé de la personne : on peut le reprendre.
  const last = useQuery({
    queryKey: ['import-last', profile.userId],
    queryFn: async () => (await data.filter<ImportJob>(T.importJob, { filter: { 'json_data.createdBy': { $eq: profile.userId } }, limit: 1 }))[0] ?? null,
  })
  useEffect(() => {
    if (last.data && !jobId && last.data.json_data.items.some((i) => i.status !== 'done')) {
      setJobId(last.data._id)
      setItems(last.data.json_data.items.map((i) => (i.status === 'analyzing' || i.status === 'uploading' ? { ...i, status: i.source ? 'uploaded' : 'error', error: i.source ? undefined : messages().importer.errors.interrupted } : i)))
    }
  }, [last.data, jobId])

  const persist = useCallback(
    async (next: ImportItem[], id = jobId) => {
      const json: ImportJob = { items: next, createdBy: profile.userId, createdAt: nowIso(), updatedAt: nowIso() }
      if (id) await data.patch(T.importJob, id, { items: next, updatedAt: nowIso() }).catch(() => undefined)
      else {
        const doc = await data.insert<ImportJob>(T.importJob, json, 'Import en lot')
        setJobId(doc._id)
        return doc._id
      }
      return id
    },
    [data, jobId, profile.userId],
  )

  const update = (id: string, patch: Partial<ImportItem>) => {
    const next = itemsRef.current.map((i) => (i.id === id ? { ...i, ...patch } : i))
    itemsRef.current = next
    setItems(next)
    return next
  }

  async function addFiles(list: File[]) {
    const docs = list.filter((f) => /\.(pdf|docx?|odt)$/i.test(f.name) || f.type === 'application/pdf')
    if (docs.length < list.length) toast.info(t.importer.onlyDocuments, t.importer.onlyDocumentsText)
    if (!docs.length) return
    const added: ImportItem[] = docs.map((f) => ({ id: `${Date.now()}-${f.name}-${Math.random().toString(36).slice(2, 6)}`, name: f.name, status: 'waiting' }))
    let next = [...itemsRef.current, ...added]
    itemsRef.current = next
    setItems(next)
    let id = await persist(next)
    // Envoi et conversion, un fichier à la fois (les conversions de la Gateway passent une par une).
    for (let k = 0; k < docs.length; k++) {
      const item = added[k]
      next = update(item.id, { status: 'uploading' })
      try {
        const source = await ingestFile(docs[k], files)
        next = update(item.id, { status: 'uploaded', source })
      } catch (e) {
        next = update(item.id, { status: 'error', error: e instanceof Error ? e.message : t.importer.errors.upload })
      }
      id = await persist(next, id)
    }
    void run()
  }

  async function run() {
    if (running) return
    setRunning(true)
    try {
      const stationList = (stations.data ?? []).map((s) => ({ id: s._id, name: s.json_data.name, code: s.json_data.code }))
      for (const item of itemsRef.current.filter((i) => i.status === 'uploaded' && i.source)) {
        let next = update(item.id, { status: 'analyzing' })
        await persist(next)
        try {
          const r = await importDocument({ ai, org: org.json_data, source: item.source!, stationNames: stationList.map((s) => [s.name, s.code].filter(Boolean).join(' — ')) })
          const doc = await createInstruction(data, actor, { title: r.content.title, origin: 'import', sources: [item.source!], kind: r.content.kind, category: r.content.category })
          const content = await enrichMedia(r.content, files, async (png, name) => (await files.upload(png, name, 'pages')).url)
          const station = matchStation(r.stationGuess, stationList)
          await saveDraft(data, doc._id, doc.json_data, content, actor, {
            stationIds: station ? [station] : [],
            generation: { at: nowIso(), model: r.model, operation: r.operation, questions: r.questions, stationGuess: r.stationGuess, rating: null, comment: null },
          })
          next = update(item.id, { status: 'done', instructionId: doc._id, title: content.title })
        } catch (e) {
          next = update(item.id, { status: 'error', error: e instanceof Error ? e.message : t.importer.errors.analysis })
        }
        await persist(next)
      }
      await qc.invalidateQueries({ queryKey: qk.instructions })
    } finally {
      setRunning(false)
    }
  }

  if (!can('instructions', 'write')) return <p className="font-bold text-slate-500">{t.importer.readOnly}</p>
  if (!toggle) return <EmptyState icon={<Upload className="h-7 w-7" />} title={t.importer.unavailableTitle} description={t.importer.unavailableText} />

  const done = items.filter((i) => i.status === 'done').length
  const pending = items.filter((i) => i.status === 'uploaded').length
  const locked = entitlement === 'locked'

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t.importer.title} subtitle={t.importer.subtitle} />
      <button
        type="button"
        onClick={() => gate(entitlement, 'bulk_import', () => input.current?.click())}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const files = Array.from(e.dataTransfer.files)
          gate(entitlement, 'bulk_import', () => void addFiles(files))
        }}
        className="btn-press glass-panel flex w-full flex-col items-center justify-center gap-3 rounded-[40px] border-2 border-dashed border-[rgba(var(--primary-rgb),0.35)] px-6 py-14 text-center"
      >
        <span className="bg-gradient-primary shadow-primary flex h-16 w-16 items-center justify-center rounded-3xl text-white">
          <FileUp className="h-8 w-8" />
        </span>
        <span className="text-xl font-black tracking-tight">{t.importer.drop.title} {locked && <LockBadge />}</span>
        <span className="text-sm font-bold text-slate-500">
          {t.importer.drop.before} <AiCost operation="import_s" className="font-bold" /> {t.importer.drop.after}
        </span>
      </button>
      <input ref={input} type="file" multiple accept=".pdf,.doc,.docx,.odt,application/pdf" className="hidden" onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />

      {items.length > 0 && (
        <Panel className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-black">
              {t.importer.batch.progress(done, items.length)}
            </p>
            {pending > 0 && !running && (
              <Button variant="primary" icon={<Play className="h-4 w-4" />} onClick={run}>
                {t.importer.batch.resume(pending)}
              </Button>
            )}
            {running && (
              <span className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
                <Loader2 className="h-4 w-4 animate-spin" /> {t.importer.batch.running}
              </span>
            )}
          </div>
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', i.status === 'done' ? 'bg-emerald-500 text-white' : i.status === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-900/5 dark:bg-white/10')}>
                  {i.status === 'done' ? <CheckCircle2 className="h-5 w-5" /> : i.status === 'error' ? <AlertCircle className="h-5 w-5" /> : i.status === 'uploading' || i.status === 'analyzing' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{i.title ?? i.name}</span>
                  <span className={cn('block text-xs font-bold', i.status === 'error' ? 'text-rose-600' : 'text-slate-500')}>{i.status === 'error' ? i.error : t.importer.status[i.status]}</span>
                </span>
                {i.instructionId && (
                  <Link href={`/instructions/${i.instructionId}`} className="btn-press glass-card inline-flex h-10 items-center rounded-xl px-3 text-xs font-black">
                    {t.importer.batch.review}
                  </Link>
                )}
                {i.status === 'error' && i.source && (
                  <Button size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={() => { update(i.id, { status: 'uploaded', error: undefined }); void run() }}>
                    {t.common.retry}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
