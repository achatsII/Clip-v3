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
import { useFeedback, useInstructions } from '@/hooks/queries'
import { useAdoption } from '@/hooks/useAdoption'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { periodFacts, valueOf } from '@/lib/stats/adoption'
import { useToggle } from '@/lib/toggles'
import { cn } from '@/lib/util/cn'

const DAYS = 30

export default function StatsPage() {
  const { org, updateOrg, can } = useSession()
  const instructions = useInstructions()
  const feedback = useFeedback()
  const detailed = useEntitlement('adoption_stats')
  const gate = useGate()
  const router = useRouter()
  const reportOn = useToggle('valueReport')
  const [roiOpen, setRoiOpen] = useState(false)
  const { events, stats, since } = useAdoption(DAYS)

  const facts = periodFacts({ instructions: instructions.data ?? [], feedback: feedback.data ?? [], perInstruction: stats.perInstruction, since })
  const roi = org.json_data.roi
  const { hours: hoursSaved, value } = valueOf(facts.created, stats.completions, roi)
  const locked = detailed === 'locked'

  if (events.error) return <ErrorState error={events.error} onRetry={() => events.refetch()} />

  return (
    <div className="space-y-8">
      <PageHeader
        title="Statistiques"
        subtitle={`Les ${DAYS} derniers jours : ce qui est consulté au plancher, ce qui est signalé, ce que ça vous fait gagner.`}
        actions={
          reportOn ? (
            <Button variant="primary" icon={<FileText className="h-4 w-4" />} onClick={() => gate(detailed, 'adoption_stats', () => router.push('/statistiques/dossier'))}>
              Dossier pour la direction {locked && <LockBadge />}
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi tile="from-sky-500 to-blue-700" icon={<Eye className="h-6 w-6" />} label="Consultations" value={events.isLoading ? null : stats.views.toLocaleString('fr-CA')} hint={`Tablettes ${stats.bySource.kiosk} · liens ${stats.bySource.link} · app ${stats.bySource.app}`} />
        <Kpi tile="from-emerald-400 to-teal-600" icon={<CheckCircle2 className="h-6 w-6" />} label="Réalisations" value={events.isLoading ? null : stats.completions.toLocaleString('fr-CA')} hint={`${stats.completionRate} % des consultations vont au bout`} />
        <Kpi tile="from-amber-400 to-orange-500" icon={<MessageSquareWarning className="h-6 w-6" />} label="Retours" value={feedback.isLoading ? null : facts.feedback.total.toLocaleString('fr-CA')} hint={`${facts.feedback.done} traités`} />
        <button type="button" onClick={() => gate(detailed, 'adoption_stats', () => setRoiOpen(true))} className="btn-press lift text-left">
          <Kpi tile="from-violet-500 to-indigo-600" icon={locked ? <Lock className="h-6 w-6" /> : <Coins className="h-6 w-6" />} label="Valeur estimée" value={locked ? '—' : events.isLoading ? null : `${value.toLocaleString('fr-CA')} $`} hint={locked ? 'Retour sur investissement : plan supérieur' : `${Math.round(hoursSaved)} h gagnées · touchez pour vos hypothèses`} />
        </button>
      </div>

      <Card className="p-6">{events.isLoading ? <Skeleton className="h-56" /> : <DailyBars days={stats.days} label="Consultations par jour" unit="consultations" />}</Card>

      <div className={cn('grid gap-5 lg:grid-cols-2', locked && 'relative')}>
        <Card className="p-6">
          <SectionTitle title="Les plus consultées" />
          {facts.top.length && facts.top[0].views > 0 ? (
            <ol className="space-y-2">
              {facts.top.map((t, i) => (
                <li key={t.id}>
                  <Link href={`/instructions/${t.id}`} className="btn-press flex items-center gap-3 rounded-2xl p-2 hover:bg-slate-900/5 dark:hover:bg-white/5">
                    <span className="w-6 text-right text-sm font-black text-slate-400 tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-black">{t.title}</span>
                    <span className="text-sm font-black tabular-nums">{t.views}</span>
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
                {facts.unseen ? `${facts.unseen} instruction${facts.unseen > 1 ? 's' : ''} publiée${facts.unseen > 1 ? 's' : ''} jamais consultée${facts.unseen > 1 ? 's' : ''} : est-elle au bon poste ?` : 'Toutes les instructions publiées ont été consultées.'}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              <span>{facts.feedback.open} retour(s) à traiter.</span>
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
          {facts.created} instruction{facts.created > 1 ? 's' : ''} × {roi.hoursSavedPerInstruction} h + {stats.completions} réalisations × {roi.minutesSavedPerCompletion} min = {Math.round(hoursSaved)} h × {roi.hourlyRate} $ = {value.toLocaleString('fr-CA')} $
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
