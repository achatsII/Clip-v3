'use client'

import { ArrowLeft, FileText, Lock, Printer } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { entitlementLines, formatPrice, usePlans } from '@/components/billing/Billing'
import { billingClient } from '@/components/billing/BillingRoot'
import { useUsage } from '@/components/billing/Usage'
import { useSession } from '@/components/providers/Session'
import { Button, LinkButton } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useFeedback, useStatsIndex, useStations } from '@/hooks/queries'
import { useAdoption } from '@/hooks/useAdoption'
import { callNative, hasCapability, nativeEnv } from '@/lib/bridge/native'
import { planFor } from '@/lib/billing/advice'
import { LIMIT_FEATURES, PLAN_PITCH } from '@/lib/billing/catalog'
import type { PublicPlan } from '@/lib/billing/client'
import { useBilling, useEntitlement, useGate } from '@/lib/billing/state'
import { usageText } from '@/lib/billing/usage'
import { useMessages } from '@/lib/i18n'
import { buildValueReportHtml, type ValueReportProposal } from '@/lib/pdf/valueReport'
import { periodFacts, valueOf } from '@/lib/stats/adoption'
import { FALLBACK_TOGGLES } from '@/lib/toggleDefaults'
import { usePublicConfig } from '@/lib/toggles'
import { formatDate } from '@/lib/util/cn'

const DAYS = 30
const monthlyCents = (p: PublicPlan) => p.prices.find((x) => x.interval === 'monthly')?.amount_cents ?? 0

/**
 * Le dossier pour la direction : en un geste, une page à imprimer ou à envoyer en PDF qui dit ce
 * que CLIP a fait gagner (les mêmes chiffres que la page Statistiques) et, au choix, le plan à
 * demander. Il fait partie des statistiques d'adoption ; dans la coquille, aucun plan ni prix.
 */
export default function ValueReportPage() {
  const config = usePublicConfig()
  const { can } = useSession()
  const t = useMessages().stats.report
  const access = useEntitlement('adoption_stats')
  const gate = useGate()
  const on = config.data?.toggles.valueReport ?? FALLBACK_TOGGLES.valueReport

  if (config.isLoading || access === 'pending') return <Skeleton className="h-[80dvh] w-full" />
  if (!on || !can('stats')) {
    return <EmptyState icon={<FileText className="h-7 w-7" />} title={t.unavailableTitle} description={t.unavailableDescription} action={<LinkButton href="/statistiques">{t.backToStats}</LinkButton>} />
  }
  if (access === 'locked') {
    return (
      <EmptyState
        icon={<Lock className="h-7 w-7" />}
        title={t.lockedTitle}
        description={t.lockedDescription}
        action={<Button variant="primary" onClick={() => gate(access, 'adoption_stats', () => undefined)}>{t.seePlan}</Button>}
      />
    )
  }
  return <Report />
}

