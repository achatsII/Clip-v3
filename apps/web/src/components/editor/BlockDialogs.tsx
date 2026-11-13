'use client'

import { useQuery } from '@tanstack/react-query'
import { Blocks, Check, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, errorText, ErrorState, SkeletonRows } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useMessages } from '@/lib/i18n'
import { copyBlock, insertBlock, listBlocks, makeBlock, publishedBlock } from '@/lib/model/blocks'
import type { Doc } from '@/lib/gateway/data'
import type { Instruction, InstructionContent } from '@/lib/model/types'
import { useSettledValue } from '@/lib/util/settled'
import { cn } from '@/lib/util/cn'

/**
 * « Faire un bloc commun » : on coche les étapes, on nomme le bloc. Il est créé et publié (version
 * 1), et ses étapes prennent leur place dans l'instruction, verrouillées.
 */
export function MakeBlockDialog({ open, onClose, content, current, onMade }: { open: boolean; onClose: () => void; content: InstructionContent; current: string | null; onMade: (next: InstructionContent, block: Doc<Instruction>) => void }) {
  const t = useMessages().blocks
  const words = useMessages()
  const { data, org, profile, displayName } = useSession()
  const toast = useToast()
  const free = content.steps.filter((s) => !s.fromBlock)
  const [picked, setPicked] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  // À l'ouverture : l'étape affichée est cochée, et le bloc prend le nom de sa section ou de son titre.
  useEffect(() => {
    if (!open) return
    const s = free.find((x) => x.id === current) ?? free[0]
    setPicked(s ? [s.id] : [])
    setTitle(s?.section || s?.title || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function make() {
    setBusy(true)
    try {
      const r = await makeBlock(data, org.json_data, { id: profile.userId, name: displayName }, content, picked, title.trim())
      toast.success(t.made(title.trim()), t.madeHint)
      onMade(r.content, r.block)
    } catch (e) {
      toast.error(t.makeFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.make}
      footer={
        <>
          <Button onClick={onClose}>{words.common.cancel}</Button>
          <Button variant="primary" disabled={!picked.length || !title.trim()} loading={busy} onClick={() => void make()} icon={<Blocks className="h-4 w-4" />}>
            {t.makeConfirm}
          </Button>
        </>
      }
    >
      <p className="mb-4 font-medium text-slate-600 dark:text-slate-300">{t.makeIntro}</p>
      <Label htmlFor="block-name">{t.name}</Label>
      <Input id="block-name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.namePlaceholder} className="mb-4 h-12" />
      <Label>{t.pick}</Label>
      <div className="grid gap-1.5">
        {content.steps.map((s, i) => {
          const on = picked.includes(s.id)
          const locked = !!s.fromBlock
          return (
            <button
              key={s.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={locked}
              onClick={() => setPicked(on ? picked.filter((x) => x !== s.id) : content.steps.filter((x) => x.id === s.id || picked.includes(x.id)).map((x) => x.id))}
              className={cn('btn-press flex min-h-12 items-center gap-3 rounded-2xl px-3 text-left', on ? 'bg-primary-soft' : 'glass-card', locked && 'opacity-50')}
            >
              <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2', on ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-slate-300 dark:border-slate-600')}>{on && <Check className="h-4 w-4" strokeWidth={3} />}</span>
              <span className="w-6 shrink-0 text-sm font-black text-slate-400 tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-black">{s.title}</span>
              {locked && <span className="shrink-0 rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-black text-white uppercase">{t.thumb}</span>}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

/** « Insérer un bloc commun » : chercher un bloc publié, le toucher ; il s'insère après l'étape affichée. */
export function InsertBlockDialog({ open, onClose, content, after, onInserted }: { open: boolean; onClose: () => void; content: InstructionContent; after: number; onInserted: (next: InstructionContent, title: string) => void }) {
  const t = useMessages().blocks
  const { data } = useSession()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const q = useSettledValue(query.trim(), 250)
  const blocks = useQuery({ queryKey: ['instructions', 'blocks', q], queryFn: () => listBlocks(data, q), enabled: open })
  const [busy, setBusy] = useState<string | null>(null)
  const present = new Set(content.steps.map((s) => s.fromBlock?.id).filter(Boolean))

  async function insert(b: Doc<Instruction>) {
    setBusy(b._id)
    try {
      const pub = await publishedBlock(data, b._id)
      const next = pub && insertBlock(content, after, copyBlock(pub, pub.steps))
      if (!next) throw new Error(t.already)
      onInserted(next, pub.title)
    } catch (e) {
      toast.error(t.insertFailed, errorText(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t.insert}>
      <div className="glass-input mb-3 flex items-center gap-2 rounded-2xl px-3">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="h-12 min-w-0 flex-1 bg-transparent text-[15px] font-bold focus:outline-none" />
      </div>
      {blocks.isLoading ? (
        <SkeletonRows count={3} />
      ) : blocks.error ? (
        <ErrorState error={blocks.error} onRetry={() => blocks.refetch()} />
      ) : !blocks.data?.length ? (
        <EmptyState icon={<Blocks className="h-7 w-7" />} title={t.empty} description={t.emptyHint} />
      ) : (
        <div className="grid gap-1.5">
          {blocks.data.map((b) => {
            const already = present.has(b._id)
            return (
              <button key={b._id} type="button" disabled={already || !!busy} onClick={() => void insert(b)} className={cn('btn-press glass-card flex min-h-14 items-center gap-3 rounded-2xl px-3 text-left', already && 'opacity-60')}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                  <Blocks className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-black">{b.json_data.title}</span>
                  <span className="block truncate text-xs font-bold text-slate-500">{already ? t.already : `${t.steps(b.json_data.stepCount ?? 0)} · v${b.json_data.publishedVersion}`}</span>
                </span>
                {busy === b._id && <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />}
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
