/**
 * La version de CLIP (2.0.x), l'ordre des médias d'une étape (toggle `mediaOrder`), la photo d'un retour
 * d'opérateur mise à l'étape (toggle `feedbackMedia`), les variantes d'une instruction (toggle
 * `variants`) et sa version courte pour les habitués (toggle `quickMode`).
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/toggles', () => ({ useToggle: () => true, usePublicConfig: () => ({ data: null }), useRealtimeAvailable: () => false }))
vi.mock('@/lib/bridge/native', () => ({ callNative: vi.fn(), onNativeEvent: () => () => undefined, nativeEnv: () => null, inNativeShell: () => false, hasCapability: () => false, haptic: () => undefined, NativeError: class extends Error {} }))

import { Player } from '@/components/player/Player'
import { applyOp } from '@/lib/ai/agent'
import { normalizeInstruction } from '@/lib/ai/normalize'
import { photoToStorage } from '@/lib/media/photos'
import { replaceBlock } from '@/lib/model/blocks'
import { emptyContent } from '@/lib/model/repo'
import { localized } from '@/lib/model/translation'
import type { InstructionContent, Step } from '@/lib/model/types'
import { hasVariants, isEssential, removeVariant, stepsFor, stepVariantsOfAi, variantNames, variantsOfAi, withQuick } from '@/lib/model/variants'
import { buildPrintHtml } from '@/lib/pdf/printHtml'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'
import { APP_VERSION } from '@/lib/version'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('clip_pref_ui_lang', 'fr')
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false })) as typeof window.matchMedia
  Element.prototype.scrollIntoView = vi.fn()
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})
afterEach(cleanup)

const step = (id: string, over: Partial<Step> = {}): Step => ({ id, title: `Étape ${id}`, text: '', keyPoints: [], warning: null, media: [], ...over })
const A = { id: 'va', name: 'Pompe A' }
const B = { id: 'vb', name: 'Pompe B' }
const pumps = (): InstructionContent =>
  emptyContent({
    title: 'Démonter la pompe',
    variants: [A, B],
    variantsLabel: 'Modèle de pompe',
    quick: true,
    steps: [
      step('s1', { title: 'Cadenasser', warning: { level: 'danger', text: 'Énergie' } }),
      step('s2', { title: 'Retirer le garde', essential: false }),
      step('s3', { title: 'Dévisser la volute A', variants: ['va'], essential: true }),
      step('s4', { title: 'Dévisser la volute B', variants: ['vb'], essential: false }),
      step('s5', { title: 'Noter le jeu', checks: [{ id: 'c1', kind: 'measure', label: 'Jeu', unit: 'mm' }] }),
    ],
  })

describe('la version et les nouveaux toggles', () => {
  it('2.0.x, le dernier chiffre augmente à chaque mise en production ; les toggles sont allumés par le serveur, jamais par le repli', () => {
    expect(APP_VERSION).toMatch(/^2\.0\.\d+$/)
    for (const name of ['mediaOrder', 'feedbackMedia', 'variants', 'quickMode'] as const) {
      expect(DEFAULT_TOGGLES[name]).toBe(true)
      expect(FALLBACK_TOGGLES[name]).toBe(false)
    }
  })
})

describe('les variantes et la version courte, le modèle', () => {
  it('chaque variante garde ses étapes et les étapes communes ; la version courte garde les essentielles, toujours celles qui ont un relevé ou une mise en garde', () => {
    const c = pumps()
    expect(hasVariants(c)).toBe(true)
    expect(stepsFor(c, { variant: 'va' }).map((s) => s.id)).toEqual(['s1', 's2', 's3', 's5'])
    expect(stepsFor(c, { variant: 'vb' }).map((s) => s.id)).toEqual(['s1', 's2', 's4', 's5'])
    // Sans variante choisie (l'aperçu de l'éditeur), tout.
    expect(stepsFor(c, {}).length).toBe(5)
    expect(stepsFor(c, { variant: 'vb', quick: true }).map((s) => s.id)).toEqual(['s1', 's5'])
    expect(stepsFor(c, { variant: 'va', quick: true }).map((s) => s.id)).toEqual(['s1', 's3', 's5'])
    // La version courte qui n'est pas offerte ne raccourcit rien.
    expect(stepsFor({ ...c, quick: false }, { variant: 'va', quick: true }).length).toBe(4)
    expect(isEssential(c.steps[4])).toBe(true)
    expect(variantNames(c, c.steps[2])).toEqual(['Pompe A'])
  })

  it('offrir la version courte coche d’office ce qui compte (points clés, mises en garde) ; retirer une variante libère ses étapes', () => {
    const c = emptyContent({ title: 'x', steps: [step('a', { keyPoints: ['Serrer en croix'] }), step('b'), step('c', { warning: { level: 'info', text: 'Astuce' } })] })
    expect(withQuick(c, true).steps.map((s) => s.essential)).toEqual([true, false, true])
    expect(withQuick(c, false).quick).toBe(false)
    const less = removeVariant(pumps(), 'vb')
    expect(less.variants).toEqual([A])
    expect(less.steps.find((s) => s.id === 's4')!.variants).toBeUndefined()
    expect(less.steps.find((s) => s.id === 's3')!.variants).toEqual(['va'])
    expect(hasVariants(less)).toBe(false)
  })

  it('un bloc commun qui change garde, dans l’instruction, les variantes et l’étoile de ses étapes', () => {
    const block = { id: 'blk', version: 1, title: 'Cadenassage' }
    const c = emptyContent({ title: 'x', variants: [A, B], steps: [step('k_blk', { fromBlock: block, variants: ['va'], essential: true })] })
    const next = replaceBlock(c, 'blk', [step('k_blk', { title: 'Cadenasser (v2)', fromBlock: { ...block, version: 2 } })])!
    expect(next.steps[0]).toMatchObject({ title: 'Cadenasser (v2)', variants: ['va'], essential: true })
  })
})

describe('au poste', () => {
  const render2 = (content: InstructionContent) => render(<Player content={content} instructionId="i1" source="kiosk" deps={{ data: null as never, ai: null, files: null }} preview />)

  it('une grande tuile par variante, avec son nombre d’étapes : la toucher commence avec ses seules étapes', async () => {
    render2({ ...pumps(), quick: false })
    expect(screen.getByText('Modèle de pompe ?')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Commencer/ })).toBeNull()
    const tileB = screen.getByRole('button', { name: /Pompe B/ })
    expect(tileB.textContent).toContain('4 étapes')
    fireEvent.click(tileB)
    expect(await screen.findByText('Étape 1 sur 4')).toBeTruthy()
    expect(screen.getAllByText(/Pompe B/).length).toBeGreaterThan(0)
  })

  it('la version courte offerte : « L’essentiel » ne garde que les étapes essentielles', async () => {
    render2(pumps())
    // Avec des variantes, le nombre est sur chaque tuile, pas sur le choix.
    fireEvent.click(screen.getByRole('radio', { name: 'L’essentiel' }))
    expect(screen.getByRole('button', { name: /Pompe B/ }).textContent).toContain('2 étapes')
    fireEvent.click(screen.getByRole('button', { name: /Pompe B/ }))
    expect(await screen.findByText('Étape 1 sur 2')).toBeTruthy()
  })

  it('sans variante, la version courte dit son nombre d’étapes ; « Commencer » part avec les essentielles', async () => {
    render2({ ...pumps(), variants: undefined, steps: pumps().steps.map(({ variants: _v, ...s }) => s) })
    fireEvent.click(screen.getByRole('radio', { name: 'L’essentiel · 3' }))
    fireEvent.click(screen.getByRole('button', { name: /Commencer/ }))
    expect(await screen.findByText('Étape 1 sur 3')).toBeTruthy()
  })

  it('sans variante ni version courte : le bouton « Commencer » d’avant', () => {
    render2(emptyContent({ title: 'Simple', steps: [step('a'), step('b')] }))
    expect(screen.getByRole('button', { name: /Commencer/ })).toBeTruthy()
    expect(screen.queryByRole('radio')).toBeNull()
  })
})

describe('l’IA, la traduction, l’assistant et le PDF', () => {
  it('la génération propose des variantes seulement quand les étapes les distinguent', () => {
    const raw = {
      title: 'Démonter la pompe',
      variants: ['Pompe A', 'Pompe B'],
      variantsLabel: 'Modèle',
      steps: [
        { title: 'Cadenasser', text: 'x', variants: [] },
        { title: 'Dévisser la volute', text: 'x', variants: ['pompe b'] },
        { title: 'Retirer', text: 'x', variants: ['Pompe A', 'Pompe B'] },
      ],
    }
    const { content } = normalizeInstruction(raw as never, [], 'fr')
    expect(content.variants?.map((v) => v.name)).toEqual(['Pompe A', 'Pompe B'])
    expect(content.variantsLabel).toBe('Modèle')
    const b = content.variants![1].id
    expect(content.steps.map((s) => s.variants)).toEqual([undefined, [b], undefined])
    // Des variantes qu'aucune étape ne distingue : rien.
    expect(normalizeInstruction({ title: 'x', variants: ['A', 'B'], steps: [{ title: 'Un', text: 'x' }] } as never, [], 'fr').content.variants).toBeUndefined()
    expect(variantsOfAi(['Seule'])).toBeNull()
    expect(stepVariantsOfAi(['Inconnue'], [A, B])).toBeUndefined()
  })

  it('les noms des variantes se traduisent ; l’assistant crée des variantes et dit où s’applique une étape', () => {
    const c = { ...pumps(), translations: { en: { title: 'Disassemble the pump', summary: '', safety: [], steps: [], variants: { va: 'Pump A' }, variantsLabel: 'Pump model' } } }
    const en = localized(c, 'en')
    expect(en.variants!.map((v) => v.name)).toEqual(['Pump A', 'Pompe B'])
    expect(en.variantsLabel).toBe('Pump model')

    const base = emptyContent({ title: 'x', steps: [step('s1'), step('s2')] })
    const ids = new Map<string, string>()
    const withVariants = applyOp(base, { op: 'set_instruction', variants: ['Grand', 'Petit'], variantsLabel: 'Format' }, ids).content
    expect(withVariants.variants!.map((v) => v.name)).toEqual(['Grand', 'Petit'])
    const scoped = applyOp(withVariants, { op: 'update_step', step: 's2', variants: ['Petit'] }, ids).content
    expect(scoped.steps[1].variants).toEqual([withVariants.variants![1].id])
    // Une variante retirée par l'assistant : ses étapes s'appliquent partout.
    const fewer = applyOp(scoped, { op: 'set_instruction', variants: ['Grand'] }, ids).content
    expect(fewer.steps[1].variants).toBeUndefined()
  })

  it('le PDF nomme les variantes et marque les étapes propres à l’une et les essentielles', () => {
    const html = buildPrintHtml(pumps(), { branding: { orgName: 'Usine' }, version: 1, stationNames: [], showClipMention: false, draft: false, variants: true, quick: true })
    expect(html).toContain('Modèle de pompe : Pompe A, Pompe B')
    expect(html).toContain('Seulement : Pompe A')
    expect(html).toContain('★ Essentielle')
    // Toggles coupés : rien de tout ça.
    expect(buildPrintHtml(pumps(), { branding: { orgName: 'Usine' }, version: 1, stationNames: [], showClipMention: false, draft: false })).not.toContain('Seulement :')
  })
})

describe('la photo d’un retour d’opérateur, mise à l’étape', () => {
  it('une photo au stockage garde son adresse ; une photo de la base (lien public) y part d’abord', async () => {
    const upload = vi.fn(async () => ({ url: 'https://cdn.test/retour.jpg', path: 'p' }))
    const get = vi.fn(async () => ({ _id: 'ph1', json_data: { dataUrl: 'data:image/jpeg;base64,/9j/4AAQ' } }))
    expect(await photoToStorage({ get } as never, { upload } as never, 'https://cdn.test/deja.jpg', 'x.jpg')).toBe('https://cdn.test/deja.jpg')
    expect(upload).not.toHaveBeenCalled()
    expect(await photoToStorage({ get } as never, { upload } as never, 'clip-photo:ph1', 'retour.jpg')).toBe('https://cdn.test/retour.jpg')
    expect(get).toHaveBeenCalledWith('clip_photo', 'ph1')
    expect(upload).toHaveBeenCalledWith(expect.anything(), 'retour.jpg', 'captures')
  })
})
