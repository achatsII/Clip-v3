'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, CheckCircle2, ClipboardCheck, Flame, MapPin, MessageSquareWarning, Mic, Palette, PenLine, QrCode, ScanLine, Sparkles, Trophy, UserPlus, Video } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { CreditPill, LowBalanceBanner } from '@/components/billing/Billing'
import { CreationList } from '@/components/CreationList'
import { InstructionRow } from '@/components/InstructionCard'
import { useSession } from '@/components/providers/Session'
import { LinkButton } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/States'
import { Card, SectionTitle } from '@/components/ui/Surface'
import { useFeedback, useInstructions, useStations } from '@/hooks/queries'
import { num, useMessages, type Messages } from '@/lib/i18n'
import { FEEDBACK_KINDS } from '@/lib/model/catalog'
import { T } from '@/lib/model/repo'
import { cn, timeAgo } from '@/lib/util/cn'

function greeting(g: Messages['home']['greeting'], name: string) {
  const h = new Date().getHours()
  return h < 5 ? g.night(name) : h < 12 ? g.morning(name) : h < 18 ? g.afternoon(name) : g.evening(name)
}

/** Semaines consécutives (jusqu'à cette semaine) où au moins une instruction a été publiée. */
function streakOf(dates: string[]): number {
  const week = (d: Date) => Math.floor((d.getTime() - new Date(2024, 0, 1).getTime()) / (7 * 86400_000))
  const weeks = new Set(dates.map((d) => week(new Date(d))))
  let n = 0
  let w = week(new Date())
  if (!weeks.has(w)) w -= 1
  while (weeks.has(w)) {
    n++
    w--
  }
  return n
}

