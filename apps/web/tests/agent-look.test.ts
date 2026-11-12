import { describe, expect, it, vi } from 'vitest'
import { agentSystem, agentTurn, runAgentOps, sourcesBlock, type AgentLogEntry } from '@/lib/ai/agent'
import type { AiApi } from '@/lib/gateway/ai'
import type { FilesApi } from '@/lib/gateway/files'
import { emptyContent } from '@/lib/model/repo'
import type { InstructionContent, Source } from '@/lib/model/types'

const now = new Date().toISOString()
const sources: Source[] = [
  { id: 'v1', kind: 'video', url: 'https://x/v1.mp4', durationSec: 140, name: 'presse.mov', mimeType: 'video/quicktime', createdAt: now },
  { id: 'a1', kind: 'audio', url: 'https://x/a1.m4a', durationSec: 40, text: 'Le couple de serrage est de vingt-cinq newtons-mètres.', createdAt: now },
  { id: 'p1', kind: 'photo', url: 'https://x/p1.jpg', name: 'panneau.jpg', createdAt: now },
]
const content = (): InstructionContent =>
  emptyContent({ title: 'Démarrer la presse', steps: [{ id: 'st_a', title: 'Serrer les vis', text: 'Serrer les quatre vis.', keyPoints: [], warning: null, media: [] }] })
const org = { standard: { rules: [], startWithSafety: true, maxWordsPerStep: 25, tone: 'infinitif', glossary: [] }, learnings: [] } as never

/** Un faux assistant qui rend, dans l'ordre, les réponses données ; il garde chaque demande. */
function fakeAi(...replies: unknown[]) {
  const ask = vi.fn(async (_op: string, _body: Record<string, unknown>) => ({ json: replies.shift(), text: '', model: 'm' }))
  return { ai: { ask } as unknown as AiApi, ask }
}
const fakeFiles = () => ({ geminiUpload: vi.fn(async () => ({ uri: 'gemini://v1', expiresAt: new Date(Date.now() + 40 * 3600_000).toISOString() })) }) as unknown as FilesApi & { geminiUpload: ReturnType<typeof vi.fn> }

describe('l’assistant revoit les médias seulement quand il le faut', () => {
  it('une tâche simple : un seul tour, sur le texte, sans aucun média joint', async () => {
    const f = fakeAi({ reply: 'Fait.', operations: [{ op: 'update_step', step: 'st_a', text: 'Serrer les 4 vis.' }], suggestions: [] })
    const files = fakeFiles()
    const onLook = vi.fn()
    const turn = await agentTurn({ ai: f.ai, files, org, content: content(), focusStepId: null, request: 'Écris 4 en chiffres', sources, onLook })
    expect(f.ask).toHaveBeenCalledTimes(1)
    expect(f.ask.mock.calls[0][0]).toBe('edit_agent')
    expect(f.ask.mock.calls[0][1].files).toBeUndefined()
    expect(turn.operations).toHaveLength(1)
    expect(onLook).not.toHaveBeenCalled()
    expect(files.geminiUpload).not.toHaveBeenCalled()
  })

  it('le texte des notes et des transcriptions est déjà là : il n’y a rien à revoir pour ce qui a été dit', async () => {
    const f = fakeAi({ reply: 'Ajouté.', operations: [], suggestions: [] })
    await agentTurn({ ai: f.ai, files: fakeFiles(), org, content: content(), focusStepId: null, request: 'Ajoute le couple dit', sources })
    const prompt = String(f.ask.mock.calls[0][1].prompt)
    expect(prompt).toContain('S2 — note vocale, 40 s, transcription : « Le couple de serrage est de vingt-cinq newtons-mètres. »')
    expect(prompt).toContain('S1 — vidéo, 2 min 20 s, « presse.mov »')
    expect(agentSystem(org, { ui: 'fr', content: 'fr' })).toContain('Revoir des sources (look) coûte du temps et des crédits')
  })

  it('une demande qui exige de voir : un deuxième tour avec la vidéo jointe, en basse définition, au prix de sa taille', async () => {
    const f = fakeAi(
      { reply: 'Je regarde la vidéo.', operations: [{ op: 'look', sources: ['S1'], question: 'Où l’opérateur serre-t-il les vis ?' }], suggestions: [] },
      { reply: 'J’ai mis le bon moment.', operations: [{ op: 'look', sources: ['S1'] }, { op: 'use_media', step: 'st_a', source: 'S1', start: 42, end: 50 }], suggestions: [] },
    )
    const files = fakeFiles()
    const onLook = vi.fn()
    const onSources = vi.fn()
    const turn = await agentTurn({ ai: f.ai, files, org, content: content(), focusStepId: null, request: 'Mets la vidéo du serrage à l’étape 1', sources, onLook, onSources })
    expect(f.ask).toHaveBeenCalledTimes(2)
    const [op, body] = f.ask.mock.calls[1]
    expect(op).toBe('look_s')
    expect(body.mediaResolution).toBe('low')
    expect(body.files).toEqual([{ geminiFileUri: 'gemini://v1', filename: 'presse.mov', mimeType: 'video/mov' }])
    expect(String(body.prompt)).toContain('S1 — vidéo')
    expect(String(body.prompt)).toContain('CE QU’IL FAUT Y TROUVER : Où l’opérateur serre-t-il les vis ?')
    expect(String(body.system_instruction)).toContain('N’utilise plus look')
    expect(onLook).toHaveBeenCalledWith({ sourceIds: ['S1'], operation: 'look_s', videoSec: 140 })
    expect(onSources.mock.calls[0][0][0].geminiFileUri).toBe('gemini://v1')
    // Plus de look au deuxième tour : seulement les modifications.
    expect(turn.operations.map((o) => o.op)).toEqual(['use_media'])
  })

  it('des sources trop longues ne se revoient pas d’un coup ; une source inconnue ne revoit rien', async () => {
    const long: Source[] = [{ ...sources[0], durationSec: 2400 }]
    const f = fakeAi({ reply: 'Je regarde.', operations: [{ op: 'look', sources: ['S1'], question: '?' }], suggestions: [] })
    const turn = await agentTurn({ ai: f.ai, files: fakeFiles(), org, content: content(), focusStepId: null, request: 'Trouve le serrage', sources: long })
    expect(f.ask).toHaveBeenCalledTimes(1)
    expect(turn.operations).toEqual([])
    expect(turn.reply).toMatch(/trop longues/)

    const g = fakeAi({ reply: 'Je regarde.', operations: [{ op: 'look', sources: ['S9'] }, { op: 'update_step', step: 'st_a', text: 'x' }], suggestions: [] })
    const t2 = await agentTurn({ ai: g.ai, files: fakeFiles(), org, content: content(), focusStepId: null, request: 'x', sources })
    expect(g.ask).toHaveBeenCalledTimes(1)
    expect(t2.operations.map((o) => o.op)).toEqual(['update_step'])
  })
})

