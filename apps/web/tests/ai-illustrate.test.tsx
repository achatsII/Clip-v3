/**
 * L'illustration par l'IA : elle part de l'image de l'étape quand il y en a une, sinon de son texte
 * (une étape sans image en a souvent le plus besoin). Et les outils de l'IA sont à découvert dans
 * l'éditeur : au téléphone, le menu « Avec l'IA » s'ouvrait au bas de la feuille et se perdait.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const ask = vi.fn(async (_op: string, _body: Record<string, unknown>) => ({ json: { prompt: 'Flat illustration of a hand pressing a green button' }, text: '', model: 'm', usage: null }))
const generateImage = vi.fn(async (_prompt: string, _refs: string[]) => 'https://cdn.test/illustration.png')
vi.mock('@/components/providers/Session', () => ({ useSession: () => ({ ai: { ask, generateImage }, data: {}, files: {} }) }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => vi.fn(async () => true) }))
vi.mock('@/lib/toggles', () => ({ useToggle: () => true }))

import { StepMediaEditor } from '@/components/editor/StepMediaEditor'
import { runAgentOps } from '@/lib/ai/agent'
import { illustrationPrompt } from '@/lib/ai/assist'
import type { AiApi } from '@/lib/gateway/ai'
import { messages } from '@/lib/i18n'
import { emptyContent } from '@/lib/model/repo'
import type { InstructionContent, Step } from '@/lib/model/types'

afterEach(() => {
  cleanup()
  ask.mockClear()
  generateImage.mockClear()
})

const content = (media: Step['media']): InstructionContent =>
  emptyContent({ title: 'Vérifier la pression des pneus', equipment: 'Véhicule Kia', steps: [{ id: 'st_a', title: 'Afficher la pression', text: 'Appuyer sur le bouton des pages du volant.', media }] } as never)

describe('la consigne de l’illustration', () => {
  it('sans image : rien de joint, le texte de l’étape et l’instruction suffisent', async () => {
    const c = content([])
    await illustrationPrompt({ ask } as unknown as AiApi, null, c.steps[0], { title: c.title, equipment: c.equipment })
    const body = ask.mock.calls[0][1]
    expect(body.files).toBeUndefined()
    expect(body.prompt).toContain('from this text alone (there is no photo)')
    expect(body.prompt).toContain('Vérifier la pression des pneus')
    expect(body.prompt).toContain('Véhicule Kia')
    expect(body.prompt).toContain('Afficher la pression')
  })

  it('avec une image : elle part avec la demande, comme avant', async () => {
    await illustrationPrompt({ ask } as unknown as AiApi, 'https://cdn.test/volant.jpg', content([]).steps[0])
    const body = ask.mock.calls[0][1]
    expect(body.files).toEqual([{ url: 'https://cdn.test/volant.jpg', filename: 'photo.jpg', mimeType: 'image/jpeg' }])
    expect(body.prompt).toContain('from the reference photo')
  })
})

describe('l’assistant illustre aussi une étape sans image', () => {
  it('plus de refus « pas de photo de référence » : l’illustration part du texte', async () => {
    let c = content([])
    const r = await runAgentOps([{ op: 'illustrate', step: 'st_a' }], { ai: { ask, generateImage } as unknown as AiApi, get: () => c, set: (n) => (c = n), focus: () => undefined, log: () => undefined, pause: async () => undefined })
    expect(r).toEqual({ done: 1, failed: 0 })
    expect(generateImage.mock.calls[0][1]).toEqual([])
    expect(c.steps[0].media).toEqual([{ kind: 'image', url: 'https://cdn.test/illustration.png', generated: true }])
  })
})

describe('l’éditeur : les outils de l’IA à découvert', () => {
  const te = () => messages().editor.stepEditor
  function mount(media: Step['media']) {
    const onChange = vi.fn()
    const c = content(media)
    render(<StepMediaEditor content={c} step={c.steps[0]} sources={[]} onChange={onChange} onSourceAdded={() => undefined} />)
    return onChange
  }

  it('une étape sans image : « Illustrer l’étape » et « Schéma de l’étape » se voient sans ouvrir de menu', async () => {
    const onChange = mount([])
    expect(screen.queryByText(messages().editor.stepEditor.aiVisual)).toBeTruthy()
    fireEvent.click(screen.getByText(te().aiIllustrateStep))
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(generateImage.mock.calls[0][1], 'aucune image de référence').toEqual([])
    expect(onChange.mock.calls[0][0].media).toEqual([{ kind: 'image', url: 'https://cdn.test/illustration.png', generated: true }])
  })

  it('l’image affichée sert de référence : « Illustrer cette image »', async () => {
    const onChange = mount([{ kind: 'image', url: 'https://cdn.test/volant.jpg' }])
    fireEvent.click(screen.getByText(te().aiIllustrateImage))
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(generateImage.mock.calls[0][1]).toEqual(['https://cdn.test/volant.jpg'])
    expect(screen.queryByText(te().aiIllustrateStep)).toBeNull()
  })
})
