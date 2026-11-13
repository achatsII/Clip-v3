import { describe, expect, it } from 'vitest'
import { normalizeInstruction } from '@/lib/ai/normalize'
import { dataApi, type Doc } from '@/lib/gateway/data'
import { messages } from '@/lib/i18n'
import { answered, blocks, cleanChecks, hasChecks, liveChecks, proposedChecks, readingsStats, stepComplete, verdict, withoutProposals } from '@/lib/model/checks'
import { answerValue, buildExecution } from '@/lib/model/executions'
import { emptyContent } from '@/lib/model/repo'
import { publishInstruction } from '@/lib/model/service'
import { executionsCsv, trendsOf, type CsvWords } from '@/lib/model/trends'
import type { Check, Execution, ExecutionAnswer, Instruction, OrgSettings, Published, Step } from '@/lib/model/types'
import { executionSheet } from '@/lib/pdf/executionSheet'
import { csvCell, csvDate, csvSeparator, toCsv } from '@/lib/util/csv'
import { fakeGateway } from './fakeClient'

const guards: Check = { id: 'ck_g', kind: 'checklist', label: 'Avant de démarrer', items: [{ id: 'it_1', label: 'Garde en place' }, { id: 'it_2', label: 'Arrêt d’urgence' }, { id: 'it_3', label: 'Zone dégagée' }] }
const diam: Check = { id: 'ck_d', kind: 'measures', label: 'Diamètre', unit: 'mm', min: 9.9, max: 10.1, count: 3, authorize: true }
const lot: Check = { id: 'ck_l', kind: 'text', label: 'Numéro de lot', scan: true }
const proofs: Check = { id: 'ck_ph', kind: 'photo', label: 'Pièces', photos: 3, optional: true }
const oiled: Check = { id: 'ck_ai', kind: 'yesno', label: 'Arbre lubrifié', expected: 'yes', proposed: true }
const step = (id: string, checks?: Check[]): Step => ({ id, title: `Étape ${id}`, text: '', media: [], ...(checks ? { checks } : {}) })

