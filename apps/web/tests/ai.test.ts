import { describe, expect, it } from 'vitest'
import { onAiCost, onRefusal, onSettled } from '@/lib/billing/bus'
import { aiApi, aiCostCad, creditsForCost, onAiDebitError, type AskBody } from '@/lib/gateway/ai'
import { ApiError } from '@/lib/gateway/client'
import { fakeGateway } from './fakeClient'

const body: AskBody = { prompt: 'p', system_instruction: 's', provider: 'google', level: 'mid' }

describe('aiApi.ask', () => {
  it('facturation éteinte : seulement /api/v4/assistant/ask, aucune route de facturation, rien de débité', async () => {
    const gw = fakeGateway(() => ({ success: true, results: { assistant_response: '{"a":1}', parsed_json: { a: 1 }, model: 'm' }, billing: { costs: { cad: 0.02 } } }))
    const r = await aiApi(gw, { billing: false }).ask('step_assist', body)
    expect(gw.calls.map((c) => c.endpoint)).toEqual(['/api/v4/assistant/ask'])
    expect(gw.calls[0].options.body).toEqual(body)
    expect(r.json).toEqual({ a: 1 })
    expect(r.charged).toBeNull()
  })

  it('une réponse en erreur de l’assistant devient une erreur lisible', async () => {
    const gw = fakeGateway(() => ({ success: false, results: { error: 'JSON_PARSE_ERROR' } }))
    await expect(aiApi(gw, { billing: false }).ask('generate_s', { ...body, json_schema: {} })).rejects.toMatchObject({ code: 'JSON_PARSE_ERROR' })
  })
})

/**
 * L'IA facturée au coût réel : le solde relu avant, la réponse, puis son coût réel débité après.
 * Le taux des tests est arbitraire : la valeur réelle d'un crédit ne s'écrit nulle part dans le dépôt.
 */
