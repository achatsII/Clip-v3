'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, FileText, FileUp, Loader2, Play, RotateCcw, Upload } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LockBadge } from '@/components/billing/Billing'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { PageHeader, Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { qk, useStations } from '@/hooks/queries'
import { useCreations } from '@/hooks/useCreations'
import { enrichMedia, importAsk, importDocument } from '@/lib/ai/generate'
import { matchStation } from '@/lib/ai/normalize'
import { startServerImport } from '@/lib/ai/runGeneration'
import type { Doc } from '@/lib/gateway/data'
import { MAX_ASK_FILES } from '@/lib/gateway/ai'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { messages, useMessages } from '@/lib/i18n'
import { generatesOnServer } from '@/lib/ai/durableAsk'
import { ingestFile, ingestSlides, isSlides } from '@/lib/media/ingest'
import { canReadSlides, isPptx } from '@/lib/media/slides'
import { nowIso, T } from '@/lib/model/repo'
import { hasLabels, labelsFromAi, ruleStationsFor } from '@/lib/model/nomenclature'
import { createInstruction, saveDraft } from '@/lib/model/service'
import type { Instruction, Source } from '@/lib/model/types'
import { useToggle } from '@/lib/toggles'
import { cn } from '@/lib/util/cn'

/** `server` : l'analyse tourne au serveur ; l'instruction existe déjà, le premier appareil ouvert la termine. */
type ItemStatus = 'waiting' | 'uploading' | 'uploaded' | 'analyzing' | 'server' | 'done' | 'error'

