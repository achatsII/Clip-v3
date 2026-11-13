'use client'

import { Camera, CheckCircle2, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import type { DataApi } from '@/lib/gateway/data'
import type { FilesApi } from '@/lib/gateway/files'
import { compressImage } from '@/lib/media/image'
import { FEEDBACK_KINDS } from '@/lib/model/catalog'
import { createFeedback } from '@/lib/model/repo'
import type { Feedback, FeedbackKind } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import type { PlayerStrings } from './i18n'

const KIND_ORDER: FeedbackKind[] = ['unclear', 'error', 'danger', 'idea']

/** Signaler en deux touchers : un motif en pictogramme, un mot facultatif, une photo facultative. */
export function FeedbackSheet({
  open,
  onClose,
  t,
  data,
  files,
  base,
  operatorName,
}: {
  open: boolean
  onClose: () => void
  /** Les mots du lecteur, dans la langue choisie au poste. */
  t: PlayerStrings
  data: DataApi
  files: FilesApi | null
  base: Omit<Feedback, 'createdAt' | 'status' | 'kind' | 'comment' | 'photoUrl' | 'authorName'>
  /** La personne identifiée au poste : son nom signe le retour. */
  operatorName?: string
}) {
  const [kind, setKind] = useState<FeedbackKind | null>(null)
  const [comment, setComment] = useState('')
  const [name, setName] = useState(() => {
    if (operatorName) return operatorName
    try {
      return localStorage.getItem('clip_pref_operator_name') ?? ''
    } catch {
      return ''
    }
  })
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  function close() {
    setKind(null)
    setComment('')
    setPhoto(null)
    setSent(false)
    setError(null)
    onClose()
  }

  async function send() {
    if (!kind) return
    setBusy(true)
    setError(null)
    try {
      let photoUrl: string | null = null
      if (photo && files) {
        const { blob } = await compressImage(photo)
        photoUrl = (await files.upload(blob, photo.name, 'feedback')).url
      }
      await createFeedback(data, { ...base, kind, comment: comment.trim() || undefined, photoUrl, authorName: name.trim() || null })
      try {
        if (name.trim()) localStorage.setItem('clip_pref_operator_name', name.trim())
      } catch {
        /* préférence facultative */
      }
      setSent(true)
      setTimeout(close, 2200)
    } catch {
      setError(t.feedbackFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title={sent ? undefined : t.feedbackTitle} size="md">
      {sent ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="animate-pop-in mb-3 h-16 w-16 text-emerald-500" />
          <p className="text-xl font-black">{t.feedbackThanks}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {KIND_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={cn('btn-press flex min-h-24 flex-col items-center justify-center gap-1 rounded-[24px] bg-gradient-to-br p-3 text-white', FEEDBACK_KINDS[k].className, kind === k ? 'ring-4 ring-slate-900/70 dark:ring-white' : kind ? 'opacity-50' : '')}
              >
                <span className="text-3xl" aria-hidden>
                  {k === 'unclear' ? '🤔' : k === 'error' ? '❌' : k === 'danger' ? '⚠️' : '💡'}
                </span>
                <span className="text-base font-black">{t.kinds[k]}</span>
              </button>
            ))}
          </div>
          {kind && (
            <div className="animate-slide-up space-y-3">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.feedbackComment} rows={3} />
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.feedbackName} className="flex-1" />
                {files && (
                  <Button onClick={() => input.current?.click()} icon={<Camera className="h-4 w-4" />}>
                    {photo ? '✓' : t.feedbackPhoto}
                  </Button>
                )}
                <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              </div>
              {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
              <Button variant="primary" size="lg" block loading={busy} icon={busy ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined} onClick={send}>
                {t.feedbackSend}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