describe('mettre à une étape un média tiré des sources', () => {
  const run = async (op: Record<string, unknown>, files?: FilesApi) => {
    let c = content()
    const log: AgentLogEntry[] = []
    await runAgentOps([op as never], { ai: {} as AiApi, get: () => c, set: (n) => (c = n), focus: () => undefined, log: (e) => log.push(e), pause: async () => undefined, sources, files })
    return { c, log }
  }

  it('un extrait de la vidéo d’origine, ou la photo', async () => {
    const clip = await run({ op: 'use_media', step: 'st_a', source: 'S1', start: 42, end: 50 })
    expect(clip.c.steps[0].media[0]).toMatchObject({ kind: 'video', url: 'https://x/v1.mp4', start: 42, end: 50 })
    const photo = await run({ op: 'use_media', step: 'st_a', source: 'S3' })
    expect(photo.c.steps[0].media[0]).toMatchObject({ kind: 'image', url: 'https://x/p1.jpg' })
  })

  it('une image figée se tire de la vidéo ; sans moyen de la tirer, l’extrait autour de l’instant', async () => {
    const files = { screenshots: vi.fn(async () => ({ 'shot-0': 'https://x/frame.jpg' })), upload: vi.fn() } as unknown as FilesApi
    const frame = await run({ op: 'use_media', step: 'st_a', source: 'S1', at: 45 }, files)
    expect(frame.c.steps[0].media[0]).toMatchObject({ kind: 'image', url: 'https://x/frame.jpg', frame: { at: 45 } })
    const fallback = await run({ op: 'use_media', step: 'st_a', source: 'S1', at: 45 })
    expect(fallback.c.steps[0].media[0]).toMatchObject({ kind: 'video', start: 42, end: 48 })
  })

  it('une source inconnue est refusée, sans rien casser', async () => {
    const r = await run({ op: 'use_media', step: 'st_a', source: 'S9', start: 1, end: 4 })
    expect(r.c.steps[0].media).toEqual([])
    expect(r.log.at(-1)?.state).toBe('error')
  })
})

describe('le texte des sources', () => {
  it('garde les notes en entier jusqu’à une limite raisonnable', () => {
    const many: Source[] = Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, kind: 'note' as const, text: 'mot '.repeat(600), createdAt: now }))
    expect(sourcesBlock(many).length).toBeLessThan(5600)
  })
})
