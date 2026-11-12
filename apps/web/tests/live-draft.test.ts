import { describe, expect, it } from 'vitest'
import { emptyContent } from '@/lib/model/repo'
import type { Step } from '@/lib/model/types'
import { changedSteps, followStep, remoteDraftAction } from '@/lib/realtime/liveDraft'
import { isRealtimeEvent, refreshFor } from '@/lib/realtime/events'

const step = (id: string, text = 'Texte.'): Step => ({ id, title: `Étape ${id}`, text, keyPoints: [], warning: null, media: [] })

describe('l’édition en direct entre appareils', () => {
  it('annonce les étapes nouvelles ou modifiées, dans l’ordre', () => {
    const before = emptyContent({ steps: [step('a'), step('b'), step('c')] })
    const after = emptyContent({ steps: [step('a'), step('n1'), step('b', 'Autre texte.'), step('c')] })
    expect(changedSteps(before, after)).toEqual(['n1', 'b'])
    expect(changedSteps(after, after)).toEqual([])
  })

  it('ne reprend jamais un brouillon reçu quand on modifie ici aussi', () => {
    expect(remoteDraftAction(true)).toBe('conflict')
    expect(remoteDraftAction(false)).toBe('apply')
  })

  it('va à la première étape changée qui existe encore', () => {
    const c = emptyContent({ steps: [step('a'), step('b')] })
    expect(followStep(['zz', 'b', 'a'], c)).toBe('b')
    expect(followStep([], c)).toBeNull()
    expect(followStep(undefined, c)).toBeNull()
  })

  it('reconnaît une annonce de brouillon, et ne relit que son instruction', () => {
    const e = { type: 'draft', id: 'i1', device: 'app', from: 'tab-1', steps: ['a'], byName: 'Mélanie', userId: 'u1' }
    expect(isRealtimeEvent(e)).toBe(true)
    expect(isRealtimeEvent({ ...e, device: 'tv' })).toBe(false)
    expect(isRealtimeEvent({ ...e, steps: [1] })).toBe(false)
    expect(isRealtimeEvent({ ...e, from: undefined })).toBe(false)
    expect(refreshFor(e as never)).toEqual(['instruction:i1'])
  })
})
