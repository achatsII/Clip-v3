import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

let toggle = true
vi.mock('@/lib/toggles', () => ({ useToggle: () => toggle }))
vi.mock('@/components/providers/Session', () => ({
  useSession: () => ({
    data: { filter: async () => [], insert: async (_t: string, j: object) => ({ _id: 'c1', json_data: j }), remove: async () => undefined },
    profile: { userId: 'u1' },
    displayName: 'Mélanie',
  }),
}))

import { useDraftHistory } from '@/hooks/useDraftHistory'
import type { InstructionContent } from '@/lib/model/types'

afterEach(() => {
  cleanup()
  toggle = true
})

const content = (title: string) => ({ title, summary: '', kind: 'procedure', category: 'production', tags: [], ppe: [], tools: [], safety: [], steps: [], lockout: null, language: 'fr' }) as unknown as InstructionContent

/** Un éditeur réduit à l'essentiel : un titre qu'on modifie, un champ de l'instruction, un champ à part. */
function Harness() {
  const [c, setC] = useState(content('Couper'))
  const latest = useRef(c)
  latest.current = c
  const h = useDraftHistory({ instructionId: 'i1', active: true, current: () => latest.current, apply: setC })
  const edit = () => {
    const next = content(`${latest.current.title}!`)
    h.record(latest.current, next)
    latest.current = next
    setC(next)
  }
  return (
    <div>
      <p data-testid="title">{c.title}</p>
      <button type="button" onClick={edit}>modifier</button>
      <button type="button" onClick={h.undo} disabled={!h.canUndo}>annuler</button>
      <input data-testid="field" aria-label="champ" />
      <input data-testid="own" aria-label="à part" data-own-undo="" />
      <div role="dialog">
        <input data-testid="dialog" aria-label="fenêtre" />
      </div>
    </div>
  )
}

const renderHarness = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness />
    </QueryClientProvider>,
  )

const ctrl = (el: Element, key = 'z', extra: Partial<KeyboardEventInit> = {}) => fireEvent.keyDown(el, { key, ctrlKey: true, bubbles: true, cancelable: true, ...extra })

describe('Ctrl+Z dans l’éditeur', () => {
  it('annule l’instruction depuis ses champs, et rétablit avec Ctrl+Maj+Z ou Ctrl+Y', async () => {
    renderHarness()
    fireEvent.click(screen.getByText('modifier'))
    expect(screen.getByTestId('title').textContent).toBe('Couper!')
    await act(async () => {
      expect(ctrl(screen.getByTestId('field'))).toBe(false) // l'événement est pris (preventDefault)
    })
    expect(screen.getByTestId('title').textContent).toBe('Couper')
    await act(async () => {
      ctrl(screen.getByTestId('field'), 'z', { shiftKey: true })
    })
    expect(screen.getByTestId('title').textContent).toBe('Couper!')
    await act(async () => {
      ctrl(screen.getByTestId('field'))
      ctrl(screen.getByTestId('field'), 'y')
    })
    expect(screen.getByTestId('title').textContent).toBe('Couper!')
  })

  it('laisse leur propre annulation aux fenêtres et aux champs à part (assistant, commentaire)', async () => {
    renderHarness()
    fireEvent.click(screen.getByText('modifier'))
    await act(async () => {
      expect(ctrl(screen.getByTestId('own'))).toBe(true) // pas pris : le navigateur annule dans le champ
      expect(ctrl(screen.getByTestId('dialog'))).toBe(true)
    })
    expect(screen.getByTestId('title').textContent).toBe('Couper!')
  })

  it('toggle coupé : ni bouton actif, ni raccourci', async () => {
    toggle = false
    renderHarness()
    fireEvent.click(screen.getByText('modifier'))
    expect((screen.getByText('annuler') as HTMLButtonElement).disabled).toBe(true)
    await act(async () => {
      expect(ctrl(screen.getByTestId('field'))).toBe(true)
    })
    expect(screen.getByTestId('title').textContent).toBe('Couper!')
  })
})
