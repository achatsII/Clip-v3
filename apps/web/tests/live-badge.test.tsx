import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiveBadge } from '@/components/editor/LiveBadge'
import { noteRealtimeStart, setRealtimeState } from '@/lib/realtime/client'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  setRealtimeState('off')
})

describe('le témoin du direct dit ce qui bloque', () => {
  it('direct coupé : la raison d’Ably et son code, et un bouton pour le rebrancher', () => {
    setRealtimeState('down', { message: 'Unable to connect', code: 80003, statusCode: 0 })
    render(<LiveBadge state="down" />)
    fireEvent.click(screen.getByRole('button', { name: 'Relu toutes les 8 s' }))
    expect(screen.getByText(/Unable to connect \(80003\)/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Reconnecter/ })).toBeTruthy()
  })

  it('jamais démarré : il dit pourquoi (temps réel non offert, usine inconnue)', () => {
    noteRealtimeStart({ available: false, hasOrg: true })
    const { unmount } = render(<LiveBadge state="off" />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/pas offert par le serveur/)).toBeTruthy()
    unmount()
    noteRealtimeStart({ available: true, hasOrg: false })
    render(<LiveBadge state="off" />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/usine de ce compte n’est pas connue/)).toBeTruthy()
  })

  it('coupé plus de 15 s : l’appareil le dit une fois au serveur, sans rien de personnel', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    setRealtimeState('down', { message: 'Token request failed', code: 40170, statusCode: 401 })
    noteRealtimeStart({ available: true, hasOrg: true })
    const { rerender } = render(<LiveBadge state="down" />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })
    rerender(<LiveBadge state="down" />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0] as unknown as [string, { body: string }]
    expect(url).toBe('/api/realtime/diag')
    expect(JSON.parse(init.body)).toEqual({ state: 'down', reason: 'Token request failed (40170/401)', available: true, hasOrg: true, via: 'web' })
  })
})
