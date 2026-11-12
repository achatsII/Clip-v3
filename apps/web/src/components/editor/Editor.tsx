'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Check,
  CircleCheck,
  CloudOff,
  Copy,
  Eye,
  FileDown,
  FileJson,
  History,
  Languages,
  ListChecks,
  Loader2,
  MessageCircleQuestion,
  MessageSquare,
  MonitorSmartphone,
  Send,
  Share2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button, LinkButton } from '@/components/ui/Button'
import { Confetti } from '@/components/ui/Celebrate'
import { useConfirm } from '@/components/ui/Confirm'
import { AutoTextarea, Input, Segmented, Textarea } from '@/components/ui/Field'
import { Menu } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { Badge } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { qk, useFeedback, useInstructions } from '@/hooks/queries'
import { LockBadge } from '@/components/billing/Billing'
import { useBilling, useEntitlement, useGate, useLimit } from '@/lib/billing/state'
import { useToggle } from '@/lib/toggles'
import type { Doc } from '@/lib/gateway/data'
import { useMessages } from '@/lib/i18n'
import { diffSteps } from '@/lib/model/diff'
import { FEEDBACK_KINDS, STATUS } from '@/lib/model/catalog'
import { nowIso, T, uid } from '@/lib/model/repo'
import {
  archiveInstruction,
  duplicateInstruction,
  needsApproval,
  publishInstruction,
  requestChanges,
  requestReview,
  restoreVersion,
  saveDraft,
  saveSources,
  updatePublishedStations,
} from '@/lib/model/service'
import type { Instruction, InstructionContent, Published, Source, Station, Step } from '@/lib/model/types'
import { cn, timeAgo } from '@/lib/util/cn'
import { AgentPanel, type AgentRequest } from './AgentPanel'
import { HistoryDialog, ShareDialog, TranslateDialog } from './Dialogs'
import { LockoutEditor } from './LockoutEditor'
import { MetaCard } from './MetaCard'
import { QuestionsDialog, type QuestionAnswer } from './QuestionsDialog'
import { StageEditor } from './StageEditor'
import { StepEditor } from './StepEditor'
import { StepList } from './StepList'

type SaveState = 'saved' | 'saving' | 'error'

function newStep(): Step {
  return { id: uid('st_'), title: '', text: '', keyPoints: [], warning: null, media: [] }
}

