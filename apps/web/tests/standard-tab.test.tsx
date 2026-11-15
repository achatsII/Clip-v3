/**
 * Réglages › Standard de rédaction : la première étape se choisit (le premier geste, la sécurité,
 * autre chose) et s'enregistre dans une nouvelle version du standard.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WritingStandard } from '@/lib/model/types'

let toggleOn = true
vi.mock('@/lib/toggles', () => ({ useToggle: (name: string) => (name === 'firstStepChoice' ? toggleOn : false), usePublicConfig: () => ({ data: undefined }), useRealtimeAvailable: () => false }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

const updateOrg = vi.fn(async (_patch: { standard: WritingStandard }) => undefined)
let standard: WritingStandard
vi.mock('@/components/providers/Session', () => ({
  useSession: () => ({ org: { json_data: { standard, standardHistory: [], learnings: [] } }, ai: {}, updateOrg, can: () => true, displayName: 'Martin' }),
}))

import { StandardTab } from '@/components/settings/StandardTab'
import { messages } from '@/lib/i18n'

beforeAll(() => {
  // jsdom n'a pas ResizeObserver (les règles grandissent avec leur texte).
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})
beforeEach(() => {
  toggleOn = true
  updateOrg.mockClear()
  // Le standard de l'usine de QA, enregistré avant ce choix : seulement startWithSafety.
  standard = { rules: ['Une seule action par étape.'], startWithSafety: true, maxWordsPerStep: 20, tone: 'infinitif', glossary: [], version: 1, updatedAt: '2026-11-11T12:00:00.000Z' }
})
afterEach(cleanup)

const t = () => messages().settings.standard
const tile = (title: string) => screen.getByText(title).closest('button') as HTMLButtonElement
const save = () => fireEvent.click(screen.getByText(t().saveVersion(2)))

describe('la première étape, dans le standard de rédaction', () => {
  it('un ancien « toujours commencer par la sécurité » s’affiche choisi ; « Le premier geste » s’enregistre', async () => {
    render(<StandardTab />)
    expect(tile(t().firstStepKinds.safety.title).getAttribute('aria-pressed')).toBe('true')
    expect(tile(t().firstStepKinds.work.title).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(tile(t().firstStepKinds.work.title))
    save()
    await vi.waitFor(() => expect(updateOrg).toHaveBeenCalledTimes(1))
    expect(updateOrg.mock.calls[0][0].standard).toMatchObject({ firstStep: 'work', startWithSafety: false, version: 2 })
  })

  it('« Autre chose » ouvre la phrase de l’usine, qui s’enregistre avec le choix', async () => {
    render(<StandardTab />)
    expect(screen.queryByLabelText(t().firstStepText)).toBeNull()
    fireEvent.click(tile(t().firstStepKinds.custom.title))
    // Tant que la phrase manque, l'écran dit ce qui se passera.
    expect(screen.getByText(t().firstStepEmpty)).toBeTruthy()
    fireEvent.change(screen.getByLabelText(t().firstStepText), { target: { value: 'Vérifier le bon de travail' } })
    expect(screen.queryByText(t().firstStepEmpty)).toBeNull()
    save()
    await vi.waitFor(() => expect(updateOrg).toHaveBeenCalledTimes(1))
    expect(updateOrg.mock.calls[0][0].standard).toMatchObject({ firstStep: 'custom', firstStepText: 'Vérifier le bon de travail', startWithSafety: false })
  })

  it('toggle éteint : l’interrupteur d’avant, qui garde le choix à jour', async () => {
    toggleOn = false
    render(<StandardTab />)
    expect(screen.queryByText(t().firstStepKinds.work.title)).toBeNull()
    fireEvent.click(screen.getByRole('switch'))
    save()
    await vi.waitFor(() => expect(updateOrg).toHaveBeenCalledTimes(1))
    expect(updateOrg.mock.calls[0][0].standard).toMatchObject({ firstStep: 'work', startWithSafety: false })
  })
})
