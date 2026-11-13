import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/toggles', () => ({ useToggle: () => true }))
vi.mock('@/components/providers/Session', () => ({ useSession: () => ({ ai: {}, org: { json_data: {} }, files: {} }) }))

import { FormEditor } from '@/components/editor/FormEditor'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'
import type { InstructionContent, Step } from '@/lib/model/types'

/** Un téléphone : aucune requête « grand écran » ne répond oui. */
function narrowScreen() {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false })) as typeof window.matchMedia
}

const step = (id: string, title: string, extra: Partial<Step> = {}): Step => ({ id, title, text: `Comment ${title.toLowerCase()}`, keyPoints: [], warning: null, media: [], ...extra })
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
  steps: [step('s1', 'Couper l’alimentation', { warning: { level: 'danger', text: 'Cadenassez' } }), step('s2', 'Retirer le garde'), step('s3', 'Nettoyer les rails')],
}

/** L'éditeur réduit à ce que la fiche reçoit : l'étape choisie, et ce qu'on change. */
function Harness({ onChange, tool }: { onChange: (s: Step) => void; tool: () => void }) {
  const [selected, setSelected] = useState('s1')
  const index = content.steps.findIndex((s) => s.id === selected)
  return (
    <ToastProvider>
      <ConfirmProvider>
        <FormEditor
          content={content}
          step={content.steps[index]}
          index={index}
          sources={[]}
          top={{ title: content.title, status: 'Brouillon', primary: () => null, menu: [], onInfo: vi.fn(), questions: 0, onQuestions: vi.fn(), views: { current: 'form', onChange: vi.fn(), onPreview: vi.fn() } }}
          onAssistant={vi.fn()}
          records
          sections
          onSteps={vi.fn()}
          onChange={onChange}
          onSelect={setSelected}
          onInsertAfter={vi.fn()}
          onAddEnd={vi.fn()}
          onSourceAdded={vi.fn()}
          onMove={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          info={<p>Les champs de l’instruction</p>}
          tools={[{ label: 'Partager (lien et code QR)', onClick: tool }]}
          focus={null}
          startOn="list"
          stationCount={1}
        />
      </ConfirmProvider>
    </ToastProvider>
  )
}

beforeEach(() => {
  narrowScreen()
  // jsdom ne fait pas défiler : la fiche le demande à chaque écran.
  Element.prototype.scrollIntoView = vi.fn()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  // Ni mesure : les champs qui grandissent avec leur texte s'en passent ici.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})
afterEach(cleanup)

describe('la vue « Fiche » au téléphone', () => {
  it('s’ouvre sur la liste : l’instruction en tête, puis chaque étape et ce qui la distingue', () => {
    render(<Harness onChange={vi.fn()} tool={vi.fn()} />)
    const outline = screen.getByRole('navigation', { name: 'Les étapes de l’instruction' })
    expect(within(outline).getByText('L’instruction')).toBeTruthy()
    expect(within(outline).getByText('3 étapes · 1 poste')).toBeTruthy()
    expect(within(outline).getByText('Retirer le garde')).toBeTruthy()
    expect(within(outline).getByText('Danger')).toBeTruthy()
    // Sous le pouce : la vue, et ajouter une étape.
    expect(screen.getByRole('button', { name: 'Changer de vue' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ajouter une étape/ })).toBeTruthy()
  })

  it('une étape touchée s’ouvre en entier, tous ses outils à découvert ; on passe à la suivante et on revient à la liste', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} tool={vi.fn()} />)
    fireEvent.click(screen.getByText('Retirer le garde'))
    expect(screen.getByText('Étape 2 sur 3', { selector: 'p' })).toBeTruthy()
    for (const card of ['Ce qu’il faut faire', 'Média', 'Mise en garde', 'Points clés', 'Relevés', 'Section']) expect(screen.getByRole('heading', { name: card })).toBeTruthy()
    for (const tool of ['Monter l’étape', 'Descendre l’étape', 'Dupliquer l’étape', 'Supprimer l’étape']) expect(screen.getByRole('button', { name: tool })).toBeTruthy()
    // La mise en garde se choisit d'un geste, son texte suit.
    fireEvent.click(screen.getByRole('radio', { name: 'Attention' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 's2', warning: { level: 'caution', text: '' } }))
    fireEvent.click(screen.getByRole('button', { name: 'Étape suivante' }))
    expect(screen.getByText('Étape 3 sur 3', { selector: 'p' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Étape 3 sur 3/ }))
    expect(screen.getByRole('navigation', { name: 'Les étapes de l’instruction' })).toBeTruthy()
  })

  it('l’instruction entière : ses champs, puis ses outils, chacun à un geste', () => {
    const tool = vi.fn()
    render(<Harness onChange={vi.fn()} tool={tool} />)
    fireEvent.click(screen.getByText('L’instruction'))
    expect(screen.getByText('Les champs de l’instruction')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Partager (lien et code QR)' }))
    expect(tool).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Toutes les étapes/ }))
    expect(screen.getByText('Retirer le garde')).toBeTruthy()
  })
})
