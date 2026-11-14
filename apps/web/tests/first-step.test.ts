/**
 * La première étape au choix de l'usine : le premier geste, la sécurité, ou une étape qu'elle
 * décrit. Ce qui compte : la consigne qui part à l'IA (sur l'appareil comme au serveur, la même), et
 * qu'une usine qui n'a jamais rien choisi garde exactement son comportement d'avant.
 */
import { describe, expect, it, vi } from 'vitest'
import { suggestStandard } from '@/lib/ai/assist'
import { generationSystem, standardBlock } from '@/lib/ai/prompts'
import { suggestEdits } from '@/lib/ai/suggest'
import type { AiApi } from '@/lib/gateway/ai'
import { messages } from '@/lib/i18n'
import { cleanFirstStepText, FIRST_STEP_MAX, firstStepOf, withFirstStep } from '@/lib/model/firstStep'
import { defaultOrg, defaultStandard, normalizeOrg } from '@/lib/model/repo'
import type { InstructionContent, WritingStandard } from '@/lib/model/types'

const SAFETY_LINE = 'La première étape est toujours une étape de sécurité'
const WORK_LINE = 'Pas d’étape d’introduction pour les EPI'

/** Un standard enregistré avant ce choix : seulement `startWithSafety`. */
const legacy = (startWithSafety: boolean): WritingStandard => ({ ...defaultStandard(), startWithSafety })
const prompt = (standard: WritingStandard) => standardBlock({ standard, learnings: [] })

describe('ce par quoi commence une instruction', () => {
  it('une usine qui n’a jamais choisi garde son réglage d’avant', () => {
    expect(firstStepOf(legacy(true))).toEqual({ kind: 'safety', text: '' })
    expect(firstStepOf(legacy(false))).toEqual({ kind: 'work', text: '' })
    // Le cas réel en QA : le standard enregistré n'a que startWithSafety, et l'app le complète.
    const stored = { name: 'Usine', standard: { rules: ['Une action par étape.'], startWithSafety: true, version: 1 } }
    const org = normalizeOrg(stored as never)
    expect(firstStepOf(org.standard).kind, 'le complément par défaut ne change rien').toBe('safety')
    expect(prompt(org.standard)).toContain(SAFETY_LINE)
  })

  it('une usine neuve commence par le premier geste : les EPI s’affichent déjà avant de commencer', () => {
    expect(firstStepOf(defaultOrg('Neuve').standard)).toEqual({ kind: 'work', text: '' })
  })

  it('le choix enregistré l’emporte sur l’ancien réglage', () => {
    expect(firstStepOf({ ...legacy(true), firstStep: 'work' }).kind).toBe('work')
    expect(firstStepOf({ ...legacy(false), firstStep: 'safety' }).kind).toBe('safety')
    expect(firstStepOf({ ...legacy(true), firstStep: 'bidon' as never }).kind, 'un choix illisible : l’ancien réglage').toBe('safety')
  })

  it('« Autre chose » : la phrase de l’usine, propre ; sans phrase, rien n’est imposé', () => {
    expect(firstStepOf({ ...legacy(false), firstStep: 'custom', firstStepText: '  Vérifier le\n« bon de travail »  ' })).toEqual({ kind: 'custom', text: 'Vérifier le bon de travail' })
    expect(firstStepOf({ ...legacy(true), firstStep: 'custom', firstStepText: '   ' })).toEqual({ kind: 'work', text: '' })
    expect(cleanFirstStepText('x'.repeat(500))).toHaveLength(FIRST_STEP_MAX)
  })

  it('enregistrer un choix tient l’ancien réglage à jour, et garde la phrase d’« Autre chose »', () => {
    const custom = withFirstStep(legacy(true), 'custom', 'Vérifier le bon de travail')
    expect(custom).toMatchObject({ firstStep: 'custom', firstStepText: 'Vérifier le bon de travail', startWithSafety: false })
    const safety = withFirstStep(custom, 'safety')
    expect(safety).toMatchObject({ firstStep: 'safety', startWithSafety: true, firstStepText: 'Vérifier le bon de travail' })
    expect(firstStepOf(withFirstStep(safety, 'custom'))).toEqual({ kind: 'custom', text: 'Vérifier le bon de travail' })
  })
})

