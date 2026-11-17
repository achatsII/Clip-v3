/**
 * L'ordre des médias d'une étape (toggle `mediaOrder`) et la photo d'un retour d'opérateur mise à
 * l'étape (toggle `feedbackMedia`), dans l'éditeur.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render as rtlRender, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/toggles', () => ({ useToggle: (name: string) => name !== 'mediaNav', usePublicConfig: () => ({ data: null }) }))
vi.mock('@/components/providers/Session', () => ({ useSession: () => ({ ai: {}, org: { json_data: {} }, files: {}, data: null }) }))
vi.mock('@/lib/bridge/native', () => ({ callNative: vi.fn(), onNativeEvent: () => () => undefined, nativeEnv: () => null, inNativeShell: () => false, hasCapability: () => false, haptic: () => undefined, NativeError: class extends Error {} }))

import { OperatorFeedbackNote } from '@/components/editor/OperatorFeedback'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'
import { StepMediaEditor } from '@/components/editor/StepMediaEditor'
import { emptyContent } from '@/lib/model/repo'
import type { Step } from '@/lib/model/types'

beforeEach(() => localStorage.setItem('clip_pref_ui_lang', 'fr'))
const render = (ui: ReactElement) =>
  rtlRender(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <ConfirmProvider>{ui}</ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
afterEach(cleanup)

const photo = (n: number) => ({ kind: 'image' as const, url: `https://x/p${n}.jpg` })
const step: Step = { id: 's1', title: 'Retirer le filtre', text: '', keyPoints: [], warning: null, media: [photo(1), photo(2), photo(3)] }

describe('l’ordre des médias d’une étape', () => {
  it('le média choisi passe avant ou après son voisin ; au bout, la flèche ne fait rien', () => {
    const onChange = vi.fn()
    render(<StepMediaEditor content={emptyContent({ title: 'x', steps: [step] })} step={step} sources={[]} onChange={onChange} onSourceAdded={vi.fn()} />)
    // Le premier média est choisi : il ne peut pas aller plus tôt.
    expect((screen.getByRole('button', { name: 'Mettre ce média avant' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Mettre ce média après' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ media: [photo(2), photo(1), photo(3)] }))
  })
})

describe('la photo d’un retour d’opérateur', () => {
  it('se voit avec le commentaire, et un toucher la met à l’étape', async () => {
    const use = vi.fn(async () => undefined)
    render(<OperatorFeedbackNote note="Le filtre n’est pas le bon" photo="https://x/retour.jpg" onUsePhoto={use} />)
    expect(screen.getByText('Retour d’un opérateur : « Le filtre n’est pas le bon »')).toBeTruthy()
    expect(screen.getByAltText('La photo de l’opérateur').getAttribute('src')).toBe('https://x/retour.jpg')
    fireEvent.click(screen.getByRole('button', { name: /Mettre cette photo à l’étape/ }))
    expect(use).toHaveBeenCalledTimes(1)
  })

  it('en lecture seule (ou toggle coupé), la photo se voit sans le geste', () => {
    render(<OperatorFeedbackNote note="Pas clair" photo="https://x/retour.jpg" />)
    expect(screen.queryByRole('button', { name: /Mettre cette photo/ })).toBeNull()
  })
})
