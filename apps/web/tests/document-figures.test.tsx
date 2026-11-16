/**
 * L'import d'un document reprend ses figures : l'étape reçoit la photo ou le dessin de la page qui
 * l'illustre, recadré, plutôt que la page entière ; la page reste quand la figure ne se trouve pas,
 * et l'éditeur passe de l'une à l'autre d'un geste.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/providers/Session', () => ({ useSession: () => ({ ai: { ask: vi.fn(), generateImage: vi.fn() }, data: {}, files: {} }) }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => vi.fn(async () => true) }))

import { StepMediaEditor } from '@/components/editor/StepMediaEditor'
import { enrichMedia } from '@/lib/ai/generate'
import { normalizeInstruction } from '@/lib/ai/normalize'
import { importSystem } from '@/lib/ai/prompts'
import { instructionSchema } from '@/lib/ai/schemas'
import type { AiApi } from '@/lib/gateway/ai'
import type { FilesApi } from '@/lib/gateway/files'
import { figureRect, parseBox, toFigure, toWholePage } from '@/lib/media/figures'
import { emptyContent } from '@/lib/model/repo'
import type { InstructionContent, Source, Step, StepMedia } from '@/lib/model/types'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

afterEach(cleanup)

const PDF = 'https://ii-file.tor1.digitaloceanspaces.com/clip/manuel.pdf'
const doc: Source = { id: 'd1', kind: 'document', url: PDF, name: 'manuel.pdf', originalName: 'Manuel presse.pdf', pageCount: 6, createdAt: '2026-11-16T10:00:00.000Z' }
const page = (n: number, figure?: string): StepMedia => ({ kind: 'document', url: PDF, sourceId: 'd1', page: n, name: 'Manuel presse.pdf', ...(figure ? { figure } : {}) })
const step = (id: string, media: StepMedia[]): Step => ({ id, title: id, text: '', keyPoints: [], warning: null, media })

/** Une passerelle de fichiers qui rend les pages et garde ce qu'on lui envoie. */
function fakeFiles() {
  const uploads: Array<{ name: string; folder: string }> = []
  const files = {
    pdfPageImage: vi.fn(async (_url: string, n: number, _dpi?: number) => ({ png: new Blob([`page ${n}`], { type: 'image/png' }), pageCount: 6 })),
    upload: vi.fn(async (_b: Blob, name: string, folder: string) => {
      uploads.push({ name, folder })
      return { url: `https://cdn.test/${folder}/${name}` }
    }),
    screenshots: vi.fn(async () => ({})),
  }
  return { files: files as unknown as FilesApi & typeof files, uploads }
}

const uploadPage = (files: FilesApi) => async (png: Blob, name: string) => (await files.upload(png, name, 'pages')).url

