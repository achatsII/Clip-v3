import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeQuiz, quizPrompt } from '@/lib/ai/quiz'
import { buildTranslation, contentSegments } from '@/lib/ai/translate'
import type { AiApi } from '@/lib/gateway/ai'
import { ApiError } from '@/lib/gateway/client'
import { dataApi, type Doc } from '@/lib/gateway/data'
import { summarizeChanges } from '@/lib/model/diff'
import { emptyContent } from '@/lib/model/repo'
import { publishInstruction, requestReview } from '@/lib/model/service'
import { buildMatrix, buildTraining, cleanQuiz, flushTrainings, grade, MAX_QUESTIONS, saveTraining } from '@/lib/model/training'
import { localized } from '@/lib/model/translation'
import type { Instruction, InstructionContent, Operator, OrgSettings, QuizQuestion, Station, Training } from '@/lib/model/types'
import { fakeGateway } from './fakeClient'

const q = (id: string, answer = 0, extra: Partial<QuizQuestion> = {}): QuizQuestion => ({ id, question: `Question ${id} ?`, choices: ['Bon', 'Mauvais', 'Autre'], answer, ...extra })

const content = (quiz: QuizQuestion[] = [q('q1'), q('q2', 1)]): InstructionContent =>
  emptyContent({
    title: 'Changer la matrice',
    language: 'fr',
    safety: ['Cadenasser avant'],
    steps: [
      { id: 'st_1', title: 'Cadenasser', text: 'Couper et cadenasser la presse.', media: [], warning: { level: 'danger', text: 'Énergie résiduelle' } },
      { id: 'st_2', title: 'Serrer', text: 'Serrer à 45 N·m.', media: [], keyPoints: ['45 N·m, pas plus'] },
    ],
    quiz,
  })

describe('les questions, rendues sûres', () => {
  it('garde les ids, rattache l’étape par son numéro, et refuse ce qui ne se pose pas', () => {
    const raw = [
      { question: '  Quel couple ?  ', choices: ['45 N·m', '60 N·m', '30 N·m'], answer: 0, why: 'Écrit à l’étape 2.', step: 2 },
      { id: 'garde', question: 'Avant de commencer ?', choices: ['Cadenasser', 'Graisser'], answer: 0 },
      { question: '', choices: ['a', 'b'], answer: 0 },
      { question: 'Un seul choix ?', choices: ['a'], answer: 0 },
      { question: 'Bonne réponse absente ?', choices: ['a', 'b'], answer: 5 },
      'n’importe quoi',
    ]
    const quiz = cleanQuiz(raw, ['st_1', 'st_2'])
    expect(quiz.map((x) => x.question)).toEqual(['Quel couple ?', 'Avant de commencer ?'])
    expect(quiz[0]).toMatchObject({ stepId: 'st_2', why: 'Écrit à l’étape 2.', answer: 0 })
    expect(quiz[0].id).toMatch(/^qz_/)
    expect(quiz[1].id).toBe('garde')
  })

  it('un choix vide ou en double part, et la bonne réponse suit son texte', () => {
    const [x] = cleanQuiz([{ question: 'Q ?', choices: ['', 'Cadenasser', 'cadenasser', 'Graisser'], answer: 3 }])
    expect(x.choices).toEqual(['Cadenasser', 'Graisser'])
    expect(x.choices[x.answer]).toBe('Graisser')
    // Le bon choix, en double d'un autre : on garde le premier des deux.
    const [y] = cleanQuiz([{ question: 'Q ?', choices: ['Oui', 'Non', 'oui'], answer: 2 }])
    expect(y.choices[y.answer]).toBe('Oui')
    // Au plus quatre choix, et le bon doit en être.
    expect(cleanQuiz([{ question: 'Q ?', choices: ['a', 'b', 'c', 'd', 'e'], answer: 4 }])).toEqual([])
    expect(cleanQuiz([{ question: 'Q ?', choices: ['a', 'b', 'c', 'd', 'e'], answer: 1 }])[0].choices).toEqual(['a', 'b', 'c', 'd'])
  })

  it(`au plus ${MAX_QUESTIONS} questions`, () => {
    expect(cleanQuiz(Array.from({ length: 9 }, (_, i) => q(`q${i}`)))).toHaveLength(MAX_QUESTIONS)
  })
})

describe('la note', () => {
  const five = ['a', 'b', 'c', 'd', 'e'].map((id) => q(id))
  it('validée à 80 %, pas en dessous ; sans question, rien à valider', () => {
    expect(grade(five, { a: 0, b: 0, c: 0, d: 0, e: 1 })).toMatchObject({ score: 0.8, passed: true })
    expect(grade(five, { a: 0, b: 0, c: 0, d: 1, e: 1 })).toMatchObject({ score: 0.6, passed: false })
    expect(grade([], {})).toMatchObject({ passed: false })
  })

  it('une question sans réponse compte comme fausse', () => {
    const g = grade(five, { a: 0, b: 0, c: 0, d: 0 })
    expect(g.passed).toBe(true)
    expect(g.answers.find((x) => x.questionId === 'e')).toEqual({ questionId: 'e', choice: -1, correct: false })
  })
})

