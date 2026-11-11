import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/bridge/native', () => ({ inNativeShell: () => true, hasCapability: (c: string) => c === 'keepAwake', callNative: vi.fn(async () => ({})) }))
vi.mock('@/lib/ai/generate', () => ({ generateInstruction: vi.fn(), enrichMedia: vi.fn(async (c: unknown) => c) }))

import { statusOf } from '@/components/InstructionCard'
import { creationOf, creationReporter, diffCreations, HEARTBEAT_MS, STALE_MS, type CreationClock } from '@/lib/ai/creation'
import { enrichMedia, generateInstruction } from '@/lib/ai/generate'
import { clearJob, jobOf } from '@/lib/ai/jobs'
import { startGeneration } from '@/lib/ai/runGeneration'
import { callNative } from '@/lib/bridge/native'
import type { Instruction } from '@/lib/model/types'

const T0 = Date.parse('2026-11-11T15:00:00Z')
const iso = (ms: number) => new Date(ms).toISOString()
const info = (beatAgoMs: number) => ({ startedAt: iso(T0 - 600_000), heartbeatAt: iso(T0 - beatAgoMs), stage: 'analyze', device: 'app' as const, byName: 'Mélanie' })

/** Une horloge à la main : `tick` avance le temps et déclenche les signes de vie dus. */
function manualClock() {
  let now = T0
  const timers: Array<{ fn: () => void; ms: number; next: number }> = []
  const clock: CreationClock = {
    now: () => now,
    every: (fn, ms) => {
      const t = { fn, ms, next: now + ms }
      timers.push(t)
      return () => timers.splice(timers.indexOf(t), 1)
    },
  }
  return {
    clock,
    tick(ms: number) {
      now += ms
      for (const t of [...timers]) while (t.next <= now) (t.fn(), (t.next += t.ms))
    },
    active: () => timers.length,
  }
}

afterEach(() => vi.clearAllMocks())

describe('l’état d’une création', () => {
  it('en cours tant que l’appareil donne signe de vie, interrompue après deux minutes de silence', () => {
    expect(creationOf({ generating: info(10_000) }, T0).kind).toBe('running')
    expect(creationOf({ generating: info(STALE_MS) }, T0).kind).toBe('running')
    expect(creationOf({ generating: info(STALE_MS + 1) }, T0).kind).toBe('stale')
    expect(creationOf({ generating: null }, T0).kind).toBe('none')
    expect(creationOf(undefined, T0).kind).toBe('none')
  })

  it('les créations apparues et disparues entre deux lectures', () => {
    expect(diffCreations(new Set(['a', 'b']), new Set(['b', 'c']))).toEqual({ started: ['c'], finished: ['a'] })
  })

  it('les cartes disent « En création », puis « Interrompue » si l’instruction n’a rien encore', () => {
    const base = { status: 'draft', stepCount: 0, sourceCount: 2, publishedVersion: null } as unknown as Instruction
    expect(statusOf({ ...base, generating: info(5_000) }, T0)).toMatchObject({ label: 'En création', busy: true })
    expect(statusOf({ ...base, generating: info(STALE_MS + 60_000) }, T0).label).toBe('Interrompue')
    expect(statusOf({ ...base, stepCount: 6, generating: info(STALE_MS + 60_000) }, T0).label).toBe('Brouillon')
  })
})

