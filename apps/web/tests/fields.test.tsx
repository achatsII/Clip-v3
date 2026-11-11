import { act, cleanup, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { wantsDictation } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { insertDictation } from '@/lib/media/dictation'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('fenêtre et clavier', () => {
  it('taper dans une fenêtre ne renvoie pas le focus ailleurs (le clavier du téléphone restait fermé)', () => {
    vi.useFakeTimers()
    let type: (v: string) => void = () => undefined
    function Host() {
      const [text, setText] = useState('')
      type = setText
      // onClose écrit sur place, comme partout dans l'app : une nouvelle fonction à chaque rendu.
      return (
        <Modal open onClose={() => setText('')} title="Question">
          <input aria-label="champ" value={text} onChange={(e) => setText(e.target.value)} />
        </Modal>
      )
    }
    const v = render(<Host />)
    act(() => void vi.advanceTimersByTime(50))
    const field = v.getByLabelText('champ')
    expect(document.activeElement).toBe(field)
    for (const value of ['a', 'ab', 'abc']) {
      act(() => type(value))
      act(() => void vi.advanceTimersByTime(50))
      expect(document.activeElement).toBe(field)
    }
  })

  it('à l’ouverture, le focus va au premier champ, jamais au bouton « Fermer »', () => {
    vi.useFakeTimers()
    const v = render(
      <Modal open onClose={() => undefined} title="Note">
        <textarea aria-label="note" />
      </Modal>,
    )
    act(() => void vi.advanceTimersByTime(50))
    expect(document.activeElement).toBe(v.getByLabelText('note'))
  })
})

describe('dictée dans les champs', () => {
  it('un micro sur chaque champ de texte, jamais sur courriel, mot de passe ou nombre', () => {
    expect(wantsDictation({})).toBe(true)
    expect(wantsDictation({ type: 'search' })).toBe(true)
    expect(wantsDictation({ type: 'email' })).toBe(false)
    expect(wantsDictation({ type: 'password' })).toBe(false)
    expect(wantsDictation({ type: 'number' })).toBe(false)
    expect(wantsDictation({ inputMode: 'decimal' })).toBe(false)
    expect(wantsDictation({ readOnly: true })).toBe(false)
    expect(wantsDictation({ type: 'email' }, true)).toBe(true)
  })

  it('le texte dicté s’ajoute au champ comme si on l’avait tapé (onChange, puis onBlur qui enregistre)', () => {
    const saved: string[] = []
    function Host() {
      const [text, setText] = useState('Serrer')
      return <input aria-label="étape" value={text} onChange={(e) => setText(e.target.value)} onBlur={(e) => saved.push(e.target.value)} />
    }
    const v = render(<Host />)
    const field = v.getByLabelText('étape') as HTMLInputElement
    act(() => insertDictation(field, 'à 25 newtons-mètres\n'))
    expect(field.value).toBe('Serrer à 25 newtons-mètres')
    expect(saved).toEqual(['Serrer à 25 newtons-mètres'])
  })
})
