import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyOp } from '@/lib/ai/agent'
import { normalizeInstruction } from '@/lib/ai/normalize'
import { contentSegments } from '@/lib/ai/translate'
import { ApiError } from '@/lib/gateway/client'
import { dataApi } from '@/lib/gateway/data'
import { messages } from '@/lib/i18n'
import { blocks, cleanChecks, firstIncomplete, parseNumber, stepComplete, verdict, type Answers } from '@/lib/model/checks'
import { answerLimits, answerValue, buildExecution, flushExecutions, listExecutions, pendingExecutions, saveExecution } from '@/lib/model/executions'
import { emptyContent } from '@/lib/model/repo'
import { localized } from '@/lib/model/translation'
import type { Check, InstructionContent } from '@/lib/model/types'
import { fakeGateway } from './fakeClient'

const pressure: Check = { id: 'ck_p', kind: 'measure', label: 'Pression du circuit', unit: 'bar', min: 4.5, max: 5.5 }
const seal: Check = { id: 'ck_s', kind: 'yesno', label: 'Joint en place', expected: 'yes' }
const filter: Check = { id: 'ck_f', kind: 'choice', label: 'État du filtre', options: [{ id: 'o1', label: 'Propre' }, { id: 'o2', label: 'Sale', bad: true }] }
const lot: Check = { id: 'ck_l', kind: 'text', label: 'Numéro de lot', optional: true }

const content = (): InstructionContent =>
  emptyContent({
    title: 'Purger le circuit',
    steps: [
      { id: 'st_1', title: 'Lire la pression', text: 'Au manomètre.', media: [], checks: [pressure] },
      { id: 'st_2', title: 'Remonter le carter', text: 'Quatre vis.', media: [] },
      { id: 'st_3', title: 'Vérifier', text: 'Le joint et le filtre.', media: [], checks: [seal, filter, lot] },
    ],
  })

describe('les relevés : juger une réponse', () => {
  it('lit un nombre tapé à la québécoise, et refuse ce qui n’en est pas un', () => {
    expect(parseNumber('4,5')).toBe(4.5)
    expect(parseNumber(' 1 200 ')).toBe(1200)
    expect(parseNumber('-2')).toBe(-2)
    expect(parseNumber(',5')).toBe(0.5)
    for (const bad of ['', 'abc', '4,5,6', '4.5 bar', '--1']) expect(parseNumber(bad)).toBeNull()
  })

  it('juge une mesure par ses limites, une seule limite suffit, sans limite rien n’est jugé', () => {
    expect(verdict(pressure, 5)).toBe(true)
    expect(verdict(pressure, 4.5)).toBe(true)
    expect(verdict(pressure, 5.51)).toBe(false)
    expect(verdict({ ...pressure, max: null }, 99)).toBe(true)
    expect(verdict({ ...pressure, max: null }, 4)).toBe(false)
    expect(verdict({ ...pressure, min: null, max: null }, 99)).toBeNull()
    expect(verdict(pressure, null)).toBeNull()
  })

  it('juge un oui ou non sur la bonne réponse, et un choix sur ses écarts', () => {
    expect(verdict(seal, true)).toBe(true)
    expect(verdict(seal, false)).toBe(false)
    expect(verdict({ ...seal, expected: null }, false)).toBeNull()
    expect(verdict(filter, 'o1')).toBe(true)
    expect(verdict(filter, 'o2')).toBe(false)
    expect(verdict(filter, 'inconnu')).toBeNull()
  })

  it('ne laisse pas passer une réponse manquante, ni un écart sans note ; le facultatif passe', () => {
    expect(blocks(pressure, undefined)).toBe(true)
    expect(blocks(pressure, { value: 5 })).toBe(false)
    expect(blocks(pressure, { value: 7 })).toBe(true)
    expect(blocks(pressure, { value: 7, note: '  ' })).toBe(true)
    expect(blocks(pressure, { value: 7, note: 'Averti Luc' })).toBe(false)
    expect(blocks(lot, undefined)).toBe(false)
  })

  it('arrête la progression à la première étape incomplète', () => {
    const c = content()
    const answers: Answers = { ck_p: { value: 5 } }
    expect(stepComplete(c.steps[0], answers)).toBe(true)
    expect(firstIncomplete(c.steps, answers)).toBe(2)
    expect(firstIncomplete(c.steps, answers, 2)).toBe(-1)
    expect(firstIncomplete(c.steps, { ...answers, ck_s: { value: true }, ck_f: { value: 'o2' } })).toBe(2)
    expect(firstIncomplete(c.steps, { ...answers, ck_s: { value: true }, ck_f: { value: 'o2', note: 'Changé' } })).toBe(-1)
  })
})