describe('ce que l’appareil qui génère écrit', () => {
  it('l’état au départ, chaque nouvelle étape, un signe de vie toutes les 30 s, dans l’ordre', async () => {
    const order: string[] = []
    let release: () => void = () => undefined
    const patch = vi.fn((_t: string, _id: string, p: Record<string, unknown>) => {
      order.push(Object.keys(p).join(','))
      // La première écriture tarde : les suivantes doivent l'attendre.
      return order.length === 1 ? new Promise<void>((r) => (release = r)) : Promise.resolve()
    })
    const c = manualClock()
    const r = creationReporter({ patch } as never, 'i1', { name: 'Mélanie', device: 'app' }, c.clock)
    r.start()
    r.stage('analyze')
    r.stage('analyze', '2 fichiers sur 3')
    c.tick(HEARTBEAT_MS)
    await new Promise((r) => setTimeout(r, 0))
    // La première écriture est partie et n'a pas répondu : rien d'autre ne passe devant.
    expect(order).toEqual(['generating,generationError'])
    release()
    await r.settle()
    expect(order).toEqual(['generating,generationError', 'generating.stage,generating.detail,generating.heartbeatAt', 'generating.heartbeatAt,generating.stage,generating.detail'])
    expect(patch.mock.calls[0][2]).toMatchObject({ generating: { stage: 'prepare', device: 'app', byName: 'Mélanie', startedAt: iso(T0) }, generationError: null })
    expect(patch.mock.calls[2][2]).toEqual({ 'generating.heartbeatAt': iso(T0 + HEARTBEAT_MS), 'generating.stage': 'analyze', 'generating.detail': '2 fichiers sur 3' })
    r.stop()
    expect(c.active()).toBe(0)
  })

  it('une écriture ratée ne gêne pas la génération, et l’échec efface l’état avec son message', async () => {
    const patch = vi.fn(async () => {
      throw new Error('réseau')
    })
    const c = manualClock()
    const r = creationReporter({ patch } as never, 'i1', { device: 'web' }, c.clock)
    r.start()
    await expect(r.fail('Vidéo illisible')).resolves.toBeUndefined()
    expect(patch).toHaveBeenLastCalledWith('clip_instruction', 'i1', { generating: null, generationError: { at: iso(T0), message: 'Vidéo illisible' } })
    expect(c.active()).toBe(0)
  })
})

describe('la génération écrit son état dans l’instruction', () => {
  const doc = { _id: 'i9', json_data: { title: 'Changer la matrice', status: 'draft', stationIds: [], sources: [], draft: null, publishedVersion: null } as unknown as Instruction }
  const content = { title: 'Changer la matrice', summary: '', kind: 'procedure', category: 'production', tags: [], steps: [{ id: 's1', title: 'Couper', text: 'Couper l’alimentation.', media: [] }] }
  const run = (patch: ReturnType<typeof vi.fn>) =>
    startGeneration({ doc, data: { patch } as never, files: { upload: vi.fn() } as never, ai: {} as never, org: {} as never, stations: [], actor: { id: 'u1', name: 'Mélanie' } })

  it('réussie : l’état part au début, s’efface avec le brouillon ; l’écran reste allumé pendant', async () => {
    vi.mocked(generateInstruction).mockResolvedValue({ content, sources: [], model: 'm', operation: 'generate_s', questions: [], stationGuess: null } as never)
    vi.mocked(enrichMedia).mockImplementation(async (c) => c)
    const patch = vi.fn(async (_t: string, _id: string, _p: Record<string, unknown>) => undefined)
    await run(patch)
    const first = patch.mock.calls[0][2] as Record<string, unknown>
    const last = patch.mock.calls.at(-1)![2] as Record<string, unknown>
    expect(first.generating).toMatchObject({ device: 'app', byName: 'Mélanie', stage: 'prepare' })
    expect(last).toMatchObject({ generating: null, generationError: null, title: 'Changer la matrice', stepCount: 1 })
    expect(vi.mocked(callNative).mock.calls.map((c) => c[1])).toEqual([{ on: true }, { on: false }])
    expect(jobOf('i9')?.status).toBe('done')
    clearJob('i9')
  })

  it('ratée : l’état s’efface avec le message, pour les autres appareils', async () => {
    vi.mocked(generateInstruction).mockRejectedValue(new Error('La vidéo est illisible.'))
    const patch = vi.fn(async (_t: string, _id: string, _p: Record<string, unknown>) => undefined)
    await run(patch)
    expect(patch.mock.calls.at(-1)![2]).toMatchObject({ generating: null, generationError: { message: 'La vidéo est illisible.' } })
    expect(jobOf('i9')).toMatchObject({ status: 'error', message: 'La vidéo est illisible.' })
    clearJob('i9')
  })
})
