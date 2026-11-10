'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Check, ExternalLink, Inbox, MessageSquareWarning, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { EmptyState, ErrorState, SkeletonRows, errorText } from '@/components/ui/States'
import { PageHeader } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { qk, useFeedback, useStations } from '@/hooks/queries'
import { FEEDBACK_KINDS } from '@/lib/model/catalog'
import { nowIso, T } from '@/lib/model/repo'
import type { FeedbackKind } from '@/lib/model/types'
import { cn, timeAgo } from '@/lib/util/cn'

export default function FeedbackPage() {
  const { data, profile, displayName } = useSession()
  const qc = useQueryClient()
  const toast = useToast()
  const [status, setStatus] = useState<'new' | 'done'>('new')
  const [kind, setKind] = useState<FeedbackKind | 'all'>('all')
  const feedback = useFeedback()
  const stations = useStations()
  const stationName = new Map((stations.data ?? []).map((s) => [s._id, s.json_data.name]))

  const list = useMemo(
    () =>
      (feedback.data ?? [])
        .filter((f) => (status === 'new' ? f.json_data.status === 'new' : f.json_data.status !== 'new'))
        .filter((f) => kind === 'all' || f.json_data.kind === kind)
        // Les dangers d'abord.
        .sort((a, b) => Number(b.json_data.kind === 'danger') - Number(a.json_data.kind === 'danger')),
    [feedback.data, status, kind],
  )
  const newCount = (feedback.data ?? []).filter((f) => f.json_data.status === 'new').length

  async function resolve(id: string, next: 'done' | 'dismissed') {
    try {
      await data.patch(T.feedback, id, { status: next, resolvedBy: profile.userId, resolvedAt: nowIso(), resolution: next === 'done' ? `Traité par ${displayName}` : `Écarté par ${displayName}` })
      await qc.invalidateQueries({ queryKey: qk.feedback })
      await qc.invalidateQueries({ queryKey: ['feedback-count'] })
      toast.success(next === 'done' ? 'Retour marqué comme traité' : 'Retour écarté')
    } catch (e) {
      toast.error('Le retour n’a pas été mis à jour', errorText(e))
    }
  }

  return (
    <div>
      <PageHeader title="Retours des opérateurs" subtitle="Ce que le plancher signale : corrigez l’étape en un geste, l’opérateur verra la nouvelle version." />
      <div className="no-scrollbar mb-5 flex items-center gap-2 overflow-x-auto">
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: 'new', label: `À traiter${newCount ? ` (${newCount})` : ''}` },
            { value: 'done', label: 'Traités' },
          ]}
        />
        {(['all', 'danger', 'unclear', 'error', 'idea'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={cn('btn-press h-11 shrink-0 rounded-2xl px-4 text-xs font-black', kind === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card')}>
            {k === 'all' ? 'Tous' : FEEDBACK_KINDS[k].label}
          </button>
        ))}
      </div>
      {feedback.isLoading ? (
        <SkeletonRows />
      ) : feedback.error ? (
        <ErrorState error={feedback.error} onRetry={() => feedback.refetch()} />
      ) : !list.length ? (
        <EmptyState
          icon={status === 'new' ? <Inbox className="h-7 w-7" /> : <MessageSquareWarning className="h-7 w-7" />}
          title={status === 'new' ? 'Rien à traiter' : 'Aucun retour traité'}
          description={status === 'new' ? 'Les opérateurs signalent une étape pas claire depuis le lecteur, en deux touchers. Leurs retours arriveront ici.' : 'Les retours que vous traitez s’affichent ici.'}
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
                    {FEEDBACK_KINDS[j.kind].label} · {j.instructionTitle ?? 'Instruction'}
                    {j.stepIndex !== null && j.stepIndex !== undefined && <span className="text-slate-400"> · étape {j.stepIndex + 1}</span>}
                  </p>
                  {j.comment && <p className="mt-0.5 font-medium text-slate-600 dark:text-slate-300">« {j.comment} »</p>}
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {j.authorName ?? 'Opérateur'} · {j.stationId ? `${stationName.get(j.stationId) ?? 'poste'} · ` : ''}
                    {j.source === 'kiosk' ? 'tablette' : j.source === 'link' ? 'lien' : 'app'} · {timeAgo(j.createdAt)}
                    {j.version ? ` · v${j.version}` : ''}
                  </p>
                  {j.resolution && <p className="mt-1 text-xs font-bold text-emerald-600">{j.resolution}</p>}
                </div>
                {j.photoUrl && (
                  <a href={j.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={j.photoUrl} alt="Photo jointe" className="h-20 w-28 rounded-2xl object-cover" />
                  </a>
                )}
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/instructions/${j.instructionId}?etape=${j.stepId ?? ''}&retour=${f._id}`} className="btn-press bg-gradient-primary shadow-primary inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black text-white">
                    <ExternalLink className="h-4 w-4" /> Corriger
                  </Link>
                  {j.status === 'new' && (
                    <>
                      <Button size="sm" icon={<Check className="h-4 w-4" />} onClick={() => resolve(f._id, 'done')}>
                        Traité
                      </Button>
                      <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => resolve(f._id, 'dismissed')}>
                        Écarter
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
