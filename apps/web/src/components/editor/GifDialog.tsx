'use client'

/**
 * Le GIF d'un extrait (toggle `clipGif`). Avec `gifInStep` : on choisit son début et sa fin dans la
 * vidéo, puis on décide — à la place du média de l'étape, en plus, ou seulement pour le partager
 * (un courriel, Teams, une présentation). Sans `gifInStep` : le GIF de l'extrait, à partager.
 * Au plus `GIF_MAX_SEC` secondes (`files.gif`) : au-delà, un GIF devient trop lourd.
 */
import { Copy, Download, ImagePlay, Plus, Repeat, Scissors, Share2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ErrorState, errorText, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { hasCapability } from '@/lib/bridge/native'
import { GIF_MAX_SEC, type FilesApi } from '@/lib/gateway/files'
import { useMessages } from '@/lib/i18n'
import { copyText } from '@/lib/share'
import { useToggle } from '@/lib/toggles'
import { cn, formatBytes, formatClock } from '@/lib/util/cn'
import { fileNameOf, saveFile } from '@/lib/util/saveFile'
import { VideoTrimmer } from './VideoTrimmer'

export interface GifClip {
  url: string
  start: number
  end: number
}

interface Made {
  url: string
  sizeBytes: number | null
  seconds: number
}

/** Le GIF fait, et l'extrait d'où il vient : de quoi le mettre à l'étape. */
export interface PlacedGif {
  url: string
  sizeBytes: number | null
  videoUrl: string
  start: number
  end: number
}

/** Ce que l'étape montre en ce moment, pour nommer le choix : « À la place de la vidéo ». */
export type GifTarget = 'video' | 'image' | 'gif'

/** Les GIF faits pendant la séance : rouvrir la fenêtre ne refait pas le même, et deux demandes n'en font qu'une. */
const made = new Map<string, Made>()
const inflight = new Map<string, Promise<Made>>()
const keyOf = (c: GifClip) => `${c.url}#${c.start}-${c.end}`

function makeGif(files: FilesApi, clip: GifClip): Promise<Made> {
  const key = keyOf(clip)
  const done = made.get(key)
  if (done) return Promise.resolve(done)
  let p = inflight.get(key)
  if (!p) {
    p = files.gif(clip.url, clip.start, clip.end).then((gif) => {
      made.set(key, gif)
      return gif
    })
    p.then(
      () => inflight.delete(key),
      () => inflight.delete(key),
    )
    inflight.set(key, p)
  }
  return p
}

const tenth = (s: number) => Math.round(s * 10) / 10

/**
 * Le début et la fin d'un GIF : jamais plus de `max` secondes. Le bout qu'on vient de bouger reste
 * où on l'a mis ; l'autre suit.
 */
export function clampGifRange(prev: { start: number; end: number }, next: { start: number; end: number }, max = GIF_MAX_SEC): { start: number; end: number } {
  const start = tenth(Math.max(0, next.start))
  const end = tenth(Math.max(start + 0.5, next.end))
  if (end - start <= max) return { start, end }
  return start !== prev.start ? { start, end: tenth(start + max) } : { start: tenth(end - max), end }
}

/** L'extrait de départ : celui de l'étape, ramené à `GIF_MAX_SEC`. */
export const initialGifRange = (clip: GifClip) => clampGifRange({ start: clip.start, end: clip.end }, { start: clip.start, end: Math.min(clip.end, clip.start + GIF_MAX_SEC) })

type State = { status: 'choose' } | { status: 'making' } | { status: 'ready'; gif: Made } | { status: 'error'; error: unknown }

export function GifDialog({
  clip,
  name,
  onClose,
  onPlace,
  target = 'video',
  canAdd = true,
}: {
  clip: GifClip | null
  name: string
  onClose: () => void
  /** Mettre le GIF à l'étape : à la place du média montré, ou en plus. Absent : seulement le partager. */
  onPlace?: (gif: PlacedGif, how: 'replace' | 'add') => void
  target?: GifTarget
  /** Faux quand l'étape a déjà tous ses médias. */
  canAdd?: boolean
}) {
  const { files } = useSession()
  const t = useMessages().editor.gif
  const toast = useToast()
  const studio = useToggle('gifInStep')
  const [state, setState] = useState<State>({ status: 'choose' })
  const [range, setRange] = useState(() => (clip ? initialGifRange(clip) : { start: 0, end: 0 }))
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const key = clip ? keyOf(clip) : null

  // Une nouvelle fenêtre : l'extrait de l'étape, à choisir (ou, sans `gifInStep`, aussitôt en GIF).
  useEffect(() => {
    if (!clip) return
    setRange(initialGifRange(clip))
    setState(studio ? { status: 'choose' } : { status: 'making' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Faire le GIF de l'extrait choisi. `attempt` relance après un échec. Pas `files` : un nouvel objet
  // de session ne doit pas refaire le GIF (il relançait l'effet à chaque rendu).
  const making = state.status === 'making'
  useEffect(() => {
    if (!clip || !making) return
    let alive = true
    makeGif(files, { url: clip.url, start: range.start, end: range.end }).then(
      (gif) => alive && setState({ status: 'ready', gif }),
      (error: unknown) => alive && setState({ status: 'error', error }),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, making, attempt])

  const canShare = hasCapability('share')
  const trimmed = !studio && !!clip && clip.end - clip.start > GIF_MAX_SEC

  async function save(gif: Made) {
    setSaving(true)
    try {
      const res = await fetch(gif.url)
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      await saveFile(blob.type === 'image/gif' ? blob : new Blob([blob], { type: 'image/gif' }), fileNameOf(name, 'gif'))
    } catch (e) {
      toast.error(t.saveFailed, errorText(e))
    } finally {
      setSaving(false)
    }
  }

  async function copy(gif: Made) {
    if (await copyText(gif.url)) toast.success(t.copied)
    else toast.error(t.copyFailed)
  }

  function place(gif: Made, how: 'replace' | 'add') {
    if (!clip || !onPlace) return
    onPlace({ url: gif.url, sizeBytes: gif.sizeBytes, videoUrl: clip.url, start: range.start, end: range.end }, how)
    onClose()
  }

  const ready = state.status === 'ready' ? state.gif : null
  const choosing = studio && state.status === 'choose'
  const placing = studio && !!onPlace

  const footer = choosing ? (
    <div className="flex justify-end">
      <Button variant="primary" onClick={() => setState({ status: 'making' })} icon={<ImagePlay className="h-4 w-4" />}>
        {t.make}
      </Button>
    </div>
  ) : ready && !placing ? (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button onClick={() => void copy(ready)} icon={<Copy className="h-4 w-4" />}>
        {t.copy}
      </Button>
      <Button variant="primary" loading={saving} onClick={() => void save(ready)} icon={canShare ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}>
        {canShare ? t.share : t.download}
      </Button>
    </div>
  ) : ready && placing ? (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      <Button onClick={() => setState({ status: 'choose' })} icon={<Scissors className="h-4 w-4" />}>
        {t.retime}
      </Button>
      <Button onClick={() => void copy(ready)} icon={<Copy className="h-4 w-4" />}>
        {t.copy}
      </Button>
    </div>
  ) : undefined

  return (
    <Modal open={!!clip} onClose={onClose} title={studio ? t.studioTitle : t.title} footer={footer}>
      {choosing && clip && (
        <div>
          <VideoTrimmer url={clip.url} start={range.start} end={range.end} onChange={(start, end) => setRange((r) => clampGifRange(r, { start, end }))} />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{t.length(formatClock(range.start), formatClock(range.end), tenth(range.end - range.start))}</p>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.chooseHint(GIF_MAX_SEC)}</p>
        </div>
      )}
      {state.status === 'making' && (
        <div role="status" aria-busy="true">
          <Skeleton className="aspect-video w-full" />
          <p className="mt-3 text-center font-black">{t.making}</p>
          <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">{t.makingHint}</p>
        </div>
      )}
      {state.status === 'error' && (
        <ErrorState
          error={state.error}
          title={t.failed}
          onRetry={() => {
            setState({ status: 'making' })
            setAttempt((n) => n + 1)
          }}
        />
      )}
      {ready && (
        <div>
          <img src={ready.url} alt={t.previewAlt} className="max-h-[40vh] w-full rounded-2xl bg-slate-900/5 object-contain dark:bg-white/5" />
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{[t.meta(ready.seconds), formatBytes(ready.sizeBytes)].filter(Boolean).join(' · ')}</p>
          {trimmed && <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{t.trimmed(GIF_MAX_SEC)}</p>}
          {placing && (
            <div className="mt-4">
              <p className="label-caps mb-2 text-slate-500 dark:text-slate-400">{t.whatNow}</p>
              <div className="grid gap-2" role="group" aria-label={t.whatNow}>
                <Choice icon={<Repeat className="h-5 w-5" />} label={t.replace[target]} hint={t.replaceHint} onClick={() => place(ready, 'replace')} />
                <Choice icon={<Plus className="h-5 w-5" />} label={t.add[target]} hint={canAdd ? t.addHint : t.full} disabled={!canAdd} onClick={() => place(ready, 'add')} />
                <Choice icon={canShare ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />} label={canShare ? t.shareOnly : t.downloadOnly} hint={t.shareHint} busy={saving} onClick={() => void save(ready)} />
              </div>
            </div>
          )}
        </div>
      )}
      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{studio ? t.tradeoff : t.why}</p>
    </Modal>
  )
}

/** Un choix en grand : l'icône, ce qu'il fait, et ce que l'étape deviendra. */
function Choice({ icon, label, hint, onClick, disabled, busy }: { icon: ReactNode; label: string; hint: string; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn('btn-press glass-card flex min-h-16 w-full items-center gap-3 rounded-[20px] p-3 text-left', disabled || busy ? 'opacity-50' : 'hover:-translate-y-0.5')}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-strong)] dark:text-[var(--primary-light)]">{icon}</span>
      <span className="min-w-0">
        <span className="block font-black text-slate-900 dark:text-white">{label}</span>
        <span className="block text-sm font-medium text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
    </button>
  )
}
