'use client'

import { ChevronDown, FileUp, ImagePlus, Mic, PenLine, RotateCcw, Sparkles, Video, Wand2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { ChoiceTile, Switch, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import type { CapturedMedia } from '@clip/bridge'
import { callNative, hasCapability, NativeError, onNativeEvent } from '@/lib/bridge/native'
import { getCaptureSession, isHandledNative } from '@/lib/capture/session'
import { setAutoAnnotate, useAutoAnnotate } from '@/lib/ai/autoAnnotate'
import { generationTier } from '@/lib/ai/generate'
import { AI_COSTS } from '@/lib/billing/catalog'
import { BILLING_V2 } from '@/lib/config'
import { useMessages } from '@/lib/i18n'
import { ACCEPTED_FILES } from '@/lib/media/ingest'
import { uid } from '@/lib/model/repo'
import type { Source } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { AudioRecorder } from './AudioRecorder'
import { DictateButton } from './DictateButton'
import { PendingCard, SourceCard } from './SourceCard'
import { WebCamera } from './WebCamera'
import { AiCost } from '@/components/billing/AiCost'

export type ForceKind = 'auto' | 'procedure' | 'lockout'

export function CaptureBoard({
  instructionId,
  initialSources,
  initialIntent,
  onCreated,
  onGenerate,
  heading,
}: {
  instructionId: string | null
  initialSources: Source[]
  initialIntent?: string
  onCreated?: (id: string) => void
  onGenerate: (id: string, kind: ForceKind) => void
  heading?: ReactNode
}) {
  const { data, files, profile, displayName } = useSession()
  const t = useMessages()
  const tb = t.capture.board
  const toast = useToast()
  const [key] = useState(() => instructionId ?? uid('new_'))
  const session = useMemo(
    () => getCaptureSession(key, { data, files, actor: { id: profile.userId, name: displayName } }, { instructionId, sources: initialSources, intent: initialIntent }, onCreated),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  const snap = useSyncExternalStore(session.subscribe, () => session.snapshot, () => session.snapshot)
  const [camera, setCamera] = useState<'photo' | 'video' | null>(null)
  const [audioOpen, setAudioOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [optionsOpen, setOptionsOpen] = useState(false)
  const autoAnnotate = useAutoAnnotate()
  const [kind, setKind] = useState<ForceKind>('auto')
  const [dragging, setDragging] = useState(false)
  const [starting, setStarting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Médias que la coquille garde encore sans qu'aucune séance de cette page ne les ait reçus : la page
  // s'est rechargée pendant leur préparation (iOS coupe la page web quand la mémoire manque).
  const [recoverable, setRecoverable] = useState<CapturedMedia[]>([])
  useEffect(() => {
    if (!hasCapability('media.pending')) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    const check = () => {
      void callNative('media.pending', {})
        .then((r) => alive && setRecoverable(r.items.filter((i) => !isHandledNative(i.localId))))
        .catch(() => undefined)
    }
    check()
    const off = onNativeEvent((e) => {
      // La réponse de la capture arrive juste après cet événement : on laisse la page la recevoir.
      if (e.type === 'media.ready' || e.type === 'app.foreground') {
        if (timer) clearTimeout(timer)
        timer = setTimeout(check, 600)
      }
    })
    return () => {
      alive = false
      off()
      if (timer) clearTimeout(timer)
    }
  }, [])

  const busy = snap.pending.some((p) => p.stage !== 'error')
  const hasContent = snap.sources.some((s) => s.url || s.text)
  const tier = generationTier(snap.sources)

  async function native(type: 'camera.photo' | 'camera.video' | 'audio.record') {
    try {
      const r = await callNative(type, {})
      if (r.items.length) session.addNative(r.items)
    } catch (e) {
      if (e instanceof NativeError && e.code === 'cancelled') return
      if (e instanceof NativeError && e.code === 'permission_denied') toast.error(tb.denied, tb.deniedText)
      else toast.error(tb.captureFailed)
    }
  }

  async function pickNative() {
    const tempId = session.beginImport('video', tb.phoneMedia)
    try {
      const r = await callNative('media.pick', { kinds: ['photo', 'video'], multiple: true })
      session.dismissPending(tempId)
      if (r.items.length) session.addNative(r.items)
    } catch (e) {
      session.dismissPending(tempId)
      if (e instanceof NativeError && e.code === 'cancelled') return
      if (e instanceof NativeError && e.code === 'too_large') toast.error(tb.tooLarge, e.message)
      else toast.error(tb.galleryFailed, e instanceof Error ? e.message : undefined)
    }
  }

  async function pickNativeFiles() {
    const tempId = session.beginImport('document', tb.phoneDocs)
    try {
      const r = await callNative('file.pick', { mimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'], multiple: true })
      session.dismissPending(tempId)
      if (r.items.length) session.addNative(r.items)
    } catch (e) {
      session.dismissPending(tempId)
      if (!(e instanceof NativeError && e.code === 'cancelled')) toast.error(tb.filesFailed)
    }
  }

  const actions = [
    { key: 'video', label: tb.actions.video.label, hint: tb.actions.video.hint, icon: <Video className="h-7 w-7" />, color: 'from-sky-500 to-blue-600', onClick: () => (hasCapability('camera.video') ? native('camera.video') : setCamera('video')) },
    { key: 'photo', label: tb.actions.photo.label, hint: tb.actions.photo.hint, icon: <ImagePlus className="h-7 w-7" />, color: 'from-teal-400 to-emerald-600', onClick: () => (hasCapability('camera.photo') ? native('camera.photo') : setCamera('photo')) },
    { key: 'audio', label: tb.actions.audio.label, hint: tb.actions.audio.hint, icon: <Mic className="h-7 w-7" />, color: 'from-violet-500 to-indigo-600', onClick: () => (hasCapability('audio.record') ? native('audio.record') : setAudioOpen(true)) },
    { key: 'note', label: tb.actions.note.label, hint: tb.actions.note.hint, icon: <PenLine className="h-7 w-7" />, color: 'from-amber-400 to-orange-500', onClick: () => setNoteOpen(true) },
    {
      key: 'file',
      label: tb.actions.file.label,
      hint: tb.actions.file.hint,
      icon: <FileUp className="h-7 w-7" />,
      color: 'from-slate-500 to-slate-700',
      onClick: () => (hasCapability('media.pick') ? setPickerOpen(true) : fileInput.current?.click()),
    },
  ]
  const [pickerOpen, setPickerOpen] = useState(false)

  async function generate() {
    if (!hasContent) return
    setStarting(true)
    try {
      await session.saveIntent().catch(() => undefined)
      const id = await session.settled()
      onGenerate(id, kind)
    } catch {
      toast.error(tb.notSaved, tb.notSavedText)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div
      className="relative"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const list = Array.from(e.dataTransfer.files)
        if (list.length) session.addFiles(list)
      }}
    >
      {heading}
      {recoverable.length > 0 && (
        <div className="animate-slide-up mb-5 flex flex-col gap-3 rounded-[28px] bg-amber-50 p-4 sm:flex-row sm:items-center dark:bg-amber-500/10" role="status">
          <RotateCcw className="h-6 w-6 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm font-bold text-amber-900 dark:text-amber-200">
            {recoverable.length > 1 ? tb.recoveredMany(recoverable.length) : tb.recoveredOne(recoverable[0].kind, recoverable[0].fileName)}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                void callNative('media.discard', { localIds: recoverable.map((i) => i.localId) }).catch(() => undefined)
                setRecoverable([])
              }}
            >
              {tb.ignore}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                session.addNative(recoverable)
                setRecoverable([])
              }}
            >
              {t.common.add}
            </Button>
          </div>
        </div>
      )}


      <div className="glass-panel rounded-[32px] p-4 sm:p-6">
        <label htmlFor="intent" className="label-caps mb-2 block text-slate-500">
          {tb.intent} <span className="normal-case tracking-normal opacity-70">{tb.optional}</span>
        </label>
        <div className="flex items-start gap-2">
          <Textarea
            id="intent"
            rows={2}
            value={snap.intent}
            onChange={(e) => session.setIntent(e.target.value)}
            onBlur={() => void session.saveIntent().catch(() => undefined)}
            placeholder={tb.intentPlaceholder}
            className="min-h-14 text-base"
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {actions.map((a, i) => (
          <button
            key={a.key}
            type="button"
            onClick={a.onClick}
            className={cn(
              'btn-press lift group relative flex min-h-32 flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br p-4 text-left text-white shadow-[0_15px_35px_rgba(15,23,42,0.15)]',
              a.color,
              i === 0 && 'col-span-2 sm:col-span-1',
            )}
          >
            <span className="grid-pattern absolute inset-0 opacity-60" />
            <span className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md">{a.icon}</span>
            <span className="relative mt-3">
              <span className="block text-lg leading-tight font-black">{a.label}</span>
              <span className="block text-xs font-bold text-white/80">{a.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={ACCEPTED_FILES}
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? [])
          if (list.length) session.addFiles(list)
          e.target.value = ''
        }}
      />
      <p className="mt-3 hidden text-center text-sm font-medium text-slate-400 sm:block">{tb.dropHint}</p>

      {(snap.sources.length > 0 || snap.pending.length > 0) && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center justify-between text-lg font-black tracking-tight">
            {tb.notes} <span className="text-sm font-black text-slate-400 tabular-nums">{snap.sources.length + snap.pending.length}</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {snap.sources.map((s) => (
              <SourceCard key={s.id} source={s} onRemove={() => void session.remove(s.id)} onEditText={(text) => void session.updateText(s.id, text)} />
            ))}
            {snap.pending.map((p) => (
              <PendingCard key={p.tempId} item={p} onDismiss={() => session.dismissPending(p.tempId)} />
            ))}
          </div>
        </section>
      )}

      {hasContent && (
        <div className="mt-6">
          <button type="button" onClick={() => setOptionsOpen((o) => !o)} className="flex items-center gap-1 text-sm font-black text-slate-500">
            <ChevronDown className={cn('h-4 w-4 transition-transform', optionsOpen && 'rotate-180')} /> {tb.options}
          </button>
          {optionsOpen && (
            <div className="animate-slide-up mt-3 grid gap-2 sm:grid-cols-3">
              <ChoiceTile selected={kind === 'auto'} onClick={() => setKind('auto')} icon={<Wand2 className="h-5 w-5" />} title={tb.auto} description={tb.autoHint} />
              <ChoiceTile selected={kind === 'procedure'} onClick={() => setKind('procedure')} title={t.catalog.kinds.procedure.label} description={tb.procedureHint} />
              <ChoiceTile selected={kind === 'lockout'} onClick={() => setKind('lockout')} title={t.catalog.kinds.lockout.label} description={tb.lockoutHint} />
              <div className="sm:col-span-3">
                <Switch
                  checked={autoAnnotate}
                  onChange={setAutoAnnotate}
                  label={t.capture.autoAnnotate.label}
                  description={
                    <>
                      {t.capture.autoAnnotate.hint}
                      {BILLING_V2 && <span className="font-bold"> {t.capture.autoAnnotate.perImage(t.billing.credits(AI_COSTS.annotate))}</span>}
                    </>
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pb-safe kb-hide sticky bottom-24 z-20 mt-8 lg:bottom-6">
        <div className="glass-float flex flex-col items-center gap-3 rounded-[32px] p-3 sm:flex-row sm:p-4">
          <p className="flex-1 px-2 text-center text-sm font-bold text-slate-500 sm:text-left dark:text-slate-400">
            {!hasContent ? tb.empty : busy ? tb.uploading : tier.tooBig ? tb.tooBig : tb.ready(snap.sources.length)}
          </p>
          <Button variant="primary" size="lg" icon={<Sparkles className="h-5 w-5" />} disabled={!hasContent || busy || tier.tooBig} loading={starting} onClick={generate} className="w-full sm:w-auto">
            {tb.generate} <AiCost operation={tier.op} />
          </Button>
        </div>
      </div>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[rgba(var(--primary-rgb),0.12)] backdrop-blur-sm">
          <div className="glass-panel rounded-[32px] px-10 py-8 text-center">
            <FileUp className="mx-auto mb-2 h-10 w-10 text-[var(--primary)]" />
            <p className="text-xl font-black">{tb.dropFiles}</p>
          </div>
        </div>
      )}

      <WebCamera open={!!camera} mode={camera ?? 'photo'} onClose={() => setCamera(null)} onCaptured={(list) => session.addFiles(list)} />
      <AudioRecorder open={audioOpen} onClose={() => setAudioOpen(false)} onCaptured={(f) => session.addFiles([f])} />
      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title={tb.noteTitle}
        footer={
          <>
            <Button onClick={() => setNoteOpen(false)}>{t.common.cancel}</Button>
            <Button
              variant="primary"
              disabled={!note.trim()}
              onClick={() => {
                void session.addNote(note)
                setNote('')
                setNoteOpen(false)
              }}
            >
              {tb.addNote}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-2">
          <Textarea autoFocus rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tb.notePlaceholder} />
        </div>
      </Modal>
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title={tb.pickTitle} size="sm">
        <div className="grid gap-2">
          <ChoiceTile selected={false} onClick={() => { setPickerOpen(false); void pickNative() }} icon={<ImagePlus className="h-5 w-5" />} title={tb.pickMedia} description={tb.pickMediaHint} />
          <ChoiceTile selected={false} onClick={() => { setPickerOpen(false); void pickNativeFiles() }} icon={<FileUp className="h-5 w-5" />} title={tb.pickDocs} description={tb.pickDocsHint} />
        </div>
      </Modal>
    </div>
  )
}
