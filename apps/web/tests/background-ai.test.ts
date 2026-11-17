/**
 * L'IA continue quand l'app quitte l'écran (toggle `backgroundAi`). Au téléphone, iOS suspend l'app
 * et coupe la requête en cours : la réponse de l'assistant se prépare donc au serveur (Job_start,
 * branche clip-v3, qui roule n'importe quelle requête avec un schéma, vérifié dans n8n), l'app la
 * reprend dans `clip_job` dès qu'elle revient, et débite son coût réel une fois. Sans serveur, la
 * demande part comme avant.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const shell = vi.hoisted(() => ({ native: false }))
vi.mock('@/lib/bridge/native', () => ({ inNativeShell: () => shell.native, nativeEnv: () => null, hasCapability: () => false, callNative: vi.fn(), onNativeEvent: () => () => undefined, haptic: () => undefined, NativeError: class extends Error {} }))

import { askAgent } from '@/lib/ai/agent'
import { durableAsk, DURABLE_PICKUP_MS, generatesOnServer, suspendsInBackground } from '@/lib/ai/durableAsk'
import { ApiError } from '@/lib/gateway/client'
import { jobDebitKey, type AskBody } from '@/lib/gateway/ai'
import { emptyContent, defaultStandard } from '@/lib/model/repo'
import type { ServerJob } from '@/lib/model/types'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

afterEach(() => {
  shell.native = false
  vi.restoreAllMocks()
})

const T0 = Date.parse('2026-11-17T15:00:00Z')
const job = (over: Partial<ServerJob>): { _id: string; json_data: ServerJob } => ({
  _id: 'job1',
  json_data: { kind: 'generation', status: 'running', stage: 'analyze', steps: [], startedAt: new Date(T0).toISOString(), heartbeatAt: new Date(T0).toISOString(), instructionId: 'i1', operation: 'edit_agent', result: null, error: null, ...over } as ServerJob,
})
const body: AskBody = { provider: 'google', level: 'mid', system_instruction: 'Assistant', prompt: 'Ajoute une étape', json_schema: { type: 'object' } }

/** Une passerelle factice : le travail rend tour à tour les états donnés. */
function fake(states: Array<ReturnType<typeof job> | null>, start: () => Promise<string> = async () => 'job1') {
  const reads = [...states]
  const ai = {
    startJob: vi.fn(start),
    ask: vi.fn(async () => ({ text: '', json: { reply: 'Sur l’appareil', operations: [] }, model: 'direct', usage: null, charged: null })),
    chargeCost: vi.fn(async () => 3),
  }
  const data = { get: vi.fn(async () => (reads.length > 1 ? reads.shift()! : reads[0])), patch: vi.fn(async () => undefined) }
  return { ai, data }
}

