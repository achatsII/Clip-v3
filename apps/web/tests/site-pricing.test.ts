// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { FEATURED_PLAN, MODULES } from '@/lib/billing/catalog'
import { catalogFromManifest, findManifest, formatPrice, operationCredits, plansWith, priceOf, siteCatalog, type RawManifest } from '@/lib/site/pricing'

const raw = parse(readFileSync(resolve(__dirname, '../../../billing.manifest.yaml'), 'utf8')) as RawManifest & {
  plans: Array<RawManifest['plans'][number] & { sort_order?: number }>
}
const catalog = catalogFromManifest(raw)
const activeBase = raw.plans.filter((p) => p.kind === 'base' && p.status === 'active').sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

describe('les forfaits du site, tirés du manifeste', () => {
  it('le site lit le vrai manifeste, depuis le dossier du build', () => {
    expect(findManifest()).toMatch(/billing\.manifest\.yaml$/)
    expect(siteCatalog()).toEqual(catalog)
  })

  it('montre chaque forfait de base actif, dans l’ordre du manifeste, avec ses prix, crédits et limites', () => {
    expect(catalog.plans.map((p) => p.code)).toEqual(activeBase.map((p) => p.code))
    for (const plan of catalog.plans) {
      const m = activeBase.find((p) => p.code === plan.code)!
      expect(plan.name).toBe(m.name)
      expect(plan.paid).toBe((m.prices ?? []).length > 0)
      expect(plan.prices.map((p) => p.amountCents)).toEqual((m.prices ?? []).map((p) => p.amount_cents))
      expect(plan.credits).toBe(m.entitlements.credits?.find((c) => c.feature === 'ai_credits')?.amount ?? 0)
      for (const key of ['published_instructions', 'stations', 'editors'] as const) expect(plan.limits[key]).toBe(m.entitlements.limits?.[key] ?? null)
      expect(plan.featured).toBe(plan.code === FEATURED_PLAN)
    }
    expect(catalog.plans.filter((p) => p.featured)).toHaveLength(1)
    expect(catalog.defaultPlan).toBe(raw.product.default_plan_code)
  })

  it('rattache chaque module au forfait de base que l’app propose (MODULES)', () => {
    const expected = MODULES.flatMap((m) => Object.entries(m.addons).map(([base, code]) => ({ code, base, feature: m.feature })))
    expect(catalog.modules.map((m) => ({ code: m.code, base: m.basePlan, feature: m.feature })).sort((a, b) => a.code!.localeCompare(b.code!))).toEqual(
      expected.sort((a, b) => a.code!.localeCompare(b.code!)),
    )
    for (const m of catalog.modules) expect(m.trialDays).toBe(catalog.trialDays)
  })

  it('l’annuel vaut le même nombre de mois pour chaque forfait payant et chaque module (« 2 mois offerts »)', () => {
    for (const p of [...catalog.plans.filter((x) => x.paid), ...catalog.modules]) {
      const month = priceOf(p, 'month')!.amountCents
      const year = priceOf(p, 'year')!.amountCents
      expect(year, p.code).toBe(month * catalog.paidMonths)
    }
    expect(catalog.paidMonths + catalog.freeMonths).toBe(12)
    expect(catalog.freeMonths).toBeGreaterThan(0)
  })

  it('le prix des opérations d’IA vient de ai_operations', () => {
    const gen = raw.ai_operations.filter((o) => o.key.startsWith('generate_')).map((o) => o.credits)
    expect(operationCredits(catalog, 'generate')).toEqual({ min: Math.min(...gen), max: Math.max(...gen) })
    const translate = raw.ai_operations.find((o) => o.key === 'translate')!.credits
    expect(operationCredits(catalog, 'translate')).toEqual({ min: translate, max: translate })
    expect(operationCredits(catalog, 'inconnue')).toBeNull()
  })

  it('dit quels forfaits donnent une fonction', () => {
    for (const f of ['translations', 'approvals', 'bulk_import', 'voice_assistant']) {
      expect(plansWith(catalog, f).map((p) => p.code)).toEqual(activeBase.filter((p) => p.entitlements.features?.[f]).map((p) => p.code))
    }
  })

  it('écrit les prix à la québécoise et à l’anglaise, sans cents inutiles', () => {
    expect(formatPrice(4900, 'CAD', 'fr')).toBe('49 $')
    expect(formatPrice(299000, 'CAD', 'fr')).toBe('2 990 $')
    expect(formatPrice(4900, 'CAD', 'en')).toBe('$49')
    expect(formatPrice(4950, 'CAD', 'en')).toBe('$49.50')
  })
})

/** Les fichiers du site : composants, pages, modules (les dictionnaires comptent aussi). */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(n) ? [p] : []
  })
}
const SITE_FILES = [resolve(__dirname, '../src/components/site'), resolve(__dirname, '../src/app/(site)'), resolve(__dirname, '../src/lib/site')].flatMap(files)
/** La démo du poste parle aussi espagnol (« Solo cepillo… ») : ce sont des mots, pas des forfaits. */
const NAMED_FILES = SITE_FILES.filter((f) => !f.endsWith('/content/demo.ts'))

describe('aucun prix ni forfait écrit dans le code du site', () => {
  it('aucun montant en dollars et aucune valeur en argent d’un crédit', () => {
    for (const f of SITE_FILES) {
      const src = readFileSync(f, 'utf8')
      // Un montant (« 49 $ », « $49 ») ou des cents ; `${…}` (gabarit de chaîne) n'en est pas un.
      expect(src, f).not.toMatch(/\d\s?\$(?!\{)|\$\s?\d|¢/)
    }
  })

  it('aucun nom de forfait du manifeste (ils viennent du manifeste, ou d’une traduction par code)', () => {
    const names = activeBase.map((p) => p.name)
    for (const f of NAMED_FILES) {
      const src = readFileSync(f, 'utf8')
      const code = src.replace(/planNames:[^}]*\}/, '')
      for (const name of names) expect(new RegExp(`(?<![\\p{L}\\p{N}])${name}(?![\\p{L}\\p{N}])`, 'u').test(code), `${f} : ${name}`).toBe(false)
    }
  })
})
