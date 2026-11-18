import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/toggles', () => ({ useToggle: () => false }))
vi.mock('@/components/providers/Session', () => ({ useSession: () => ({ ai: {}, org: { json_data: {} }, files: {}, data: {} }) }))
vi.mock('@/lib/billing/state', () => ({
  useBilling: () => ({ openPaywall: vi.fn() }),
  useEntitlement: () => 'open',
  useGate: () => (_right: unknown, _key: string, fn: () => void) => fn(),
}))
vi.mock('@/hooks/useWriting', () => ({ usePersonalWriting: () => ({ data: null }) }))

import { AgentPanel } from '@/components/editor/AgentPanel'
import { ToastProvider } from '@/components/ui/Toast'
import type { InstructionContent } from '@/lib/model/types'

/** Un téléphone : aucune requête « grand écran » ne répond oui. */
function narrowScreen() {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false })) as typeof window.matchMedia
}

const content: InstructionContent = {
  title: 'Nettoyage des rails',
  summary: '',
  kind: 'procedure',
  category: 'nettoyage',
  tags: [],
  ppe: [],
  tools: [],
  safety: [],
  language: 'fr',
  steps: [{ id: 's1', title: 'Couper l’alimentation', text: '', keyPoints: [], warning: null, media: [] }],
}

function panel(props: { aboveBar?: boolean; wake?: number }) {
  return (
    <ToastProvider>
      <AgentPanel content={content} setContent={vi.fn()} focusStepId="s1" onFocus={vi.fn()} onWorking={vi.fn()} open onOpenChange={vi.fn()} {...props} />
    </ToastProvider>
  )
}

const inset = () => document.documentElement.style.getPropertyValue('--agent-inset')
/** Le conteneur fixe de la pastille réduite. */
const pill = () => screen.getByRole('button', { name: 'Assistant' }).parentElement as HTMLElement

beforeEach(() => {
  narrowScreen()
  // jsdom n'a pas `scrollTo` sur un élément : la conversation s'y fait défiler jusqu'au dernier message.
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo
  document.documentElement.style.removeProperty('--agent-inset')
})
afterEach(cleanup)

describe('L’assistant de l’éditeur au téléphone', () => {
  it('ouvert, dit ce qu’il cache du bas de l’écran ; réduit, il ne cache plus rien', () => {
    render(panel({ aboveBar: true }))
    // La page en tient compte (`pb-agent`) : sa fin défile au-dessus du panneau.
    expect(inset()).toMatch(/^\d+px$/)
    fireEvent.click(screen.getByRole('button', { name: 'Réduire' }))
    expect(inset()).toBe('')
  })

  it('réduit au-dessus de la barre de l’éditeur : à droite, sans la couvrir', () => {
    render(panel({ aboveBar: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Réduire' }))
    const box = pill()
    expect(box.className).toContain('bottom-[calc(5.25rem+env(safe-area-inset-bottom))]')
    expect(box.className).toContain('right-4')
    // Posée sur la barre (tout le bas), elle en cachait les boutons.
    expect(box.className).not.toContain('inset-x-0')
  })

  it('sans barre (les réglages), la pastille réduite prend le bas de l’écran, comme avant', () => {
    render(panel({}))
    fireEvent.click(screen.getByRole('button', { name: 'Réduire' }))
    expect(pill().className).toContain('inset-x-0')
  })

  it('le bouton Assistant de la page rouvre la conversation réduite', () => {
    const { rerender } = render(panel({ aboveBar: true, wake: 0 }))
    fireEvent.click(screen.getByRole('button', { name: 'Réduire' }))
    expect(screen.queryByRole('button', { name: 'Réduire' })).toBeNull()
    act(() => rerender(panel({ aboveBar: true, wake: 1 })))
    expect(screen.getByRole('button', { name: 'Réduire' })).toBeTruthy()
  })
})