describe('les genres du module Relevés', () => {
  it('une liste : chaque point répondu ; « pas conforme » est un écart, « sans objet » ne l’est pas', () => {
    expect(answered(guards, { it_1: 'ok', it_2: 'ok' })).toBe(false)
    expect(answered(guards, { it_1: 'ok', it_2: 'ok', it_3: 'peut-être' } as never)).toBe(false)
    expect(answered(guards, { it_1: 'ok', it_2: 'na', it_3: 'ok' })).toBe(true)
    expect(verdict(guards, { it_1: 'ok', it_2: 'na', it_3: 'ok' })).toBe(true)
    expect(verdict(guards, { it_1: 'ok', it_2: 'ko', it_3: 'ok' })).toBe(false)
    // Un point retiré depuis ne compte plus.
    expect(verdict(guards, { it_1: 'ok', it_2: 'ok', it_3: 'ok', it_old: 'ko' })).toBe(true)
  })

  it('une mesure répétée : chaque lecture donnée et dans les limites ; la plus basse, la plus haute, la moyenne', () => {
    expect(answered(diam, [10, null, 10])).toBe(false)
    expect(answered(diam, [10, 10])).toBe(false)
    expect(answered(diam, [10, 10.05, 9.95])).toBe(true)
    expect(verdict(diam, [10, 10.05, 9.95])).toBe(true)
    expect(verdict(diam, [10, 10.2, 10])).toBe(false)
    expect(readingsStats([10, 10.2, 10])).toEqual({ low: 10, high: 10.2, mean: 10.0667 })
    expect(readingsStats([])).toBeNull()
  })

  it('un écart à faire autoriser : la note ne suffit pas, il faut le nom de qui l’a autorisé', () => {
    const out = [10, 10.2, 10]
    expect(blocks(diam, { value: out })).toBe(true)
    expect(blocks(diam, { value: out, note: 'Pièce mise de côté' })).toBe(true)
    expect(blocks(diam, { value: out, note: 'Pièce mise de côté', authorizedBy: '  ' })).toBe(true)
    expect(blocks(diam, { value: out, note: 'Pièce mise de côté', authorizedBy: 'Luc' })).toBe(false)
    // Dans la norme : rien à autoriser.
    expect(blocks(diam, { value: [10, 10, 10] })).toBe(false)
    // Une photo facultative peut rester vide ; un lot à lire ne le peut pas.
    expect(blocks(proofs, undefined)).toBe(false)
    expect(blocks(lot, { value: '' })).toBe(true)
  })

  it('nettoie ce que l’IA ou l’éditeur propose : bornes, points, et chaque option seulement où elle a un sens', () => {
    const out = cleanChecks(
      [
        { kind: 'measures', label: 'Diamètre', count: 40, min: '10,1', max: '9,9', authorize: true, how: '  Au pied à coulisse,   trois points  ' },
        { kind: 'checklist', label: 'Avant', items: ['Garde', 'garde', { label: 'Arrêt' }, ...Array.from({ length: 14 }, (_, i) => `P${i}`)] },
        { kind: 'text', label: 'Lot', scan: true, authorize: true, photos: 3 },
        { kind: 'photo', label: 'Pièces', photos: 9, scan: true, authorize: true },
        { kind: 'yesno', label: 'Lubrifié', expected: 'yes', proposed: true },
        { kind: 'checklist', label: 'Un seul point', items: ['Un'] },
        { kind: 'yesno', label: 'Pas une proposition', proposed: 'oui' },
      ],
      10,
    )
    expect(out.map((c) => c.label)).toEqual(['Diamètre', 'Avant', 'Lot', 'Pièces', 'Lubrifié', 'Pas une proposition'])
    const [m, l, t, p, y, n] = out
    expect(m).toMatchObject({ kind: 'measures', count: 10, min: 9.9, max: 10.1, authorize: true, how: 'Au pied à coulisse, trois points' })
    expect(l.items?.map((i) => i.label)).toEqual(['Garde', 'Arrêt', ...Array.from({ length: 10 }, (_, i) => `P${i}`)])
    expect(l.items?.every((i) => i.id.startsWith('it_'))).toBe(true)
    expect(t).toMatchObject({ scan: true })
    expect(t.authorize).toBeUndefined()
    expect(t.photos).toBeUndefined()
    expect(p).toMatchObject({ photos: 6 })
    expect(p.scan).toBeUndefined()
    expect(p.authorize).toBeUndefined()
    expect(y.proposed).toBe(true)
    expect(n.proposed).toBeUndefined()
    expect(cleanChecks([{ kind: 'measures', label: 'X', count: 1 }])[0].count).toBe(2)
    expect(cleanChecks([{ kind: 'measures', label: 'X' }])[0].count).toBe(3)
    expect(cleanChecks([{ kind: 'photo', label: 'X', photos: 1 }])[0].photos).toBeUndefined()
    expect(cleanChecks([{ kind: 'text', label: 'X', how: 'a'.repeat(300) }])[0].how).toHaveLength(160)
  })
})

