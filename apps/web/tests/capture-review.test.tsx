/**
 * Avant de générer (toggle `capturePreview`) : toucher une source capturée l'ouvre en grand, avec les
 * autres — la vidéo se joue, la note vocale se réécoute avec sa transcription, la note se lit.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/providers/Session', () => ({
  useSession: () => ({ data: { insert: vi.fn(), patch: vi.fn(), filter: async () => [] }, files: {}, profile: { userId: 'u1' }, displayName: 'Mélanie' }),
}))
let previewOn = true
vi.mock('@/lib/toggles', async (orig) => {
  const real = await orig<typeof import('@/lib/toggles')>()
  return { ...real, useToggle: (name: string) => (name === 'capturePreview' ? previewOn : real.useToggle(name as never)) }
})

import { CaptureBoard } from '@/components/capture/CaptureBoard'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'
import type { Source } from '@/lib/model/types'

const SOURCES: Source[] = [
  { id: 's1', kind: 'video', name: 'geste.mp4', originalName: 'geste.mp4', url: 'https://exemple.test/geste.mp4', thumbnailUrl: 'https://exemple.test/geste.jpg', durationSec: 42, createdAt: '2026-11-18T12:00:00Z' } as Source,
  { id: 's2', kind: 'audio', name: 'Note vocale', url: 'https://exemple.test/note.m4a', text: 'Serrer à la main, puis un quart de tour.', durationSec: 9, createdAt: '2026-11-18T12:01:00Z' } as Source,
  { id: 's3', kind: 'note', name: 'Note', text: 'Toujours couper l’air avant.', createdAt: '2026-11-18T12:02:00Z' } as Source,
]

function Page() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <ConfirmProvider>
          <CaptureBoard instructionId="i1" initialSources={SOURCES} title="Nouvelle instruction" subtitle="Montrez et expliquez." back={{ href: '/instructions', label: 'Instructions' }} onGenerate={vi.fn()} />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false })) as typeof window.matchMedia
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => undefined
  previewOn = true
})
afterEach(() => cleanup())

describe('revoir ce qu’on a capturé avant de générer', () => {
  it('la vidéo s’ouvre en grand et se joue ; la note vocale et la note sont là aussi', () => {
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: 'Revoir geste.mp4' }))
    const dialog = screen.getByRole('dialog', { name: 'Vos captures' })
    const video = dialog.querySelector('video')
    expect(video?.getAttribute('src')).toBe('https://exemple.test/geste.mp4')
    expect(video?.hasAttribute('controls')).toBe(true)
    // La note vocale se réécoute, avec sa transcription ; la note se lit.
    expect(dialog.querySelector('audio')?.getAttribute('src')).toBe('https://exemple.test/note.m4a')
    expect(within(dialog).getByText(/un quart de tour/)).toBeTruthy()
    expect(within(dialog).getByText(/couper l’air/)).toBeTruthy()
    // Rien à « mettre à l'étape » : il n'y a pas encore d'instruction.
    expect(within(dialog).queryByRole('button', { name: /Mettre à l’étape/ })).toBeNull()
  })

  it('toggle coupé : la vignette n’ouvre rien, comme avant', () => {
    previewOn = false
    render(<Page />)
    expect(screen.queryByRole('button', { name: 'Revoir geste.mp4' })).toBeNull()
  })
})
