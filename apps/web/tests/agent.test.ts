import { describe, expect, it, vi } from 'vitest'
import { agentPrompt, applyOp, askAgent, runAgentOps, type AgentLogEntry, type AgentOp } from '@/lib/ai/agent'
import { suggestEdits } from '@/lib/ai/suggest'
import type { AiApi } from '@/lib/gateway/ai'
import { emptyContent } from '@/lib/model/repo'
import type { InstructionContent } from '@/lib/model/types'

const content = (): InstructionContent =>
  emptyContent({
    title: 'Démarrer la presse',
    steps: [
      { id: 'st_a', title: 'Mettre les gants', text: 'Enfiler les gants anticoupure avant de toucher la matrice.', media: [{ kind: 'image', url: 'https://x/gants.jpg' }] },
      { id: 'st_b', title: 'Appuyer sur Démarrer', text: 'Appuyer sur le bouton vert.', media: [{ kind: 'image', url: 'https://x/panneau.jpg' }, { kind: 'image', url: 'https://x/mauvais.jpg' }] },
    ],
  })

describe('assistant d’édition : les actions', () => {
  it('une étape ajoutée garde l’identifiant choisi par l’IA pour la suite', () => {
    const ids = new Map<string, string>()
    let c = applyOp(content(), { op: 'add_step', id: 'n1', after: 'st_a', title: 'Vérifier le capot', text: 'Le capot est fermé.', warningLevel: 'caution', warningText: 'Capot ouvert : la presse ne démarre pas.' }, ids).content
    expect(c.steps.map((s) => s.title)).toEqual(['Mettre les gants', 'Vérifier le capot', 'Appuyer sur Démarrer'])
    expect(c.steps[1].warning).toEqual({ level: 'caution', text: 'Capot ouvert : la presse ne démarre pas.' })
    c = applyOp(c, { op: 'update_step', step: 'n1', text: 'Vérifier que le capot est bien fermé.' }, ids).content
    expect(c.steps[1].text).toBe('Vérifier que le capot est bien fermé.')
    c = applyOp(c, { op: 'move_step', step: 'n1', after: 'start' }, ids).content
    expect(c.steps[0].title).toBe('Vérifier le capot')
    c = applyOp(c, { op: 'delete_step', step: 'st_a' }, ids).content
    expect(c.steps.map((s) => s.id)).not.toContain('st_a')
  })

  it('à faire / à éviter : verdicts puis comparaison ; jamais de comparaison avec un seul média', () => {
    const ids = new Map<string, string>()
    let c = applyOp(content(), { op: 'set_media', step: 'st_b', media: 2, verdict: 'dont', caption: 'Doigt sur le rouge' }, ids).content
    c = applyOp(c, { op: 'set_layout', step: 'st_b', layout: 'compare' }, ids).content
    expect(c.steps[1].layout).toBe('compare')
    expect(c.steps[1].media[1]).toMatchObject({ verdict: 'dont', caption: 'Doigt sur le rouge' })
    expect(() => applyOp(c, { op: 'set_layout', step: 'st_a', layout: 'compare' }, ids)).toThrow(/deux médias/)
  })

  it('les EPI inconnus sont écartés ; une étape introuvable est refusée', () => {
    const c = applyOp(content(), { op: 'set_instruction', ppe: ['gants', 'cape-magique'] }, new Map()).content
    expect(c.ppe).toEqual(['gants'])
    expect(() => applyOp(content(), { op: 'update_step', step: 'st_zz', text: 'x' }, new Map())).toThrow(/introuvable/)
  })
})

describe('assistant d’édition : on le voit travailler', () => {
  it('chaque action va à son étape, l’annotation passe par une IA qui voit la photo, et un échec n’arrête pas la suite', async () => {
    const ask = vi.fn(async (_op: string, _body: unknown) => ({ json: { marks: [{ label: 'Démarrer', shape: 'circle', box: [100, 100, 300, 300], color: 'green' }] }, text: '', model: 'm', usage: null }))
    const ai = { ask } as unknown as AiApi
    let c = content()
    const focus: Array<string | null> = []
    const log: AgentLogEntry[] = []
    const ops: AgentOp[] = [
      { op: 'annotate', step: 'st_b', request: 'encercle le bouton vert et écris Démarrer' },
      { op: 'update_step', step: 'st_inconnue', text: 'x' },
      { op: 'update_step', step: 'st_a', title: 'Mettre les gants anticoupure' },
    ]
    const r = await runAgentOps(ops, { ai, get: () => c, set: (n) => (c = n), focus: (id) => focus.push(id), log: (e) => log.push(e), pause: async () => undefined })
    expect(r).toEqual({ done: 2, failed: 1 })
    expect(ask.mock.calls[0][0]).toBe('annotate')
    const img = c.steps[1].media[0]
    expect(img.kind === 'image' && img.annotations?.[0]).toMatchObject({ type: 'circle', color: 'green', text: 'Démarrer' })
    expect(c.steps[0].title).toBe('Mettre les gants anticoupure')
    expect(focus).toContain('st_b')
    expect(focus).toContain('st_a')
    expect(log.filter((e) => e.state === 'error')).toHaveLength(1)
  })

  it('l’IA reçoit les étapes avec leur identifiant et l’étape regardée ; les opérations inconnues sont écartées', async () => {
    const ask = vi.fn(async (_op: string, _body: unknown) => ({ json: { reply: 'C’est fait.', operations: [{ op: 'update_step', step: 'st_a', text: 'Court.' }, { op: 'formater_disque' }], suggestions: ['Raccourcis l’étape 2'] }, text: '', model: 'm', usage: null }))
    const turn = await askAgent({ ask } as unknown as AiApi, {} as never, content(), 'st_b', 'raccourcis cette étape')
    expect(ask.mock.calls[0][0]).toBe('edit_agent')
    const prompt = (ask.mock.calls[0][1] as unknown as { prompt: string }).prompt
    expect(prompt).toContain('[st_b]')
    expect(prompt).toContain('La personne regarde l’étape 2')
    expect(turn.operations).toEqual([{ op: 'update_step', step: 'st_a', text: 'Court.' }])
    expect(agentPrompt(content(), null, 'x')).toContain('médias : 1 photo ; 2 photo')
  })
})

describe('suggestions propres à l’instruction', () => {
  it('l’étape regardée d’abord, puis ce qui manque à l’instruction', () => {
    const list = suggestEdits(content(), { startWithSafety: true, maxWordsPerStep: 25 }, 'st_b')
    expect(list[0]).toBe('Encercle ce qu’il faut regarder à l’étape 2')
    expect(list).toContain('Indique les EPI à porter')
    expect(list.length).toBeLessThanOrEqual(4)
  })
})
