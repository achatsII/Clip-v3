'use client'

import { Loader2, Send, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { errorText } from '@/components/ui/States'
import { Card } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { getLang, useMessages } from '@/lib/i18n'
import type { Block } from '@/lib/reports/catalog'
import { analyzeReport, askReport, autoNarrative, type Narrative, type Turn } from '@/lib/reports/narrative'
import { cn } from '@/lib/util/cn'

/**
 * L'analyse d'un rapport : par l'IA sur demande (elle commente les chiffres déjà calculés), sinon
 * l'analyse automatique. Puis une question sur le rapport, avec les derniers échanges. Rien n'est
 * gardé : un rapport se relit, l'analyse se refait.
 */
export function ReportAi({ title, period, blocks, signature }: { title: string; period: string; blocks: Block[]; signature: string }) {
  const t = useMessages().reports.ai
  const { ai } = useSession()
  const toast = useToast()
  const [result, setResult] = useState<{ for: string; n: Narrative; failed?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [asking, setAsking] = useState(false)
  // Une analyse d'une autre période ou d'un autre lieu ne se montre plus.
  const shown = result && result.for === signature ? result : null

  async function analyze() {
    setBusy(true)
    try {
      setResult({ for: signature, n: await analyzeReport(ai, title, period, blocks, getLang()) })
    } catch (e) {
      // Pas d'accord, plus de crédits, pas de réponse : l'analyse automatique, et on dit pourquoi.
      setResult({ for: signature, n: autoNarrative(blocks), failed: true })
      toast.info(t.failed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function ask(e?: FormEvent, preset?: string) {
    e?.preventDefault()
    const q = (preset ?? question).trim()
    if (!q || asking) return
    setAsking(true)
    try {
      const a = await askReport(ai, title, period, blocks, q, turns, getLang())
      setTurns((all) => [...all, { q, a }].slice(-6))
      setQuestion('')
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setAsking(false)
    }
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="bg-gradient-accent shadow-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <h2 className="min-w-0 flex-1 text-lg font-black tracking-tight">{t.title}</h2>
        <Button variant={shown ? undefined : 'primary'} loading={busy} icon={<Sparkles className="h-4 w-4" />} onClick={() => void analyze()}>
          {shown ? t.again : t.analyze} <AiCost operation="report_summary" />
        </Button>
      </div>

      {busy && !shown && <p className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> {t.working}</p>}
      {shown && (
        <div className="mt-4 space-y-4">
          {shown.n.auto && <p className="label-caps text-slate-400">{t.auto}</p>}
          <Part title={t.summary} items={shown.n.summary} />
          {!!shown.n.watch.length && <Part title={t.watch} items={shown.n.watch} tone="bad" />}
          {!!shown.n.actions.length && <Part title={t.actions} items={shown.n.actions} tone="good" />}
          {!shown.n.auto && <p className="text-xs font-medium text-slate-400">{t.disclaimer}</p>}
        </div>
      )}

      <div className="mt-5 border-t border-slate-900/5 pt-4 dark:border-white/5">
        <p className="label-caps mb-2 text-slate-500">{t.ask}</p>
        {!!turns.length && (
          <ul className="mb-3 space-y-3">
            {turns.map((x, i) => (
              <li key={i} className="space-y-1">
                <p className="text-sm font-black">{x.q}</p>
                <p className="rounded-2xl bg-violet-50 p-3 text-sm font-medium text-slate-700 dark:bg-violet-500/10 dark:text-slate-200">{x.a}</p>
              </li>
            ))}
          </ul>
        )}
        {!turns.length && (
          <div className="mb-2 flex flex-wrap gap-2">
            {t.suggestions.map((s) => (
              <button key={s} type="button" disabled={asking} onClick={() => void ask(undefined, s)} className="btn-press glass-card min-h-10 rounded-xl px-3 text-left text-xs font-black disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => void ask(e)} className="flex items-center gap-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t.askPlaceholder} aria-label={t.ask} className="glass-input h-12 min-w-0 flex-1 rounded-2xl px-4 text-[15px] font-bold focus:outline-none" />
          <Button type="submit" loading={asking} disabled={!question.trim()} icon={<Send className="h-4 w-4" />} aria-label={t.send}>
            <span className="max-sm:hidden">{t.send}</span>
          </Button>
        </form>
        {asking && <p className="mt-2 text-xs font-bold text-slate-500">{t.thinking}</p>}
      </div>
    </Card>
  )
}

function Part({ title, items, tone }: { title: string; items: string[]; tone?: 'good' | 'bad' }) {
  return (
    <div>
      <p className={cn('label-caps mb-1.5', tone === 'bad' ? 'text-rose-600 dark:text-rose-400' : tone === 'good' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500')}>{title}</p>
      <ul className="space-y-1.5">
        {items.map((x) => (
          <li key={x} className="flex gap-2 text-[15px] font-bold">
            <span className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', tone === 'bad' ? 'bg-rose-500' : tone === 'good' ? 'bg-emerald-500' : 'bg-[var(--primary)]')} />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
