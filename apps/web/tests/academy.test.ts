import { describe, expect, it } from 'vitest'
import { dataApi, type Doc } from '@/lib/gateway/data'
import { coverage, dueQualifications, latestQualifications, registerCsv, signOff, standingOf, validUntilOf } from '@/lib/model/academy'
import { buildInbox } from '@/lib/model/inbox'
import { buildAttestationHtml } from '@/lib/pdf/attestationHtml'
import type { MatrixCell } from '@/lib/model/training'
import type { Operator, Qualification } from '@/lib/model/types'
import { fakeGateway } from './fakeClient'

const NOW = Date.parse('2026-11-13T12:00:00Z')
const q = (op: string, st: string, at: string, over: Partial<Qualification> = {}): Doc<Qualification> => ({
  _id: `${op}-${st}-${at}`,
  json_data: { operatorId: op, operatorName: op.toUpperCase(), stationId: st, stationName: `Poste ${st}`, level: 'qualified', trainingsDone: 2, trainingsRequired: 2, byId: 'mel', byName: 'Mélanie', at, validUntil: null, ...over },
})
const cell = (done: number, required: number, outdated = false): MatrixCell => ({
  required: Array.from({ length: required }, (_, i) => ({ id: `i${i}`, title: `I${i}`, state: i < done ? (outdated && i === 0 ? 'outdated' : 'done') : 'missing' })),
  done,
  state: 'partial',
})
const op = (id: string, shift: Operator['shift'], active = true): Doc<Operator> => ({ _id: id, json_data: { name: id.toUpperCase(), shift, stationIds: [], active, createdAt: '2026-01-01T00:00:00Z' } })

describe('l’échéance d’une qualification', () => {
  it('se compte en mois, au dernier jour du mois au besoin ; 0 : sans échéance', () => {
    expect(validUntilOf('2026-03-15T10:00:00.000Z', 12)).toBe('2027-03-15T10:00:00.000Z')
    expect(validUntilOf('2026-01-31T10:00:00.000Z', 1)).toBe('2026-02-28T10:00:00.000Z')
    expect(validUntilOf('2026-08-31T10:00:00.000Z', 6)).toBe('2027-02-28T10:00:00.000Z')
    expect(validUntilOf('2026-03-15T10:00:00.000Z', 0)).toBeNull()
  })
})

describe('où en est une personne à un poste', () => {
  it('la plus récente signature fait foi, même si c’est un retrait', () => {
    const latest = latestQualifications([q('kev', 'p12', '2026-01-01T00:00:00Z', { level: 'trainer' }), q('kev', 'p12', '2026-06-01T00:00:00Z', { level: 'none' }), q('kev', 'm1', '2026-02-01T00:00:00Z')])
    expect(latest.get('kev:p12')?.level).toBe('none')
    expect(standingOf(cell(1, 2), latest.get('kev:p12'), NOW)).toMatchObject({ level: 'learning', current: null })
    expect(standingOf(cell(0, 2), undefined, NOW).level).toBe('none')
    expect(standingOf(undefined, latest.get('kev:m1'), NOW)).toMatchObject({ level: 'qualified', required: 0 })
  })

  it('échue : à revalider ; dans le mois : à revalider bientôt ; une question à refaire se voit', () => {
    expect(standingOf(cell(2, 2), q('a', 'b', '2025-01-01T00:00:00Z', { validUntil: '2026-11-13T11:59:59Z' }).json_data, NOW).level).toBe('expired')
    expect(standingOf(cell(2, 2), q('a', 'b', '2025-12-01T00:00:00Z', { validUntil: '2026-12-10T00:00:00Z' }).json_data, NOW)).toMatchObject({ level: 'qualified', dueSoon: true })
    expect(standingOf(cell(2, 2), q('a', 'b', '2026-06-01T00:00:00Z', { validUntil: '2027-06-01T00:00:00Z', level: 'trainer' }).json_data, NOW)).toMatchObject({ level: 'trainer', dueSoon: false })
    expect(standingOf(cell(2, 2, true), q('a', 'b', '2026-06-01T00:00:00Z').json_data, NOW).retrain).toBe(true)
  })
})

describe('la couverture par quart', () => {
  it('compte les personnes qualifiées de chaque quart : personne, fragile, ou au moins deux', () => {
    const ops = [op('ana', 'jour'), op('ben', 'jour'), op('cam', 'soir'), op('dan', 'soir'), op('eve', null), op('old', 'nuit', false)]
    const levels: Record<string, 'qualified' | 'trainer' | 'none'> = { 'ana:p12': 'trainer', 'ben:p12': 'qualified', 'cam:p12': 'qualified', 'dan:p12': 'none', 'old:p12': 'qualified' }
    const c = coverage(ops, ['p12'], (o, s) => standingOf(undefined, levels[`${o}:${s}`] ? q(o, s, '2026-06-01T00:00:00Z', { level: levels[`${o}:${s}`] }).json_data : undefined, NOW))
    expect(c.shifts).toEqual(['jour', 'soir', 'none'])
    expect(c.cells.p12.jour).toMatchObject({ tone: 'ok', people: [{ id: 'ana', level: 'trainer' }, { id: 'ben', level: 'qualified' }] })
    expect(c.cells.p12.soir).toMatchObject({ tone: 'fragile', people: [{ id: 'cam' }] })
    expect(c.cells.p12.none).toMatchObject({ tone: 'none', people: [] })
  })
})