function Report() {
  const { org } = useSession()
  const t = useMessages()
  const params = useSearchParams()
  const { enabled, state } = useBilling()
  const { events, stats, since } = useAdoption(DAYS)
  const instructions = useStatsIndex(since)
  const stations = useStations()
  const feedback = useFeedback()
  const usage = useUsage()
  const inShell = !!nativeEnv()
  const plans = usePlans(billingClient, !inShell)
  const frame = useRef<HTMLIFrameElement>(null)

  // Les plans qui donnent plus que l'actuel ; la proposition se choisit, ou s'omet.
  const choices = useMemo(() => {
    if (inShell || !enabled || !plans.data) return []
    const current = plans.data.plans.find((p) => p.code === state?.plan_code)
    const floor = current ? monthlyCents(current) : 0
    return plans.data.plans.filter((p) => p.kind === 'base' && monthlyCents(p) > floor).sort((a, b) => monthlyCents(a) - monthlyCents(b))
  }, [inShell, enabled, plans.data, state?.plan_code])
  const asked = params.get('plan')
  const fallback = choices.find((p) => p.code === asked)?.code ?? (plans.data ? planFor(choices, state)?.code : undefined) ?? 'none'
  const [picked, setPicked] = useState<string | null>(null)
  const choice = picked ?? fallback
  const plan = choices.find((p) => p.code === choice) ?? null

  const loading = events.isLoading || instructions.isLoading || stations.isLoading || feedback.isLoading
  const error = events.error ?? instructions.error

  const html = useMemo(() => {
    if (loading || error) return ''
    const facts = periodFacts({ instructions: instructions.data ?? [], stations: stations.data ?? [], feedback: feedback.data ?? [], perInstruction: stats.perInstruction, since }, 5)
    const roi = org.json_data.roi
    const { hours, value } = valueOf(facts.created, stats.completions, roi)
    const monthly = plan?.prices.find((p) => p.interval === 'monthly')
    const yearly = plan?.prices.find((p) => p.interval === 'yearly')
    const proposal: ValueReportProposal | null = plan
      ? {
          planName: plan.name,
          pitch: PLAN_PITCH[plan.code] ?? '',
          lines: entitlementLines(plan),
          price: monthly ? t.stats.pdf.perMonth(formatPrice(monthly.amount_cents, monthly.currency)) : null,
          yearly: yearly ? t.stats.pdf.perYear(formatPrice(yearly.amount_cents, yearly.currency)) : null,
          usage: LIMIT_FEATURES.flatMap((k) => {
            const l = usage[k]
            return l && l.limit !== null ? [usageText(k, l.used, l.limit)] : []
          }),
          ratio: monthly && monthly.amount_cents > 0 ? value / (monthly.amount_cents / 100) : null,
        }
      : null
    const today = formatDate(new Date().toISOString())
    return buildValueReportHtml({
      orgName: org.json_data.name,
      logoUrl: org.json_data.logoUrl,
      color: org.json_data.color,
      days: DAYS,
      periodLabel: t.stats.pdf.period(formatDate(since), today),
      generatedOn: today,
      views: stats.views,
      completions: stats.completions,
      completionRate: stats.completionRate,
      created: facts.created,
      published: facts.published,
      stations: facts.stations,
      hours,
      value,
      roi,
      top: facts.top,
      feedback: facts.feedback,
      unseen: facts.unseen,
      proposal,
    })
  }, [loading, error, instructions.data, stations.data, feedback.data, stats, since, org.json_data, plan, usage, t])

  async function print() {
    if (hasCapability('print')) {
      await callNative('print', { html }).catch(() => undefined)
      return
    }
    frame.current?.contentWindow?.focus()
    frame.current?.contentWindow?.print()
  }

  if (error) return <ErrorState error={error} onRetry={() => void (events.refetch(), instructions.refetch())} />

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-slate-900">
      <div className="glass-nav pt-safe border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/statistiques" className="btn-press flex h-11 items-center gap-1 rounded-2xl px-3 text-sm font-black">
            <ArrowLeft className="h-4 w-4" /> {t.common.back}
          </Link>
          {/* Au téléphone, la barre garde ses deux gestes : revenir, enregistrer. */}
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-500">
            <span className="max-sm:hidden">{t.stats.report.hint}</span>
          </p>
          <Button variant="primary" icon={<Printer className="h-4 w-4" />} onClick={print} disabled={!html}>
            <span className="max-sm:hidden">{t.stats.report.print}</span>
            <span className="sm:hidden">{t.stats.report.printShort}</span>
          </Button>
        </div>
        {choices.length > 0 && (
          <div className="mt-3 flex items-center gap-3 overflow-x-auto">
            <span className="label-caps shrink-0 text-slate-500">{t.stats.report.propose}</span>
            <Segmented size="sm" value={choice} onChange={setPicked} options={[{ value: 'none', label: t.stats.report.noPlan }, ...choices.map((p) => ({ value: p.code, label: p.name }))]} />
          </div>
        )}
      </div>
      {html ? <iframe ref={frame} title={t.stats.report.preview} srcDoc={html} className="min-h-0 w-full flex-1 bg-white" /> : <Skeleton className="m-4 flex-1 rounded-[28px]" />}
    </div>
  )
}
