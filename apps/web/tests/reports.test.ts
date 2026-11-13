import { describe, expect, it } from 'vitest'
import type { AiApi } from '@/lib/gateway/ai'
import type { Execution, Feedback, Qualification, Training, UsageEvent } from '@/lib/model/types'
import { reportOf, verdictOf, type Block, type ReportContext } from '@/lib/reports/catalog'
import { changeOf, completionsOf, DAY, deviationRate, durationsOf, EVERYWHERE, inScope, median, perDay, periodOf, previousOf, quantile } from '@/lib/reports/facts'
import { analyzeReport, autoNarrative, blocksText, cleanNarrative } from '@/lib/reports/narrative'
import { reportHtml } from '@/lib/reports/print'

const NOW = Date.parse('2026-11-13T15:00:00Z')
const ago = (days: number, hours = 0) => new Date(NOW - days * DAY - hours * 3600_000).toISOString()
const done = (instructionId: string, daysAgo: number, sec: number | null, over: Partial<UsageEvent> = {}): UsageEvent => ({ type: 'complete', instructionId, stationId: 'st1', operatorId: 'op1', operatorName: 'Julie', version: 2, durationSec: sec, source: 'kiosk', at: ago(daysAgo, 1), ...over })
const exec = (instructionId: string, daysAgo: number, answers: Array<[string, boolean | null]>, over: Partial<Execution> = {}): Execution => ({
  instructionId,
  instructionTitle: `Titre ${instructionId}`,
  version: 2,
  stationId: 'st1',
  source: 'kiosk',
  startedAt: ago(daysAgo, 2),
  finishedAt: ago(daysAgo, 1),
  operatorId: 'op1',
  operatorName: 'Julie',
  language: 'fr',
  answers: answers.map(([checkId, ok]) => ({ stepId: 's', stepTitle: 'Étape', checkId, label: `Relevé ${checkId}`, kind: 'measure', value: 1, ok })),
  deviations: answers.filter(([, ok]) => ok === false).length,
  ...over,
})
const fb = (instructionId: string, daysAgo: number, kind: Feedback['kind'], over: Partial<Feedback> = {}): Feedback => ({ instructionId, instructionTitle: `Titre ${instructionId}`, kind, source: 'kiosk', stationId: 'st1', status: 'new', createdAt: ago(daysAgo), ...over })

function ctx(over: Partial<ReportContext> = {}, days = 7): ReportContext {
  const period = periodOf(days, NOW)
  return {
    period,
    previous: previousOf(period),
    scope: EVERYWHERE,
    events: [],
    executions: [],
    feedback: [],
    cards: new Map([
      ['i1', { title: 'Nettoyer les rails', number: 'IT-0042', durationMin: 5, version: 2, stationIds: ['st1'], publishedAt: ago(40) }],
      ['i2', { title: 'Changer la matrice', number: null, durationMin: 20, version: 3, stationIds: ['st2'], publishedAt: ago(90) }],
      ['i3', { title: 'Jamais faite', number: null, durationMin: null, version: 1, stationIds: ['st2'], publishedAt: ago(200) }],
    ]),
    stations: new Map([
      ['st1', { name: 'Machine 1234', area: 'Usinage' }],
      ['st2', { name: 'Presse P-12', area: null }],
    ]),
    ...over,
  }
}
const kpi = (blocks: Block[], id: string) => blocks.flatMap((b) => (b.kind === 'kpis' ? b.items : [])).find((k) => k.id === id)!
const table = (blocks: Block[], id: string) => blocks.find((b): b is Extract<Block, { kind: 'table' }> => b.kind === 'table' && b.id === id)!

