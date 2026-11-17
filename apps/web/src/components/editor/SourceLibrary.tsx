'use client'

/**
 * « Médias d'origine » (toggle `sourceLibrary`, `src/lib/model/sources.ts`) : ce qui a servi à rédiger
 * l'instruction, à revoir, relire et réécouter — les vidéos en entier, les photos en grand, les notes
 * vocales avec leur transcription, les notes écrites et les documents. Chaque média dit à quelles
 * étapes il sert. Dans l'éditeur, il se met à l'étape ouverte (`onUse`) et on en ajoute d'autres
 * (`onSourceAdded`) ; en lecture, on ne fait que regarder. Jamais au poste.
 */
import { FileText, Images, Loader2, Maximize2, Mic, Plus, Square, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ZoomViewer } from '@/components/media/ZoomViewer'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useMessages } from '@/lib/i18n'
import { ACCEPTED_FILES, ingestAny } from '@/lib/media/ingest'
import { useToggle } from '@/lib/toggles'
import { stopWhenGone } from '@/lib/media/videoPool'
import { groupSources, sourceUses, voiceOf, VOICE_LEAD_SEC, type SourceItem } from '@/lib/model/sources'
import type { InstructionContent, Source } from '@/lib/model/types'
import { cn, formatDuration } from '@/lib/util/cn'

/** Un média qui quitte l'écran arrête de télécharger (lecture fluide). */
const releaseOnUnmount = (el: HTMLMediaElement | null) => {
  if (!el) return
  return () => stopWhenGone(el)
}

