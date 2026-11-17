/**
 * Les médias d'origine d'une instruction (toggle `sourceLibrary`), les médias joints à l'assistant
 * (toggle `agentAttach`) et les présentations PowerPoint lues dans l'app (toggle `slidesImport` : la
 * Gateway répond 500 pour un .pptx, revérifié en QA le 17 novembre 2026).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/bridge/native', () => ({ callNative: vi.fn(), onNativeEvent: vi.fn(() => () => undefined), nativeEnv: vi.fn(() => null), inNativeShell: () => false, hasCapability: () => false }))
// Pas de canevas dans jsdom : la photo part telle quelle.
vi.mock('@/lib/media/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/media/image')>()),
  compressImage: vi.fn(async (f: File) => ({ blob: f, width: 320, height: 240 })),
}))
const { createInstruction } = vi.hoisted(() => ({ createInstruction: vi.fn(async () => ({ _id: 'ins1', json_data: {} })) }))
vi.mock('@/lib/model/service', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/model/service')>()), createInstruction, saveSources: vi.fn(async () => undefined) }))

import { SourceLibrary } from '@/components/editor/SourceLibrary'
import { agentTurn } from '@/lib/ai/agent'
import { importAsk } from '@/lib/ai/generate'
import { getCaptureSession } from '@/lib/capture/session'
import type { AiApi } from '@/lib/gateway/ai'
import type { DataApi } from '@/lib/gateway/data'
import type { FilesApi } from '@/lib/gateway/files'
import { ingestAny, ingestSlides } from '@/lib/media/ingest'
import { deckText, isPptx, readSlides } from '@/lib/media/slides'
import { defaultStandard, emptyContent } from '@/lib/model/repo'
import { groupSources, sourceUses, voiceOf } from '@/lib/model/sources'
import type { InstructionContent, Source } from '@/lib/model/types'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

const PPTX_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
const deckBytes = () => readFileSync(join(__dirname, 'fixtures', 'procedure.pptx'))
const deckFile = () => new File([deckBytes()], 'procedure.pptx', { type: PPTX_TYPE })
/** Une passerelle de fichiers factice : chaque envoi rend une adresse à son nom. */
const fakeFiles = () => {
  let n = 0
  return {
    upload: vi.fn(async (_b: Blob, name: string) => ({ url: `https://cdn.test/${++n}-${encodeURIComponent(name)}`, path: `p/${n}`, mimeType: 'image/png', sizeBytes: 1000 })),
    remove: vi.fn(async () => undefined),
    geminiUpload: vi.fn(async () => ({ uri: 'gemini://x', expiresAt: new Date(Date.now() + 40 * 3600_000).toISOString() })),
  } as unknown as FilesApi & { upload: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  localStorage.setItem('clip_pref_ui_lang', 'fr')
})
afterEach(cleanup)

it('trois toggles allumés par le serveur ; le repli n’en active aucun', () => {
  for (const name of ['sourceLibrary', 'agentAttach', 'slidesImport'] as const) {
    expect(DEFAULT_TOGGLES[name]).toBe(true)
    expect(FALLBACK_TOGGLES[name]).toBe(false)
  }
})

const at = '2026-11-17T00:00:00.000Z'
const sources: Source[] = [
  { id: 'v1', kind: 'video', url: 'https://x/v1.mp4', name: 'presse.mov', durationSec: 140, thumbnailUrl: 'https://x/v1.jpg', createdAt: at },
  { id: 'a1', kind: 'audio', url: 'https://x/a1.m4a', name: 'note.m4a', durationSec: 40, text: 'Le couple de serrage est de vingt-cinq newtons-mètres.', createdAt: at },
  { id: 'p1', kind: 'photo', url: 'https://x/p1.jpg', name: 'panneau.jpg', voice: { sourceId: 'a1', at: 12 }, createdAt: at },
  { id: 'n1', kind: 'note', text: 'Toujours vérifier le joint.', createdAt: at },
  { id: 'd1', kind: 'document', url: 'https://x/d1.pdf', name: 'plan.pdf', pageCount: 3, createdAt: at },
]
const content = (): InstructionContent =>
  emptyContent({
    title: 'Démarrer la presse',
    steps: [
      { id: 's1', title: 'Cadenasser', text: '', keyPoints: [], warning: null, media: [{ kind: 'video', url: 'https://x/v1.mp4', sourceId: 'v1', start: 2, end: 8 }] },
      { id: 's2', title: 'Serrer', text: '', keyPoints: [], warning: null, media: [{ kind: 'video', url: 'https://x/v1.mp4', sourceId: 'v1', start: 20, end: 26 }, { kind: 'image', url: 'https://x/p1.jpg', sourceId: 'p1' }] },
    ],
  })