describe('aiApi.ask, facturation allumée : débitée de son coût réel, après', () => {
  const RATE = 400
  type Reply = unknown | ApiError
  function routed(r: { available?: number | null; ask?: Reply | Reply[]; consume?: Reply | Reply[] }) {
    const queue = (x: Reply | Reply[] | undefined) => (Array.isArray(x) ? [...x] : x === undefined ? [] : [x])
    const asks = queue(r.ask)
    const consumes = queue(r.consume)
    const next = (q: Reply[]) => (q.length > 1 ? q.shift() : q[0])
    return fakeGateway((endpoint) => {
      if (endpoint === '/api/v2/billing/context') return { credits: r.available === null ? [] : [{ feature_key: 'ai_credits', available: r.available ?? 100 }] }
      if (endpoint === '/api/v4/assistant/ask') return next(asks)
      if (endpoint === '/api/v2/billing/consume') return next(consumes)
      return new ApiError('route inconnue', 404, { code: 'not_found' })
    })
  }
  const answer = (cad: number, merged = false) => ({
    success: true,
    results: { assistant_response: 'ok', model: 'gemini' },
    usage_normalized: { billing_model: 'gemini-3.8-pro', input_tokens: 8597, output_tokens_total: 530 },
    [merged ? 'billing_merged' : 'billing']: { costs: { cad } },
  })
  const debited = (consumed: number) => ({ entry_id: 1, replayed: false, consumed, balance_after: 90, unit: 'credit' })

  it('le solde relu, la réponse, puis le coût réel converti en crédits et débité avec la clé de l’appel', async () => {
    const gw = routed({ ask: answer(0.0231), consume: debited(10) })
    const costs: unknown[] = []
    let settled = 0
    const offCost = onAiCost((c) => costs.push(c))
    const offSettled = onSettled(() => settled++)
    const r = await aiApi(gw, { billing: true, creditRate: RATE }).ask('generate_s', body, { scope: 'generation' })
    offCost()
    offSettled()
    // Jamais l'ancienne route à prix fixe, jamais un assistant non mesuré.
    expect(gw.calls.map((c) => c.endpoint)).toEqual(['/api/v2/billing/context', '/api/v4/assistant/ask', '/api/v2/billing/consume'])
    expect(gw.calls[0].options.headers).toMatchObject({ 'X-Product': 'clip-v3' })
    expect(gw.calls[1].options.body).toEqual(body)
    const sent = gw.calls[2].options.body as Record<string, any>
    expect(gw.calls[2].options.headers).toMatchObject({ 'X-Product': 'clip-v3' })
    expect(sent).toMatchObject({ feature_key: 'ai_credits', quantity: creditsForCost(0.0231, RATE) })
    expect(sent.quantity).toBe(10)
    expect(String(sent.idempotency_key)).toMatch(/^clip:generate_s:generation:/)
    expect(sent.metadata).toEqual({ operation: 'generate_s', cost_cad: 0.0231, model: 'gemini-3.8-pro', input_tokens: 8597, output_tokens: 530 })
    expect(r.charged).toBe(10)
    expect(costs).toEqual([{ operation: 'generate_s', costCad: 0.0231, charged: 10 }])
    expect(settled).toBe(1)
  })

  it('plusieurs lots de fichiers : le coût fusionné (billing_merged)', async () => {
    const gw = routed({ ask: answer(0.1, true), consume: debited(40) })
    await aiApi(gw, { billing: true, creditRate: RATE }).ask('generate_l', body)
    expect((gw.calls[2].options.body as Record<string, unknown>).quantity).toBe(40)
  })

  it('à zéro crédit ou moins : refus 402 sans appeler l’IA, et le paywall s’ouvre', async () => {
    for (const available of [0, -15]) {
      const gw = routed({ available, ask: answer(0.01) })
      const refusals: string[] = []
      const off = onRefusal((x) => refusals.push(`${x.status}:${x.code}:${x.featureKey}`))
      await expect(aiApi(gw, { billing: true, creditRate: RATE }).ask('translate', body)).rejects.toMatchObject({ status: 402, code: 'insufficient_credits' })
      off()
      expect(refusals).toEqual(['402:insufficient_credits:ai_credits'])
      expect(gw.calls.map((c) => c.endpoint)).toEqual(['/api/v2/billing/context'])
    }
  })

  it('les crédits d’IA hors du plan : refus 403, sans appel', async () => {
    const gw = routed({ available: null, ask: answer(0.01) })
    await expect(aiApi(gw, { billing: true, creditRate: RATE }).ask('quiz', body)).rejects.toMatchObject({ status: 403, code: 'not_entitled' })
    expect(gw.calls.map((c) => c.endpoint)).toEqual(['/api/v2/billing/context'])
  })

  it('sans taux réglé dans l’environnement : refus, rien ne part (jamais d’IA ouverte sans débit)', async () => {
    const gw = routed({ ask: answer(0.01) })
    await expect(aiApi(gw, { billing: true, creditRate: null }).ask('annotate', body)).rejects.toMatchObject({ code: 'billing_misconfigured' })
    expect(gw.calls).toHaveLength(0)
  })

  it('une réponse en échec qui rend un coût est débitée de ce coût, puis l’erreur remonte', async () => {
    const gw = routed({ ask: new ApiError('ai', 502, { code: 'ai_failed', billing: { costs: { cad: 0.004 } } }), consume: debited(2) })
    await expect(aiApi(gw, { billing: true, creditRate: RATE }).ask('visual', body)).rejects.toMatchObject({ status: 502 })
    expect(gw.calls.map((c) => c.endpoint)).toEqual(['/api/v2/billing/context', '/api/v4/assistant/ask', '/api/v2/billing/consume'])
    expect((gw.calls[2].options.body as Record<string, unknown>).quantity).toBe(creditsForCost(0.004, RATE))
  })

  it('sans coût (délai dépassé, coupure) : rien n’est débité', async () => {
    const gw = routed({ ask: new ApiError('délai', 504, null) })
    await expect(aiApi(gw, { billing: true, creditRate: RATE }).ask('edit_agent', body)).rejects.toMatchObject({ status: 504 })
    expect(gw.calls.map((c) => c.endpoint)).toEqual(['/api/v2/billing/context', '/api/v4/assistant/ask'])
  })

  it('un débit en panne se réessaie avec la même clé, puis va au journal ; la réponse est rendue', async () => {
    const down = new ApiError('panne', 503, null)
    const gw = routed({ ask: answer(0.01), consume: [down, down, down] })
    const failures: unknown[] = []
    const off = onAiDebitError((_e, d) => failures.push(d))
    const r = await aiApi(gw, { billing: true, creditRate: RATE }).ask('report_summary', body)
    off()
    expect(r.text).toBe('ok')
    expect(r.charged).toBeNull()
    const keys = gw.calls.filter((c) => c.endpoint === '/api/v2/billing/consume').map((c) => (c.options.body as Record<string, unknown>).idempotency_key)
    expect(keys).toHaveLength(3)
    expect(new Set(keys).size).toBe(1)
    expect(failures).toEqual([{ operation: 'report_summary', idempotencyKey: keys[0], credits: creditsForCost(0.01, RATE) }])
  })

  it('un refus au débit ne se réessaie pas (le débit lui-même ne refuse pas : enforce_denial)', async () => {
    const gw = routed({ ask: answer(0.01), consume: new ApiError('invalide', 400, { code: 'invalid_request' }) })
    await aiApi(gw, { billing: true, creditRate: RATE }).ask('step_assist', body)
    expect(gw.calls.filter((c) => c.endpoint === '/api/v2/billing/consume')).toHaveLength(1)
  })

  it('chaque appel a sa clé : un nouvel essai est un nouvel appel, débité à nouveau', async () => {
    const gw = routed({ ask: answer(0.01), consume: debited(4) })
    const ai = aiApi(gw, { billing: true, creditRate: RATE })
    await ai.ask('annotate', body)
    await ai.ask('annotate', body)
    const keys = gw.calls.filter((c) => c.endpoint === '/api/v2/billing/consume').map((c) => (c.options.body as Record<string, unknown>).idempotency_key)
    expect(new Set(keys).size).toBe(2)
  })

  it('le coût se lit dans la réponse ; un coût nul ne coûte rien, et l’arrondi monte au crédit supérieur', () => {
    expect(aiCostCad(answer(0.0231))).toBe(0.0231)
    expect(aiCostCad(answer(0.1, true))).toBe(0.1)
    expect(aiCostCad({ success: true })).toBeNull()
    expect(creditsForCost(0, RATE)).toBe(0)
    expect(creditsForCost(0.0001, RATE)).toBe(1)
    expect(creditsForCost(0.0025, RATE)).toBe(1)
  })
})

