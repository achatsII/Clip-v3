'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { changeKey, UndoStack } from '@/lib/history/undo'
import { createCheckpointer } from '@/lib/model/checkpoints'
import type { CheckpointReason, InstructionContent } from '@/lib/model/types'
import { useToggle } from '@/lib/toggles'
import { qk } from './queries'

export interface DraftHistory {
  /** Faux : toggle coupé ou lecture seule ; rien ne s'affiche, rien ne s'écrit. */
  enabled: boolean
  canUndo: boolean
  canRedo: boolean
  /** Un Mac : les raccourcis se disent avec ⌘. */
  mac: boolean
  /** À chaque modification, avec l'état d'avant et celui d'après. */
  record(before: InstructionContent, after: InstructionContent): void
  /** L'assistant va modifier : un seul pas pour tout son passage, et un point de retour avant. */
  begin(note: string): void
  end(): void
  undo(): void
  redo(): void
  /** Le brouillon a été remplacé par celui d'un autre appareil. */
  reset(): void
  /** Avant de remettre une autre version : un pas (annulable) et un point de retour de l'état actuel. */
  beforeRestore(note: string): Promise<void>
  /** Un point de retour de l'état actuel (avant de régénérer). */
  mark(reason: CheckpointReason, note?: string): Promise<void>
}

/** Une écriture lente ne bloque jamais le geste qui l'attend. */
const atMost = (p: Promise<void> | undefined, ms = 4000) => Promise.race([p ?? Promise.resolve(), new Promise<void>((r) => setTimeout(r, ms))])

/**
 * Annuler et rétablir dans l'éditeur (boutons et Ctrl+Z, ⌘Z), plus les points de retour du
 * brouillon dans la base pour revenir en arrière après avoir fermé l'app.
 */
export function useDraftHistory(opts: {
  instructionId: string
  /** Vrai seulement pour qui peut modifier. */
  active: boolean
  /** L'état actuel, modifications pas encore enregistrées comprises. */
  current: () => InstructionContent
  /** Remet un état (annuler, rétablir) et l'enregistre, sans en faire un nouveau pas. */
  apply: (c: InstructionContent) => void
  /** Le contenu publié : on n'en garde pas de copie (la version l'est déjà). */
  published?: InstructionContent | null
}): DraftHistory {
  const { data, profile, displayName } = useSession()
  const qc = useQueryClient()
  const toggle = useToggle('draftHistory')
  const enabled = toggle && opts.active
  const stack = useRef(new UndoStack<InstructionContent>())
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const ref = useRef(opts)
  ref.current = opts
  const [mac, setMac] = useState(false)
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)), [])

  const { instructionId } = opts
  const checkpointer = useMemo(
    () =>
      enabled
        ? createCheckpointer(data, instructionId, { id: profile.userId, name: displayName }, {
            skip: () => ref.current.published,
            onWritten: () => void qc.invalidateQueries({ queryKey: qk.checkpoints(instructionId) }),
          })
        : null,
    [enabled, data, instructionId, profile.userId, displayName, qc],
  )

  const record = useCallback(
    (before: InstructionContent, after: InstructionContent) => {
      if (!enabled) return
      const s = stack.current
      const was = `${s.canUndo}${s.canRedo}`
      if (!s.busy) checkpointer?.beforeChange(before)
      s.record(before, changeKey(before, after))
      if (`${s.canUndo}${s.canRedo}` !== was) bump()
    },
    [enabled, checkpointer],
  )

  const undo = useCallback(() => {
    const prev = stack.current.undo(ref.current.current())
    if (!prev) return
    ref.current.apply(prev)
    bump()
  }, [])

  const redo = useCallback(() => {
    const next = stack.current.redo(ref.current.current())
    if (!next) return
    ref.current.apply(next)
    bump()
  }, [])

  const begin = useCallback(
    (note: string) => {
      if (!enabled) return
      const c = ref.current.current()
      stack.current.begin(c)
      void checkpointer?.mark(c, 'agent', note)
      bump()
    },
    [enabled, checkpointer],
  )

  const end = useCallback(() => {
    stack.current.end()
    bump()
  }, [])

  const reset = useCallback(() => {
    stack.current.reset()
    bump()
  }, [])

  const beforeRestore = useCallback(
    async (note: string) => {
      if (!enabled) return
      const c = ref.current.current()
      stack.current.checkpoint(c)
      bump()
      await atMost(checkpointer?.mark(c, 'restore', note))
    },
    [enabled, checkpointer],
  )

  const mark = useCallback((reason: CheckpointReason, note?: string) => (enabled ? atMost(checkpointer?.mark(ref.current.current(), reason, note)) : Promise.resolve()), [enabled, checkpointer])

  // Ctrl+Z, Ctrl+Maj+Z (ou Ctrl+Y) ; ⌘Z et ⇧⌘Z sur Mac. Pas dans une fenêtre ni dans l'assistant,
  // qui gardent l'annulation de leurs propres champs.
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.isComposing) return
      const k = e.key.toLowerCase()
      const isUndo = k === 'z' && !e.shiftKey
      const isRedo = (k === 'z' && e.shiftKey) || (k === 'y' && e.ctrlKey && !e.metaKey)
      if (!isUndo && !isRedo) return
      const el = e.target instanceof Element ? e.target : null
      if (el?.closest('[role="dialog"], [data-own-undo]')) return
      e.preventDefault()
      if (isUndo) undo()
      else redo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, undo, redo])

  const s = stack.current
  return { enabled, canUndo: enabled && s.canUndo, canRedo: enabled && s.canRedo, mac, record, begin, end, undo, redo, reset, beforeRestore, mark }
}
