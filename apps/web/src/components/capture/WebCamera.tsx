'use client'

import { Camera, Check, MicOff, Pause, RefreshCcw, Video, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CAPTURE_PRESETS } from '@clip/bridge'
import { messages, useMessages } from '@/lib/i18n'
import { usePhotoVoice, type PhotoVoice } from '@/lib/media/photoVoice'
import { extFor, openCamera, startRecording, stopStream, type Recording } from '@/lib/media/recorder'
import { cn, formatClock } from '@/lib/util/cn'

/** Des photos prises en parlant : la note de la série, et l'instant de chaque photo (`at[i]` pour la photo i). */
export interface PhotoNarration {
  audio: File
  at: Array<number | undefined>
}

/**
 * Caméra du navigateur, au poids contrôlé : photos réduites à 1920 px, vidéo 720p à ~2,5 Mb/s.
 * Plusieurs photos d'affilée ; une vidéo par prise. Avec `voice` (toggle `photoVoice`), on parle en
 * prenant les photos : une pastille dit que le micro écoute et le ferme d'un geste.
 */
export function WebCamera({
  open,
  mode: initialMode,
  onClose,
  onCaptured,
  voice = false,
}: {
  open: boolean
  mode: 'photo' | 'video'
  onClose: () => void
  onCaptured: (files: File[], narration?: PhotoNarration | null) => void
  voice?: boolean
}) {
  const t = useMessages()
  const tc = t.capture.camera
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recRef = useRef<Recording | null>(null)
  const [mode, setMode] = useState(initialMode)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [error, setError] = useState<string | null>(null)
  const [shots, setShots] = useState<Array<{ file: File; at?: number }>>([])
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [flash, setFlash] = useState(false)
  const [finishing, setFinishing] = useState(false)
  // Le micro suit la caméra en mode photo, une fois l'image là (rien ne s'ouvre si la caméra manque).
  const narration = usePhotoVoice(open && voice && mode === 'photo' && !error)

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
      setError(messages().capture.camera.noCamera)
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
      setFinishing(false)
    }
  }, [open])

  async function takePhoto() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    // L'instant du déclic dans le commentaire, s'il y en a un.
    const at = narration.mark()
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
        if (b) setShots((l) => [...l, { file: new File([b], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }), at }])
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

  async function finish() {
    if (finishing) return
    setFinishing(true)
    const audio = await narration.finish().catch(() => null)
    if (shots.length) onCaptured(shots.map((s) => s.file), audio ? { audio, at: shots.map((s) => s.at) } : null)
    onClose()
  }

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={mode === 'photo' ? tc.takePhotos : tc.film}>
      <div className="pt-safe flex items-center justify-between px-4 py-3">
        <button type="button" onClick={() => (recording ? undefined : onClose())} aria-label={t.common.close} className="btn-press flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
          <X className="h-6 w-6" />
        </button>
        {recording ? (
          <span className="flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-black tabular-nums">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> {formatClock(elapsed)}
          </span>
        ) : shots.length > 0 ? (
          // Une série commencée se termine par ✓ : passer à la vidéo la perdrait.
          <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black tabular-nums backdrop-blur-md">{tc.count(shots.length)}</span>
        ) : (
          <div className="flex rounded-2xl bg-white/10 p-1 backdrop-blur-md">
            {(['photo', 'video'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn('btn-press flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-black', mode === m ? 'bg-white text-slate-900' : 'text-white/80')}>
                {m === 'photo' ? <Camera className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                {m === 'photo' ? tc.photo : tc.video}
              </button>
            ))}
          </div>
        )}
        <button type="button" disabled={recording} onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} aria-label={tc.switchCamera} className="btn-press flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md disabled:opacity-40">
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
        {mode === 'photo' && voice && !error && narration.state !== 'idle' && (
          <div className="absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-4">
            <MicPill voice={narration} />
            {narration.state === 'denied' && <p className="max-w-xs rounded-2xl bg-black/60 px-3 py-2 text-center text-xs font-bold text-white/90 backdrop-blur-md">{tc.micDeniedHint}</p>}
          </div>
        )}
        {mode === 'photo' && narration.state === 'on' && shots.length === 0 && !error && (
          <p className="absolute inset-x-0 bottom-4 px-6 text-center text-sm font-bold text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">{tc.voiceHint}</p>
        )}
        {mode === 'video' && !recording && !error && (
          <p className="absolute inset-x-0 bottom-4 text-center text-sm font-bold text-white/80">{tc.videoHint(CAPTURE_PRESETS.video.maxDurationSec / 60)}</p>
        )}
      </div>

      {mode === 'photo' && shots.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
          {shots.map((s, i) => (
            <Thumb key={i} file={s.file} />
          ))}
        </div>
      )}

      <div className="pb-safe flex items-center justify-between px-8 pt-5 pb-6">
        <span className="w-24" />
        {mode === 'photo' ? (
          <button type="button" onClick={takePhoto} disabled={!!error} aria-label={tc.takePhoto} className="btn-press flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40">
            <span className="h-14 w-14 rounded-full bg-white" />
          </button>
        ) : recording ? (
          <button type="button" onClick={stopVideo} aria-label={tc.stop} className="btn-press recording-pulse flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-rose-500">
            <span className="h-8 w-8 rounded-lg bg-white" />
          </button>
        ) : (
          <button type="button" onClick={startVideo} disabled={!!error} aria-label={tc.film} className="btn-press flex h-20 w-20 items-center justify-center rounded-full border-4 border-white disabled:opacity-40">
            <span className="h-14 w-14 rounded-full bg-rose-500" />
          </button>
        )}
        <span className="flex w-24 justify-end">
          {mode === 'photo' && shots.length > 0 && (
            <button type="button" onClick={() => void finish()} disabled={finishing} aria-label={tc.done(shots.length)} className="btn-press bg-gradient-primary flex h-14 items-center gap-2 rounded-full px-5 font-black disabled:opacity-60">
              <Check className="h-5 w-5" /> {shots.length}
            </button>
          )}
        </span>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Le micro, en une pastille en haut de l'image : rouge quand il écoute, sombre quand il est fermé.
 * Un toucher l'ouvre ou le ferme ; le geste est retenu sur l'appareil.
 */
function MicPill({ voice }: { voice: PhotoVoice }) {
  const tc = useMessages().capture.camera
  const on = voice.state === 'on'
  const label = on ? tc.listening(formatClock(voice.seconds)) : voice.state === 'full' ? tc.micFull(formatClock(CAPTURE_PRESETS.audio.maxDurationSec)) : voice.state === 'denied' ? tc.micDenied : tc.micClosed
  return (
    <button
      type="button"
      onClick={voice.toggle}
      disabled={voice.state === 'full'}
      aria-pressed={on}
      aria-label={`${label}. ${on ? tc.micOff : tc.micOn}`}
      className={cn(
        'btn-press flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black tabular-nums shadow-lg',
        on ? 'bg-rose-500 text-white' : 'border border-white/20 bg-black/50 text-white backdrop-blur-md',
      )}
    >
      {on ? <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> : <MicOff className="h-4 w-4" />}
      {label}
      {on && <Pause className="h-3.5 w-3.5 opacity-80" />}
    </button>
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