describe('les rappels et le registre', () => {
  it('rappelle les qualifications échues ou dans le mois, des personnes encore dans l’équipe', () => {
    const latest = latestQualifications([
      q('ana', 'p12', '2025-11-01T00:00:00Z', { validUntil: '2026-11-01T00:00:00Z' }),
      q('ben', 'p12', '2025-12-01T00:00:00Z', { validUntil: '2026-12-01T00:00:00Z' }),
      q('cam', 'p12', '2026-06-01T00:00:00Z', { validUntil: '2027-06-01T00:00:00Z' }),
      q('old', 'p12', '2025-11-01T00:00:00Z', { validUntil: '2026-11-01T00:00:00Z' }),
      q('dan', 'p12', '2025-11-01T00:00:00Z', { validUntil: null }),
    ])
    const due = dueQualifications(latest, [op('ana', 'jour'), op('ben', 'jour'), op('cam', 'soir'), op('old', 'nuit', false), op('dan', 'jour')], NOW)
    expect(due.map((d) => [d.operatorId, d.expired])).toEqual([['ana', true], ['ben', false]])
  })

  it('le registre est le journal entier, en CSV, sans formule possible, les questions en nombres', () => {
    const csv = registerCsv([q('ana', 'p12', '2026-01-01T00:00:00Z', { note: '=HYPERLINK("x")' }), q('ben', 'p12', '2026-02-01T00:00:00Z', { level: 'none' })], ['Personne', 'Poste', 'Niveau', 'Par', 'Le', 'Jusqu’au', 'Questions validées', 'Questions du poste', 'Note'], (l) => ({ qualified: 'Qualifiée', trainer: 'Peut former', none: 'Retirée' })[l], (d) => d?.slice(0, 10) ?? '')
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('BEN,Poste p12,Retirée,Mélanie,2026-02-01,,2,2,')
    expect(lines[2]).toBe(`ANA,Poste p12,Qualifiée,Mélanie,2026-01-01,,2,2,"'=HYPERLINK(""x"")"`)
    // En français : le point-virgule, que le tableur attend.
    expect(registerCsv([q('ana', 'p12', '2026-01-01T00:00:00Z')], ['a'], () => 'Qualifiée', (d) => d?.slice(0, 10) ?? '', ';').split('\n')[1]).toBe('ANA;Poste p12;Qualifiée;Mélanie;2026-01-01;;2;2;')
  })

  it('signer écrit une signature au journal, avec l’échéance de l’usine ; un retrait n’en a pas', async () => {
    const gw = fakeGateway((_endpoint, options) => (options.method === 'POST' ? { results: [{ inserted_id: 'q1', json_data: {} }] } : { success: true }))
    const base = { operatorId: 'ana', operatorName: 'Ana', stationId: 'p12', stationName: 'Presse', level: 'qualified' as const, trainingsDone: 2, trainingsRequired: 3, byId: 'mel', byName: 'Mélanie' }
    await signOff(dataApi(gw), base, 12, '2026-11-13T12:00:00.000Z')
    await signOff(dataApi(gw), { ...base, level: 'none' }, 12, '2026-11-14T12:00:00.000Z')
    const bodies = gw.calls.filter((c) => c.endpoint === '/api/v1/data/clip_qualification').map((c) => (c.options.body as { json_data: Qualification }).json_data)
    expect(bodies.map((b) => [b.level, b.validUntil])).toEqual([['qualified', '2027-11-13T12:00:00.000Z'], ['none', null]])
  })
})

describe('les rappels dans « À voir » et l’attestation', () => {
  const due = [
    { operatorId: 'ana', operatorName: 'Ana', stationId: 'p12', stationName: 'Presse P-12', validUntil: '2026-11-01T00:00:00.000Z', expired: true },
    { operatorId: 'ben', operatorName: 'Ben', stationId: 'p12', stationName: 'Presse P-12', validUntil: '2026-12-01T00:00:00.000Z', expired: false },
  ]
  const base = { userId: 'mel', instructions: [], feedback: [], executions: [], groups: [] }

  it('rappelle à qui valide : échue depuis l’échéance, à venir dès un mois avant, et mène à la personne', () => {
    const items = buildInbox({ ...base, due, can: { approve: true, feedback: true } })
    expect(items.map((i) => [i.kind, i.title, i.text, i.at, i.href])).toEqual([
      ['requalify', 'Ana', 'Presse P-12 : échue le 1 novembre 2026', '2026-11-01T00:00:00.000Z', '/equipe?vue=competences&q=Ana'],
      ['requalify', 'Ben', 'Presse P-12 : avant le 1 décembre 2026', '2026-11-01T00:00:00.000Z', '/equipe?vue=competences&q=Ben'],
    ])
    expect(buildInbox({ ...base, due, can: { approve: false, feedback: true } })).toEqual([])
  })

  it('l’attestation échappe chaque texte et n’affiche qu’un logo en https', () => {
    const html = buildAttestationHtml({
      orgName: 'Usine <Bellechasse>',
      logoUrl: 'javascript:alert(1)',
      color: 'red;}body{display:none',
      person: 'Ana "La" Roy',
      rows: [{ stationName: 'Presse <P-12>', level: 'trainer', byName: 'Mélanie', at: '2026-06-01T00:00:00Z', validUntil: null }],
      texts: { title: 'Attestation', intro: 'Intro', head: ['Poste', 'Niveau', 'Par', 'Le', 'Jusqu’au'], none: 'Rien', printedOn: 'Imprimée', noExpiry: 'Sans échéance', signature: 'Signature', levels: { qualified: 'Qualifié', trainer: 'Peut former' } },
      date: (iso) => iso.slice(0, 10),
    })
    expect(html).toContain('Usine &lt;Bellechasse&gt;')
    expect(html).toContain('Ana &quot;La&quot; Roy')
    expect(html).toContain('<td><b>Presse &lt;P-12&gt;</b></td><td>Peut former</td><td>Mélanie</td><td>2026-06-01</td><td>Sans échéance</td>')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('display:none')
    expect(html).toContain('#0078FF')
  })
})
