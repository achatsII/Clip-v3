import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const filter = vi.fn()
vi.mock('@/components/providers/Session', () => ({ useSession: () => ({ data: { filter } }) }))

import { AnnotationLayer } from '@/components/media/MediaView'
import { markFresh, newAnnotationIds } from '@/lib/annotations/fresh'
import { useDraftWatch } from '@/hooks/useDraftWatch'
import { deviceId, setRealtimeState } from '@/lib/realtime/client'
import { remoteChange, WATCH_MS } from '@/lib/realtime/watch'
import type { Annotation } from '@/lib/model/types'

beforeEach(() => {
  vi.useFakeTimers()
  filter.mockReset()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  setRealtimeState('off')
})

describe('suivre ce qui change sur un autre appareil', () => {
  it('un autre appareil a écrit une date que cet écran ne connaît pas : oui ; lui-même, ou sans appareil connu : non', () => {
    expect(remoteChange({ updatedAt: '2026-11-12T15:00:01Z', updatedFrom: 'telephone' }, { at: '2026-11-12T15:00:00Z', device: 'ordi' })).toBe(true)
    expect(remoteChange({ updatedAt: '2026-11-12T15:00:01Z', updatedFrom: 'ordi' }, { at: '2026-11-12T15:00:00Z', device: 'ordi' })).toBe(false)
    expect(remoteChange({ updatedAt: '2026-11-12T15:00:00Z', updatedFrom: 'telephone' }, { at: '2026-11-12T15:00:00Z', device: 'ordi' })).toBe(false)
    expect(remoteChange({ updatedAt: '2026-11-12T15:00:01Z' }, { at: null, device: 'ordi' })).toBe(false)
    // Une horloge de téléphone en retard ne trompe pas : la date se compare à l'identique.
    expect(remoteChange({ updatedAt: '2026-11-12T14:00:00Z', updatedFrom: 'telephone' }, { at: '2026-11-12T15:00:00Z', device: 'ordi' })).toBe(true)
  })

  function Watch(props: { known: string; idle?: boolean; onRemote: (r: unknown) => void }) {
    useDraftWatch({ id: 'i1', enabled: true, known: () => props.known, idle: () => props.idle ?? true, onRemote: props.onRemote })
    return null
  }
  const mount = (el: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{el}</QueryClientProvider>)

  it('le direct ne passe pas : l’écran se relit seul toutes les 8 s, et suit ce qu’un autre appareil a changé', async () => {
    setRealtimeState('down')
    filter.mockResolvedValue([
      { _id: 'autre', json_data: { updatedAt: '2026-11-12T15:00:09Z', updatedFrom: 'telephone' } },
      { _id: 'i1', json_data: { updatedAt: '2026-11-12T15:00:05Z', updatedFrom: 'telephone', updatedVia: 'app', updatedByName: 'Mélanie' } },
    ])
    const onRemote = vi.fn()
    mount(<Watch known="2026-11-12T15:00:00Z" onRemote={onRemote} />)
    expect(filter).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WATCH_MS)
    })
    expect(filter).toHaveBeenCalledTimes(1)
    // Une lecture minuscule : la date et l'appareil, pas le brouillon.
    expect(filter.mock.calls[0][1].projection).toEqual({ 'json_data.updatedAt': 1, 'json_data.updatedFrom': 1, 'json_data.updatedVia': 1, 'json_data.updatedByName': 1 })
    expect(onRemote).toHaveBeenCalledWith({ updatedAt: '2026-11-12T15:00:05Z', updatedFrom: 'telephone', updatedVia: 'app', updatedByName: 'Mélanie' })
  })

  it('ses propres enregistrements, ou une modification en cours ici : rien ne se relit par-dessus', async () => {
    setRealtimeState('down')
    filter.mockResolvedValue([{ _id: 'i1', json_data: { updatedAt: '2026-11-12T15:00:05Z', updatedFrom: deviceId } }])
    const mine = vi.fn()
    mount(<Watch known="2026-11-12T15:00:00Z" onRemote={mine} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WATCH_MS)
    })
    expect(mine).not.toHaveBeenCalled()
    cleanup()
    filter.mockResolvedValue([{ _id: 'i1', json_data: { updatedAt: '2026-11-12T15:00:05Z', updatedFrom: 'telephone' } }])
    const busy = vi.fn()
    mount(<Watch known="2026-11-12T15:00:00Z" idle={false} onRemote={busy} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WATCH_MS * 2)
    })
    expect(busy).not.toHaveBeenCalled()
  })

  it('le direct branché : aucune relecture, les annonces arrivent seules', async () => {
    setRealtimeState('live')
    const onRemote = vi.fn()
    mount(<Watch known="x" onRemote={onRemote} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WATCH_MS * 3)
    })
    expect(filter).not.toHaveBeenCalled()
  })
})

