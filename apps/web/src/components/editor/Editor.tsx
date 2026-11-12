'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Archive,
  CircleCheck,
  Copy,
  CopyPlus,
  Eye,
  FileDown,
  FileJson,
  History,
  Info,
  Languages,
  MessageSquare,
  Send,
  Share2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Confetti } from '@/components/ui/Celebrate'
import { useConfirm } from '@/components/ui/Confirm'
import { Input, Label, Textarea } from '@/components/ui/Field'
import type { MenuItem } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { cacheDraft, cacheInstruction, qk, useFeedback, useInstructions } from '@/hooks/queries'
import { useDraftHistory } from '@/hooks/useDraftHistory'
import { useDraftWatch } from '@/hooks/useDraftWatch'
import { LockBadge } from '@/components/billing/Billing'
import { useBilling, useEntitlement, useGate, useLimit } from '@/lib/billing/state'
import { useRealtimeAvailable, useToggle } from '@/lib/toggles'
import { useImmersive } from '@/lib/ui/immersive'
import { inNativeShell } from '@/lib/bridge/native'
import { deviceId, onRealtime, publishRealtime, useRealtimeState, writtenBy } from '@/lib/realtime/client'
import { changedSteps, followStep, readVersion, remoteDraftAction } from '@/lib/realtime/liveDraft'
import type { Doc } from '@/lib/gateway/data'
import { useMessages } from '@/lib/i18n'
import { diffSteps } from '@/lib/model/diff'
import { FEEDBACK_KINDS } from '@/lib/model/catalog'
import { nowIso, T, uid } from '@/lib/model/repo'
import {
  archiveInstruction,
  duplicateInstruction,
  newFromSources,
  needsApproval,
  publishInstruction,
  requestChanges,
  requestReview,
  saveDraft,
  saveSources,
  updatePublishedStations,
} from '@/lib/model/service'
import type { Instruction, InstructionContent, Published, Source, Station, Step } from '@/lib/model/types'
import { markCreatedSeen } from '@/lib/prefs'
import { formatDateTime, timeAgo } from '@/lib/util/cn'
import { AgentPanel, type AgentRequest } from './AgentPanel'
import { HistoryDialog, ShareDialog, TranslateDialog } from './Dialogs'
import { LockoutEditor } from './LockoutEditor'
import { MetaCard, StationPicker } from './MetaCard'
import { QuestionsDialog, type QuestionAnswer } from './QuestionsDialog'
import { StageEditor } from './StageEditor'
import { markFresh, newAnnotationIds } from '@/lib/annotations/fresh'
import { attachReel, carryClips } from '@/lib/media/reel'
import { LiveBadge } from './LiveBadge'
import { UndoPill } from './UndoControls'

type SaveState = 'saved' | 'saving' | 'error'
/** Ce qu'un autre appareil annonce d'un brouillon enregistré. */
type DraftNotice = { byName?: string; device: 'app' | 'web'; steps?: string[]; at?: string }
/** Les relectures d'un brouillon annoncé que la Gateway ne rend pas encore. */
const RELOOK_MS = [500, 1200, 2500, 5000]

function newStep(): Step {
  return { id: uid('st_'), title: '', text: '', keyPoints: [], warning: null, media: [] }
}