export default function HomePage() {
  const router = useRouter()
  const t = useMessages().home
  const { profile, displayName, org, role, can, me, data } = useSession()
  const instructions = useInstructions()
  const stations = useStations()
  const feedback = useFeedback({ 'json_data.status': { $eq: 'new' } })
  const weekAgo = useMemo(() => new Date(Date.now() - 7 * 86400_000).toISOString(), [])
  const views = useQuery({
    queryKey: ['views-week'],
    queryFn: () => data.count(T.event, { 'json_data.type': { $in: ['view'] }, 'json_data.at': { $gte: weekAgo } }),
    enabled: can('stats'),
  })

  // Première ouverture d'un administrateur : la configuration guidée.
  useEffect(() => {
    if (role === 'admin' && !org.json_data.onboardedAt && instructions.data && instructions.data.length === 0) router.replace('/bienvenue')
  }, [role, org.json_data.onboardedAt, instructions.data, router])

  const all = instructions.data ?? []
  const published = all.filter((d) => d.json_data.publishedVersion)
  const review = all.filter((d) => d.json_data.status === 'review')
  const myDrafts = all.filter((d) => d.json_data.authorId === profile.userId && (!d.json_data.publishedVersion || d.json_data.dirty) && d.json_data.status !== 'review').slice(0, 4)
  const covered = new Set(published.flatMap((d) => d.json_data.stationIds))
  const stationCount = stations.data?.length ?? 0
  const coverage = stationCount ? Math.round(((stations.data ?? []).filter((s) => covered.has(s._id)).length / stationCount) * 100) : 0
  const streak = streakOf(published.map((d) => d.json_data.publishedAt ?? d.json_data.updatedAt))
  const focusList = all.filter((d) => d.json_data.publishedVersion && (me.categories.includes(d.json_data.category) || d.json_data.stationIds.some((s) => me.stationIds.includes(s)))).slice(0, 6)
  const stationName = new Map((stations.data ?? []).map((s) => [s._id, s.json_data.name]))

  const setup = [
    { done: published.length > 0, label: t.setup.publish, href: '/instructions/nouvelle', icon: <Sparkles className="h-4 w-4" /> },
    { done: (stations.data ?? []).some((s) => s.json_data.linkId), label: t.setup.station, href: '/postes', icon: <QrCode className="h-4 w-4" /> },
    { done: !!org.json_data.logoUrl, label: t.setup.logo, href: '/reglages', icon: <Palette className="h-4 w-4" /> },
    { done: Object.keys(org.json_data.members).length > 1, label: t.setup.invite, href: '/reglages?onglet=membres', icon: <UserPlus className="h-4 w-4" /> },
    { done: org.json_data.standard.version > 1, label: t.setup.standard, href: '/reglages?onglet=standard', icon: <PenLine className="h-4 w-4" /> },
  ]
  const setupDone = setup.filter((s) => s.done).length
  const canCreate = can('instructions', 'write')

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="label-caps text-slate-500">{org.json_data.name}</p>
          <h1 className="text-4xl font-black tracking-tighter sm:text-5xl">
            {greeting(t.greeting, displayName.split(' ')[0])}
          </h1>
        </div>
        <CreditPill />
      </header>
      <LowBalanceBanner />

      {canCreate ? (
        <Link href="/instructions/nouvelle" className="btn-press lift bg-gradient-primary shadow-primary relative block overflow-hidden rounded-[40px] p-7 text-white sm:p-10">
          <span className="grid-pattern absolute inset-0 opacity-60" />
          <span className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-white/25 blur-3xl" />
          <span className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="label-caps opacity-80">{t.hero.eyebrow}</span>
              <span className="mt-2 block text-3xl leading-tight font-black tracking-tighter sm:text-5xl">{t.hero.line1}<br />{t.hero.line2}</span>
              <span className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
                {[
                  [<Video key="v" className="h-4 w-4" />, t.hero.video],
                  [<Mic key="m" className="h-4 w-4" />, t.hero.voiceNote],
                  [<PenLine key="p" className="h-4 w-4" />, t.hero.document],
                ].map(([icon, label]) => (
                  <span key={label as string} className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3 py-1.5 backdrop-blur-md">
                    {icon} {label}
                  </span>
                ))}
              </span>
            </span>
            <span className="flex h-20 w-20 shrink-0 items-center justify-center self-end rounded-[28px] bg-white text-[var(--primary)] shadow-xl sm:self-auto">
              <ArrowRight className="h-10 w-10" />
            </span>
          </span>
        </Link>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <LinkButton href="/instructions" variant="primary" size="xl" block>
            {t.reader.find}
          </LinkButton>
          <LinkButton href="/postes" size="xl" block icon={<ScanLine className="h-6 w-6" />}>
            {t.reader.myStations}
          </LinkButton>
        </div>
      )}

      {canCreate && <CreationList />}

      {role === 'admin' && setupDone < setup.length && (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-4">
            <span className="relative flex h-14 w-14 items-center justify-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-900/10 dark:text-white/10" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(setupDone / setup.length) * 97.4} 97.4`} />
              </svg>
              <span className="text-sm font-black tabular-nums">
                {setupDone}/{setup.length}
              </span>
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight">{t.setup.title}</h2>
              <p className="text-sm font-bold text-slate-500">{t.setup.hint}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {setup.map((s) => (
              <Link key={s.label} href={s.href} className={cn('btn-press flex h-14 items-center gap-3 rounded-2xl px-4 text-sm font-black', s.done ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'glass-card text-slate-700 dark:text-slate-200')}>
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', s.done ? 'bg-emerald-500 text-white' : 'bg-primary-soft text-[var(--primary)]')}>{s.done ? <Check className="h-4 w-4" /> : s.icon}</span>
                <span className={cn(s.done && 'line-through opacity-70')}>{s.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Tile className="from-emerald-400 to-teal-600" icon={<CheckCircle2 className="h-6 w-6" />} label={t.tiles.published} value={instructions.isLoading ? null : published.length} hint={stationCount ? t.tiles.coverage(coverage) : t.tiles.noStation} />
        {can('stats') ? (
          <Tile className="from-sky-500 to-blue-700" icon={<MapPin className="h-6 w-6" />} label={t.tiles.views} value={views.isLoading ? null : views.data ?? 0} hint={t.tiles.viewsHint} href="/statistiques" />
        ) : (
          <Tile className="from-sky-500 to-blue-700" icon={<MapPin className="h-6 w-6" />} label={t.tiles.stations} value={stations.isLoading ? null : stationCount} hint={t.tiles.stationsHint} href="/postes" />
        )}
        <Tile className="from-orange-400 to-rose-500" icon={<Flame className="h-6 w-6" />} label={t.tiles.streak} value={instructions.isLoading ? null : streak} hint={streak ? t.tiles.streakWeeks(streak) : t.tiles.streakStart} />
      </div>

      {can('approve', 'write') && review.length > 0 && (
        <section>
          <SectionTitle title={t.review.title(review.length)} hint={t.review.hint} />
          <div className="space-y-2">
            {review.map((d) => (
              <InstructionRow key={d._id} doc={d} stationNames={d.json_data.stationIds.map((s) => stationName.get(s) ?? '').filter(Boolean)} />
            ))}
          </div>
        </section>
      )}

      {can('feedback', 'write') && (feedback.data?.length ?? 0) > 0 && (
        <section>
          <SectionTitle title={t.feedback.title} action={<Link href="/retours" className="text-sm font-black text-[var(--primary)]">{t.feedback.seeAll}</Link>} />
          <div className="grid gap-3 md:grid-cols-3">
            {(feedback.data ?? []).slice(0, 3).map((f) => (
              <Link key={f._id} href={`/instructions/${f.json_data.instructionId}?etape=${f.json_data.stepId ?? ''}&retour=${f._id}`} className="btn-press lift glass-card block rounded-[24px] p-4">
                <span className={cn('inline-flex rounded-lg bg-gradient-to-br px-2 py-1 text-[10px] font-black tracking-widest text-white uppercase', FEEDBACK_KINDS[f.json_data.kind].className)}>{FEEDBACK_KINDS[f.json_data.kind].label}</span>
                <p className="mt-2 line-clamp-1 text-sm font-black">{f.json_data.instructionTitle}</p>
                {f.json_data.comment && <p className="line-clamp-2 text-sm font-medium text-slate-600 dark:text-slate-300">{t.feedback.quote(f.json_data.comment)}</p>}
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {t.feedback.when(f.json_data.stepIndex !== null && f.json_data.stepIndex !== undefined ? f.json_data.stepIndex + 1 : null, timeAgo(f.json_data.createdAt))}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {canCreate && myDrafts.length > 0 && (
        <section>
          <SectionTitle title={t.drafts.title} hint={t.drafts.hint} />
          <div className="space-y-2">
            {myDrafts.map((d) => (
              <InstructionRow key={d._id} doc={d} stationNames={d.json_data.stationIds.map((s) => stationName.get(s) ?? '').filter(Boolean)} />
            ))}
          </div>
        </section>
      )}

      {focusList.length > 0 && (
        <section>
          <SectionTitle title={t.forYou.title} hint={t.forYou.hint} />
          <div className="space-y-2">
            {focusList.map((d) => (
              <InstructionRow key={d._id} doc={d} stationNames={d.json_data.stationIds.map((s) => stationName.get(s) ?? '').filter(Boolean)} />
            ))}
          </div>
        </section>
      )}

      {published.length >= 10 && (
        <Card className="flex items-center gap-4">
          <Trophy className="h-10 w-10 text-amber-500" />
          <div>
            <p className="font-black">{t.library.count(published.length)}</p>
            <p className="text-sm font-bold text-slate-500">{t.library.hint}</p>
          </div>
        </Card>
      )}

      {instructions.isLoading && <Skeleton className="h-40" />}
      {can('feedback', 'write') && !feedback.data?.length && published.length > 0 && (
        <p className="flex items-center gap-2 text-sm font-bold text-slate-400">
          <MessageSquareWarning className="h-4 w-4" /> {t.feedback.none} <ClipboardCheck className="h-4 w-4" />
        </p>
      )}
    </div>
  )
}

function Tile({ className, icon, label, value, hint, href }: { className: string; icon: React.ReactNode; label: string; value: number | null; hint: string; href?: string }) {
  const body = (
    <span className={cn('relative flex h-full flex-col overflow-hidden rounded-[28px] bg-gradient-to-br p-5 text-white shadow-[0_15px_35px_rgba(15,23,42,0.12)]', className)}>
      <span className="grid-pattern absolute inset-0 opacity-60" />
      <span className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <span className="relative flex items-center justify-between">
        <span className="label-caps opacity-90">{label}</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md">{icon}</span>
      </span>
      <span className="relative mt-3 text-5xl font-black tracking-tighter tabular-nums">{value === null ? '—' : num(value)}</span>
      <span className="relative mt-1 text-sm font-bold opacity-90">{hint}</span>
    </span>
  )
  return href ? (
    <Link href={href} className="btn-press lift block">
      {body}
    </Link>
  ) : (
    body
  )
}
