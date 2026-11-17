/**
 * L'IA qui apprend des corrections (toggle `learnFromEdits`) : la version de l'IA gardée à la
 * génération, comparée à la première publication ; des règles proposées quand une habitude revient
 * (pour moi ou pour l'usine) ; des préférences personnelles versionnées ; des instructions modèles ;
 * et ce que l'IA en lit.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/bridge/native', () => ({ inNativeShell: () => false, hasCapability: () => false, callNative: vi.fn(async () => ({})), nativeEnv: () => null, onNativeEvent: () => () => undefined }))
vi.mock('@/lib/ai/generate', async (orig) => ({ ...(await orig<typeof import('@/lib/ai/generate')>()), generateInstruction: vi.fn(), enrichMedia: vi.fn(async (c: unknown) => c) }))
vi.mock('@/lib/realtime/client', () => ({ publishRealtime: vi.fn() }))
const session = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('@/components/providers/Session', () => ({ useSession: () => session.value }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => toast }))
vi.mock('@/lib/toggles', () => ({ useToggle: () => true }))

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LearningCard } from '@/components/learning/LearningCard'
import { generateInstruction } from '@/lib/ai/generate'
import { clearJob } from '@/lib/ai/jobs'
import { rulesFromEdits, rulesFromModel } from '@/lib/ai/learn'
import { generationSystem, standardBlock } from '@/lib/ai/prompts'
import { startGeneration } from '@/lib/ai/runGeneration'
import { AI_OPERATIONS, type AiApi } from '@/lib/gateway/ai'
import type { DataApi } from '@/lib/gateway/data'
import { MIN_RECORDS, proposeRules, type Proposal } from '@/lib/learning/proposals'
import { editSignals, snapshotOf, wordSwaps, type EditSignals } from '@/lib/learning/signals'
import { applyToStandard, exampleOf, nextStandard, readPersonal, recordEdits, savePersonal, withExample } from '@/lib/learning/store'
import { defaultStandard, T } from '@/lib/model/repo'
import type { Instruction, InstructionContent, PersonalWriting, Step } from '@/lib/model/types'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

beforeEach(() => localStorage.setItem('clip_pref_ui_lang', 'fr'))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const step = (id: string, title: string, text: string, extra: Partial<Step> = {}): Step => ({ id, title, text, keyPoints: [], warning: null, media: [], ...extra })
const long = 'Placer la clé sur le boulon puis tourner lentement dans le sens horaire jusqu’au déclic en tenant la pièce'

/** Une correction type : textes raccourcis, un mot remplacé, les points clés retirés. */
function signalsLike(over: Partial<EditSignals> = {}): EditSignals {
  return { steps: [6, 6], words: [20, 11], titleWords: [3, 3], keyPoints: [4, 1], warnings: [1, 1], matched: 6, changed: 5, swaps: [{ from: 'visser', to: 'serrer', n: 2 }], examples: [{ before: 'a', after: 'b' }], ...over }
}

describe('ce que la personne corrige', () => {
  it('allumé par le serveur ; le repli ne l’active jamais', () => {
    expect(DEFAULT_TOGGLES.learnFromEdits).toBe(true)
    expect(FALLBACK_TOGGLES.learnFromEdits).toBe(false)
    expect(AI_OPERATIONS).toContain('learn_rules')
  })

  it('le texte seulement, sans les étapes d’un bloc commun ; un mot remplacé par un autre se repère', () => {
    const c = { title: 'T', steps: [step('a', 'Visser', 'x'), step('b', 'Cadenasser', 'y', { fromBlock: { id: 'blk', version: 1, title: 'Cadenasser' } } as unknown as Partial<Step>)] }
    expect(snapshotOf(c).steps.map((s) => s.title)).toEqual(['Visser'])
    expect(wordSwaps('Visser le couvercle avec la clé', 'Serrer le couvercle avec la clé')).toEqual([{ from: 'visser', to: 'serrer' }])
    expect(wordSwaps('Ouvrir la vanne principale lentement', 'Ouvrir la vanne principale')).toEqual([])
  })

  it('compare la version de l’IA à la version publiée : longueurs, points clés, mises en garde, étapes, mots remplacés', () => {
    const before = snapshotOf({ title: 'T', steps: [step('1', 'Visser le couvercle', long, { keyPoints: ['Sens horaire', 'Tenir la pièce'] }), step('2', 'Visser la plaque', long, { keyPoints: ['Au déclic'] })] })
    const after = snapshotOf({
      title: 'T',
      steps: [step('1', 'Serrer le couvercle', 'Tourner jusqu’au déclic.', { warning: { level: 'caution', text: 'Pincement' } }), step('2', 'Serrer la plaque', 'Tourner jusqu’au déclic.'), step('3', 'Vérifier', 'Le couvercle ne bouge plus.')],
    })
    const s = editSignals(before, after)
    expect(s.steps).toEqual([2, 3])
    expect(s.words[1]).toBeLessThan(s.words[0])
    expect(s.keyPoints).toEqual([3, 0])
    expect(s.warnings).toEqual([0, 1])
    expect(s.matched).toBe(2)
    expect(s.swaps[0]).toMatchObject({ from: 'visser', to: 'serrer', n: 2 })
    expect(s.examples[0].after).toContain('Serrer le couvercle')
  })
})

