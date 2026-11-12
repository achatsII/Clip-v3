import { describe, expect, it } from 'vitest'
import { changeKey, UndoStack } from '@/lib/history/undo'
import type { InstructionContent, Step } from '@/lib/model/types'

const step = (id: string, title = id): Step => ({ id, title, text: '', keyPoints: [], warning: null, media: [] })
const content = (steps: Step[], title = 'Changer la matrice'): InstructionContent =>
  ({ title, summary: '', kind: 'procedure', category: 'production', tags: [], ppe: [], tools: [], safety: [], steps, lockout: null, language: 'fr' }) as InstructionContent

describe('annuler et rétablir', () => {
  it('annule la dernière modification, puis la rétablit', () => {
    const s = new UndoStack<string>()
    s.record('a', 'title', 0)
    expect(s.canUndo).toBe(true)
    expect(s.undo('b')).toBe('a')
    expect(s.canUndo).toBe(false)
    expect(s.redo('a')).toBe('b')
    expect(s.undo('b')).toBe('a')
  })

  it('les frappes rapprochées dans un même champ forment un seul pas ; un autre champ, un autre pas', () => {
    const s = new UndoStack<string>({ mergeMs: 1000, groupMs: 4000 })
    s.record('', 'title', 0)
    s.record('M', 'title', 300)
    s.record('Ma', 'title', 600)
    s.record('Mat', 'st_1', 900)
    // Deux pas : le titre tapé d'un coup, puis l'étape.
    expect(s.undo('Mat!')).toBe('Mat')
    expect(s.undo('Mat')).toBe('')
    expect(s.canUndo).toBe(false)
  })

  it('une pause, ou un pas trop long, commence un nouveau pas', () => {
    const s = new UndoStack<string>({ mergeMs: 1000, groupMs: 4000 })
    s.record('a', 'title', 0)
    s.record('b', 'title', 2500)
    expect(s.undo('c')).toBe('b')
    const long = new UndoStack<string>({ mergeMs: 1000, groupMs: 4000 })
    for (let t = 0; t <= 5000; t += 500) long.record(`v${t}`, 'title', t)
    expect(long.undo('fin')).toBe('v4000')
    expect(long.undo('v4000')).toBe('v0')
  })

  it('un passage de l’assistant est un seul pas, et rien ne s’annule pendant qu’il travaille', () => {
    const s = new UndoStack<string>()
    s.record('avant', 'title', 0)
    s.begin('avant-assistant')
    expect(s.canUndo).toBe(false)
    expect(s.undo('x')).toBeNull()
    s.record('op1', 'st_1', 10)
    s.record('op2', 'st_2', 20)
    s.end()
    expect(s.undo('après')).toBe('avant-assistant')
    expect(s.undo('avant-assistant')).toBe('avant')
  })

  it('modifier après avoir annulé efface ce qu’on pouvait rétablir', () => {
    const s = new UndoStack<string>()
    s.record('a', 'title', 0)
    s.undo('b')
    expect(s.canRedo).toBe(true)
    s.record('a', 'title', 5000)
    expect(s.canRedo).toBe(false)
  })

  it('garde au plus tant de pas, et repart de zéro quand le brouillon vient d’ailleurs', () => {
    const s = new UndoStack<number>({ limit: 3 })
    for (let i = 0; i < 6; i++) s.record(i, `k${i}`, i * 10_000)
    expect([s.undo(6), s.undo(5), s.undo(4), s.undo(3)]).toEqual([5, 4, 3, null])
    s.record(1, 'k', 100_000)
    s.reset()
    expect(s.canUndo || s.canRedo).toBe(false)
  })

  it('nomme ce qui change : l’étape touchée, le champ, ou la liste des étapes', () => {
    const a = content([step('s1'), step('s2')])
    expect(changeKey(a, { ...a, title: 'Autre' })).toBe('title')
    expect(changeKey(a, { ...a, steps: [a.steps[0], { ...a.steps[1], text: 'x' }] })).toBe('s2')
    expect(changeKey(a, { ...a, steps: [...a.steps, step('s3')] })).toBe('steps')
    expect(changeKey(a, { ...a, steps: [a.steps[1], a.steps[0]] })).toBe('steps')
  })
})
