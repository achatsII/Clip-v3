'use client'

/**
 * Réglages › Standard de rédaction, avec l'IA qui apprend (toggle `learnFromEdits`) :
 * - « Mes préférences de rédaction » : pour tous ceux qui rédigent ; leurs règles (versionnées, avec
 *   retour en arrière), ce qu'ils ont demandé après une génération, leurs modèles, et ce que leurs
 *   corrections proposent ;
 * - pour l'usine (droit de régler) : ce que les corrections de l'équipe proposent, « Analyser avec
 *   l'IA », et les instructions modèles de l'usine.
 */
import { useQuery } from '@tanstack/react-query'
import { History, Plus, RotateCcw, Sparkles, Star, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button, IconButton } from '@/components/ui/Button'
import { AutoTextarea, fieldLook } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { errorText, Skeleton } from '@/components/ui/States'
import { Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { useLearning } from '@/hooks/useLearning'
import { LockBadge } from '@/components/billing/Billing'
import { useBilling, useEntitlement } from '@/lib/billing/state'
import { rulesFromEdits } from '@/lib/ai/learn'
import { getLang, useMessages } from '@/lib/i18n'
import type { Proposal } from '@/lib/learning/proposals'
import { proposalsFor, recentEdits, teamProposals } from '@/lib/learning/store'
import type { ModelExample } from '@/lib/model/types'
import { formatDate } from '@/lib/util/cn'

/** Une proposition : ce qui a été remarqué, la règle, et les gestes. */
function ProposalRow({ p, actions }: { p: Proposal; actions: React.ReactNode }) {
  const t = useMessages().learning
  return (
    <li className="glass-card flex flex-col gap-2 rounded-2xl p-3 sm:flex-row sm:items-center">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{p.rule}</span>
        <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">
          {p.kind === 'ai' ? p.seen : `${p.seen} · ${t.seen.evidence(p.count, p.of)}`}
        </span>
      </span>
      <span className="flex shrink-0 gap-2">{actions}</span>
    </li>
  )
}

/** Les instructions modèles : leur titre, ce qui les rend bonnes ; on en retire une d'un geste. */
function Examples({ list, onRemove }: { list: ModelExample[]; onRemove?: (id: string) => void }) {
  const t = useMessages().learning.model
  if (!list.length) return null
  return (
    <div className="mt-5">
      <p className="label-caps mb-1 text-slate-500 dark:text-slate-400">{t.examples}</p>
      <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t.examplesHint}</p>
      <ul className="space-y-2">
        {list.map((ex) => (
          <li key={ex.instructionId} className="glass-card flex items-center gap-3 rounded-2xl p-3">
            <Star className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black">{ex.title}</span>
              {ex.why && <span className="block truncate text-xs font-bold text-slate-500 dark:text-slate-400">{ex.why}</span>}
            </span>
            {onRemove && (
              <IconButton label={t.remove} onClick={() => onRemove(ex.instructionId)}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Mes préférences de rédaction : pour tous ceux qui rédigent. */
export function MyWritingPanel() {
  const { data, org, profile } = useSession()
  const words = useMessages()
  const t = words.learning
  const toast = useToast()
  const learning = useLearning()
  const mine = learning.personal
  const [draft, setDraft] = useState<string[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => setDraft(mine?.rules ?? []), [mine?.rules])
  const dirty = JSON.stringify(draft.map((r) => r.trim()).filter(Boolean)) !== JSON.stringify(mine?.rules ?? [])

  // Ce que mes dernières corrections proposent.
  const edits = useQuery({ queryKey: ['edits', 'mine', profile.userId], queryFn: () => recentEdits(data, { userId: profile.userId }), staleTime: 60_000 })
  const proposals = edits.data ? proposalsFor(edits.data.map((d) => d.json_data.signals), org.json_data, mine) : []

  async function save() {
    setBusy(true)
    try {
      const next = await learning.saveMine(() => ({ rules: draft }))
      toast.success(t.mine.saved(next.json_data.version))
    } catch (e) {
      toast.error(t.mine.saveFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  if (learning.loading) return <Skeleton className="h-40 w-full rounded-[28px]" />
  const version = mine?.version ?? 0
  return (
    <Panel>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight">{t.mine.title}</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.mine.intro}</p>
        </div>
        {!!mine?.history.length && (
          <Button size="sm" icon={<History className="h-4 w-4" />} onClick={() => setHistoryOpen(true)}>
            {t.mine.history}
          </Button>
        )}
      </div>

      {draft.length ? (
        <div className="space-y-2">
          {draft.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex h-12 w-8 shrink-0 items-center justify-center text-sm font-black text-slate-400 tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <AutoTextarea singleLine aria-label={t.mine.rule(i + 1)} value={r} placeholder={t.mine.placeholder} className={fieldLook} onChange={(e) => setDraft(draft.map((x, j) => (j === i ? e.target.value : x)))} />
              </div>
              <IconButton label={t.mine.remove} onClick={() => setDraft(draft.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm font-bold text-slate-400">{t.mine.empty}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setDraft([...draft, ''])} className="btn-press inline-flex h-11 items-center gap-1 text-sm font-black text-[var(--primary)]">
          <Plus className="h-4 w-4" /> {t.mine.add}
        </button>
        {dirty && (
          <span className="flex gap-2">
            <Button onClick={() => setDraft(mine?.rules ?? [])}>{words.common.cancel}</Button>
            <Button variant="primary" loading={busy} onClick={() => void save()}>
              {t.mine.save(version + 1)}
            </Button>
          </span>
        )}
      </div>

      {proposals.length > 0 && (
        <div className="mt-5">
          <p className="label-caps mb-2 text-slate-500 dark:text-slate-400">{t.proposals.mine}</p>
          <ul className="space-y-2">
            {proposals.map((p) => (
              <ProposalRow
                key={p.key}
                p={p}
                actions={
                  <>
                    <Button size="sm" variant="ghost" onClick={() => void learning.dismiss(p, 'me')}>
                      {t.proposals.dismiss}
                    </Button>
                    <Button size="sm" onClick={() => void learning.forMe(p).then(() => toast.success(t.card.addedMine))}>
                      {t.proposals.add}
                    </Button>
                  </>
                }
              />
            ))}
          </ul>
        </div>
      )}

      {!!mine?.learnings.length && (
        <div className="mt-5">
          <p className="label-caps mb-2 text-slate-500 dark:text-slate-400">{t.mine.asked}</p>
          <ul className="space-y-2">
            {mine.learnings.map((l, i) => (
              <li key={`${l.at}-${i}`} className="glass-card flex items-center gap-3 rounded-2xl p-3">
                <span className="flex-1 text-sm font-bold">{l.text}</span>
                <span className="text-xs font-bold text-slate-400">{formatDate(l.at)}</span>
                <IconButton label={t.mine.forget} onClick={() => void learning.saveMine((m) => ({ learnings: m.learnings.filter((_, j) => j !== i) }))}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Examples list={mine?.examples ?? []} onRemove={(id) => void learning.saveMine((m) => ({ examples: m.examples.filter((x) => x.instructionId !== id) }))} />

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={t.mine.historyTitle}>
        <ol className="space-y-2">
          {(mine?.history ?? []).map((v) => (
            <li key={`${v.version}-${v.at}`} className="glass-card flex items-center gap-3 rounded-2xl p-3">
              <span className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white">v{v.version}</span>
              <span className="flex-1 text-sm font-bold">
                {t.mine.count(v.rules.length)} · {formatDate(v.at)}
              </span>
              <Button
                size="sm"
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={() => {
                  setDraft(v.rules)
                  setHistoryOpen(false)
                  toast.info(t.mine.restored(v.version))
                }}
              >
                {t.mine.restore}
              </Button>
            </li>
          ))}
        </ol>
      </Modal>
    </Panel>
  )
}

/** Pour l'usine (droit de régler) : ce que les corrections de l'équipe proposent, et ses modèles. */
export function TeamLearningPanel() {
  const { data, ai, org } = useSession()
  const t = useMessages().learning
  const toast = useToast()
  const learning = useLearning()
  // Dès Équipe (feature `ai_learning`) : sans le droit, ce que l'équipe a déjà appris se devine, et le plan l'ouvre.
  const teamRight = useEntitlement('ai_learning')
  const { openPaywall } = useBilling()
  const edits = useQuery({ queryKey: ['edits', 'team'], queryFn: () => recentEdits(data, { limit: 30 }), staleTime: 60_000 })
  const [fromAi, setFromAi] = useState<Proposal[]>([])
  const [busy, setBusy] = useState(false)
  const records = edits.data ?? []
  const proposals = [...teamProposals(records.map((d) => d.json_data.signals), org.json_data), ...fromAi.filter((p) => !org.json_data.standard.rules.includes(p.rule))]
  const authors = new Set(records.map((d) => d.json_data.userId)).size

  async function analyze() {
    setBusy(true)
    try {
      const examples = records.flatMap((d) => d.json_data.signals.examples)
      const r = await rulesFromEdits(ai, examples, { current: org.json_data.standard.rules, language: getLang() })
      setFromAi(r.rules.map((rule, i) => ({ key: `ai:${Date.now()}:${i}`, kind: 'ai', seen: t.proposals.fromAi, count: records.length, of: records.length, rule })))
      toast.info(t.proposals.analyzed(r.rules.length), r.explanation || undefined)
    } catch (e) {
      toast.error(t.proposals.analyzeFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function keep(p: Proposal) {
    const v = await learning.forOrg(p)
    setFromAi((list) => list.filter((x) => x.key !== p.key))
    toast.success(t.card.addedOrg(v))
  }

  const examples = org.json_data.standard.examples ?? []
  if (edits.isLoading) return <Skeleton className="h-32 w-full rounded-[28px]" />
  if (teamRight === 'locked')
    return (
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black tracking-tight">
              {t.proposals.team} <LockBadge />
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{proposals.length ? t.proposals.lockedReady(proposals.length) : t.proposals.lockedHint}</p>
          </div>
          <Button size="sm" onClick={() => openPaywall({ feature: 'ai_learning' })}>
            {t.proposals.unlock}
          </Button>
        </div>
      </Panel>
    )
  return (
    <Panel>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight">{t.proposals.team}</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{records.length ? t.proposals.teamCount(authors, records.length) : t.proposals.notEnough}</p>
        </div>
        <Button size="sm" loading={busy} disabled={!records.some((d) => d.json_data.signals.examples.length)} onClick={() => void analyze()} icon={<Sparkles className="h-4 w-4" />} title={t.proposals.analyzeHint}>
          {t.proposals.analyze}
        </Button>
      </div>
      {proposals.length > 0 && (
        <ul className="space-y-2">
          {proposals.map((p) => (
            <ProposalRow
              key={p.key}
              p={p}
              actions={
                <>
                  <Button size="sm" variant="ghost" onClick={() => (p.key.startsWith('ai:') ? setFromAi((l) => l.filter((x) => x.key !== p.key)) : void learning.dismiss(p, 'org'))}>
                    {t.proposals.dismiss}
                  </Button>
                  <Button size="sm" onClick={() => void keep(p)}>
                    {t.proposals.addOrg}
                  </Button>
                </>
              }
            />
          ))}
        </ul>
      )}
      <Examples list={examples} onRemove={(id) => void learning.saveOrg((s) => ({ ...s, examples: (s.examples ?? []).filter((x) => x.instructionId !== id) }))} />
    </Panel>
  )
}
