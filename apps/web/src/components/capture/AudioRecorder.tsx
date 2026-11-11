'use client'

import { Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CAPTURE_PRESETS } from '@clip/bridge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useMessages } from '@/lib/i18n'
import { extFor, levelMeter, openMic, startRecording, stopStream, type Recording } from '@/lib/media/recorder'
import { formatClock } from '@/lib/util/cn'

/** Note vocale dans le navigateur : un gros bouton, une minuterie, un vu-mètre. */
export function AudioRecorder({ open, onClose, onCaptured }: { open: boolean; onClose: () => void; onCaptured: (file: File) => void }) {
  const t = useMessages()
  const tr = t.capture.recorder
  const [state, setState] = useState<'ready' | 'recording' | 'error'>('ready')
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const stream = useRef<MediaStream | null>(null)
  const rec = useRef<Recording | null>(null)
  const meter = useRef<{ read: () => number; close: () => void } | null>(null)

  useEffect(() => {
    if (!open) return
    setState('ready')
    setElapsed(0)
    return () => {
      rec.current?.cancel()
      rec.current = null
      meter.current?.close()
      stopStream(stream.current)
      stream.current = null
    }
  }, [open])

  useEffect(() => {
    if (state !== 'recording') return
    const t0 = Date.now()
    const id = setInterval(() => {
      const s = (Date.now() - t0) / 1000
      setElapsed(s)
      setLevel(meter.current?.read() ?? 0)
      if (s >= CAPTURE_PRESETS.audio.maxDurationSec) void stop()
    }, 120)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  async function start() {
    try {
      stream.current = await openMic()
      meter.current = levelMeter(stream.current)
      rec.current = startRecording(stream.current, 'audio')
      setState('recording')
    } catch {
      setState('error')
    }
  }

  async function stop() {
    const r = rec.current
    if (!r) return
    rec.current = null
    const blob = await r.stop()
    meter.current?.close()
    stopStream(stream.current)
    onCaptured(new File([blob], `${tr.fileName}-${Date.now()}.${extFor(r.mime)}`, { type: blob.type || 'audio/webm' }))
    onClose()
  }

  return (
    <Modal open={open} onClose={() => state !== 'recording' && onClose()} title={tr.title} size="sm">
      <div className="flex flex-col items-center py-4 text-center">
        <p className="mb-6 font-medium text-slate-500 dark:text-slate-400">
          {state === 'error' ? tr.noMic : tr.explain}
        </p>
        <div className="relative mb-6 flex h-36 w-36 items-center justify-center">
          <span className="bg-gradient-primary absolute inset-0 rounded-full opacity-20 transition-transform duration-100" style={{ transform: `scale(${1 + level * 0.6})` }} />
          {state === 'recording' ? (
            <button type="button" onClick={stop} aria-label={tr.stop} className="btn-press recording-pulse relative flex h-28 w-28 items-center justify-center rounded-full bg-rose-500 text-white">
              <Square className="h-10 w-10 fill-current" />
            </button>
          ) : (
            <button type="button" onClick={start} disabled={state === 'error'} aria-label={tr.start} className="btn-press bg-gradient-primary shadow-primary relative flex h-28 w-28 items-center justify-center rounded-full text-white disabled:opacity-50">
              <Mic className="h-12 w-12" />
            </button>
          )}
        </div>
        <p className="text-4xl font-black tracking-tighter tabular-nums">{formatClock(elapsed)}</p>
        <p className="mt-1 text-sm font-bold text-slate-400">{state === 'recording' ? tr.tapToStop : tr.tapToStart}</p>
        {state !== 'recording' && (
          <Button className="mt-6" onClick={onClose}>
            {t.common.cancel}
          </Button>
        )}
      </div>
    </Modal>
  )
}