describe('une flèche qui arrive se fait voir', () => {
  const mark = (id: string): Annotation => ({ id, type: 'arrow', x: 0.1, y: 0.1, x2: 0.4, y2: 0.4, color: 'red', text: id })

  it('une flèche arrivée d’un autre appareil clignote même si l’écran vient de s’ouvrir sur son étape', () => {
    const before = { steps: [{ id: 's1', media: [{ kind: 'image', url: 'x', annotations: [mark('a1')] }] }] } as never
    const after = { steps: [{ id: 's1', media: [{ kind: 'image', url: 'x', annotations: [mark('a1'), mark('tel')] }] }] } as never
    expect(newAnnotationIds(before, after)).toEqual(['tel'])
    markFresh(['tel'])
    const { container } = render(<AnnotationLayer annotations={[mark('a1'), mark('tel')]} ratio={1.5} />)
    const fresh = container.querySelector('.mark-in')
    expect(fresh?.innerHTML).toContain('tel')
    expect(fresh?.innerHTML).not.toContain('a1')
  })

  it('les marques déjà là ne bougent pas ; une nouvelle clignote, puis rejoint les autres', async () => {
    const { container, rerender } = render(<AnnotationLayer annotations={[mark('a1')]} ratio={1.5} />)
    expect(container.querySelector('.mark-in')).toBeNull()
    rerender(<AnnotationLayer annotations={[mark('a1'), mark('a2')]} ratio={1.5} />)
    const fresh = container.querySelector('.mark-in')
    expect(fresh).not.toBeNull()
    expect(fresh!.innerHTML).toContain('a2')
    expect(fresh!.innerHTML).not.toContain('a1')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2300)
    })
    expect(container.querySelector('.mark-in')).toBeNull()
    expect(container.innerHTML).toContain('a2')
  })
})

describe('dans l’annotateur, ce qu’on trace s’affiche tout de suite', () => {
  const mark = (id: string, x2 = 0.4): Annotation => ({ id, type: 'arrow', x: 0.1, y: 0.1, x2, y2: 0.4, color: 'red' })

  it('une marque tracée ici ne clignote pas et suit le doigt, pendant qu’on la trace', () => {
    const { container, rerender } = render(<AnnotationLayer annotations={[]} ratio={1} blink={false} />)
    rerender(<AnnotationLayer annotations={[mark('n', 0.1)]} ratio={1} blink={false} />)
    rerender(<AnnotationLayer annotations={[mark('n', 0.7)]} ratio={1} blink={false} />)
    expect(container.querySelector('.mark-in')).toBeNull()
    expect(container.innerHTML).toContain('x2="700"')
  })

  it('une marque qui clignote montre quand même sa nouvelle légende', () => {
    const { container, rerender } = render(<AnnotationLayer annotations={[]} ratio={1} />)
    rerender(<AnnotationLayer annotations={[mark('n')]} ratio={1} />)
    rerender(<AnnotationLayer annotations={[{ ...mark('n'), text: 'Ici' }]} ratio={1} />)
    expect(container.querySelector('.mark-in')?.innerHTML).toContain('Ici')
  })
})
