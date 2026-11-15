import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CapturedMedia } from '@clip/bridge'

// La séance ingère par ces deux fonctions : on garde ce qu'elles reçoivent (le lien d'une photo à sa note).
vi.mock('@/lib/media/ingest', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/media/ingest')>()
  return {
    ...real,
    ingestNative: vi.fn(async (item: CapturedMedia, _files: unknown, _p: unknown, platform: string, preset: Record<string, unknown> = {}) => {
      // Une photo lourde finit d'envoyer après les suivantes.
      if (item.localId.startsWith('lente')) await new Promise((r) => setTimeout(r, 40))
      return {
      id: `src_${item.localId}`,
      kind: item.kind,
      url: `https://cdn.test/${item.localId}`,
      name: item.fileName,
      durationSec: item.durationSec,
      createdAt: new Date().toISOString(),
      capturedOn: platform,
      ...preset,
      }
    }),
    ingestFile: vi.fn(async (file: File, _files: unknown, _p: unknown, capturedOn: string, preset: Record<string, unknown> = {}) => ({
      id: `src_${file.name}`,
      kind: file.type.startsWith('audio/') ? 'audio' : 'photo',
      url: `https://cdn.test/${file.name}`,
      name: file.name,
      createdAt: new Date().toISOString(),
      capturedOn,
      ...preset,
    })),
  }
})
vi.mock('@/lib/model/service', () => ({
  createInstruction: vi.fn(async () => ({ _id: 'ins_voice' })),
  saveSources: vi.fn(async () => undefined),
}))

import { SourceCard } from '@/components/capture/SourceCard'
import { narratedPhotos, prepareForAi } from '@/lib/ai/generate'
import { getCaptureSession } from '@/lib/capture/session'
import type { FilesApi } from '@/lib/gateway/files'
import { pausableClock } from '@/lib/media/recorder'
import { reuseSource } from '@/lib/model/library'
import type { Source } from '@/lib/model/types'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

const t = new Date().toISOString()
const photo = (id: string, extra: Partial<Source> = {}): Source => ({ id, kind: 'photo', url: `https://x/${id}.jpg`, name: `${id}.jpg`, createdAt: t, ...extra })
const note = (id: string, extra: Partial<Source> = {}): Source => ({ id, kind: 'audio', url: `https://x/${id}.m4a`, durationSec: 95, createdAt: t, ...extra })
const fakeFiles = () => ({ geminiUpload: vi.fn(async () => ({ uri: 'gemini://note', expiresAt: new Date(Date.now() + 40 * 3600_000).toISOString() })) }) as unknown as FilesApi & { geminiUpload: ReturnType<typeof vi.fn> }

afterEach(cleanup)

describe('parler pendant les photos : le toggle', () => {
  it('allumé par défaut, jamais en repli (serveur injoignable)', () => {
    expect(DEFAULT_TOGGLES.photoVoice).toBe(true)
    expect(FALLBACK_TOGGLES.photoVoice).toBe(false)
  })
})

describe('l’horloge du commentaire', () => {
  it('compte le temps enregistré, pauses non comprises : l’instant d’une photo tombe au bon endroit du fichier', () => {
    const c = pausableClock()
    c.start(1000)
    expect(c.seconds(4000)).toBe(3)
    c.pause(5000) // micro fermé à 4 s
    expect(c.seconds(60_000)).toBe(4)
    expect(c.running).toBe(false)
    c.start(70_000) // rouvert
    expect(c.seconds(72_500)).toBe(6.5)
  })
})

describe('l’IA apparie chaque photo avec ce qui est dit autour', () => {
  const series = [photo('p1', { voice: { sourceId: 'a1', at: 4.2 } }), photo('p2', { voice: { sourceId: 'a1', at: 42 } }), photo('p3'), note('a1', { text: 'Ici j’enlève le capot, puis les quatre vis.' })]

  it('la note de la série part en fichier même transcrite, et nomme ses photos ; chaque photo dit son instant', async () => {
    const files = fakeFiles()
    const r = await prepareForAi(series, files)
    expect(files.geminiUpload).toHaveBeenCalledTimes(1)
    const lines = r.lines.map((l) => l.line)
    expect(lines[0]).toContain('prise à 0:04 du commentaire S4')
    expect(lines[1]).toContain('prise à 0:42 du commentaire S4')
    // Une photo prise micro fermé ne prétend rien.
    expect(lines[2]).not.toContain('commentaire')
    expect(lines[3]).toContain('commentaire dit à voix haute pendant la prise des photos S1, S2')
    expect(lines[3]).toContain('transcription : « Ici j’enlève le capot')
    expect(r.askFiles.at(-1)?.geminiFileUri).toBe('gemini://note')
  })

  it('une revue de quelques sources garde les numéros de l’instruction, et oublie une note absente', async () => {
    const files = fakeFiles()
    const withNote = await prepareForAi([series[1], series[3]], files, undefined, ['S2', 'S4'])
    expect(withNote.lines.map((l) => l.id)).toEqual(['S2', 'S4'])
    expect(withNote.lines[0].line).toContain('du commentaire S4')
    const alone = await prepareForAi([series[1]], files, undefined, ['S2'])
    expect(alone.lines[0].line).not.toContain('commentaire')
    expect(narratedPhotos([series[1]]).size).toBe(0)
  })

  it('une note vocale ordinaire, transcrite, reste en texte (rien de plus à téléverser)', async () => {
    const files = fakeFiles()
    const r = await prepareForAi([photo('p9'), note('a9', { text: 'Toujours vérifier l’huile.' })], files)
    expect(files.geminiUpload).not.toHaveBeenCalled()
    expect(r.lines[1].line).toContain('note vocale (transcription)')
  })

  it('une photo reprise d’une autre instruction perd le lien (sa note n’y est pas)', () => {
    expect(reuseSource(series[0]).voice).toBeUndefined()
  })
})

