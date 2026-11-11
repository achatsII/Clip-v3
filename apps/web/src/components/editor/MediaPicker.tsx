'use client'

import { ArrowLeft, FileText, Loader2, Upload, Video } from 'lucide-react'
import { useRef, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { ACCEPTED_FILES, ingestFile } from '@/lib/media/ingest'
import { useMessages } from '@/lib/i18n'
import type { Source, StepMedia } from '@/lib/model/types'
import { formatDuration } from '@/lib/util/cn'
import { VideoTrimmer } from './VideoTrimmer'

/** Choisir le média d'une étape parmi les sources, ou en ajouter un nouveau. */
export function MediaPicker({ open, onClose, sources, onPick, onSourceAdded, current }: { open: boolean; onClose: () => void; sources: Source[]; onPick: (m: StepMedia) => void; onSourceAdded: (s: Source) => void; current?: StepMedia }) {
  const { files } = useSession()
  const toast = useToast()
  const t = useMessages()
  const [video, setVideo] = useState<{ source: Source; start: number; end: number } | null>(null)
  const [doc, setDoc] = useState<{ source: Source; page: number } | null>(null)
  const [uploading, setUploading] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const photos = sources.filter((s) => s.kind === 'photo' && s.url)
  const videos = sources.filter((s) => s.kind === 'video' && s.url)
  const docs = sources.filter((s) => s.kind === 'document' && s.url)

  function close() {
    setVideo(null)
    setDoc(null)
    onClose()
  }

  async function upload(file: File) {
    setUploading(true)
    try {
      const s = await ingestFile(file, files)
      onSourceAdded(s)
      if (s.kind === 'photo') {
        onPick({ kind: 'image', url: s.url!, sourceId: s.id })
        close()
      } else if (s.kind === 'video') setVideo({ source: s, start: 0, end: Math.min(10, s.durationSec ?? 10) })
      else if (s.kind === 'document') setDoc({ source: s, page: 1 })
      else toast.info(t.editorTools.mediaPicker.addedToNotes, t.editorTools.mediaPicker.addedToNotesHint)
    } catch (e) {
      toast.error(t.editorTools.mediaPicker.uploadFailed, errorText(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open={open} onClose={close} size="lg" title={video ? t.editorTools.mediaPicker.chooseClip : doc ? t.editorTools.mediaPicker.choosePage : t.editorTools.mediaPicker.title}>
      {video ? (
        <div>
          <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm font-black text-slate-500" onClick={() => setVideo(null)}>
            <ArrowLeft className="h-4 w-4" /> {t.editorTools.mediaPicker.otherMedia}
          </button>
          <VideoTrimmer url={video.source.url!} start={video.start} end={video.end} duration={video.source.durationSec} onChange={(start, end) => setVideo({ ...video, start, end })} />
          <Button
            variant="primary"
            block
            className="mt-4"
            onClick={() => {
              onPick({ kind: 'video', url: video.source.url!, sourceId: video.source.id, start: Math.round(video.start * 10) / 10, end: Math.round(video.end * 10) / 10 })
              close()
            }}
          >
            {t.editorTools.mediaPicker.useClip}
          </Button>
        </div>
      ) : doc ? (
        <div>
          <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm font-black text-slate-500" onClick={() => setDoc(null)}>
            <ArrowLeft className="h-4 w-4" /> {t.editorTools.mediaPicker.otherMedia}
          </button>
          <p className="font-black">{doc.source.originalName ?? doc.source.name}</p>
          <div className="mt-3 max-w-40">
            <Label htmlFor="page">{t.editorTools.mediaPicker.page}</Label>
            <Input id="page" type="number" inputMode="numeric" min={1} max={doc.source.pageCount ?? 999} value={doc.page} onChange={(e) => setDoc({ ...doc, page: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
          <Button
            variant="primary"
            block
            className="mt-4"
            onClick={() => {
              onPick({ kind: 'document', url: doc.source.url!, sourceId: doc.source.id, page: doc.page, name: doc.source.originalName ?? doc.source.name })
              close()
            }}
          >
            {t.editorTools.mediaPicker.usePage(doc.page)}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {photos.length > 0 && (
            <section>
              <p className="label-caps mb-2 text-slate-500">{t.editorTools.mediaPicker.photos}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onPick({ kind: 'image', url: p.url!, sourceId: p.id })
                      close()
                    }}
                    className="btn-press aspect-square overflow-hidden rounded-2xl ring-[var(--primary)] hover:ring-4"
                  >
                    <img src={p.thumbnailUrl ?? p.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </section>
          )}
          {videos.length > 0 && (
            <section>
              <p className="label-caps mb-2 text-slate-500">{t.editorTools.mediaPicker.videos}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {videos.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      const cur = current?.kind === 'video' && current.sourceId === v.id ? current : null
                      setVideo({ source: v, start: cur?.start ?? 0, end: cur?.end ?? Math.min(10, v.durationSec ?? 10) })
                    }}
                    className="glass-card btn-press flex items-center gap-3 rounded-2xl p-2 text-left"
                  >
                    {v.thumbnailUrl ? <img src={v.thumbnailUrl} alt="" className="h-14 w-20 rounded-xl object-cover" /> : <span className="flex h-14 w-20 items-center justify-center rounded-xl bg-slate-900 text-white"><Video className="h-6 w-6" /></span>}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{v.name}</span>
                      <span className="text-xs font-bold text-slate-500">{formatDuration(v.durationSec)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {docs.length > 0 && (
            <section>
              <p className="label-caps mb-2 text-slate-500">{t.editorTools.mediaPicker.documents}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {docs.map((d) => (
                  <button key={d.id} type="button" onClick={() => setDoc({ source: d, page: 1 })} className="glass-card btn-press flex items-center gap-3 rounded-2xl p-3 text-left">
                    <FileText className="h-6 w-6 text-slate-500" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{d.originalName ?? d.name}</span>
                      {d.pageCount && <span className="text-xs font-bold text-slate-500">{t.editorTools.mediaPicker.pages(d.pageCount)}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <section>
            <Button block onClick={() => input.current?.click()} icon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} disabled={uploading}>
              {uploading ? t.editorTools.mediaPicker.uploading : t.editorTools.mediaPicker.addNew}
            </Button>
            <input
              ref={input}
              type="file"
              accept={ACCEPTED_FILES}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void upload(f)
                e.target.value = ''
              }}
            />
          </section>
        </div>
      )}
    </Modal>
  )
}
