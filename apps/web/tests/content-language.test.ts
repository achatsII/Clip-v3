import { afterEach, describe, expect, it, vi } from 'vitest'
import { askAgent } from '@/lib/ai/agent'
import { assistStep } from '@/lib/ai/assist'
import { generateInstruction } from '@/lib/ai/generate'
import { annotateSystem } from '@/lib/ai/prompts'
import type { AiApi } from '@/lib/gateway/ai'
import type { FilesApi } from '@/lib/gateway/files'
import { setLang } from '@/lib/i18n'
import { emptyContent } from '@/lib/model/repo'
import type { OrgSettings } from '@/lib/model/types'

afterEach(() => setLang('fr'))

const org = { standard: { rules: [], startWithSafety: true, maxWordsPerStep: 25, tone: 'infinitif', glossary: [] }, learnings: [] } as unknown as Pick<OrgSettings, 'standard' | 'learnings'>
const note = { id: 'n1', kind: 'note' as const, text: 'Serrer la vis à 25 N·m', createdAt: new Date().toISOString() }

/** Un faux assistant d'IA qui garde chaque demande et rend la réponse donnée. */
function fakeAi(json: unknown) {
  const ask = vi.fn(async () => ({ json, text: '', model: 'test' }))
  return { ai: { ask } as unknown as AiApi, ask, body: () => (ask.mock.calls.at(-1) as unknown as [string, { system_instruction: string; json_schema?: unknown }])[1] }
}

describe('la langue du contenu', () => {
  it('une instruction neuve s’écrit dans la langue de l’outil de son auteur', async () => {
    setLang('en')
    const f = fakeAi({ title: 'Tighten the screw', kind: 'procedure', steps: [{ title: 'Tighten the screw', text: 'To 25 N·m.' }] })
    const out = await generateInstruction({ ai: f.ai, files: {} as FilesApi, org, sources: [note], stationNames: [] })
    expect(f.body().system_instruction).toContain('anglais nord-américain')
    expect(out.content.language).toBe('en')
  })

  it('une régénération garde la langue de l’instruction déjà écrite', async () => {
    setLang('en')
    const f = fakeAi({ title: 'Serrer la vis', kind: 'procedure', steps: [{ title: 'Serrer la vis', text: 'À 25 N·m.' }] })
    const out = await generateInstruction({ ai: f.ai, files: {} as FilesApi, org, sources: [note], stationNames: [], language: 'fr' })
    expect(f.body().system_instruction).toContain('français québécois')
    expect(out.content.language).toBe('fr')
  })

  it('une retouche d’étape écrit dans la langue de l’instruction, et explique dans celle de l’outil', async () => {
    setLang('fr')
    const content = emptyContent({ language: 'en', steps: [{ id: 's1', title: 'Tighten the screw', text: 'To 25 N·m.', keyPoints: [], media: [] }] as never })
    const f = fakeAi({ title: 'Tighten the screw', text: 'To 25 N·m.', keyPoints: [], warningLevel: 'none', explanation: 'Plus court.' })
    await assistStep(f.ai, org, content, content.steps[0], 'Simplifie')
    const sys = f.body().system_instruction
    expect(sys).toContain('anglais nord-américain')
    expect(sys).toContain('français québécois')
  })

  it('l’assistant d’édition répond dans la langue de l’outil et écrit dans celle de l’instruction', async () => {
    setLang('en')
    const content = emptyContent({ language: 'fr' })
    const f = fakeAi({ reply: 'Done.', operations: [], suggestions: [] })
    await askAgent(f.ai, org, content, null, 'Shorten the title')
    const sys = f.body().system_instruction
    expect(sys).toMatch(/anglais|English/)
    expect(sys).toMatch(/français/)
  })

  it('les annotations de l’IA suivent la langue de l’étape', () => {
    expect(annotateSystem()).toContain('langue de l’étape')
    expect(annotateSystem()).not.toContain('Libellés en français')
  })
})
