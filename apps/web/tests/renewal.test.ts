import { describe, expect, it } from 'vitest'
import { addMonths, DEFAULT_RENEWAL_MONTHS, needsRenewal, renewalFrom, renewalMonthsOf, renewalState } from '@/lib/model/renewal'

const day = 86_400_000
const now = Date.parse('2026-11-13T12:00:00Z')
const published = (dueInDays: number | null) => ({ publishedVersion: 2, status: 'published' as const, renewal: { months: 12, dueAt: dueInDays === null ? null : new Date(now + dueInDays * day).toISOString() } })

describe('la relecture périodique', () => {
  it('tombe N mois plus tard, au dernier jour du mois s’il est plus court', () => {
    expect(addMonths('2026-01-31T10:00:00.000Z', 1)).toBe('2026-02-28T10:00:00.000Z')
    expect(addMonths('2026-11-13T12:00:00.000Z', 12)).toBe('2027-11-13T12:00:00.000Z')
    expect(renewalFrom(6, '2026-11-13T12:00:00.000Z', 'Mélanie')).toEqual({ months: 6, dueAt: '2027-05-13T12:00:00.000Z', lastAt: '2026-11-13T12:00:00.000Z', lastByName: 'Mélanie' })
    expect(renewalFrom(null, '2026-11-13T12:00:00.000Z', 'Mélanie').dueAt).toBeNull()
  })

  it('se rappelle un mois avant, puis en retard ; rien sans échéance ni publication', () => {
    expect(renewalState(published(60), now)).toBe('ok')
    expect(renewalState(published(20), now)).toBe('soon')
    expect(renewalState(published(-1), now)).toBe('late')
    expect(renewalState(published(null), now)).toBe('none')
    expect(renewalState({ ...published(-1), publishedVersion: null }, now)).toBe('none')
    expect(renewalState({ ...published(-1), status: 'archived' }, now)).toBe('none')
    expect([60, 20, -1].map((d) => needsRenewal(published(d), now))).toEqual([false, true, true])
  })

  it('prend la période de l’instruction, sinon celle de l’usine, sinon chaque année', () => {
    expect(renewalMonthsOf({ renewal: { months: 6, dueAt: null } }, { renewalMonths: 24 })).toBe(6)
    expect(renewalMonthsOf({ renewal: { months: null, dueAt: null } }, { renewalMonths: 24 })).toBeNull()
    expect(renewalMonthsOf({}, { renewalMonths: 24 })).toBe(24)
    expect(renewalMonthsOf({}, { renewalMonths: null })).toBeNull()
    expect(renewalMonthsOf({}, {})).toBe(DEFAULT_RENEWAL_MONTHS)
  })
})
