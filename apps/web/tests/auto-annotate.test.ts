import { afterEach, describe, expect, it, vi } from 'vitest'
import { annotateMarks, readAutoAnnotate, setAutoAnnotate } from '@/lib/ai/autoAnnotate'
import { annotatePrompt } from '@/lib/ai/prompts'
import { normalizeInstruction } from '@/lib/ai/normalize'
import { lastAnnotationSize } from '@/lib/annotations/lastStyle'
import { autoMarkSize } from '@/lib/annotations/model'
import type { AiApi } from '@/lib/gateway/ai'
import { ApiError } from '@/lib/gateway/client'
import { emptyContent } from '@/lib/model/repo'
import type { Step, StepMedia } from '@/lib/model/types'

afterEach(() => localStorage.removeItem('clip_pref_auto_annotate'))

const frame = (url: string): StepMedia => ({ kind: 'image', url, sourceId: 'v', frame: { videoUrl: 'https://x/v.mp4', at: 12, start: 9, end: 15 } })
const step = (id: string, media: StepMedia[]): Step => ({ id, title: 'Appuyer sur le bouton vert', text: 'Appuyer une fois.', keyPoints: [], warning: null, media })

/** Un faux assistant : chaque appel rend un cercle (ou l'erreur donnée pour une image). */
function fakeAi(errors: Record<string, ApiError> = {}) {
  const ask = vi.fn(async (_op: string, body: { files: Array<{ url: string }>; prompt: string }) => {
    const url = body.files[0].url
    if (errors[url]) throw errors[url]
    return { json: { marks: [{ label: 'Bouton vert', shape: 'circle', box: [400, 300, 600, 500] }] }, text: '', model: 't' }
  })
  return { ai: { ask } as unknown as AiApi, ask }
}

describe('les annotations automatiques, au deuxième temps', () => {
  it('annotent chaque image demandée sur l’image elle-même, avec l’appel de « Annoter avec l’IA »', async () => {
    const content = emptyContent({ steps: [step('s1', [frame('https://x/a.jpg')]), step('s2', [{ kind: 'video', url: 'https://x/v.mp4', sourceId: 'v', start: 0, end: 6 }])] })
    const f = fakeAi()
    const progress: string[] = []
    const out = await annotateMarks(f.ai, content, [{ stepId: 's1', mediaIndex: 0, hint: 'Bouton vert' }], { onProgress: (d, t) => progress.push(`${d}/${t}`) })
    expect(f.ask).toHaveBeenCalledTimes(1)
    expect(f.ask.mock.calls[0][0]).toBe('annotate')
    expect((f.ask.mock.calls[0][1] as unknown as { mediaResolution: string }).mediaResolution).toBe("high")
    expect((f.ask.mock.calls[0][1] as { prompt: string }).prompt).toContain('Bouton vert')
    const m = out.content.steps[0].media[0]
    expect(m.kind === 'image' && m.annotations?.[0]).toMatchObject({ type: 'circle', x: 0.3, y: 0.4, text: 'Bouton vert' })
    expect(out.marked).toBe(1)
    expect(progress).toEqual(['0/1', '1/1'])
    // Le contenu donné n'est pas modifié.
    expect(content.steps[0].media[0]).not.toHaveProperty('annotations')
  })

  it('sautent une image sans adresse ou déjà annotée, et gardent sans marque une image où l’IA ne trouve rien', async () => {
    const annotated: StepMedia = { ...frame('https://x/b.jpg'), annotations: [{ id: 'a', type: 'circle', x: 0.1, y: 0.1, w: 0.1, h: 0.1, color: 'red' }] } as StepMedia
    const content = emptyContent({ steps: [step('s1', [frame('')]), step('s2', [annotated]), step('s3', [frame('https://x/c.jpg')])] })
    const f = fakeAi({ 'https://x/c.jpg': new ApiError('rien', 422) })
    const out = await annotateMarks(f.ai, content, [
      { stepId: 's1', mediaIndex: 0, hint: 'x' },
      { stepId: 's2', mediaIndex: 0, hint: 'x' },
      { stepId: 's3', mediaIndex: 0, hint: 'x' },
    ])
    expect(f.ask).toHaveBeenCalledTimes(1)
    expect(out.marked).toBe(0)
    expect(out.stopped).toBe(false)
    const c = out.content.steps[2].media[0]
    expect(c.kind === 'image' && c.annotations).toBeFalsy()
  })

  it('s’arrêtent au premier refus de facturation, sans faire échouer la génération', async () => {
    const urls = ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg', 'https://x/4.jpg']
    const content = emptyContent({ steps: urls.map((u, i) => step(`s${i}`, [frame(u)])) })
    const f = fakeAi({ 'https://x/1.jpg': new ApiError('plus de crédits', 402, null, 'insufficient_credits') })
    const out = await annotateMarks(f.ai, content, urls.map((_, i) => ({ stepId: `s${i}`, mediaIndex: 0, hint: 'x' })), { concurrency: 1 })
    expect(out.stopped).toBe(true)
    expect(f.ask).toHaveBeenCalledTimes(1)
  })

  it('sont un choix gardé sur l’appareil, oui par défaut', () => {
    expect(readAutoAnnotate()).toBe(true)
    setAutoAnnotate(false)
    expect(readAutoAnnotate()).toBe(false)
    setAutoAnnotate(true)
    expect(readAutoAnnotate()).toBe(true)
  })

  it('la piste de la génération guide la marque sans l’imposer', () => {
    const s = step('s1', [])
    expect(annotatePrompt(s, undefined, 'Bouton vert')).toContain('PISTE : la rédaction veut montrer « Bouton vert »')
    expect(annotatePrompt(s)).not.toContain('PISTE')
  })
})

