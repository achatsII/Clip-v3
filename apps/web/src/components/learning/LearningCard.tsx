'use client'

/**
 * Après une publication (toggle `learnFromEdits`) : ce que CLIP a remarqué dans les corrections de la
 * personne, et la règle qui les éviterait. Une carte à la fois, dans le coin, qui ne bloque rien ;
 * « Plus tard » la ferme sans rien retenir (elle reviendra), « Non merci » ne la propose plus.
 * Qui règle l'usine peut la garder pour toute l'usine.
 */
import { Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useLearning } from '@/hooks/useLearning'
import { LockBadge } from '@/components/billing/Billing'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { useMessages } from '@/lib/i18n'
import type { Proposal } from '@/lib/learning/proposals'

export function LearningCard({ proposals, onClose }: { proposals: Proposal[]; onClose: () => void }) {
  const t = useMessages().learning
  const toast = useToast()
  const learning = useLearning()
  // Pour toute l'usine : l'IA qui apprend de l'équipe (feature `ai_learning`, dès Équipe).
  const teamRight = useEntitlement('ai_learning')
  const gate = useGate()
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const p = proposals[index]
  if (!p) return null

  const next = () => (index + 1 < proposals.length ? setIndex(index + 1) : onClose())
  async function act(kind: 'me' | 'org' | 'no') {
    setBusy(kind)
    try {
      if (kind === 'me') {
        await learning.forMe(p)
        toast.success(t.card.addedMine, t.card.addedMineHint)
      } else if (kind === 'org') {
        const v = await learning.forOrg(p)
        toast.success(t.card.addedOrg(v))
      } else await learning.dismiss(p, 'me')
      next()
    } catch (e) {
      toast.error(t.card.failed, errorText(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <aside role="dialog" aria-label={t.card.title} className="glass-float animate-slide-up fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 w-[min(26rem,calc(100vw-2rem))] rounded-[28px] p-4">
      <div className="flex items-start gap-3">
        <span className="bg-gradient-accent shadow-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="label-caps text-slate-500 dark:text-slate-400">{t.card.title}</p>
          <p className="mt-1 font-black text-slate-900 dark:text-white">
            {p.seen} <span className="font-bold text-slate-500 dark:text-slate-400">({t.seen.evidence(p.count, p.of)})</span>
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
            {t.card.next} <span className="text-[var(--primary-strong)] dark:text-[var(--primary-light)]">{p.rule}</span>
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label={t.card.close} title={t.card.close} className="btn-press -mt-1 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void act('no')}>
          {t.card.no}
        </Button>
        {learning.isAdmin && (
          <Button size="sm" loading={busy === 'org'} disabled={!!busy} onClick={() => gate(teamRight, 'ai_learning', () => void act('org'))}>
            {t.card.forOrg} {teamRight === 'locked' && <LockBadge className="ml-1" />}
          </Button>
        )}
        <Button size="sm" variant="primary" loading={busy === 'me'} disabled={!!busy} onClick={() => void act('me')}>
          {t.card.forMe}
        </Button>
      </div>
    </aside>
  )
}
