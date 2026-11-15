import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createPortal } from 'react-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'
import { ownsGesture, swipeDirection, useStepSwipe } from '@/lib/ui/swipe'

afterEach(cleanup)

/** Un glissement du doigt, de (x1, y1) à (x2, y2), commencé sur `el`. */
function swipe(el: Element, [x1, y1]: [number, number], [x2, y2]: [number, number]) {
  fireEvent.touchStart(el, { touches: [{ clientX: x1, clientY: y1 }] })
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: x2, clientY: y2 }] })
}

function Zone({ go, enabled = true }: { go: (d: -1 | 1) => void; enabled?: boolean }) {
  const handlers = useStepSwipe(enabled, go)
  return (
    <div {...handlers}>
      <p>Retirer le garde</p>
      <textarea aria-label="Comment faire" defaultValue="Dévisser les quatre vis." />
      <video data-testid="video" />
      <div data-no-swipe>Rangée de vignettes</div>
      {createPortal(<p>Dans une fenêtre</p>, document.body)}
    </div>
  )
}

describe('le geste', () => {
  it('assez long et nettement de côté : à gauche la suivante, à droite la précédente', () => {
    expect(swipeDirection(-120, 10)).toBe(1)
    expect(swipeDirection(120, -10)).toBe(-1)
    // Trop court, ou trop oblique : un défilement, pas un changement d'étape.
    expect(swipeDirection(-60, 0)).toBe(0)
    expect(swipeDirection(-120, 90)).toBe(0)
  })

  it('appartient à la vidéo, au curseur, à une rangée marquée, ou à ce qui n’est pas dans la zone ; pas à un champ fermé', () => {
    const root = document.createElement('div')
    root.innerHTML = '<p id="t">texte</p><textarea id="i"></textarea><input id="s" type="range" /><video id="v"></video><div data-no-swipe><span id="r">x</span></div>'
    document.body.append(root)
    const $ = (id: string) => root.querySelector(`#${id}`)
    expect(ownsGesture($('t'), root)).toBe(false)
    // Le texte d'une étape, dans l'éditeur, est fait de champs : un doigt qui glisse ne les ouvre pas.
    expect(ownsGesture($('i'), root)).toBe(false)
    expect(ownsGesture($('s'), root)).toBe(true)
    expect(ownsGesture($('v'), root)).toBe(true)
    expect(ownsGesture($('r'), root)).toBe(true)
    expect(ownsGesture(document.body, root)).toBe(true)
    root.remove()
  })
})

describe('dans une zone d’étape', () => {
  it('change d’étape d’un glissement sur le texte', () => {
    const go = vi.fn()
    render(<Zone go={go} />)
    swipe(screen.getByText('Retirer le garde'), [300, 400], [150, 410])
    expect(go).toHaveBeenLastCalledWith(1)
    swipe(screen.getByText('Retirer le garde'), [100, 400], [260, 395])
    expect(go).toHaveBeenLastCalledWith(-1)
    expect(go).toHaveBeenCalledTimes(2)
  })

  it('aussi sur un champ qu’on n’est pas en train d’écrire (le texte de l’étape, dans l’éditeur)', () => {
    const go = vi.fn()
    render(<Zone go={go} />)
    swipe(screen.getByLabelText('Comment faire'), [300, 400], [100, 400])
    expect(go).toHaveBeenCalledWith(1)
  })

  it('jamais depuis une vidéo, une rangée qui défile, ni depuis une fenêtre ouverte par-dessus', () => {
    const go = vi.fn()
    render(<Zone go={go} />)
    for (const el of [screen.getByTestId('video'), screen.getByText('Rangée de vignettes'), screen.getByText('Dans une fenêtre')]) swipe(el, [300, 400], [100, 400])
    expect(go).not.toHaveBeenCalled()
  })

  it('jamais pendant qu’on écrit (clavier ouvert), même en glissant sur le texte', () => {
    const go = vi.fn()
    render(<Zone go={go} />)
    ;(screen.getByLabelText('Comment faire') as HTMLTextAreaElement).focus()
    swipe(screen.getByText('Retirer le garde'), [300, 400], [100, 400])
    swipe(screen.getByLabelText('Comment faire'), [300, 400], [100, 400])
    expect(go).not.toHaveBeenCalled()
  })

  it('un appui long qui glisse (sélectionner du texte) ne change pas d’étape', () => {
    const go = vi.fn()
    render(<Zone go={go} />)
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(1_000)
    fireEvent.touchStart(screen.getByLabelText('Comment faire'), { touches: [{ clientX: 300, clientY: 400 }] })
    now.mockReturnValue(2_200)
    fireEvent.touchEnd(screen.getByLabelText('Comment faire'), { changedTouches: [{ clientX: 100, clientY: 400 }] })
    now.mockRestore()
    expect(go).not.toHaveBeenCalled()
  })

  it('éteint (toggle `editorSwipe` coupé) : rien', () => {
    const go = vi.fn()
    render(<Zone go={go} enabled={false} />)
    swipe(screen.getByText('Retirer le garde'), [300, 400], [100, 400])
    expect(go).not.toHaveBeenCalled()
    expect(DEFAULT_TOGGLES.editorSwipe).toBe(true)
    expect(FALLBACK_TOGGLES.editorSwipe).toBe(false)
  })
})
