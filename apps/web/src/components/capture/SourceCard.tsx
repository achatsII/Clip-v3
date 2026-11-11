'use client'

import { AlertCircle, Check, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { SourceIcon } from '@/components/icons'
import { Textarea } from '@/components/ui/Field'
import type { PendingUpload } from '@/lib/capture/session'
import type { Source } from '@/lib/model/types'
import { cn, formatBytes, formatDuration } from '@/lib/util/cn'

const STAGE: Record<string, string> = {
  import: 'Préparation sur le téléphone (téléchargement d’iCloud au besoin)…',
  prepare: 'Préparation…',
  upload: 'Envoi…',
  optimize: 'Optimisation de la vidéo…',
  transcribe: 'Transcription…',
  convert: 'Conversion en PDF…',
  error: 'Échec',
}

const KIND_LABEL: Record<string, string> = { photo: 'Photo', video: 'Vidéo', audio: 'Note vocale', note: 'Note', document: 'Document' }

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

export function SourceCard({ source, onRemove, onEditText }: { source: Source; onRemove?: () => void; onEditText?: (text: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(source.text ?? '')
  const meta = [KIND_LABEL[source.kind], formatDuration(source.durationSec), source.pageCount ? `${source.pageCount} pages` : '', formatBytes(source.sizeBytes)].filter(Boolean).join(' · ')
  return (
    <div className="glass-card animate-pop-in flex items-start gap-4 rounded-[24px] p-3 pr-2">
      <Thumb url={source.thumbnailUrl} kind={source.kind} />
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate text-[15px] font-black text-slate-900 dark:text-white">{source.kind === 'note' ? 'Note écrite' : source.originalName ?? source.name ?? KIND_LABEL[source.kind]}</p>
        <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <Check className="h-3.5 w-3.5 text-emerald-500" /> {meta}
        </p>
        {(source.kind === 'note' || source.kind === 'audio') &&
          (editing ? (
            <div className="mt-2">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-20 text-sm font-medium" />
              <div className="mt-1 flex gap-2">
                <button type="button" className="text-sm font-black text-[var(--primary)]" onClick={() => { onEditText?.(text); setEditing(false) }}>
                  Enregistrer
                </button>
                <button type="button" className="text-sm font-bold text-slate-500" onClick={() => { setText(source.text ?? ''); setEditing(false) }}>
                  Annuler
                </button>
              </div>
            </div>
          ) : source.text ? (
            <button type="button" onClick={() => onEditText && setEditing(true)} className="mt-1 line-clamp-3 text-left text-sm font-medium text-slate-600 dark:text-slate-300">
              « {source.text} »
            </button>
          ) : source.kind === 'audio' ? (
            <p className="mt-1 text-xs font-medium text-slate-400">Sans transcription : l’IA écoutera l’enregistrement.</p>
          ) : null)}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Retirer" className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function PendingCard({ item, onDismiss }: { item: PendingUpload; onDismiss: () => void }) {
  const failed = item.stage === 'error'
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
          {failed ? item.error ?? STAGE.error : STAGE[item.stage] ?? 'Envoi…'}
          {!failed && item.stage === 'upload' && typeof item.progress === 'number' && <span className="tabular-nums">{Math.round(item.progress * 100)} %</span>}
        </p>
        {!failed && item.stage === 'upload' && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
            <div className="bg-gradient-primary h-full rounded-full transition-[width]" style={{ width: `${Math.round((item.progress ?? 0) * 100)}%` }} />
          </div>
        )}
      </div>
      {failed && (
        <button type="button" onClick={onDismiss} aria-label="Retirer" className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-900/5">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
