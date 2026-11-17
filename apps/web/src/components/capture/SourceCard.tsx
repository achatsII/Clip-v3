'use client'

import { AlertCircle, Check, Images, Loader2, Mic, RotateCcw, Trash2, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { SourceIcon } from '@/components/icons'
import { Textarea } from '@/components/ui/Field'
import type { PendingUpload } from '@/lib/capture/session'
import { useMessages } from '@/lib/i18n'
import type { Source } from '@/lib/model/types'
import { cn, formatBytes, formatClock, formatDuration } from '@/lib/util/cn'

function Thumb({ url, kind }: { url?: string; kind: Source['kind'] }) {
  if (url) {
    return (
      <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-700">
        <img src={url} alt="" className="h-full w-full object-cover" />
        {kind === 'video' && <span className="absolute inset-0 flex items-center justify-center bg-black/25"><SourceIcon kind="video" className="h-6 w-6 text-white" /></span>}
      </span>
    )
  }
  const colors: Record<string, string> = {
    audio: 'from-violet-500 to-indigo-600',
    note: 'from-amber-400 to-orange-500',
    document: 'from-slate-500 to-slate-700',
    video: 'from-sky-500 to-blue-600',
    photo: 'from-teal-400 to-emerald-600',
  }
  return (
    <span className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white', colors[kind])}>
      <SourceIcon kind={kind} className="h-7 w-7" />
    </span>
  )
}

/**
 * `narrated` : la note d'une série de photos prises en parlant, et combien de photos elle commente.
 * `voiceAt` : une photo de cette série, et son instant dans la note.
 * `screenShots` : un enregistrement de l'écran, et combien d'images nettes il a gardées.
 */
export function SourceCard({ source, onRemove, onEditText, narrated, voiceAt, screenShots }: { source: Source; onRemove?: () => void; onEditText?: (text: string) => void; narrated?: number; voiceAt?: number; screenShots?: number }) {
  const t = useMessages()
  const ts = t.capture.source
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(source.text ?? '')
  const kindLabel = narrated ? ts.narrated(narrated) : ts.kinds[source.kind]
  const meta = [kindLabel, formatDuration(source.durationSec), source.pageCount ? ts.pages(source.pageCount) : '', formatBytes(source.sizeBytes)].filter(Boolean).join(' · ')
  const title = source.kind === 'note' ? ts.writtenNote : narrated ? ts.narration : (source.originalName ?? source.name ?? ts.kinds[source.kind])
  return (
    <div className="glass-card animate-pop-in flex items-start gap-4 rounded-[24px] p-3 pr-2">
      <Thumb url={source.thumbnailUrl} kind={source.kind} />
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate text-[15px] font-black text-slate-900 dark:text-white">{title}</p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-bold text-slate-500">
          <Check className="h-3.5 w-3.5 text-emerald-500" /> {meta}
          {!!screenShots && (
            <span className="inline-flex items-center gap-1 text-[var(--primary-strong)] dark:text-[var(--primary-light)]">
              <Images className="h-3.5 w-3.5" aria-hidden /> {ts.screenShots(screenShots)}
            </span>
          )}
          {typeof voiceAt === 'number' && (
            <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-300" title={ts.voiceAt(formatClock(voiceAt))}>
              <Mic className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">{ts.voiceAt(formatClock(voiceAt))}</span>
              <span aria-hidden className="tabular-nums">{formatClock(voiceAt)}</span>
            </span>
          )}
        </p>
        {(source.kind === 'note' || source.kind === 'audio') &&
          (editing ? (
            <div className="mt-2">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-20 text-sm font-medium" />
              <div className="mt-1 flex gap-2">
                <button type="button" className="text-sm font-black text-[var(--primary)]" onClick={() => { onEditText?.(text); setEditing(false) }}>
                  {t.common.save}
                </button>
                <button type="button" className="text-sm font-bold text-slate-500" onClick={() => { setText(source.text ?? ''); setEditing(false) }}>
                  {t.common.cancel}
                </button>
              </div>
            </div>
          ) : source.text ? (
            <button type="button" onClick={() => onEditText && setEditing(true)} className="mt-1 line-clamp-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">
              {ts.quote(source.text)}
            </button>
          ) : source.kind === 'audio' ? (
            <p className="mt-1 text-xs font-medium text-slate-400">{ts.noTranscript}</p>
          ) : null)}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={t.common.remove} className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function PendingCard({ item, onDismiss, onRetry }: { item: PendingUpload; onDismiss: () => void; onRetry?: () => void }) {
  const t = useMessages()
  const ts = t.capture.source
  const failed = item.stage === 'error'
  // En attente du réseau, l'envoi n'est pas perdu : la barre reste où il en était.
  const sending = item.stage === 'upload' || item.stage === 'offline'
  return (
    <div className={cn('glass-card flex items-center gap-4 rounded-[24px] p-3 pr-2', failed && 'ring-2 ring-rose-300 dark:ring-rose-500/40')}>
      <span className="relative block shrink-0">
        <Thumb url={item.previewUrl} kind={item.kind} />
        {!failed && <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30"><Loader2 className="h-6 w-6 animate-spin text-white" /></span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-black text-slate-900 dark:text-white">{item.name}</p>
        <p className={cn('flex items-start gap-1.5 text-xs font-bold', failed ? 'text-rose-600' : 'text-slate-500')}>
          {failed && <AlertCircle className="h-3.5 w-3.5" />}
          {item.stage === 'offline' && <WifiOff className="h-3.5 w-3.5 shrink-0" />}
          {failed ? item.error ?? ts.stages.error : ts.stages[item.stage] ?? ts.stages.upload}
          {sending && typeof item.progress === 'number' && <span className="tabular-nums">{ts.percent(Math.round(item.progress * 100))}</span>}
        </p>
        {sending && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
            <div className="bg-gradient-primary h-full rounded-full transition-[width]" style={{ width: `${Math.round((item.progress ?? 0) * 100)}%` }} />
          </div>
        )}
      </div>
      {failed && onRetry && (
        <button type="button" onClick={onRetry} className="btn-press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-sm font-black text-[var(--primary)] hover:bg-[rgba(var(--primary-rgb),0.08)]">
          <RotateCcw className="h-4 w-4" /> {t.common.retry}
        </button>
      )}
      {failed && (
        <button type="button" onClick={onDismiss} aria-label={t.common.remove} className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-900/5">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
