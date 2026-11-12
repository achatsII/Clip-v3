import { describe, expect, it, vi } from 'vitest'
import { enrichMedia } from '@/lib/ai/generate'
import { normalizeInstruction, resolveMedia } from '@/lib/ai/normalize'
import type { FilesApi } from '@/lib/gateway/files'
import { emptyContent } from '@/lib/model/repo'
import type { Source, StepMedia } from '@/lib/model/types'

const now = new Date().toISOString()
const video: Source = { id: 'v', kind: 'video', url: 'https://x/v.mp4', durationSec: 120, createdAt: now }
const byId = new Map([['S1', video]])

describe('image figée d’une vidéo, choisie par l’IA', () => {
  it('« at » donne une image figée qui garde son extrait, sans marque devinée sur la vidéo', () => {
    const m = resolveMedia({ source: 'S1', at: 42.37, focusLabel: 'Bouton vert' }, byId)
    expect(m).toMatchObject({ kind: 'image', url: '', frame: { videoUrl: 'https://x/v.mp4', at: 42.4, start: 39.4, end: 45.4 } })
    if (m?.kind === 'image') expect(m.annotations).toBeUndefined()
  })

  it('un instant hors de la vidéo est ramené dedans', () => {
    const m = resolveMedia({ source: 'S1', at: 999 }, byId)
    if (m?.kind === 'image') expect(m.frame!.at).toBeLessThanOrEqual(120)
  })

  it('la génération dit quelles images méritent un repère : images figées et photos, jamais un extrait vidéo', () => {
    const photo: Source = { id: 'p', kind: 'photo', url: 'https://x/p.jpg', createdAt: now }
    const { content, marks } = normalizeInstruction(
      {
        title: 'Démarrer la presse',
        steps: [
          { title: 'Appuyer sur le bouton vert', text: 'Appuyer.', media: [{ source: 'S1', at: 12, focusLabel: 'Bouton vert' }] },
          { title: 'Tourner la clé', text: 'Tourner.', media: [{ source: 'S1', start: 20, end: 26, focusLabel: 'Clé' }] },
          { title: 'Vérifier la jauge', text: 'Lire.', media: [{ source: 'S2', focusLabel: 'Jauge de pression' }, { source: 'S1', at: 40 }] },
        ],
      },
      [video, photo],
    )
    expect(marks).toEqual([
      { stepId: content.steps[0].id, mediaIndex: 0, hint: 'Bouton vert' },
      { stepId: content.steps[2].id, mediaIndex: 0, hint: 'Jauge de pression' },
    ])
    expect(content.steps[1].media[0].kind).toBe('video')
  })

  it('après la génération, l’image est tirée de la vidéo ; si ça échoue, l’étape garde l’extrait', async () => {
    const frame: StepMedia = { kind: 'image', url: '', sourceId: 'v', frame: { videoUrl: 'https://x/v.mp4', at: 42, start: 39, end: 45 } }
    const content = emptyContent({ steps: [{ id: 's1', title: 'Appuyer sur le bouton vert', text: 'Appuyer.', keyPoints: [], warning: null, media: [frame] }] })
    const ok = { screenshots: vi.fn(async () => ({ 'shot-0': 'https://x/frames/42.jpg' })) } as unknown as FilesApi
    const done = await enrichMedia(content, ok, async () => '')
    expect(done.steps[0].media[0]).toMatchObject({ kind: 'image', url: 'https://x/frames/42.jpg', frame: { at: 42 } })

    const failing = { screenshots: vi.fn(async () => { throw new Error('ffmpeg') }) } as unknown as FilesApi
    const fallback = await enrichMedia(content, failing, async () => '')
    expect(fallback.steps[0].media[0]).toMatchObject({ kind: 'video', url: 'https://x/v.mp4', start: 39, end: 45 })
  })
})
