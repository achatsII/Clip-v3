'use client'

import { ChevronDown, Clock, FileText, Film, Image as ImageIcon, ImagePlus, Loader2, Pencil, Plus, Shapes, SlidersHorizontal, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { MediaView, mediaThumb } from '@/components/media/MediaView'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Input, Segmented, Textarea } from '@/components/ui/Field'
import { useConfirm } from '@/components/ui/Confirm'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { createVisual, illustrationPrompt } from '@/lib/ai/assist'
import { ApiError } from '@/lib/gateway/client'
import { useMessages, type Messages } from '@/lib/i18n'
import { LAYOUTS, layoutOf } from '@/lib/model/media'
import type { Annotation, InstructionContent, Source, Step, StepMedia } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { Annotator } from './Annotator'
import { FramePicker } from './FramePicker'
import { MediaPicker } from './MediaPicker'
import { StepMediaArea } from '@/components/player/StepMediaArea'

/** Assez pour comparer et pour une grille, sans noyer l'étape. */
const MAX_MEDIA = 6

/**
 * Le nom court d'un média, dans la langue de l'outil (`mediaLabel` de model/media reste le nom
 * donné à l'IA).
 */
function mediaName(m: StepMedia, kinds: Messages['editor']['stepEditor']['mediaKinds']): string {
  if (m.kind === 'video') return kinds.clip
  if (m.kind === 'document') return kinds.page(m.page ?? 1)
  if (m.kind === 'html') return kinds.visual
  if (m.frame) return kinds.frame
  return m.generated ? kinds.illustration : kinds.photo
}

function KindIcon({ m }: { m: StepMedia }) {
  if (m.kind === 'video') return <Film className="h-5 w-5" />
  if (m.kind === 'html') return <Shapes className="h-5 w-5" />
  if (m.kind === 'document') return <FileText className="h-5 w-5" />
  return <ImageIcon className="h-5 w-5" />
}

/**
 * Le média d'une étape, dans sa fenêtre : l'aperçu, les médias de l'étape (en ajouter un), puis
 * les gestes du média choisi — annoter, vidéo ou image, l'IA (illustration, schéma), retirer. Le
 * verdict, la légende et la disposition attendent sous « Plus d'options ».
 */
