import { describe, expect, it } from 'vitest'
import { onRefusal, onSettled } from '@/lib/billing/bus'
import { aiApi, type AskBody } from '@/lib/gateway/ai'
import { ApiError } from '@/lib/gateway/client'
import { fakeGateway } from './fakeClient'

const body: AskBody = { prompt: 'p', system_instruction: 's', provider: 'google', level: 'mid' }

describe('aiApi.ask', () => {
  it('facturation éteinte : l’appel part sur /api/v4/assistant/ask, sans opération ni clé', async () => {
    const gw = fakeGateway(() => ({ success: true, results: { assistant_response: '{"a":1}', parsed_json: { a: 1 }, model: 'm' } }))
    const r = await aiApi(gw, { billing: false }).ask('step_assist', body)
    expect(gw.calls[0].endpoint).toBe('/api/v4/assistant/ask')
    expect(gw.calls[0].options.body).toEqual(body)
    expect(r.json).toEqual({ a: 1 })
  })

  it('facturation allumée : seulement la route mesurée, avec l’opération, une clé et X-Product', async () => {
    const gw = fakeGateway(() => ({ success: true, results: { assistant_response: 'ok' } }))
    let settled = 0
    const off = onSettled(() => settled++)
    await aiApi(gw, { billing: true }).ask('generate_s', body, { scope: 'generation' })
    off()
    expect(gw.calls).toHaveLength(1)
    expect(gw.calls[0].endpoint).toBe('/api/v2/ai/ask')
    expect(gw.calls[0].options.headers).toMatchObject({ 'X-Product': 'clip-v3' })
    const sent = gw.calls[0].options.body as Record<string, unknown>
    expect(sent.operation).toBe('generate_s')
    expect(String(sent.idempotency_key)).toMatch(/^clip:generate_s:generation:/)
    expect(settled).toBe(1)
  })

  it('un refus 402 ouvre le paywall, ne repasse jamais par une route non mesurée et dit que rien n’est débité', async () => {
    const gw = fakeGateway(() => new ApiError('Crédits insuffisants', 402, { code: 'insufficient_credits', upgrade_hint: { plan_code: 'usine' } }))
    const refusals: string[] = []
    const off = onRefusal((r) => refusals.push(`${r.code}:${r.upgradePlan}`))
    await expect(aiApi(gw, { billing: true }).ask('translate', body)).rejects.toMatchObject({ status: 402, code: 'insufficient_credits' })
    off()
    expect(refusals).toEqual(['insufficient_credits:usine'])
    expect(gw.calls.map((c) => c.endpoint)).toEqual(['/api/v2/ai/ask'])
  })

  it('chaque essai prend une nouvelle clé (un 502 ne se rejoue pas avec la même)', async () => {
    const gw = fakeGateway(() => new ApiError('ai', 502, { code: 'ai_unavailable' }))
    const ai = aiApi(gw, { billing: true })
    await expect(ai.ask('annotate', body)).rejects.toMatchObject({ code: 'ai_unavailable' })
    await expect(ai.ask('annotate', body)).rejects.toBeTruthy()
    const keys = gw.calls.map((c) => (c.options.body as Record<string, unknown>).idempotency_key)
    expect(new Set(keys).size).toBe(2)
  })

  it('une réponse en erreur de l’assistant devient une erreur lisible', async () => {
    const gw = fakeGateway(() => ({ success: false, results: { error: 'JSON_PARSE_ERROR' } }))
    await expect(aiApi(gw, { billing: false }).ask('generate_s', { ...body, json_schema: {} })).rejects.toMatchObject({ code: 'JSON_PARSE_ERROR' })
  })
})