describe('les règles proposées', () => {
  const ctx = { maxWordsPerStep: 25, rules: [], glossary: [] }

  it('rien avant trois instructions corrigées', () => {
    expect(MIN_RECORDS).toBe(3)
    expect(proposeRules([signalsLike(), signalsLike()], ctx)).toEqual([])
  })

  it('une habitude qui revient devient une règle : la longueur gardée, le mot de l’usine, moins de points clés', () => {
    const list = proposeRules([signalsLike(), signalsLike(), signalsLike(), signalsLike({ words: [20, 19], keyPoints: [2, 2], swaps: [] })], ctx, 5)
    const keys = list.map((p) => p.key)
    expect(keys).toContain('shorter:13')
    expect(keys).toContain('term:visser>serrer')
    expect(keys).toContain('fewerKeyPoints')
    const shorter = list.find((p) => p.kind === 'shorter')!
    expect(shorter).toMatchObject({ maxWords: 13, count: 3, of: 4, rule: 'Au plus 13 mots par texte d’étape.', seen: 'Vous raccourcissez les textes de l’IA' })
    expect(list.find((p) => p.kind === 'term')!.term).toEqual({ term: 'serrer', meaning: 'à écrire plutôt que « visser »' })
  })

  it('une proposition répondue, une règle déjà écrite ou un terme déjà connu ne reviennent pas', () => {
    const records = [signalsLike(), signalsLike(), signalsLike()]
    const list = proposeRules(records, { maxWordsPerStep: 25, rules: ['Au plus un point clé par étape, seulement s’il évite une erreur.'], glossary: [{ term: 'serrer' }], answered: { 'shorter:13': 'no' } }, 5)
    expect(list.map((p) => p.kind)).toEqual([])
  })

  it('pour l’usine : le nombre de mots, un terme du vocabulaire, ou une règle ; une nouvelle version, l’ancienne gardée', () => {
    const std = defaultStandard()
    expect(applyToStandard(std, { rule: 'x', maxWords: 13 }).maxWordsPerStep).toBe(13)
    expect(applyToStandard(std, { rule: 'x', term: { term: 'serrer', meaning: 'm' } }).glossary.at(-1)).toEqual({ term: 'serrer', meaning: 'm' })
    expect(applyToStandard(std, { rule: 'Titres courts.' }).rules.at(-1)).toBe('Titres courts.')
    const next = nextStandard({ standard: std, standardHistory: [] }, applyToStandard(std, { rule: 'Titres courts.' }), 'Mélanie')
    expect(next.standard.version).toBe(std.version + 1)
    expect(next.standard.updatedByName).toBe('Mélanie')
    expect(next.standardHistory[0]).toBe(std)
  })
})

describe('mes préférences, versionnées', () => {
  function memory() {
    const docs: Array<{ _id: string; json_data: PersonalWriting }> = []
    return {
      docs,
      insert: vi.fn(async (_t: string, json: PersonalWriting) => {
        const d = { _id: `w${docs.length + 1}`, json_data: json }
        docs.push(d)
        return d
      }),
      patch: vi.fn(async (_t: string, id: string, p: Partial<PersonalWriting>) => {
        const d = docs.find((x) => x._id === id)!
        d.json_data = { ...d.json_data, ...p }
      }),
    }
  }

  it('une règle qui change fait une nouvelle version ; l’ancienne reste, dix au plus ; le reste suit sans version', async () => {
    const data = memory()
    let doc = await savePersonal(data as unknown as DataApi, null, 'u1', { rules: ['Nommer l’outil dans le titre'] })
    expect(doc.json_data).toMatchObject({ userId: 'u1', version: 1, history: [] })
    doc = await savePersonal(data as unknown as DataApi, doc, 'u1', { rules: ['Nommer l’outil dans le titre', ' Textes courts '] })
    expect(doc.json_data.version).toBe(2)
    expect(doc.json_data.rules).toEqual(['Nommer l’outil dans le titre', 'Textes courts'])
    expect(doc.json_data.history[0]).toMatchObject({ version: 1, rules: ['Nommer l’outil dans le titre'] })
    doc = await savePersonal(data as unknown as DataApi, doc, 'u1', { answered: { longer: 'no' } })
    expect(doc.json_data.version).toBe(2)
    expect(data.patch).toHaveBeenLastCalledWith(T.writing, 'w1', expect.objectContaining({ answered: { longer: 'no' }, version: 2 }))
    expect(readPersonal(undefined, 'u2')).toMatchObject({ rules: [], examples: [], answered: {} })
  })

  it('une instruction modèle : son titre, pourquoi, et trois étapes (celles à point clé d’abord, dans l’ordre)', () => {
    const c = { title: 'Changer le filtre', steps: [step('1', 'Couper', 'a'), step('2', 'Ouvrir', 'b', { keyPoints: ['Lentement'] }), step('3', 'Retirer', 'c'), step('4', 'Poser', 'd', { keyPoints: ['Joint neuf'] }), step('5', 'Fermer', 'e')] }
    const ex = exampleOf('i1', c, 'Textes courts', 'Mélanie')
    expect(ex.steps.map((s) => s.title)).toEqual(['Couper', 'Ouvrir', 'Poser'])
    expect(withExample([ex, { ...ex, instructionId: 'i2' }], { ...ex, title: 'Nouveau' }, 2).map((x) => [x.instructionId, x.title])).toEqual([
      ['i2', 'Changer le filtre'],
      ['i1', 'Nouveau'],
    ])
  })
})