describe('la formation validée, sans réseau', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('attend dans l’appareil, puis part à la reprise', async () => {
    const tr = buildTraining([q('q1')], { q1: 0 }, { instructionId: 'i1', instructionTitle: 'Matrice', version: 3, stationId: 's1', language: 'fr', source: 'kiosk', operatorId: 'op1', operatorName: 'Julie' })
    expect(tr).toMatchObject({ passed: true, score: 1, version: 3, operatorId: 'op1' })
    const down = fakeGateway(() => new ApiError('hors ligne', 0, null))
    expect(await saveTraining(dataApi(down), tr)).toBe('queued')
    const up = fakeGateway(() => ({ results: [{ inserted_id: 't1', json_data: {} }] }))
    expect(await flushTrainings(dataApi(up))).toBe(1)
    expect(up.calls[0].endpoint).toBe('/api/v1/data/clip_training')
    expect((up.calls[0].options.body as { json_data: Training & { app_identifier: string } }).json_data).toMatchObject({ operatorName: 'Julie', app_identifier: 'clip-v3' })
    expect(await flushTrainings(dataApi(up))).toBe(0)
  })
})

describe('la matrice de compétences', () => {
  const op = (id: string, name: string): Doc<Operator> => ({ _id: id, json_data: { name } as Operator })
  const st = (id: string, name: string): Doc<Station> => ({ _id: id, json_data: { name } as Station })
  const instr = (id: string, over: Partial<Instruction>): Doc<Instruction> => ({ _id: id, json_data: { title: `Instruction ${id}`, status: 'published', publishedVersion: 2, publishedQuiz: 3, stationIds: ['presse'], ...over } as Instruction })
  const passed = (operatorId: string, instructionId: string, version: number): Doc<Training> => ({ _id: `${operatorId}${instructionId}${version}`, json_data: { operatorId, instructionId, version, passed: true } as Training })

  it('les postes qui ont quelque chose à apprendre, et l’état de chaque personne', () => {
    const m = buildMatrix(
      [op('julie', 'Julie'), op('kevin', 'Kevin'), op('nat', 'Nathalie')],
      [st('presse', 'Presse 3'), st('soudure', 'Soudure'), st('vide', 'Emballage')],
      [
        instr('a', {}),
        // Un changement important à la version 4 : les formations d'avant sont à refaire.
        instr('b', { publishedVersion: 4, trainingVersion: 4 }),
        instr('c', { stationIds: ['soudure'] }),
        // Ni question, ni publication, ni archivée : rien à apprendre.
        instr('d', { publishedQuiz: 0, stationIds: ['vide'] }),
        instr('e', { publishedVersion: 0, stationIds: ['vide'] }),
        instr('f', { status: 'archived', stationIds: ['vide'] }),
      ],
      [passed('julie', 'a', 2), passed('julie', 'b', 4), passed('julie', 'c', 1), passed('kevin', 'a', 1), passed('kevin', 'b', 3), passed('kevin', 'b', 2)],
    )
    expect(m.stations.map((s) => s.name)).toEqual(['Presse 3', 'Soudure'])
    expect(m.cells.julie.presse).toMatchObject({ state: 'done', done: 2 })
    expect(m.cells.julie.soudure.state).toBe('done')
    // Kevin a validé « a » (toute version compte, faute de changement important) et « b » avant la version 4.
    expect(m.cells.kevin.presse.state).toBe('outdated')
    expect(m.cells.kevin.presse.required.map((r) => r.state)).toEqual(['done', 'outdated'])
    expect(m.cells.kevin.soudure.state).toBe('none')
    expect(m.cells.nat.presse).toMatchObject({ state: 'none', done: 0 })
    // Les formations à faire : Kevin 2 (b à refaire, c), Nathalie 3.
    expect(m.gaps).toBe(5)
  })

  it('en partie : une instruction sur deux', () => {
    const m = buildMatrix([op('julie', 'Julie')], [st('presse', 'Presse 3')], [instr('a', {}), instr('b', {})], [passed('julie', 'a', 2)])
    expect(m.cells.julie.presse).toMatchObject({ state: 'partial', done: 1 })
  })
})