describe('une réponse qui survit à l’arrière-plan', () => {
  it('allumée par le serveur ; le repli ne l’active jamais', () => {
    expect(DEFAULT_TOGGLES.backgroundAi).toBe(true)
    expect(FALLBACK_TOGGLES.backgroundAi).toBe(false)
  })

  it('la demande part au serveur ; l’app relit le travail jusqu’à sa fin, débite son coût une fois et le ferme', async () => {
    const { ai, data } = fake([job({}), job({}), job({ status: 'completed', stage: 'done', result: { json: { reply: 'Fait', operations: [] }, model: 'gemini', billing: { costs: { cad: 0.004 } } } as ServerJob['result'] })])
    // L'horloge du travail : celle des états rendus (sans elle, la date du test vieillit et le travail paraît muet).
    const res = await durableAsk<{ reply: string }>({ ai, data } as never, 'edit_agent', body, { instructionId: 'i1', pollMs: 1, now: () => T0 })
    expect(ai.startJob).toHaveBeenCalledWith({ operation: 'edit_agent', instructionId: 'i1', ask: body })
    expect(ai.ask).not.toHaveBeenCalled()
    expect(res).toMatchObject({ json: { reply: 'Fait' }, model: 'gemini', charged: 3 })
    expect(ai.chargeCost).toHaveBeenCalledWith('edit_agent', 0.004, jobDebitKey('edit_agent', 'job1'), { model: 'gemini', ok: true, tokens: null })
    expect(data.patch).toHaveBeenCalledWith('clip_job', 'job1', { finalizedAt: expect.any(String) })
  })

  it('une lecture ratée au retour de l’arrière-plan se refait', async () => {
    const { ai, data } = fake([job({ status: 'completed', stage: 'done', result: { json: { reply: 'Fait' }, model: 'm' } as ServerJob['result'] })])
    data.get.mockRejectedValueOnce(new TypeError('Load failed'))
    await expect(durableAsk({ ai, data } as never, 'edit_agent', body, { instructionId: 'i1', pollMs: 1 })).resolves.toMatchObject({ json: { reply: 'Fait' } })
    expect(data.get).toHaveBeenCalledTimes(2)
  })

  it('le serveur ne prend pas la demande : elle part sur l’appareil ; un refus de facturation se montre tel quel', async () => {
    const down = fake([null], async () => Promise.reject(new ApiError('Le serveur n’a pas pris', 502, {}, 'job_not_started')))
    await expect(durableAsk({ ai: down.ai, data: down.data } as never, 'edit_agent', body, { instructionId: 'i1' })).resolves.toMatchObject({ model: 'direct' })
    const broke = fake([null], async () => Promise.reject(new ApiError('Plus de crédits', 402, {}, 'insufficient_credits')))
    await expect(durableAsk({ ai: broke.ai, data: broke.data } as never, 'edit_agent', body, { instructionId: 'i1' })).rejects.toThrow('Plus de crédits')
    expect(broke.ai.ask).not.toHaveBeenCalled()
  })

  it('pas pris en 45 secondes : la demande part sur l’appareil, sans attendre les 3 minutes de la génération', async () => {
    let now = T0
    const { ai, data } = fake([job({ stage: 'start' })])
    data.get.mockImplementation(async () => {
      now += DURABLE_PICKUP_MS / 2 + 1
      return job({ stage: 'start' })
    })
    await expect(durableAsk({ ai, data } as never, 'edit_agent', body, { instructionId: 'i1', pollMs: 1, now: () => now })).resolves.toMatchObject({ model: 'direct' })
  })

  it('une erreur de l’IA au serveur se dit, et son coût est débité', async () => {
    const { ai, data } = fake([job({ status: 'failed', stage: 'failed', result: { billing: { costs: { cad: 0.002 } } } as ServerJob['result'], error: { message: 'no_result' } } as Partial<ServerJob>)])
    await expect(durableAsk({ ai, data } as never, 'edit_agent', body, { instructionId: 'i1', pollMs: 1 })).rejects.toBeInstanceOf(ApiError)
    expect(ai.chargeCost).toHaveBeenCalledWith('edit_agent', 0.002, jobDebitKey('edit_agent', 'job1'), { model: null, ok: false })
    expect(ai.ask).not.toHaveBeenCalled()
  })

  it('arrêtée par la personne : rien n’est appliqué, mais le travail est suivi jusqu’au bout pour son coût', async () => {
    const { ai, data } = fake([job({}), job({ status: 'completed', stage: 'done', result: { json: { reply: 'Trop tard' }, model: 'm', billing: { costs: { cad: 0.003 } } } as ServerJob['result'] })])
    const stop = new AbortController()
    stop.abort()
    await expect(durableAsk({ ai, data } as never, 'edit_agent', body, { instructionId: 'i1', signal: stop.signal, pollMs: 1, now: () => T0 })).rejects.toMatchObject({ name: 'AbortError' })
    await vi.waitFor(() => expect(ai.chargeCost).toHaveBeenCalledWith('edit_agent', 0.003, jobDebitKey('edit_agent', 'job1'), { model: 'm', ok: true, tokens: null }), { timeout: 12_000 })
  }, 15_000)
})

describe('qui passe par le serveur', () => {
  it('l’app (et Safari sur iPhone) : oui ; un ordinateur : non', () => {
    shell.native = true
    expect(suspendsInBackground()).toBe(true)
    shell.native = false
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
    expect(suspendsInBackground()).toBe(true)
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    expect(suspendsInBackground()).toBe(false)
  })

  it('la génération : le choix de l’usine d’abord ; sans choix, au serveur sur tous les appareils', () => {
    shell.native = true
    expect(generatesOnServer(undefined, true)).toBe(true)
    expect(generatesOnServer(false, true)).toBe(false)
    expect(generatesOnServer(true, false)).toBe(false)
    // Un ordinateur aussi : on peut fermer l'onglet pendant que l'IA écrit (avant : sur l'appareil).
    shell.native = false
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    expect(generatesOnServer(undefined, true)).toBe(true)
    expect(generatesOnServer(false, true)).toBe(false)
    expect(generatesOnServer(undefined, false)).toBe(false)
  })

  it('l’assistant, au téléphone, prépare sa réponse au serveur sous le nom de l’instruction', async () => {
    const { ai, data } = fake([job({ status: 'completed', stage: 'done', result: { json: { reply: 'C’est fait', operations: [] }, model: 'm' } as ServerJob['result'] })])
    const turn = await askAgent(ai as never, { standard: defaultStandard(), learnings: [] }, emptyContent({ title: 'Changer le filtre' }), null, 'Ajoute une étape', [], { durable: { data: data as never, instructionId: 'i1' } })
    expect(turn.reply).toBe('C’est fait')
    expect(ai.startJob).toHaveBeenCalledWith(expect.objectContaining({ operation: 'edit_agent', instructionId: 'i1' }))
    expect(ai.ask).not.toHaveBeenCalled()
  })
})
