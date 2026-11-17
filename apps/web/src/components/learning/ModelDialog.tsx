'use client'

/**
 * « Prendre comme modèle » (toggle `learnFromEdits`) : une instruction réussie, ce qui la rend bonne
 * (quelques touches, une phrase si on veut), puis ce que l'IA en retient. On garde les règles qu'on
 * veut ; l'instruction reste comme exemple de style pour les prochaines générations — pour soi, ou
 * pour toute l'usine (droit de régler).
 */
import { Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Segmented, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useLearning } from '@/hooks/useLearning'
import { LockBadge } from '@/components/billing/Billing'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { rulesFromModel } from '@/lib/ai/learn'
import { getLang, useMessages } from '@/lib/i18n'
import { exampleOf } from '@/lib/learning/store'
import type { InstructionContent } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

const QUALITIES = ['short', 'oneAction', 'keyPoints', 'warnings', 'tone', 'sections'] as const
type Quality = (typeof QUALITIES)[number]

export function ModelDialog({ open, onClose, instructionId, content }: { open: boolean; onClose: () => void; instructionId: string; content: Pick<InstructionContent, 'title' | 'steps'> }) {
  const { ai, org, displayName } = useSession()
  const t = useMessages().learning.model
  const toast = useToast()
  const learning = useLearning()
  // Pour toute l'usine : dès Équipe (feature `ai_learning`) ; sans le droit, « Pour moi » d'office.
  const teamRight = useEntitlement('ai_learning')
  const gate = useGate()
  const [picked, setPicked] = useState<Quality[]>([])
  const [why, setWhy] = useState('')
  const [scope, setScope] = useState<'me' | 'org'>(learning.isAdmin && teamRight !== 'locked' ? 'org' : 'me')
  const [found, setFound] = useState<{ rules: string[]; explanation: string } | null>(null)
  const [keep, setKeep] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const reason = () => [...picked.map((q) => t.qualities[q]), why.trim()].filter(Boolean).join(', ')
  const close = () => {
    setFound(null)
    setPicked([])
    setWhy('')
    onClose()
  }

  async function learn() {
    setBusy(true)
    try {
      const current = [...org.json_data.standard.rules, ...(learning.personal?.rules ?? [])]
      const r = await rulesFromModel(ai, content, { qualities: picked.map((q) => t.qualities[q]), why, current, language: getLang() })
      setFound(r)
      setKeep(r.rules)
    } catch (e) {
      toast.error(t.failed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    setBusy(true)
    try {
      await learning.addModel(exampleOf(instructionId, content, reason(), displayName), keep, learning.isAdmin ? scope : 'me')
      toast.success(t.kept, keep.length ? t.keptRules(keep.length) : undefined)
      close()
    } catch (e) {
      toast.error(t.failed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={t.title}
      footer={
        <div className="flex justify-end">
          {found ? (
            <Button variant="primary" loading={busy} onClick={() => void save()} icon={<Check className="h-4 w-4" />}>
              {t.keep}
            </Button>
          ) : (
            <Button variant="primary" loading={busy} onClick={() => void learn()} icon={<Sparkles className="h-4 w-4" />}>
              {t.learn}
            </Button>
          )}
        </div>
      }
    >
      {found ? (
        <div>
          <p className="label-caps mb-2 text-slate-500 dark:text-slate-400">{t.found}</p>
          {found.explanation && <p className="mb-3 text-sm font-medium text-slate-600 dark:text-slate-300">{found.explanation}</p>}
          {found.rules.length ? (
            <ul className="space-y-2">
              {found.rules.map((r) => {
                const on = keep.includes(r)
                return (
                  <li key={r}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setKeep(on ? keep.filter((x) => x !== r) : [...keep, r])}
                      className={cn('btn-press glass-card flex min-h-12 w-full items-center gap-3 rounded-2xl p-3 text-left text-sm font-bold', !on && 'opacity-60')}
                    >
                      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2', on ? 'border-transparent bg-[var(--primary)] text-white' : 'border-slate-300 dark:border-slate-600')}>{on && <Check className="h-4 w-4" />}</span>
                      {r}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t.none}</p>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t.intro}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.title}>
            {QUALITIES.map((q) => {
              const on = picked.includes(q)
              return (
                <button key={q} type="button" aria-pressed={on} onClick={() => setPicked(on ? picked.filter((x) => x !== q) : [...picked, q])} className={cn('btn-press flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-black', on ? 'bg-gradient-primary shadow-primary text-white' : 'glass-card text-slate-700 dark:text-slate-200')}>
                  {on && <Check className="h-4 w-4" />}
                  {t.qualities[q]}
                </button>
              )
            })}
          </div>
          <label htmlFor="model-why" className="label-caps mt-5 mb-1.5 block text-slate-500 dark:text-slate-400">
            {t.why} <span className="tracking-normal normal-case opacity-70">{t.optional}</span>
          </label>
          <Textarea id="model-why" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder={t.whyPlaceholder} />
          {learning.isAdmin && (
            <div className="mt-4">
              <p className="label-caps mb-1.5 text-slate-500 dark:text-slate-400">{t.scope}</p>
              <Segmented
                value={scope}
                onChange={(v) => (v === 'org' ? gate(teamRight, 'ai_learning', () => setScope('org')) : setScope(v))}
                options={[
                  { value: 'org', label: <>{t.forOrg} {teamRight === 'locked' && <LockBadge className="ml-1" />}</> },
                  { value: 'me', label: t.forMe },
                ]}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