describe('aiApi.generateImage', () => {
  const ok = { success: true, results: [{ imageURL: 'https://img.test/a.png' }] }

  it('OpenAI, niveau moyen, avec les images de référence', async () => {
    const gw = fakeGateway(() => [ok])
    expect(await aiApi(gw).generateImage('Une presse, vue de face', ['https://x.test/photo.jpg'])).toBe('https://img.test/a.png')
    expect(gw.calls).toHaveLength(1)
    expect(gw.calls[0].endpoint).toBe('/api/v2/ai/generate/image')
    expect(gw.calls[0].options.body).toMatchObject({ provider: 'openai', level: 'mid', width: 1024, height: 1024, quantity: 1, referenceImages: ['https://x.test/photo.jpg'] })
  })

  it('la passerelle refuse OpenAI : Google refait l’image une seule fois', async () => {
    const gw = fakeGateway((_e, o) => ((o.body as { provider: string }).provider === 'openai' ? new ApiError('provider non supporté', 400, null) : [ok]))
    expect(await aiApi(gw).generateImage('p', [])).toBe('https://img.test/a.png')
    expect(gw.calls.map((c) => (c.options.body as { provider: string }).provider)).toEqual(['openai', 'google'])
  })

  it('aucune image rendue par OpenAI : Google la refait ; une panne du service, non', async () => {
    const empty = fakeGateway((_e, o) => ((o.body as { provider: string }).provider === 'openai' ? [{ success: false, error: 'unsupported' }] : [ok]))
    expect(await aiApi(empty).generateImage('p', [])).toBe('https://img.test/a.png')
    const down = fakeGateway(() => new ApiError('Panne', 502, null))
    await expect(aiApi(down).generateImage('p', [])).rejects.toMatchObject({ status: 502 })
    expect(down.calls).toHaveLength(1)
  })
})