describe('les relevés que l’IA propose', () => {
  it('restent au brouillon tant que l’auteur ne les garde pas : rien au poste, rien de bloqué', () => {
    const steps = [step('st_1', [diam, oiled]), step('st_2', [{ ...oiled, id: 'ck_ai2' }]), step('st_3')]
    expect(proposedChecks(steps)).toBe(2)
    expect(liveChecks(steps[0]).map((c) => c.id)).toEqual(['ck_d'])
    expect(hasChecks([steps[1]])).toBe(false)
    expect(stepComplete(steps[1], {})).toBe(true)
    const c = emptyContent({ title: 'Tourner l’arbre', steps })
    const sent = withoutProposals(c)
    expect(sent.steps[0].checks?.map((x) => x.id)).toEqual(['ck_d'])
    expect('checks' in sent.steps[1]).toBe(false)
    expect(sent.steps[2]).toBe(c.steps[2])
    expect(c.steps[0].checks).toHaveLength(2)
    // Rien à retirer : le même contenu.
    expect(withoutProposals(sent)).toBe(sent)
  })

  it('une instruction générée par l’IA ne fait que proposer ses relevés', () => {
    const { content } = normalizeInstruction({ title: 'Purger', steps: [{ title: 'Lire la pression', text: 'Au manomètre.', checks: [{ kind: 'measure', label: 'Pression', unit: 'bar', min: '4,5', max: '5,5' }] }] }, [])
    expect(content.steps[0].checks?.[0]).toMatchObject({ label: 'Pression', min: 4.5, max: 5.5, proposed: true })
    expect(hasChecks(content.steps)).toBe(false)
  })

  it('publier n’envoie au poste que les relevés gardés, et laisse les propositions au brouillon', async () => {
    const gw = fakeGateway((endpoint, options) => {
      if (endpoint.includes('clip_org/filter')) return { results: [{ _id: 'org1', json_data: { app_identifier: 'clip-v3', name: 'U', numbering: { prefix: 'IT', next: 5 } } }] }
      if (endpoint.includes('/filter')) return { results: [] }
      if (options.method === 'POST') return { results: [{ inserted_id: 'p1', json_data: {} }] }
      return { success: true }
    })
    const draft = emptyContent({ title: 'Tourner l’arbre', steps: [step('st_1', [diam, oiled]), step('st_2', [{ ...oiled, id: 'ck_ai2' }])] })
    const doc = { _id: 'i1', json_data: { title: 'Tourner l’arbre', status: 'draft', stationIds: ['s1'], draft, publishedVersion: null, publishedId: null } as unknown as Instruction }
    await publishInstruction(dataApi(gw), doc, { name: 'Usine', approval: { mode: 'none', approverIds: [] } } as unknown as OrgSettings, { id: 'u1', name: 'Mel' })
    const pub = gw.calls.find((c) => c.endpoint === '/api/v1/data/clip_published' && c.options.method === 'POST')!.options.body as { json_data: Published }
    expect(pub.json_data.content.steps.map((s) => s.checks?.map((c) => c.id) ?? [])).toEqual([['ck_d'], []])
    const patch = gw.calls.find((c) => c.endpoint.startsWith('/api/v1/data/clip_instruction') && c.options.method === 'PATCH')!.options.body as Record<string, unknown>
    expect(JSON.stringify(patch)).not.toContain('"draft"')
  })
})

describe('la trace d’un travail avec les genres du module', () => {
  const content = emptyContent({ title: 'Tourner l’arbre', steps: [step('st_1', [guards, diam, oiled]), step('st_2', [lot, proofs])] })
  const meta = { instructionId: 'i1', version: 2, stationId: 's1', source: 'kiosk' as const, startedAt: '2026-11-13T08:00:00Z', finishedAt: '2026-11-13T08:20:00Z', language: 'fr', operatorId: 'op1', operatorName: 'Julie' }

  it('garde chaque lecture, chaque point, les photos et qui a autorisé l’écart ; jamais une proposition', () => {
    const e = buildExecution(
      content,
      {
        ck_g: { value: { it_1: 'ok', it_2: 'ok', it_3: 'na' } },
        ck_d: { value: [10, 10.2, 10, 99], note: 'Pièce mise de côté', authorizedBy: ' Luc ' },
        ck_ai: { value: true },
        ck_l: { value: 'LOT-2291' },
        ck_ph: { value: ['https://f/1.jpg', '', 'https://f/2.jpg'] },
      },
      meta,
    )
    expect(e.answers.map((a) => a.checkId)).toEqual(['ck_g', 'ck_d', 'ck_l', 'ck_ph'])
    const [g, d, , ph] = e.answers
    expect(g).toMatchObject({ value: null, ok: true, items: [{ label: 'Garde en place', state: 'ok' }, { label: 'Arrêt d’urgence', state: 'ok' }, { label: 'Zone dégagée', state: 'na' }] })
    expect(d).toMatchObject({ value: 10.0667, values: [10, 10.2, 10], ok: false, unit: 'mm', min: 9.9, max: 10.1, note: 'Pièce mise de côté', authorizedBy: 'Luc' })
    expect(ph).toMatchObject({ value: 'https://f/1.jpg', photos: ['https://f/1.jpg', 'https://f/2.jpg'] })
    expect(e.deviations).toBe(1)
    const t = messages().records
    expect(answerValue(d, t)).toBe('10 · 10,2 · 10 mm')
    expect(answerValue(g, t)).toBe(t.checklistSummary(2, 0, 1))
  })

  it('dans la norme, « autorisé par » ne s’écrit pas', () => {
    const e = buildExecution(content, { ck_d: { value: [10, 10, 10], authorizedBy: 'Luc' } }, meta)
    expect(e.answers[0].authorizedBy).toBeUndefined()
  })

  it('la fiche imprimée montre les points, les photos en https et qui a autorisé, tout échappé', () => {
    const t = messages().records
    const e = buildExecution(
      content,
      {
        ck_g: { value: { it_1: 'ok', it_2: 'ko', it_3: 'ok' }, note: 'Arrêt réparé' },
        ck_d: { value: [10, 10.2, 10], note: 'Mise de côté', authorizedBy: '<b>Luc</b>' },
        ck_ph: { value: ['https://f/1.jpg', 'javascript:alert(1)'] },
      },
      meta,
    )
    const html = executionSheet(e, t, { stationName: 'Tour 3', when: '13 nov.', printedAt: '13 nov.', duration: null, lang: 'fr' })
    expect(html).toContain(`${t.authorizedBy} : &lt;b&gt;Luc&lt;/b&gt;`)
    expect(html).toContain(`<span class="ko">${t.itemLine('Arrêt d’urgence', t.itemStates.ko)}</span>`)
    expect(html).toContain('<img src="https://f/1.jpg"')
    expect(html).not.toContain('javascript:')
  })
})