describe('les mesures des rapports', () => {
  it('médiane et 9 fois sur 10 ; une durée hors bornes ne compte pas dans les temps, mais la réalisation compte', () => {
    expect(median([300, 100, 200])).toBe(200)
    expect(quantile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 0.9)).toBeCloseTo(91)
    expect(median([])).toBeNull()
    const p = periodOf(7, NOW)
    const list = completionsOf([done('i1', 1, 300), done('i1', 2, 5), done('i1', 3, 50_000), done('i1', 9, 300), { ...done('i1', 1, 60), type: 'view' }], p, EVERYWHERE)
    expect(list).toHaveLength(3)
    expect(durationsOf(list)).toEqual({ n: 1, median: 300, p90: 300, low: true })
  })

  it('le lieu et le quart filtrent ; un fait sans poste n’est d’aucun lieu, sans personne d’aucun quart', () => {
    const scope = { stationIds: new Set(['st1']), shift: 'soir' as const, shiftOf: new Map([['op1', 'soir' as const], ['op2', 'jour' as const]]) }
    expect(inScope({ stationId: 'st1', operatorId: 'op1' }, scope)).toBe(true)
    expect(inScope({ stationId: 'st1', operatorId: 'op2' }, scope)).toBe(false)
    expect(inScope({ stationId: 'st2', operatorId: 'op1' }, scope)).toBe(false)
    expect(inScope({ stationId: null, operatorId: 'op1' }, scope)).toBe(false)
    expect(inScope({ stationId: 'st1', operatorId: null }, scope)).toBe(false)
  })

  it('un taux d’écart se calcule en somme sur somme, jamais en moyenne de taux', () => {
    // 1 écart sur 1 relevé, puis 0 sur 9 : 1/10 = 10 %, pas (100 % + 0 %) / 2.
    const r = deviationRate([exec('i1', 1, [['a', false]]), exec('i1', 2, Array.from({ length: 9 }, (_, i): [string, boolean] => [`b${i}`, true]))])
    expect(r).toEqual({ judged: 10, deviations: 1, rate: 0.1 })
    expect(deviationRate([exec('i1', 1, [['a', null]])]).rate).toBeNull()
  })

  it('le changement depuis la période d’avant : stable sous 2 %, rien sans l’une des deux', () => {
    expect(changeOf(110, 100)).toEqual({ delta: 10, pct: 0.1, trend: 'up' })
    expect(changeOf(101, 100)?.trend).toBe('flat')
    expect(changeOf(null, 100)).toBeNull()
    expect(changeOf(5, 0)).toMatchObject({ pct: null, trend: 'up' })
  })

  it('les barres comptent chaque jour de la période, même vide', () => {
    const days = perDay([{ at: ago(0, 1) }, { at: ago(0, 2) }, { at: ago(2) }], periodOf(7, NOW))
    expect(days).toHaveLength(7)
    expect(days.at(-1)!.value).toBe(2)
    expect(days.reduce((s, d) => s + d.value, 0)).toBe(3)
  })
})

