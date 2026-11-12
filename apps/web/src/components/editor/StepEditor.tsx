'use client'

import { ArrowDown, ArrowUp, Clock, Copy, Film, Image as ImageIcon, ImagePlus, Pencil, Plus, Radio, Shapes, Sparkles, Trash2, Wand2, X } from 'lucide-react'
import { useState } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { DictateButton } from '@/components/capture/DictateButton'
import { MediaView } from '@/components/media/MediaView'
import { useSession } from '@/components/providers/Session'
import { Button, IconButton } from '@/components/ui/Button'
import { Input, Label, Segmented, Select, Textarea } from '@/components/ui/Field'
import { useConfirm } from '@/components/ui/Confirm'
import { Menu } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { createVisual, illustrationPrompt } from '@/lib/ai/assist'
import { ApiError } from '@/lib/gateway/client'
import { useMessages, type Messages } from '@/lib/i18n'
import { WARNINGS } from '@/lib/model/catalog'
import { LAYOUTS, layoutOf } from '@/lib/model/media'
import type { InstructionContent, Source, Step, StepMedia, WarningLevel } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { Annotator } from './Annotator'
import { ASSIST_ACTIONS, useStepAssist } from './StepAssist'
import { FramePicker } from './FramePicker'
import { MediaPicker } from './MediaPicker'
import { StepMediaArea } from '@/components/player/StepMediaArea'

/** Assez pour comparer et pour une grille, sans noyer l'étape. */
const MAX_MEDIA = 6

/**
 * Le nom court d'un média, sur sa puce, dans la langue de l'outil (`mediaLabel` de model/media
 * reste le nom donné à l'IA).
 */
function mediaName(m: StepMedia, kinds: Messages['editor']['stepEditor']['mediaKinds']): string {
  if (m.kind === 'video') return kinds.clip
  if (m.kind === 'document') return kinds.page(m.page ?? 1)
  if (m.kind === 'html') return kinds.visual
  if (m.frame) return kinds.frame
  return m.generated ? kinds.illustration : kinds.photo
}

