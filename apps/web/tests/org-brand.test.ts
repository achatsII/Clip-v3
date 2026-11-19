/**
 * Une marque par entreprise (CLIP / Kiplo, décision du 2026-11-18) et les liens entre appareils : la marque se pose à la
 * création seulement, l'autre marque renvoie au bon endroit, et les liens des magasins vont au bon téléphone.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fillApp } from '@/components/devices/BrandElsewhere'
import { brandForNewOrg, otherBrandOf, rememberSignup } from '@/lib/brand/orgBrand'
import { PRODUCTS, brandify, storeAppLink, storePlatformOf, storeUrlFor, webHost } from '@/lib/brand/product'
import type { DataApi } from '@/lib/gateway/data'
import { devices as frDevices } from '@/lib/i18n/fr/devices'
import { ensureOrg } from '@/lib/model/repo'
import type { OrgSettings } from '@/lib/model/types'
import { serverToggles } from '@/lib/serverToggles'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36'
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

beforeEach(() => sessionStorage.clear())

describe('La marque d’une entreprise neuve', () => {
  it('ouverte d’abord dans CLIP, elle est CLIP', () => {
    expect(brandForNewOrg(PRODUCTS.clip)).toBe('clip')
  })

  it('dans Kiplo, seulement juste après l’inscription libre, et une seule fois', () => {
    // Un client de CLIP qui ouvre Kiplo avant CLIP n'y est pas enfermé.
    expect(brandForNewOrg(PRODUCTS.kiplo)).toBeUndefined()
    rememberSignup(PRODUCTS.kiplo)
    expect(brandForNewOrg(PRODUCTS.kiplo)).toBe('kiplo')
    expect(brandForNewOrg(PRODUCTS.kiplo)).toBeUndefined()
  })
})

describe('L’autre marque', () => {
  it('renvoie une entreprise de l’autre marque, jamais une d’avant (sans marque) ni la sienne', () => {
    expect(otherBrandOf({ brand: 'clip' }, PRODUCTS.kiplo)?.id).toBe('clip')
    expect(otherBrandOf({ brand: 'kiplo' }, PRODUCTS.clip)?.id).toBe('kiplo')
    expect(otherBrandOf({ brand: 'kiplo' }, PRODUCTS.kiplo)).toBeNull()
    expect(otherBrandOf({}, PRODUCTS.kiplo)).toBeNull()
    expect(otherBrandOf(null, PRODUCTS.clip)).toBeNull()
  })

  it('garde le nom de l’autre marque dans la build de Kiplo (brandify changerait « CLIP »)', () => {
    const kiplo = brandify(frDevices, PRODUCTS.kiplo)
    expect(fillApp(kiplo.elsewhere.title, PRODUCTS.clip)).toBe('Votre entreprise utilise CLIP')
    expect(fillApp(kiplo.elsewhere.computer, PRODUCTS.clip)).toBe('À l’ordinateur : clip-v3.vercel.app')
    // Le nom de la marque de la build, lui, suit brandify.
    expect(kiplo.getApp.title).toBe('Kiplo sur votre téléphone')
  })
})

describe('Les réglages de l’organisation', () => {
  function fakeData(existing: Partial<OrgSettings> | null) {
    const insert = vi.fn(async (_type: string, json: OrgSettings) => ({ _id: 'org-1', json_data: json }))
    const data = {
      filter: vi.fn(async () => (existing ? [{ _id: 'org-0', json_data: existing }] : [])),
      insert,
    } as unknown as DataApi
    return { data, insert }
  }

  it('créés, ils prennent la marque donnée', async () => {
    const { data, insert } = fakeData(null)
    const doc = await ensureOrg(data, 'Usine Sherbrooke', () => 'kiplo')
    expect(doc.json_data.brand).toBe('kiplo')
    expect(insert).toHaveBeenCalledOnce()
  })

  it('créés sans marque, ils n’en ont pas (ouverts partout)', async () => {
    const { data } = fakeData(null)
    const doc = await ensureOrg(data, 'Usine Sherbrooke', () => undefined)
    expect('brand' in doc.json_data).toBe(false)
  })

  it('existants, ils ne changent pas : la marque ne se demande même pas', async () => {
    const { data, insert } = fakeData({ name: 'Usine d’avant' })
    const brandOf = vi.fn(() => 'clip' as const)
    const doc = await ensureOrg(data, 'Usine', brandOf)
    expect(brandOf).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
    expect(doc.json_data.brand).toBeUndefined()
  })
})

describe('Les liens entre appareils', () => {
  it('envoie chaque téléphone à son magasin, un ordinateur nulle part', () => {
    expect(storePlatformOf(IPHONE)).toBe('ios')
    expect(storePlatformOf(ANDROID)).toBe('android')
    expect(storePlatformOf(DESKTOP)).toBeNull()
    expect(storeUrlFor(IPHONE, PRODUCTS.kiplo)).toBe('https://apps.apple.com/app/id6836518892')
    expect(storeUrlFor(ANDROID, PRODUCTS.kiplo)).toBe('https://play.google.com/store/apps/details?id=app.kiplo')
    expect(storeUrlFor(DESKTOP, PRODUCTS.kiplo)).toBeNull()
    // CLIP est privée chez Google : aucun lien public.
    expect(storeUrlFor(ANDROID, PRODUCTS.clip)).toBeNull()
  })

  it('ouvre l’app du magasin depuis la coquille', () => {
    expect(storeAppLink('https://apps.apple.com/app/id6834038200')).toBe('itms-apps://apps.apple.com/app/id6834038200')
    expect(storeAppLink('https://play.google.com/store/apps/details?id=app.kiplo')).toBe('market://details?id=app.kiplo')
  })

  it('a la même adresse et les mêmes identifiants que la coquille mobile', () => {
    const brands = JSON.parse(readFileSync(resolve(__dirname, '../../mobile/brands.json'), 'utf8')) as Record<string, { webUrl: string; package: string }>
    for (const p of Object.values(PRODUCTS)) expect(p.webUrl).toBe(brands[p.id].webUrl)
    expect(PRODUCTS.kiplo.stores.android).toContain(`id=${brands.kiplo.package}`)
    expect(webHost(PRODUCTS.kiplo)).toBe('kiplo.vercel.app')
  })

  it('cache les liens des magasins tant que leurs fiches ne sont pas en ligne', () => {
    const t = serverToggles(undefined)
    expect(t.storeLinks).toBe(false)
    expect(t.brandGate).toBe(true)
    expect(t.desktopHint).toBe(true)
    expect(serverToggles('{"storeLinks":true}').storeLinks).toBe(true)
    expect(serverToggles('pas du JSON').storeLinks).toBe(false)
  })
})

describe('Les textes des 18 langues', () => {
  const langs = import.meta.glob<{ devices: typeof frDevices }>('../src/lib/i18n/*/devices.ts', { eager: true })

  it('existent dans chaque langue', () => {
    expect(Object.keys(langs)).toHaveLength(18)
  })

  it('gardent les repères que l’écran remplace ({app}, {host})', () => {
    for (const [file, { devices }] of Object.entries(langs)) {
      for (const k of ['title', 'body', 'open', 'install', 'noStore'] as const) expect(devices.elsewhere[k], `${file} elsewhere.${k}`).toContain('{app}')
      expect(devices.elsewhere.computer, `${file} elsewhere.computer`).toContain('{host}')
      expect(devices.computer.body.split('{host}'), `${file} computer.body`).toHaveLength(2)
      // Le nom de la marque de la build se met par brandify : il reste le jeton CLIP.
      expect(devices.getApp.title, `${file} getApp.title`).toContain('CLIP')
    }
  })
})