export function SourceLibrary({
  open,
  onClose,
  sources,
  content,
  focus,
  stepNumber,
  onGoToStep,
  onUse,
  onSourceAdded,
}: {
  open: boolean
  onClose: () => void
  sources: Source[]
  /** Pour dire à quelles étapes sert chaque média. */
  content?: InstructionContent | null
  /** Le média à montrer d'abord (et, pour une vidéo, l'instant où la reprendre). */
  focus?: { sourceId: string; at?: number } | null
  /** L'étape ouverte dans l'éditeur (à partir de 1) : « Mettre à l'étape 3 ». */
  stepNumber?: number | null
  onGoToStep?: (stepId: string) => void
  /** Dans l'éditeur : mettre ce média à l'étape ouverte (une vidéo choisit son extrait, un document sa page). */
  onUse?: (source: Source) => void
  /** Dans l'éditeur : un média ajouté rejoint les médias d'origine. */
  onSourceAdded?: (source: Source) => void
}) {
  const t = useMessages().editorTools.sources
  const groups = groupSources(sources)
  const uses = sourceUses(content)
  const [zoomed, setZoomed] = useState<SourceItem | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open || !focus) return
    const id = requestAnimationFrame(() => focusRef.current?.scrollIntoView?.({ block: 'center' }))
    return () => cancelAnimationFrame(id)
  }, [open, focus])

  const canUse = !!onUse && !!stepNumber
  const used = (s: Source) => uses.get(s.id) ?? []
  const usedAt = (s: Source) =>
    used(s).length ? (
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.usedAt}</span>
        {used(s).map((u) =>
          onGoToStep ? (
            <button
              key={u.stepId}
              type="button"
              onClick={() => {
                onGoToStep(u.stepId)
                onClose()
              }}
              aria-label={t.goToStep(u.n)}
              title={t.goToStep(u.n)}
              className="btn-press flex h-11 min-w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] px-2 text-sm font-black text-[var(--primary-strong)] tabular-nums dark:text-[var(--primary-light)]"
            >
              {u.n}
            </button>
          ) : (
            <span key={u.stepId} className="rounded-lg bg-slate-900/5 px-2 py-0.5 text-xs font-black tabular-nums dark:bg-white/10">
              {u.n}
            </span>
          ),
        )}
      </span>
    ) : null
  const useButton = (s: Source) =>
    canUse ? (
      <Button size="sm" onClick={() => onUse!(s)} icon={<Plus className="h-4 w-4" />}>
        {t.useAt(stepNumber!)}
      </Button>
    ) : null
  const tag = (x: SourceItem) => (
    <span title={t.tagHint(x.tag)} className="shrink-0 rounded-lg bg-slate-900/80 px-1.5 py-0.5 text-[11px] font-black text-white tabular-nums">
      {x.tag}
    </span>
  )

  return (
    <Modal open={open} onClose={onClose} size="xl" title={t.title}>
      <p className="-mt-1 mb-5 text-sm font-medium text-slate-600 dark:text-slate-300">{t.intro}</p>
      {!groups.length ? (
        <EmptyState icon={<Images className="h-7 w-7" />} title={t.empty} description={t.emptyText} />
      ) : (
        <div className="space-y-7">
          {groups.map((g) => (
            <section key={g.kind}>
              <p className="label-caps mb-2 text-slate-500 dark:text-slate-400">
                {t[g.kind]} · {g.items.length}
              </p>
              {g.kind === 'video' && (
                <div className="grid gap-4 md:grid-cols-2">
                  {g.items.map((x) => {
                    const s = x.source
                    const focused = focus?.sourceId === s.id
                    return (
                      <div key={s.id} ref={focused ? focusRef : undefined} className={cn('glass-card overflow-hidden rounded-[24px]', focused && 'ring-4 ring-[var(--primary)]')}>
                        {/* La vidéo entière, avec le son et la barre de lecture ; rien ne se charge avant « Lire ». */}
                        <video ref={releaseOnUnmount} src={focused && focus?.at ? `${s.url}#t=${Math.max(0, focus.at)}` : s.url} poster={s.thumbnailUrl} controls playsInline preload={focused ? 'metadata' : 'none'} className="aspect-video w-full bg-black" />
                        <div className="space-y-2 p-3">
                          <div className="flex min-w-0 items-center gap-2">
                            {tag(x)}
                            <span className="min-w-0 flex-1 truncate text-sm font-black">{s.originalName ?? s.name}</span>
                            <span className="shrink-0 text-xs font-bold text-slate-500 tabular-nums dark:text-slate-400">{formatDuration(s.durationSec)}</span>
                          </div>
                          {usedAt(s)}
                          {useButton(s)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {g.kind === 'photo' && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  {g.items.map((x) => {
                    const s = x.source
                    const n = used(s).length
                    return (
                      <div key={s.id} ref={focus?.sourceId === s.id ? focusRef : undefined} className={cn('relative aspect-square overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800', focus?.sourceId === s.id && 'ring-4 ring-[var(--primary)]')}>
                        <button type="button" onClick={() => setZoomed(x)} aria-label={`${t.zoom} · ${t.photoAlt(x.tag)}`} className="btn-press h-full w-full">
                          <img src={s.thumbnailUrl ?? s.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </button>
                        <span className="pointer-events-none absolute top-1.5 left-1.5 flex items-center gap-1">
                          {tag(x)}
                          {s.voice && <Mic className="h-4 w-4 rounded bg-black/60 p-0.5 text-white" aria-hidden />}
                        </span>
                        {n > 0 && <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-lg bg-[var(--primary)] px-1.5 py-0.5 text-[11px] font-black text-white tabular-nums">{used(s).map((u) => u.n).join(', ')}</span>}
                        {canUse && (
                          <button type="button" onClick={() => onUse!(s)} aria-label={t.useAt(stepNumber!)} title={t.useAt(stepNumber!)} className="btn-press bg-gradient-primary shadow-primary absolute right-1.5 bottom-1.5 flex h-11 w-11 items-center justify-center rounded-full text-white">
                            <Plus className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {g.kind === 'audio' && (
                <div className="space-y-3">
                  {g.items.map((x) => (
                    <div key={x.source.id} ref={focus?.sourceId === x.source.id ? focusRef : undefined} className="glass-card space-y-2 rounded-[24px] p-4">
                      <div className="flex min-w-0 items-center gap-2">
                        {tag(x)}
                        <Mic className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm font-black">{x.source.name}</span>
                        <span className="shrink-0 text-xs font-bold text-slate-500 tabular-nums dark:text-slate-400">{formatDuration(x.source.durationSec)}</span>
                      </div>
                      {x.source.url && <audio ref={releaseOnUnmount} src={x.source.url} controls preload="none" className="w-full" />}
                      {x.source.text && <LongText text={x.source.text} more={t.readMore} less={t.readLess} />}
                    </div>
                  ))}
                </div>
              )}
              {g.kind === 'note' && (
                <div className="grid gap-3 md:grid-cols-2">
                  {g.items.map((x) => (
                    <div key={x.source.id} className="glass-card space-y-2 rounded-[24px] p-4">
                      {tag(x)}
                      <LongText text={x.source.text ?? ''} more={t.readMore} less={t.readLess} />
                    </div>
                  ))}
                </div>
              )}
              {g.kind === 'document' && (
                <div className="grid gap-3 md:grid-cols-2">
                  {g.items.map((x) => {
                    const s = x.source
                    return (
                      <div key={s.id} className="glass-card space-y-3 rounded-[24px] p-4">
                        <div className="flex min-w-0 items-center gap-2">
                          {tag(x)}
                          <FileText className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-sm font-black">{s.originalName ?? s.name}</span>
                        </div>
                        {usedAt(s)}
                        <div className="flex flex-wrap gap-2">
                          <a href={s.url} target="_blank" rel="noreferrer" className="btn-press glass-card inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black">
                            <Maximize2 className="h-4 w-4" /> {t.open}
                          </a>
                          {useButton(s)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      {onSourceAdded && <AddSource onAdded={onSourceAdded} words={{ add: t.add, adding: t.adding, failed: t.addFailed }} />}
      <ZoomViewer open={!!zoomed} onClose={() => setZoomed(null)} label={t.zoom}>
        {zoomed && <ZoomedPhoto item={zoomed} sources={sources} listen={t.listen} stop={t.stopListening} />}
      </ZoomViewer>
    </Modal>
  )
}

/** Une photo en grand ; prise en parlant, on entend ce qui a été dit à ce moment-là. */
function ZoomedPhoto({ item, sources, listen, stop }: { item: SourceItem; sources: Source[]; listen: string; stop: string }) {
  const voice = voiceOf(item.source, sources)
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <img src={item.source.url} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
      {voice && (
        <>
          <audio
            ref={(el) => {
              audio.current = el
              return releaseOnUnmount(el)
            }}
            src={voice.audio.url}
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              const a = audio.current
              if (!a) return
              if (playing) return a.pause()
              a.currentTime = Math.max(0, voice.at - VOICE_LEAD_SEC)
              void a.play().catch(() => setPlaying(false))
            }}
            className="btn-press bg-gradient-primary shadow-primary absolute bottom-6 left-1/2 flex h-14 -translate-x-1/2 items-center gap-2 rounded-full px-6 font-black text-white"
          >
            {playing ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />} {playing ? stop : listen}
          </button>
        </>
      )}
    </div>
  )
}

/** Un texte long (transcription, note) : quelques lignes, puis « Tout lire ». */
function LongText({ text, more, less }: { text: string; more: string; less: string }) {
  const [all, setAll] = useState(false)
  const long = text.length > 320
  return (
    <div>
      <p className={cn('text-sm leading-relaxed font-medium whitespace-pre-wrap text-slate-700 dark:text-slate-200', long && !all && 'line-clamp-5')}>{text}</p>
      {long && (
        <button type="button" onClick={() => setAll((v) => !v)} className="btn-press mt-1 h-11 text-sm font-black text-[var(--primary-strong)] dark:text-[var(--primary-light)]">
          {all ? less : more}
        </button>
      )}
    </div>
  )
}

/** Ajouter un média : il rejoint les médias d'origine de l'instruction. */
function AddSource({ onAdded, words }: { onAdded: (s: Source) => void; words: { add: string; adding: string; failed: string } }) {
  const { files } = useSession()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const slides = useToggle('slidesImport')
  return (
    <div className="mt-6">
      <Button block onClick={() => input.current?.click()} disabled={busy} icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}>
        {busy ? words.adding : words.add}
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPTED_FILES}
        className="hidden"
        onChange={async (e) => {
          const list = [...(e.target.files ?? [])]
          e.target.value = ''
          if (!list.length) return
          setBusy(true)
          try {
            for (const f of list) for (const s of await ingestAny(f, files, { slides })) onAdded(s)
          } catch (err) {
            toast.error(words.failed, errorText(err))
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}