interface ImportItem {
  id: string
  name: string
  status: ItemStatus
  source?: Source
  /** Une présentation lue dans l'app : sa note, puis ses images (toggle `slidesImport`). */
  sources?: Source[]
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
  // L'analyse au serveur (toggle `serverGeneration` et réglage de l'usine) : on peut fermer l'app.
  const serverToggle = useToggle('serverGeneration')
  // Le choix de l'usine ; sans choix, au serveur (on peut fermer l'écran, au bureau aussi).
  const serverOn = generatesOnServer(org.json_data.generation?.server, serverToggle)
  const figures = useToggle('documentFigures')
  // Un PowerPoint se lit dans l'app (la Gateway ne le convertit pas) : son texte et ses images.
  const slides = useToggle('slidesImport') && canReadSlides()
  const creations = useCreations()
  const entitlement = useEntitlement('bulk_import')
  const gate = useGate()
  const [jobId, setJobId] = useState<string | null>(null)
  const [items, setItems] = useState<ImportItem[]>([])
  const [running, setRunning] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  // Le fichier d'un document pas encore envoyé : « Réessayer » le renvoie (un gros PDF reprend où il était).
  const fileFor = useRef(new Map<string, File>())
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
    const docs = list.filter((f) => /\.(pdf|docx?|odt)$/i.test(f.name) || f.type === 'application/pdf' || (slides && isPptx(f)))
    // Une présentation qui ne se lit pas : on dit le geste (un .pptx, ou un PDF).
    if (list.some((f) => isSlides(f) && !(slides && isPptx(f)))) toast.info(t.importer.slides, slides ? t.capture.upload.oldSlides : t.importer.slidesText)
    else if (docs.length < list.length) toast.info(t.importer.onlyDocuments, t.importer.onlyDocumentsText)
    if (!docs.length) return
    const added: ImportItem[] = docs.map((f) => ({ id: `${Date.now()}-${f.name}-${Math.random().toString(36).slice(2, 6)}`, name: f.name, status: 'waiting' }))
    let next = [...itemsRef.current, ...added]
    itemsRef.current = next
    setItems(next)
    let id = await persist(next)
    added.forEach((item, k) => fileFor.current.set(item.id, docs[k]))
    // Envoi et conversion, un fichier à la fois (les conversions de la Gateway passent une par une).
    for (const item of added) {
      next = await uploadItem(item.id)
      id = await persist(next, id)
    }
    void run()
  }

  /** Envoie (ou renvoie) le document d'un élément ; rend la liste à jour. */
  async function uploadItem(itemId: string) {
    const file = fileFor.current.get(itemId)
    if (!file) return itemsRef.current
    update(itemId, { status: 'uploading', error: undefined })
    try {
      if (slides && isPptx(file)) {
        const sources = await ingestSlides(file, files)
        fileFor.current.delete(itemId)
        return update(itemId, { status: 'uploaded', source: sources[0], sources })
      }
      const source = await ingestFile(file, files)
      fileFor.current.delete(itemId)
      return update(itemId, { status: 'uploaded', source })
    } catch (e) {
      return update(itemId, { status: 'error', error: e instanceof Error ? e.message : t.importer.errors.upload })
    }
  }

  async function retryUpload(itemId: string) {
    await persist(await uploadItem(itemId))
    void run()
  }

  /** L'analyse sur cet appareil ; `existing` : l'instruction déjà créée (le serveur n'a pas pris l'analyse). */
  async function analyzeHere(item: ImportItem, stationList: Array<{ id: string; name: string; code?: string }>, existing?: Doc<Instruction>) {
    const r = await importDocument({ ai, org: org.json_data, source: item.source!, sources: item.sources, stationNames: stationList.map((s) => [s.name, s.code].filter(Boolean).join(' — ')) })
    const doc = existing ?? (await createInstruction(data, actor, { title: r.content.title, origin: 'import', sources: item.sources?.length ? item.sources : [item.source!], kind: r.content.kind, category: r.content.category }))
    const content = await enrichMedia(r.content, files, async (png, name) => (await files.upload(png, name, 'pages')).url, { figures: figures ? { ai } : null })
    const station = matchStation(r.stationGuess, stationList)
    // Le classement proposé par l'IA, ramené aux familles de l'usine ; ses postes par règle suivent.
    const nomenclature = org.json_data.nomenclature
    const labels = labelsFromAi(r.aiLabels, nomenclature)
    await saveDraft(data, doc._id, doc.json_data, content, actor, {
      stationIds: station ? [station] : [],
      ...(nomenclature?.families.length ? { labels, labelsCheck: hasLabels(labels) ? ('ai' as const) : null, ruleStationIds: ruleStationsFor(stations.data ?? [], labels, content.category) } : {}),
      generation: { at: nowIso(), model: r.model, operation: r.operation, questions: r.questions, choices: r.choices, stationGuess: r.stationGuess, rating: null, comment: null },
    })
    return { instructionId: doc._id, title: content.title }
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
          // Plus de 10 fichiers (une présentation et ses images) : seule la voie du serveur les lit d'un coup.
          const many = (importAsk({ org: org.json_data, source: item.source!, sources: item.sources, stationNames: [] }).ask.files?.length ?? 0) > MAX_ASK_FILES
          if (serverOn || many) {
            // L'instruction est créée tout de suite ; son analyse part au serveur.
            const r = await startServerImport({ data, ai, org: org.json_data, source: item.source!, sources: item.sources, stations: stations.data ?? [], actor, title: item.name.replace(/\.[^.]+$/, ''), figures })
            if (r.jobId) {
              next = update(item.id, { status: 'server', instructionId: r.doc._id })
              await persist(next)
              continue
            }
            next = update(item.id, { status: 'done', ...(await analyzeHere(item, stationList, r.doc)) })
          } else {
            next = update(item.id, { status: 'done', ...(await analyzeHere(item, stationList)) })
          }
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

  // Une analyse au serveur est finie quand son instruction n'est plus en création (prête ou ratée : elle le dit).
  const creating = new Set((creations.data ?? []).map((d) => d._id))
  const shown = (i: ImportItem): ItemStatus => (i.status === 'server' && creations.isFetched && !creating.has(i.instructionId ?? '') ? 'done' : i.status)
  const done = items.filter((i) => shown(i) === 'done').length
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
          {slides ? t.importer.drop.formatsSlides : t.importer.drop.formats}
        </span>
      </button>
      <input ref={input} type="file" multiple accept={slides ? '.pdf,.doc,.docx,.odt,.pptx,.ppsx,application/pdf' : '.pdf,.doc,.docx,.odt,application/pdf'} className="hidden" onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />

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
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', shown(i) === 'done' ? 'bg-emerald-500 text-white' : i.status === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-900/5 dark:bg-white/10')}>
                  {shown(i) === 'done' ? <CheckCircle2 className="h-5 w-5" /> : i.status === 'error' ? <AlertCircle className="h-5 w-5" /> : i.status === 'uploading' || i.status === 'analyzing' || i.status === 'server' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{i.title ?? i.name}</span>
                  <span className={cn('block text-xs font-bold', i.status === 'error' ? 'text-rose-600' : 'text-slate-500')}>{i.status === 'error' ? i.error : t.importer.status[shown(i)]}</span>
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
                {i.status === 'error' && !i.source && fileFor.current.has(i.id) && (
                  <Button size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={() => void retryUpload(i.id)}>
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
