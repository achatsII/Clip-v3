import { StrictMode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { VideoSegment } from '@/components/media/MediaView'
import type { FilesApi } from '@/lib/gateway/files'
import type { DataApi } from '@/lib/gateway/data'
import { attachReel, buildReel, carryClips, playable, REEL_RETRY_MS, reelSegments, reelStale, validClip, withReel } from '@/lib/media/reel'
import { MediaPlaybackProvider, VideoPool } from '@/lib/media/videoPool'
import { emptyContent } from '@/lib/model/repo'
import type { InstructionContent, StepMedia } from '@/lib/model/types'

beforeAll(() => {
  // Le navigateur de test ne joue pas de vidéo.
  HTMLMediaElement.prototype.pause = vi.fn()
  HTMLMediaElement.prototype.load = vi.fn()
  HTMLMediaElement.prototype.play = vi.fn(async () => undefined)
})
afterEach(cleanup)

const SRC = 'https://x/atelier.mp4'
const video = (start: number, end: number, url = SRC): StepMedia => ({ kind: 'video', url, start, end })
const content = (...media: StepMedia[][]): InstructionContent =>
  emptyContent({ title: 'Rails', steps: media.map((m, i) => ({ id: `s${i}`, title: `Étape ${i}`, text: '', keyPoints: [], warning: null, media: m })) })

describe('la vidéo des étapes', () => {
  it('les extraits dans l’ordre des étapes, un même extrait une seule fois, les positions qui s’enchaînent', () => {
    const c = content([video(4, 10)], [{ kind: 'image', url: 'https://x/p.jpg' }], [video(20, 26), video(4, 10)], [video(1, 3, 'https://x/autre.mp4')])
    const segs = reelSegments(c)
    expect(segs.map((s) => [s.videoUrl, s.start, s.end])).toEqual([
      [SRC, 4, 10],
      [SRC, 20, 26],
      ['https://x/autre.mp4', 1, 3],
    ])
    const r = withReel(c, 'https://x/etapes.mp4', segs)
    expect(validClip(r.steps[0].media[0])).toMatchObject({ url: 'https://x/etapes.mp4', at: 0 })
    expect(validClip(r.steps[2].media[0])).toMatchObject({ at: 6 })
    expect(validClip(r.steps[2].media[1])).toMatchObject({ at: 0 })
    expect(validClip(r.steps[3].media[0])).toMatchObject({ at: 12 })
    // Le lecteur lit l'extrait dans la vidéo des étapes : de 6 s à 12 s.
    expect(playable(r.steps[2].media[0] as Extract<StepMedia, { kind: 'video' }>)).toEqual({ url: 'https://x/etapes.mp4', start: 6, end: 12 })
    expect(reelStale(r)).toBe(false)
  })

  it('un extrait modifié ensuite se relit dans sa vidéo d’origine, et la vidéo des étapes est à refaire', () => {
    const c = content([video(4, 10)], [video(20, 26)])
    const r = withReel(c, 'https://x/etapes.mp4', reelSegments(c))
    const moved: InstructionContent = { ...r, steps: r.steps.map((s, i) => (i === 1 ? { ...s, media: [{ ...(s.media[0] as Extract<StepMedia, { kind: 'video' }>), end: 30 }] } : s)) }
    expect(validClip(moved.steps[1].media[0])).toBeNull()
    expect(playable(moved.steps[1].media[0] as Extract<StepMedia, { kind: 'video' }>)).toEqual({ url: SRC, start: 20, end: 30 })
    expect(reelStale(moved)).toBe(true)
    // Toggle coupé : toujours la vidéo d'origine.
    expect(playable(r.steps[0].media[0] as Extract<StepMedia, { kind: 'video' }>, false)).toEqual({ url: SRC, start: 4, end: 10 })
  })

  it('rien à monter sans extrait vidéo, ni pour une vidéo d’étapes trop longue', () => {
    expect(reelStale(content([{ kind: 'image', url: 'https://x/p.jpg' }]))).toBe(false)
    expect(reelStale(content([video(0, 16 * 60)]))).toBe(false)
  })

  it('montée par la passerelle ; une source sans son : nouvel essai sans le son', async () => {
    const composeVideo = vi.fn(async (_s: unknown, o?: { mute?: boolean }) => {
      if (!o?.mute) throw new Error('FFmpeg : pas de piste son')
      return 'https://x/etapes.mp4'
    })
    const r = await buildReel({ composeVideo } as unknown as FilesApi, content([video(4, 10)], [video(20, 26)]))
    expect(composeVideo).toHaveBeenCalledTimes(2)
    expect(composeVideo.mock.calls[0][0]).toEqual([
      { videoUrl: SRC, start: 4, end: 10 },
      { videoUrl: SRC, start: 20, end: 26 },
    ])
    expect(validClip(r!.steps[1].media[0])).toMatchObject({ url: 'https://x/etapes.mp4', at: 6 })
  })
})

describe('la vidéo des étapes ne retient jamais la publication', () => {
  const reel = (c: InstructionContent) => withReel(c, 'https://x/etapes.mp4', reelSegments(c))

  it('un extrait inchangé garde sa place ; un extrait retiré ou déplacé fait remonter la vidéo', () => {
    const before = reel(content([video(4, 10)], [video(20, 26)], [video(40, 44)]))
    // Texte changé seulement : rien à remonter.
    const same = carryClips(content([video(4, 10)], [video(20, 26)], [video(40, 44)]), before)
    expect(reelStale(same)).toBe(false)
    expect(validClip(same.steps[1].media[0])).toMatchObject({ at: 6 })
    // Une étape retirée : le poste téléchargerait ses secondes pour rien.
    expect(reelStale(carryClips(content([video(4, 10)], [video(40, 44)]), before))).toBe(true)
    // Deux étapes inversées : la suivante n'est plus à la suite.
    expect(reelStale(carryClips(content([video(20, 26)], [video(4, 10)], [video(40, 44)]), before))).toBe(true)
    // Un extrait modifié n'hérite de rien.
    expect(validClip(carryClips(content([video(4, 12)]), before).steps[0].media[0])).toBeNull()
  })

  it('après la publication : montée, puis donnée au document public s’il en est encore à cette version', async () => {
    const c = content([video(4, 10)], [video(20, 26)])
    const files = { composeVideo: vi.fn(async () => 'https://x/etapes.mp4') } as unknown as FilesApi
    const patch = vi.fn(async () => undefined)
    const data = (version: number) => ({ get: vi.fn(async () => ({ _id: 'p1', json_data: { version, content: c } })), patch }) as unknown as DataApi
    expect(await attachReel(files, data(4), { publishedId: 'p1', version: 4 }, c)).toBe(true)
    expect(patch).toHaveBeenCalledWith('clip_published', 'p1', { content: expect.any(Object) })
    const sent = (patch.mock.calls[0] as unknown[])[2] as { content: InstructionContent }
    expect(validClip(sent.content.steps[1].media[0])).toMatchObject({ url: 'https://x/etapes.mp4', at: 6 })
    // Une publication plus récente entre-temps : on n'y touche pas.
    patch.mockClear()
    expect(await attachReel(files, data(5), { publishedId: 'p1', version: 4 }, c)).toBe(false)
    expect(patch).not.toHaveBeenCalled()
  })

  it('montage en panne : rien n’échoue, et on ne réessaie pas avant une demi-heure', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      const c = content([video(4, 10)])
      const composeVideo = vi.fn(async () => {
        throw new Error('500')
      })
      const data = { get: vi.fn(), patch: vi.fn() } as unknown as DataApi
      expect(await attachReel({ composeVideo } as unknown as FilesApi, data, { publishedId: 'p1', version: 1 }, c)).toBe(false)
      expect(composeVideo).toHaveBeenCalledTimes(2)
      expect(await attachReel({ composeVideo } as unknown as FilesApi, data, { publishedId: 'p1', version: 1 }, c)).toBe(false)
      expect(composeVideo).toHaveBeenCalledTimes(2)
      vi.setSystemTime(Date.now() + REEL_RETRY_MS + 1000)
      await attachReel({ composeVideo } as unknown as FilesApi, data, { publishedId: 'p1', version: 1 }, c)
      expect(composeVideo).toHaveBeenCalledTimes(4)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('un lecteur gardé d’une étape à l’autre', () => {
  it('la même vidéo : le même lecteur, rien ne se recharge ; ailleurs en même temps : un autre', () => {
    const pool = new VideoPool(2)
    const a = pool.acquire(SRC)
    const b = pool.acquire(SRC)
    expect(b).not.toBe(a)
    pool.release(a)
    expect(pool.acquire(SRC)).toBe(a)
  })

  it('l’étape suivante se prépare en avance ; au plus quelques lecteurs gardés, les plus vieux se libèrent', () => {
    const pool = new VideoPool(2)
    pool.warm('https://x/1.mp4', 3)
    const warm = pool.acquire('https://x/1.mp4')
    expect(warm.preload).toBe('auto')
    pool.release(warm)
    pool.warm('https://x/2.mp4', 0)
    pool.warm('https://x/3.mp4', 0)
    expect(pool.has('https://x/1.mp4')).toBe(false)
    expect(warm.getAttribute('src')).toBeNull()
    expect(pool.has('https://x/3.mp4')).toBe(true)
  })

  it('un lecteur neuf télécharge à partir du moment de l’étape, pas depuis le début de la vidéo', () => {
    const pool = new VideoPool(3)
    expect(pool.acquire(SRC, 12).getAttribute('src')).toBe(`${SRC}#t=12`)
    expect(pool.acquire('https://x/debut.mp4').getAttribute('src')).toBe('https://x/debut.mp4')
    pool.warm('https://x/suivante.mp4', 6)
    expect(pool.acquire('https://x/suivante.mp4').getAttribute('src')).toBe('https://x/suivante.mp4#t=6')
  })

  it('un lecteur repris d’une autre étape repart au début de la sienne, même si l’endroit où il était y tombe ; changer de mode ne le déplace pas', () => {
    const pool = new VideoPool(3)
    const wrap = (start: number, end: number, mode: 'loop' | 'tap' = 'loop') => (
      <MediaPlaybackProvider value={{ pool, reel: false }}>
        <VideoSegment key={start} url={SRC} start={start} end={end} mode={mode} />
      </MediaPlaybackProvider>
    )
    const { container, rerender } = render(wrap(0, 6))
    const v = container.querySelector('video')!
    Object.defineProperty(v, 'readyState', { configurable: true, get: () => 4 })
    v.currentTime = 3
    // Étape suivante, extrait de 2 s à 8 s de la même vidéo : on était à 3 s, on repart à 2 s.
    act(() => rerender(wrap(2, 8)))
    expect(container.querySelector('video')).toBe(v)
    expect(v.currentTime).toBe(2)
    v.currentTime = 5
    act(() => rerender(wrap(2, 8, 'tap')))
    expect(v.currentTime).toBe(5)
  })

  it('ailleurs, une vidéo qui quitte l’écran arrête de télécharger ; une qui reste n’est pas touchée', async () => {
    const { container, unmount } = render(<VideoSegment url={SRC} start={4} end={10} />)
    const v = container.querySelector('video')!
    expect(v.getAttribute('src')).toBe(`${SRC}#t=4`)
    // En mode strict, React simule un démontage : la vidéo, restée à l'écran, ne doit pas s'arrêter.
    const kept = render(
      <StrictMode>
        <VideoSegment url="https://x/reste.mp4" start={0} end={5} />
      </StrictMode>,
    ).container.querySelector('video')!
    unmount()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5))
    })
    expect(v.getAttribute('src')).toBeNull()
    expect(kept.getAttribute('src')).toBe('https://x/reste.mp4#t=0')
  })

  it('au lecteur d’instruction, une étape qui suit dans la même vidéo réutilise le même élément vidéo', () => {
    const pool = new VideoPool(3)
    const wrap = (start: number, end: number) => (
      <MediaPlaybackProvider value={{ pool, reel: true }}>
        <VideoSegment key={start} url="https://x/etapes.mp4" start={start} end={end} />
      </MediaPlaybackProvider>
    )
    const { container, rerender } = render(wrap(0, 6))
    const first = container.querySelector('video')
    expect(first).not.toBeNull()
    act(() => rerender(wrap(6, 12)))
    expect(container.querySelector('video')).toBe(first)
  })
})
