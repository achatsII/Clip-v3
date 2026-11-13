'use client'

import { ArrowLeft, ChevronDown, FileUp, ImagePlus, Library, Mic, PenLine, RotateCcw, Sparkles, Video, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { ChoiceTile, Input, Switch, Textarea } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/Surface'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import type { CapturedMedia } from '@clip/bridge'
import { callNative, hasCapability, NativeError, onNativeEvent } from '@/lib/bridge/native'
import { getCaptureSession, isHandledNative } from '@/lib/capture/session'
import { setAutoAnnotate, useAutoAnnotate } from '@/lib/ai/autoAnnotate'
import { generationTier } from '@/lib/ai/generate'
import { AI_COSTS } from '@/lib/billing/catalog'
import { useMessages } from '@/lib/i18n'
import { ACCEPTED_FILES } from '@/lib/media/ingest'
import { uid } from '@/lib/model/repo'
import type { Source } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { AudioRecorder } from './AudioRecorder'
import { DictateButton } from './DictateButton'
import { PendingCard, SourceCard } from './SourceCard'
import { MediaLibraryDialog } from './MediaLibraryDialog'
import { WebCamera } from './WebCamera'
import { AiCost } from '@/components/billing/AiCost'
import { useBilling } from '@/lib/billing/state'
import { useImmersive } from '@/lib/ui/immersive'
import { useWide } from '@/lib/ui/screen'

export type ForceKind = 'auto' | 'procedure' | 'lockout'

/**
 * Capturer, puis générer : la page la plus importante, d'un seul écran au téléphone.
 *
 * - Rien de capturé : « Filmer le geste » en grand (le plus rapide), les quatre autres façons sur une
 *   ligne, puis « De quoi s'agit-il ? » sur une ligne. Aucun bouton « Générer » grisé : il n'a rien à
 *   faire encore.
 * - Quelque chose capturé : ce qu'on a ajouté en tête, « Ajouter » en une rangée compacte, et
 *   « Générer » dans une barre en bas, qui ne cache rien (la page lui laisse sa place).
 * Au téléphone, la page prend tout l'écran, comme l'éditeur : l'en-tête et la navigation de l'app
 * s'effacent, et sa propre barre garde le retour.
 */
export function CaptureBoard({
  instructionId,
  initialSources,
  initialIntent,
  onCreated,
  onGenerate,
  title,
  subtitle,
  back,
}: {
  instructionId: string | null
  initialSources: Source[]
  initialIntent?: string
  onCreated?: (id: string) => void
  onGenerate: (id: string, kind: ForceKind) => void
  title: string
  subtitle?: ReactNode
  /** Le retour, en haut à gauche. */
  back: { href: string; label: string }
}) {
  const { data, files, profile, displayName } = useSession()
  const t = useMessages()
  const billingOn = useBilling().enabled
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
  const wide = useWide()
  // Au téléphone, la capture prend tout l'écran : une seule chose à faire, rien autour.
  useImmersive(!wide)

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
    { key: 'video', label: tb.actions.video.label, hint: tb.actions.video.hint, icon: (c: string) => <Video className={c} />, color: 'from-sky-500 to-blue-600', onClick: () => (hasCapability('camera.video') ? native('camera.video') : setCamera('video')) },
    { key: 'photo', label: tb.actions.photo.label, hint: tb.actions.photo.hint, icon: (c: string) => <ImagePlus className={c} />, color: 'from-teal-400 to-emerald-600', onClick: () => (hasCapability('camera.photo') ? native('camera.photo') : setCamera('photo')) },
    { key: 'audio', label: tb.actions.audio.label, hint: tb.actions.audio.hint, icon: (c: string) => <Mic className={c} />, color: 'from-violet-500 to-indigo-600', onClick: () => (hasCapability('audio.record') ? native('audio.record') : setAudioOpen(true)) },
    { key: 'note', label: tb.actions.note.label, hint: tb.actions.note.hint, icon: (c: string) => <PenLine className={c} />, color: 'from-amber-400 to-orange-500', onClick: () => setNoteOpen(true) },
    {
      key: 'file',
      label: tb.actions.file.label,
      hint: tb.actions.file.hint,
      icon: (c: string) => <FileUp className={c} />,
      color: 'from-slate-500 to-slate-700',
      onClick: () => (hasCapability('media.pick') ? setPickerOpen(true) : fileInput.current?.click()),
    },
  ]
  const [pickerOpen, setPickerOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

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

  const captured = snap.sources.length + snap.pending.length
  // « Générer » paraît dès qu'il y a quelque chose de prêt ou en route ; un envoi raté le dit sur sa carte.
  const showGenerate = hasContent || busy
  const status = busy ? tb.uploading : tier.tooBig ? tb.tooBig : tb.ready(snap.sources.length)
  const [hero, ...others] = actions

  const generateButton = (
    <Button variant="primary" size="lg" icon={<Sparkles className="h-5 w-5" />} disabled={!hasContent || busy || tier.tooBig} loading={starting} onClick={generate} className="w-full">
      {tb.generate} <AiCost operation={tier.op} />
    </Button>
  )

  return (
    <div
      className={cn('relative', !wide && cn('min-h-dvh px-4 pb-[calc(2rem+env(safe-area-inset-bottom))]', showGenerate && 'pb-[calc(9rem+env(safe-area-inset-bottom))]'))}
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
      {wide ? (
        <>
          <Link href={back.href} className="mb-4 inline-flex items-center gap-1 text-sm font-black text-slate-500">
            <ArrowLeft className="h-4 w-4" /> {back.label}
          </Link>
          <PageHeader title={title} subtitle={subtitle} />
        </>
      ) : (
        <>
          {/* Sa propre barre, au téléphone : le retour et le titre (l'en-tête de l'app s'efface). */}
          <header className="glass-nav pt-safe sticky top-0 z-30 -mx-4 mb-3 border-b">
            <div className="flex h-14 items-center gap-1 px-1.5">
              <Link href={back.href} aria-label={back.label} title={back.label} className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="min-w-0 truncate text-lg font-black tracking-tight text-slate-900 dark:text-white">{title}</h1>
            </div>
          </header>
          {subtitle && <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </>
      )}

      {recoverable.length > 0 && (
        <div className="animate-slide-up mb-4 flex flex-col gap-3 rounded-[28px] bg-amber-50 p-4 sm:flex-row sm:items-center dark:bg-amber-500/10" role="status">
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

      {captured === 0 ? (
        // Rien encore : filmer en grand, les autres façons sur une ligne.
        <div className="grid gap-2.5 sm:grid-cols-6 sm:gap-3">
          <button
            type="button"
            onClick={hero.onClick}
            className={cn('btn-press lift group relative flex min-h-28 items-center gap-4 overflow-hidden rounded-[28px] bg-gradient-to-br p-4 text-left text-white shadow-[0_15px_35px_rgba(15,23,42,0.15)] sm:col-span-2 sm:min-h-40 sm:flex-col sm:items-start sm:justify-between', hero.color)}
          >
            <span className="grid-pattern absolute inset-0 opacity-60" />
            <span className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md">{hero.icon('h-7 w-7')}</span>
            <span className="relative min-w-0">
              <span className="block text-xl leading-tight font-black">{tb.heroLabel}</span>
              <span className="mt-0.5 block text-sm leading-snug font-bold text-white/85">{tb.heroHint}</span>
            </span>
          </button>
          <p className="label-caps mt-1.5 px-1 text-slate-500 sm:hidden">{tb.others}</p>
          <div className="grid grid-cols-4 gap-2 sm:col-span-4 sm:gap-3">
            {others.map((a) => (
              <button key={a.key} type="button" onClick={a.onClick} title={a.hint} className="btn-press glass-card flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-[22px] px-1 py-3 text-center sm:min-h-40 sm:rounded-[28px]">
                <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_8px_18px_rgba(15,23,42,0.15)] sm:h-14 sm:w-14', a.color)}>{a.icon('h-5 w-5 sm:h-7 sm:w-7')}</span>
                <span className="text-xs leading-tight font-black text-slate-800 sm:text-base dark:text-slate-100">{a.label}</span>
                <span className="hidden text-xs font-bold text-slate-500 sm:block">{a.hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Déjà quelque chose : ce qu'on a ajouté d'abord, et de quoi en ajouter, en petit.
        <>
          <section>
            <h2 className="mb-2.5 flex items-center justify-between text-lg font-black tracking-tight">
              {tb.notes} <span className="text-sm font-black text-slate-400 tabular-nums">{captured}</span>
            </h2>
            <div className="grid gap-2.5 md:grid-cols-2">
              {snap.sources.map((s) => (
                <SourceCard key={s.id} source={s} onRemove={() => void session.remove(s.id)} onEditText={(text) => void session.updateText(s.id, text)} />
              ))}
              {snap.pending.map((p) => (
                <PendingCard key={p.tempId} item={p} onDismiss={() => session.dismissPending(p.tempId)} />
              ))}
            </div>
          </section>
          <div className="mt-4">
            <p className="label-caps mb-2 px-1 text-slate-500">{tb.addMore}</p>
            <div className="grid grid-cols-5 gap-2">
              {actions.map((a) => (
                <button key={a.key} type="button" onClick={a.onClick} title={a.hint} className="btn-press glass-card flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[20px] px-1 py-2 text-center">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white', a.color)}>{a.icon('h-[18px] w-[18px]')}</span>
                  <span className="text-[11px] leading-tight font-black text-slate-700 sm:text-xs dark:text-slate-200">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Facultatif, sur une ligne : l'IA s'en sert pour le titre et le classement. */}
      <div className={cn('mt-5', wide && 'max-w-2xl')}>
        <label htmlFor="intent" className="label-caps mb-1.5 block px-1 text-slate-500">
          {tb.intent} <span className="tracking-normal normal-case opacity-70">{tb.optional}</span>
        </label>
        <Input id="intent" value={snap.intent} onChange={(e) => session.setIntent(e.target.value)} onBlur={() => void session.saveIntent().catch(() => undefined)} placeholder={tb.intentPlaceholder} />
      </div>

      <div className={cn('mt-3 flex flex-wrap items-center gap-x-4 gap-y-1', !wide && 'justify-center')}>
        <button type="button" onClick={() => setLibraryOpen(true)} className="btn-press flex h-11 items-center gap-2 rounded-2xl px-2 text-sm font-black text-[var(--primary)]">
          <Library className="h-4 w-4" /> {t.capture.library.open}
        </button>
        {wide && <p className="text-sm font-medium text-slate-400">{tb.dropHint}</p>}
      </div>
      <MediaLibraryDialog
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        excludeId={snap.instructionId}
        onAdd={(list) => {
          setLibraryOpen(false)
          void session.addExisting(list).then((n) => (n ? toast.success(t.capture.library.added(n)) : toast.info(t.capture.library.already)))
        }}
      />
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

      {hasContent && (
        <div className="mt-4">
          <button type="button" onClick={() => setOptionsOpen((o) => !o)} aria-expanded={optionsOpen} className="btn-press flex h-11 items-center gap-1 rounded-2xl px-1 text-sm font-black text-slate-500">
            <ChevronDown className={cn('h-4 w-4 transition-transform', optionsOpen && 'rotate-180')} /> {tb.options}
          </button>
          {optionsOpen && (
            <div className="animate-slide-up mt-2 grid gap-2 sm:grid-cols-3">
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
                      {billingOn && <span className="font-bold"> {t.capture.autoAnnotate.perImage(t.billing.credits(AI_COSTS.annotate))}</span>}
                    </>
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* « Générer », seulement quand il y a de quoi : au téléphone, dans la barre du bas (la page lui
          laisse sa place) ; au bureau, en bas de la colonne. */}
      {showGenerate &&
        (wide ? (
          <div className="sticky bottom-6 z-20 mt-8">
            <div className="glass-float flex items-center gap-4 rounded-[32px] p-3 pl-6">
              <p className="flex-1 text-sm font-bold text-slate-500 dark:text-slate-400" aria-live="polite">{status}</p>
              <div className="w-auto shrink-0">{generateButton}</div>
            </div>
          </div>
        ) : (
          <div className="glass-nav pb-safe kb-hide animate-slide-up fixed inset-x-0 bottom-0 z-40 border-t">
            <div className="mx-auto max-w-lg px-4 pt-2.5 pb-3">
              <p className="mb-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400" aria-live="polite">{status}</p>
              {generateButton}
            </div>
          </div>
        ))}

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
