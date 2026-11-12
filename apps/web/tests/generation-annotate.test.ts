import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/bridge/native', () => ({ inNativeShell: () => false, hasCapability: () => false, callNative: vi.fn(async () => ({})) }))
vi.mock('@/lib/ai/generate', () => ({ generateInstruction: vi.fn(), enrichMedia: vi.fn(async (c: unknown) => c) }))
vi.mock('@/lib/realtime/client', () => ({ publishRealtime: vi.fn() }))
vi.mock('@/lib/ai/autoAnnotate', () => ({ annotateMarks: vi.fn() }))

import { annotateMarks } from '@/lib/ai/autoAnnotate'
import { generateInstruction } from '@/lib/ai/generate'
import { clearJob } from '@/lib/ai/jobs'
import { startGeneration } from '@/lib/ai/runGeneration'
import type { Instruction } from '@/lib/model/types'
import { publishRealtime } from '@/lib/realtime/client'

const doc = { _id: 'g1', json_data: { title: 'Démarrer la presse', status: 'draft', stationIds: [], sources: [], draft: null, publishedVersion: null } as unknown as Instruction }
const frame = { kind: 'image', url: 'https://x/f.jpg', sourceId: 'v', frame: { videoUrl: 'https://x/v.mp4', at: 12, start: 9, end: 15 } }
const content = { title: 'Démarrer la presse', summary: '', kind: 'procedure', category: 'production', tags: [], steps: [{ id: 's1', title: 'Appuyer sur le bouton vert', text: 'Appuyer.', media: [frame] }] }
const marks = [{ stepId: 's1', mediaIndex: 0, hint: 'Bouton vert' }]

function run(autoAnnotate?: boolean) {
  const patch = vi.fn(async (_t: string, _id: string, _p: Record<string, unknown>) => undefined)
  return { patch, done: startGeneration({ doc, data: { patch } as never, files: { upload: vi.fn() } as never, ai: {} as never, org: {} as never, stations: [], actor: { id: 'u1', name: 'Mélanie' }, autoAnnotate }) }
}

afterEach(() => {
  vi.clearAllMocks()
  clearJob('g1')
})

describe('la génération et ses annotations', () => {
  it('pose les repères au deuxième temps, sur les images tirées, et l’annonce aux autres appareils', async () => {
    vi.mocked(generateInstruction).mockResolvedValue({ content, marks, sources: [], model: 'm', operation: 'generate_s', questions: [], stationGuess: null } as never)
    const marked = { ...content, steps: [{ ...content.steps[0], media: [{ ...frame, annotations: [{ id: 'a', type: 'circle', x: 0.3, y: 0.4, w: 0.2, h: 0.2, color: 'red', text: 'Bouton vert' }] }] }] }
    vi.mocked(annotateMarks).mockImplementation(async (_ai, _c, _m, opts) => {
      opts?.onProgress?.(0, 1)
      opts?.onProgress?.(1, 1)
      return { content: marked as never, marked: 1, stopped: false }
    })
    const r = run()
    await r.done
    expect(annotateMarks).toHaveBeenCalledWith(expect.anything(), content, marks, expect.anything())
    const saved = r.patch.mock.calls.at(-1)![2] as { draft: { steps: Array<{ media: Array<{ annotations?: unknown[] }> }> } }
    expect(saved.draft.steps[0].media[0].annotations).toHaveLength(1)
    expect(vi.mocked(publishRealtime).mock.calls.map((c) => (c[0] as { stage?: string }).stage ?? (c[0] as { phase?: string }).phase)).toContain('annotate')
  })

  it('n’annote rien quand la personne a éteint le choix', async () => {
    vi.mocked(generateInstruction).mockResolvedValue({ content, marks, sources: [], model: 'm', operation: 'generate_s', questions: [], stationGuess: null } as never)
    await run(false).done
    expect(annotateMarks).not.toHaveBeenCalled()
  })

  it('n’appelle rien quand aucune image ne demande de repère (extraits vidéo seulement)', async () => {
    vi.mocked(generateInstruction).mockResolvedValue({ content, marks: [], sources: [], model: 'm', operation: 'generate_s', questions: [], stationGuess: null } as never)
    await run(true).done
    expect(annotateMarks).not.toHaveBeenCalled()
  })
})