export function StepEditor({
  content,
  step,
  index,
  sources,
  readOnly,
  onChange,
  onMove,
  onDelete,
  onDuplicate,
  onInsertAfter,
  onSourceAdded,
  highlight,
  agentWorking,
  remoteNote,
  section = 'all',
}: {
  content: InstructionContent
  step: Step
  index: number
  sources: Source[]
  readOnly?: boolean
  onChange: (s: Step) => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
  onDuplicate: () => void
  onInsertAfter: () => void
  onSourceAdded: (s: Source) => void
  highlight?: string | null
  /** L'assistant d'édition modifie cette étape en ce moment. */
  agentWorking?: boolean
  /** Un autre appareil vient de changer cette étape : on le dit, et l'étape s'encadre. */
  remoteNote?: string | null
  /** « media » : seulement les réglages du média (vue « comme au poste », dans une fenêtre). */
  section?: 'all' | 'media'
}) {
  const { ai, org } = useSession()
  const toast = useToast()
  const t = useMessages()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [annotating, setAnnotating] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [visualOpen, setVisualOpen] = useState(false)
  const [visualText, setVisualText] = useState('')
  const [mediaIndex, setMediaIndex] = useState(0)
  const assist = useStepAssist({ content, step, onApply: onChange })
  const media = step.media[Math.min(mediaIndex, step.media.length - 1)]
  const confirm = useConfirm()
  const [framing, setFraming] = useState(false)
  // Une vidéo, ou une image figée d'une vidéo : on peut passer de l'une à l'autre.
  const frameSource =
    media?.kind === 'video'
      ? { videoUrl: media.url, start: media.start, end: media.end, at: Math.round((media.start + (media.end - media.start) / 2) * 10) / 10 }
      : media?.kind === 'image' && media.frame
        ? { videoUrl: media.frame.videoUrl, start: media.frame.start, end: media.frame.end, at: media.frame.at }
        : null

  function applyFrame(url: string, at: number) {
    if (!frameSource || !media) return
    const keep = media.kind === 'image' && media.annotations?.length ? { annotations: media.annotations } : {}
    const next: StepMedia = { kind: 'image', url, sourceId: media.sourceId, frame: { videoUrl: frameSource.videoUrl, at, start: frameSource.start, end: frameSource.end }, ...keep }
    set({ media: step.media.map((m, i) => (i === mediaIndex ? next : m)) })
    toast.success(t.editor.stepEditor.frameTaken, t.editor.stepEditor.frameTakenDetail)
  }

  async function backToVideo() {
    if (!(media?.kind === 'image' && media.frame)) return
    if (media.annotations?.length && !(await confirm({ title: t.editor.stepEditor.backToVideo.title, description: t.editor.stepEditor.backToVideo.description, confirmLabel: t.editor.stepEditor.backToVideo.confirm }))) return
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
      toast.success(t.editor.stepEditor.illustrationCreated, t.editor.stepEditor.illustrationCreatedDetail)
    } catch (e) {
      // Le code aide à trouver la cause (droits, service d'images, image de référence).
      const code = e instanceof ApiError && e.status ? t.editor.stepEditor.errorCode(e.status, e.code) : ''
      toast.error(t.editor.stepEditor.illustrationFailed, `${errorText(e)}${code}`)
    } finally {
      setBusy(null)
    }
  }

  const set = (patch: Partial<Step>) => onChange({ ...step, ...patch })
  const setMediaAt = (i: number, patch: Partial<Pick<StepMedia, 'caption' | 'verdict'>>) => set({ media: step.media.map((m, j) => (j === i ? ({ ...m, ...patch } as StepMedia) : m)) })

  async function makeVisual() {
    setBusy('visual')
    try {
      const v = await createVisual(ai, content, step, visualText)
      onChange({ ...step, media: [...step.media, v].slice(-MAX_MEDIA) })
      setMediaIndex(Math.min(step.media.length, MAX_MEDIA - 1))
      setVisualOpen(false)
      setVisualText('')
      toast.success(t.editor.stepEditor.visualAdded, t.editor.stepEditor.visualAddedDetail)
    } catch (e) {
      toast.error(t.editor.stepEditor.visualFailed, errorText(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={cn(section === 'media' ? '' : 'glass-panel rounded-[32px] p-4 transition-shadow sm:p-6', section === 'all' && highlight && 'ring-4 ring-amber-300/60', section === 'all' && agentWorking && 'ring-4 ring-violet-400/70', section === 'all' && remoteNote && 'ring-4 ring-sky-400/80')}>
      {section === 'all' && remoteNote && !agentWorking && (
        <p className="animate-pop-in mb-3 flex items-center gap-2 rounded-2xl bg-sky-50 px-3 py-2 text-sm font-black text-sky-700 dark:bg-sky-500/15 dark:text-sky-200" role="status">
          <Radio className="h-4 w-4 animate-pulse" /> {remoteNote}
        </p>
      )}
      {section === 'all' && agentWorking && (
        <p className="mb-3 flex items-center gap-2 rounded-2xl bg-violet-50 px-3 py-2 text-sm font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          <Sparkles className="h-4 w-4 animate-pulse" /> {t.editor.step.assistantWorking}
        </p>
      )}
      {section === 'all' && (
      <div className="mb-4 flex items-center gap-3">
        <span className="bg-gradient-primary shadow-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white tabular-nums">{index + 1}</span>
        <p className="label-caps min-w-0 flex-1 truncate text-slate-500">{t.editor.step.of(index + 1, content.steps.length)}</p>
        {!readOnly && (
          <>
            <IconButton label={t.editor.stepEditor.moveUp} onClick={() => onMove(-1)} disabled={index === 0}>
              <ArrowUp className="h-5 w-5" />
            </IconButton>
            <IconButton label={t.editor.stepEditor.moveDown} onClick={() => onMove(1)} disabled={index === content.steps.length - 1}>
              <ArrowDown className="h-5 w-5" />
            </IconButton>
            <Menu
              items={[
                { label: t.editor.step.addAfter, icon: <Plus className="h-4 w-4" />, onClick: onInsertAfter },
                { label: t.editor.step.duplicate, icon: <Copy className="h-4 w-4" />, onClick: onDuplicate },
                { label: t.editor.step.delete, icon: <Trash2 className="h-4 w-4" />, onClick: onDelete, danger: true },
              ]}
            />
          </>
        )}
      </div>
      )}

      {section === 'all' && highlight && <p className="mb-4 rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{t.editor.stepEditor.operatorFeedback(highlight)}</p>}

      {/* Média */}
      <div className="relative aspect-video overflow-hidden rounded-[24px] bg-slate-900">
        {media && layoutOf(step) !== 'focus' ? (
          <StepMediaArea step={step} labels={t.editor.mediaArea} />
        ) : media ? (
          <MediaView key={`${media.url}-${media.kind === 'video' ? media.start : ''}-${media.kind === 'html' ? media.html.length : ''}`} media={media} autoPlay={false} />
        ) : (
          <button type="button" disabled={readOnly} onClick={() => setPickerOpen(true)} className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/80">
            <ImagePlus className="h-10 w-10" />
            <span className="font-black">{readOnly ? t.editor.step.noMedia : t.editor.stepEditor.addMediaHint}</span>
          </button>
        )}
      </div>
      {!readOnly && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {step.media.map((m, i) => (
            <button key={`${m.url}-${i}`} type="button" onClick={() => setMediaIndex(i)} className={cn('btn-press flex h-11 items-center gap-1.5 rounded-2xl px-3 text-xs font-black', i === mediaIndex ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card')}>
              {m.verdict ? (m.verdict === 'do' ? '✓ ' : '✕ ') : ''}{mediaName(m, t.editor.stepEditor.mediaKinds)} {i + 1}
              <span
                role="button"
                tabIndex={0}
                aria-label={t.editor.stepEditor.removeMedia}
                onClick={(e) => {
                  e.stopPropagation()
                  set({ media: step.media.filter((_, j) => j !== i) })
                  setMediaIndex(0)
                }}
                className="ml-1 rounded-lg p-0.5 hover:bg-rose-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
          {frameSource && (
            <Segmented
              size="sm"
              value={media?.kind === 'video' ? 'video' : 'image'}
              onChange={(v) => (v === 'image' ? setFraming(true) : void backToVideo())}
              options={[
                { value: 'video', label: t.editor.stepEditor.video, icon: <Film className="h-4 w-4" /> },
                { value: 'image', label: t.editor.stepEditor.image, icon: <ImageIcon className="h-4 w-4" /> },
              ]}
            />
          )}
          {media?.kind === 'image' && media.frame && (
            <Button size="sm" onClick={() => setFraming(true)} icon={<Clock className="h-4 w-4" />}>
              {t.editor.stepEditor.otherMoment}
            </Button>
          )}
          <Button size="sm" onClick={() => setPickerOpen(true)} icon={<ImagePlus className="h-4 w-4" />}>
            {step.media.length ? t.editor.stepEditor.changeOrAdd : t.editor.stepEditor.chooseMedia}
          </Button>
          {media?.kind === 'image' && (
            <>
              <Button size="sm" onClick={() => setAnnotating(mediaIndex)} icon={<Pencil className="h-4 w-4" />}>
                {t.editor.stepEditor.annotate}
              </Button>
              <Button size="sm" onClick={() => illustrate(media)} loading={busy === 'illustrate'} icon={<Wand2 className="h-4 w-4" />}>
                {t.editor.stepEditor.aiIllustration} <AiCost operation="illustrate" />
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setVisualOpen(true)} loading={busy === 'visual'} icon={<Shapes className="h-4 w-4" />}>
            {t.editor.stepEditor.aiVisual} <AiCost operation="visual" />
          </Button>
        </div>
      )}
      {!readOnly && media && (
        <div className="mt-3 space-y-3 rounded-[24px] bg-slate-900/[0.03] p-3 dark:bg-white/5">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              size="sm"
              value={media.verdict ?? 'none'}
              onChange={(v) => setMediaAt(mediaIndex, { verdict: v === 'none' ? undefined : v })}
              options={[
                { value: 'none', label: t.editor.stepEditor.verdicts.none },
                { value: 'do', label: t.editor.stepEditor.verdicts.do },
                { value: 'dont', label: t.editor.stepEditor.verdicts.dont },
              ]}
            />
            <Input value={media.caption ?? ''} onChange={(e) => setMediaAt(mediaIndex, { caption: e.target.value || undefined })} placeholder={t.editor.stepEditor.captionPlaceholder} aria-label={t.editor.stepEditor.captionLabel} className="h-11 text-sm" wrapperClassName="min-w-48 flex-1" />
          </div>
          {step.media.length > 1 && (
            <div>
              <p className="label-caps mb-1.5 text-slate-500">{t.editor.stepEditor.layoutLabel}</p>
              <Segmented size="sm" value={layoutOf(step)} onChange={(v) => set({ layout: v === 'focus' ? undefined : v })} options={LAYOUTS.map((l) => ({ value: l.value, label: t.editor.stepEditor.layouts[l.value] }))} />
            </div>
          )}
        </div>
      )}

      {section === 'all' && (
        <>
      {/* Texte */}
      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor={`t-${step.id}`}>{t.editor.stepEditor.action}</Label>
          <Input id={`t-${step.id}`} value={step.title} readOnly={readOnly} onChange={(e) => set({ title: e.target.value })} className="h-14 text-lg font-black" placeholder={t.editor.stepEditor.actionPlaceholder} />
        </div>
        <div>
          <Label htmlFor={`x-${step.id}`} hint={t.editor.stepEditor.words(step.text.split(/\s+/).filter(Boolean).length)}>
            {t.editor.stepEditor.how}
          </Label>
          <div className="flex items-start gap-2">
            <Textarea id={`x-${step.id}`} rows={3} value={step.text} readOnly={readOnly} onChange={(e) => set({ text: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>{t.editor.step.keyPoints}</Label>
          <div className="space-y-2">
            {(step.keyPoints ?? []).map((k, i) => (
              <div key={i} className="flex gap-2">
                <Input value={k} readOnly={readOnly} onChange={(e) => set({ keyPoints: (step.keyPoints ?? []).map((x, j) => (j === i ? e.target.value : x)) })} />
                {!readOnly && (
                  <IconButton label={t.editor.step.removeKeyPoint} onClick={() => set({ keyPoints: (step.keyPoints ?? []).filter((_, j) => j !== i) })}>
                    <X className="h-4 w-4" />
                  </IconButton>
                )}
              </div>
            ))}
            {!readOnly && (step.keyPoints ?? []).length < 4 && (
              <button type="button" onClick={() => set({ keyPoints: [...(step.keyPoints ?? []), ''] })} className="text-sm font-black text-[var(--primary)]">
                + {t.editor.step.addKeyPoint}
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <div>
            <Label htmlFor={`w-${step.id}`}>{t.editor.stepEditor.warning}</Label>
            <Select
              id={`w-${step.id}`}
              disabled={readOnly}
              value={step.warning?.level ?? 'none'}
              onChange={(e) => {
                const level = e.target.value as WarningLevel | 'none'
                set({ warning: level === 'none' ? null : { level, text: step.warning?.text ?? '' } })
              }}
            >
              <option value="none">{t.editor.stepEditor.noWarning}</option>
              {(Object.keys(WARNINGS) as WarningLevel[]).map((w) => (
                <option key={w} value={w}>
                  {WARNINGS[w].label}
                </option>
              ))}
            </Select>
          </div>
          {step.warning && (
            <div>
              <Label htmlFor={`wt-${step.id}`}>{t.editor.step.warningText}</Label>
              <Input id={`wt-${step.id}`} value={step.warning.text} readOnly={readOnly} onChange={(e) => set({ warning: { level: step.warning!.level, text: e.target.value } })} />
            </div>
          )}
        </div>
      </div>

      {/* IA */}
      {!readOnly && (
        <div className="mt-6 rounded-[24px] bg-primary-soft p-4">
          <p className="label-caps mb-3 flex items-center gap-1.5 text-[var(--primary-strong)] dark:text-sky-300">
            <Sparkles className="h-3.5 w-3.5" /> {t.editor.step.improveWithAi} <AiCost operation="step_assist" className="normal-case tracking-normal" />
          </p>
          <div className="flex flex-wrap gap-2">
            {ASSIST_ACTIONS.map((k) => (
              <Button key={k} size="sm" loading={assist.busy === k} disabled={!!assist.busy && assist.busy !== k} onClick={() => assist.run(k)}>
                {t.editor.assist.actions[k]}
              </Button>
            ))}
            <Button size="sm" onClick={assist.openCustom} disabled={!!assist.busy}>
              {t.editor.step.otherRequest}
            </Button>
          </div>
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
      {frameSource && (
        <FramePicker open={framing} onClose={() => setFraming(false)} videoUrl={frameSource.videoUrl} start={frameSource.start} end={frameSource.end} initialAt={frameSource.at} onPicked={applyFrame} />
      )}
      <Modal
        open={visualOpen}
        onClose={() => setVisualOpen(false)}
        title={t.editor.stepEditor.visualDialog.title}
        footer={
          <>
            <Button onClick={() => setVisualOpen(false)}>{t.common.cancel}</Button>
            <Button variant="primary" loading={busy === 'visual'} onClick={() => void makeVisual()} icon={<Shapes className="h-4 w-4" />}>
              {t.editor.stepEditor.visualDialog.draw} <AiCost operation="visual" />
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm font-medium text-slate-500">{t.editor.stepEditor.visualDialog.intro}</p>
        <Textarea autoFocus rows={4} value={visualText} onChange={(e) => setVisualText(e.target.value)} placeholder={t.editor.stepEditor.visualDialog.placeholder} aria-label={t.editor.stepEditor.visualDialog.label} />
      </Modal>
      {annotating !== null && step.media[annotating]?.kind === 'image' && (
        <Annotator
          open
          onClose={() => setAnnotating(null)}
          src={step.media[annotating].url}
          step={step}
          value={(step.media[annotating] as Extract<StepMedia, { kind: 'image' }>).annotations ?? []}
          onSave={(annotations) => set({ media: step.media.map((m, i) => (i === annotating && m.kind === 'image' ? { ...m, annotations } : m)) })}
        />
      )}
      {assist.element}
    </div>
  )
}