describe('les médias d’origine', () => {
  it('par famille, chacun avec son numéro (S1…) et les étapes où il sert ; une photo prise en parlant retrouve sa note', () => {
    expect(groupSources(sources).map((g) => [g.kind, g.items.map((x) => x.tag)])).toEqual([
      ['video', ['S1']],
      ['photo', ['S3']],
      ['audio', ['S2']],
      ['note', ['S4']],
      ['document', ['S5']],
    ])
    const uses = sourceUses(content())
    expect(uses.get('v1')).toEqual([
      { n: 1, stepId: 's1' },
      { n: 2, stepId: 's2' },
    ])
    expect(uses.get('p1')).toEqual([{ n: 2, stepId: 's2' }])
    expect(uses.get('a1')).toBeUndefined()
    expect(voiceOf(sources[2], sources)).toEqual({ audio: sources[1], at: 12 })
  })

  it('à revoir en entier : la vidéo avec ses commandes, la note vocale et sa transcription, le document à ouvrir ; une étape s’ouvre d’un toucher', () => {
    const onGoToStep = vi.fn()
    render(<SourceLibrary open onClose={() => undefined} sources={sources} content={content()} onGoToStep={onGoToStep} />)
    const dialog = screen.getByRole('dialog')
    const video = dialog.querySelector('video')!
    expect(video.getAttribute('src')).toBe('https://x/v1.mp4')
    expect(video.hasAttribute('controls')).toBe(true)
    // Rien ne se télécharge avant « Lire ».
    expect(video.getAttribute('preload')).toBe('none')
    expect(dialog.querySelector('audio')!.getAttribute('src')).toBe('https://x/a1.m4a')
    expect(within(dialog).getByText('Le couple de serrage est de vingt-cinq newtons-mètres.')).toBeTruthy()
    expect(within(dialog).getByText('Toujours vérifier le joint.')).toBeTruthy()
    expect(within(dialog).getByRole('link', { name: /Ouvrir le document/ }).getAttribute('href')).toBe('https://x/d1.pdf')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aller à l’étape 2' }))
    expect(onGoToStep).toHaveBeenCalledWith('s2')
    // En lecture : rien ne se met à une étape, rien ne s'ajoute.
    expect(within(dialog).queryByRole('button', { name: /Mettre à l’étape/ })).toBeNull()
  })

  it('dans l’éditeur : « Mettre à l’étape 2 » sur chaque média qui peut s’y mettre ; une photo prise en parlant fait entendre ce qui a été dit', () => {
    const onUse = vi.fn()
    render(<SourceLibrary open onClose={() => undefined} sources={sources} content={content()} stepNumber={2} onUse={onUse} />)
    const uses = screen.getAllByRole('button', { name: 'Mettre à l’étape 2' })
    // La vidéo, la photo et le document ; ni la note vocale ni la note écrite.
    expect(uses).toHaveLength(3)
    fireEvent.click(uses[1])
    expect(onUse).toHaveBeenCalledWith(sources[2])
    fireEvent.click(screen.getByRole('button', { name: /Agrandir · Photo S3/ }))
    expect(screen.getByRole('button', { name: /Écouter ce qui a été dit/ })).toBeTruthy()
  })

  it('« Voir l’original » d’un extrait : la vidéo s’ouvre à l’instant de l’extrait', () => {
    render(<SourceLibrary open onClose={() => undefined} sources={sources} content={content()} focus={{ sourceId: 'v1', at: 20 }} />)
    const video = screen.getByRole('dialog').querySelector('video')!
    expect(video.getAttribute('src')).toBe('https://x/v1.mp4#t=20')
    expect(video.getAttribute('preload')).toBe('metadata')
  })
})

