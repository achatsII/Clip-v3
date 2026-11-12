'use client'

import { Bot, Copy, History, Languages, Link2, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { QrCode } from '@/components/QrCode'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Select, Switch } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { ErrorState, SkeletonRows, errorText } from '@/components/ui/States'
import { Badge } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { useCheckpoints, useVersions } from '@/hooks/queries'
import { imageCandidates, translateContent, type TranslateProgress } from '@/lib/ai/translate'
import type { Doc } from '@/lib/gateway/data'
import { locale, useMessages, type Messages } from '@/lib/i18n'
import { LANGUAGES } from '@/lib/model/catalog'
import { contentHash, getCheckpoint, type CheckpointMeta } from '@/lib/model/checkpoints'
import { T } from '@/lib/model/repo'
import type { DraftCheckpoint, Instruction, InstructionContent, Version } from '@/lib/model/types'
import { copyText, createShareLink, linkUrl } from '@/lib/share'
import { cn, formatDateTime } from '@/lib/util/cn'

export function ShareDialog({ open, onClose, doc, onLinked }: { open: boolean; onClose: () => void; doc: Doc<Instruction>; onLinked: () => void }) {
  const { data } = useSession()
  const toast = useToast()
  const t = useMessages()
  const [busy, setBusy] = useState(false)
  const linkId = doc.json_data.shareLinkId
  const published = !!doc.json_data.publishedVersion
  const url = linkId ? linkUrl('instruction', linkId) : ''

  async function create() {
    setBusy(true)
    try {
      const link = await createShareLink('instruction', doc._id)
      await data.patch(T.instruction, doc._id, { shareLinkId: link.id })
      onLinked()
      toast.success(t.editor.dialogs.share.created, t.editor.dialogs.share.createdDetail)
    } catch (e) {
      toast.error(t.editor.dialogs.share.createFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t.editor.dialogs.share.title} size="md">
      {!published ? (
        <p className="font-medium text-slate-600 dark:text-slate-300">{t.editor.dialogs.share.publishFirst}</p>
      ) : linkId ? (
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <QrCode value={url} size={180} />
          <div className="min-w-0 flex-1">
            <p className="font-black">{t.editor.dialogs.share.direct}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">{t.editor.dialogs.share.directDetail}</p>
            <p className="glass-input mt-3 truncate rounded-xl px-3 py-2 text-xs font-bold">{url}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button
                size="sm"
                variant="primary"
                icon={<Copy className="h-4 w-4" />}
                onClick={async () => {
                  if (await copyText(url)) toast.success(t.editor.dialogs.share.copied)
                  else toast.error(t.editor.dialogs.share.copyFailed, t.editor.dialogs.share.copyFailedDetail)
                }}
              >
                {t.editor.dialogs.share.copy}
              </Button>
              <a href={url} target="_blank" rel="noreferrer" className="btn-press glass-card inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black">
                {t.common.open}
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Link2 className="mx-auto mb-3 h-10 w-10 text-[var(--primary)]" />
          <p className="font-medium text-slate-600 dark:text-slate-300">{t.editor.dialogs.share.intro}</p>
          <Button className="mt-5" variant="primary" loading={busy} onClick={create} icon={<Link2 className="h-4 w-4" />}>
            {t.editor.dialogs.share.create}
          </Button>
        </div>
      )}
    </Modal>
  )
}

/** Pourquoi ce point de retour existe, dans les mots de l'historique. */
function reasonLabel(t: Messages['editor']['dialogs']['history'], c: CheckpointMeta): string {
  if (c.reason === 'agent') return t.reasons.agent(c.note)
  if (c.reason === 'regenerate') return t.reasons.regenerate
  if (c.reason === 'generated') return t.reasons.generated
  if (c.reason === 'restore') {
    const v = c.note?.match(/^v(\d+)$/)
    if (v) return t.reasons.restoreVersion(Number(v[1]))
    if (c.note && !Number.isNaN(Date.parse(c.note))) return t.reasons.restoreState(formatDateTime(c.note))
    return t.reasons.restore
  }
  return t.reasons.auto
}

type HistoryItem = { kind: 'version'; at: string; doc: Doc<Version> } | { kind: 'checkpoint'; at: string; doc: Doc<CheckpointMeta> }

/**
 * L'historique d'une instruction, du plus récent au plus ancien : les versions publiées et les points
 * de retour du brouillon (modifications enregistrées, pas encore publiées). Revenir remet ce contenu
 * dans le brouillon, sans rien publier ; l'éditeur garde un point de retour de l'état d'avant.
 */
export function HistoryDialog({
  open,
  onClose,
  doc,
  current,
  dirty,
  withCheckpoints,
  onRestore,
  onRestoreCheckpoint,
}: {
  open: boolean
  onClose: () => void
  doc: Doc<Instruction>
  /** Le brouillon en ce moment : le point de retour qui lui est identique se dit « brouillon actuel ». */
  current?: InstructionContent
  /** Le brouillon diffère de la version publiée : on peut revenir à celle-ci. */
  dirty?: boolean
  /** Les points de retour du brouillon (feature toggle `draftHistory`). */
  withCheckpoints?: boolean
  onRestore: (v: Version) => Promise<void>
  onRestoreCheckpoint?: (c: DraftCheckpoint) => Promise<void>
}) {
  const t = useMessages().editor.dialogs.history
  const tp = useMessages().editor.page
  const { data } = useSession()
  const toast = useToast()
  const versions = useVersions(doc._id, open)
  const checkpoints = useCheckpoints(doc._id, open && !!withCheckpoints)
  const [restoring, setRestoring] = useState<string | null>(null)
  const currentHash = useMemo(() => (open && withCheckpoints && current ? contentHash(current) : null), [open, withCheckpoints, current])
  const items = useMemo<HistoryItem[]>(
    () =>
      [
        ...(versions.data ?? []).map((v) => ({ kind: 'version' as const, at: v.json_data.createdAt, doc: v })),
        ...(withCheckpoints ? (checkpoints.data ?? []) : []).map((c) => ({ kind: 'checkpoint' as const, at: c.json_data.at, doc: c })),
      ].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '')),
    [versions.data, checkpoints.data, withCheckpoints],
  )
  const loading = (versions.isLoading || (withCheckpoints && checkpoints.isLoading)) && !items.length

  async function run(id: string, action: () => Promise<void>) {
    setRestoring(id)
    try {
      await action()
      onClose()
    } catch (e) {
      toast.error(tp.toasts.restoreFailed, errorText(e))
    } finally {
      setRestoring(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t.title} size="md">
      {versions.error && <ErrorState className="mb-3 py-6" title={t.versionsFailed} error={versions.error} onRetry={() => versions.refetch()} />}
      {withCheckpoints && checkpoints.error && <ErrorState className="mb-3 py-6" title={t.checkpointsFailed} error={checkpoints.error} onRetry={() => checkpoints.refetch()} />}
      {loading ? (
        <SkeletonRows count={3} />
      ) : !items.length ? (
        !versions.error && !(withCheckpoints && checkpoints.error) && (
          <div className="py-8 text-center">
            <History className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-bold text-slate-500">{withCheckpoints ? t.emptyAll : t.empty}</p>
          </div>
        )
      ) : (
        <ol className="space-y-2">
          {items.map((item) => {
            if (item.kind === 'version') {
              const v = item.doc
              const live = v.json_data.number === doc.json_data.publishedVersion
              return (
                <li key={v._id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
                  <span className="bg-gradient-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white">v{v.json_data.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5 text-sm font-black">
                      {v.json_data.changelog} {live && <Badge tone="success">{t.atStations}</Badge>}
                    </span>
                    <span className="block text-xs font-bold text-slate-500">
                      {formatDateTime(v.json_data.createdAt)} · {v.json_data.publishedByName}
                      {v.json_data.approvedByName ? ` · ${t.approvedBy(v.json_data.approvedByName)}` : ''}
                    </span>
                  </span>
                  {(!live || dirty) && (
                    <Button size="sm" loading={restoring === v._id} disabled={!!restoring} aria-label={t.restoreLabel(`v${v.json_data.number}`)} icon={<RotateCcw className="h-4 w-4" />} onClick={() => void run(v._id, () => onRestore(v.json_data))}>
                      {t.restore}
                    </Button>
                  )}
                </li>
              )
            }
            const c = item.doc
            const label = reasonLabel(t, c.json_data)
            const isCurrent = !!currentHash && c.json_data.hash === currentHash
            const reason = c.json_data.reason
            return (
              <li key={c._id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', reason === 'generated' ? 'bg-gradient-accent text-white' : 'bg-slate-900/[0.06] text-slate-500 dark:bg-white/10 dark:text-slate-300')}>
                  {reason === 'generated' ? <Sparkles className="h-5 w-5" /> : reason === 'agent' ? <Bot className="h-5 w-5" /> : <History className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{label}</span>
                  <span className="block text-xs font-bold text-slate-500">
                    {formatDateTime(c.json_data.at)} · {c.json_data.byName} · {t.steps(c.json_data.stepCount)}
                  </span>
                </span>
                {isCurrent ? (
                  <Badge>{t.current}</Badge>
                ) : (
                  onRestoreCheckpoint && (
                    <Button
                      size="sm"
                      loading={restoring === c._id}
                      disabled={!!restoring}
                      aria-label={t.restoreLabel(label)}
                      icon={<RotateCcw className="h-4 w-4" />}
                      onClick={() =>
                        void run(c._id, async () => {
                          const full = await getCheckpoint(data, c._id)
                          if (!full) throw new Error(tp.toasts.restoreFailed)
                          await onRestoreCheckpoint(full.json_data)
                        })
                      }
                    >
                      {t.restore}
                    </Button>
                  )
                )}
              </li>
            )
          })}
        </ol>
      )}
      <p className="mt-4 text-xs font-medium text-slate-400">{t.note}</p>
      {withCheckpoints && <p className="mt-1 text-xs font-medium text-slate-400">{t.kept}</p>}
    </Modal>
  )
}

export function TranslateDialog({ open, onClose, content, onTranslated }: { open: boolean; onClose: () => void; content: InstructionContent; onTranslated: (lang: string, t: NonNullable<InstructionContent['translations']>[string]) => void }) {
  const { ai } = useSession()
  const toast = useToast()
  const t = useMessages().editor.dialogs.translate
  const [lang, setLang] = useState('en')
  const [images, setImages] = useState(false)
  const [progress, setProgress] = useState<TranslateProgress | null>(null)
  const existing = Object.keys(content.translations ?? {})
  // Les images qu'on peut refaire avec leur texte traduit (pas les illustrations de l'IA, sans texte).
  const imageCount = useMemo(() => imageCandidates(content).length, [content])
  const busy = !!progress
  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={t.title} size="sm">
      <p className="mb-4 text-sm font-medium text-slate-500">{t.intro}</p>
      {!!existing.length && (
        <p className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">
          {t.already(existing.map((l) => LANGUAGES[l]?.label ?? l).join(', '))}
        </p>
      )}
      <Select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t.language} disabled={busy}>
        {/* Les plus demandées dans les usines d'abord, puis toutes les autres. */}
        {([true, false] as const).map((common) => (
          <optgroup key={String(common)} label={common ? t.mostRequested : t.otherLanguages}>
            {Object.entries(LANGUAGES)
              .filter(([k, v]) => k !== content.language && !!v.common === common)
              .sort(([, a], [, b]) => (common ? 0 : a.label.localeCompare(b.label, locale())))
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} — {v.native}
                  {existing.includes(k) ? ' ✓' : ''}
                </option>
              ))}
          </optgroup>
        ))}
      </Select>
      {imageCount > 0 && (
        <div className="mt-3">
          <Switch
            checked={images}
            onChange={setImages}
            disabled={busy}
            label={t.images.label}
            description={
              <>
                {t.images.hint(imageCount)} <AiCost operation="translate_image" />
              </>
            }
          />
        </div>
      )}
      <Button
        className="mt-4"
        block
        variant="primary"
        loading={busy}
        icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
        onClick={async () => {
          setProgress({ phase: 'text', done: 0, total: 1 })
          const name = LANGUAGES[lang]?.label ?? lang
          try {
            const r = await translateContent(ai, content, { language: lang, images, onProgress: setProgress })
            onTranslated(lang, r.translation)
            const extra = [r.images.redone ? t.images.redone(r.images.redone) : '', r.images.failed ? t.images.failed(r.images.failed) : ''].filter(Boolean).join(' ')
            toast.success(t.added, [t.addedDetail(name), extra].filter(Boolean).join(' '))
            onClose()
          } catch (e) {
            toast.error(t.failed, errorText(e))
          } finally {
            setProgress(null)
          }
        }}
      >
        {busy && progress ? (progress.phase === 'text' ? t.progress.text : t.progress.images(progress.done, progress.total)) : existing.includes(lang) ? t.update : t.translate}
        {!busy && <AiCost operation="translate" />}
      </Button>
      <p className="mt-3 text-xs font-medium text-slate-400">{t.note}</p>
    </Modal>
  )
}
