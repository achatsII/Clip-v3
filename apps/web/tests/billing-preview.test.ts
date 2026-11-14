import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { applyPurchase, cleanSelection, createPreviewClient, DEFAULT_PREVIEW, PREVIEW_PARAM, PREVIEW_PLANS, previewState, type PreviewSelection } from '@/lib/billing/preview'

interface ManifestPlan {
  code: string
  name: string
  kind: string
  version: number
  status: string
  trial_days?: number
  prices?: Array<{ interval: string; currency: string; amount_cents: number }>
  entitlements: { features?: Record<string, boolean>; limits?: Record<string, number | null>; credits?: Array<{ feature: string; amount: number; period: string }> }
}
const manifest = parse(readFileSync(resolve(__dirname, '../../../billing.manifest.yaml'), 'utf8')) as { plans: ManifestPlan[] }

describe('l’aperçu de la facturation ↔ billing.manifest.yaml', () => {
  it('le catalogue de l’aperçu est celui du manifeste : mêmes plans, prix, droits, limites et crédits', () => {
    const active = manifest.plans.filter((p) => p.status === 'active')
    expect(PREVIEW_PLANS.map((p) => p.code).sort()).toEqual(active.map((p) => p.code).sort())
    for (const m of active) {
      const p = PREVIEW_PLANS.find((x) => x.code === m.code)!
      expect({ name: p.name, kind: p.kind, version: p.version, trial: p.trial_days ?? null }).toEqual({ name: m.name, kind: m.kind, version: m.version, trial: m.trial_days ?? null })
      expect(p.prices.map(({ interval, currency, amount_cents }) => ({ interval, currency, amount_cents }))).toEqual((m.prices ?? []).map(({ interval, currency, amount_cents }) => ({ interval, currency, amount_cents })))
      expect(Object.fromEntries(Object.entries(p.entitlements.features ?? {}).filter(([, v]) => v))).toEqual(Object.fromEntries(Object.entries(m.entitlements.features ?? {}).filter(([, v]) => v)))
      expect(p.entitlements.limits ?? {}).toEqual(m.entitlements.limits ?? {})
      expect((p.entitlements.credits ?? []).map((c) => [c.feature_key, c.amount, c.period])).toEqual((m.entitlements.credits ?? []).map((c) => [c.feature, c.amount, c.period]))
    }
  })
})

describe('ce que l’aperçu montre', () => {
  it('par défaut, rien ne se ferme : Usine avec tous ses modules', () => {
    const s = previewState(DEFAULT_PREVIEW, new Date('2026-11-13T12:00:00Z'))
    expect(s.plan_code).toBe('usine')
    for (const f of ['translations', 'approvals', 'bulk_import', 'voice_assistant', 'brand_kit', 'full_export', 'shared_blocks', 'academy', 'records_plus']) expect(s.features[f]).toBe(true)
    expect(s.limits).toEqual([
      { feature_key: 'published_instructions', used: 0, limit: null },
      { feature_key: 'stations', used: 0, limit: 100 },
      { feature_key: 'editors', used: 0, limit: 15 },
    ])
    expect(s.credits[0]).toMatchObject({ granted: 40000, available: 32800, consumed: 7200, period_end: '2026-12-01T00:00:00.000Z' })
  })

  it('un plan qui ne reçoit pas un module ne l’a pas ; un choix illisible revient au défaut', () => {
    expect(cleanSelection({ plan: 'solo', modules: ['academy', 'records'], credits: 'low' })).toEqual({ plan: 'solo', modules: [], credits: 'low' })
    expect(cleanSelection({ plan: 'x', modules: 'y', credits: 3 })).toEqual(DEFAULT_PREVIEW)
    expect(cleanSelection(null)).toEqual(DEFAULT_PREVIEW)
    const solo = previewState({ plan: 'solo', modules: ['academy'], credits: 'empty' })
    expect(solo.features).toMatchObject({ academy: false, records_plus: false, translations: false, adoption_stats: true })
    expect(solo.credits[0]).toMatchObject({ granted: 2500, available: 0 })
    expect(previewState({ plan: 'equipe', modules: [], credits: 'low' }).credits[0].available).toBe(1440)
  })

  it('« acheter » un plan le remplace (les modules qu’il ne reçoit pas tombent) ; un module s’ajoute', () => {
    const team: PreviewSelection = { plan: 'equipe', modules: ['records'], credits: 'empty' }
    expect(applyPurchase(team, 'usine')).toEqual({ plan: 'usine', modules: ['records'], credits: 'full' })
    expect(applyPurchase(team, 'solo')).toEqual({ plan: 'solo', modules: [], credits: 'full' })
    expect(applyPurchase(team, 'academie-equipe')).toEqual({ plan: 'equipe', modules: ['records', 'academy'], credits: 'empty' })
    expect(applyPurchase(team, 'inconnu')).toBe(team)
  })

  it('le client de l’aperçu : rien ne part, tout se joue dans l’appareil', async () => {
    let sel: PreviewSelection = { plan: 'equipe', modules: [], credits: 'full' }
    const client = createPreviewClient({ read: () => sel, write: (s) => (sel = s) })
    expect((await client.check('academy')).allowed).toBe(false)
    expect((await client.check('translations')).allowed).toBe(true)
    expect((await client.plans()).plans.filter((p) => p.is_current).map((p) => p.code)).toEqual(['equipe'])
    const back = await client.checkout('academie-equipe', 'yearly', { success: 'https://clip.test/registre?ecarts=1', cancel: 'https://clip.test/registre' })
    expect(new URL(back).searchParams.get(PREVIEW_PARAM)).toBe('academie-equipe')
    expect(new URL(back).searchParams.get('ecarts')).toBe('1')
    expect(sel.modules).toEqual(['academy'])
    expect((await client.check('academy')).allowed).toBe(true)
    expect(await client.portal('https://clip.test/reglages/abonnement')).toBe('https://clip.test/reglages/abonnement')
  })
})
