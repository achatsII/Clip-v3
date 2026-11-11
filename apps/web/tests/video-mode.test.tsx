import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VideoSegment } from '@/components/media/MediaView'
import { readVideoMode, setVideoMode } from '@/lib/media/videoMode'
import { keyboardInset } from '@/lib/ui/keyboard'

let play: ReturnType<typeof vi.fn>
let pause: ReturnType<typeof vi.fn>

beforeEach(() => {
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  HTMLMediaElement.prototype.play = play as unknown as HTMLMediaElement['play']
  HTMLMediaElement.prototype.pause = pause as unknown as HTMLMediaElement['pause']
  // Seul le choix de lecture repart à zéro : la langue de l'outil reste celle des tests (le français).
  localStorage.removeItem('clip_pref_video_mode')
})
afterEach(cleanup)

function mount(mode: 'loop' | 'once' | 'tap') {
  const view = render(<VideoSegment url="https://x/v.mp4" start={2} end={9} mode={mode} />)
  const video = view.container.querySelector('video')!
  Object.defineProperty(video, 'currentTime', { value: 2, writable: true })
  return { video, view }
}

describe('lecture des vidéos des étapes', () => {
  it('au toucher : rien ne démarre seul ; en boucle et une fois : la lecture démarre tout de suite (iPhone ne charge rien avant)', () => {
    mount('tap')
    expect(play).not.toHaveBeenCalled()
    cleanup()
    mount('loop')
    expect(play).toHaveBeenCalledTimes(1)
    cleanup()
    mount('once')
    expect(play).toHaveBeenCalledTimes(2)
  })

  it('en boucle, la fin de l’extrait repart au début ; une fois, elle s’arrête et propose de revoir', async () => {
    const loop = mount('loop')
    loop.video.currentTime = 9
    await act(async () => fireEvent(loop.video, new Event('timeupdate')))
    expect(loop.video.currentTime).toBe(2)
    expect(pause).not.toHaveBeenCalled()
    cleanup()

    const once = mount('once')
    once.video.currentTime = 9
    await act(async () => fireEvent(once.video, new Event('timeupdate')))
    expect(pause).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Revoir l’extrait' })).toBeTruthy()
  })

  it('l’extrait s’ouvre au bon instant, et le choix est retenu sur l’appareil', () => {
    const { video } = mount('tap')
    expect(video.getAttribute('src')).toBe('https://x/v.mp4#t=2')
    expect(readVideoMode()).toBe('loop')
    setVideoMode('tap')
    expect(readVideoMode()).toBe('tap')
  })
})

describe('clavier du téléphone', () => {
  it('mesure ce que le clavier cache, et rien quand on a seulement zoomé', () => {
    expect(keyboardInset(800, { height: 460, offsetTop: 0, scale: 1 })).toBe(340)
    expect(keyboardInset(800, { height: 460, offsetTop: 100, scale: 1 })).toBe(240)
    expect(keyboardInset(800, { height: 780, offsetTop: 0, scale: 1 })).toBe(0)
    expect(keyboardInset(800, { height: 400, offsetTop: 0, scale: 2 })).toBe(0)
  })
})
