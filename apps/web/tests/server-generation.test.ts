import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/bridge/native', () => ({ inNativeShell: () => false, hasCapability: () => false, callNative: vi.fn(async () => ({})) }))
vi.mock('@/lib/realtime/client', () => ({ publishRealtime: vi.fn() }))
vi.mock('@/lib/ai/autoAnnotate', () => ({ annotateMarks: vi.fn() }))
vi.mock('@/lib/ai/generate', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/ai/generate')>()), enrichMedia: vi.fn(async (c: unknown) => c) }))

import { creationOf, SERVER_STALE_MS, STALE_MS } from '@/lib/ai/creation'
import { clearJob } from '@/lib/ai/jobs'
import { finishServerGeneration, startGeneration } from '@/lib/ai/runGeneration'
import { DEVICE_ID, FINISH_LOCK_MS, JOB_IGNORED_FIELDS, JOB_RELAYED_FIELDS, jobOutcome, SERVER_PICKUP_MS, serverJobIds } from '@/lib/ai/serverJob'
import { importAsk, prepareGeneration } from '@/lib/ai/generate'
import { APP_IDENTIFIER } from '@/lib/config'
import { aiApi, jobDebitKey, jobRecordId, type AskBody } from '@/lib/gateway/ai'
import { ApiError } from '@/lib/gateway/client'
import type { Doc } from '@/lib/gateway/data'
import { defaultStandard, T } from '@/lib/model/repo'
import type { Instruction, ServerJob } from '@/lib/model/types'
import { publishRealtime } from '@/lib/realtime/client'
import { fakeGateway } from './fakeClient'

const ask: AskBody = { prompt: 'p', system_instruction: 's', provider: 'google', level: 'mid', json_schema: { type: 'object' } }
const now = Date.parse('2026-11-14T12:00:00.000Z')
const iso = (ms: number) => new Date(ms).toISOString()

afterEach(() => {
  vi.clearAllMocks()
  clearJob('i1')
})

describe('Job_start : le travail au serveur', () => {
  it('lit l’identifiant sous ses trois noms, et rien d’autre', () => {
    expect(jobRecordId({ record_id: 'a' })).toBe('a')
    expect(jobRecordId({ inserted_id: 'b' })).toBe('b')
    expect(jobRecordId({ slideshow_id: 'c' })).toBe('c')
    expect(jobRecordId({ success: true })).toBeNull()
    expect(jobRecordId({ record_id: '  ' })).toBeNull()
    expect(jobRecordId(null)).toBeNull()
  })

  it('part sur la branche clip-v3 avec la requête AskAI telle quelle, sous l’application de connexion', async () => {
    const gw = fakeGateway(() => ({ success: true, job_status: 'processing', record_id: 'job1' }))
    const id = await aiApi(gw, { billing: false }).startJob({ operation: 'generate_s', instructionId: 'i1', ask })
    expect(id).toBe('job1')
    expect(gw.calls.map((c) => c.endpoint)).toEqual(['/api/v1/ai/job/start'])
    expect(gw.calls[0].options.body).toEqual({ provider: 'google', level: 'mid', appIdentifier: 'clip-v3', data: { dataApp: APP_IDENTIFIER, instructionId: 'i1', operation: 'generate_s', ask } })
    // Jamais de grant dans le corps : la Gateway le pose elle-même depuis le jeton.
    expect(JSON.stringify(gw.calls[0].options.body)).not.toContain('grant')
  })

  it('une branche qui ne rend aucun identifiant échoue bruyamment', async () => {
    const gw = fakeGateway(() => ({ success: true }))
    await expect(aiApi(gw, { billing: false }).startJob({ operation: 'generate_s', instructionId: 'i1', ask })).rejects.toMatchObject({ code: 'job_not_started' })
  })

  it('facturation allumée : le solde est relu avant ; à zéro, rien ne part au serveur', async () => {
    const gw = fakeGateway((endpoint) => (endpoint === '/api/v2/billing/context' ? { credits: [{ feature_key: 'ai_credits', available: 0 }] } : { record_id: 'job1' }))
    await expect(aiApi(gw, { billing: true }).startJob({ operation: 'generate_s', instructionId: 'i1', ask })).rejects.toMatchObject({ status: 402 })
    expect(gw.calls.map((c) => c.endpoint)).toEqual(['/api/v2/billing/context'])
  })

  it('le coût d’un travail se débite avec la clé du travail : la même sur tous les appareils', async () => {
    const gw = fakeGateway(() => ({ consumed: 5 }))
    const api = aiApi(gw, { billing: true, creditRate: 400 })
    const key = jobDebitKey('generate_m', 'job9')
    expect(await api.chargeCost('generate_m', 0.0123, key, { model: 'gemini', ok: true })).toBe(5)
    expect(await api.chargeCost('generate_m', 0.0123, key, { model: 'gemini', ok: true })).toBe(5)
    const bodies = gw.calls.map((c) => c.options.body as { idempotency_key: string; quantity: number })
    expect(bodies.map((b) => b.idempotency_key)).toEqual([key, key])
    expect(bodies[0].quantity).toBe(5)
  })

  it('facturation éteinte ou coût inconnu : rien n’est débité', async () => {
    const off = fakeGateway(() => ({ consumed: 1 }))
    expect(await aiApi(off, { billing: false }).chargeCost('generate_s', 0.02, 'k', { ok: true })).toBeNull()
    const unknown = fakeGateway(() => ({ consumed: 1 }))
    expect(await aiApi(unknown, { billing: true }).chargeCost('generate_s', null, 'k', { ok: false })).toBeNull()
    expect([...off.calls, ...unknown.calls]).toEqual([])
  })
})

describe('où en est un travail au serveur', () => {
  const job = (over: Partial<ServerJob>): ServerJob => ({ kind: 'generation', status: 'running', stage: 'analyze', steps: ['started', 'analyze'], startedAt: iso(now - 60_000), heartbeatAt: iso(now - 60_000), instructionId: 'i1', operation: 'generate_s', result: null, error: null, ...over })

  it('fini, raté, en cours, jamais pris, introuvable, déjà terminé', () => {
    expect(jobOutcome(job({ status: 'completed', result: { json: { title: 'T' }, model: 'g', billing: { costs: { cad: 0.01 } } } }), now)).toEqual({ kind: 'completed', json: { title: 'T' }, model: 'g', costCad: 0.01 })
    expect(jobOutcome(job({ status: 'failed', result: { billing: { costs: { cad: 0.002 } } }, error: { message: 'no_result' } }), now)).toMatchObject({ kind: 'failed', costCad: 0.002, reason: 'error' })
    expect(jobOutcome(job({}), now)).toEqual({ kind: 'running' })
    expect(jobOutcome(job({ stage: 'start', startedAt: iso(now - SERVER_PICKUP_MS + 1000) }), now)).toEqual({ kind: 'running' })
    expect(jobOutcome(job({ stage: 'start', startedAt: iso(now - SERVER_PICKUP_MS - 1000) }), now)).toMatchObject({ kind: 'failed', reason: 'stuck', costCad: null })
    expect(jobOutcome(null, now)).toMatchObject({ kind: 'failed', reason: 'missing' })
    expect(jobOutcome(job({ status: 'completed', finalizedAt: iso(now) }), now)).toEqual({ kind: 'done' })
  })

  it('une création au serveur ne s’interrompt qu’après 30 minutes sans nouvelle', () => {
    const at = (ago: number, mode?: 'server') => ({ generating: { startedAt: iso(now - ago), heartbeatAt: iso(now - ago), stage: 'analyze', device: 'app' as const, ...(mode ? { mode, jobId: 'j' } : {}) } })
    expect(creationOf(at(STALE_MS + 1000, 'server'), now), 'le téléphone fermé : le serveur continue').toMatchObject({ kind: 'running' })
    expect(creationOf(at(STALE_MS + 1000), now).kind).toBe('stale')
    expect(creationOf(at(SERVER_STALE_MS + 1000, 'server'), now).kind).toBe('stale')
  })

  it('les travaux d’une liste de créations, sans doublon', () => {
    const c = (g: object | null) => ({ json_data: { generating: g as never } })
    expect(serverJobIds([c({ mode: 'server', jobId: 'a' }), c({ mode: 'server', jobId: 'a' }), c({ mode: 'device' }), c(null), c({ mode: 'server', jobId: 'b' })])).toEqual(['a', 'b'])
  })
})

/** Une base de données en mémoire, qui applique les PATCH en notation pointée comme la Gateway. */
function memoryData(initial: Record<string, Doc<unknown>>) {
  const docs = new Map(Object.entries(initial).map(([k, v]) => [k, structuredClone(v)]))
  const set = (obj: Record<string, unknown>, path: string, value: unknown) => {
    const keys = path.split('.')
    let at = obj
    for (const k of keys.slice(0, -1)) at = (at[k] ??= {}) as Record<string, unknown>
    at[keys[keys.length - 1]] = value
  }
  const patch = vi.fn(async (type: string, id: string, partial: Record<string, unknown>) => {
    const doc = docs.get(`${type}/${id}`)
    if (!doc) throw new ApiError('absent', 404)
    for (const [k, v] of Object.entries(partial)) set(doc.json_data as Record<string, unknown>, k, structuredClone(v))
  })
  const get = vi.fn(async (type: string, id: string) => {
    const doc = docs.get(`${type}/${id}`)
    return doc ? structuredClone(doc) : null
  })
  return { docs, patch, get, api: { patch, get } as never }
}

const photo = { id: 'p1', kind: 'photo' as const, url: 'https://x/p.jpg', mimeType: 'image/jpeg', createdAt: iso(now) }
const note = { id: 'n1', kind: 'note' as const, text: 'Serrer à 25 N·m', createdAt: iso(now) }
const baseInstruction = { title: 'Serrer la bride', status: 'draft', stationIds: [], sources: [photo, note], draft: null, publishedVersion: null, tags: [] } as unknown as Instruction
const aiJson = { title: 'Serrer la bride', kind: 'procedure', category: 'assemblage', steps: [{ title: 'Serrer la bride', text: 'Serrer à 25 N·m.', warningLevel: 'none', media: [{ source: 'S1' }] }] }
const org = { standard: defaultStandard(), learnings: [] } as never

describe('lancer au serveur', () => {
  it('prépare la requête, la confie au serveur, et libère l’appareil (aucun brouillon écrit ici)', async () => {
    const db = memoryData({ [`${T.instruction}/i1`]: { _id: 'i1', json_data: baseInstruction } })
    const startJob = vi.fn(async () => 'job1')
    const askAi = vi.fn()
    await startGeneration({ doc: { _id: 'i1', json_data: baseInstruction }, data: db.api, files: {} as never, ai: { startJob, ask: askAi } as never, org, stations: [], actor: { id: 'u1', name: 'Mélanie' }, server: true })
    expect(askAi).not.toHaveBeenCalled()
    const sent = (startJob.mock.calls[0] as unknown as [{ operation: string; instructionId: string; ask: AskBody }])[0]
    expect(sent.instructionId).toBe('i1')
    expect(sent.ask.files).toEqual([{ url: photo.url, filename: 'S1.jpg', mimeType: 'image/jpeg', sizeBytes: undefined }])
    expect(sent.ask.json_schema).toBeTruthy()
    const g = (db.docs.get(`${T.instruction}/i1`)!.json_data as Instruction).generating!
    expect(g).toMatchObject({ mode: 'server', jobId: 'job1', stage: 'analyze', job: { sourceIds: ['p1', 'n1'], operation: sent.operation, autoAnnotate: true } })
    expect((db.docs.get(`${T.instruction}/i1`)!.json_data as Instruction).draft).toBeNull()
    expect(vi.mocked(publishRealtime).mock.calls.map((c) => (c[0] as { phase?: string }).phase)).toContain('stage')
  })

  it('un serveur qui ne prend pas la génération la laisse tourner ici, avec la même requête', async () => {
    const db = memoryData({ [`${T.instruction}/i1`]: { _id: 'i1', json_data: baseInstruction } })
    const startJob = vi.fn(async () => {
      throw new ApiError('Le serveur n’a pas pris la génération.', 502, {}, 'job_not_started')
    })
    const askAi = vi.fn(async () => ({ json: aiJson, model: 'gemini', text: '', usage: null, charged: null }))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await startGeneration({ doc: { _id: 'i1', json_data: baseInstruction }, data: db.api, files: {} as never, ai: { startJob, ask: askAi } as never, org, stations: [], actor: { id: 'u1', name: 'Mélanie' }, server: true })
    warn.mockRestore()
    expect(askAi).toHaveBeenCalledTimes(1)
    expect((askAi.mock.calls[0] as unknown as [string, AskBody])[1]).toEqual((startJob.mock.calls[0] as unknown as [{ ask: AskBody }])[0].ask)
    const saved = db.docs.get(`${T.instruction}/i1`)!.json_data as Instruction
    expect(saved.draft?.steps[0].title).toBe('Serrer la bride')
    expect(saved.generating).toBeNull()
  })

  it('un refus de facturation se montre tel quel : pas de génération sur l’appareil', async () => {
    const db = memoryData({ [`${T.instruction}/i1`]: { _id: 'i1', json_data: baseInstruction } })
    const startJob = vi.fn(async () => {
      throw new ApiError('Plus de crédits', 402, {}, 'insufficient_credits')
    })
    const askAi = vi.fn()
    await startGeneration({ doc: { _id: 'i1', json_data: baseInstruction }, data: db.api, files: {} as never, ai: { startJob, ask: askAi } as never, org, stations: [], actor: { id: 'u1', name: 'Mélanie' }, server: true })
    expect(askAi).not.toHaveBeenCalled()
    expect((db.docs.get(`${T.instruction}/i1`)!.json_data as Instruction).generationError?.message).toBe('Plus de crédits')
  })
})

describe('terminer sur un autre appareil', () => {
  const context = { sourceIds: ['p1', 'n1'], language: 'fr', operation: 'generate_s', forceKind: null, autoAnnotate: false, checkpoints: false }
  const running = (finishing?: { at: string; by: string }): Instruction => ({ ...baseInstruction, generating: { startedAt: iso(Date.now() - 60_000), heartbeatAt: iso(Date.now() - 60_000), stage: 'analyze', device: 'app', byName: 'Mélanie', mode: 'server', jobId: 'job1', job: context, finishing: finishing ?? null } })
  const jobDoc = (over: Partial<ServerJob>): Doc<ServerJob> => ({ _id: 'job1', json_data: { kind: 'generation', status: 'completed', stage: 'done', steps: [], startedAt: iso(Date.now() - 90_000), heartbeatAt: iso(Date.now()), instructionId: 'i1', operation: 'generate_s', result: { json: aiJson, model: 'gemini', billing: { costs: { cad: 0.0123 } } }, error: null, ...over } })

  it('le travail fini : un seul appareil termine, débite une fois avec la clé du travail, et ferme le travail', async () => {
    const job = jobDoc({})
    const db = memoryData({ [`${T.instruction}/i1`]: { _id: 'i1', json_data: running() }, [`${T.serverJob}/job1`]: job })
    const chargeCost = vi.fn(async () => 5)
    await finishServerGeneration({ doc: { _id: 'i1', json_data: running() }, job, data: db.api, files: {} as never, ai: { chargeCost } as never, stations: [], actor: { id: 'u2', name: 'Paul' } })
    expect(chargeCost).toHaveBeenCalledWith('generate_s', 0.0123, jobDebitKey('generate_s', 'job1'), { model: 'gemini', ok: true })
    const saved = db.docs.get(`${T.instruction}/i1`)!.json_data as Instruction
    expect(saved.draft?.steps).toHaveLength(1)
    expect(saved.draft?.steps[0].media[0]).toMatchObject({ kind: 'image', url: photo.url })
    expect(saved.generating).toBeNull()
    expect(saved.generation).toMatchObject({ model: 'gemini', operation: 'generate_s', mode: 'server' })
    expect((db.docs.get(`${T.serverJob}/job1`)!.json_data as ServerJob).finalizedAt).toBeTruthy()
    // Le verrou a été posé avant tout le reste.
    expect(db.patch.mock.calls[0][2]).toMatchObject({ 'generating.finishing': { by: DEVICE_ID } })
  })

  it('un autre appareil la termine déjà : on n’y touche pas', async () => {
    const lock = { at: iso(Date.now() - 10_000), by: 'tab_autre' }
    const db = memoryData({ [`${T.instruction}/i1`]: { _id: 'i1', json_data: running(lock) }, [`${T.serverJob}/job1`]: jobDoc({}) })
    const chargeCost = vi.fn()
    await finishServerGeneration({ doc: { _id: 'i1', json_data: running(lock) }, job: jobDoc({}), data: db.api, files: {} as never, ai: { chargeCost } as never, stations: [], actor: { id: 'u2', name: 'Paul' } })
    expect(db.patch).not.toHaveBeenCalled()
    expect(chargeCost).not.toHaveBeenCalled()
  })

  it('un verrou trop vieux se reprend (l’appareil qui terminait s’est fermé)', async () => {
    const lock = { at: iso(Date.now() - FINISH_LOCK_MS - 1000), by: 'tab_autre' }
    const db = memoryData({ [`${T.instruction}/i1`]: { _id: 'i1', json_data: running(lock) }, [`${T.serverJob}/job1`]: jobDoc({}) })
    await finishServerGeneration({ doc: { _id: 'i1', json_data: running(lock) }, job: jobDoc({}), data: db.api, files: {} as never, ai: { chargeCost: vi.fn(async () => null) } as never, stations: [], actor: { id: 'u2', name: 'Paul' } })
    expect((db.docs.get(`${T.instruction}/i1`)!.json_data as Instruction).draft?.steps).toHaveLength(1)
  })

  it('le travail a échoué : son coût est dû, l’erreur s’affiche, et la relance se fera sur l’appareil', async () => {
    const failed = jobDoc({ status: 'failed', result: { billing: { costs: { cad: 0.004 } } }, error: { message: 'no_result' } })
    const db = memoryData({ [`${T.instruction}/i1`]: { _id: 'i1', json_data: running() }, [`${T.serverJob}/job1`]: failed })
    const chargeCost = vi.fn(async () => 2)
    await finishServerGeneration({ doc: { _id: 'i1', json_data: running() }, job: failed, data: db.api, files: {} as never, ai: { chargeCost } as never, stations: [], actor: { id: 'u2', name: 'Paul' } })
    expect(chargeCost).toHaveBeenCalledWith('generate_s', 0.004, jobDebitKey('generate_s', 'job1'), { model: null, ok: false })
    const saved = db.docs.get(`${T.instruction}/i1`)!.json_data as Instruction
    expect(saved.generating).toBeNull()
    expect(saved.generationError).toMatchObject({ server: true })
    expect((db.docs.get(`${T.serverJob}/job1`)!.json_data as ServerJob).finalizedAt).toBeTruthy()
  })

  it('un travail encore en cours ou déjà terminé ne se touche pas', async () => {
    const db = memoryData({ [`${T.instruction}/i1`]: { _id: 'i1', json_data: running() } })
    await finishServerGeneration({ doc: { _id: 'i1', json_data: running() }, job: jobDoc({ status: 'running', stage: 'analyze', result: null }), data: db.api, files: {} as never, ai: {} as never, stations: [], actor: { id: 'u2', name: 'Paul' } })
    await finishServerGeneration({ doc: { _id: 'i1', json_data: running() }, job: jobDoc({ finalizedAt: iso(Date.now()) }), data: db.api, files: {} as never, ai: {} as never, stations: [], actor: { id: 'u2', name: 'Paul' } })
    expect(db.patch).not.toHaveBeenCalled()
  })
})

describe('« Générer » pendant les envois', () => {
  it('attend la fin des envois en cours ; un envoi raté ne bloque rien', async () => {
    const { CaptureSession } = await import('@/lib/capture/session')
    const s = new CaptureSession({ data: {} as never, files: {} as never, actor: { id: 'u1', name: 'Mélanie' } }, { instructionId: 'i1', sources: [] })
    await s.whenUploaded()
    const first = s.beginImport('video', 'Clip')
    const second = s.beginImport('document', 'Plan')
    let done = false
    const wait = s.whenUploaded().then(() => {
      done = true
    })
    s.dismissPending(first)
    await Promise.resolve()
    expect(done, 'un envoi reste en cours').toBe(false)
    s.dismissPending(second)
    await wait
    expect(done).toBe(true)
  })
})

describe('la branche clip-v3 de Job_start suit la façon d’analyser', () => {
  it('chaque champ des requêtes de génération et d’import est relayé par la branche n8n (sinon : mettre à jour « Run AskAI V4 »)', async () => {
    const known = new Set<string>([...JOB_RELAYED_FIELDS, ...JOB_IGNORED_FIELDS])
    const video = { id: 'v1', kind: 'video' as const, url: 'https://x/v.mp4', durationSec: 400, sizeBytes: 10, geminiFileUri: 'https://gemini/f', geminiExpiresAt: iso(Date.now() + 40 * 3600_000), createdAt: iso(now) }
    const gen = await prepareGeneration({ files: {} as never, org, sources: [photo, note, video], stationNames: ['Presse 4'] })
    const imp = importAsk({ org, source: { id: 'd1', kind: 'document', url: 'https://x/d.pdf', pageCount: 3, createdAt: iso(now) }, stationNames: [] })
    for (const ask of [gen.ask, imp.ask]) for (const field of Object.keys(ask)) expect(known.has(field), `champ « ${field} » absent de la branche clip-v3`).toBe(true)
  })
})