describe('les rapports', () => {
  it('la revue de la semaine : chiffres clés avec la semaine d’avant, les plus faites, et ce qui est à regarder', () => {
    const events = [
      ...Array.from({ length: 6 }, (_, i) => done('i1', i % 6, 420, { operatorId: `op${i % 3}` })),
      done('i2', 1, 1100),
      ...Array.from({ length: 4 }, (_, i) => done('i1', 8 + i, 300)),
    ]
    const executions = [exec('i1', 1, [['grease', false], ['grease', true]]), exec('i1', 9, [['grease', true]])]
    const feedback = [fb('i2', 2, 'danger'), fb('i1', 3, 'unclear', { status: 'done' })]
    const blocks = reportOf('semaine')!.build(ctx({ events, executions, feedback }))
    expect(kpi(blocks, 'done')).toMatchObject({ value: '7', previous: '4', delta: { text: '+75 %', tone: 'good' } })
    expect(kpi(blocks, 'people').value).toBe('3')
    expect(kpi(blocks, 'deviations')).toMatchObject({ value: '1', hint: '50 % des relevés' })
    expect(kpi(blocks, 'feedback')).toMatchObject({ value: '2', hint: '1 danger signalé' })
    expect(table(blocks, 'top').rows.map((r) => [r.cells.instruction.text, r.cells.done.text, r.cells.typical.text])).toEqual([
      ['IT-0042 · Nettoyer les rails', '6', '7 min'],
      ['Changer la matrice', '1', '18 min 20 *'.replace(' *', '')],
    ])
    const watch = blocks.find((b) => b.kind === 'list')!
    expect(watch.kind === 'list' && watch.items.map((i) => i.text)).toEqual([
      'Plus long que prévu : IT-0042 · Nettoyer les rails (7 min au lieu de 5 min)',
      'Relevé grease (IT-0042 · Nettoyer les rails) : 1 écart sur 2',
      'Danger signalé : Changer la matrice',
    ])
  })

  it('le temps par instruction : temps habituel, 9 fois sur 10, prévu et écart, avec « peu de données »', () => {
    const events = [...[240, 300, 360, 420, 480, 600].map((s, i) => done('i1', i % 6, s)), done('i2', 1, 1500), ...[200, 220, 240, 260, 280].map((s, i) => done('i1', 8 + i, s))]
    const blocks = reportOf('temps')!.build(ctx({ events }, 7))
    const rows = table(blocks, 'instructions').rows
    expect(rows[0].cells).toMatchObject({ done: { text: '6' }, typical: { text: '6 min 30', sort: 390, low: false }, p90: { sort: 540 }, planned: { text: '5 min' }, vsPlanned: { text: '+30 %', tone: 'bad' }, change: { text: '+2 min 30', tone: 'bad' } })
    expect(rows[1].cells).toMatchObject({ done: { text: '1' }, typical: { low: true }, vsPlanned: { text: '+25 %' } })
    expect(kpi(blocks, 'slower').value).toBe('1')
  })

  it('une instruction faite puis retirée garde une ligne lisible : « Instruction retirée »', () => {
    const blocks = reportOf('temps')!.build(ctx({ events: [done('gone', 1, 300)] }, 7))
    expect(table(blocks, 'instructions').rows[0].cells.instruction.text).toBe('Instruction retirée')
  })

  it('qui a fait quoi : par ordre alphabétique (pas un palmarès), « personne non nommée » à la fin', () => {
    const events = [done('i1', 1, 300, { operatorId: 'z', operatorName: 'Zoé' }), done('i2', 1, 600, { operatorId: 'a', operatorName: 'Alain' }), done('i1', 2, 300, { operatorId: 'a', operatorName: 'Alain' }), done('i1', 3, 120, { operatorId: null, operatorName: null })]
    const blocks = reportOf('personnes')!.build(ctx({ events, executions: [exec('i1', 1, [['x', false]], { operatorId: 'a' })] }))
    expect(table(blocks, 'people').rows.map((r) => [r.cells.person.text, r.cells.done.text, r.cells.distinct.text, r.cells.total.text, r.cells.deviations.text, r.href])).toEqual([
      ['Alain', '2', '2', '15 min', '1', '/registre?q=Alain'],
      ['Zoé', '1', '1', '5 min', '0', '/registre?q=Zo%C3%A9'],
      ['Personne non nommée', '1', '1', '2 min', '0', undefined],
    ])
    expect(kpi(blocks, 'unnamed').value).toBe('25 %')
  })

  it('avant / après une révision : chaque version avec ses réalisations ; pas de bilan sans assez de données', () => {
    expect(verdictOf({ median: 600, low: false, rate: 0.1, fb: 10 }, { median: 480, low: false, rate: 0.05, fb: 2 })).toBe('better')
    expect(verdictOf({ median: 480, low: false, rate: 0.05, fb: 2 }, { median: 600, low: false, rate: 0.1, fb: 10 })).toBe('worse')
    expect(verdictOf({ median: 480, low: false, rate: 0.05, fb: 2 }, { median: 500, low: false, rate: 0.05, fb: 2 })).toBe('same')
    expect(verdictOf({ median: 480, low: true, rate: 0.05, fb: 2 }, { median: 300, low: false, rate: 0, fb: 0 })).toBe('low')
    // Plus rapide, mais plus de questions (pas clair, erreur) : une mesure qui se dégrade suffit.
    expect(verdictOf({ median: 600, low: false, rate: 0.1, fb: 0 }, { median: 480, low: false, rate: 0.05, fb: 9 })).toBe('worse')
    const events = [...Array.from({ length: 6 }, (_, i) => done('i1', 30 + i, 600, { version: 1 })), ...Array.from({ length: 6 }, (_, i) => done('i1', 2 + i, 420, { version: 2 }))]
    const blocks = reportOf('revision')!.build(ctx({ events }, 90))
    expect(table(blocks, 'revisions').rows[0].cells).toMatchObject({ versions: { text: 'v1 → v2' }, time: { text: '10 min → 7 min', tone: 'good' }, verdict: { text: 'Mieux', tone: 'good' } })
    expect(kpi(blocks, 'better').value).toBe('1')
  })

  it('la formation : formé = questions réussies sur la version à jour, avant le travail ; qualifié au poste à ce moment-là', () => {
    const trainings: Training[] = [
      { instructionId: 'i1', instructionTitle: 'x', version: 2, stationId: 'st1', score: 1, passed: true, answers: [], at: ago(20), language: 'fr', source: 'kiosk', operatorId: 'a', operatorName: 'Alain' },
      { instructionId: 'i1', instructionTitle: 'x', version: 1, stationId: 'st1', score: 1, passed: true, answers: [], at: ago(20), language: 'fr', source: 'kiosk', operatorId: 'b', operatorName: 'Béa' },
      { instructionId: 'i1', instructionTitle: 'x', version: 2, stationId: 'st1', score: 1, passed: true, answers: [], at: ago(1, 0), language: 'fr', source: 'kiosk', operatorId: 'c', operatorName: 'Cam' },
    ]
    const q = (op: string, at: string, over: Partial<Qualification> = {}): Qualification => ({ operatorId: op, operatorName: op, stationId: 'st1', stationName: 'Machine 1234', level: 'qualified', trainingsDone: 1, trainingsRequired: 1, byId: 'm', byName: 'Mel', at, validUntil: null, ...over })
    const events = [done('i1', 2, 300, { operatorId: 'a', operatorName: 'Alain' }), done('i1', 2, 300, { operatorId: 'b', operatorName: 'Béa' }), done('i1', 2, 300, { operatorId: 'c', operatorName: 'Cam' }), done('i2', 2, 300, { operatorId: 'c', operatorName: 'Cam' })]
    const training = { catalog: new Map([['i1', { trainingVersion: 2 }]]), trainings, qualifications: [q('a', ago(30)), q('b', ago(30), { validUntil: ago(10) }), q('c', ago(30)), q('c', ago(5), { level: 'none' })], due: 2 }
    const blocks = reportOf('formation')!.build(ctx({ events, training }))
    // Alain seul est formé à jour avant le travail (Béa : vieille version ; Cam : après).
    expect(kpi(blocks, 'trained').value).toBe('33 %')
    // Alain qualifié ; Béa échue ; Cam retiré avant le travail.
    expect(kpi(blocks, 'qualified').value).toBe('25 %')
    expect(table(blocks, 'untrained').rows.map((r) => r.cells.person.text)).toEqual(['Béa', 'Cam'])
  })

  it('la santé de la bibliothèque : les comptes du serveur, et les publiées jamais faites ni ouvertes', () => {
    const blocks = reportOf('bibliotheque')!.build(ctx({ events: [done('i1', 1, 300), { ...done('i2', 2, null), type: 'view' }], library: { published: 3, review: 1, draft: 4, renew: 2 } }, 30))
    expect(kpi(blocks, 'review').value).toBe('1')
    expect(table(blocks, 'unused').rows.map((r) => r.id)).toEqual(['i3'])
  })
})