describe('les tendances et l’export du registre', () => {
  const run = (id: string, at: string, answers: ExecutionAnswer[], over: Partial<Execution> = {}): Doc<Execution> => ({
    _id: id,
    json_data: { instructionId: 'i1', instructionTitle: 'Tourner l’arbre', version: 1, stationId: 's1', source: 'kiosk', startedAt: at, finishedAt: at, language: 'fr', operatorId: 'op1', operatorName: 'Julie', answers, deviations: answers.filter((a) => a.ok === false).length, ...over },
  })
  const m = (value: number, ok: boolean, over: Partial<ExecutionAnswer> = {}): ExecutionAnswer => ({ stepId: 'st_1', stepTitle: 'Mesurer', checkId: 'ck_d', label: 'Diamètre', kind: 'measures', value, values: [value - 0.05, value, value + 0.05], unit: 'mm', min: 9.9, max: 10.1, ok, ...over })
  const yes: ExecutionAnswer = { stepId: 'st_2', stepTitle: 'Graisser', checkId: 'ck_y', label: 'Lubrifié', kind: 'yesno', value: true, ok: true }

  it('une série par instruction et par mesure, la plus ancienne valeur d’abord, avec les limites d’aujourd’hui', () => {
    const trends = trendsOf([
      run('b', '2026-11-12T10:00:00Z', [m(10.12, false)]),
      run('a', '2026-11-10T10:00:00Z', [m(10, true, { min: 9.8, max: 10.2 }), yes]),
      run('z', '2026-11-11T10:00:00Z', [{ ...m(5, true), checkId: 'ck_x', kind: 'measure', label: 'Jeu', values: undefined, min: null, max: 6 }], { instructionId: 'i0', instructionTitle: 'Affûter la lame', operatorName: undefined, userName: 'Mel' }),
    ])
    expect(trends.map((t) => [t.instructionTitle, t.label, t.points.length])).toEqual([
      ['Affûter la lame', 'Jeu', 1],
      ['Tourner l’arbre', 'Diamètre', 2],
    ])
    const d = trends[1]
    expect(d.points.map((p) => [p.value, p.ok, p.who])).toEqual([
      [10, true, 'Julie'],
      [10.12, false, 'Julie'],
    ])
    expect(d.points[0]).toMatchObject({ low: 9.95, high: 10.05 })
    expect(d).toMatchObject({ min: 9.9, max: 10.1, unit: 'mm', deviations: 1 })
    expect(trends[0]).toMatchObject({ min: null, max: 6 })
    expect(trends[0].points[0].who).toBe('Mel')
    expect(trends[0].points[0].low).toBeUndefined()
  })

  const t = messages().records
  const words = (sep: ',' | ';'): CsvWords => ({
    head: ['Le', 'Instruction', 'Poste', 'Par', 'Étape', 'Relevé', 'Valeur', 'Unité', 'Min', 'Max', 'Jugement', 'Détail', 'Note', 'Autorisé par'],
    sep,
    text: (a) => answerValue(a, t),
    item: (label, state) => t.itemLine(label, t.itemStates[state]),
    verdict: (ok) => (ok === null ? '' : ok ? 'OK' : 'Écart'),
    date: (iso) => iso.slice(0, 10),
    station: (id) => (id === 's1' ? 'Tour 3' : ''),
  })

  it('l’export : une ligne par relevé, le plus récent d’abord, la mesure en nombre, sans formule possible', () => {
    const docs = [
      run('a', '2026-11-10T10:00:00Z', [m(-0.5, true, { values: [-0.55, -0.5, -0.45], unit: '°C', min: -1, max: 0 })]),
      run('b', '2026-11-12T10:00:00Z', [m(10.12, false, { note: '=HYPERLINK("x")', authorizedBy: 'Luc' }), { stepId: 'st_3', stepTitle: 'Vérifier', checkId: 'ck_g', label: 'Avant', kind: 'checklist', value: null, items: [{ label: 'Garde', state: 'ok' }, { label: 'Arrêt', state: 'ko' }], ok: false }]),
    ]
    const lines = executionsCsv(docs, words(',')).split('\n')
    expect(lines).toHaveLength(4)
    expect(lines[1]).toBe(`2026-11-12,Tourner l’arbre,Tour 3,Julie,Mesurer,Diamètre,10.12,mm,9.9,10.1,Écart,10.07 | 10.12 | 10.17,"'=HYPERLINK(""x"")",Luc`)
    expect(lines[2]).toBe(`2026-11-12,Tourner l’arbre,Tour 3,Julie,Vérifier,Avant,${t.checklistSummary(1, 1, 0)},,,,Écart,Garde : Conforme | Arrêt : Pas conforme,,`)
    // Un nombre négatif reste un nombre, pas une formule.
    // Le détail qui commence par un signe prend l'apostrophe : le tableur y verrait une formule.
    expect(lines[3]).toBe("2026-11-10,Tourner l’arbre,Tour 3,Julie,Mesurer,Diamètre,-0.5,°C,-1,0,OK,'-0.55 | -0.5 | -0.45,,")
  })

  it('en français : le point-virgule entre les colonnes et la virgule dans les nombres', () => {
    const lines = executionsCsv([run('a', '2026-11-10T10:00:00Z', [m(10.12, false, { note: 'Arrêté; refait' })])], words(';')).split('\n')
    expect(lines[1]).toBe('2026-11-10;Tourner l’arbre;Tour 3;Julie;Mesurer;Diamètre;10,12;mm;9,9;10,1;Écart;10,07 | 10,12 | 10,17;"Arrêté; refait";')
  })
})