describe('de la génération à la première publication', () => {
  afterEach(() => clearJob('g1'))
  const doc = { _id: 'g1', json_data: { title: 'Changer le filtre', status: 'draft', stationIds: [], sources: [], draft: null, publishedVersion: null, authorId: 'u1', authorName: 'Mélanie' } as unknown as Instruction }
  const content = { title: 'Changer le filtre', summary: '', kind: 'procedure', category: 'maintenance', tags: [], steps: [step('s1', 'Visser le couvercle', long)] } as unknown as InstructionContent

  it('la génération garde le texte de sa version, seulement avec la fonction allumée', async () => {
    vi.mocked(generateInstruction).mockResolvedValue({ content, marks: [], sources: [], model: 'm', operation: 'generate_s', questions: [], stationGuess: null } as never)
    const patch = vi.fn(async (_t: string, _id: string, _p: Record<string, unknown>) => undefined)
    await startGeneration({ doc, data: { patch } as never, files: { upload: vi.fn() } as never, ai: {} as never, org: {} as never, stations: [], actor: { id: 'u1', name: 'Mélanie' }, autoAnnotate: false, learn: true })
    const saved = patch.mock.calls.at(-1)![2] as { generation: Instruction['generation'] }
    expect(saved.generation?.original).toEqual({ title: 'Changer le filtre', steps: [{ title: 'Visser le couvercle', text: long, keyPoints: [], warning: null }] })
    clearJob('g1')
    patch.mockClear()
    await startGeneration({ doc, data: { patch } as never, files: { upload: vi.fn() } as never, ai: {} as never, org: {} as never, stations: [], actor: { id: 'u1', name: 'Mélanie' }, autoAnnotate: false })
    expect((patch.mock.calls.at(-1)![2] as { generation: Instruction['generation'] }).generation?.original).toBeUndefined()
  })

  it('à la première publication, ce qui a été corrigé part dans clip_edit et la version de l’IA s’efface ; une seule fois', async () => {
    const insert = vi.fn(async () => ({ _id: 'e1', json_data: {} }))
    const patch = vi.fn(async () => undefined)
    const generated = { ...doc, json_data: { ...doc.json_data, generation: { at: '', model: null, operation: 'generate_s', original: snapshotOf(content) } } } as typeof doc
    const signals = await recordEdits({ insert, patch } as unknown as DataApi, generated, { title: 'Changer le filtre', steps: [step('s1', 'Serrer le couvercle', 'Tourner jusqu’au déclic.')] }, { id: 'u1', name: 'Mélanie' })
    expect(signals?.swaps[0]).toMatchObject({ from: 'visser', to: 'serrer' })
    expect(insert).toHaveBeenCalledWith(T.edit, expect.objectContaining({ instructionId: 'g1', userId: 'u1', userName: 'Mélanie' }), expect.any(String))
    expect(patch).toHaveBeenCalledWith(T.instruction, 'g1', expect.objectContaining({ 'generation.original': null }))
    const learned = { ...generated, json_data: { ...generated.json_data, generation: { ...generated.json_data.generation!, learnedAt: 'x' } } }
    expect(await recordEdits({ insert, patch } as unknown as DataApi, learned, content, { id: 'u1', name: 'M' })).toBeNull()
  })
})

