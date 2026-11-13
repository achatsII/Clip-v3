'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Player, type PlayerProps } from '@/components/player/Player'
import { useSession } from '@/components/providers/Session'
import { useToast } from '@/components/ui/Toast'
import { cacheDraft, cacheInstruction, qk } from '@/hooks/queries'
import { useDraftWatch } from '@/hooks/useDraftWatch'
import { useDraftHistory } from '@/hooks/useDraftHistory'
import { inNativeShell } from '@/lib/bridge/native'
import type { Doc } from '@/lib/gateway/data'
import { useMessages } from '@/lib/i18n'
import { nowIso, T } from '@/lib/model/repo'
import { saveDraft } from '@/lib/model/service'
import type { Instruction, InstructionContent, Source } from '@/lib/model/types'
import { deviceId, publishRealtime, writtenBy } from '@/lib/realtime/client'
import { changedSteps, followStep } from '@/lib/realtime/liveDraft'
import { useRealtimeAvailable, useToggle } from '@/lib/toggles'
import { markFresh, newAnnotationIds } from '@/lib/annotations/fresh'
import { AgentBubble, AgentPanel } from './AgentPanel'

type PreviewPlayerProps = Omit<PlayerProps, 'content' | 'focus' | 'onStepChange' | 'frameClassName'>

/**
 * L'aperçu qu'on peut modifier : le lecteur tel qu'au poste, et l'assistant d'édition dans une bulle
 * en bas à droite (écrire, dicter, parler en direct). Ce que l'assistant change s'enregistre dans le
 * brouillon, comme dans l'éditeur, et s'affiche aussitôt ; le lecteur va à l'étape qui change.
 * Ctrl+Z annule son dernier passage, et un point de retour le précède dans l'historique. Un brouillon
 * modifié ailleurs pendant ce temps s'affiche aussi, quand rien n'attend d'être enregistré ici.
 */
export function PreviewEditing({ doc, player }: { doc: Doc<Instruction>; player: PreviewPlayerProps }) {
  const { data, profile, displayName } = useSession()
  const actor = useMemo(() => ({ id: profile.userId, name: displayName }), [profile.userId, displayName])
  const qc = useQueryClient()
  const toast = useToast()
  const t = useMessages()
  const realtime = useRealtimeAvailable()
  const liveToggle = useToggle('liveEditing')
  const live = realtime && liveToggle

  const [content, setContent] = useState<InstructionContent>(doc.json_data.draft!)
  const [sources, setSources] = useState<Source[]>(doc.json_data.sources)
  const latest = useRef(content)
  const lastSaved = useRef(content)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const docRef = useRef(doc)
  docRef.current = doc
  const agentBusy = useRef(false)
  /** La date du dernier brouillon connu ici : la relecture de secours s'y compare. */
  const knownAt = useRef<string | null>(doc.json_data.updatedAt ?? null)
  const [focus, setFocus] = useState<{ stepId: string; key: number } | null>(null)
  const [stepId, setStepId] = useState<string | null>(null)
  const [agentOpen, setAgentOpen] = useState(false)
  const goTo = useCallback((id: string | null) => id && setFocus({ stepId: id, key: Date.now() }), [])

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const saved = latest.current
    try {
      const at = nowIso()
      await saveDraft(data, doc._id, docRef.current.json_data, saved, actor, writtenBy(at))
      knownAt.current = at
      cacheDraft(qc, doc._id, saved)
      // L'éditeur ouvert ailleurs (l'ordinateur derrière soi) suit, à l'étape changée.
      if (live) publishRealtime({ type: 'draft', id: doc._id, title: saved.title, userId: actor.id, byName: actor.name, device: inNativeShell() ? 'app' : 'web', steps: changedSteps(lastSaved.current, saved), from: deviceId, at })
      lastSaved.current = saved
    } catch {
      toast.error(t.editor.page.saveState.error)
    }
  }, [data, doc._id, actor, qc, live, toast, t])

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), 900)
  }, [flush])

  /** Annuler, rétablir : l'état revient, s'enregistre, et le lecteur va à l'étape qui change. */
  const apply = useCallback(
    (next: InstructionContent) => {
      const before = latest.current
      latest.current = next
      setContent(next)
      schedule()
      goTo(followStep(changedSteps(before, next), next))
    },
    [schedule, goTo],
  )

  const history = useDraftHistory({ instructionId: doc._id, active: true, current: () => latest.current, apply })
  const { record, reset } = history

  const update = useCallback(
    (next: InstructionContent) => {
      record(latest.current, next)
      latest.current = next
      setContent(next)
      schedule()
    },
    [record, schedule],
  )

  // En quittant l'aperçu, ce qui attend part tout de suite, et l'éditeur le montre au retour.
  useEffect(
    () => () => {
      if (!timer.current) return
      clearTimeout(timer.current)
      const draft = latest.current
      cacheDraft(qc, doc._id, draft)
      void saveDraft(data, doc._id, docRef.current.json_data, draft, actor, writtenBy(nowIso())).catch(() => undefined)
    },
    [data, doc._id, actor, qc],
  )

  // Le direct ne passe pas : l'aperçu se relit seul toutes les 8 s (le temps réel, lui, relit l'instruction).
  useDraftWatch({
    id: doc._id,
    enabled: liveToggle,
    known: () => knownAt.current,
    idle: () => !timer.current && !agentBusy.current,
    onRemote: () => void qc.invalidateQueries({ queryKey: qk.instruction(doc._id) }),
  })

  // Le brouillon relu, modifié sur un autre appareil : on le montre, sauf si quelque chose attend ici.
  const remoteDraft = doc.json_data.draft
  useEffect(() => {
    knownAt.current = doc.json_data.updatedAt ?? knownAt.current
    if (!remoteDraft || timer.current || agentBusy.current) return
    if (JSON.stringify(remoteDraft) === JSON.stringify(latest.current)) return
    const changed = changedSteps(latest.current, remoteDraft)
    markFresh(newAnnotationIds(latest.current, remoteDraft))
    latest.current = remoteDraft
    lastSaved.current = remoteDraft
    setContent(remoteDraft)
    reset()
    goTo(followStep(changed, remoteDraft))
  }, [remoteDraft, reset, goTo])

  return (
    <>
      <Player {...player} content={content} focus={focus} onStepChange={setStepId} frameClassName={agentOpen ? 'lg:right-[424px]' : undefined} accessory={agentOpen ? null : <AgentBubble onClick={() => setAgentOpen(true)} />} />
      {/* Sur ordinateur, le panneau ouvert a sa colonne à droite ; le lecteur se pousse. */}
      {agentOpen && <div className="fixed inset-y-0 right-0 z-50 w-[424px] bg-slate-100 max-lg:hidden dark:bg-slate-900" aria-hidden />}
      <AgentPanel
        variant="bubble"
        open={agentOpen}
        content={content}
        setContent={update}
        focusStepId={stepId}
        onFocus={goTo}
        onWorking={() => undefined}
        onOpenChange={setAgentOpen}
        sources={sources}
        onSourcesChange={(next) => {
          setSources(next)
          cacheInstruction(qc, doc._id, { sources: next })
          void data.patch(T.instruction, doc._id, { sources: next })
        }}
        onTurnStart={(request) => {
          agentBusy.current = true
          history.begin(request)
        }}
        onTurnEnd={() => {
          agentBusy.current = false
          history.end()
        }}
      />
    </>
  )
}