describe('publier et demander une approbation', () => {
  const doc = (over: Partial<Instruction> = {}): Doc<Instruction> => ({ _id: 'i1', json_data: { title: 'Matrice', status: 'draft', authorId: 'mel', stationIds: [], draft: content(), publishedVersion: 2, publishedId: 'p1', ...over } as Instruction })
  const org = { name: 'Usine', approval: { mode: 'one', approverIds: [], groups: [] } } as unknown as OrgSettings
  const gateway = () =>
    fakeGateway((endpoint, options) => {
      if (options.method === 'POST') return { results: [{ inserted_id: 'v3', json_data: {} }] }
      if (!options.method || options.method === 'GET') return { result: { _id: 'p1', json_data: { app_identifier: 'clip-v3' } } }
      return { success: true }
    })
  const instructionPatch = (gw: ReturnType<typeof gateway>) => gw.calls.filter((c) => c.options.method === 'PATCH' && c.endpoint.includes('clip_instruction')).at(-1)!.options.body as { json_data: Record<string, unknown> }

  it('« il faut se re-former » : les formations d’avant la nouvelle version ne comptent plus', async () => {
    const gw = gateway()
    const { number } = await publishInstruction(dataApi(gw), doc(), org, { id: 'mel', name: 'Mélanie' }, { training: { questions: 2, retrain: true } })
    expect(number).toBe(3)
    expect(instructionPatch(gw).json_data).toMatchObject({ publishedQuiz: 2, trainingVersion: 3 })
  })

  it('sans changement important, les formations restent ; toggle coupé, rien ne bouge', async () => {
    const gw = gateway()
    await publishInstruction(dataApi(gw), doc(), org, { id: 'mel', name: 'Mélanie' }, { training: { questions: 2, retrain: false } })
    expect(instructionPatch(gw).json_data).toMatchObject({ publishedQuiz: 2 })
    expect(instructionPatch(gw).json_data).not.toHaveProperty('trainingVersion')
    const off = gateway()
    await publishInstruction(dataApi(off), doc(), org, { id: 'mel', name: 'Mélanie' }, { training: null })
    expect(instructionPatch(off).json_data).not.toHaveProperty('publishedQuiz')
  })

  it('la demande d’approbation garde le choix de l’auteur', async () => {
    const gw = gateway()
    await requestReview(dataApi(gw), doc(), org, { id: 'mel', name: 'Mélanie' }, 'Nouveau couple', true)
    expect((instructionPatch(gw).json_data.review as { retrain?: boolean }).retrain).toBe(true)
    const plain = gateway()
    await requestReview(dataApi(plain), doc(), org, { id: 'mel', name: 'Mélanie' })
    expect(instructionPatch(plain).json_data.review).not.toHaveProperty('retrain')
  })

  it('le résumé de la version dit que les questions ont changé', () => {
    expect(summarizeChanges(content(), content([q('q1')]))).toBe('Questions de formation modifiées.')
  })
})

describe('les questions dans la langue de l’opérateur', () => {
  it('chaque énoncé, choix et pourquoi part à la traduction ; le bon choix garde son rang', () => {
    const c = content([q('q1', 1, { why: 'Parce que.' })])
    const ids = contentSegments(c).segments.map((s) => s.id)
    expect(ids).toEqual(expect.arrayContaining(['quiz:q1:q', 'quiz:q1:c:0', 'quiz:q1:c:1', 'quiz:q1:c:2', 'quiz:q1:why']))
    const tr = buildTranslation(c, { title: 'Matrix', summary: '', safety: [], steps: [], extras: [{ id: 'quiz:q1:q', text: 'Question q1?' }, { id: 'quiz:q1:c:1', text: 'Wrong' }] }, new Map())
    expect(tr.quiz).toEqual([{ id: 'q1', question: 'Question q1?', choices: ['Bon', 'Wrong', 'Autre'] }])
    const en = localized({ ...c, translations: { en: tr } }, 'en')
    expect(en.quiz?.[0]).toMatchObject({ id: 'q1', question: 'Question q1?', choices: ['Bon', 'Wrong', 'Autre'], answer: 1, why: 'Parce que.' })
    // Une question ajoutée après la traduction reste dans la langue d'origine.
    const later = localized({ ...c, quiz: [...c.quiz!, q('q2')], translations: { en: tr } }, 'en')
    expect(later.quiz?.[1].question).toBe('Question q2 ?')
  })
})

describe('l’IA prépare les questions', () => {
  it('opération « quiz », à partir des étapes ; rend des questions sûres', async () => {
    const ask = vi.fn(async () => ({ json: { questions: [{ question: 'Quel couple ?', choices: ['45 N·m', '60 N·m', '30 N·m'], answer: 0, why: 'Étape 2.', step: 2 }, { question: '', choices: [], answer: 0 }] } }))
    const quiz = await makeQuiz({ ask } as unknown as AiApi, content([]))
    expect(ask).toHaveBeenCalledWith('quiz', expect.objectContaining({ provider: 'google', json_schema: expect.any(Object) }), expect.objectContaining({ scope: 'quiz' }))
    expect(quiz).toHaveLength(1)
    expect(quiz[0].stepId).toBe('st_2')
    const prompt = quizPrompt(content([]))
    expect(prompt).toContain('2. Serrer — Serrer à 45 N·m. (points clés : 45 N·m, pas plus)')
    expect(prompt).toContain('danger : Énergie résiduelle')
  })

  it('rien d’utilisable : une erreur claire, pas une liste vide', async () => {
    const ask = vi.fn(async () => ({ json: { questions: [] } }))
    await expect(makeQuiz({ ask } as unknown as AiApi, content([]))).rejects.toThrow(/questions/)
  })
})