describe('ce que l’IA lit', () => {
  it('le standard de l’usine d’abord, ses modèles (le style, jamais le contenu), puis les préférences de la personne', () => {
    const std = { ...defaultStandard(), examples: [exampleOf('i1', { title: 'Changer le filtre', steps: [step('1', 'Couper', 'Sectionneur à OFF.', { keyPoints: ['Cadenas'] })] }, 'Textes courts')] }
    const personal = { ...readPersonal(undefined, 'u1'), rules: ['Nommer l’outil dans le titre'], learnings: [{ text: 'Moins de mises en garde', at: '' }] }
    const block = standardBlock({ standard: std, learnings: [], personal })
    const order = ['STANDARD DE RÉDACTION DE L’USINE', 'INSTRUCTIONS MODÈLES', '« Changer le filtre » — un modèle pour : Textes courts', '1. Couper — Sectionneur à OFF. (points clés : Cadenas)', 'PRÉFÉRENCES DE LA PERSONNE QUI RÉDIGE', '- Nommer l’outil dans le titre', '- Moins de mises en garde'].map((x) => block.indexOf(x))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(standardBlock({ standard: defaultStandard(), learnings: [] })).not.toContain('PRÉFÉRENCES DE LA PERSONNE')
    expect(generationSystem({ standard: std, learnings: [], personal }, { language: 'fr' })).toContain('Nommer l’outil dans le titre')
  })

  it('« Prendre comme modèle » et « Analyser avec l’IA » : des règles de style, jamais une règle déjà écrite', async () => {
    const ask = vi.fn(async (_op: string, _body: Record<string, unknown>) => ({ json: { rules: ['Textes courts.', ' Un verbe au début de chaque titre. ', 'Textes courts.'], explanation: 'Style sobre.' }, text: '', model: 'm' }))
    const ai = { ask } as unknown as AiApi
    const r = await rulesFromModel(ai, { title: 'Changer le filtre', steps: [step('1', 'Couper', 'a')] }, { qualities: ['Textes courts'], why: 'chaque étape dit quoi vérifier', current: ['Textes courts.'], language: 'fr' })
    expect(r.rules).toEqual(['Un verbe au début de chaque titre.'])
    expect(ask.mock.calls[0][0]).toBe('learn_rules')
    expect(String(ask.mock.calls[0][1].prompt)).toContain('chaque étape dit quoi vérifier')
    const e = await rulesFromEdits(ai, [{ before: 'Visser — long', after: 'Serrer — court' }], { current: [], language: 'fr' })
    expect(e.rules.length).toBeLessThanOrEqual(3)
    expect(String(ask.mock.calls[1][1].prompt)).toContain('AVANT : Visser — long')
  })
})

describe('la carte après une publication', () => {
  const proposal: Proposal = { key: 'shorter:13', kind: 'shorter', seen: 'Vous raccourcissez les textes de l’IA', count: 3, of: 4, rule: 'Au plus 13 mots par texte d’étape.', maxWords: 13 }
  function setup(admin: boolean) {
    const insert = vi.fn(async (_t: string, json: unknown) => ({ _id: 'w1', json_data: json }))
    const patch = vi.fn(async () => undefined)
    const updateOrg = vi.fn(async (_patch: Record<string, unknown>) => undefined)
    session.value = { data: { insert, patch, filter: vi.fn(async () => []) }, org: { json_data: { standard: defaultStandard(), standardHistory: [], learningAnswered: {} } }, updateOrg, displayName: 'Mélanie', profile: { userId: 'u1' }, can: () => admin }
    const onClose = vi.fn()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LearningCard proposals={[proposal]} onClose={onClose} />
      </QueryClientProvider>,
    )
    return { insert, updateOrg, onClose }
  }

  it('ce que CLIP a remarqué, la règle ; « Oui, pour moi » la garde dans mes préférences', async () => {
    const { insert, onClose } = setup(false)
    expect(screen.getByText(/Vous raccourcissez les textes de l’IA/)).toBeTruthy()
    expect(screen.getByText(/3 instructions sur 4/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Pour toute l’usine' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Oui, pour moi' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(insert).toHaveBeenCalledWith(T.writing, expect.objectContaining({ rules: ['Au plus 13 mots par texte d’étape.'], answered: { 'shorter:13': 'yes' } }), expect.any(String))
  })

  it('qui règle l’usine peut la garder pour toute l’usine : une nouvelle version du standard', async () => {
    const { updateOrg } = setup(true)
    fireEvent.click(screen.getByRole('button', { name: 'Pour toute l’usine' }))
    await waitFor(() => expect(updateOrg).toHaveBeenCalled())
    const patch = updateOrg.mock.calls[0][0] as unknown as { standard: { maxWordsPerStep: number; version: number }; learningAnswered: Record<string, string> }
    expect(patch.standard.maxWordsPerStep).toBe(13)
    expect(patch.learningAnswered).toEqual({ 'shorter:13': 'yes' })
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/^Ajouté au standard de l’usine/))
  })
})