describe('les figures d’un document', () => {
  it('allumées par le serveur ; le repli ne les active jamais', () => {
    expect(DEFAULT_TOGGLES.documentFigures).toBe(true)
    expect(FALLBACK_TOGGLES.documentFigures).toBe(false)
  })

  it('la génération nomme la figure de la page ; la consigne et le schéma passent tels quels au serveur', () => {
    const ref = (instructionSchema as { properties: { steps: { items: { properties: { media: { items: { properties: Record<string, unknown> } } } } } } }).properties.steps.items.properties.media.items.properties
    expect(ref.figure).toBeDefined()
    expect(importSystem({ standard: undefined, learnings: [] } as never)).toContain('figure: "<ce qu’elle montre>"')
    const { content } = normalizeInstruction(
      {
        title: 'Changer le filtre',
        steps: [
          { title: 'Repérer le filtre', text: 'Il est sous le capot.', keyPoints: [], warningLevel: 'none', warningText: '', section: '', media: [{ source: 'S1', page: 2, figure: '  Photo du  filtre ' }, { source: 'S1', page: 2, figure: 'Vue éclatée' }] },
          { title: 'Lire le plan', text: 'Le plan entier.', keyPoints: [], warningLevel: 'none', warningText: '', section: '', media: [{ source: 'S1', page: 9 }] },
        ],
      } as never,
      [doc],
      'fr',
    )
    // Deux figures d'une même page ne se confondent pas ; une page hors du document est ramenée dedans.
    expect(content.steps[0].media).toEqual([page(2, 'Photo du filtre'), page(2, 'Vue éclatée')])
    expect(content.steps[1].media).toEqual([page(6)])
  })

  it('la boîte de l’IA : rendue sûre, avec une marge ; une icône ou presque toute la page ne se recadrent pas', () => {
    expect(parseBox([100, 200, 400, 800])).toEqual([100, 200, 400, 800])
    expect(parseBox([-5, 200, 1200, 800])).toEqual([0, 200, 1000, 800])
    expect(parseBox([400, 200, 100, 800])).toBeNull()
    expect(parseBox(['a', 1, 2, 3])).toBeNull()
    expect(parseBox([1, 2, 3])).toBeNull()
    // Page de 1700 × 2200 px : marge de 2 % du plus grand côté (44 px).
    expect(figureRect([100, 200, 400, 800], 1700, 2200)).toEqual({ x: 296, y: 176, w: 1108, h: 748 })
    expect(figureRect([500, 500, 560, 560], 1700, 2200)).toBeNull()
    expect(figureRect([20, 20, 980, 980], 1700, 2200)).toBeNull()
  })

  it('chaque page se rend une fois ; ses figures se trouvent en une question ; la figure trouvée devient l’image de chaque étape qui la montre', async () => {
    const { files, uploads } = fakeFiles()
    const ask = vi.fn(async (_op: string, _body: Record<string, unknown>) => ({ json: { figures: [{ n: 1, found: true, box: [100, 200, 400, 800] }, { n: 2, found: false, box: [] }] }, text: '', model: 'm', usage: null }))
    const crop = vi.fn(async () => new Blob(['figure'], { type: 'image/jpeg' }))
    const content: InstructionContent = emptyContent({
      steps: [step('a', [page(2, 'Photo du filtre')]), step('b', [page(2, 'photo du filtre'), page(2, 'Vue éclatée')]), step('c', [page(3)])],
    })
    const done = await enrichMedia(content, files, uploadPage(files), { figures: { ai: { ask } as unknown as AiApi, crop } })

    expect(files.pdfPageImage.mock.calls.map((c) => [c[1], c[2]])).toEqual([
      [2, 200],
      [3, undefined],
    ])
    expect(ask).toHaveBeenCalledTimes(1)
    expect(ask.mock.calls[0][0]).toBe('figures')
    expect(ask.mock.calls[0][1].prompt).toContain('1. Photo du filtre\n2. Vue éclatée')
    expect(ask.mock.calls[0][1].files).toEqual([{ url: 'https://cdn.test/pages/page-2.png', filename: 'page.png', mimeType: 'image/png' }])
    expect(crop).toHaveBeenCalledTimes(1)
    expect(uploads).toEqual([
      { name: 'page-2.png', folder: 'pages' },
      { name: 'page-3.png', folder: 'pages' },
      { name: 'figure-2-1.jpg', folder: 'figures' },
    ])
    const figure = { kind: 'image', url: 'https://cdn.test/figures/figure-2-1.jpg', sourceId: 'd1', fromPage: { url: PDF, page: 2, pageImageUrl: 'https://cdn.test/pages/page-2.png', name: 'Manuel presse.pdf' } }
    expect(done.steps[0].media).toEqual([{ ...figure, alt: 'Photo du filtre' }])
    expect(done.steps[1].media[0]).toEqual({ ...figure, alt: 'photo du filtre' })
    // Introuvable sur la page : l'étape garde la page entière, et rien de ce que l'IA voulait ne reste.
    expect(done.steps[1].media[1]).toEqual({ kind: 'document', url: PDF, sourceId: 'd1', page: 2, name: 'Manuel presse.pdf', pageImageUrl: 'https://cdn.test/pages/page-2.png' })
    expect(done.steps[2].media[0]).toEqual({ ...page(3), pageImageUrl: 'https://cdn.test/pages/page-3.png' })
  })

  it('sans le toggle, ou quand l’IA ne répond pas : la page entière, comme avant', async () => {
    const content: InstructionContent = emptyContent({ steps: [step('a', [page(2, 'Photo du filtre')])] })
    const off = fakeFiles()
    const plain = await enrichMedia(content, off.files, uploadPage(off.files))
    expect(off.files.pdfPageImage.mock.calls[0][2]).toBeUndefined()
    expect(plain.steps[0].media[0]).toEqual({ ...page(2), pageImageUrl: 'https://cdn.test/pages/page-2.png' })

    const down = fakeFiles()
    const ask = vi.fn(async () => Promise.reject(new Error('503')))
    const kept = await enrichMedia(content, down.files, uploadPage(down.files), { figures: { ai: { ask } as unknown as AiApi, crop: vi.fn() } })
    expect(kept.steps[0].media[0]).toEqual({ ...page(2), pageImageUrl: 'https://cdn.test/pages/page-2.png' })
  })

  it('figure ⇄ page entière : la légende, le verdict et les annotations suivent, rien ne se perd', () => {
    const fig: StepMedia = { kind: 'image', url: 'https://cdn.test/f.jpg', sourceId: 'd1', alt: 'Photo du filtre', caption: 'Le filtre', verdict: 'do', annotations: [{ id: 'an', type: 'circle', x: 0.1, y: 0.1, w: 0.2, h: 0.2, text: 'Ici', color: 'red' }], fromPage: { url: PDF, page: 2, pageImageUrl: 'https://cdn.test/p2.png', name: 'Manuel presse.pdf' } }
    const whole = toWholePage(fig)!
    expect(whole).toMatchObject({ kind: 'document', url: PDF, page: 2, pageImageUrl: 'https://cdn.test/p2.png', caption: 'Le filtre', verdict: 'do', cropped: { url: 'https://cdn.test/f.jpg', alt: 'Photo du filtre' } })
    expect(toFigure(whole)).toEqual(fig)
    expect(toWholePage({ kind: 'image', url: 'https://cdn.test/photo.jpg' })).toBeNull()
    expect(toFigure(page(2))).toBeNull()
  })

  it('dans l’éditeur, « Page entière » montre la page, et « Figure » y revient', () => {
    const fig: StepMedia = { kind: 'image', url: 'https://cdn.test/f.jpg', sourceId: 'd1', alt: 'Photo du filtre', fromPage: { url: PDF, page: 2, pageImageUrl: 'https://cdn.test/p2.png' } }
    const c = emptyContent({ title: 'Changer le filtre', steps: [step('a', [fig])] })
    const onChange = vi.fn()
    const { rerender } = render(<StepMediaEditor content={c} step={c.steps[0]} sources={[doc]} onChange={onChange} onSourceAdded={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Figure, page 2 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /Page entière/ }))
    const whole = onChange.mock.calls[0][0].media[0]
    expect(whole).toMatchObject({ kind: 'document', page: 2, cropped: { url: 'https://cdn.test/f.jpg' } })
    rerender(<StepMediaEditor content={c} step={{ ...c.steps[0], media: [whole] }} sources={[doc]} onChange={onChange} onSourceAdded={() => undefined} />)
    fireEvent.click(screen.getByRole('radio', { name: /Figure/ }))
    expect(onChange.mock.calls[1][0].media[0]).toEqual(fig)
  })
})