describe('joindre des médias à l’assistant', () => {
  it('les médias joints partent avec la demande, en un seul tour facturé selon leur taille, sans tour sur le texte d’abord', async () => {
    const replies = [{ reply: 'Je les ai mis.', operations: [{ op: 'use_media', step: 's1', source: 'S6' }], suggestions: [] }]
    const ask = vi.fn(async (_op: string, _body: Record<string, unknown>) => ({ json: replies.shift(), text: '', model: 'm' }))
    const onLook = vi.fn()
    const joined: Source = { id: 'p9', kind: 'photo', url: 'https://x/p9.jpg', name: 'nouveau.jpg', createdAt: at }
    const turn = await agentTurn({
      ai: { ask } as unknown as AiApi,
      files: fakeFiles(),
      org: { standard: defaultStandard(), learnings: [] },
      content: content(),
      focusStepId: 's1',
      request: 'Mets cette photo à l’étape 1',
      sources: [...sources, joined],
      attached: ['p9'],
      onLook,
    })
    expect(ask).toHaveBeenCalledTimes(1)
    const [op, body] = ask.mock.calls[0]
    expect(op).toBe('look_s')
    expect(body.files).toHaveLength(1)
    expect(JSON.stringify(body.files)).toContain('nouveau.jpg')
    expect(String(body.prompt)).toContain('MÉDIAS JOINTS PAR LA PERSONNE')
    expect(String(body.prompt)).toContain('CE QU’IL FAUT EN FAIRE : Mets cette photo à l’étape 1')
    expect(String(body.prompt)).toContain('S6 — photo « nouveau.jpg »')
    expect(String(body.system_instruction)).toContain('LA PERSONNE JOINT CES MÉDIAS À SA DEMANDE')
    expect(onLook).toHaveBeenCalledWith(expect.objectContaining({ sourceIds: ['S6'] }))
    expect(turn.operations).toEqual([{ op: 'use_media', step: 's1', source: 'S6' }])
  })
})

describe('un enregistrement de l’écran joint à l’assistant', () => {
  it('la vidéo et ses images nettes partent ensemble, avec les consignes d’écran et comment entourer', async () => {
    const ask = vi.fn(async (_op: string, _body: Record<string, unknown>) => ({ json: { reply: 'Ajoutées.', operations: [], suggestions: [] }, text: '', model: 'm' }))
    const screenVideo: Source = { id: 'sv', kind: 'video', url: 'https://x/screen.mp4', durationSec: 40, screen: true, geminiFileUri: 'gemini://sv', geminiExpiresAt: new Date(Date.now() + 40 * 3600_000).toISOString(), createdAt: at }
    const shot: Source = { id: 'sh1', kind: 'photo', url: 'https://x/sh1.jpg', mimeType: 'image/jpeg', shot: { sourceId: 'sv', at: 4 }, createdAt: at }
    await agentTurn({
      ai: { ask } as unknown as AiApi,
      files: fakeFiles(),
      org: { standard: defaultStandard(), learnings: [] },
      content: content(),
      focusStepId: 's1',
      request: 'Ajoute ces étapes après l’étape 1',
      sources: [...sources, screenVideo, shot],
      attached: ['sv', 'sh1'],
    })
    const [, body] = ask.mock.calls[0]
    expect(String(body.system_instruction)).toContain('ENREGISTREMENT D’ÉCRAN')
    expect(String(body.system_instruction)).toContain('annotate sur ce média entoure l’élément à toucher')
    expect(String(body.prompt)).toMatch(/S7 — image nette de l’écran, à 0:04 de S6/)
  })

  it('une revue sans écran n’a pas ces consignes', async () => {
    const ask = vi.fn(async (_op: string, _body: Record<string, unknown>) => ({ json: { reply: 'Vu.', operations: [], suggestions: [] }, text: '', model: 'm' }))
    const joined: Source = { id: 'p9', kind: 'photo', url: 'https://x/p9.jpg', createdAt: at }
    await agentTurn({ ai: { ask } as unknown as AiApi, files: fakeFiles(), org: { standard: defaultStandard(), learnings: [] }, content: content(), focusStepId: 's1', request: 'Regarde', sources: [...sources, joined], attached: ['p9'] })
    expect(String(ask.mock.calls[0][1].system_instruction)).not.toContain('ENREGISTREMENT D’ÉCRAN')
  })
})

