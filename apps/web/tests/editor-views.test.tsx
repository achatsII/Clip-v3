import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ViewMenu, ViewSwitch } from '@/components/editor/EditorBar'
import { ToolsGrid } from '@/components/editor/FormParts'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'
import { EDITOR_VIEWS_SEEN, editorViewOf, parseEditorView } from '@/lib/ui/editorView'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('les façons de modifier une instruction', () => {
  it('sans choix : la fiche au bureau, l’étape comme au poste au téléphone ; le choix de l’appareil l’emporte', () => {
    expect(editorViewOf(null, true, true)).toBe('form')
    expect(editorViewOf(null, false, true)).toBe('stage')
    expect(editorViewOf('stage', true, true)).toBe('stage')
    expect(editorViewOf('form', false, true)).toBe('form')
    // Une valeur inconnue (une autre version, un essai) ne casse rien : la vue par défaut.
    expect(parseEditorView('grille')).toBeNull()
    expect(editorViewOf('grille', true, true)).toBe('form')
  })

  it('toggle coupé : une seule façon de modifier, comme avant ; le repli n’active jamais la nouvelle', () => {
    expect(editorViewOf('form', true, false)).toBe('stage')
    expect(DEFAULT_TOGGLES.editorViews).toBe(true)
    expect(FALLBACK_TOGGLES.editorViews).toBe(false)
    expect(FALLBACK_TOGGLES.phoneReader).toBe(false)
  })

  it('au bureau : les deux vues nommées côte à côte, celle en cours cochée, et l’aperçu à part', () => {
    const onChange = vi.fn()
    const onPreview = vi.fn()
    render(<ViewSwitch views={{ current: 'stage', onChange, onPreview }} />)
    const stage = screen.getByRole('radio', { name: /Comme au poste/ })
    const form = screen.getByRole('radio', { name: /Fiche/ })
    expect(stage.getAttribute('aria-checked')).toBe('true')
    expect(form.getAttribute('aria-checked')).toBe('false')
    // Toucher la vue en cours ne fait rien ; l'autre change de vue.
    fireEvent.click(stage)
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(form)
    expect(onChange).toHaveBeenCalledWith('form')
    fireEvent.click(screen.getByRole('button', { name: /Aperçu/ }))
    expect(onPreview).toHaveBeenCalled()
  })

  it('serré (assistant ouvert) : les icônes seules, toujours nommées pour qui ne voit pas l’écran', () => {
    render(<ViewSwitch compact views={{ current: 'form', onChange: vi.fn(), onPreview: vi.fn() }} />)
    expect(screen.getByRole('radio', { name: 'Fiche' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByText('Comme au poste')).toBeNull()
    expect(screen.getByRole('button', { name: 'Aperçu' })).toBeTruthy()
  })

  it('au téléphone : un bouton discret, annoncé par un point jusqu’à la première ouverture, qui explique chaque vue', () => {
    const onChange = vi.fn()
    const onPreview = vi.fn()
    const { container } = render(<ViewMenu views={{ current: 'stage', onChange, onPreview }} />)
    expect(container.querySelector('.rounded-full.bg-\\[var\\(--primary\\)\\]')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Changer de vue' }))
    expect(localStorage.getItem(EDITOR_VIEWS_SEEN)).toBe('1')
    const stage = screen.getByRole('menuitemradio', { name: /Comme au poste/ })
    expect(stage.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('Toutes les étapes, et tous les outils de celle qu’on choisit.')).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Fiche/ }))
    expect(onChange).toHaveBeenCalledWith('form')
    fireEvent.click(screen.getByRole('button', { name: 'Changer de vue' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Aperçu/ }))
    expect(onPreview).toHaveBeenCalled()
    // Ouvert une fois : le point s'éteint.
    expect(container.querySelector('.rounded-full.bg-\\[var\\(--primary\\)\\]')).toBeNull()
  })

  it('les outils de l’instruction, à découvert : ceux qui ne s’appliquent pas manquent, archiver vient à part', () => {
    const share = vi.fn()
    render(
      <ToolsGrid
        items={[
          { label: 'Partager', onClick: share },
          { label: 'Traduire', onClick: vi.fn(), hidden: true },
          { label: 'Historique', onClick: vi.fn(), divider: true },
          { label: 'Archiver', onClick: vi.fn(), danger: true, divider: true },
        ]}
      />,
    )
    expect(screen.queryByText('Traduire')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Partager' }))
    expect(share).toHaveBeenCalled()
    const archive = screen.getByRole('button', { name: 'Archiver' })
    const history = screen.getByRole('button', { name: 'Historique' })
    // Les outils ensemble ; ce qui détruit, dans sa propre rangée.
    expect(history.parentElement).toBe(screen.getByRole('button', { name: 'Partager' }).parentElement)
    expect(archive.parentElement).not.toBe(history.parentElement)
  })
})
