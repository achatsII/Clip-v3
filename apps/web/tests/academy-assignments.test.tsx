/**
 * L'Académie, simple : dire qui doit être formé à quel poste et pour quand ; « À faire » suit chacun,
 * la plus pressée d'abord ; une formation en retard paraît dans « À voir » ; la matrice ne met en
 * avant que ce qui est attendu ; le parcours d'un poste compte aussi ses instructions par règle.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const insertMany = vi.hoisted(() => vi.fn(async (_t: string, items: unknown[]) => items.map((json_data, i) => ({ _id: `a${i}`, json_data }))))
vi.mock('@/components/providers/Session', () => ({ useSession: () => ({ data: { insertMany }, profile: { userId: 'mel' }, displayName: 'Mélanie' }) }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => toast }))
vi.mock('@tanstack/react-query', async (importOriginal) => ({ ...(await importOriginal<typeof import('@tanstack/react-query')>()), useQueryClient: () => ({ invalidateQueries: vi.fn(async () => undefined) }) }))

import { AcademyGuide } from '@/components/team/AcademyGuide'
import { AcademyTodo } from '@/components/team/AcademyTodo'
import { AssignDialog } from '@/components/team/AssignDialog'
import type { Doc } from '@/lib/gateway/data'
import type { Standing } from '@/lib/model/academy'
import { assignTraining, dueState, latestAssignments, lateTrainings, removeAssignment, requiredOf, todoList } from '@/lib/model/assignments'
import { buildInbox } from '@/lib/model/inbox'
import { buildMatrix } from '@/lib/model/training'
import type { Assignment, Instruction, Operator, Station, Training } from '@/lib/model/types'

// Le guide se retient sur l'appareil : chaque test repart de zéro, en français (la langue des tests).
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('clip_pref_ui_lang', 'fr')
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const NOW = Date.parse('2026-11-16T15:00:00Z')
const op = (id: string, stationIds: string[] = [], active = true): Doc<Operator> => ({ _id: id, json_data: { name: id[0].toUpperCase() + id.slice(1), stationIds, active, createdAt: '2026-01-01T00:00:00Z' } })
const a = (opId: string, st: string, at: string, over: Partial<Assignment> = {}): Doc<Assignment> => ({ _id: `${opId}-${st}-${at}`, json_data: { operatorId: opId, operatorName: opId, stationId: st, stationName: `Poste ${st}`, due: null, byId: 'mel', byName: 'Mélanie', at, ...over } })
const standing = (level: Standing['level'], done = 0, required = 2): Standing => ({ level, current: null, dueSoon: false, done, required, retrain: false })

describe('qui doit être formé', () => {
  it('la plus récente affectation fait foi ; retirée, elle ne compte plus ; un poste habituel compte toujours', () => {
    const latest = latestAssignments([a('kev', 'p12', '2026-11-01T00:00:00Z', { due: '2026-11-30' }), a('kev', 'p12', '2026-11-10T00:00:00Z', { due: '2026-12-15' }), a('ana', 'p12', '2026-11-01T00:00:00Z'), a('ana', 'p12', '2026-11-05T00:00:00Z', { removed: true })])
    expect(latest.get('kev:p12')?.due).toBe('2026-12-15')
    expect(latest.has('ana:p12')).toBe(false)
    expect(requiredOf(op('kev'), 'p12', latest)).toBe('assigned')
    expect(requiredOf(op('ana', ['p12']), 'p12', latest)).toBe('usual')
    expect(requiredOf(op('ana'), 'p12', latest)).toBeNull()
  })

  it('une échéance : en retard, dans la semaine, plus tard, ou aucune', () => {
    expect(dueState('2026-11-15', NOW)).toBe('overdue')
    expect(dueState('2026-11-16', NOW)).toBe('soon')
    expect(dueState('2026-11-20', NOW)).toBe('soon')
    expect(dueState('2026-12-20', NOW)).toBe('later')
    expect(dueState(null, NOW)).toBe('none')
  })

  it('« À faire » : en retard d’abord, puis par échéance, puis prêts à valider ; ni les qualifiés, ni les absents de l’équipe', () => {
    const latest = latestAssignments([a('kev', 'p12', '2026-11-01T00:00:00Z', { due: '2026-12-20' }), a('ana', 'p12', '2026-11-01T00:00:00Z', { due: '2026-11-10' }), a('bob', 'p12', '2026-11-01T00:00:00Z', { due: '2026-11-18' }), a('zoe', 'p12', '2026-11-01T00:00:00Z'), a('old', 'p12', '2026-11-01T00:00:00Z')])
    const ops = [op('kev'), op('ana'), op('bob'), op('zoe'), op('lea', ['m1']), op('max', ['p12']), op('old', [], false)]
    const levels: Record<string, Standing> = { 'zoe:p12': standing('learning', 2, 2), 'max:p12': standing('qualified', 2, 2), 'lea:m1': standing('expired', 0, 0) }
    const list = todoList(ops, [{ id: 'p12', name: 'Presse P-12' }, { id: 'm1', name: 'Moule M-1' }], latest, (o, s) => levels[`${o}:${s}`] ?? standing('none'), NOW)
    expect(list.map((x) => `${x.operator._id}:${x.station.id}`)).toEqual(['ana:p12', 'bob:p12', 'kev:p12', 'zoe:p12', 'lea:m1'])
    expect(list[0]).toMatchObject({ dueState: 'overdue', reason: 'assigned' })
    expect(list[3]).toMatchObject({ ready: true, due: null })
    expect(list[4]).toMatchObject({ reason: 'usual', standing: { level: 'expired' } })
  })

  it('envoyer se former s’écrit au journal ; retirer aussi (la trace reste)', async () => {
    const data = { insertMany: vi.fn(async () => []), insert: vi.fn(async () => ({ _id: 'x', json_data: {} })) }
    await assignTraining(data as never, [{ id: 'kev', name: 'Kevin' }], { id: 'p12', name: 'Presse P-12' }, '2026-12-15', { id: 'mel', name: 'Mélanie' }, '2026-11-16T15:00:00Z')
    expect(data.insertMany).toHaveBeenCalledWith('clip_assignment', [{ operatorId: 'kev', operatorName: 'Kevin', stationId: 'p12', stationName: 'Presse P-12', due: '2026-12-15', byId: 'mel', byName: 'Mélanie', at: '2026-11-16T15:00:00Z' }], 'Presse P-12')
    await removeAssignment(data as never, a('kev', 'p12', '2026-11-16T15:00:00Z').json_data, { id: 'mel', name: 'Mélanie' }, '2026-11-17T09:00:00Z')
    expect(data.insert).toHaveBeenCalledWith('clip_assignment', expect.objectContaining({ removed: true, at: '2026-11-17T09:00:00Z' }), 'Poste p12')
  })
})

describe('les formations en retard, dans « À voir »', () => {
  it('l’échéance passée, pas qualifiée, encore dans l’équipe ; à qui valide seulement', () => {
    const latest = latestAssignments([a('kev', 'p12', '2026-11-01T00:00:00Z', { due: '2026-11-10', operatorName: 'Kevin', stationName: 'Presse P-12' }), a('ana', 'p12', '2026-11-01T00:00:00Z', { due: '2026-11-10' }), a('bob', 'p12', '2026-11-01T00:00:00Z', { due: '2026-12-10' }), a('old', 'p12', '2026-11-01T00:00:00Z', { due: '2026-11-10' })])
    const late = lateTrainings(latest, (o) => o === 'ana', [op('kev'), op('ana'), op('bob'), op('old', [], false)], NOW)
    expect(late).toEqual([{ operatorId: 'kev', operatorName: 'Kevin', stationId: 'p12', stationName: 'Presse P-12', due: '2026-11-10' }])
    const base = { userId: 'mel', instructions: [], feedback: [], executions: [], groups: [], late }
    expect(buildInbox({ ...base, can: { approve: true, feedback: false } })).toMatchObject([{ kind: 'lateTraining', title: 'Kevin', text: 'Presse P-12 : formation prévue d’ici le 10 novembre 2026', href: '/equipe?vue=competences&q=Kevin' }])
    expect(buildInbox({ ...base, can: { approve: false, feedback: false } })).toEqual([])
  })
})

describe('le parcours d’un poste', () => {
  it('compte aussi les instructions qui y vont par leur règle (nomenclature)', () => {
    const instr = (id: string, stationIds: string[], ruleStationIds: string[]): Doc<Instruction> => ({ _id: id, json_data: { title: id, stationIds, ruleStationIds, publishedVersion: 1, publishedQuiz: 3, status: 'published' } as unknown as Instruction })
    const stations: Array<Doc<Station>> = [{ _id: 'p12', json_data: { name: 'Presse P-12' } as Station }]
    const m = buildMatrix([op('kev')], stations, [instr('i1', ['p12'], []), instr('i2', [], ['p12'])], [] as Array<Doc<Training>>)
    expect(m.cells.kev.p12.required.map((r) => r.id)).toEqual(['i1', 'i2'])
  })
})

describe('les écrans', () => {
  it('« À faire » : où en est chacun, son échéance, et « Valider » quand il ne reste que le terrain', () => {
    const onOpen = vi.fn()
    const kev = op('kev')
    render(
      <AcademyTodo
        items={[
          { operator: kev, station: { id: 'p12', name: 'Presse P-12' }, standing: standing('learning', 1, 3), reason: 'assigned', due: '2026-11-10', dueState: 'overdue', ready: false },
          { operator: op('zoe'), station: { id: 'p12', name: 'Presse P-12' }, standing: standing('learning', 2, 2), reason: 'usual', due: null, dueState: 'none', ready: true },
        ]}
        onOpen={onOpen}
      />,
    )
    expect(screen.getByText('1 instruction sur 3 répondue')).toBeTruthy()
    expect(screen.getByText('En retard : prévu le 10 novembre 2026')).toBeTruthy()
    expect(screen.getByText('Prêt à valider')).toBeTruthy()
    expect(screen.getByText('Poste habituel')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Zoe/ }))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ ready: true }))
    cleanup()
    render(<AcademyTodo items={[]} onOpen={onOpen} />)
    expect(screen.getByText('Personne à former')).toBeTruthy()
  })

  it('« Former quelqu’un » : un poste, des personnes, une date', async () => {
    const onClose = vi.fn()
    render(<AssignDialog open onClose={onClose} stations={[{ id: 'p12', name: 'Presse P-12' }]} operators={[op('kev'), op('ana')]} standing={() => standing('none')} />)
    fireEvent.change(screen.getByLabelText('Au poste'), { target: { value: 'p12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kev' }))
    fireEvent.change(screen.getByLabelText('D’ici le'), { target: { value: '2026-12-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Former cette personne' }))
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(insertMany).toHaveBeenCalledWith('clip_assignment', [expect.objectContaining({ operatorId: 'kev', stationId: 'p12', stationName: 'Presse P-12', due: '2026-12-15', byName: 'Mélanie' })], 'Presse P-12')
    expect(toast.success).toHaveBeenCalledWith('1 personne à former au poste Presse P-12', expect.any(String))
  })

  it('le guide dit où l’usine en est, se replie d’un toucher et se rouvre', () => {
    const onPaths = vi.fn()
    render(<AcademyGuide withQuestions={4} toTrain={0} signed={0} onPaths={onPaths} />)
    expect(screen.getByText('4 instructions ont des questions')).toBeTruthy()
    expect(screen.getByText('Personne à former pour l’instant')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voir les parcours' }))
    expect(onPaths).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Compris' }))
    expect(screen.queryByText('L’Académie en trois gestes')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Comment ça marche/ }))
    expect(screen.getByText('L’Académie en trois gestes')).toBeTruthy()
  })
})
