import { beforeAll, describe, expect, it, vi } from 'vitest'
import { agentSystem, runAgentOps, type AgentOp } from '@/lib/ai/agent'
import { contentSegments, translateContent } from '@/lib/ai/translate'
import { looksLikeLabel, visualTexts } from '@/lib/ai/visualText'
import type { AiApi } from '@/lib/gateway/ai'
import { ApiError } from '@/lib/gateway/client'
import { defaultStandard, emptyContent } from '@/lib/model/repo'
import { localized, mediaKey } from '@/lib/model/translation'
import type { InstructionContent, StepMedia } from '@/lib/model/types'

// Le navigateur de test ne charge pas les images : une photo 16:9 qui se charge tout de suite.
beforeAll(() => {
  vi.stubGlobal(
    'Image',
    class {
      onload?: () => void
      onerror?: () => void
      naturalWidth = 1600
      naturalHeight = 900
      set src(_v: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    },
  )
})

const SVG = `<!doctype html><html><head><title>Rails</title><style>text{font:16px sans-serif}</style></head><body>
<svg viewBox="0 0 100 50"><text x="5" y="20">Rail avant</text><g aria-label="Sens de coupe"><text x="5" y="40"> Couper ici </text></g><text x="80" y="20">E1</text></svg>
<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'
const label = makeLabel('Ne pas toucher')
window.addEventListener('click', () => go('#fff'))
const unit = 'mm'
</script></body></html>`

const content = (): InstructionContent =>
  emptyContent({
    title: 'Nettoyer les rails',
    summary: 'Entretien mensuel.',
    tools: ['Clé de 13 mm', 'Chiffons'],
    safety: ['Machine cadenassée'],
    steps: [
      {
        id: 'st_a',
        title: 'Cadenasser',
        text: 'Couper le sectionneur.',
        keyPoints: [],
        warning: null,
        media: [{ kind: 'image', url: 'https://x/panneau.jpg', caption: 'Le panneau', annotations: [{ id: 'an1', type: 'circle', x: 0.2, y: 0.2, w: 0.1, h: 0.1, color: 'red', text: 'Sectionneur' }, { id: 'an2', type: 'number', x: 0.5, y: 0.5, color: 'red', text: '1' }] }],
      },
      { id: 'st_b', title: 'Essuyer', text: 'Essuyer les rails.', keyPoints: [], warning: null, media: [{ kind: 'html', url: '', html: SVG, title: 'Vue de face' }, { kind: 'image', url: 'https://x/illu.png', generated: true }] },
    ],
  })

/** Un traducteur factice : « [en] » devant chaque texte ; les chaînes du code sans espace restent telles quelles. */
function fakeAi(opts: { withText?: string[]; refuseImages?: boolean } = {}) {
  const tr = (s: string) => `[en] ${s}`
  const ask = vi.fn(async (op: string, body: { prompt: string; files?: unknown[] }) => {
    if (op === 'translate_image') {
      if (opts.refuseImages) throw new ApiError('Plus de crédits', 402)
      return { text: '', json: { texts: [{ from: 'ARRÊT', to: 'STOP' }] }, model: 'm', usage: null }
    }
    const body0 = JSON.parse(body.prompt.split('\n\nIMAGES JOINTES')[0]) as { title?: string; summary?: string; safety?: string[]; steps?: Array<{ id: string; title: string; text: string }>; extras: Array<{ id: string; text: string }> }
    const extras = body0.extras.map((e) => ({ id: e.id, text: e.id.includes(':code:') && !/\s/.test(e.text) ? e.text : tr(e.text) }))
    if (op === 'step_assist') return { text: '', json: { extras }, model: 'm', usage: null }
    return {
      text: '',
      json: {
        title: tr(body0.title!),
        summary: tr(body0.summary!),
        safety: body0.safety!.map(tr),
        steps: body0.steps!.map((s) => ({ id: s.id, title: tr(s.title), text: tr(s.text), keyPoints: [], warning: '' })),
        extras,
        imagesWithText: opts.withText ?? [],
      },
      model: 'm',
      usage: null,
    }
  })
  const generateImage = vi.fn(async () => 'https://x/panneau-en.jpg')
  return { ai: { ask, generateImage } as unknown as AiApi, ask, generateImage }
}

describe('le texte des schémas de l’IA', () => {
  it('lit les libellés (balises, attributs, chaînes du code qui ressemblent à du texte), jamais le code', () => {
    const v = visualTexts(SVG)!
    const texts = v.items.map((i) => `${i.code ? 'code:' : ''}${i.text}`)
    // « E1 » est proposé aussi : la consigne dit au modèle de rendre un repère tel quel.
    expect(texts).toEqual(['Rails', 'Rail avant', 'Couper ici', 'E1', 'Sens de coupe', 'code:Ne pas toucher'])
    expect(looksLikeLabel('click')).toBe(false)
    expect(looksLikeLabel('#fff')).toBe(false)
    expect(looksLikeLabel('https://cdn.jsdelivr.net/x.js')).toBe(false)
    expect(looksLikeLabel('Moteur')).toBe(true)
  })

  it('remet les traductions à leur place, sans toucher au dessin ni au code', () => {
    const v = visualTexts(SVG)!
    const out = v.apply(['Rails', 'Front rail', 'Cut here', 'E1', 'Cutting direction', "Don't touch"])
    expect(out).toContain('>Front rail</text>')
    expect(out).toContain('> Cut here </text>')
    expect(out).toContain('aria-label="Cutting direction"')
    expect(out).toContain("makeLabel('Don\\'t touch')")
    expect(out).toContain("addEventListener('click'")
    expect(out).toContain('>E1</text>')
    expect(out).toContain('viewBox="0 0 100 50"')
    // Rien de traduit : la page reste exactement la même.
    expect(v.apply(v.items.map((i) => i.text))).toBe(SVG)
  })
})

describe('traduire toute l’instruction', () => {
  it('traduit aussi les outils, les légendes, les annotations et les schémas, et le lecteur les montre', async () => {
    const { ai, ask, generateImage } = fakeAi()
    const c = content()
    const { translation, images } = await translateContent(ai, c, { language: 'en' })
    expect(ask).toHaveBeenCalledTimes(1)
    expect(ask.mock.calls[0][0]).toBe('translate')
    expect((ask.mock.calls[0][1] as { files?: unknown }).files).toBeUndefined()
    expect(generateImage).not.toHaveBeenCalled()
    expect(images).toEqual({ redone: 0, failed: 0, refused: false })

    const en = localized({ ...c, translations: { en: translation } }, 'en')
    expect(en.title).toBe('[en] Nettoyer les rails')
    expect(en.tools).toEqual(['[en] Clé de 13 mm', '[en] Chiffons'])
    const img = en.steps[0].media[0] as Extract<StepMedia, { kind: 'image' }>
    expect(img.caption).toBe('[en] Le panneau')
    expect(img.annotations?.map((a) => a.text)).toEqual(['[en] Sectionneur', '1'])
    const visual = en.steps[1].media[0] as Extract<StepMedia, { kind: 'html' }>
    expect(visual.title).toBe('[en] Vue de face')
    expect(visual.html).toContain('>[en] Rail avant</text>')
    expect(visual.html).toContain("makeLabel('[en] Ne pas toucher')")
    // La langue d'origine ne change pas.
    expect(localized({ ...c, translations: { en: translation } }, 'fr')).toEqual({ ...c, translations: { en: translation } })
  })

  it('une traduction de média ne s’applique plus si le média a changé depuis', async () => {
    const { ai } = fakeAi()
    const c = content()
    const { translation } = await translateContent(ai, c, { language: 'en' })
    const changed: InstructionContent = { ...c, translations: { en: translation }, steps: c.steps.map((s, i) => (i === 0 ? { ...s, media: [{ ...s.media[0], url: 'https://x/nouvelle.jpg' } as StepMedia] } : s)) }
    const img = localized(changed, 'en').steps[0].media[0] as Extract<StepMedia, { kind: 'image' }>
    expect(img.caption).toBe('Le panneau')
    expect(img.url).toBe('https://x/nouvelle.jpg')
  })

  it('images en option : seules celles où l’IA lit du texte sont refaites, aux bonnes proportions', async () => {
    const { ai, ask, generateImage } = fakeAi({ withText: ['I1'] })
    const c = content()
    const { translation, images } = await translateContent(ai, c, { language: 'en', images: true })
    // Une seule image jointe : l'illustration de l'IA (sans texte) n'est pas proposée.
    expect((ask.mock.calls[0][1] as { files: Array<{ url: string }> }).files.map((f) => f.url)).toEqual(['https://x/panneau.jpg'])
    expect(ask.mock.calls.map((x) => x[0])).toEqual(['translate', 'translate_image'])
    expect(generateImage).toHaveBeenCalledTimes(1)
    expect((generateImage.mock.calls[0] as unknown[])[1]).toEqual(['https://x/panneau.jpg'])
    // Une photo 16:9 se refait en paysage, le format le plus proche que le modèle d'image sait faire.
    expect((generateImage.mock.calls[0] as unknown[])[2]).toEqual({ width: 1536, height: 1024 })
    expect(String((generateImage.mock.calls[0] as unknown[])[0])).toContain('"ARRÊT" → "STOP"')
    expect(images.redone).toBe(1)
    const img = localized({ ...c, translations: { en: translation } }, 'en').steps[0].media[0] as Extract<StepMedia, { kind: 'image' }>
    expect(img.url).toBe('https://x/panneau-en.jpg')
    expect(img.annotations?.[0].text).toBe('[en] Sectionneur')
  })

  it('un refus de facturation sur une image arrête les suivantes ; le texte reste traduit', async () => {
    const c = content()
    c.steps[1].media.push({ kind: 'image', url: 'https://x/ecran.jpg' })
    const { ai, generateImage } = fakeAi({ withText: ['I1', 'I2'], refuseImages: true })
    const { translation, images } = await translateContent(ai, c, { language: 'en', images: true })
    expect(images.refused).toBe(true)
    expect(generateImage).not.toHaveBeenCalled()
    expect(translation.title).toBe('[en] Nettoyer les rails')
  })

  it('la fiche de cadenassage se traduit, ses repères non', async () => {
    const c: InstructionContent = {
      ...content(),
      kind: 'lockout',
      lockout: { equipment: 'Presse 4', material: ['Cadenas'], restartSteps: ['Retirer les cadenas'], energyPoints: [{ id: 'e1', tag: 'E1', type: 'electrique', description: 'Alimentation 600 V', isolationDevice: 'Sectionneur', location: 'Mur nord', lockingMethod: 'Cadenas', verification: 'Essai de démarrage' }] },
    }
    expect(contentSegments(c).segments.map((s) => s.id)).toContain('lo:ep:e1:verification')
    const { ai } = fakeAi()
    const { translation } = await translateContent(ai, c, { language: 'en' })
    const lo = localized({ ...c, translations: { en: translation } }, 'en').lockout!
    expect(lo.energyPoints[0]).toMatchObject({ tag: 'E1', description: '[en] Alimentation 600 V', verification: '[en] Essai de démarrage' })
    expect(lo.restartSteps).toEqual(['[en] Retirer les cadenas'])
  })
})

describe('l’assistant traduit', () => {
  const run = async (c0: InstructionContent, ops: AgentOp[], ai: AiApi) => {
    let c = c0
    const log: Array<{ state: string; label: string }> = []
    const r = await runAgentOps(ops, { ai, get: () => c, set: (n) => (c = n), focus: () => undefined, log: (e) => log.push(e), pause: async () => undefined })
    return { c, r, log }
  }

  it('toute l’instruction, dans plusieurs langues (codes ou noms)', async () => {
    const { ai, ask } = fakeAi()
    const { c, r } = await run(content(), [{ op: 'translate', languages: ['en', 'Español'] }], ai)
    expect(r).toEqual({ done: 1, failed: 0 })
    expect(Object.keys(c.translations ?? {})).toEqual(['en', 'es'])
    expect(ask.mock.calls.map((x) => x[0])).toEqual(['translate', 'translate'])
  })

  it('les textes d’un seul média, dans la langue de l’instruction : le média lui-même change', async () => {
    const { ai, ask } = fakeAi()
    const { c } = await run(content(), [{ op: 'translate_media', step: 'st_a', media: 1 }], ai)
    expect(ask.mock.calls[0][0]).toBe('step_assist')
    const img = c.steps[0].media[0] as Extract<StepMedia, { kind: 'image' }>
    expect(img.caption).toBe('[en] Le panneau')
    expect(img.annotations?.[0].text).toBe('[en] Sectionneur')
    expect(c.translations).toBeUndefined()
  })

  it('vers une autre langue : seulement si l’instruction y est déjà traduite', async () => {
    const { ai } = fakeAi()
    const { log } = await run(content(), [{ op: 'translate_image', step: 'st_a', language: 'en' }], ai)
    expect(log.at(-1)).toMatchObject({ state: 'error' })
    expect(log.at(-1)!.label).toMatch(/Traduisez d’abord/)

    const withEn = { ...content(), translations: { en: { title: 'Clean', summary: '', safety: [], steps: [] } } }
    const { c } = await run(withEn, [{ op: 'translate_image', step: 'st_a', language: 'en' }], ai)
    const tr = c.translations!.en.steps.find((s) => s.id === 'st_a')!
    expect(tr.media?.[0]).toEqual({ of: mediaKey(withEn.steps[0].media[0]), url: 'https://x/panneau-en.jpg' })
    // Le français ne change pas ; l'anglais montre l'image refaite.
    expect((c.steps[0].media[0] as { url: string }).url).toBe('https://x/panneau.jpg')
    expect((localized(c, 'en').steps[0].media[0] as { url: string }).url).toBe('https://x/panneau-en.jpg')
  })

  it('sans la traduction dans le plan : refus montré, aucun appel, et la consigne le dit au modèle', async () => {
    const { ai, ask } = fakeAi()
    let c = content()
    const onLocked = vi.fn()
    const log: Array<{ state: string; label: string }> = []
    await runAgentOps([{ op: 'translate', languages: ['en'] }], { ai, get: () => c, set: (n) => (c = n), focus: () => undefined, log: (e) => log.push(e), pause: async () => undefined, canTranslate: false, onLocked })
    expect(onLocked).toHaveBeenCalledWith('translations')
    expect(ask).not.toHaveBeenCalled()
    expect(log.at(-1)).toMatchObject({ state: 'error' })
    expect(c.translations).toBeUndefined()
    expect(agentSystem({ standard: defaultStandard(), learnings: [] }, { ui: 'fr', content: 'fr' }, { translate: false })).toContain('n’utilise jamais translate')
    expect(agentSystem({ standard: defaultStandard(), learnings: [] }, { ui: 'fr', content: 'fr' })).not.toContain('n’utilise jamais translate')
  })

  it('seule une photo ou une image se refait avec son texte traduit', async () => {
    const { ai, generateImage } = fakeAi()
    const { log } = await run(content(), [{ op: 'translate_image', step: 'st_b', media: 1 }], ai)
    expect(log.at(-1)).toMatchObject({ state: 'error' })
    expect(generateImage).not.toHaveBeenCalled()
  })
})
