'use client'

import { Copy, History, Languages, Link2, Loader2, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { QrCode } from '@/components/QrCode'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { ErrorState, SkeletonRows, errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useVersions } from '@/hooks/queries'
import { translateInstruction } from '@/lib/ai/assist'
import type { Doc } from '@/lib/gateway/data'
import { locale, useMessages } from '@/lib/i18n'
import { LANGUAGES } from '@/lib/model/catalog'
import { T } from '@/lib/model/repo'
import type { Instruction, InstructionContent, Version } from '@/lib/model/types'
import { copyText, createShareLink, linkUrl } from '@/lib/share'
import { formatDate } from '@/lib/util/cn'

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

export function HistoryDialog({ open, onClose, doc, onRestore }: { open: boolean; onClose: () => void; doc: Doc<Instruction>; onRestore: (v: Version) => Promise<void> }) {
  const t = useMessages().editor.dialogs.history
  const versions = useVersions(doc._id, open)
  const [restoring, setRestoring] = useState<string | null>(null)
  return (
    <Modal open={open} onClose={onClose} title={t.title} size="md">
      {versions.isLoading ? (
        <SkeletonRows count={3} />
      ) : versions.error ? (
        <ErrorState error={versions.error} onRetry={() => versions.refetch()} />
      ) : !versions.data?.length ? (
        <div className="py-8 text-center">
          <History className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-bold text-slate-500">{t.empty}</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {versions.data.map((v) => (
            <li key={v._id} className="glass-card flex items-center gap-3 rounded-2xl p-3">
              <span className="bg-gradient-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white">v{v.json_data.number}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black">{v.json_data.changelog}</span>
                <span className="block text-xs font-bold text-slate-500">
                  {formatDate(v.json_data.createdAt)} · {v.json_data.publishedByName}
                  {v.json_data.approvedByName ? ` · ${t.approvedBy(v.json_data.approvedByName)}` : ''}
                </span>
              </span>
              {v.json_data.number !== doc.json_data.publishedVersion && (
                <Button
                  size="sm"
                  loading={restoring === v._id}
                  icon={<RotateCcw className="h-4 w-4" />}
                  onClick={async () => {
                    setRestoring(v._id)
                    await onRestore(v.json_data)
                    setRestoring(null)
                    onClose()
                  }}
                >
                  {t.restore}
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs font-medium text-slate-400">{t.note}</p>
    </Modal>
  )
}

export function TranslateDialog({ open, onClose, content, onTranslated }: { open: boolean; onClose: () => void; content: InstructionContent; onTranslated: (lang: string, t: NonNullable<InstructionContent['translations']>[string]) => void }) {
  const { ai } = useSession()
  const toast = useToast()
  const t = useMessages().editor.dialogs.translate
  const [lang, setLang] = useState('en')
  const [busy, setBusy] = useState(false)
  const existing = Object.keys(content.translations ?? {})
  return (
    <Modal open={open} onClose={onClose} title={t.title} size="sm">
      <p className="mb-4 text-sm font-medium text-slate-500">{t.intro}</p>
      {!!existing.length && (
        <p className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">
          {t.already(existing.map((l) => LANGUAGES[l]?.label ?? l).join(', '))}
        </p>
      )}
      <Select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t.language}>
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
      <Button
        className="mt-4"
        block
        variant="primary"
        loading={busy}
        icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
        onClick={async () => {
          setBusy(true)
          try {
            const translated = await translateInstruction(ai, content, LANGUAGES[lang]?.label ?? lang)
            onTranslated(lang, translated)
            toast.success(t.added, t.addedDetail(LANGUAGES[lang]?.label ?? lang))
            onClose()
          } catch (e) {
            toast.error(t.failed, errorText(e))
          } finally {
            setBusy(false)
          }
        }}
      >
        {existing.includes(lang) ? t.update : t.translate} <AiCost operation="translate" />
      </Button>
      <p className="mt-3 text-xs font-medium text-slate-400">{t.note}</p>
    </Modal>
  )
}
