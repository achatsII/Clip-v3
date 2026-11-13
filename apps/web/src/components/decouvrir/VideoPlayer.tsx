'use client'

/**
 * Le lecteur de l'espace Découvrir, dans la page : la vidéo (sous-titres offerts, éteints au départ : une
 * piste sans `default`), les chapitres à côté (celui qu'on regarde en surbrillance, un toucher y saute), la
 * transcription repliée dessous, la vidéo suivante du parcours. La progression se garde dans ce navigateur ;
 * interrupteur allumé, les mêmes moments partent au suivi.
 */
import { ChevronRight, ListVideo, RefreshCw, ScrollText, VideoOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { clock, VIDEO_LEVEL, type VideoId } from '@/lib/decouvrir/catalog'
import { recordProgress } from '@/lib/decouvrir/progress'
import { videoPaused, videoProgress } from '@/lib/decouvrir/tracker'
import { chapterIndexAt, type VideoMeta } from '@/lib/decouvrir/videos'
import { messagesIn, useMessages } from '@/lib/i18n'
import { cn, formatDuration } from '@/lib/util/cn'

export function VideoPlayer({ id, meta, next, onNext, autoplay }: { id: VideoId; meta: VideoMeta; next: VideoId | null; onNext: () => void; autoplay: boolean }) {
  const t = useMessages().decouvrir
  const words = t.videos[id]
  const ref = useRef<HTMLVideoElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const last = useRef<{ time: number; saved: number } | null>(null)
  const [time, setTime] = useState(0)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // Le suivi porte le titre du catalogue en français, celui que Sandboxes affiche.
  const tracked = useMemo(() => ({ id, title: messagesIn('fr').decouvrir.videos[id].title, chapters: meta.chapters }), [id, meta.chapters])

  useEffect(() => {
    if (autoplay) void ref.current?.play().catch(() => undefined)
  }, [autoplay, id])

  useEffect(() => {
    setTime(0)
    setFailed(false)
    last.current = null
  }, [id])

  const onTime = useCallback(() => {
    const v = ref.current
    if (!v) return
    setTime(v.currentTime)
    const dur = v.duration || meta.durationSec || 0
    if (!dur) return
    const prev = last.current
    // Un saut (chapitre, barre de lecture) ne compte pas comme du temps regardé.
    const step = prev ? v.currentTime - prev.time : 0
    const delta = prev && !v.paused && step > 0 && step <= 1.5 ? step : 0
    const pct = (v.currentTime / dur) * 100
    // Gardée toutes les 3 s de lecture environ (et à la fin).
    const acc = (prev?.saved ?? 0) + delta
    if (!prev || acc >= 3 || pct >= 99) {
      recordProgress(id, pct, acc)
      last.current = { time: v.currentTime, saved: 0 }
    } else {
      last.current = { time: v.currentTime, saved: acc }
    }
    videoProgress(tracked, v.currentTime, dur, delta)
  }, [id, meta.durationSec, tracked])

  // À la pause et en quittant la page : le temps regardé depuis le dernier enregistrement n'est pas perdu.
  const keep = useCallback(() => {
    const v = ref.current
    const prev = last.current
    if (!v || !prev || prev.saved <= 0) return
    const dur = v.duration || meta.durationSec || 0
    if (dur) recordProgress(id, (v.currentTime / dur) * 100, prev.saved)
    last.current = { ...prev, saved: 0 }
  }, [id, meta.durationSec])
  useEffect(() => {
    window.addEventListener('pagehide', keep)
    return () => {
      window.removeEventListener('pagehide', keep)
      keep()
    }
  }, [keep])

  const seek = (sec: number) => {
    const v = ref.current
    if (!v) return
    v.currentTime = sec
    void v.play().catch(() => undefined)
  }

  const activeChapter = chapterIndexAt(meta.chapters, time)
  const activeLine = chapterIndexAt(meta.transcript, time)

  // La ligne dite reste visible dans la transcription ouverte (la liste défile, jamais la page).
  useEffect(() => {
    const list = listRef.current
    const el = list?.querySelector<HTMLElement>(`[data-line="${activeLine}"]`)
    if (!list || !el || !list.offsetParent) return
    const top = el.offsetTop - list.clientHeight / 3
    if (Math.abs(list.scrollTop - top) > 40) list.scrollTo({ top, behavior: 'smooth' })
  }, [activeLine])

  const level = t.levels[VIDEO_LEVEL[id]]

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        <div className="glass-panel overflow-hidden rounded-[28px]">
          <div className="relative aspect-video bg-slate-950">
            <video
              key={`${id}-${attempt}`}
              ref={ref}
              className="absolute inset-0 h-full w-full"
              src={meta.mp4}
              poster={meta.poster}
              controls
              playsInline
              preload="metadata"
              onTimeUpdate={onTime}
              onSeeked={onTime}
              onError={() => setFailed(true)}
              onPause={() => {
                keep()
                const v = ref.current
                if (v) videoPaused(tracked, v.currentTime, v.duration || meta.durationSec || 0)
              }}
              onEnded={() => {
                recordProgress(id, 100, 0)
                const dur = ref.current?.duration || meta.durationSec || 0
                videoProgress(tracked, dur, dur, 0)
              }}
            >
              {meta.vtt && <track kind="subtitles" src={meta.vtt} srcLang="fr" label={t.player.subtitles} />}
            </video>
            {failed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/85 p-6 text-center text-white" role="alert">
                <VideoOff className="h-9 w-9 text-white/80" aria-hidden />
                <p className="max-w-sm text-[15px] font-bold">{t.player.failed}</p>
                <Button
                  icon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => {
                    setFailed(false)
                    setAttempt((a) => a + 1)
                  }}
                >
                  {t.player.retry}
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-start gap-4 p-5">
            <div className="min-w-0 flex-1">
              <p className="label-caps text-[var(--primary)]">{level.title}</p>
              <h2 className="mt-1 text-[22px] leading-tight font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">{words.title}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed font-medium text-slate-600 dark:text-slate-300">{words.summary}</p>
              <p className="mt-2 text-[13px] font-bold text-slate-500 dark:text-slate-400">{t.player.forWho(words.forWho)}</p>
            </div>
            {next && (
              <Button iconRight={<ChevronRight className="h-4 w-4" />} onClick={onNext} className="shrink-0">
                {t.player.next}
              </Button>
            )}
          </div>
        </div>
        {meta.transcript.length > 0 && (
          <details className="glass-card group rounded-[24px] p-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[15px] font-black tracking-tight text-slate-900 dark:text-white [&::-webkit-details-marker]:hidden">
              <ScrollText className="h-4 w-4 text-[var(--primary)]" aria-hidden /> {t.player.transcript}
              <ChevronRight className="ml-auto h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <ol ref={listRef} className="relative mt-2 max-h-[320px] space-y-1 overflow-y-auto pr-1">
              {meta.transcript.map((l, i) => (
                <li key={`${l.t}-${i}`} data-line={i}>
                  <button
                    type="button"
                    onClick={() => seek(l.t)}
                    className={cn('btn-press w-full rounded-xl px-2.5 py-2 text-left text-[14px] leading-snug transition-colors', i === activeLine ? 'bg-primary-soft font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/5')}
                  >
                    <span className="mr-2 text-[12px] font-bold text-slate-400 tabular-nums">{clock(l.t)}</span>
                    {l.text}
                  </button>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>

      <aside className="glass-card h-fit rounded-[28px] p-4" aria-label={t.player.chapters(formatDuration(meta.durationSec))}>
        <p className="flex items-center gap-2 px-2 pb-2 text-[12px] font-black tracking-[0.12em] text-slate-500 uppercase dark:text-slate-400">
          <ListVideo className="h-4 w-4 text-[var(--primary)]" aria-hidden /> {t.player.chapters(formatDuration(meta.durationSec))}
        </p>
        <ol className="max-h-[460px] space-y-1 overflow-y-auto pr-1 lg:max-h-[560px]">
          {meta.chapters.map((c, i) => (
            <li key={`${c.t}-${i}`}>
              <button
                type="button"
                onClick={() => seek(c.t)}
                aria-current={i === activeChapter ? 'true' : undefined}
                className={cn('btn-press flex min-h-11 w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors', i === activeChapter ? 'bg-primary-soft text-[var(--primary-strong)] dark:text-sky-300' : 'hover:bg-slate-900/5 dark:hover:bg-white/5')}
              >
                <span className="mt-0.5 w-5 shrink-0 text-[12px] font-black text-slate-400 tabular-nums">{i + 1}</span>
                <span className={cn('min-w-0 flex-1 text-[14px] leading-snug font-bold', i !== activeChapter && 'text-slate-800 dark:text-slate-100')}>{c.title}</span>
                <span className="shrink-0 text-[12px] font-bold text-slate-400 tabular-nums">{clock(c.t)}</span>
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}