describe('la consigne qui part à l’IA', () => {
  it('la sécurité : une étape EPI et risques en premier', () => {
    expect(prompt(withFirstStep(defaultStandard(), 'safety'))).toContain(SAFETY_LINE)
  })

  it('le premier geste : la consigne interdit l’étape EPI ajoutée par habitude', () => {
    const p = prompt(withFirstStep(legacy(true), 'work'))
    expect(p).toContain(WORK_LINE)
    expect(p).toContain('La première étape est le premier geste du travail')
    expect(p).not.toContain(SAFETY_LINE)
  })

  it('autre chose : la phrase de l’usine, et une fiche de cadenassage garde son ordre', () => {
    const p = prompt(withFirstStep(legacy(true), 'custom', 'Vérifier le bon de travail et le numéro de lot'))
    expect(p).toContain('La première étape est toujours : « Vérifier le bon de travail et le numéro de lot »')
    expect(p).toContain('une fiche de cadenassage garde son ordre')
    expect(p).not.toContain(SAFETY_LINE)
    expect(p).not.toContain(WORK_LINE)
  })

  it('la consigne entière de génération (appareil et serveur) porte le choix', () => {
    const org = { standard: withFirstStep(defaultStandard(), 'custom', 'Lire la fiche de lot'), learnings: [] }
    expect(generationSystem(org, { language: 'fr' })).toContain('« Lire la fiche de lot »')
    expect(generationSystem({ standard: withFirstStep(defaultStandard(), 'work'), learnings: [] }, { language: 'fr' })).toContain(WORK_LINE)
  })
})

describe('les suggestions de l’éditeur', () => {
  const content = { language: 'fr', ppe: ['gants'], steps: [{ id: 's1', title: 'Retirer le garde', text: 'Dévisser les quatre vis.', keyPoints: [], media: [], warning: null }] } as unknown as InstructionContent
  const asks = (standard: Parameters<typeof suggestEdits>[1]) => suggestEdits(content, standard).includes(messages().editor.suggestions.startWithSafety)

  it('rappellent l’étape de sécurité seulement à l’usine qui la veut', () => {
    expect(asks(withFirstStep(defaultStandard(), 'safety'))).toBe(true)
    expect(asks({ startWithSafety: true, maxWordsPerStep: 20 }), 'ancien réglage').toBe(true)
    expect(asks(withFirstStep(defaultStandard(), 'work'))).toBe(false)
    expect(asks(withFirstStep(defaultStandard(), 'custom', 'Vérifier le bon de travail'))).toBe(false)
  })
})

describe('« Décrire à l’IA » propose aussi la première étape', () => {
  const answer = (over: Record<string, unknown>) =>
    ({ ask: vi.fn(async () => ({ json: { rules: ['Une action par étape.'], firstStep: 'custom', firstStepText: 'Vérifier le bon de travail', maxWordsPerStep: 18, tone: 'vous', glossary: [], explanation: 'Retenu.', ...over }, model: 'g' })) }) as unknown as AiApi

  it('la proposition porte le choix et la phrase ; le standard actuel part avec son choix', async () => {
    const ai = answer({})
    const r = await suggestStandard(ai, 'On commence toujours par vérifier le bon de travail.', legacy(true), 'fr')
    expect(r.proposal).toMatchObject({ firstStep: 'custom', firstStepText: 'Vérifier le bon de travail', startWithSafety: false, tone: 'vous', maxWordsPerStep: 18 })
    const sent = (ai.ask as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(sent.prompt).toContain('"firstStep":"safety"')
    expect(sent.json_schema.required).toContain('firstStep')
  })

  it('un choix illisible garde celui d’aujourd’hui ; « autre chose » sans phrase n’impose rien', async () => {
    expect((await suggestStandard(answer({ firstStep: 'peut-être' }), 'x', legacy(true), 'fr')).proposal).toMatchObject({ firstStep: 'safety', startWithSafety: true })
    expect((await suggestStandard(answer({ firstStepText: '' }), 'x', legacy(true), 'fr')).proposal).toMatchObject({ firstStep: 'work', startWithSafety: false })
  })
})