export function Editor({ doc, stations, onRegenerate }: { doc: Doc<Instruction>; stations: Doc<Station>[]; onRegenerate: () => void }) {
  const session = useSession()
  const { data, org, role, profile, displayName, can, files } = session
  const actor = useMemo(() => ({ id: profile.userId, name: displayName }), [profile.userId, displayName])
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const t = useMessages()
  const tp = t.editor.page
  const tpRef = useRef(tp)
  tpRef.current = tp
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
  const reelToggle = useToggle('stepReel')
  const [celebrate, setCelebrate] = useState(false)
  const [dialog, setDialog] = useState<null | 'info' | 'share' | 'history' | 'translate' | 'changes' | 'review' | 'checks'>(null)
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
  // L'édition en direct : le dernier brouillon enregistré (ici ou reçu), pour dire ce qui change.
  const realtime = useRealtimeAvailable()
  const liveToggle = useToggle('liveEditing')
  // Annoncer ses changements : qui peut modifier, avec le temps réel. Suivre ceux des autres : tout
  // le monde, par le temps réel, ou en se relisant seul quand il ne passe pas (`useDraftWatch`).
  const live = realtime && liveToggle && !readOnly
  const liveRef = useRef(live)
  liveRef.current = live
  const realtimeState = useRealtimeState()
  /** La date du dernier brouillon que cet écran connaît (écrit ici ou repris) : la relecture de secours s'y compare. */
  const knownAt = useRef<string | null>(instr.updatedAt ?? null)
  /** L'étape qu'un autre appareil vient de changer : encadrée quelques secondes. */
  const [flash, setFlash] = useState<{ stepId: string; note: string } | null>(null)
  const lastSaved = useRef<InstructionContent>(instr.draft!)
  const saveStateRef = useRef<SaveState>('saved')
  saveStateRef.current = saveState
  const [remote, setRemote] = useState<{ byName?: string; device: 'app' | 'web'; conflict: boolean; at: number } | null>(null)
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
      const saved = latest.current
      const at = nowIso()
      await saveDraft(data, doc._id, docRef.current.json_data, saved, actor, writtenBy(at))
      knownAt.current = at
      // Revenir ici (depuis l'aperçu, la liste) montre ce brouillon, pas celui de la première lecture.
      cacheDraft(qc, doc._id, saved)
      setSaveState('saved')
      // Les autres appareils ouverts sur cette instruction suivent : l'étape changée en premier.
      if (liveRef.current) publishRealtime({ type: 'draft', id: doc._id, title: saved.title, userId: actor.id, byName: actor.name, device: inNativeShell() ? 'app' : 'web', steps: changedSteps(lastSaved.current, saved), from: deviceId, at })
      lastSaved.current = saved
    } catch {
      setSaveState('error')
      throw new Error('save')
    }
  }, [data, doc._id, actor, qc])

  /** Remet un état (annuler, rétablir, revenir à une version) et va à l'étape qui change. */
  const applyContent = useCallback(
    (next: InstructionContent) => {
      const before = latest.current
      latest.current = next
      setContent(next)
      setSaveState('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush().catch(() => undefined), 900)
      const to = followStep(changedSteps(before, next), next)
      setSelected((sel) => to ?? (next.steps.some((s) => s.id === sel) ? sel : (next.steps[0]?.id ?? null)))
    },
    [flush],
  )

  // Annuler, rétablir (boutons, Ctrl+Z) et les points de retour du brouillon dans la base.
  const history = useDraftHistory({
    instructionId: doc._id,
    active: !readOnly,
    current: () => latest.current,
    apply: applyContent,
    published: published.data?.json_data.content ?? null,
  })
  const record = history.record
  const resetHistory = history.reset

  const update = useCallback(
    (next: InstructionContent) => {
      record(latest.current, next)
      latest.current = next
      setContent(next)
      setSaveState('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush().catch(() => undefined), 900)
    },
    [flush, record],
  )

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
        const draft = latest.current
        cacheDraft(qc, doc._id, draft)
        void saveDraft(data, doc._id, docRef.current.json_data, draft, actor, writtenBy(nowIso())).catch(() => undefined)
      }
    },
    [data, doc._id, actor, qc],
  )

  // Ouverte ici : l'accueil ne la propose plus parmi celles qui viennent d'être créées.
  useEffect(() => markCreatedSeen(doc._id), [doc._id])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (timer.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  // Un brouillon enregistré sur un autre appareil : on le reprend et on va à l'étape changée, sauf si
  // on modifie ici aussi (on le dit, sans rien écraser). Les annonces rapprochées se regroupent.
  const pulling = useRef(false)
  const again = useRef<DraftNotice | null>(null)
  const pullRemote = useCallback(
    async (e: DraftNotice, force = false) => {
      if (!force && remoteDraftAction(!!timer.current || saveStateRef.current === 'saving') === 'conflict') {
        setRemote({ byName: e.byName, device: e.device, conflict: true, at: Date.now() })
        return
      }
      if (pulling.current) {
        again.current = e
        return
      }
      pulling.current = true
      try {
        // Lue trop tôt, la Gateway rend encore l'ancienne version : on relit, un peu plus tard chaque fois.
        const fresh = await readVersion(() => data.get<Instruction>(T.instruction, doc._id), e.at, RELOOK_MS)
        const draft = fresh?.json_data.draft
        if (!draft) return
        // La personne a commencé à modifier pendant la lecture : on ne reprend rien.
        if (!force && timer.current) {
          setRemote({ byName: e.byName, device: e.device, conflict: true, at: Date.now() })
          return
        }
        if (force && timer.current) {
          clearTimeout(timer.current)
          timer.current = null
        }
        knownAt.current = fresh!.json_data.updatedAt ?? knownAt.current
        // Rien de changé à l'écran (un autre champ, ou un écho) : on ne dit rien.
        if (JSON.stringify(draft) === JSON.stringify(latest.current)) return
        const changed = changedSteps(latest.current, draft)
        // Une flèche ajoutée ailleurs clignote en apparaissant, même si l'écran change d'étape pour la montrer.
        markFresh(newAnnotationIds(latest.current, draft))
        latest.current = draft
        lastSaved.current = draft
        setContent(draft)
        setSaveState('saved')
        // Les pas d'annulation d'ici ne s'appliquent plus au brouillon d'un autre appareil.
        resetHistory()
        setSources(fresh!.json_data.sources)
        setStationIds(fresh!.json_data.stationIds)
        // L'écran va à l'étape changée et l'encadre : on voit la flèche apparaître, le texte changer.
        const to = followStep(changed.length ? changed : e.steps, draft)
        const note = tpRef.current.live.updated(e.device, e.byName)
        if (to) {
          setSelected(to)
          setFlash({ stepId: to, note })
          requestAnimationFrame(() => document.getElementById('step-editor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
        }
        setRemote({ byName: e.byName, device: e.device, conflict: false, at: Date.now() })
      } catch {
        /* la prochaine annonce, ou un rechargement, rattrapera */
      } finally {
        pulling.current = false
        const next = again.current
        again.current = null
        if (next) void pullRemote(next)
      }
    },
    [data, doc._id, resetHistory],
  )
  useEffect(() => {
    if (!liveToggle || !realtime) return
    return onRealtime((e) => {
      if (e.type === 'draft' && e.id === doc._id) void pullRemote({ byName: e.byName, device: e.device, steps: e.steps, at: e.at })
    })
  }, [liveToggle, realtime, doc._id, pullRemote])
  // Le direct ne passe pas (réseau, jeton) : l'écran se relit seul toutes les 8 s, s'il n'y a rien en cours ici.
  useDraftWatch({
    id: doc._id,
    enabled: liveToggle,
    known: () => knownAt.current,
    idle: () => !timer.current && saveStateRef.current !== 'saving',
    onRemote: (row) => void pullRemote({ byName: row.updatedByName, device: row.updatedVia ?? 'web', at: row.updatedAt }),
  })
  // L'étape changée ailleurs reste encadrée quelques secondes.
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 4500)
    return () => clearTimeout(t)
  }, [flash])
  // L'avis « modifiée en direct » s'efface de lui-même ; un conflit reste jusqu'au choix.
  useEffect(() => {
    if (!remote || remote.conflict) return
    const t = setTimeout(() => setRemote(null), 5000)
    return () => clearTimeout(t)
  }, [remote])

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: qk.instruction(doc._id) })
    void qc.invalidateQueries({ queryKey: qk.instructions })
  }

  const liveLabel = remote && !remote.conflict ? tp.live.updated(remote.device, remote.byName) : null
  const saveLabel = liveLabel ?? (saveState === 'saving' ? tp.saveState.saving : saveState === 'error' ? tp.saveState.error : tp.saveState.saved)
  const steps = content.steps
  const idx = Math.max(0, steps.findIndex((s) => s.id === selected))
  const step = steps[idx]
  const changes = instr.publishedVersion && published.data ? diffSteps(published.data.json_data.content, content) : undefined
  const isDirty = !instr.publishedVersion || instr.dirty || saveState === 'saving' || (changes ? Object.values(changes).some((c) => c !== 'same') || published.data?.json_data.content.title !== content.title : true)

  // L'éditeur prend tout l'écran : la barre et la navigation de l'app s'effacent.
  useImmersive()

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
      // La vidéo des étapes (au poste, on ne télécharge que les secondes utiles) : les extraits
      // inchangés y gardent leur place ; si un extrait a changé, elle se monte après la publication,
      // sans la retenir, et le poste lit la vidéo d'origine d'ici là.
      const previous = published.data?.json_data.content ?? null
      const draft = reelToggle ? carryClips(latest.current, previous) : latest.current
      const current = { ...doc, json_data: { ...docRef.current.json_data, draft, stationIds } }
      const { number: n, publishedId } = await publishInstruction(data, current, org.json_data, actor, { approvedBy, previous })
      if (reelToggle)
        void attachReel(files, data, { publishedId, version: n }, draft).then((ok) => {
          if (ok) void qc.invalidateQueries({ queryKey: ['published', doc._id] })
        })
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

  const askPublish = () => (blockedByLimit ? openPaywall({ feature: 'published_instructions', used: publishLimit?.used, retry: () => setDialog(approval ? 'review' : 'checks') }) : setDialog(approval ? 'review' : 'checks'))
  const primary = (compact: boolean) =>
    readOnly ? null : inReview ? (
      canApprove ? (
        <Button variant="success" size={compact ? 'sm' : 'md'} loading={publishing} onClick={() => doPublish(actor)} icon={<CircleCheck className="h-5 w-5" />}>
          {compact ? tp.actions.approve : tp.actions.approveAndPublish}
        </Button>
      ) : null
    ) : !isDirty ? null : (
      <Button variant="primary" size={compact ? 'sm' : 'md'} disabled={!!problems.length} title={problems.join(' ') || undefined} loading={publishing} onClick={askPublish} icon={<Send className="h-4 w-4" />}>
        {approval ? (compact ? tp.actions.requestApprovalShort : tp.actions.requestApproval) : tp.actions.publish} {blockedByLimit && <LockBadge />}
      </Button>
    )

  // Sous le titre : où en est l'instruction, et l'enregistrement.
  const publication = inReview ? tp.status.review : !instr.publishedVersion ? tp.status.draft : isDirty ? tp.status.unpublished : tp.status.published(instr.publishedVersion)
  const status = liveLabel ?? (saveState === 'saved' ? `${publication} · ${saveLabel}` : saveLabel)

  // Tout ce qui touche l'instruction entière, rangé dans son « … ».
  const menu: MenuItem[] = [
    { label: tp.info.menu, icon: <Info className="h-4 w-4" />, onClick: () => setDialog('info') },
    { label: tp.menu.test, icon: <Eye className="h-4 w-4" />, onClick: () => router.push(`/instructions/${doc._id}/lire?apercu=1`) },
    { label: tp.menu.share, icon: <Share2 className="h-4 w-4" />, onClick: () => setDialog('share') },
    { label: tp.menu.translate, icon: <Languages className="h-4 w-4" />, onClick: () => gate(translations, 'translations', () => setDialog('translate')), hidden: readOnly || !translateToggle, hint: translations === 'locked' ? <LockBadge /> : undefined },
    { label: tp.menu.history, icon: <History className="h-4 w-4" />, onClick: () => setDialog('history'), divider: true },
    { label: tp.menu.exportPdf, icon: <FileDown className="h-4 w-4" />, onClick: () => window.open(`/instructions/${doc._id}/imprimer`, '_blank') },
    { label: tp.menu.exportJson, icon: <FileJson className="h-4 w-4" />, onClick: exportJson },
    {
      label: tp.menu.duplicate,
      icon: <Copy className="h-4 w-4" />,
      hidden: readOnly,
      divider: true,
      onClick: async () => {
        const d = await duplicateInstruction(data, { ...doc, json_data: { ...instr, draft: content } }, actor)
        refresh()
        router.push(`/instructions/${d._id}`)
      },
    },
    {
      // Relancer sans toucher à celle-ci : une nouvelle capture avec les mêmes médias et la même demande.
      label: tp.menu.reuseMedia,
      icon: <CopyPlus className="h-4 w-4" />,
      hidden: readOnly || !sources.length,
      onClick: async () => {
        try {
          const d = await newFromSources(data, { ...doc, json_data: { ...instr, sources } }, actor)
          void qc.invalidateQueries({ queryKey: qk.instructions })
          router.push(`/instructions/${d._id}`)
        } catch (e) {
          toast.error(tp.menu.reuseMediaFailed, errorText(e))
        }
      },
    },
    {
      label: tp.menu.regenerate,
      icon: <Sparkles className="h-4 w-4" />,
      hidden: readOnly || !sources.length,
      onClick: async () => {
        if (!(await confirm({ title: tp.menu.regenerateConfirm.title, description: history.enabled ? tp.menu.regenerateConfirm.descriptionKept : tp.menu.regenerateConfirm.description, confirmLabel: tp.menu.regenerateConfirm.confirm }))) return
        // Le brouillon enregistré tel quel : la génération en garde un point de retour avant de le remplacer.
        await flush().catch(() => undefined)
        onRegenerate()
      },
    },
    {
      label: tp.menu.archive,
      icon: <Archive className="h-4 w-4" />,
      danger: true,
      divider: true,
      hidden: readOnly,
      onClick: async () => {
        if (!(await confirm({ title: tp.menu.archiveConfirm.title(content.title), description: tp.menu.archiveConfirm.description, confirmLabel: tp.menu.archiveConfirm.confirm, danger: true }))) return
        await archiveInstruction(data, doc)
        refresh()
        toast.success(tp.menu.archived)
        router.push('/instructions')
      },
    },
  ]

  // Sous l'en-tête, seulement quand il y a lieu : une modification en même temps ailleurs, l'approbation.
  const notices =
    remote?.conflict || (inReview && instr.review) || (!inReview && instr.review?.changesRequested) ? (
      <>
        {remote?.conflict && (
          <div className="flex flex-col gap-2 rounded-2xl bg-amber-50 p-3 sm:flex-row sm:items-center dark:bg-amber-500/10" role="status">
            <p className="flex-1 text-sm font-bold text-amber-900 dark:text-amber-100">{tp.live.conflict(remote.device, remote.byName)}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setRemote(null)}>
                {tp.live.keepMine}
              </Button>
              <Button size="sm" variant="primary" onClick={() => void pullRemote({ byName: remote.byName, device: remote.device }, true)}>
                {tp.live.loadTheirs}
              </Button>
            </div>
          </div>
        )}
        {inReview && instr.review && (
          <div className="flex flex-col gap-2 rounded-2xl bg-amber-50 p-3 sm:flex-row sm:items-center dark:bg-amber-500/10">
            <MessageSquare className="h-5 w-5 shrink-0 text-amber-600 max-sm:hidden" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-amber-900 dark:text-amber-200">{tp.review.requested(instr.review.requestedByName, timeAgo(instr.review.requestedAt))}</p>
              {instr.review.note && <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{tp.review.quote(instr.review.note)}</p>}
              {changes && <p className="text-xs font-bold text-amber-700">{tp.review.changesMarked}</p>}
            </div>
            {canApprove && (
              <Button size="sm" onClick={() => setDialog('changes')} icon={<X className="h-4 w-4" />}>
                {tp.review.requestChanges}
              </Button>
            )}
          </div>
        )}
        {!inReview && instr.review?.changesRequested && (
          <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-3 dark:bg-rose-500/10">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="min-w-0">
              <p className="text-sm font-black text-rose-900 dark:text-rose-200">{tp.review.changesRequested(instr.review.changesRequested.byName)}</p>
              <p className="text-sm font-medium text-rose-800 dark:text-rose-300">{tp.review.quote(instr.review.changesRequested.comment)}</p>
            </div>
          </div>
        )}
      </>
    ) : null

  const feedbackNote = !step ? null : highlightFeedback && highlightFeedback.json_data.stepId === step.id ? highlightFeedback.json_data.comment || FEEDBACK_KINDS.unclear.label : ((feedback.data ?? []).find((f) => f.json_data.stepId === step.id)?.json_data.comment ?? null)
  const addSource = (src: Source) => {
    const next = [...sources, src]
    setSources(next)
    cacheInstruction(qc, doc._id, { sources: next })
    void saveSources(data, doc._id, next, actor)
  }

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
    <div>
      <Confetti show={celebrate} />
      <StageEditor
        content={content}
        step={step}
        index={idx}
        sources={sources}
        readOnly={readOnly}
        agentWorking={!!step && agentStep === step.id}
        agentOpen={agentOpen}
        top={{ title: content.title, status, statusTone: liveLabel ? 'live' : saveState === 'error' ? 'error' : undefined, primary, menu, onInfo: () => setDialog('info'), questions: readOnly ? 0 : questions.length, onQuestions: () => setQuestionsOpen(true) }}
        notices={notices}
        badge={liveToggle ? <LiveBadge state={realtimeState} compact /> : null}
        remoteNote={step && flash?.stepId === step.id ? flash.note : null}
        feedbackNote={feedbackNote}
        feedbackByStep={feedbackByStep}
        changes={inReview ? changes : undefined}
        history={history}
        onAssistant={() => setAgentOpen(true)}
        onChange={setStep}
        onSelect={(id) => id && setSelected(id)}
        onInsertAfter={() => insertAfter(idx)}
        onAddEnd={() => insertAfter(steps.length - 1)}
        onMove={moveStep}
        onDuplicate={duplicateStep}
        onDelete={deleteStep}
        onSourceAdded={addSource}
      />
      <QuestionsDialog open={questionsOpen} questions={questions} choices={instr.generation?.choices ?? {}} onClose={() => setQuestionsOpen(false)} onApply={answerQuestions} onChecked={(q) => settleQuestions([q])} />

      {!readOnly && (
        <AgentPanel
          content={content}
          setContent={update}
          focusStepId={step?.id ?? null}
          onFocus={focusStep}
          onWorking={setAgentStep}
          open={agentOpen}
          onOpenChange={setAgentOpen}
          request={agentRequest}
          onTurnStart={history.begin}
          onTurnEnd={history.end}
          sources={sources}
          onSourcesChange={(next) => {
            setSources(next)
            cacheInstruction(qc, doc._id, { sources: next })
            void data.patch(T.instruction, doc._id, { sources: next })
          }}
        />
      )}

      <Modal open={dialog === 'info'} onClose={() => setDialog(null)} size="lg" title={tp.info.title}>
        <div className="space-y-5">
          <div>
            <Label htmlFor="instruction-title">{tp.header.titleLabel}</Label>
            <Input id="instruction-title" value={content.title} readOnly={readOnly} onChange={(e) => update({ ...content, title: e.target.value })} className="h-14 text-lg font-black" />
          </div>
          <div>
            <Label htmlFor="instruction-summary">{tp.header.summaryLabel}</Label>
            <Textarea id="instruction-summary" rows={2} value={content.summary} readOnly={readOnly} onChange={(e) => update({ ...content, summary: e.target.value })} placeholder={tp.header.summaryPlaceholder} />
          </div>
          <MetaCard embedded content={content} stationIds={stationIds} stations={stations} readOnly={readOnly} onChange={update} onStations={changeStations} onCreateStation={can('stations', 'write') ? createStation : undefined} />
          {content.kind === 'lockout' && content.lockout && <LockoutEditor value={content.lockout} readOnly={readOnly} onChange={(lockout) => update({ ...content, lockout })} />}
        </div>
      </Modal>
      <ShareDialog open={dialog === 'share'} onClose={() => setDialog(null)} doc={doc} onLinked={refresh} />
      <HistoryDialog
        open={dialog === 'history'}
        onClose={() => setDialog(null)}
        doc={doc}
        current={content}
        dirty={isDirty}
        withCheckpoints={history.enabled}
        onRestore={async (v) => {
          // L'état d'avant reste : un point de retour, et « Annuler » tout de suite.
          await history.beforeRestore(`v${v.number}`)
          applyContent(v.content)
          await flush()
          refresh()
          toast.success(tp.toasts.restored(v.number), history.enabled ? tp.toasts.restoredUndo : tp.toasts.restoredDetail, history.enabled ? { label: tp.undo.undo, onClick: history.undo } : undefined)
        }}
        onRestoreCheckpoint={async (c) => {
          await history.beforeRestore(c.at)
          applyContent(c.content)
          await flush()
          refresh()
          toast.success(tp.toasts.restoredState(formatDateTime(c.at)), tp.toasts.restoredUndo, { label: tp.undo.undo, onClick: history.undo })
        }}
      />
      <UndoPill history={history} />
      <TranslateDialog open={dialog === 'translate'} onClose={() => setDialog(null)} content={content} onTranslated={(lang, translated) => update({ ...content, translations: { ...(content.translations ?? {}), [lang]: translated } })} />

      <Modal
        open={dialog === 'checks'}
        onClose={() => setDialog(null)}
        title={instr.publishedVersion ? tp.publish.titleVersion(instr.publishedVersion + 1) : tp.publish.title}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>{tp.publish.notYet}</Button>
            {/* Le focus va au bouton : pas de clavier qui surgit au téléphone. */}
            <Button variant="primary" data-autofocus loading={publishing} onClick={() => doPublish()} icon={<Send className="h-4 w-4" />}>
              {tp.actions.publish}
            </Button>
          </>
        }
      >
        <p className="font-medium text-slate-600 dark:text-slate-300">
          {stationIds.length ? tp.publish.replaces(stationIds.length) : tp.publish.library}
        </p>
        {/* Le bon moment pour dire où elle s'affiche. */}
        <div className="mt-4">
          <StationPicker label={tp.publish.where} stationIds={stationIds} stations={stations} onStations={changeStations} onCreateStation={can('stations', 'write') ? createStation : undefined} />
        </div>
        {notes.length > 0 && (
          <ul className="mt-4 space-y-2">
            {notes.map((n) => (
              <li key={n} className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {n}
              </li>
            ))}
          </ul>
        )}
        {/* L'avis sur la génération : au moment où la personne a tout relu. */}
        {instr.generation && !rating && (
          <div className="mt-4 rounded-2xl bg-slate-900/[0.03] p-3 dark:bg-white/5">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{tp.rating.prompt(timeAgo(instr.generation.at))}</p>
            {ratingComment === null ? (
              <div className="mt-2 flex gap-2">
                <Button size="sm" icon={<ThumbsUp className="h-4 w-4" />} onClick={() => rate('up')}>
                  {tp.rating.yes}
                </Button>
                <Button size="sm" icon={<ThumbsDown className="h-4 w-4" />} onClick={() => setRatingComment('')}>
                  {tp.rating.no}
                </Button>
              </div>
            ) : (
              <form
                className="mt-2 flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void rate('down', ratingComment ?? '')
                }}
              >
                <Input data-own-undo="" autoFocus value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} placeholder={tp.rating.missingPlaceholder} aria-label={tp.rating.missingLabel} className="h-11 text-sm" wrapperClassName="flex-1" />
                <Button size="sm" type="submit" variant="primary">
                  {tp.rating.send}
                </Button>
              </form>
            )}
          </div>
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
