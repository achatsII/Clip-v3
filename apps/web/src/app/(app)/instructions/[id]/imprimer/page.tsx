'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import QRCode from 'qrcode'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PrintLayoutPanel } from '@/components/print/PrintLayoutPanel'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { ErrorState, errorText, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { templateFromExample } from '@/lib/ai/printTemplate'
import { BRAND, brandColorOf } from '@/lib/brand/colors'
import { ingestFile } from '@/lib/media/ingest'
import { nextScale, overflowPages, pageBox, templateOf, withoutBrandKit, type PrintTemplate } from '@/lib/pdf/template'
import { cn } from '@/lib/util/cn'
import { useInstruction, useStations, useVersions } from '@/hooks/queries'
import { callNative, hasCapability } from '@/lib/bridge/native'
import { useToggle } from '@/lib/toggles'
import { buildPrintHtml } from '@/lib/pdf/printHtml'
import { T } from '@/lib/model/repo'
import type { Published } from '@/lib/model/types'
import { linkUrl } from '@/lib/share'
import { useEntitlement } from '@/lib/billing/state'
import { useMessages } from '@/lib/i18n'

export default function PrintPage() {
  const { id } = useParams<{ id: string }>()
  const session = useSession()
  const recordsOn = useToggle('records')
  // Les outils en images (toggle `toolImages`) : l'emoji devant chaque outil.
  const toolImages = useToggle('toolImages')
  const t = useMessages()
  const instruction = useInstruction(id)
  const stations = useStations()
  const versions = useVersions(id)
  const brandKit = useEntitlement('brand_kit')
  const toast = useToast()
  const frame = useRef<HTMLIFrameElement>(null)
  // La mise en page (toggle `printTemplates`) : celle de l'usine, que chacun ajuste pour son impression.
  const templatesOn = useToggle('printTemplates')
  const plantTemplate = useMemo(() => templateOf(session.org.json_data), [session.org.json_data])
  const [template, setTemplate] = useState<PrintTemplate>(plantTemplate)
  const [panelOpen, setPanelOpen] = useState(false)
  const [savingPlant, setSavingPlant] = useState(false)
  const [readingExample, setReadingExample] = useState(false)
  // Sans le logo et les couleurs de l'usine, la disposition et l'orientation seulement.
  const effective = useMemo(() => (templatesOn ? (brandKit === 'locked' ? withoutBrandKit(template) : template) : undefined), [templatesOn, brandKit, template])
  // « Une page » : l'échelle qui fait tenir la feuille, mesurée dans l'aperçu.
  const [scale, setScale] = useState(1)
  const [pages, setPages] = useState(1)
  const fitRuns = useRef(0)
  // Un écran plus étroit que le papier (téléphone) : l'aperçu se réduit pour tenir, le document non.
  const view = useRef<HTMLDivElement>(null)
  const [viewScale, setViewScale] = useState(1)
  const sheetWidth = effective ? pageBox(effective.orientation).width + 32 : 0
  useEffect(() => {
    const el = view.current
    if (!el || !sheetWidth || typeof ResizeObserver === 'undefined') return setViewScale(1)
    const ro = new ResizeObserver(() => setViewScale(Math.min(1, el.clientWidth / sheetWidth)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [sheetWidth])
  const [qr, setQr] = useState<string | null>(null)
  const doc = instruction.data
  const published = useQuery({
    queryKey: ['published', id, doc?.json_data.publishedId],
    queryFn: () => session.data.get<Published>(T.published, doc!.json_data.publishedId!),
    enabled: !!doc?.json_data.publishedId,
  })
  const live = doc?.json_data.shareLinkId ? linkUrl('instruction', doc.json_data.shareLinkId) : null

  useEffect(() => {
    if (!live) return
    void QRCode.toString(live, { type: 'svg', margin: 0 }).then(setQr).catch(() => setQr(null))
  }, [live])

  // Les proportions des images, lues avant de composer le PDF : chaque image garde sa forme et
  // ses annotations tombent juste dessus.
  const [ratios, setRatios] = useState<Record<string, number>>({})
  const contentForRatios = doc ? (published.data && !doc.json_data.dirty ? published.data.json_data.content : doc.json_data.draft) : null
  const imageUrls = useMemo(
    () =>
      (contentForRatios?.steps ?? [])
        .map((st) => st.media[0])
        .map((m) => (m?.kind === 'image' ? m.url : m?.kind === 'video' ? m.posterUrl : m?.kind === 'document' ? m.pageImageUrl : undefined))
        .filter((u): u is string => !!u),
    [contentForRatios],
  )
  useEffect(() => {
    let alive = true
    for (const url of imageUrls) {
      if (ratios[url]) continue
      const img = new Image()
      img.onload = () => alive && img.naturalHeight && setRatios((r) => ({ ...r, [url]: img.naturalWidth / img.naturalHeight }))
      img.src = url
    }
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrls])

  const html = useMemo(() => {
    if (!doc) return ''
    // La version publiée si elle existe et que le brouillon ne diffère pas ; sinon le brouillon, marqué comme tel.
    const usePublished = !!published.data && !doc.json_data.dirty
    const content = usePublished ? published.data!.json_data.content : doc.json_data.draft
    if (!content) return ''
    const latest = versions.data?.[0]?.json_data
    return buildPrintHtml(content, {
      branding: { orgName: session.org.json_data.name, logoUrl: session.org.json_data.logoUrl, color: session.org.json_data.color },
      number: doc.json_data.number ?? null,
      version: usePublished ? published.data!.json_data.version : null,
      publishedAt: usePublished ? published.data!.json_data.publishedAt : null,
      approvedByName: usePublished ? latest?.approvedByName ?? null : null,
      stationNames: (stations.data ?? []).filter((s) => doc.json_data.stationIds.includes(s._id)).map((s) => s.json_data.name),
      liveUrl: live,
      qrSvg: qr,
      // Le droit se lit dans l'état (aperçu compris) ; facturation éteinte, rien n'est fermé.
      showClipMention: brandKit === 'locked',
      draft: !usePublished,
      ratios,
      records: recordsOn,
      template: effective,
      scale: effective?.layout === 'onePage' ? scale : 1,
      toolImages,
    })
  }, [doc, published.data, versions.data, stations.data, session.org.json_data, live, qr, brandKit, ratios, recordsOn, effective, scale, toolImages])

  // Une autre mise en page, d'autres images connues : « Une page » se règle de nouveau.
  const fitKey = effective?.layout === 'onePage' ? JSON.stringify([effective, Object.keys(ratios).length, doc?._id]) : ''
  useEffect(() => {
    fitRuns.current = 0
    setScale(1)
    setPages(1)
  }, [fitKey])

  /** L'aperçu chargé : « Une page » mesure la feuille et règle son échelle, en quelques passes au plus. */
  const onFrameLoad = useCallback(async () => {
    if (effective?.layout !== 'onePage') return
    const d = frame.current?.contentDocument
    const sheet = d?.getElementById('sheet')
    if (!d || !sheet) return
    await d.fonts?.ready.catch(() => undefined)
    const height = sheet.getBoundingClientRect().height
    const page = pageBox(effective.orientation).height
    const next = nextScale(scale, height, page)
    if (next !== null && fitRuns.current < 6) {
      fitRuns.current += 1
      setScale(next)
      return
    }
    setPages(overflowPages(scale, height, page))
  }, [effective, scale])

  async function saveForPlant() {
    setSavingPlant(true)
    try {
      await session.updateOrg({ print: template })
      toast.success(t.instructions.printPreview.savedForPlant, t.instructions.printPreview.savedForPlantHint)
    } catch (e) {
      toast.error(t.instructions.printPreview.saveFailed, errorText(e))
    } finally {
      setSavingPlant(false)
    }
  }

  /** « D'après un exemple » : le document part au stockage (un Word devient un PDF), puis l'IA en lit la mise en page. */
  async function fromExample(file: File) {
    setReadingExample(true)
    try {
      const source = await ingestFile(file, session.files)
      if (!source.url) throw new Error(t.instructions.printPreview.fromExampleFailed)
      const read = await templateFromExample(session.ai, { url: source.url, mimeType: source.mimeType || (source.kind === 'photo' ? 'image/jpeg' : 'application/pdf'), filename: source.name ?? file.name })
      setTemplate(read)
      toast.success(t.instructions.printPreview.fromExampleDone, t.instructions.printPreview.fromExampleDoneHint)
    } catch (e) {
      toast.error(t.instructions.printPreview.fromExampleFailed, errorText(e))
    } finally {
      setReadingExample(false)
    }
  }

  const fitNote = effective?.layout === 'onePage' ? (pages > 1 ? t.instructions.printPreview.tooLong(pages) : scale < 0.995 ? t.instructions.printPreview.fitted(Math.round(scale * 100)) : null) : null

  async function print() {
    if (hasCapability('print')) {
      await callNative('print', { html }).catch(() => undefined)
      return
    }
    frame.current?.contentWindow?.focus()
    frame.current?.contentWindow?.print()
  }

  if (instruction.isLoading) return <Skeleton className="h-[80dvh] w-full" />
  if (instruction.error || !doc) return <ErrorState error={instruction.error} onRetry={() => instruction.refetch()} />

  const panel = effective ? (
    <PrintLayoutPanel
      value={template}
      onChange={setTemplate}
      brand={brandKit}
      plant={plantTemplate}
      plantColor={brandColorOf(session.org.json_data.color) ?? BRAND.primary}
      canSave={session.can('settings', 'write')}
      saving={savingPlant}
      onSave={() => void saveForPlant()}
      onExample={(file) => void fromExample(file)}
      readingExample={readingExample}
      note={fitNote}
    />
  ) : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-slate-900">
      <div className="glass-nav pt-safe flex items-center gap-3 border-b px-4 py-3">
        <Link href={`/instructions/${id}`} className="btn-press flex h-11 items-center gap-1 rounded-2xl px-3 text-sm font-black">
          <ArrowLeft className="h-4 w-4" /> {t.common.back}
        </Link>
        <p className="flex-1 truncate text-sm font-bold text-slate-500">{t.instructions.printPreview.hint}</p>
        {panel && (
          <Button className="lg:hidden" aria-expanded={panelOpen} onClick={() => setPanelOpen((o) => !o)} icon={<SlidersHorizontal className="h-4 w-4" />}>
            <span className="max-sm:hidden">{t.instructions.printPreview.layoutTitle}</span>
          </Button>
        )}
        <Button variant="primary" icon={<Printer className="h-4 w-4" />} onClick={print} disabled={!html}>
          <span className="max-sm:hidden">{t.instructions.printPreview.print}</span>
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {panel && <aside className={cn('glass-panel overflow-y-auto border-b p-4 lg:block lg:w-80 lg:shrink-0 lg:border-r lg:border-b-0', panelOpen ? 'max-h-[55dvh]' : 'hidden')}>{panel}</aside>}
        <div ref={view} className="relative min-h-0 w-full flex-1 overflow-hidden bg-white">
          <iframe
            ref={frame}
            title={t.instructions.printPreview.frame}
            srcDoc={html}
            onLoad={() => void onFrameLoad()}
            className="absolute top-0 left-0 h-full w-full bg-white"
            style={viewScale < 1 ? { width: `${100 / viewScale}%`, height: `${100 / viewScale}%`, transform: `scale(${viewScale})`, transformOrigin: '0 0' } : undefined}
          />
        </div>
      </div>
    </div>
  )
}