describe('les relevés proposés par l’IA ou l’éditeur', () => {
  it('sont rendus sûrs : nombres lus, limites remises dans l’ordre, choix d’écart nommés', () => {
    const out = cleanChecks([
      { kind: 'measure', label: '  Couple   de serrage ', unit: 'N·m', min: '45', max: '40,5', target: '' },
      { kind: 'yesno', label: 'Fuite absente', expected: 'none' },
      { kind: 'choice', label: 'Courroie', options: ['Bonne', 'Usée', 'bonne'], bad: ['Usée'] },
      { kind: 'choice', label: 'Un seul choix', options: ['Seul'] },
      { kind: 'sonde', label: 'Inconnu' },
      { kind: 'photo', label: '' },
    ])
    expect(out).toHaveLength(3)
    expect(out[0]).toMatchObject({ kind: 'measure', label: 'Couple de serrage', unit: 'N·m', min: 40.5, max: 45 })
    expect(out[0]).not.toHaveProperty('target')
    expect(out[1]).not.toHaveProperty('expected')
    expect(out[2].options?.map((o) => [o.label, !!o.bad])).toEqual([
      ['Bonne', false],
      ['Usée', true],
    ])
  })

  it('arrivent avec l’étape générée, deux au plus', () => {
    const { content: c } = normalizeInstruction(
      {
        title: 'Purger',
        steps: [{ title: 'Lire la pression', text: 'Au manomètre.', checks: [{ kind: 'measure', label: 'Pression', unit: 'bar', min: '4,5', max: '5,5' }, { kind: 'yesno', label: 'A', expected: 'yes' }, { kind: 'yesno', label: 'B', expected: 'no' }] }],
      },
      [],
    )
    expect(c.steps[0].checks?.map((x) => x.label)).toEqual(['Pression', 'A'])
    expect(c.steps[0].checks?.[0]).toMatchObject({ min: 4.5, max: 5.5 })
  })

  it('l’assistant remplace la liste d’une étape et garde l’id d’un relevé gardé', () => {
    const ids = new Map<string, string>()
    const r = applyOp(content(), { op: 'set_checks', step: 'st_1', checks: [{ kind: 'measure', label: 'pression du circuit', unit: 'bar', min: '4', max: '6' }, { kind: 'photo', label: 'Photo du manomètre' }] }, ids)
    const checks = r.content.steps[0].checks!
    expect(checks[0]).toMatchObject({ id: 'ck_p', min: 4, max: 6 })
    expect(checks[1].kind).toBe('photo')
    const cleared = applyOp(r.content, { op: 'set_checks', step: 'st_1', checks: [] }, ids).content
    expect(cleared.steps[0]).not.toHaveProperty('checks')
  })
})

describe('la traduction des relevés', () => {
  it('envoie les libellés et les choix, jamais les unités ; l’opérateur les lit dans sa langue', () => {
    const c = content()
    const ids = contentSegments(c).segments.map((s) => s.id)
    expect(ids).toEqual(expect.arrayContaining(['check:st_1:ck_p', 'check:st_3:ck_f', 'check:st_3:ck_f:o2']))
    expect(ids.some((id) => id.endsWith(':unit'))).toBe(false)
    const tr: InstructionContent = { ...c, translations: { en: { title: 'Purge', summary: '', safety: [], steps: [{ id: 'st_3', title: '', text: '', checks: [{ id: 'ck_f', label: 'Filter condition', options: { o2: 'Dirty' } }] }] } } }
    const en = localized(tr, 'en')
    const f = en.steps[2].checks!.find((x) => x.id === 'ck_f')!
    expect(f.label).toBe('Filter condition')
    expect(f.options?.map((o) => o.label)).toEqual(['Propre', 'Dirty'])
    // Les ids et les écarts ne bougent pas : une réponse en anglais se juge pareil.
    expect(f.options?.[1]).toMatchObject({ id: 'o2', bad: true })
  })
})

