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
import { LANGUAGES } from '@/lib/model/catalog'
import { T } from '@/lib/model/repo'
import type { Instruction, InstructionContent, Version } from '@/lib/model/types'
import { copyText, createShareLink, linkUrl } from '@/lib/share'
import { formatDate } from '@/lib/util/cn'

export function ShareDialog({ open, onClose, doc, onLinked }: { open: boolean; onClose: () => void; doc: Doc<Instruction>; onLinked: () => void }) {
  const { data } = useSession()
  const toast = useToast()
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
      toast.success('Lien créé', 'Toute personne qui a le lien voit la version publiée, sans compte.')
    } catch (e) {
      toast.error('Le lien n’a pas pu être créé', errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Partager l’instruction" size="md">
      {!published ? (
        <p className="font-medium text-slate-600 dark:text-slate-300">Publiez d’abord l’instruction : le lien et le code QR montrent toujours la version publiée, jamais le brouillon.</p>
      ) : linkId ? (
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <QrCode value={url} size={180} />
          <div className="min-w-0 flex-1">
            <p className="font-black">Lien direct, sans compte</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Les opérateurs voient la version publiée et peuvent signaler ce qui n’est pas clair. Une nouvelle version publiée remplace l’ancienne au même lien.</p>
            <p className="glass-input mt-3 truncate rounded-xl px-3 py-2 text-xs font-bold">{url}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button
                size="sm"
                variant="primary"
                icon={<Copy className="h-4 w-4" />}
                onClick={async () => {
                  if (await copyText(url)) toast.success('Lien copié')
                  else toast.error('Copie impossible', 'Sélectionnez le lien et copiez-le à la main.')
                }}
              >
                Copier le lien
              </Button>
              <a href={url} target="_blank" rel="noreferrer" className="btn-press glass-card inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black">
                Ouvrir
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Link2 className="mx-auto mb-3 h-10 w-10 text-[var(--primary)]" />
          <p className="font-medium text-slate-600 dark:text-slate-300">Créez un lien et un code QR pour cette instruction. Pour une tablette de poste, utilisez plutôt le lien du poste (page Postes).</p>
          <Button className="mt-5" variant="primary" loading={busy} onClick={create} icon={<Link2 className="h-4 w-4" />}>
            Créer le lien et le code QR
          </Button>
        </div>
      )}
    </Modal>
  )
}

export function HistoryDialog({ open, onClose, doc, onRestore }: { open: boolean; onClose: () => void; doc: Doc<Instruction>; onRestore: (v: Version) => Promise<void> }) {
  const versions = useVersions(doc._id, open)
  const [restoring, setRestoring] = useState<string | null>(null)
  return (
    <Modal open={open} onClose={onClose} title="Historique des versions" size="md">
      {versions.isLoading ? (
        <SkeletonRows count={3} />
      ) : versions.error ? (
        <ErrorState error={versions.error} onRetry={() => versions.refetch()} />
      ) : !versions.data?.length ? (
        <div className="py-8 text-center">
          <History className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-bold text-slate-500">Aucune version publiée pour l’instant. Chaque publication crée une version que vous pourrez retrouver ici.</p>
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
                  {v.json_data.approvedByName ? ` · approuvée par ${v.json_data.approvedByName}` : ''}
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
                  Restaurer
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs font-medium text-slate-400">Restaurer remet le contenu dans le brouillon ; rien n’est publié sans votre geste.</p>
    </Modal>
  )
}

export function TranslateDialog({ open, onClose, content, onTranslated }: { open: boolean; onClose: () => void; content: InstructionContent; onTranslated: (lang: string, t: NonNullable<InstructionContent['translations']>[string]) => void }) {
  const { ai } = useSession()
  const toast = useToast()
  const [lang, setLang] = useState('en')
  const [busy, setBusy] = useState(false)
  const existing = Object.keys(content.translations ?? {})
  return (
    <Modal open={open} onClose={onClose} title="Traduire pour les opérateurs" size="sm">
      <p className="mb-4 text-sm font-medium text-slate-500">Les opérateurs choisissent leur langue dans le lecteur. Les médias restent les mêmes.</p>
      {!!existing.length && (
        <p className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">
          Déjà traduite : {existing.map((l) => LANGUAGES[l]?.label ?? l).join(', ')}
        </p>
      )}
      <Select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Langue">
        {Object.entries(LANGUAGES)
          .filter(([k]) => k !== content.language)
          .map(([k, v]) => (
            <option key={k} value={k}>
              {v.label} — {v.native}
            </option>
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
            const t = await translateInstruction(ai, content, LANGUAGES[lang]?.label ?? lang)
            onTranslated(lang, t)
            toast.success('Traduction ajoutée', `${LANGUAGES[lang]?.label} sera proposée dans le lecteur à la prochaine publication.`)
            onClose()
          } catch (e) {
            toast.error('La traduction a échoué', errorText(e))
          } finally {
            setBusy(false)
          }
        }}
      >
        {existing.includes(lang) ? 'Mettre à jour la traduction' : 'Traduire'} <AiCost operation="translate" />
      </Button>
      <p className="mt-3 text-xs font-medium text-slate-400">Retraduisez après une modification importante des étapes.</p>
    </Modal>
  )
}
