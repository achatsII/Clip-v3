'use client'

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { ApiError } from '@/lib/gateway/client'
import { useToast } from '@/components/ui/Toast'

/**
 * Choisir l'image à figer dans une vidéo : on glisse jusqu'au bon instant (affiné au dixième de
 * seconde), puis « Utiliser cette image ». L'image se capture dans le navigateur, à l'instant
 * exact ; si ce n'est pas possible, la Gateway la tire de la vidéo.
 */
export function FramePicker({
  open,
  onClose,
  videoUrl,
  start,
  end,
  initialAt,
  onPicked,
}: {
  open: boolean
  onClose: () => void
  videoUrl: string
  start: number
  end: number
  initialAt: number
  onPicked: (url: string, at: number) => void
}) {
  const { files } = useSession()
  const toast = useToast()
  const video = useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [at, setAt] = useState(initialAt)
  const [busy, setBusy] = useState(false)
  // Aperçu dans la page ; s'il ne charge pas (format non lu, réseau lent), le serveur tire l'image.
  const [preview, setPreview] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    if (!open) return
    setAt(initialAt)
    setPreview('loading')
    const timer = setTimeout(() => setPreview((p) => (p === 'loading' ? 'failed' : p)), 10_000)
    return () => clearTimeout(timer)
  }, [open, initialAt])

  // Le curseur couvre l'extrait, avec une marge de chaque côté pour rattraper le bon moment.
  const lo = Math.max(0, start - 5)
  const hi = Math.max(lo + 1, duration ? Math.min(duration, end + 5) : end + 5)

  useEffect(() => {
    const v = video.current
    if (v && preview === 'ready' && Math.abs(v.currentTime - at) > 0.04) v.currentTime = at
  }, [at, preview])

  async function capture(): Promise<string> {
    const v = video.current
    if (preview !== 'ready' || !v || !v.videoWidth) throw new Error('aperçu indisponible')
    if (v.seeking) await new Promise((r) => v.addEventListener('seeked', r, { once: true }))
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d')!.drawImage(v, 0, 0)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.86))
    if (!blob) throw new Error('capture impossible')
    const up = await files.upload(blob, `image-${Math.round(at * 10)}.jpg`, 'frames')
    return up.url
  }

  async function confirm() {
    setBusy(true)
    try {
      let url: string
      try {
        url = await capture()
      } catch {
        // Lecture croisée refusée, vidéo pas encore décodée… : la Gateway tire l'image.
        const shots = await files.screenshots(videoUrl, [{ name: 'frame', atSec: at }])
        if (!shots.frame) throw new ApiError('Le serveur n’a pas pu tirer cette image de la vidéo. Réessayez à un autre instant.', 422)
        url = shots.frame
      }
      onPicked(url, Math.round(at * 10) / 10)
      onClose()
    } catch (e) {
      toast.error('L’image n’a pas pu être tirée de la vidéo', errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const nudge = (d: number) => setAt((v) => Math.min(hi, Math.max(lo, Math.round((v + d) * 10) / 10)))

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Choisir l’image"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" loading={busy} onClick={() => void confirm()}>
            Utiliser cette image
          </Button>
        </>
      }
    >
      <p className="-mt-1 mb-3 text-sm font-medium text-slate-500">Glissez jusqu’au moment où ce qu’il faut voir est net. L’image pourra être annotée.</p>
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video
          ref={video}
          src={videoUrl}
          crossOrigin="anonymous"
          preload="auto"
          muted
          playsInline
          className="aspect-video max-h-[48dvh] w-full object-contain"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            setDuration(Number.isFinite(v.duration) ? v.duration : null)
            setPreview('ready')
            v.currentTime = at
          }}
          onError={() => setPreview('failed')}
        />
        {preview === 'loading' && (
          <span className="absolute inset-0 flex items-center justify-center text-white/80">
            <Loader2 className="h-8 w-8 animate-spin" />
          </span>
        )}
        {preview === 'failed' && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-bold text-white/85">
            Aperçu indisponible ici : l’image sera tirée de la vidéo par le serveur, à l’instant choisi.
          </p>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={() => nudge(-0.2)} aria-label="Reculer d’un instant" className="btn-press glass-card flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <input
          type="range"
          min={lo}
          max={hi}
          step={0.1}
          value={at}
          onChange={(e) => setAt(Number(e.target.value))}
          aria-label="Instant de l’image"
          className="h-11 min-w-0 flex-1 accent-[var(--primary)]"
        />
        <button type="button" onClick={() => nudge(0.2)} aria-label="Avancer d’un instant" className="btn-press glass-card flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-1 text-center text-sm font-black text-slate-500 tabular-nums">{`${Math.floor(at / 60)}:${(at % 60).toFixed(1).padStart(4, '0').replace('.', ',')}`}</p>
    </Modal>
  )
}