describe('la trace du travail fait', () => {
  const meta = { instructionId: 'i1', version: 3, stationId: 's1', source: 'kiosk' as const, startedAt: '2026-11-13T08:00:00Z', language: 'en', deviceId: 'tab-1', operatorId: 'op1', operatorName: 'Julie' }

  it('garde les libellés d’origine, le choix par son nom, les écarts et leurs notes', () => {
    const e = buildExecution(content(), { ck_p: { value: 6.1, note: '  Averti Luc ' }, ck_s: { value: true }, ck_f: { value: 'o2', note: 'Changé' } }, meta)
    expect(e.instructionTitle).toBe('Purger le circuit')
    expect(e.answers.map((a) => [a.label, a.value, a.ok])).toEqual([
      ['Pression du circuit', 6.1, false],
      ['Joint en place', true, true],
      ['État du filtre', 'Sale', false],
    ])
    expect(e.answers[0]).toMatchObject({ note: 'Averti Luc', unit: 'bar', min: 4.5, max: 5.5, stepTitle: 'Lire la pression' })
    expect(e.deviations).toBe(2)
    // Le numéro de lot, facultatif et vide, n'y est pas.
    expect(e.answers.some((a) => a.checkId === 'ck_l')).toBe(false)
  })

  it('se lit dans la langue de l’outil', () => {
    const t = messages().records
    const e = buildExecution(content(), { ck_p: { value: 4.8 }, ck_s: { value: false } }, meta)
    expect(answerValue(e.answers[0], t)).toBe('4,8 bar')
    expect(answerLimits(e.answers[0], t)).toBe('entre 4,5 et 5,5 bar')
    expect(answerValue(e.answers[1], t)).toBe('Non')
    expect(answerLimits(e.answers[1], t)).toBeNull()
  })

  describe('sans réseau', () => {
    beforeEach(() => localStorage.clear())
    afterEach(() => localStorage.clear())

    it('attend dans l’appareil, puis part à la reprise ; ce qui échoue encore reste', async () => {
      const e = buildExecution(content(), { ck_p: { value: 5 } }, meta)
      const down = fakeGateway(() => new ApiError('hors ligne', 0, null))
      expect(await saveExecution(dataApi(down), e)).toBe('queued')
      expect(await saveExecution(dataApi(down), { ...e, finishedAt: '2026-11-13T09:00:00Z' })).toBe('queued')
      expect(pendingExecutions()).toBe(2)

      let n = 0
      const flaky = fakeGateway(() => (++n === 1 ? new ApiError('encore', 500, null) : { results: [{ inserted_id: `x${n}`, json_data: {} }] }))
      expect(await flushExecutions(dataApi(flaky))).toBe(1)
      expect(pendingExecutions()).toBe(1)
      const up = fakeGateway(() => ({ results: [{ inserted_id: 'y', json_data: {} }] }))
      expect(await flushExecutions(dataApi(up))).toBe(1)
      expect(pendingExecutions()).toBe(0)
      expect((up.calls[0].options.body as { json_data: { instructionId: string; app_identifier: string } }).json_data).toMatchObject({ instructionId: 'i1', app_identifier: 'clip-v3' })
    })
  })

  it('le registre filtre par instruction, par écarts et par date, du plus récent au plus ancien', async () => {
    const gw = fakeGateway(() => ({ results: [] }))
    await listExecutions(dataApi(gw), { instructionId: 'i1', deviations: true, since: '2026-11-06T00:00:00Z' })
    const body = gw.calls[0].options.body as { mongo_filter: { $and: unknown[] }; sort: Record<string, number> }
    expect(body.mongo_filter.$and[1]).toEqual({ 'json_data.instructionId': { $eq: 'i1' }, 'json_data.deviations': { $gt: 0 }, 'json_data.finishedAt': { $gte: '2026-11-06T00:00:00Z' } })
    expect(body.sort).toEqual({ 'json_data.finishedAt': -1 })
  })
})
