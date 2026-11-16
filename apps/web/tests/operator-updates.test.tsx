import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UpdateBanner } from '@/components/player/Player'
import { strings } from '@/components/player/i18n'
import type { DataApi, Doc } from '@/lib/gateway/data'
import { emptyContent } from '@/lib/model/repo'
import { publishInstruction } from '@/lib/model/service'
import type { Instruction, InstructionContent, OrgSettings, Published, Step } from '@/lib/model/types'
import { FRESH_DAYS, isFreshUpdate, markSeen, publishedChanges, seenVersion } from '@/lib/model/updates'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

const step = (id: string, title: string, text = ''): Step => ({ id, title, text, keyPoints: [], warning: null, media: [] })
const content = (steps: Step[], extra: Partial<InstructionContent> = {}): InstructionContent => emptyContent({ title: 'Nettoyer les rails', steps, ...extra })

describe('les mises à jour vues par l’opérateur', () => {
  it('allumées par le serveur ; le repli ne les active jamais', () => {
    expect(DEFAULT_TOGGLES.operatorUpdates).toBe(true)
    expect(FALLBACK_TOGGLES.operatorUpdates).toBe(false)
  })

  it('ce qui a changé depuis la version d’avant : étapes nouvelles, modifiées, retirées, EPI ; rien si rien ne se voit', () => {
    const before = content([step('a', 'Arrêter la machine'), step('b', 'Ouvrir le garde'), step('c', 'Vider le bac')], { ppe: ['gants'] })
    const after = content([step('a', 'Arrêter la machine'), step('b', 'Ouvrir le garde', 'Avec la clé jaune'), step('d', 'Souffler les rails')], { ppe: ['gants', 'lunettes'] })
    expect(publishedChanges(before, after, 3, ' Nouvelle clé ')).toEqual({ from: 3, added: ['d'], modified: ['b'], removed: ['Vider le bac'], ppe: true, note: 'Nouvelle clé' })
    expect(publishedChanges(before, before, 3)).toBeNull()
    // Une première publication n'a rien d'avant.
    expect(publishedChanges(null, after, null)).toBeNull()
  })

  it('signalée jusqu’à ce que l’appareil ouvre la nouvelle version ; un appareil qui ne l’a jamais vue, pendant quelques jours', () => {
    const now = Date.parse('2026-11-16T12:00:00Z')
    const recent = new Date(now - 2 * 86_400_000).toISOString()
    const old = new Date(now - (FRESH_DAYS + 1) * 86_400_000).toISOString()
    expect(isFreshUpdate({ version: 4, publishedAt: old }, 3, now)).toBe(true)
    expect(isFreshUpdate({ version: 4, publishedAt: recent }, 4, now)).toBe(false)
    expect(isFreshUpdate({ version: 4, publishedAt: recent }, null, now)).toBe(true)
    expect(isFreshUpdate({ version: 4, publishedAt: old }, null, now)).toBe(false)
    expect(isFreshUpdate({ version: 1, publishedAt: recent }, null, now)).toBe(false)
    expect(seenVersion('i1')).toBeNull()
    markSeen('i1', 4)
    markSeen('i1', 2)
    expect(seenVersion('i1')).toBe(4)
  })

  it('à la publication, la version publique garde ce qui a changé et la version d’avant', async () => {
    const before = content([step('a', 'Arrêter la machine'), step('b', 'Ouvrir le garde')])
    const after = content([step('a', 'Arrêter la machine'), step('b', 'Ouvrir le garde', 'Avec la clé jaune')])
    const replaced: Published[] = []
    const data = {
      insert: vi.fn(async () => ({ _id: 'v4', json_data: {} })),
      get: vi.fn(async () => ({ _id: 'p1', json_data: {} })),
      replace: vi.fn(async (_type: string, _id: string, doc: Published) => void replaced.push(doc)),
      patch: vi.fn(async () => undefined),
      filter: vi.fn(async () => []),
    } as unknown as DataApi
    const doc: Doc<Instruction> = { _id: 'i1', json_data: { draft: after, publishedVersion: 3, publishedId: 'p1', publishedAt: '2026-11-01T10:00:00.000Z', stationIds: [], number: 'IT-0007', review: { note: 'Nouvelle clé', requestedBy: 'u', requestedByName: 'U', requestedAt: '', approverIds: [] } } as unknown as Instruction }
    await publishInstruction(data, doc, { name: 'Usine' } as OrgSettings, { id: 'u', name: 'U' }, { previous: before })
    expect(replaced[0].changes).toEqual({ from: 3, added: [], modified: ['b'], removed: [], note: 'Nouvelle clé' })
    expect(replaced[0].previous).toEqual({ version: 3, publishedAt: '2026-11-01T10:00:00.000Z', content: before })
  })

  it('le bandeau dit quand et quoi ; d’un toucher, les étapes touchées (chacune ouvre la sienne) et la version précédente', () => {
    const onGoTo = vi.fn()
    const onPrevious = vi.fn()
    const steps = [step('a', 'Arrêter la machine'), step('b', 'Ouvrir le garde'), step('d', 'Souffler les rails')]
    render(<UpdateBanner changes={{ from: 3, added: ['d'], modified: ['b'], removed: ['Vider le bac'], note: 'Nouvelle clé' }} publishedAt="2026-11-12T15:00:00.000Z" steps={steps} t={strings('fr')} previous={3} onGoTo={onGoTo} onPrevious={onPrevious} />)
    expect(screen.getByText('1 étape modifiée · 1 nouvelle · 1 retirée')).toBeTruthy()
    expect(screen.getByText(/Mise à jour le 12 novembre/)).toBeTruthy()
    expect(screen.getByText('Pourquoi : Nouvelle clé')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voir ce qui change' }))
    fireEvent.click(screen.getByRole('button', { name: /Étape 3 · Souffler les rails/ }))
    expect(onGoTo).toHaveBeenCalledWith(2)
    expect(screen.getByText('Retirées : Vider le bac')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Version précédente \(v3\)/ }))
    expect(onPrevious).toHaveBeenCalled()
  })
})
