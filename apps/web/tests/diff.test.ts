import { describe, expect, it } from 'vitest'
import { diffSteps, removedSteps, summarizeChanges } from '@/lib/model/diff'
import { emptyContent } from '@/lib/model/repo'
import type { Step } from '@/lib/model/types'

const step = (id: string, title: string): Step => ({ id, title, text: 'x', keyPoints: [], warning: null, media: [] })

describe('diff', () => {
  const before = emptyContent({ title: 'A', steps: [step('1', 'Un'), step('2', 'Deux'), step('3', 'Trois')] })
  const after = emptyContent({ title: 'A', steps: [step('1', 'Un'), { ...step('2', 'Deux'), text: 'changé' }, step('4', 'Quatre')] })

  it('marque les étapes nouvelles, modifiées, identiques et retirées', () => {
    expect(diffSteps(before, after)).toEqual({ '1': 'same', '2': 'modified', '4': 'added' })
    expect(removedSteps(before, after).map((s) => s.id)).toEqual(['3'])
  })

  it('résume les changements en mots', () => {
    expect(summarizeChanges(null, after)).toBe('Première version.')
    expect(summarizeChanges(before, after)).toBe('1 étape modifiée, 1 étape ajoutée, 1 étape retirée.')
    expect(summarizeChanges(before, before)).toBe('Mise en forme.')
  })
})