export function Editor({ doc, stations, onRegenerate }: { doc: Doc<Instruction>; stations: Doc<Station>[]; onRegenerate: () => void }) {
  const session = useSession()
  const { data, org, role, profile, displayName, can } = session
  const actor = useMemo(() => ({ id: profile.userId, name: displayName }), [profile.userId, displayName])
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const t = useMessages()
  const tp = t.editor.page
  const router = useRouter()
  const params = useSearchParams()
  const instr = doc.json_data
  const readOnly = !can('instructions', 'write')

  const [content, setContent] = useState<InstructionContent>(instr.draft!)
  const [sources, setSources] = useState<Source[]>(instr.sources)
  const [stationIds, setStationIds] = useState<string[]>(instr.stationIds)
  const [selected, setSelected] = useState<string | null>(params.get('etape') ?? instr.draft?.steps[0]?.id ?? null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [publishing, setPublishing] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [dialog, setDialog] = useState<null | 'share' | 'history' | 'translate' | 'changes' | 'review' | 'checks'>(null)
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(instr.generation?.rating ?? null)
  const [ratingComment, setRatingComment] = useState<string | null>(null)
  const [questions, setQuestions] = useState<string[]>(instr.generation?.questions ?? [])
  const questionsRef = useRef(questions)
  questionsRef.current = questions
  const [questionsOpen, setQuestionsOpen] = useState(false)
  const [agentRequest, setAgentRequest] = useState<AgentRequest | null>(null)
  /** Retire des questions de l'IA celles qui sont réglées (vérifiées, ou répondues et corrigées). */
  const settleQuestions = (done: string[]) => {
    const next = questionsRef.current.filter((q) => !done.includes(q))
    setQuestions(next)
    void data.patch(T.instruction, doc._id, { 'generation.questions': next })
  }
  const answerQuestions = (answers: QuestionAnswer[]) => {
    setQuestionsOpen(false)
    setAgentRequest({
      id: Date.now(),
      text: tp.questions.request(answers),
      onDone: (ok) => ok && settleQuestions(answers.map((a) => a.question)),
    })
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(content)
  latest.current = content
  const docRef = useRef(doc)
  docRef.current = doc

  const published = useQuery({
    queryKey: ['published', doc._id, instr.publishedId],
    queryFn: () => (instr.publishedId ? data.get<Published>(T.published, instr.publishedId) : Promise.resolve(null)),
    enabled: !!instr.publishedId,
  })
  const feedback = useFeedback({ 'json_data.instructionId': { $eq: doc._id }, 'json_data.status': { $eq: 'new' } }, qk.feedbackFor(doc._id))
  const instructions = useInstructions()
  const feedbackByStep = useMemo(() => {
    const m: Record<string, number> = {}
    for (const f of feedback.data ?? []) if (f.json_data.stepId) m[f.json_data.stepId] = (m[f.json_data.stepId] ?? 0) + 1
    return m
  }, [feedback.data])
  const highlightFeedback = params.get('retour') ? (feedback.data ?? []).find((f) => f._id === params.get('retour')) : undefined

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    setSaveState('saving')
    try {
      await saveDraft(data, doc._id, docRef.current.json_data, latest.current, actor)
      setSaveState('saved')
    } catch {
      setSaveState('error')
      throw new Error('save')
    }
  }, [data, doc._id, actor])

  const update = useCallback(
    (next: InstructionContent) => {
      setContent(next)
      setSaveState('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush().catch(() => undefined), 900)
    },
    [flush],
  )

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
        void saveDraft(data, doc._id, docRef.current.json_data, latest.current, actor).catch(() => undefined)
      }
    },
    [data, doc._id, actor],
  )

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (timer.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: qk.instruction(doc._id) })
    void qc.invalidateQueries({ queryKey: qk.instructions })
  }

  const saveLabel = saveState === 'saving' ? tp.saveState.saving : saveState === 'error' ? tp.saveState.error : tp.saveState.saved
  const steps = content.steps
  const idx = Math.max(0, steps.findIndex((s) => s.id === selected))
  const step = steps[idx]
  const changes = instr.publishedVersion && published.data ? diffSteps(published.data.json_data.content, content) : undefined
  const isDirty = !instr.publishedVersion || instr.dirty || saveState === 'saving' || (changes ? Object.values(changes).some((c) => c !== 'same') || published.data?.json_data.content.title !== content.title : true)

  // La vue de modification, retenue sur l'appareil.
  const [view, setView] = useState<'form' | 'stage'>('form')
  useEffect(() => {
    try {
      if (localStorage.getItem('clip_pref_editor_view') === 'stage') setView('stage')
    } catch {
      /* préférence facultative */
    }
  }, [])
  const chooseView = (v: 'form' | 'stage') => {
    setView(v)
    try {
      localStorage.setItem('clip_pref_editor_view', v)
    } catch {
      /* préférence facultative */
    }
  }

  // L'assistant amène l'écran à l'étape qu'il modifie, et l'entoure pendant qu'il travaille.
  const [agentStep, setAgentStep] = useState<string | null>(null)
  const [agentOpen, setAgentOpen] = useState(false)
  const focusStep = useCallback((id: string | null) => {
    if (!id) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSelected(id)
    requestAnimationFrame(() => document.getElementById('step-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [])

  function setStep(s: Step) {
    update({ ...content, steps: steps.map((x) => (x.id === s.id ? s : x)) })
  }
  function moveStep(dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= steps.length) return
    const next = [...steps]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    update({ ...content, steps: next })
  }
  function insertAfter(i: number) {
    const s = newStep()
    const next = [...steps.slice(0, i + 1), s, ...steps.slice(i + 1)]
    update({ ...content, steps: next })
    setSelected(s.id)
  }

  async function changeStations(ids: string[]) {
    setStationIds(ids)
    try {
      await updatePublishedStations(data, doc, ids)
      refresh()
    } catch (e) {
      toast.error(tp.toasts.stationNotSaved, errorText(e))
    }
  }

  async function createStation(name: string): Promise<string | null> {
    if (!name) return null
    try {
      const d = await data.insert<Station>(T.station, { name, kind: 'poste', createdAt: nowIso(), linkMode: 'focus' }, name)
      void qc.invalidateQueries({ queryKey: qk.stations })
      toast.success(tp.toasts.stationCreated, name)
      return d._id
    } catch (e) {
      toast.error(tp.toasts.stationNotCreated, errorText(e))
      return null
    }
  }

  const problems = useMemo(() => {
    const p: string[] = []
    const untitled = steps.filter((s) => !s.title.trim()).length
    if (!steps.length) p.push(tp.problems.noSteps)
    if (untitled) p.push(tp.problems.untitled(untitled))
    return p
  }, [steps, tp])
  const notes = useMemo(() => {
    const n: string[] = []
    const noMedia = steps.filter((s) => !s.media.length).length
    if (noMedia) n.push(tp.notes.noMedia(noMedia))
    if (!stationIds.length) n.push(tp.notes.noStation)
    if (questions.length) n.push(tp.notes.questions(questions.length))
    if (content.kind === 'lockout' && content.lockout?.energyPoints.some((e) => !e.isolationDevice || !e.verification)) n.push(tp.notes.lockoutIncomplete)
    return n
  }, [steps, stationIds, questions, content, tp])

  async function doPublish(approvedBy?: { id: string; name: string }) {
    setPublishing(true)
    try {
      await flush()
      const current = { ...doc, json_data: { ...docRef.current.json_data, draft: latest.current, stationIds } }
      const n = await publishInstruction(data, current, org.json_data, actor, { approvedBy, previous: published.data?.json_data.content ?? null })
      setCelebrate(true)
      setTimeout(() => setCelebrate(false), 2800)
      toast.success(tp.toasts.published(n), stationIds.length ? tp.toasts.visibleNow : tp.toasts.addStation, { label: tp.toasts.view, onClick: () => router.push(`/instructions/${doc._id}/lire`) })
      setDialog(null)
      refresh()
      void qc.invalidateQueries({ queryKey: ['published', doc._id] })
    } catch (e) {
      toast.error(tp.toasts.publishFailed, e instanceof Error && e.message !== 'save' ? e.message : tp.toasts.tryAgain)
    } finally {
      setPublishing(false)
    }
  }

  async function doRequestReview() {
    setPublishing(true)
    try {
      await flush()
      await requestReview(data, { ...doc, json_data: { ...docRef.current.json_data, stationIds } }, org.json_data, actor, comment)
      toast.success(tp.toasts.reviewSent, tp.toasts.reviewSentDetail)
      setDialog(null)
      setComment('')
      refresh()
    } catch (e) {
      toast.error(tp.toasts.reviewFailed, errorText(e))
    } finally {
      setPublishing(false)
    }
  }

  async function doRequestChanges() {
    if (!comment.trim()) return
    setPublishing(true)
    try {
      await requestChanges(data, doc, actor, comment.trim())
      toast.success(tp.toasts.changesSent, tp.toasts.changesSentDetail(instr.review?.requestedByName))
      setDialog(null)
      setComment('')
      refresh()
    } catch (e) {
      toast.error(tp.toasts.sendFailed, errorText(e))
    } finally {
      setPublishing(false)
    }
  }

  async function rate(value: 'up' | 'down', text?: string) {
    setRating(value)
    await data.patch(T.instruction, doc._id, { 'generation.rating': value, 'generation.comment': text ?? null }).catch(() => undefined)
    if (value === 'down' && text?.trim()) {
      await session.updateOrg({ learnings: [...org.json_data.learnings, { text: text.trim(), at: nowIso() }].slice(-30) }).catch(() => undefined)
      toast.success(tp.rating.noted, tp.rating.notedDetail)
    } else if (value === 'up') toast.success(tp.rating.thanks)
  }

  function exportJson() {
    const payload = { format: 'clip-v3/instruction', version: instr.publishedVersion, exportedAt: nowIso(), instruction: { id: doc._id, ...instr, draft: content, sources: sources.map(({ geminiFileUri: _g, geminiExpiresAt: _e, ...s }) => s) } }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${content.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 60) || 'instruction'}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }

  const approval = needsApproval(org.json_data, role)
  const canApprove = can('approve', 'write')
  const inReview = instr.status === 'review'
  // Limite d'instructions publiées : une instruction déjà publiée se republie toujours.
  const publishLimit = useLimit('published_instructions', instructions.data?.filter((d) => d.json_data.publishedVersion).length)
  const blockedByLimit = !instr.publishedVersion && !!publishLimit?.reached
  const translations = useEntitlement('translations')
  const translateToggle = useToggle('translations')
  const gate = useGate()
  const { openPaywall } = useBilling()

  const primary = readOnly ? null : inReview ? (
    canApprove ? (
      <Button variant="success" size="lg" loading={publishing} onClick={() => doPublish(actor)} icon={<CircleCheck className="h-5 w-5" />}>
        {tp.actions.approveAndPublish}
      </Button>
    ) : (
      <Badge tone="warning" className="h-12 px-4 text-xs">{tp.actions.awaitingApproval}</Badge>
    )
  ) : !isDirty ? (
    <LinkButton href={`/instructions/${doc._id}/lire`} variant="primary" size="lg" icon={<Eye className="h-5 w-5" />}>
      {tp.actions.viewAtStation}
    </LinkButton>
  ) : approval ? (
    <Button variant="primary" size="lg" disabled={!!problems.length} onClick={() => (blockedByLimit ? openPaywall({ feature: 'published_instructions', used: publishLimit?.used, retry: () => setDialog('review') }) : setDialog('review'))} icon={<Send className="h-5 w-5" />}>
      {tp.actions.requestApproval} {blockedByLimit && <LockBadge />}
    </Button>
  ) : (
    <Button variant="primary" size="lg" disabled={!!problems.length} loading={publishing} onClick={() => (blockedByLimit ? openPaywall({ feature: 'published_instructions', used: publishLimit?.used, retry: () => setDialog('checks') }) : setDialog('checks'))} icon={<Send className="h-5 w-5" />}>
      {instr.publishedVersion ? tp.actions.publishVersion(instr.publishedVersion + 1) : tp.actions.publish} {blockedByLimit && <LockBadge />}
    </Button>
  )

  function duplicateStep() {
    if (!step) return
    const copy = { ...step, id: uid('st_') }
    update({ ...content, steps: [...steps.slice(0, idx + 1), copy, ...steps.slice(idx + 1)] })
    setSelected(copy.id)
  }

  async function deleteStep() {
    if (!step) return
    if (!(await confirm({ title: tp.deleteStepTitle(idx + 1), description: step.title, confirmLabel: t.editor.step.delete, danger: true }))) return
    const next = steps.filter((s) => s.id !== step.id)
    update({ ...content, steps: next })
    setSelected(next[Math.max(0, idx - 1)]?.id ?? null)
  }

  return (
    <div className={cn('pb-40', agentOpen && 'lg:pr-[424px]')}>
      <Confetti show={celebrate} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/instructions" className="inline-flex items-center gap-1 text-sm font-black text-slate-500">
          <ArrowLeft className="h-4 w-4" /> {tp.backToList}
        </Link>
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-black', saveState === 'error' ? 'text-rose-600' : 'text-slate-400')} aria-live="polite">
          {saveState === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saveState === 'error' ? <CloudOff className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          {saveLabel}
        </span>
      </div>

      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={cn('text-white', STATUS[inReview ? 'review' : instr.publishedVersion ? 'published' : 'draft'].className)}>
              {inReview ? STATUS.review.label : instr.publishedVersion ? tp.header.publishedBadge(instr.publishedVersion) : STATUS.draft.label}
            </Badge>
            {instr.publishedVersion && isDirty && !inReview && <Badge tone="warning">{tp.header.unpublishedChanges}</Badge>}
            {instr.publishedAt && <span className="text-xs font-bold text-slate-400">{tp.header.publishedAgo(timeAgo(instr.publishedAt))}</span>}
          </div>
          <AutoTextarea
            singleLine
            value={content.title}
            readOnly={readOnly}
            onChange={(e) => update({ ...content, title: e.target.value })}
            aria-label={tp.header.titleLabel}
            className="w-full bg-transparent text-3xl leading-tight font-black tracking-tighter text-balance text-slate-900 focus:outline-none sm:text-4xl dark:text-white"
          />
          <AutoTextarea
            value={content.summary}
            readOnly={readOnly}
            onChange={(e) => update({ ...content, summary: e.target.value })}
            aria-label={tp.header.summaryLabel}
            placeholder={tp.header.summaryPlaceholder}
            className="mt-1 w-full bg-transparent text-base font-medium text-slate-500 focus:outline-none dark:text-slate-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`/instructions/${doc._id}/lire?apercu=1`} icon={<Eye className="h-4 w-4" />}>
            {tp.header.preview}
          </LinkButton>
          <Button onClick={() => setDialog('share')} icon={<Share2 className="h-4 w-4" />}>
            {tp.header.share}
          </Button>
          <Menu
            items={[
              { label: tp.menu.exportPdf, icon: <FileDown className="h-4 w-4" />, onClick: () => window.open(`/instructions/${doc._id}/imprimer`, '_blank') },
              { label: tp.menu.exportJson, icon: <FileJson className="h-4 w-4" />, onClick: exportJson },
              { label: tp.menu.history, icon: <History className="h-4 w-4" />, onClick: () => setDialog('history') },
              { label: tp.menu.translate, icon: <Languages className="h-4 w-4" />, onClick: () => gate(translations, 'translations', () => setDialog('translate')), hidden: readOnly || !translateToggle, hint: translations === 'locked' ? <LockBadge /> : undefined },
              { label: tp.menu.regenerate, icon: <Sparkles className="h-4 w-4" />, onClick: async () => (await confirm({ title: tp.menu.regenerateConfirm.title, description: tp.menu.regenerateConfirm.description, confirmLabel: tp.menu.regenerateConfirm.confirm })) && onRegenerate(), hidden: readOnly || !sources.length },
              {
                label: tp.menu.duplicate,
                icon: <Copy className="h-4 w-4" />,
                hidden: readOnly,
                onClick: async () => {
                  const d = await duplicateInstruction(data, { ...doc, json_data: { ...instr, draft: content } }, actor)
                  refresh()
                  router.push(`/instructions/${d._id}`)
                },
              },
              {
                label: tp.menu.archive,
                icon: <Archive className="h-4 w-4" />,
                danger: true,
                hidden: readOnly,
                onClick: async () => {
                  if (!(await confirm({ title: tp.menu.archiveConfirm.title(content.title), description: tp.menu.archiveConfirm.description, confirmLabel: tp.menu.archiveConfirm.confirm, danger: true }))) return
                  await archiveInstruction(data, doc)
                  refresh()
                  toast.success(tp.menu.archived)
                  router.push('/instructions')
                },
              },
            ]}
          />
          {primary}
        </div>
      </header>

      {inReview && instr.review && (
        <div className="mb-5 flex flex-col gap-3 rounded-[28px] bg-amber-50 p-5 sm:flex-row sm:items-center dark:bg-amber-500/10">
          <MessageSquare className="h-6 w-6 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-black text-amber-900 dark:text-amber-200">
              {tp.review.requested(instr.review.requestedByName, timeAgo(instr.review.requestedAt))}
            </p>
            {instr.review.note && <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{tp.review.quote(instr.review.note)}</p>}
            {changes && <p className="text-sm font-bold text-amber-700">{tp.review.changesMarked}</p>}
          </div>
          {canApprove && (
            <Button onClick={() => setDialog('changes')} icon={<X className="h-4 w-4" />}>
              {tp.review.requestChanges}
            </Button>
          )}
        </div>
      )}
      {!inReview && instr.review?.changesRequested && (
        <div className="mb-5 flex items-start gap-3 rounded-[28px] bg-rose-50 p-5 dark:bg-rose-500/10">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
          <div>
            <p className="font-black text-rose-900 dark:text-rose-200">{tp.review.changesRequested(instr.review.changesRequested.byName)}</p>
            <p className="text-sm font-medium text-rose-800 dark:text-rose-300">{tp.review.quote(instr.review.changesRequested.comment)}</p>
          </div>
        </div>
      )}

      {instr.generation && !rating && !readOnly && (
        <div className="glass-card mb-5 flex flex-col gap-3 rounded-[28px] p-4 sm:flex-row sm:items-center">
          <Sparkles className="h-5 w-5 shrink-0 text-[var(--primary)] max-sm:hidden" />
          <p className="flex-1 text-sm font-bold text-slate-600 dark:text-slate-300">{tp.rating.prompt(timeAgo(instr.generation.at))}</p>
          {ratingComment === null ? (
            <div className="flex items-center gap-2">
              <Button size="sm" icon={<ThumbsUp className="h-4 w-4" />} onClick={() => rate('up')}>
                {tp.rating.yes}
              </Button>
              <Button size="sm" icon={<ThumbsDown className="h-4 w-4" />} onClick={() => setRatingComment('')}>
                {tp.rating.no}
              </Button>
            </div>
          ) : (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void rate('down', ratingComment ?? '')
              }}
            >
              <Input autoFocus value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} placeholder={tp.rating.missingPlaceholder} aria-label={tp.rating.missingLabel} className="h-11 text-sm" wrapperClassName="flex-1 sm:w-72 sm:flex-none" />
              <Button size="sm" type="submit" variant="primary">
                {tp.rating.send}
              </Button>
            </form>
          )}
        </div>
      )}

      {questions.length > 0 && !readOnly && (
        <div className="mb-5 rounded-[28px] bg-amber-50 p-5 dark:bg-amber-500/10">
          <p className="label-caps mb-1 text-amber-700 dark:text-amber-300">{tp.questions.title}</p>
          <p className="mb-3 text-sm font-medium text-amber-900/80 dark:text-amber-100/80">{tp.questions.intro}</p>
          <ul className="space-y-2">
            {questions.map((q) => (
              <li key={q} className="flex items-start gap-3">
                <button
                  type="button"
                  aria-label={tp.questions.markChecked}
                  title={tp.questions.markChecked}
                  onClick={() => settleQuestions([q])}
                  className="btn-press mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-amber-400 text-amber-600 hover:bg-amber-400 hover:text-white"
                >
                  <Check className="h-4 w-4" />
                </button>
                <span className="text-[15px] font-bold text-amber-950 dark:text-amber-100">{q}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-4" icon={<MessageCircleQuestion className="h-4 w-4" />} onClick={() => setQuestionsOpen(true)}>
            {tp.questions.answer}
          </Button>
        </div>
      )}
      <QuestionsDialog open={questionsOpen} questions={questions} choices={instr.generation?.choices ?? {}} onClose={() => setQuestionsOpen(false)} onApply={answerQuestions} />

      <MetaCard content={content} stationIds={stationIds} stations={stations} readOnly={readOnly} onChange={update} onStations={changeStations} onCreateStation={can('stations', 'write') ? createStation : undefined} />

      {content.kind === 'lockout' && content.lockout && (
        <div className="mt-5">
          <LockoutEditor value={content.lockout} readOnly={readOnly} onChange={(lockout) => update({ ...content, lockout })} />
        </div>
      )}

      {/* Deux façons de modifier : la fiche (tous les réglages) ou l'étape telle qu'au poste. */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="label-caps px-1 text-slate-500">{tp.steps.title}</p>
        <Segmented
          value={view}
          onChange={chooseView}
          options={[
            { value: 'form', label: t.editor.views.form, icon: <ListChecks className="h-4 w-4" /> },
            { value: 'stage', label: t.editor.views.stage, icon: <MonitorSmartphone className="h-4 w-4" /> },
          ]}
        />
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[340px_1fr]">
        <aside className={cn('lg:sticky lg:top-6 lg:self-start', view === 'stage' && 'max-lg:hidden')}>
          <p className="label-caps mb-2 px-1 text-slate-500">{tp.steps.count(steps.length)}</p>
          <div className="lg:max-h-[calc(100dvh-140px)] lg:overflow-y-auto lg:pr-1">
            <StepList steps={steps} selectedId={step?.id ?? null} onSelect={setSelected} onAdd={() => insertAfter(steps.length - 1)} changes={inReview ? changes : undefined} readOnly={readOnly} feedbackByStep={feedbackByStep} />
          </div>
        </aside>
        <section id="step-editor" className="min-w-0 scroll-mt-24">
          {step && view === 'stage' ? (
            <StageEditor
              content={content}
              step={step}
              index={idx}
              sources={sources}
              readOnly={readOnly}
              agentWorking={agentStep === step.id}
              agentOpen={agentOpen}
              saveLabel={saveLabel}
              onChange={setStep}
              onSelect={(id) => id && setSelected(id)}
              onInsertAfter={() => insertAfter(idx)}
              onAddEnd={() => insertAfter(steps.length - 1)}
              onMove={moveStep}
              onDuplicate={duplicateStep}
              onDelete={deleteStep}
              onExit={() => chooseView('form')}
              onSourceAdded={(s) => {
                const next = [...sources, s]
                setSources(next)
                void saveSources(data, doc._id, next, actor)
              }}
            />
          ) : step ? (
            <StepEditor
              key={step.id}
              agentWorking={agentStep === step.id}
              content={content}
              step={step}
              index={idx}
              sources={sources}
              readOnly={readOnly}
              highlight={highlightFeedback && highlightFeedback.json_data.stepId === step.id ? highlightFeedback.json_data.comment || FEEDBACK_KINDS.unclear.label : (feedback.data ?? []).find((f) => f.json_data.stepId === step.id)?.json_data.comment ?? null}
              onChange={setStep}
              onMove={moveStep}
              onInsertAfter={() => insertAfter(idx)}
              onDuplicate={duplicateStep}
              onDelete={deleteStep}
              onSourceAdded={(s) => {
                const next = [...sources, s]
                setSources(next)
                void saveSources(data, doc._id, next, actor)
              }}
            />
          ) : (
            <div className="glass-panel rounded-[32px] p-10 text-center font-bold text-slate-500">{tp.steps.empty}</div>
          )}
        </section>
      </div>

      {!readOnly && (
        <AgentPanel
          content={content}
          setContent={update}
          focusStepId={step?.id ?? null}
          onFocus={focusStep}
          onWorking={setAgentStep}
          onOpenChange={setAgentOpen}
          request={agentRequest}
          sources={sources}
          onSourcesChange={(next) => {
            setSources(next)
            void data.patch(T.instruction, doc._id, { sources: next })
          }}
        />
      )}

      <ShareDialog open={dialog === 'share'} onClose={() => setDialog(null)} doc={doc} onLinked={refresh} />
      <HistoryDialog
        open={dialog === 'history'}
        onClose={() => setDialog(null)}
        doc={doc}
        onRestore={async (v) => {
          await restoreVersion(data, doc, v, actor)
          setContent(v.content)
          setSelected(v.content.steps[0]?.id ?? null)
          refresh()
          toast.success(tp.toasts.restored(v.number), tp.toasts.restoredDetail)
        }}
      />
      <TranslateDialog open={dialog === 'translate'} onClose={() => setDialog(null)} content={content} onTranslated={(lang, translated) => update({ ...content, translations: { ...(content.translations ?? {}), [lang]: translated } })} />

      <Modal
        open={dialog === 'checks'}
        onClose={() => setDialog(null)}
        title={instr.publishedVersion ? tp.publish.titleVersion(instr.publishedVersion + 1) : tp.publish.title}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>{tp.publish.notYet}</Button>
            <Button variant="primary" loading={publishing} onClick={() => doPublish()} icon={<Send className="h-4 w-4" />}>
              {tp.actions.publish}
            </Button>
          </>
        }
      >
        <p className="font-medium text-slate-600 dark:text-slate-300">
          {stationIds.length ? tp.publish.replaces(stationIds.length) : tp.publish.library}
        </p>
        {notes.length > 0 && (
          <ul className="mt-4 space-y-2">
            {notes.map((n) => (
              <li key={n} className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {n}
              </li>
            ))}
          </ul>
        )}
      </Modal>
      <Modal
        open={dialog === 'review'}
        onClose={() => setDialog(null)}
        title={tp.actions.requestApproval}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>{t.common.cancel}</Button>
            <Button variant="primary" loading={publishing} onClick={doRequestReview} icon={<Send className="h-4 w-4" />}>
              {tp.review.sendRequest}
            </Button>
          </>
        }
      >
        <p className="mb-3 font-medium text-slate-600 dark:text-slate-300">{tp.review.intro}</p>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={tp.review.notePlaceholder} />
        {notes.length > 0 && <p className="mt-3 text-sm font-bold text-amber-700">{notes.join(' ')}</p>}
      </Modal>
      <Modal
        open={dialog === 'changes'}
        onClose={() => setDialog(null)}
        title={tp.review.requestChanges}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>{t.common.cancel}</Button>
            <Button variant="primary" disabled={!comment.trim()} loading={publishing} onClick={doRequestChanges}>
              {tp.review.send}
            </Button>
          </>
        }
      >
        <Textarea autoFocus value={comment} onChange={(e) => setComment(e.target.value)} placeholder={tp.review.changesPlaceholder} />
      </Modal>
    </div>
  )
}