describe('un CSV que le tableur ouvre sans surprise', () => {
  it('le séparateur suit la langue ; une formule ne passe jamais ; un nombre reste un nombre', () => {
    expect(csvSeparator('fr')).toBe(';')
    expect(csvSeparator('en')).toBe(',')
    expect(csvCell('=1+1')).toBe("'=1+1")
    expect(csvCell('+33 6')).toBe("'+33 6")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(csvCell('\tcaché')).toBe("'\tcaché")
    expect(csvCell('-2,5')).toBe('"-2,5"')
    expect(csvCell('-2,5', ';')).toBe('-2,5')
    expect(csvCell(-2.5, ';')).toBe('-2,5')
    expect(csvCell(0.1 + 0.2)).toBe('0.3')
    expect(csvCell(Number.NaN)).toBe('')
    expect(csvCell(null)).toBe('')
    expect(csvCell('deux\nlignes')).toBe('"deux\nlignes"')
    expect(toCsv([['a', 'b;c', 'd,e']], ';')).toBe('a;"b;c";d,e')
  })

  it('une date que tout tableur lit, à l’heure de l’appareil', () => {
    const iso = '2026-03-05T07:08:00Z'
    const d = new Date(iso)
    const p = (n: number) => String(n).padStart(2, '0')
    expect(csvDate(iso)).toBe(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`)
    expect(csvDate(iso, false)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(csvDate(null)).toBe('')
    expect(csvDate('pas une date')).toBe('')
  })
})