describe('la grosseur des repères posés par l’IA', () => {
  afterEach(() => localStorage.removeItem('clip_pref_annot_style'))

  /** Un petit bouton (8 % de l'image) et une grande pièce (40 %). */
  function twoMarks() {
    const ask = vi.fn(async () => ({
      json: {
        marks: [
          { label: 'Enregistrer', shape: 'circle', box: [100, 100, 140, 180] },
          { label: 'Carter', shape: 'rect', box: [300, 200, 700, 600] },
        ],
      },
      text: '',
      model: 't',
    }))
    return { ai: { ask } as unknown as AiApi, ask }
  }

  it('fine autour d’un petit élément, moyenne autour d’une grande pièce', () => {
    expect(autoMarkSize({ w: 0.08, h: 0.04 })).toBe('s')
    expect(autoMarkSize({ w: 0.4, h: 0.4 })).toBe('m')
  })

  it('fine partout sur une image d’écran ; la dernière grosseur choisie l’emporte si elle est plus fine, jamais plus épaisse', () => {
    expect(autoMarkSize({ w: 0.4, h: 0.4 }, { screen: true })).toBe('s')
    expect(autoMarkSize({ w: 0.4, h: 0.4 }, { preferred: 's' })).toBe('s')
    expect(autoMarkSize({ w: 0.08, h: 0.04 }, { preferred: 'xl' })).toBe('s')
  })

  it('une image d’écran : tous les repères fins ; une photo : chacun selon ce qu’il entoure', async () => {
    const content = emptyContent({ steps: [step('s1', [frame('https://x/ecran.jpg')]), step('s2', [frame('https://x/photo.jpg')])] })
    const f = twoMarks()
    const out = await annotateMarks(f.ai, content, [
      { stepId: 's1', mediaIndex: 0, hint: 'Enregistrer', screen: true },
      { stepId: 's2', mediaIndex: 0, hint: 'Carter' },
    ])
    const sizes = (i: number) => {
      const m = out.content.steps[i].media[0]
      return m.kind === 'image' ? (m.annotations ?? []).map((a) => a.size) : []
    }
    expect(sizes(0)).toEqual(['s', 's'])
    expect(sizes(1)).toEqual(['s', 'm'])
  })

  it('la grosseur fine choisie à la main est retenue sur l’appareil et suivie par l’IA', async () => {
    localStorage.setItem('clip_pref_annot_style', JSON.stringify({ size: 's' }))
    expect(lastAnnotationSize()).toBe('s')
    const content = emptyContent({ steps: [step('s1', [frame('https://x/photo.jpg')])] })
    const out = await annotateMarks(twoMarks().ai, content, [{ stepId: 's1', mediaIndex: 0, hint: 'Carter' }])
    const m = out.content.steps[0].media[0]
    expect(m.kind === 'image' ? (m.annotations ?? []).map((a) => a.size) : []).toEqual(['s', 's'])
  })
})

describe('une image d’écran se reconnaît dès la génération', () => {
  it('le repère demandé sur une image nette d’un enregistrement d’écran est marqué « écran » ; sur une photo, non', () => {
    const t = new Date().toISOString()
    const sources = [
      { id: 'scr', kind: 'video' as const, url: 'https://x/ecran.mp4', screen: true as const, durationSec: 30, createdAt: t },
      { id: 'shot', kind: 'photo' as const, url: 'https://x/shot.jpg', shot: { sourceId: 'scr', at: 4 }, createdAt: t },
      { id: 'ph', kind: 'photo' as const, url: 'https://x/ph.jpg', createdAt: t },
    ]
    const json = {
      title: 'Saisir un bon',
      kind: 'procedure',
      steps: [
        { title: 'Cliquer sur Enregistrer', text: '', warningLevel: 'none', media: [{ source: 'S2', focusLabel: 'Enregistrer' }] },
        { title: 'Vérifier la vanne', text: '', warningLevel: 'none', media: [{ source: 'S3', focusLabel: 'Vanne V-12' }] },
      ],
    }
    const { marks } = normalizeInstruction(json as never, sources, 'fr')
    expect(marks.map((m) => [m.hint, !!m.screen])).toEqual([
      ['Enregistrer', true],
      ['Vanne V-12', false],
    ])
  })
})
