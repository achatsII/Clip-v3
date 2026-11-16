'use client'

/**
 * Le GIF d'un extrait (toggle `clipGif`) : pour sortir une étape de CLIP — un courriel, Teams, une
 * présentation. Il ne remplace pas le média de l'étape : au poste, l'extrait joue déjà en boucle,
 * plus net, plus léger, et on peut le mettre en pause. Au plus `GIF_MAX_SEC` secondes (`files.gif`).
 */
import { Copy, Download, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ErrorState, errorText, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { hasCapability } from '@/lib/bridge/native'
import { GIF_MAX_SEC, type FilesApi } from '@/lib/gateway/files'
import { useMessages } from '@/lib/i18n'
import { copyText } from '@/lib/share'
import { formatBytes } from '@/lib/util/cn'
import { fileNameOf, saveFile } from '@/lib/util/saveFile'

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

type State = { status: 'making' } | { status: 'ready'; gif: Made } | { status: 'error'; error: unknown }

export function GifDialog({ clip, name, onClose }: { clip: GifClip | null; name: string; onClose: () => void }) {
  const { files } = useSession()
  const t = useMessages().editor.gif
  const toast = useToast()
  const [state, setState] = useState<State>({ status: 'making' })
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const key = clip ? keyOf(clip) : null

  useEffect(() => {
    if (!clip) return
    let alive = true
    setState({ status: 'making' })
    makeGif(files, clip).then(
      (gif) => alive && setState({ status: 'ready', gif }),
      (error: unknown) => alive && setState({ status: 'error', error }),
    )
    return () => {
      alive = false
    }
    // La clé dit tout de l'extrait ; `attempt` relance après un échec. Pas `files` : un nouvel objet
    // de session ne doit pas refaire le GIF (il relançait l'effet à chaque rendu).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  const canShare = hasCapability('share')
  const trimmed = !!clip && clip.end - clip.start > GIF_MAX_SEC

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

  return (
    <Modal
      open={!!clip}
      onClose={onClose}
      title={t.title}
      footer={
        state.status === 'ready' ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => void copy(state.gif)} icon={<Copy className="h-4 w-4" />}>
              {t.copy}
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void save(state.gif)} icon={canShare ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}>
              {canShare ? t.share : t.download}
            </Button>
          </div>
        ) : undefined
      }
    >
      {state.status === 'making' && (
        <div role="status" aria-busy="true">
          <Skeleton className="aspect-video w-full" />
          <p className="mt-3 text-center font-black">{t.making}</p>
          <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">{t.makingHint}</p>
        </div>
      )}
      {state.status === 'error' && <ErrorState error={state.error} title={t.failed} onRetry={() => setAttempt((n) => n + 1)} />}
      {state.status === 'ready' && (
        <div>
          <img src={state.gif.url} alt={t.previewAlt} className="w-full rounded-2xl bg-slate-900/5 dark:bg-white/5" />
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{[t.meta(state.gif.seconds), formatBytes(state.gif.sizeBytes)].filter(Boolean).join(' · ')}</p>
          {trimmed && <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{t.trimmed(GIF_MAX_SEC)}</p>}
        </div>
      )}
      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{t.why}</p>
    </Modal>
  )
}