describe('un PowerPoint lu dans l’app', () => {
  it('chaque diapositive : son titre, son texte, ses notes et ses images, dans l’ordre', async () => {
    expect(isPptx({ name: 'Procédure.PPTX', type: '' })).toBe(true)
    expect(isPptx({ name: 'vieux.ppt', type: '' })).toBe(false)
    const deck = await readSlides(deckBytes().buffer.slice(deckBytes().byteOffset) as ArrayBuffer)
    expect(deck.slides.map((s) => s.title)).toEqual(['Changer le filtre de la pompe P-3', 'Étape 1 — Cadenasser', 'Étape 2 — Retirer le couvercle'])
    expect(deck.slides[0].lines).toEqual(['Maintenance — révision 4'])
    expect(deck.slides[1].lines).toEqual(['Couper l’alimentation au sectionneur S-12 et poser votre cadenas.'])
    expect(deck.slides[2].notes).toBe('Vérifier le joint torique.')
    expect(deck.images.map((i) => [i.name, i.slide, i.blob.type])).toEqual([
      ['Diapositive 2 — image 1.png', 2, 'image/png'],
      ['Diapositive 3 — image 1.png', 3, 'image/png'],
    ])
    // Une vraie image PNG, décompressée de l'archive.
    const head = new Uint8Array(await deck.images[0].blob.arrayBuffer()).slice(0, 4)
    expect([...head]).toEqual([0x89, 0x50, 0x4e, 0x47])
    const text = deckText('procedure.pptx', deck)
    expect(text).toContain('Présentation « procedure.pptx », 3 diapositives.')
    expect(text).toContain('Diapositive 2 — Étape 1 — Cadenasser\n- Couper l’alimentation au sectionneur S-12 et poser votre cadenas.\nNotes du présentateur : Vérifier le joint torique.\nImages : « Diapositive 2 — image 1.png »')
  })

  it('devient une note (le texte) puis une photo par image ; un .ppt ou un Keynote demande un .pptx ou un PDF', async () => {
    const files = fakeFiles()
    const out = await ingestSlides(deckFile(), files)
    expect(out.map((s) => [s.kind, s.name])).toEqual([
      ['note', 'procedure.pptx'],
      ['photo', 'Diapositive 2 — image 1.png'],
      ['photo', 'Diapositive 3 — image 1.png'],
    ])
    expect(out[0].pageCount).toBe(3)
    expect(out[0].text).toContain('Diapositive 3 — Étape 2 — Retirer le couvercle')
    expect(files.upload).toHaveBeenCalledTimes(2)
    await expect(ingestAny(new File(['x'], 'vieux.ppt'), files, { slides: true })).rejects.toThrow('enregistrez-la en .pptx ou en PDF')
    // Toggle coupé : le message d'avant (l'enregistrer en PDF).
    await expect(ingestAny(deckFile(), files, { slides: false })).rejects.toThrow('enregistrez-le en PDF')
  })

  it('à la capture : la note et les images s’ajoutent ensemble, dans l’ordre, en une seule carte', async () => {
    const files = fakeFiles()
    const session = getCaptureSession('slides-on', { data: {} as DataApi, files, actor: { id: 'u1', name: 'Test' } }, { instructionId: null, sources: [] })
    session.addFiles([deckFile()], { slides: true })
    expect(session.snapshot.pending).toHaveLength(1)
    await vi.waitFor(() => expect(session.snapshot.pending).toHaveLength(0))
    expect(session.snapshot.sources.map((s) => s.kind)).toEqual(['note', 'photo', 'photo'])
  })

  it('à l’import en lot : le texte dans la demande, les images jointes, la consigne d’une présentation', async () => {
    const files = fakeFiles()
    const deck = await ingestSlides(deckFile(), files)
    const { operation, ask } = importAsk({ org: { standard: defaultStandard(), learnings: [] }, source: deck[0], sources: deck, stationNames: [] })
    expect(operation).toBe('import_s')
    expect(String(ask.system_instruction)).toContain('présentation PowerPoint')
    expect(String(ask.prompt)).toContain('S1 — texte de la présentation « procedure.pptx » :')
    expect(String(ask.prompt)).toContain('S2 — image « Diapositive 2 — image 1.png » (fichier joint n° 1)')
    expect(ask.files?.map((f) => f.filename)).toEqual(['Diapositive 2 — image 1.png', 'Diapositive 3 — image 1.png'])
    // Un PDF, comme avant : le document est S1, joint.
    const pdf: Source = { id: 'd', kind: 'document', url: 'https://x/d.pdf', name: 'vieille.pdf', pageCount: 4, createdAt: at }
    const old = importAsk({ org: { standard: defaultStandard(), learnings: [] }, source: pdf, stationNames: [] })
    expect(old.ask.files).toEqual([{ url: 'https://x/d.pdf', filename: 'vieille.pdf', mimeType: 'application/pdf', sizeBytes: undefined }])
  })
})
