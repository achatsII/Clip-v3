'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, CheckCircle2, Coins, Eye, Lock, MessageSquareWarning, Sparkles, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { DailyBars } from '@/components/charts/DailyBars'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { Card, PageHeader, SectionTitle } from '@/components/ui/Surface'
import { useFeedback, useInstructions } from '@/hooks/queries'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { T } from '@/lib/model/repo'
import type { UsageEvent } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

const DAYS = 30

export default function StatsPage() {
  const { data, org, updateOrg, can } = useSession()
  const instructions = useInstructions()
  const feedback = useFeedback()
  const detailed = useEntitlement('adoption_stats')
  const gate = useGate()
  const [roiOpen, setRoiOpen] = useState(false)
  const since = useMemo(() => new Date(Date.now() - DAYS * 86400_000).toISOString(), [])

  const events = useQuery({
    queryKey: ['events', DAYS],
    queryFn: () =>
      data.filter<UsageEvent>(T.event, {
        filter: { 'json_data.at': { $gte: since } },
        projection: { 'json_data.type': 1, 'json_data.instructionId': 1, 'json_data.stationId': 1, 'json_data.at': 1, 'json_data.durationSec': 1, 'json_data.source': 1, 'json_data.operation': 1 },
        sort: { _id: -1 },
        limit: 10000,
      }),
  })

  const stats = useMemo(() => {
    const ev = (events.data ?? []).map((d) => d.json_data)
    const byDay = new Map<string, number>()
    for (let i = DAYS - 1; i >= 0; i--) byDay.set(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10), 0)
    const views = ev.filter((e) => e.type === 'view')
    const completions = ev.filter((e) => e.type === 'complete')
    const generations = ev.filter((e) => e.type === 'ai' && e.operation?.startsWith('generate'))
    const imports = ev.filter((e) => e.type === 'ai' && e.operation?.startsWith('import'))
    for (const v of views) {
      const k = v.at.slice(0, 10)
      if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + 1)
    }
    const perInstruction = new Map<string, number>()
    for (const v of views) if (v.instructionId) perInstruction.set(v.instructionId, (perInstruction.get(v.instructionId) ?? 0) + 1)
    const bySource = { kiosk: 0, link: 0, app: 0 }
    for (const v of views) bySource[v.source] = (bySource[v.source] ?? 0) + 1
    const durations = completions.map((c) => c.durationSec ?? 0).filter((d) => d > 0).sort((a, b) => a - b)
    return {
      days: [...byDay.entries()].map(([date, value]) => ({ date, value })),
      views: views.length,
      completions: completions.length,
      completionRate: views.length ? Math.round((completions.length / views.length) * 100) : 0,
      generations: generations.length,
      imports: imports.length,
      perInstruction,
      bySource,
      medianDuration: durations.length ? durations[Math.floor(durations.length / 2)] : 0,
    }
  }, [events.data])

  const published = (instructions.data ?? []).filter((d) => d.json_data.publishedVersion)
  const top = published
    .map((d) => ({ d, n: stats.perInstruction.get(d._id) ?? 0 }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8)
  const unseen = published.filter((d) => !stats.perInstruction.get(d._id) && Date.now() - Date.parse(d.json_data.publishedAt ?? d.json_data.updatedAt) > 7 * 86400_000)
  const fb = feedback.data ?? []
  const fbRecent = fb.filter((f) => f.json_data.createdAt >= since)
  const fbDone = fbRecent.filter((f) => f.json_data.status !== 'new').length
  const roi = org.json_data.roi
  const created = (instructions.data ?? []).filter((d) => d.json_data.createdAt >= since && (d.json_data.stepCount ?? 0) > 0).length
  const hoursSaved = created * roi.hoursSavedPerInstruction + (stats.completions * roi.minutesSavedPerCompletion) / 60
  const value = Math.round(hoursSaved * roi.hourlyRate)
  const locked = detailed === 'locked'

  if (events.error) return <ErrorState error={events.error} onRetry={() => events.refetch()} />

  return (
    <div className="space-y-8">
      <PageHeader title="Statistiques" subtitle={`Les ${DAYS} derniers jours : ce qui est consulté au plancher, ce qui est signalé, ce que ça vous fait gagner.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi tile="from-sky-500 to-blue-700" icon={<Eye className="h-6 w-6" />} label="Consultations" value={events.isLoading ? null : stats.views.toLocaleString('fr-CA')} hint={`Tablettes ${stats.bySource.kiosk} · liens ${stats.bySource.link} · app ${stats.bySource.app}`} />
        <Kpi tile="from-emerald-400 to-teal-600" icon={<CheckCircle2 className="h-6 w-6" />} label="Réalisations" value={events.isLoading ? null : stats.completions.toLocaleString('fr-CA')} hint={`${stats.completionRate} % des consultations vont au bout`} />
        <Kpi tile="from-amber-400 to-orange-500" icon={<MessageSquareWarning className="h-6 w-6" />} label="Retours" value={feedback.isLoading ? null : fbRecent.length.toLocaleString('fr-CA')} hint={`${fbDone} traités`} />
        <button type="button" onClick={() => gate(detailed, 'adoption_stats', () => setRoiOpen(true))} className="btn-press lift text-left">
          <Kpi tile="from-violet-500 to-indigo-600" icon={locked ? <Lock className="h-6 w-6" /> : <Coins className="h-6 w-6" />} label="Valeur estimée" value={locked ? '—' : events.isLoading ? null : `${value.toLocaleString('fr-CA')} $`} hint={locked ? 'Retour sur investissement : plan supérieur' : `${Math.round(hoursSaved)} h gagnées · touchez pour vos hypothèses`} />
        </button>
      </div>

      <Card className="p-6">{events.isLoading ? <Skeleton className="h-56" /> : <DailyBars days={stats.days} label="Consultations par jour" unit="consultations" />}</Card>

      <div className={cn('grid gap-5 lg:grid-cols-2', locked && 'relative')}>
        <Card className="p-6">
          <SectionTitle title="Les plus consultées" />
          {top.length && top[0].n > 0 ? (
            <ol className="space-y-2">
              {top.map(({ d, n }, i) => (
                <li key={d._id}>
                  <Link href={`/instructions/${d._id}`} className="btn-press flex items-center gap-3 rounded-2xl p-2 hover:bg-slate-900/5 dark:hover:bg-white/5">
                    <span className="w-6 text-right text-sm font-black text-slate-400 tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-black">{d.json_data.title}</span>
                    <span className="text-sm font-black tabular-nums">{n}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm font-bold text-slate-500">Les consultations apparaîtront dès que les opérateurs ouvriront les instructions (tablette, code QR, lien).</p>
          )}
        </Card>
        <Card className="p-6">
          <SectionTitle title="À regarder de plus près" />
          <ul className="space-y-3 text-sm font-bold">
            <li className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <span>
                {unseen.length ? `${unseen.length} instruction${unseen.length > 1 ? 's' : ''} publiée${unseen.length > 1 ? 's' : ''} jamais consultée${unseen.length > 1 ? 's' : ''} : est-elle au bon poste ?` : 'Toutes les instructions publiées ont été consultées.'}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              <span>{fb.filter((f) => f.json_data.status === 'new').length} retour(s) à traiter.</span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
              <span>
                {stats.generations} génération{stats.generations > 1 ? 's' : ''} et {stats.imports} import{stats.imports > 1 ? 's' : ''} par l’IA ce mois-ci.
              </span>
            </li>
            {stats.medianDuration > 0 && (
              <li className="flex items-start gap-3">
                <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <span>Une réalisation prend {Math.round(stats.medianDuration / 60) || 1} min en médiane.</span>
              </li>
            )}
          </ul>
        </Card>
      </div>

      <Modal
        open={roiOpen}
        onClose={() => setRoiOpen(false)}
        title="Comment on calcule la valeur"
        footer={<Button onClick={() => setRoiOpen(false)}>Fermer</Button>}
      >
        <p className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-300">Une estimation transparente, selon vos hypothèses : le temps gagné à rédiger chaque instruction créée, et le temps gagné à chaque réalisation guidée (moins de questions, moins d’erreurs).</p>
        <RoiForm
          roi={roi}
          readOnly={!can('settings', 'write')}
          onSave={async (next) => {
            await updateOrg({ roi: next })
            setRoiOpen(false)
          }}
        />
        <p className="mt-4 rounded-2xl bg-primary-soft p-4 text-sm font-bold">
          {created} instruction{created > 1 ? 's' : ''} × {roi.hoursSavedPerInstruction} h + {stats.completions} réalisations × {roi.minutesSavedPerCompletion} min = {Math.round(hoursSaved)} h × {roi.hourlyRate} $ = {value.toLocaleString('fr-CA')} $
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
  const [v, setV] = useState(roi)
  const [busy, setBusy] = useState(false)
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <Label htmlFor="roi-h">Heures gagnées par instruction</Label>
        <Input id="roi-h" type="number" inputMode="decimal" readOnly={readOnly} value={v.hoursSavedPerInstruction} onChange={(e) => setV({ ...v, hoursSavedPerInstruction: Number(e.target.value) || 0 })} />
      </div>
      <div>
        <Label htmlFor="roi-m">Minutes par réalisation</Label>
        <Input id="roi-m" type="number" inputMode="decimal" readOnly={readOnly} value={v.minutesSavedPerCompletion} onChange={(e) => setV({ ...v, minutesSavedPerCompletion: Number(e.target.value) || 0 })} />
      </div>
      <div>
        <Label htmlFor="roi-r">Taux horaire ($)</Label>
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
          Enregistrer mes hypothèses
        </Button>
      )}
    </div>
  )
}
