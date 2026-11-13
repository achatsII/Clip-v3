'use client'

import { BarChart3, CheckCircle2, Coins, Eye, FileText, Lock, MessageSquareWarning, Sparkles, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LockBadge } from '@/components/billing/Billing'
import { DailyBars } from '@/components/charts/DailyBars'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { Card, PageHeader, SectionTitle } from '@/components/ui/Surface'
import { useFeedback, useStatsIndex } from '@/hooks/queries'
import { useAdoption } from '@/hooks/useAdoption'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { num, useMessages } from '@/lib/i18n'
import { periodFacts, valueOf } from '@/lib/stats/adoption'
import { useToggle } from '@/lib/toggles'
import { cn } from '@/lib/util/cn'

const DAYS = 30

export default function StatsPage() {
  const { org, updateOrg, can } = useSession()
  const t = useMessages()
  const w = t.stats.page
  const feedback = useFeedback()
  const detailed = useEntitlement('adoption_stats')
  const gate = useGate()
  const router = useRouter()
  const reportOn = useToggle('valueReport')
  const [roiOpen, setRoiOpen] = useState(false)
  const { events, stats, since } = useAdoption(DAYS)
  // Les publiées et les nouvelles de la période, en champs choisis : pas toute la bibliothèque.
  const instructions = useStatsIndex(since)

  const facts = periodFacts({ instructions: instructions.data ?? [], feedback: feedback.data ?? [], perInstruction: stats.perInstruction, since })
  const roi = org.json_data.roi
  const { hours: hoursSaved, value } = valueOf(facts.created, stats.completions, roi)
  const locked = detailed === 'locked'

  if (events.error) return <ErrorState error={events.error} onRetry={() => events.refetch()} />

  return (
    <div className="space-y-8">
      <PageHeader
        title={w.title}
        subtitle={w.subtitle(DAYS)}
        actions={
          reportOn ? (
            <Button variant="primary" icon={<FileText className="h-4 w-4" />} onClick={() => gate(detailed, 'adoption_stats', () => router.push('/statistiques/dossier'))}>
              {t.stats.report.title} {locked && <LockBadge />}
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi tile="from-sky-500 to-blue-700" icon={<Eye className="h-6 w-6" />} label={w.views} value={events.isLoading ? null : num(stats.views)} hint={w.viewsHint(stats.bySource.kiosk, stats.bySource.link, stats.bySource.app)} />
        <Kpi tile="from-emerald-400 to-teal-600" icon={<CheckCircle2 className="h-6 w-6" />} label={w.completions} value={events.isLoading ? null : num(stats.completions)} hint={w.completionsHint(stats.completionRate)} />
        <Kpi tile="from-amber-400 to-orange-500" icon={<MessageSquareWarning className="h-6 w-6" />} label={w.feedback} value={feedback.isLoading ? null : num(facts.feedback.total)} hint={w.feedbackHint(facts.feedback.done)} />
        <button type="button" onClick={() => gate(detailed, 'adoption_stats', () => setRoiOpen(true))} className="btn-press lift text-left">
          <Kpi tile="from-violet-500 to-indigo-600" icon={locked ? <Lock className="h-6 w-6" /> : <Coins className="h-6 w-6" />} label={w.value} value={locked ? '—' : events.isLoading ? null : w.money(value)} hint={locked ? w.valueLocked : w.valueHint(Math.round(hoursSaved))} />
        </button>
      </div>

      <Card className="p-6">{events.isLoading ? <Skeleton className="h-56" /> : <DailyBars days={stats.days} label={w.chartTitle} unit={w.chartUnit} />}</Card>

      <div className={cn('grid gap-5 lg:grid-cols-2', locked && 'relative')}>
        <Card className="p-6">
          <SectionTitle title={w.top} />
          {facts.top.length && facts.top[0].views > 0 ? (
            <ol className="space-y-2">
              {facts.top.map((item, i) => (
                <li key={item.id}>
                  <Link href={`/instructions/${item.id}`} className="btn-press flex items-center gap-3 rounded-2xl p-2 hover:bg-slate-900/5 dark:hover:bg-white/5">
                    <span className="w-6 text-right text-sm font-black text-slate-400 tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-black">{item.title}</span>
                    <span className="text-sm font-black tabular-nums">{item.views}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm font-bold text-slate-500">{w.topEmpty}</p>
          )}
        </Card>
        <Card className="p-6">
          <SectionTitle title={w.watch} />
          <ul className="space-y-3 text-sm font-bold">
            <li className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <span>{facts.unseen ? w.unseen(facts.unseen) : w.allSeen}</span>
            </li>
            <li className="flex items-start gap-3">
              <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              <span>{w.openFeedback(facts.feedback.open)}</span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
              <span>{w.aiUse(stats.generations, stats.imports)}</span>
            </li>
            {stats.medianDuration > 0 && (
              <li className="flex items-start gap-3">
                <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <span>{w.medianDuration(Math.round(stats.medianDuration / 60) || 1)}</span>
              </li>
            )}
          </ul>
        </Card>
      </div>

      <Modal
        open={roiOpen}
        onClose={() => setRoiOpen(false)}
        title={t.stats.roi.title}
        footer={<Button onClick={() => setRoiOpen(false)}>{t.common.close}</Button>}
      >
        <p className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t.stats.roi.intro}</p>
        <RoiForm
          roi={roi}
          readOnly={!can('settings', 'write')}
          onSave={async (next) => {
            await updateOrg({ roi: next })
            setRoiOpen(false)
          }}
        />
        <p className="mt-4 rounded-2xl bg-primary-soft p-4 text-sm font-bold">
          {t.stats.roi.formula({ created: facts.created, hoursPerInstruction: roi.hoursSavedPerInstruction, completions: stats.completions, minutesPerCompletion: roi.minutesSavedPerCompletion, hours: Math.round(hoursSaved), hourlyRate: roi.hourlyRate, value })}
        </p>
      </Modal>
    </div>
  )
}

function Kpi({ tile, icon, label, value, hint }: { tile: string; icon: React.ReactNode; label: string; value: string | null; hint: string }) {
  return (
    <div className={cn('relative h-full overflow-hidden rounded-[28px] bg-gradient-to-br p-5 text-white shadow-[0_15px_35px_rgba(15,23,42,0.12)]', tile)}>
      <span className="grid-pattern absolute inset-0 opacity-60" />
      <span className="absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <span className="label-caps opacity-90">{label}</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md">{icon}</span>
      </div>
      <p className="relative mt-3 text-4xl font-black tracking-tighter tabular-nums">{value ?? '—'}</p>
      <p className="relative mt-1 text-sm font-bold opacity-90">{hint}</p>
    </div>
  )
}

function RoiForm({ roi, onSave, readOnly }: { roi: { hoursSavedPerInstruction: number; hourlyRate: number; minutesSavedPerCompletion: number }; onSave: (r: typeof roi) => Promise<void>; readOnly: boolean }) {
  const t = useMessages().stats.roi
  const [v, setV] = useState(roi)
  const [busy, setBusy] = useState(false)
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <Label htmlFor="roi-h">{t.hoursPerInstruction}</Label>
        <Input id="roi-h" type="number" inputMode="decimal" readOnly={readOnly} value={v.hoursSavedPerInstruction} onChange={(e) => setV({ ...v, hoursSavedPerInstruction: Number(e.target.value) || 0 })} />
      </div>
      <div>
        <Label htmlFor="roi-m">{t.minutesPerCompletion}</Label>
        <Input id="roi-m" type="number" inputMode="decimal" readOnly={readOnly} value={v.minutesSavedPerCompletion} onChange={(e) => setV({ ...v, minutesSavedPerCompletion: Number(e.target.value) || 0 })} />
      </div>
      <div>
        <Label htmlFor="roi-r">{t.hourlyRate}</Label>
        <Input id="roi-r" type="number" inputMode="decimal" readOnly={readOnly} value={v.hourlyRate} onChange={(e) => setV({ ...v, hourlyRate: Number(e.target.value) || 0 })} />
      </div>
      {!readOnly && (
        <Button
          className="sm:col-span-3"
          variant="primary"
          loading={busy}
          onClick={async () => {
            setBusy(true)
            await onSave(v).finally(() => setBusy(false))
          }}
        >
          {t.save}
        </Button>
      )}
    </div>
  )
}