export function StepMediaEditor({
  content,
  step,
  sources,
  readOnly,
  onChange,
  onSourceAdded,
}: {
  content: InstructionContent
  step: Step
  sources: Source[]
  readOnly?: boolean
  onChange: (s: Step) => void
  onSourceAdded: (s: Source) => void
}) {
  const { ai } = useSession()
  const toast = useToast()
  const t = useMessages()
  const te = t.editor.stepEditor
  const [pickerOpen, setPickerOpen] = useState(false)
  const [annotating, setAnnotating] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [visualOpen, setVisualOpen] = useState(false)
  const [visualText, setVisualText] = useState('')
  const [mediaIndex, setMediaIndex] = useState(0)
  const media = step.media[Math.min(mediaIndex, step.media.length - 1)]
  // Les réglages fins restent repliés, sauf s'ils servent déjà.
  const [more, setMore] = useState(() => step.media.some((m) => m.verdict || m.caption) || layoutOf(step) !== 'focus')
  const confirm = useConfirm()
  const [framing, setFraming] = useState(false)
  // Une vidéo, ou une image figée d'une vidéo : on peut passer de l'une à l'autre.
  const frameSource =
    media?.kind === 'video'
      ? { videoUrl: media.url, start: media.start, end: media.end, at: Math.round((media.start + (media.end - media.start) / 2) * 10) / 10 }
      : media?.kind === 'image' && media.frame
        ? { videoUrl: media.frame.videoUrl, start: media.frame.start, end: media.frame.end, at: media.frame.at }
        : null

  const set = (patch: Partial<Step>) => onChange({ ...step, ...patch })

  function applyFrame(url: string, at: number) {
    if (!frameSource || !media) return
    const keep = media.kind === 'image' && media.annotations?.length ? { annotations: media.annotations } : {}
    const next: StepMedia = { kind: 'image', url, sourceId: media.sourceId, frame: { videoUrl: frameSource.videoUrl, at, start: frameSource.start, end: frameSource.end }, ...keep }
    set({ media: step.media.map((m, i) => (i === mediaIndex ? next : m)) })
    toast.success(te.frameTaken, te.frameTakenDetail)
  }

  async function backToVideo() {
    if (!(media?.kind === 'image' && media.frame)) return
    if (media.annotations?.length && !(await confirm({ title: te.backToVideo.title, description: te.backToVideo.description, confirmLabel: te.backToVideo.confirm }))) return
    const f = media.frame
    set({ media: step.media.map((m, i) => (i === mediaIndex ? { kind: 'video', url: f.videoUrl, sourceId: media.sourceId, start: f.start, end: f.end, posterUrl: media.url } : m)) })
  }

  async function illustrate(m: Extract<StepMedia, { kind: 'image' }>) {
    setBusy('illustrate')
    try {
      const prompt = await illustrationPrompt(ai, m.url, step)
      const url = await ai.generateImage(prompt, [m.url])
      onChange({ ...step, media: [...step.media, { kind: 'image', url, generated: true }] })
      setMediaIndex(step.media.length)
      toast.success(te.illustrationCreated, te.illustrationCreatedDetail)
    } catch (e) {
      // Le code aide à trouver la cause (droits, service d'images, image de référence).
      const code = e instanceof ApiError && e.status ? te.errorCode(e.status, e.code) : ''
      toast.error(te.illustrationFailed, `${errorText(e)}${code}`)
    } finally {
      setBusy(null)
    }
  }

  /** Les marques de la photo annotée : au brouillon, sans rien réécrire si rien n'a changé. */
  const setAnnotations = (annotations: Annotation[]) => {
    const m = annotating !== null ? step.media[annotating] : undefined
    if (!m || m.kind !== 'image' || JSON.stringify(m.annotations ?? []) === JSON.stringify(annotations)) return
    set({ media: step.media.map((x, i) => (i === annotating && x.kind === 'image' ? { ...x, annotations } : x)) })
  }
  const setMediaAt = (i: number, patch: Partial<Pick<StepMedia, 'caption' | 'verdict'>>) => set({ media: step.media.map((m, j) => (j === i ? ({ ...m, ...patch } as StepMedia) : m)) })

  async function makeVisual() {
    setBusy('visual')
    try {
      const v = await createVisual(ai, content, step, visualText)
      onChange({ ...step, media: [...step.media, v].slice(-MAX_MEDIA) })
      setMediaIndex(Math.min(step.media.length, MAX_MEDIA - 1))
      setVisualOpen(false)
      setVisualText('')
      toast.success(te.visualAdded, te.visualAddedDetail)
    } catch (e) {
      toast.error(te.visualFailed, errorText(e))
    } finally {
      setBusy(null)
    }
  }

  // L'IA, en un seul menu : l'illustration (à partir d'une photo) et le schéma.
  const aiItems: MenuItem[] = [
    { label: te.aiIllustration, icon: <Wand2 className="h-4 w-4" />, onClick: () => media?.kind === 'image' && void illustrate(media), hidden: media?.kind !== 'image', disabled: !!busy, hint: <AiCost operation="illustrate" /> },
    { label: te.aiVisual, icon: <Shapes className="h-4 w-4" />, onClick: () => setVisualOpen(true), disabled: !!busy, hint: <AiCost operation="visual" /> },
  ]

  return (
    <div>
      {/* L'aperçu, comme au poste */}
      <div className="relative aspect-video overflow-hidden rounded-[24px] bg-slate-900">
        {media && layoutOf(step) !== 'focus' ? (
          <StepMediaArea step={step} labels={t.editor.mediaArea} />
        ) : media ? (
          <MediaView key={`${media.url}-${media.kind === 'video' ? media.start : ''}-${media.kind === 'html' ? media.html.length : ''}`} media={media} autoPlay={false} />
        ) : (
          <button type="button" disabled={readOnly} onClick={() => setPickerOpen(true)} className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/80">
            <ImagePlus className="h-10 w-10" />
            <span className="font-black">{readOnly ? t.editor.step.noMedia : te.addMediaHint}</span>
          </button>
        )}
      </div>

      {!readOnly && (
        <>
          {/* Les médias de l'étape : en choisir un, en ajouter un */}
          {step.media.length > 0 && (
            <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto p-1">
              {step.media.map((m, i) => {
                const thumb = mediaThumb(m)
                const name = `${mediaName(m, te.mediaKinds)} ${i + 1}`
                return (
                  <button key={`${m.url}-${i}`} type="button" onClick={() => setMediaIndex(i)} aria-pressed={i === mediaIndex} aria-label={name} title={name} className={cn('btn-press relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300', i === mediaIndex ? 'ring-4 ring-[var(--primary)]' : 'opacity-75 hover:opacity-100')}>
                    {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center"><KindIcon m={m} /></span>}
                    {m.verdict && <span className={cn('absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-black text-white', m.verdict === 'do' ? 'bg-emerald-500' : 'bg-rose-500')}>{m.verdict === 'do' ? '✓' : '✕'}</span>}
                  </button>
                )
              })}
              {step.media.length < MAX_MEDIA && (
                <button type="button" onClick={() => setPickerOpen(true)} aria-label={t.editor.stage.addMedia} title={t.editor.stage.addMedia} className="btn-press flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-slate-600">
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Les gestes du média choisi */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {media?.kind === 'image' && (
              <Button variant="dark" size="sm" onClick={() => setAnnotating(mediaIndex)} icon={<Pencil className="h-4 w-4" />}>
                {te.annotate}
              </Button>
            )}
            {!media && (
              <Button variant="dark" size="sm" onClick={() => setPickerOpen(true)} icon={<ImagePlus className="h-4 w-4" />}>
                {te.chooseMedia}
              </Button>
            )}
            {frameSource && (
              <Segmented
                size="sm"
                value={media?.kind === 'video' ? 'video' : 'image'}
                onChange={(v) => (v === 'image' ? setFraming(true) : void backToVideo())}
                options={[
                  { value: 'video', label: te.video, icon: <Film className="h-4 w-4" /> },
                  { value: 'image', label: te.image, icon: <ImageIcon className="h-4 w-4" /> },
                ]}
              />
            )}
            {media?.kind === 'image' && media.frame && (
              <Button size="sm" onClick={() => setFraming(true)} icon={<Clock className="h-4 w-4" />}>
                {te.otherMoment}
              </Button>
            )}
            <Menu
              bare
              align="left"
              label={te.withAi}
              items={aiItems}
              trigger={
                <span className="btn-press bg-gradient-accent flex h-11 items-center gap-1.5 rounded-2xl px-3.5 text-sm font-black text-white">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {te.withAi} <ChevronDown className="h-4 w-4" />
                </span>
              }
            />
            {media && (
              <button
                type="button"
                onClick={() => {
                  set({ media: step.media.filter((_, j) => j !== mediaIndex) })
                  setMediaIndex(0)
                }}
                aria-label={te.removeMedia}
                title={te.removeMedia}
                className="btn-press ml-auto flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Le reste attend : à faire / à éviter, légende, disposition au poste */}
          {media && (
            <div className="mt-3">
              <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="btn-press flex h-11 items-center gap-2 rounded-2xl px-2 text-sm font-black text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/5">
                <SlidersHorizontal className="h-4 w-4" /> {te.moreOptions} <ChevronDown className={cn('h-4 w-4 transition-transform', more && 'rotate-180')} />
              </button>
              {more && (
                <div className="animate-slide-up mt-2 space-y-3 rounded-[24px] bg-slate-900/[0.03] p-3 dark:bg-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Segmented
                      size="sm"
                      value={media.verdict ?? 'none'}
                      onChange={(v) => setMediaAt(mediaIndex, { verdict: v === 'none' ? undefined : v })}
                      options={[
                        { value: 'none', label: te.verdicts.none },
                        { value: 'do', label: te.verdicts.do },
                        { value: 'dont', label: te.verdicts.dont },
                      ]}
                    />
                    <Input value={media.caption ?? ''} onChange={(e) => setMediaAt(mediaIndex, { caption: e.target.value || undefined })} placeholder={te.captionPlaceholder} aria-label={te.captionLabel} className="h-11 text-sm" wrapperClassName="min-w-48 flex-1" />
                  </div>
                  {step.media.length > 1 && (
                    <div>
                      <p className="label-caps mb-1.5 text-slate-500">{te.layoutLabel}</p>
                      <Segmented size="sm" value={layoutOf(step)} onChange={(v) => set({ layout: v === 'focus' ? undefined : v })} options={LAYOUTS.map((l) => ({ value: l.value, label: te.layouts[l.value] }))} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        sources={sources}
        current={media}
        onSourceAdded={onSourceAdded}
        onPick={(m) => {
          set({ media: [m, ...step.media.filter((x) => x.url !== m.url || x.kind === 'video' || x.kind === 'html')].slice(0, MAX_MEDIA) })
          setMediaIndex(0)
        }}
      />
      {frameSource && <FramePicker open={framing} onClose={() => setFraming(false)} videoUrl={frameSource.videoUrl} start={frameSource.start} end={frameSource.end} initialAt={frameSource.at} onPicked={applyFrame} />}
      <Modal
        open={visualOpen}
        onClose={() => setVisualOpen(false)}
        title={te.visualDialog.title}
        footer={
          <>
            <Button onClick={() => setVisualOpen(false)}>{t.common.cancel}</Button>
            <Button variant="primary" loading={busy === 'visual'} onClick={() => void makeVisual()} icon={<Shapes className="h-4 w-4" />}>
              {te.visualDialog.draw} <AiCost operation="visual" />
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm font-medium text-slate-500">{te.visualDialog.intro}</p>
        <Textarea autoFocus rows={4} value={visualText} onChange={(e) => setVisualText(e.target.value)} placeholder={te.visualDialog.placeholder} aria-label={te.visualDialog.label} />
      </Modal>
      {annotating !== null && step.media[annotating]?.kind === 'image' && (
        <Annotator
          open
          onClose={() => setAnnotating(null)}
          src={step.media[annotating].url}
          step={step}
          value={(step.media[annotating] as Extract<StepMedia, { kind: 'image' }>).annotations ?? []}
          onSave={setAnnotations}
          onLive={setAnnotations}
        />
      )}
    </div>
  )
}
