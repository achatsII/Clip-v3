import { StrictMode, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VideoSegment } from '@/components/media/MediaView'
import { StepMediaArea } from '@/components/player/StepMediaArea'
import { MediaPlaybackProvider, VideoPool } from '@/lib/media/videoPool'
import type { Step, StepMedia } from '@/lib/model/types'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

/**
 * La lecture fluide des vidéos (toggle `smoothVideos`). Mesuré avant le correctif, à 3 Mbit/s dans
 * l'éditeur : chaque étape ouvrait un lecteur neuf et les anciens, détachés, téléchargeaient encore ;
 * à la 6e étape, plus rien ne démarrait. « Tout voir » lançait toutes les vidéos à la fois.
 */

let play: ReturnType<typeof vi.fn>
let pause: ReturnType<typeof vi.fn>

beforeEach(() => {
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  HTMLMediaElement.prototype.play = play as unknown as HTMLMediaElement['play']
  HTMLMediaElement.prototype.pause = pause as unknown as HTMLMediaElement['pause']
  HTMLMediaElement.prototype.load = vi.fn()
  localStorage.removeItem('clip_pref_video_mode')
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const SRC = 'https://x/atelier.mp4'
const smooth = (children: ReactNode, pool: VideoPool | null = null) => <MediaPlaybackProvider value={{ pool, reel: false, smooth: true }}>{children}</MediaPlaybackProvider>
const settle = () => act(async () => await new Promise((r) => setTimeout(r, 5)))
/** jsdom ne joue rien : on donne à la vidéo l'instant et l'état qu'aurait un vrai lecteur. */
function at(v: HTMLVideoElement, time: number, extra: { readyState?: number; duration?: number } = {}) {
  Object.defineProperty(v, 'currentTime', { configurable: true, writable: true, value: time })
  if (extra.readyState !== undefined) Object.defineProperty(v, 'readyState', { configurable: true, get: () => extra.readyState })
  if (extra.duration !== undefined) Object.defineProperty(v, 'duration', { configurable: true, get: () => extra.duration })
}

describe('la lecture fluide des vidéos', () => {
  it('allumée partout par le serveur ; le repli ne l’active jamais', () => {
    expect(DEFAULT_TOGGLES.smoothVideos).toBe(true)
    expect(FALLBACK_TOGGLES.smoothVideos).toBe(false)
  })

  it('une vidéo qui quitte l’écran arrête de télécharger ; une qui reste (mode strict) n’est pas touchée ; sans le toggle, comme avant', async () => {
    const gone = render(smooth(<VideoSegment url={SRC} start={4} end={10} />))
    const v = gone.container.querySelector('video')!
    expect(v.getAttribute('src')).toBe(`${SRC}#t=4`)
    const kept = render(<StrictMode>{smooth(<VideoSegment url="https://x/reste.mp4" start={0} end={5} />)}</StrictMode>).container.querySelector('video')!
    const before = render(<VideoSegment url="https://x/avant.mp4" start={0} end={5} />)
    const old = before.container.querySelector('video')!
    gone.unmount()
    before.unmount()
    await settle()
    expect(v.getAttribute('src')).toBeNull()
    expect(kept.getAttribute('src')).toBe('https://x/reste.mp4#t=0')
    expect(old.getAttribute('src')).toBe('https://x/avant.mp4#t=0')
  })

  it('un lecteur gardé repris par l’étape suivante repart au début de son extrait, même si l’endroit où il était y tombe ; changer de mode ne le déplace pas', () => {
    const pool = new VideoPool(3)
    const wrap = (key: string, start: number, end: number, mode: 'loop' | 'tap' = 'loop') => smooth(<VideoSegment key={key} url={SRC} start={start} end={end} mode={mode} />, pool)
    const { container, rerender } = render(wrap('a', 0, 6))
    const v = container.querySelector('video')!
    at(v, 3, { readyState: 4 })
    // L'étape suivante (un autre composant, le même lecteur), extrait de 2 s à 8 s : on était à 3 s, on repart à 2 s.
    act(() => rerender(wrap('b', 2, 8)))
    expect(container.querySelector('video')).toBe(v)
    expect(v.currentTime).toBe(2)
    v.currentTime = 5
    act(() => rerender(wrap('b', 2, 8, 'tap')))
    expect(v.currentTime).toBe(5)
  })

  it('dans l’éditeur, la même vidéo garde son lecteur d’une étape à l’autre et lit la vidéo d’origine, jamais la vidéo des étapes', () => {
    const pool = new VideoPool(3)
    const clip = (start: number, end: number): StepMedia => ({ kind: 'video', url: SRC, start, end, clip: { url: 'https://x/etapes.mp4', at: 0, src: SRC, start, end } })
    const step = (id: string, media: StepMedia): Step => ({ id, title: id, text: '', keyPoints: [], warning: null, media: [media] })
    const labels = { zoom: 'Agrandir', doIt: 'À faire', avoid: 'À éviter', previousMedia: 'Média précédent', nextMedia: 'Média suivant', mediaOf: (i: number, n: number) => `${i} / ${n}` }
    // Comme « Comme au poste » : l'étape choisie seulement, remontée à chaque étape.
    const stage = (s: Step) => smooth(<StepMediaArea key={s.id} step={s} labels={labels} />, pool)
    const { container, rerender } = render(stage(step('s1', clip(4, 9))))
    const v = container.querySelector('video')!
    expect(v.getAttribute('src')).toBe(`${SRC}#t=4`)
    act(() => rerender(stage(step('s2', clip(12, 18)))))
    expect(container.querySelector('video')).toBe(v)
  })

  it('un extrait qui finit avec la vidéo boucle quand même ; joué une fois, il propose de revoir', async () => {
    const loop = render(<VideoSegment url={SRC} start={2} end={9} mode="loop" />).container.querySelector('video')!
    at(loop, 8.9)
    play.mockClear()
    // Arrivée au bout de la vidéo, elle s'arrête d'elle-même avant que la fin de l'extrait soit vue.
    await act(async () => fireEvent(loop, new Event('ended')))
    expect(loop.currentTime).toBe(2)
    expect(play).toHaveBeenCalledTimes(1)
    cleanup()
    const once = render(<VideoSegment url={SRC} start={2} end={9} mode="once" />).container.querySelector('video')!
    await act(async () => fireEvent(once, new Event('ended')))
    expect(screen.getByRole('button', { name: 'Revoir l’extrait' })).toBeTruthy()
  })

  it('un extrait sans durée, ou qui commence après la fin de la vidéo, ne la fait pas sauter sans fin', async () => {
    const flat = render(<VideoSegment url={SRC} start={5} end={5} mode="loop" />).container.querySelector('video')!
    at(flat, 5)
    await act(async () => fireEvent(flat, new Event('timeupdate')))
    expect(pause).toHaveBeenCalled()
    expect(flat.currentTime).toBe(5)
    cleanup()
    const late = render(<VideoSegment url={SRC} start={40} end={45} mode="loop" />).container.querySelector('video')!
    at(late, 30, { duration: 30 })
    await act(async () => fireEvent(late, new Event('timeupdate')))
    expect(late.currentTime).toBe(30)
  })

  it('dans « Tout voir », une vidéo ne se charge qu’en approchant de l’écran et ne joue que bien visible ; sans le toggle, elle charge tout de suite', () => {
    const observers: Array<{ cb: IntersectionObserverCallback }> = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(public cb: IntersectionObserverCallback) {
          observers.push(this)
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return []
        }
      },
    )
    const entry = (ratio: number) => [{ isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry]
    // Même avec des lecteurs gardés : chaque vidéo de la liste a le sien.
    const { container } = render(smooth(<VideoSegment url={SRC} start={3} end={8} mode="loop" lazy />, new VideoPool(3)))
    const v = container.querySelector('video')!
    expect(v.getAttribute('src')).toBeNull()
    expect(play).not.toHaveBeenCalled()
    const [approach, half] = observers
    act(() => approach.cb(entry(0.01), approach as unknown as IntersectionObserver))
    expect(v.getAttribute('src')).toBe(`${SRC}#t=3`)
    expect(play).not.toHaveBeenCalled()
    act(() => half.cb(entry(0.8), half as unknown as IntersectionObserver))
    expect(play).toHaveBeenCalled()
    Object.defineProperty(v, 'paused', { configurable: true, get: () => false })
    act(() => half.cb(entry(0), half as unknown as IntersectionObserver))
    expect(pause).toHaveBeenCalled()
    cleanup()
    const before = render(<VideoSegment url={SRC} start={3} end={8} mode="loop" lazy />).container.querySelector('video')!
    expect(before.getAttribute('src')).toBe(`${SRC}#t=3`)
  })
})