describe('la séance relie la note et ses photos', () => {
  const deps = { data: {} as never, files: {} as never, actor: { id: 'u1', name: 'Mélanie' } }

  it('dans l’app : la note reçoit son identifiant d’avance, chaque photo prise micro ouvert y garde son instant', async () => {
    const session = getCaptureSession('voice-native', deps, { instructionId: null, sources: [] })
    const items: CapturedMedia[] = [
      { localId: 'ph1', kind: 'photo', mimeType: 'image/jpeg', fileName: 'p1.jpg', sizeBytes: 10, voiceAt: 3.5 },
      { localId: 'ph2', kind: 'photo', mimeType: 'image/jpeg', fileName: 'p2.jpg', sizeBytes: 10 },
      { localId: 'au1', kind: 'audio', mimeType: 'audio/mp4', fileName: 'note.m4a', sizeBytes: 10, durationSec: 30, narration: true },
    ]
    session.addNative(items)
    await vi.waitFor(() => expect(session.snapshot.sources).toHaveLength(3))
    const byName = new Map(session.snapshot.sources.map((s) => [s.name, s]))
    const audio = byName.get('note.m4a')!
    expect(byName.get('p1.jpg')?.voice).toEqual({ sourceId: audio.id, at: 3.5 })
    expect(byName.get('p2.jpg')?.voice).toBeUndefined()
    expect(narratedPhotos(session.snapshot.sources).get(audio.id)).toHaveLength(1)
  })

  it('sans note dans la réponse (coquille plus ancienne, micro fermé) : des photos ordinaires', async () => {
    const session = getCaptureSession('voice-none', deps, { instructionId: null, sources: [] })
    session.addNative([{ localId: 'ph3', kind: 'photo', mimeType: 'image/jpeg', fileName: 'p3.jpg', sizeBytes: 10, voiceAt: 2 }])
    await vi.waitFor(() => expect(session.snapshot.sources).toHaveLength(1))
    expect(session.snapshot.sources[0].voice).toBeUndefined()
  })

  it('garde l’ordre du déclic, même quand la première photo finit d’envoyer en dernier', async () => {
    const session = getCaptureSession('voice-order', deps, { instructionId: null, sources: [] })
    const item = (localId: string, voiceAt: number): CapturedMedia => ({ localId, kind: 'photo', mimeType: 'image/jpeg', fileName: `${localId}.jpg`, sizeBytes: 10, voiceAt })
    session.addNative([item('lente-1', 2), item('vite-2', 9), { localId: 'au2', kind: 'audio', mimeType: 'audio/mp4', fileName: 'n.m4a', sizeBytes: 10, narration: true }])
    await session.addNote('Serrer à 25 N·m.')
    await vi.waitFor(() => expect(session.snapshot.sources).toHaveLength(4))
    expect(session.snapshot.sources.map((s) => s.name ?? s.text)).toEqual(['lente-1.jpg', 'vite-2.jpg', 'n.m4a', 'Serrer à 25 N·m.'])
  })

  it('dans le navigateur : la même chose à partir des fichiers de la caméra', async () => {
    const session = getCaptureSession('voice-web', deps, { instructionId: null, sources: [] })
    globalThis.URL.createObjectURL ??= () => 'blob:x'
    const shots = [new File(['a'], 'w1.jpg', { type: 'image/jpeg' }), new File(['b'], 'w2.jpg', { type: 'image/jpeg' })]
    session.addPhotoSeries(shots, { audio: new File(['c'], 'commentaire.webm', { type: 'audio/webm' }), at: [undefined, 12.3] })
    await vi.waitFor(() => expect(session.snapshot.sources).toHaveLength(3))
    const byName = new Map(session.snapshot.sources.map((s) => [s.name, s]))
    expect(byName.get('w1.jpg')?.voice).toBeUndefined()
    expect(byName.get('w2.jpg')?.voice).toEqual({ sourceId: byName.get('commentaire.webm')!.id, at: 12.3 })
  })
})

describe('les cartes de la capture le disent', () => {
  it('la note s’appelle « Commentaire des photos » et compte ses photos ; la photo montre son instant', () => {
    render(<SourceCard source={note('a1', { text: 'Ici j’enlève le capot.' })} narrated={2} />)
    expect(screen.getByText('Commentaire des photos')).toBeTruthy()
    expect(screen.getByText(/2 photos commentées/)).toBeTruthy()
    cleanup()
    render(<SourceCard source={photo('p1')} voiceAt={42} />)
    expect(screen.getByText('Prise à 0:42 du commentaire')).toBeTruthy()
  })
})
