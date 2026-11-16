/**
 * Le surveillant des créations, posé dans la coquille de l'app : il termine une génération faite au
 * serveur quand l'appareil qui l'a lancée est fermé. Le cas vécu en QA le 2026-11-14 : vidéo filmée,
 * « Générer », app fermée ; le serveur a fini en 45 s ; l'app rouverte 34 minutes plus tard montrait
 * « La création s'est interrompue » et ne lisait même plus le travail fini.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const finishServerGeneration = vi.fn(async (_input: { doc: { _id: string }; job: { _id: string } | null }) => undefined)
vi.mock('@/lib/ai/runGeneration', () => ({ finishServerGeneration: (input: never) => finishServerGeneration(input) }))
vi.mock('next/navigation', () => ({ usePathname: () => '/instructions/i1', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
// La configuration n'a pas pu se lire : tous les toggles valent leur repli (éteint). Un travail déjà
// parti au serveur se termine quand même.
vi.mock('@/lib/toggles', () => ({ useToggle: () => false, usePublicConfig: () => ({ data: undefined }), useRealtimeAvailable: () => false }))

const docs = new Map<string, { _id: string; json_data: Record<string, unknown> }>()
const filter = vi.fn(async (type: string) => [...docs.values()].filter((d) => type === 'clip_instruction' && d._id.startsWith('i') && d.json_data.generating))
const get = vi.fn(async (type: string, id: string) => {
  const doc = docs.get(`${type}/${id}`) ?? null
  return doc ? structuredClone(doc) : null
})
vi.mock('@/components/providers/Session', () => ({
  useSession: () => ({ data: { filter, get, patch: vi.fn() }, files: {}, ai: {}, profile: { userId: 'u1' }, displayName: 'Martin', org: { json_data: {} } }),
}))
vi.mock('@/hooks/queries', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/hooks/queries')>()), useStations: () => ({ data: [] }) }))

import { CreationWatcher } from '@/hooks/useCreations'

const MIN = 60_000
const iso = (ms: number) => new Date(ms).toISOString()

function put(type: string, id: string, json: Record<string, unknown>) {
  docs.set(`${type}/${id}`, { _id: id, json_data: json })
}

/** L'instruction lancée au serveur depuis le téléphone, `agoMs` plus tôt ; son téléphone s'est tu depuis. */
function serverCreation(id: string, jobId: string, agoMs: number) {
  const at = iso(Date.now() - agoMs)
  const generating = {
    startedAt: at,
    heartbeatAt: at,
    stage: 'analyze',
    detail: null,
    byName: 'Martin',
    device: 'app',
    mode: 'server',
    jobId,
    job: { sourceIds: ['s1'], language: 'fr', operation: 'generate_s', forceKind: null, autoAnnotate: true, checkpoints: true },
  }
  put('clip_instruction', id, { title: 'Nouvelle instruction', status: 'draft', generating })
}

function job(id: string, over: Record<string, unknown>) {
  const at = iso(Date.now() - 33 * MIN)
  put('clip_job', id, { kind: 'generation', status: 'running', stage: 'analyze', steps: ['started', 'analyze'], startedAt: at, heartbeatAt: at, instructionId: 'i1', operation: 'generate_s', result: null, error: null, ...over })
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <CreationWatcher />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  docs.clear()
  finishServerGeneration.mockClear()
  get.mockClear()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('le surveillant termine une création faite au serveur', () => {
  it('app rouverte 34 minutes après le lancement : le travail fini est lu et l’instruction terminée', async () => {
    serverCreation('i1', 'j1', 34 * MIN)
    job('j1', { status: 'completed', stage: 'done', result: { json: { title: 'Nettoyer les rails' }, model: 'g', billing: { costs: { cad: 0.02 } } } })
    mount()
    await vi.waitFor(() => expect(finishServerGeneration).toHaveBeenCalledTimes(1))
    const input = finishServerGeneration.mock.calls[0][0]
    expect(input.doc._id).toBe('i1')
    expect(input.job?._id).toBe('j1')
  })

  // Chaque test a ses propres travaux : le surveillant retient une minute ceux qu'il vient de terminer.
  it('trois jours plus tard aussi ; un travail encore en cours au serveur n’est pas touché', async () => {
    serverCreation('i1', 'j3', 3 * 24 * 60 * MIN)
    job('j3', { status: 'completed', stage: 'done', result: { json: {}, model: 'g' } })
    serverCreation('i2', 'j4', 2 * MIN)
    job('j4', { instructionId: 'i2', startedAt: iso(Date.now() - 2 * MIN), heartbeatAt: iso(Date.now() - MIN) })
    mount()
    await vi.waitFor(() => expect(finishServerGeneration).toHaveBeenCalledTimes(1))
    // Les deux travaux sont lus (la relecture après la fin les relit : peu importe combien de fois).
    expect([...new Set(get.mock.calls.filter(([type]) => type === 'clip_job').map(([, id]) => id))].sort()).toEqual(['j3', 'j4'])
    expect(finishServerGeneration.mock.calls[0][0].doc._id).toBe('i1')
  })

  it('une fin qui n’a rien terminé (verrou d’un autre appareil) se reprend à une relecture suivante', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    serverCreation('i1', 'j5', 34 * MIN)
    job('j5', { status: 'completed', stage: 'done', result: { json: {}, model: 'g' } })
    mount()
    await vi.waitFor(() => expect(finishServerGeneration).toHaveBeenCalledTimes(1))
    // Le premier essai a rendu la main sans terminer : l'instruction est toujours en création.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(75_000)
    })
    await vi.waitFor(() => expect(finishServerGeneration).toHaveBeenCalledTimes(2))
  })
})
