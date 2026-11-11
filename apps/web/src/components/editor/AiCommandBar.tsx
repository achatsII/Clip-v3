'use client'

import { ArrowUp, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { DictateButton } from '@/components/capture/DictateButton'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { editInstruction } from '@/lib/ai/assist'
import { diffSteps, removedSteps } from '@/lib/model/diff'
import type { InstructionContent } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

const EXAMPLES = ['Ajoute une étape de vérification à la fin', 'Commence par une étape de sécurité', 'Rends tout plus court', 'Ajoute les gants anticoupure partout où on manipule la lame']

/** « Demandez une modification » : l'IA change toute l'instruction, on voit avant d'appliquer. */
export function AiCommandBar({ content, onApply }: { content: InstructionContent; onApply: (c: InstructionContent) => void }) {
  const { ai, org } = useSession()
  const toast = useToast()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState(false)
  // Sur téléphone, la barre se replie en un bouton : l'écran reste à l'étape qu'on modifie.
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (expanded) inputRef.current?.focus()
  }, [expanded])
  const [proposal, setProposal] = useState<{ content: InstructionContent; explanation: string } | null>(null)

  async function send(request = text) {
    if (!request.trim()) return
    setBusy(true)
    try {
      const r = await editInstruction(ai, org.json_data, content, request.trim())
      setProposal(r)
    } catch (e) {
      toast.error('L’IA n’a pas pu faire cette modification', errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const changes = proposal ? diffSteps(content, proposal.content) : {}
  const removed = proposal ? removedSteps(content, proposal.content) : []

  return (
    <>
      {!expanded && (
        <div className="flex justify-end lg:hidden">
          <button type="button" onClick={() => setExpanded(true)} className="glass-float btn-press pointer-events-auto flex h-12 items-center gap-2 rounded-full px-4 text-sm font-black text-[var(--primary-strong)] dark:text-sky-300">
            <Sparkles className="h-5 w-5" /> Modifier avec l’IA
          </button>
        </div>
      )}
      <div
        // Au téléphone, la barre ouverte a son propre fond : le texte de l'instruction ne se mêle pas aux suggestions.
        className={cn('pointer-events-auto', !expanded && 'max-lg:hidden', expanded && 'max-lg:rounded-[32px] max-lg:bg-white/90 max-lg:p-2 max-lg:shadow-[0_12px_40px_rgba(15,23,42,0.18)] dark:max-lg:bg-slate-900/90')}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
          setFocused(false)
          if (!text.trim() && !busy) setExpanded(false)
        }}
      >
      <form
        className="glass-float flex items-center gap-2 rounded-full p-2 pl-4 transition focus-within:ring-4 focus-within:ring-[rgba(var(--primary-rgb),0.18)]"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <Sparkles className="h-5 w-5 shrink-0 text-[var(--primary)]" />
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Demandez une modification à l’IA…" className="h-11 min-w-0 flex-1 bg-transparent text-[15px] font-bold placeholder:font-medium placeholder:text-slate-400 focus:outline-none" aria-label="Demande à l’IA" />
        <DictateButton onText={(t) => setText((c) => (c ? `${c} ${t}` : t))} />
        <Button type="submit" variant="primary" size="md" loading={busy} disabled={!text.trim()} className="h-11 w-11 !px-0 sm:w-auto sm:!px-5" aria-label="Envoyer">
          <ArrowUp className="h-5 w-5 sm:hidden" />
          <span className="hidden sm:inline">Modifier</span>
        </Button>
      </form>
      {focused && !text && !busy && (
        <div className="no-scrollbar animate-slide-up mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => setText(ex)} className="glass-float btn-press shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              {ex}
            </button>
          ))}
        </div>
      )}
      </div>
      <Modal
        open={!!proposal}
        onClose={() => setProposal(null)}
        size="lg"
        title="Ce que l’IA propose"
        footer={
          <>
            <Button onClick={() => setProposal(null)}>Garder la version actuelle</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (proposal) onApply(proposal.content)
                setProposal(null)
                setText('')
                toast.success('Modification appliquée', 'Vous pouvez encore ajuster chaque étape.')
              }}
            >
              Appliquer
            </Button>
          </>
        }
      >
        {proposal && (
          <div>
            {proposal.explanation && <p className="mb-4 rounded-2xl bg-primary-soft p-4 font-bold text-slate-700 dark:text-slate-200">{proposal.explanation}</p>}
            <ol className="space-y-2">
              {proposal.content.steps.map((s, i) => (
                <li key={s.id} className="flex gap-3 rounded-2xl bg-slate-900/[0.03] p-3 dark:bg-white/5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white tabular-nums dark:bg-white dark:text-slate-900">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-black">
                      {s.title}{' '}
                      {changes[s.id] === 'added' && <span className="ml-1 rounded-lg bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 uppercase">Nouvelle</span>}
                      {changes[s.id] === 'modified' && <span className="ml-1 rounded-lg bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 uppercase">Modifiée</span>}
                    </span>
                    <span className="block text-sm font-medium text-slate-600 dark:text-slate-300">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            {removed.length > 0 && <p className="mt-3 text-sm font-bold text-rose-600">Retirée{removed.length > 1 ? 's' : ''} : {removed.map((s) => s.title).join(' ; ')}</p>}
            <p className="mt-3 text-xs font-bold text-slate-400">Coût : <AiCost operation="instruction_edit" /></p>
          </div>
        )}
      </Modal>
    </>
  )
}
