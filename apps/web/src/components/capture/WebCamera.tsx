'use client'

import { Camera, Check, RefreshCcw, Video, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CAPTURE_PRESETS } from '@clip/bridge'
import { extFor, openCamera, startRecording, stopStream, type Recording } from '@/lib/media/recorder'
import { cn, formatClock } from '@/lib/util/cn'

/**
 * Caméra du navigateur, au poids contrôlé : photos réduites à 1920 px, vidéo 720p à ~2,5 Mb/s.
 * Plusieurs photos d'affilée ; une vidéo par prise.
 */
export function WebCamera({ open, mode: initialMode, onClose, onCaptured }: { open: boolean; mode: 'photo' | 'video'; onClose: () => void; onCaptured: (files: File[]) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recRef = useRef<Recording | null>(null)
  const [mode, setMode] = useState(initialMode)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [error, setError] = useState<string | null>(null)
  const [shots, setShots] = useState<File[]>([])
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [flash, setFlash] = useState(false)

  useEffect(() => setMode(initialMode), [initialMode])

  const start = useCallback(async () => {
    stopStream(streamRef.current)
    setError(null)
    try {
      const s = await openCamera(facing, mode === 'video')
      streamRef.current = s
      if (videoRef.current) {
        videoRef.current.srcObject = s
        await videoRef.current.play().catch(() => undefined)
      }
    } catch {
      setError('La caméra n’est pas accessible. Autorisez-la dans le navigateur, ou importez un fichier.')
    }
  }, [facing, mode])

  useEffect(() => {
    if (!open) return
    void start()
    return () => {
      recRef.current?.cancel()
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [open, start])

  useEffect(() => {
    if (!recording) return
    const t0 = Date.now()
    const id = setInterval(() => {
      const s = (Date.now() - t0) / 1000
      setElapsed(s)
      if (s >= CAPTURE_PRESETS.video.maxDurationSec) void stopVideo()
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])

  useEffect(() => {
    if (!open) {
      setShots([])
      setRecording(false)
      setElapsed(0)
    }
  }, [open])

  async function takePhoto() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const max = CAPTURE_PRESETS.photo.maxDimension
    const scale = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(v.videoWidth * scale)
    canvas.height = Math.round(v.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height)
    setFlash(true)
    setTimeout(() => setFlash(false), 140)
    canvas.toBlob(
      (b) => {
        if (b) setShots((l) => [...l, new File([b], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })])
      },
      'image/jpeg',
      CAPTURE_PRESETS.photo.jpegQuality,
    )
  }

  function startVideo() {
    if (!streamRef.current) return
    recRef.current = startRecording(streamRef.current, 'video')
    setElapsed(0)
    setRecording(true)
  }

  async function stopVideo() {
    const r = recRef.current
    if (!r) return
    recRef.current = null
    setRecording(false)
    const blob = await r.stop()
    onCaptured([new File([blob], `video-${Date.now()}.${extFor(r.mime)}`, { type: blob.type || 'video/webm' })])
    onClose()
  }

  function finish() {
    if (shots.length) onCaptured(shots)
    onClose()
  }

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={mode === 'photo' ? 'Prendre des photos' : 'Filmer'}>
      <div className="pt-safe flex items-center justify-between px-4 py-3">
        <button type="button" onClick={() => (recording ? undefined : onClose())} aria-label="Fermer" className="btn-press flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
          <X className="h-6 w-6" />
        </button>
        {recording ? (
          <span className="flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-black tabular-nums">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> {formatClock(elapsed)}
          </span>
        ) : (
          <div className="flex rounded-2xl bg-white/10 p-1 backdrop-blur-md">
            {(['photo', 'video'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn('btn-press flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-black', mode === m ? 'bg-white text-slate-900' : 'text-white/80')}>
                {m === 'photo' ? <Camera className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                {m === 'photo' ? 'Photo' : 'Vidéo'}
              </button>
            ))}
          </div>
        )}
        <button type="button" disabled={recording} onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} aria-label="Changer de caméra" className="btn-press flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md disabled:opacity-40">
          <RefreshCcw className="h-5 w-5" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center p-8 text-center font-bold text-white/80">{error}</div>
        ) : (
          <video ref={videoRef} playsInline muted className="h-full w-full object-contain" />
        )}
        {flash && <div className="absolute inset-0 bg-white/70" />}
        {mode === 'video' && !recording && !error && (
          <p className="absolute inset-x-0 bottom-4 text-center text-sm font-bold text-white/80">720p · environ 19 Mo la minute · {CAPTURE_PRESETS.video.maxDurationSec / 60} min au plus</p>
        )}
      </div>

      {mode === 'photo' && shots.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
          {shots.map((s, i) => (
            <Thumb key={i} file={s} />
          ))}
        </div>
      )}

      <div className="pb-safe flex items-center justify-between px-8 pt-5 pb-6">
        <span className="w-24" />
        {mode === 'photo' ? (
          <button type="button" onClick={takePhoto} disabled={!!error} aria-label="Prendre la photo" className="btn-press flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40">
            <span className="h-14 w-14 rounded-full bg-white" />
          </button>
        ) : recording ? (
          <button type="button" onClick={stopVideo} aria-label="Arrêter" className="btn-press recording-pulse flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-rose-500">
            <span className="h-8 w-8 rounded-lg bg-white" />
          </button>
        ) : (
          <button type="button" onClick={startVideo} disabled={!!error} aria-label="Filmer" className="btn-press flex h-20 w-20 items-center justify-center rounded-full border-4 border-white disabled:opacity-40">
            <span className="h-14 w-14 rounded-full bg-rose-500" />
          </button>
        )}
        <span className="flex w-24 justify-end">
          {mode === 'photo' && shots.length > 0 && (
            <button type="button" onClick={finish} className="btn-press bg-gradient-primary flex h-14 items-center gap-2 rounded-full px-5 font-black">
              <Check className="h-5 w-5" /> {shots.length}
            </button>
          )}
        </span>
      </div>
    </div>,
    document.body,
  )
}

function Thumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url ? <img src={url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/30" /> : null
}
