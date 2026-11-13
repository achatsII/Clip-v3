'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Check, ExternalLink, Inbox, MessageSquareWarning, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { SearchField } from '@/components/ui/SearchField'
import { EmptyState, ErrorState, SkeletonRows, errorText } from '@/components/ui/States'
import { PageHeader } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { qk, useFeedback, useStations } from '@/hooks/queries'
import { useMessages } from '@/lib/i18n'
import { FEEDBACK_KINDS } from '@/lib/model/catalog'
import { nowIso, T } from '@/lib/model/repo'
import type { FeedbackKind } from '@/lib/model/types'
import { cn, timeAgo } from '@/lib/util/cn'
import { matchesTokens, SEARCH_FROM, searchTokens } from '@/lib/util/people'

export default function FeedbackPage() {
  const { data, profile, displayName } = useSession()
  const t = useMessages().feedback.list
  const qc = useQueryClient()
  const toast = useToast()
  const [status, setStatus] = useState<'new' | 'done'>('new')
  const [kind, setKind] = useState<FeedbackKind | 'all'>('all')
  // Des centaines de retours : chaque mot cherché dans l'instruction, le commentaire, qui et où.
  const [query, setQuery] = useState('')
  const words = useMessages()
  const feedback = useFeedback()
  const stations = useStations()
  const stationName = new Map((stations.data ?? []).map((s) => [s._id, s.json_data.name]))

  const tokens = searchTokens(query)
  const inStatus = (feedback.data ?? []).filter((f) => (status === 'new' ? f.json_data.status === 'new' : f.json_data.status !== 'new'))
  const list = inStatus
    .filter((f) => kind === 'all' || f.json_data.kind === kind)
    .filter((f) => matchesTokens(tokens, f.json_data.instructionTitle, f.json_data.comment, f.json_data.authorName, f.json_data.stationId ? stationName.get(f.json_data.stationId) : null))
    // Les dangers d'abord.
    .sort((a, b) => Number(b.json_data.kind === 'danger') - Number(a.json_data.kind === 'danger'))
  const newCount = (feedback.data ?? []).filter((f) => f.json_data.status === 'new').length

  async function resolve(id: string, next: 'done' | 'dismissed') {
    try {
      await data.patch(T.feedback, id, { status: next, resolvedBy: profile.userId, resolvedAt: nowIso(), resolution: next === 'done' ? t.handledBy(displayName) : t.dismissedBy(displayName) })
      await qc.invalidateQueries({ queryKey: qk.feedback })
      await qc.invalidateQueries({ queryKey: ['feedback-count'] })
      toast.success(next === 'done' ? t.markedHandled : t.dismissed)
    } catch (e) {
      toast.error(t.updateFailed, errorText(e))
    }
  }

  return (
    <div>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <div className="no-scrollbar mb-5 flex items-center gap-2 overflow-x-auto">
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: 'new', label: t.open(newCount) },
            { value: 'done', label: t.handled },
          ]}
        />
        {(['all', 'danger', 'unclear', 'error', 'idea'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={cn('btn-press h-11 shrink-0 rounded-2xl px-4 text-xs font-black', kind === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card')}>
            {k === 'all' ? t.all : FEEDBACK_KINDS[k].label}
          </button>
        ))}
      </div>
      {inStatus.length > SEARCH_FROM && <SearchField value={query} onChange={setQuery} placeholder={t.search} className="mb-4" />}
      {feedback.isLoading ? (
        <SkeletonRows />
      ) : feedback.error ? (
        <ErrorState error={feedback.error} onRetry={() => feedback.refetch()} />
      ) : !list.length && (tokens.length > 0 || kind !== 'all') ? (
        <p className="glass-card rounded-[24px] p-6 text-center font-bold text-slate-500">
          {words.common.noMatch}{' '}
          <button type="button" onClick={() => { setQuery(''); setKind('all') }} className="font-black text-[var(--primary)]">
            {words.common.showAll}
          </button>
        </p>
      ) : !list.length ? (
        <EmptyState
          icon={status === 'new' ? <Inbox className="h-7 w-7" /> : <MessageSquareWarning className="h-7 w-7" />}
          title={status === 'new' ? t.emptyOpenTitle : t.emptyHandledTitle}
          description={status === 'new' ? t.emptyOpenDescription : t.emptyHandledDescription}
        />
      ) : (
        <div className="space-y-3">
          {list.map((f) => {
            const j = f.json_data
            return (
              <article key={f._id} className={cn('glass-card flex flex-col gap-4 rounded-[28px] p-4 sm:flex-row sm:items-center', j.kind === 'danger' && j.status === 'new' && 'ring-2 ring-rose-400')}>
                <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl', FEEDBACK_KINDS[j.kind].className)} aria-hidden>
                  {j.kind === 'unclear' ? '🤔' : j.kind === 'error' ? '❌' : j.kind === 'danger' ? '⚠️' : j.kind === 'idea' ? '💡' : '👍'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-black">
                    {FEEDBACK_KINDS[j.kind].label} · {j.instructionTitle ?? t.untitled}
                    {j.stepIndex !== null && j.stepIndex !== undefined && <span className="text-slate-400"> · {t.step(j.stepIndex + 1)}</span>}
                  </p>
                  {j.comment && <p className="mt-0.5 font-medium text-slate-600 dark:text-slate-300">{t.comment(j.comment)}</p>}
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {j.authorName ?? t.operator} · {j.stationId ? `${stationName.get(j.stationId) ?? t.station} · ` : ''}
                    {j.source === 'kiosk' ? t.sources.kiosk : j.source === 'link' ? t.sources.link : t.sources.app} · {timeAgo(j.createdAt)}
                    {j.version ? ` · v${j.version}` : ''}
                  </p>
                  {j.resolution && <p className="mt-1 text-xs font-bold text-emerald-600">{j.resolution}</p>}
                </div>
                {j.photoUrl && (
                  <a href={j.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={j.photoUrl} alt={t.photo} className="h-20 w-28 rounded-2xl object-cover" />
                  </a>
                )}
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/instructions/${j.instructionId}?etape=${j.stepId ?? ''}&retour=${f._id}`} className="btn-press bg-gradient-primary shadow-primary inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black text-white">
                    <ExternalLink className="h-4 w-4" /> {t.fix}
                  </Link>
                  {j.status === 'new' && (
                    <>
                      <Button size="sm" icon={<Check className="h-4 w-4" />} onClick={() => resolve(f._id, 'done')}>
                        {t.markHandled}
                      </Button>
                      <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => resolve(f._id, 'dismissed')}>
                        {t.dismiss}
                      </Button>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