describe('l’IA commente, le code calcule', () => {
  const blocks = (): Block[] => reportOf('semaine')!.build(ctx({ events: [done('i1', 1, 420), done('i1', 2, 400), done('i1', 9, 300)] }))

  it('le texte pour l’IA porte chaque chiffre avec son repère et la valeur d’avant', () => {
    const text = blocksText('Revue de la semaine', 'les 7 derniers jours', blocks())
    expect(text).toContain('[k:done] Instructions faites : 2 (avant : 1, +100 %)')
    expect(text).toContain('[t:top] Les plus faites')
    expect(text).toContain('IT-0042 · Nettoyer les rails | 2 | 6 min 50 (peu de données) | 0')
  })

  it('la réponse de l’IA est rendue sûre : au plus 3 phrases par partie, sans repère technique ; vide, rien', () => {
    expect(cleanNarrative({ summary: ['[k:done] Deux faites.', 'b', 'c', 'd'], watch: [3, 'x'], actions: 'non' })).toEqual({ summary: ['Deux faites.', 'b', 'c'], watch: ['x'], actions: [], auto: false })
    expect(cleanNarrative({ summary: [] })).toBeNull()
  })

  it('l’analyse automatique dit les changements quand l’IA ne répond pas', () => {
    const n = autoNarrative(blocks())
    expect(n.auto).toBe(true)
    expect(n.summary[0]).toBe('Instructions faites : 2 (+100 % depuis avant).')
  })

  it('l’analyse passe par l’opération mesurée `report_summary`, avec le schéma de réponse', async () => {
    const calls: Array<[string, Record<string, unknown>]> = []
    const ai = { ask: async (op: string, body: Record<string, unknown>) => (calls.push([op, body]), { text: '', json: { summary: ['Bonne semaine.'], watch: [], actions: ['Revoir l’étape 3.'] }, model: null, usage: null }) } as unknown as AiApi
    const n = await analyzeReport(ai, 'Revue', 'les 7 derniers jours', blocks(), 'fr')
    expect(n).toEqual({ summary: ['Bonne semaine.'], watch: [], actions: ['Revoir l’étape 3.'], auto: false })
    expect(calls[0][0]).toBe('report_summary')
    expect(calls[0][1]).toHaveProperty('json_schema')
    expect(String(calls[0][1].system_instruction)).toContain('n\'invente aucun chiffre')
  })

  it('le rapport imprimé échappe chaque texte', () => {
    const html = reportHtml([{ kind: 'list', id: 'l', title: '<b>À regarder</b>', items: [{ text: 'Danger <script>', tone: 'bad' }], empty: '' }], { orgName: 'Usine & Cie', title: 'T', question: 'Q', period: 'P', printedOn: 'I', lang: 'fr', dayLabel: 'Jour', previous: (v) => v })
    expect(html).toContain('&lt;b&gt;À regarder&lt;/b&gt;')
    expect(html).toContain('Usine &amp; Cie')
    expect(html).not.toContain('<script>')
  })
})
