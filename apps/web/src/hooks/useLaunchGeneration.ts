'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useSession } from '@/components/providers/Session'
import { readAutoAnnotate } from '@/lib/ai/autoAnnotate'
import { startGeneration } from '@/lib/ai/runGeneration'
import { T } from '@/lib/model/repo'
import type { Instruction } from '@/lib/model/types'
import { useToggle } from '@/lib/toggles'
import { qk, useStations } from './queries'

/**
 * Lance la génération d'une instruction, depuis n'importe quel écran : relit l'instruction, puis
 * `startGeneration` avec le choix de l'usine (au serveur ou sur l'appareil) et ceux de la personne.
 * `device` : sur cet appareil même si l'usine génère au serveur (relance après un échec au serveur).
 */
export function useLaunchGeneration() {
  const session = useSession()
  const qc = useQueryClient()
  const stations = useStations()
  const draftHistory = useToggle('draftHistory')
  const serverToggle = useToggle('serverGeneration')
  const serverOn = serverToggle && session.org.json_data.generation?.server === true
  return useCallback(
    async (id: string, kind: 'auto' | 'procedure' | 'lockout', opts: { device?: boolean; onDone?: () => void } = {}) => {
      const fresh = await session.data.get<Instruction>(T.instruction, id)
      if (!fresh) return
      qc.setQueryData(qk.instruction(id), fresh)
      await startGeneration({
        doc: fresh,
        data: session.data,
        files: session.files,
        ai: session.ai,
        org: session.org.json_data,
        stations: stations.data ?? [],
        actor: { id: session.profile.userId, name: session.displayName },
        forceKind: kind === 'auto' ? undefined : kind,
        autoAnnotate: readAutoAnnotate(),
        checkpoints: draftHistory,
        server: serverOn && !opts.device,
        onDone: opts.onDone,
      })
    },
    [session, qc, stations.data, draftHistory, serverOn],
  )
}
