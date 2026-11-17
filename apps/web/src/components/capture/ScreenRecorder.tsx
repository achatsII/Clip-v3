'use client'

/**
 * Enregistrer l'écran d'un ordinateur (toggle `screenCapture`) : trois phrases, le micro en option, un
 * bouton. Pendant l'enregistrement, ce qui est filmé, le temps et le nombre d'images nettes ; on
 * revient ici pour « Terminer » (ou on arrête le partage dans le navigateur, ce qui termine aussi).
 * Fermer la fenêtre en cours d'enregistrement garde ce qui est fait : rien ne se perd par mégarde.
 */
import { Check, Mic, MicOff, MonitorUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Confirm'
import { Switch } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { locale, useMessages } from '@/lib/i18n'
import { extFor } from '@/lib/media/recorder'
import { SCREEN_MAX_SEC, startScreen, type ScreenResult, type ScreenSession } from '@/lib/media/screenRecorder'
import type { ScreenCapture } from '@/lib/media/ingest'
import { readPref, writePref } from '@/lib/prefs'
import { formatClock } from '@/lib/util/cn'

/** Le dernier choix du micro, sur cet appareil : avec la voix par défaut (le pourquoi vaut de l'or). */
export const SCREEN_VOICE_PREF = 'clip_pref_screen_voice'

type Phase = 'ready' | 'starting' | 'recording' | 'saving'

/** Ce que l'enregistrement donne à la capture : la vidéo nommée, sa durée et ses images nettes. */
export function toCapture(r: ScreenResult, name: string): ScreenCapture {
  const type = r.video.type || r.mime.split(';')[0] || 'video/webm'
  return { video: new File([r.video], `${name}.${extFor(type)}`, { type }), durationSec: r.durationSec, shots: r.shots }
}

export function ScreenRecorder({ open, onClose, onCaptured }: { open: boolean; onClose: () => void; onCaptured: (capture: ScreenCapture) => void }) {
  const t = useMessages()
  const ts = t.capture.screen
  const toast = useToast()
  const confirm = useConfirm()
  const [phase, setPhase] = useState<Phase>('ready')
  const [voice, setVoice] = useState(() => readPref(SCREEN_VOICE_PREF) !== 'off')
  const [seconds, setSeconds] = useState(0)
  const [shots, setShots] = useState(0)
  const session = useRef<ScreenSession | null>(null)
  const preview = useRef<HTMLVideoElement>(null)
  const warned = useRef(false)

  // Le temps qui passe, et l'arrêt tout seul à la limite.
  useEffect(() => {
    if (phase !== 'recording') return
    const timer = setInterval(() => {
      const s = session.current?.seconds() ?? 0
      setSeconds(s)
      if (!warned.current && s >= SCREEN_MAX_SEC - 60) {
        warned.current = true
        toast.info(ts.lastMinute)
      }
      if (s >= SCREEN_MAX_SEC) void finish()
    }, 500)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // L'aperçu de ce qui est enregistré.
  useEffect(() => {
    const v = preview.current
    if (phase !== 'recording' || !v || !session.current) return
    v.srcObject = session.current.stream
    void v.play().catch(() => undefined)
    return () => {
      v.srcObject = null
    }
  }, [phase])

  // Quitter la page en cours d'enregistrement : on coupe le partage et le micro.
  useEffect(() => () => session.current?.cancel(), [])

  async function begin() {
    setPhase('starting')
    try {
      const started = await startScreen({ voice, onShot: setShots })
      if (!started) {
        setPhase('ready')
        return
      }
      session.current = started.session
      warned.current = false
      setSeconds(0)
      setShots(0)
      if (started.voiceDenied) toast.info(ts.voiceDenied)
      started.session.onEnded(() => void finish())
      setPhase('recording')
    } catch {
      setPhase('ready')
      toast.error(ts.failed, ts.failedHint)
    }
  }

  const finishing = useRef(false)
  async function finish() {
    const s = session.current
    if (!s || finishing.current) return
    finishing.current = true
    setPhase('saving')
    try {
      const result = await s.stop()
      const when = new Date().toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      if (result.video.size > 0) onCaptured(toCapture(result, ts.fileName(when)))
    } finally {
      session.current = null
      finishing.current = false
      setPhase('ready')
      onClose()
    }
  }

  async function discard() {
    if (!(await confirm({ title: ts.discardTitle, description: ts.discardText, confirmLabel: ts.discard, danger: true }))) return
    session.current?.cancel()
    session.current = null
    setPhase('ready')
  }

  // Fermer pendant l'enregistrement garde ce qui est fait.
  const close = () => (phase === 'recording' ? void finish() : phase === 'ready' ? onClose() : undefined)
  const recording = phase === 'recording'

  return (
    <Modal
      open={open}
      onClose={close}
      title={ts.title}
      dismissable={phase === 'ready'}
      footer={
        recording ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => void discard()}>{ts.discard}</Button>
            <Button variant="primary" onClick={() => void finish()} icon={<Check className="h-4 w-4" />}>
              {ts.finish}
            </Button>
          </div>
        ) : phase === 'saving' ? undefined : (
          <div className="flex justify-end">
            <Button variant="primary" loading={phase === 'starting'} onClick={() => void begin()} icon={<MonitorUp className="h-4 w-4" />}>
              {ts.choose}
            </Button>
          </div>
        )
      }
    >
      {recording ? (
        <div>
          <div className="relative overflow-hidden rounded-[24px] bg-slate-900">
            <video ref={preview} muted playsInline aria-label={ts.previewLabel} className="aspect-video w-full object-contain" />
            <span className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-black text-white backdrop-blur-md" role="status">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" aria-hidden />
              {ts.recording}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-2xl font-black tracking-tighter tabular-nums">{ts.elapsed(formatClock(seconds), formatClock(SCREEN_MAX_SEC))}</p>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400" aria-live="polite">
              {ts.shots(shots)}
            </p>
            <p className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 dark:text-slate-400">
              {session.current?.withVoice ? <Mic className="h-4 w-4 text-emerald-500" /> : <MicOff className="h-4 w-4" />}
              {session.current?.withVoice ? ts.withVoice : ts.noVoice}
            </p>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{ts.stopHint}</p>
        </div>
      ) : phase === 'saving' ? (
        <div role="status" aria-busy="true" className="py-8 text-center">
          <MonitorUp className="mx-auto h-10 w-10 animate-pulse text-[var(--primary)]" />
          <p className="mt-3 font-black">{ts.saving}</p>
        </div>
      ) : (
        <div>
          <ol className="space-y-3">
            {ts.steps.map((line, i) => (
              <li key={line} className="flex items-start gap-3">
                <span className="bg-gradient-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white">{i + 1}</span>
                <span className="pt-1 font-bold text-slate-800 dark:text-slate-100">{line}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <Switch
              checked={voice}
              onChange={(v) => {
                setVoice(v)
                writePref(SCREEN_VOICE_PREF, v ? null : 'off')
              }}
              label={ts.voice}
              description={ts.voiceHint}
            />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{ts.privacy}</p>
        </div>
      )}
    </Modal>
  )
}
