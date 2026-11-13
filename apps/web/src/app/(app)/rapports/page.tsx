'use client'

import { BarChart3, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LockBadge } from '@/components/billing/Billing'
import { FAMILY_LOOK, REPORT_ICONS } from '@/components/reports/icons'
import { useSession } from '@/components/providers/Session'
import { SearchField } from '@/components/ui/SearchField'
import { EmptyState } from '@/components/ui/States'
import { PageHeader } from '@/components/ui/Surface'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { useMessages } from '@/lib/i18n'
import { REPORTS, type Family, type ReportDef, type ReportKey } from '@/lib/reports/catalog'
import { useToggle } from '@/lib/toggles'
import { cn } from '@/lib/util/cn'
import { matchesTokens, searchTokens } from '@/lib/util/people'

const FAMILIES: Family[] = ['floor', 'quality', 'training', 'library', 'direction']

/**
 * Le répertoire des rapports (toggle `reports`), inspiré de K2 Cadence : des modèles prêts, regroupés
 * par sujet, ceux de votre rôle d'abord, et une recherche. Chacun répond à une question ; on l'ouvre,
 * on choisit la période et le lieu. Sans les statistiques d'adoption (Gratuit), seule la revue de la
 * semaine s'ouvre ; les autres montrent leur cadenas.
 */
export default function ReportsPage() {
  const t = useMessages().reports
  const { can, role } = useSession()
  const on = useToggle('reports')
  const [query, setQuery] = useState('')
  const ent = useEntitlement('adoption_stats')
  const gate = useGate()
  const router = useRouter()
  if (!on || !can('stats')) return <EmptyState icon={<BarChart3 className="h-7 w-7" />} title={t.title} description={t.subtitle} />

  const tokens = searchTokens(query)
  const matches = (key: ReportKey | 'adoption') => matchesTokens(tokens, t.list[key].title, t.list[key].question, t.list[key].persona)
  const reports = REPORTS.filter((r) => matches(r.key))
  const mine = tokens.length ? [] : REPORTS.filter((r) => r.forRoles.includes(role)).slice(0, 4)
  // Un rapport « pour vous » ne se répète pas plus bas : chaque carte une seule fois à l'écran.
  const shownAbove = new Set(mine.map((r) => r.key))
  const locked = (r: ReportDef) => !r.free && ent === 'locked'
  const open = (r: ReportDef) => gate(r.free ? 'open' : ent, 'adoption_stats', () => router.push(`/rapports/${r.key}`))

  const card = (r: ReportDef, big = false) => (
    <button key={r.key} type="button" onClick={() => open(r)} className={cn('glass-card btn-press lift flex w-full items-start gap-4 rounded-[28px] text-left', big ? 'p-5' : 'p-4')}>
      <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm', FAMILY_LOOK[r.family])}>{REPORT_ICONS[r.key]}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[17px] font-black tracking-tight">{t.list[r.key].title}</span>
          {locked(r) && <LockBadge />}
        </span>
        <span className="mt-0.5 block text-sm font-bold text-slate-600 dark:text-slate-300">{t.list[r.key].question}</span>
        <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black text-slate-500">
          <span className="rounded-lg bg-slate-900/5 px-2 py-0.5 dark:bg-white/10">{t.list[r.key].persona}</span>
          <span className="rounded-lg bg-slate-900/5 px-2 py-0.5 dark:bg-white/10">{t.defaultPeriod(r.defaultDays)}</span>
        </span>
      </span>
      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
    </button>
  )

  return (
    <div className="space-y-8">
      <div>
        <PageHeader title={t.title} subtitle={t.subtitle} />
        <SearchField value={query} onChange={setQuery} placeholder={t.search} />
      </div>

      {!!mine.length && (
        <section>
          <h2 className="label-caps mb-3 px-1 text-slate-500">{t.forYou}</h2>
          <div className="grid gap-3 lg:grid-cols-2">{mine.map((r) => card(r, true))}</div>
        </section>
      )}

      {FAMILIES.map((f) => {
        const list = reports.filter((r) => r.family === f && !shownAbove.has(r.key))
        const adoption = f === 'direction' && matches('adoption')
        if (!list.length && !adoption) return null
        return (
          <section key={f}>
            <h2 className="mb-3 px-1 text-xl font-black tracking-tight">{t.families[f]}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {list.map((r) => card(r))}
              {adoption && (
                <Link href="/statistiques" className="glass-card btn-press lift flex items-start gap-4 rounded-[28px] p-4">
                  <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm', FAMILY_LOOK.direction)}>{REPORT_ICONS.adoption}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-black tracking-tight">{t.list.adoption.title}</span>
                    <span className="mt-0.5 block text-sm font-bold text-slate-600 dark:text-slate-300">{t.list.adoption.question}</span>
                    <span className="mt-2 inline-block rounded-lg bg-slate-900/5 px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-white/10">{t.list.adoption.persona}</span>
                  </span>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                </Link>
              )}
            </div>
          </section>
        )
      })}

      {tokens.length > 0 && !reports.length && !matches('adoption') && <p className="glass-card rounded-[24px] p-6 text-center font-bold text-slate-500">{t.noMatch}</p>}
    </div>
  )
}
