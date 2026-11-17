/**
 * Enregistrer l'écran d'un ordinateur (toggle `screenCapture`), sans rien installer : la vidéo, une
 * image nette juste avant chaque action (le pointeur sur ce qu'on touche), la voix en option. Un seul
 * envoi qui reprend où il s'était arrêté ; l'IA en fait une étape par clic, l'image nette en média.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/media/image', async (orig) => ({ ...(await orig<typeof import('@/lib/media/image')>()), videoInfo: async () => ({ width: 1920, height: 1080 }) }))
const rec = vi.hoisted(() => ({ startScreen: vi.fn() }))
vi.mock('@/lib/media/screenRecorder', async (orig) => ({ ...(await orig<typeof import('@/lib/media/screenRecorder')>()), startScreen: rec.startScreen }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => toast }))
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => vi.fn(async () => true) }))

import { ScreenRecorder } from '@/components/capture/ScreenRecorder'
import { prepareForAi } from '@/lib/ai/generate'
import { normalizeSteps } from '@/lib/ai/normalize'
import { generationSystem, SCREEN_RULES } from '@/lib/ai/prompts'
import { CaptureSession } from '@/lib/capture/session'
import type { DataApi } from '@/lib/gateway/data'
import type { FilesApi } from '@/lib/gateway/files'
import { ingestScreen, type ScreenProgress } from '@/lib/media/ingest'
import { changedRatio, ShotPicker, toGray } from '@/lib/media/screenShots'
import { defaultStandard } from '@/lib/model/repo'
import type { Source } from '@/lib/model/types'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

beforeEach(() => localStorage.setItem('clip_pref_ui_lang', 'fr'))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

/** Un écran de 320 × 180 : un fond, et des rectangles qui changent. */
function screenWith(rects: Array<[number, number, number, number]>, shade = 40): Uint8Array {
  const g = new Uint8Array(320 * 180).fill(230)
  for (const [x, y, w, h] of rects) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j * 320 + i] = shade
  return g
}

describe('les images nettes : quand les prendre', () => {
  it('allumé par le serveur ; le repli ne l’active jamais', () => {
    expect(DEFAULT_TOGGLES.screenCapture).toBe(true)
    expect(FALLBACK_TOGGLES.screenCapture).toBe(false)
  })

  it('compare deux écrans en niveaux de gris', () => {
    expect(Array.from(toGray(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])))).toEqual([255, 0])
    expect(changedRatio(screenWith([]), screenWith([]))).toBe(0)
    expect(changedRatio(screenWith([]), screenWith([[0, 0, 32, 18]]))).toBeCloseTo(0.01, 3)
  })

  it('l’écran de départ dès qu’il est calme, puis l’écran juste AVANT chaque vrai changement', () => {
    const p = new ShotPicker()
    const start = screenWith([])
    expect(p.feed(start, 0)).toBeNull()
    expect(p.feed(start, 150)).toBeNull()
    expect(p.feed(start, 300)).toBe('now')
    // Le pointeur bouge, on tape quelques caractères : l'écran reste calme, rien à garder.
    expect(p.feed(screenWith([[100, 50, 2, 3]]), 450)).toBeNull()
    expect(p.feed(screenWith([[100, 50, 6, 3]]), 1500)).toBeNull()
    // Un menu s'ouvre : on garde l'image d'AVANT (le champ rempli, le pointeur sur le menu).
    expect(p.feed(screenWith([[100, 50, 6, 3], [0, 0, 120, 90]]), 1650)).toBe('before')
    // Un clic trop vite après (l'écran n'était pas calme) : rien.
    expect(p.feed(screenWith([[200, 100, 100, 60]]), 1800)).toBeNull()
    expect(p.count).toBe(2)
  })

  it('pas deux fois le même écran ; au plus `max` images ; l’écran d’arrivée à la fin', () => {
    const p = new ShotPicker({ max: 2 })
    const a = screenWith([])
    const b = screenWith([[0, 0, 160, 90]])
    p.feed(a, 0)
    expect(p.feed(a, 400)).toBe('now')
    // Un éclair (une infobulle qui passe en 150 ms) n'est pas un écran calme : rien.
    expect(p.feed(b, 800)).toBeNull()
    expect(p.feed(a, 950)).toBeNull()
    expect(p.feed(a, 1300)).toBeNull()
    // Le même écran qu'à la dernière image, juste avant un changement : pas de deuxième image identique.
    expect(p.feed(b, 1800)).toBeNull()
    expect(p.count).toBe(1)
    expect(p.finish(2000)).toBe(true)
    expect(p.full).toBe(true)
    expect(p.finish(2500)).toBe(false)
  })
})

describe('l’envoi d’un enregistrement de l’écran', () => {
  const shot = (at: number) => ({ blob: new Blob(['jpg'], { type: 'image/jpeg' }), at, width: 1920, height: 1080 })
  function fakeFiles(failAt?: number) {
    let n = 0
    return {
      upload: vi.fn(async (_b: Blob, name: string) => {
        n++
        if (failAt && n === failAt) throw new Error('réseau')
        return { url: `https://cdn.test/${encodeURIComponent(name)}`, path: `p/${name}`, mimeType: name.endsWith('.jpg') ? 'image/jpeg' : 'video/mp4', sizeBytes: 100 }
      }),
      processVideo: vi.fn(),
    } as unknown as FilesApi & { upload: ReturnType<typeof vi.fn> }
  }
  const capture = () => ({ video: new File(['mp4'], 'Écran — 17 nov.mp4', { type: 'video/mp4' }), durationSec: 42.4, shots: [shot(0.3), shot(5.1), shot(12.75)] })

  it('la vidéo (sa durée connue), puis ses images nettes qui la nomment, dans l’ordre du temps', async () => {
    const files = fakeFiles()
    const progress = vi.fn()
    const out = await ingestScreen(capture(), files, progress, 'src_screen')
    expect(out[0]).toMatchObject({ id: 'src_screen', kind: 'video', screen: true, durationSec: 42.4, thumbnailUrl: expect.stringContaining('0m00s.jpg') })
    expect(out.slice(1).map((s) => [s.kind, s.shot])).toEqual([
      ['photo', { sourceId: 'src_screen', at: 0.3 }],
      ['photo', { sourceId: 'src_screen', at: 5.1 }],
      ['photo', { sourceId: 'src_screen', at: 12.8 }],
    ])
    expect(progress).toHaveBeenLastCalledWith('upload', 1)
  })

  it('« Réessayer » reprend où l’envoi s’était arrêté : ni la vidéo ni les images déjà parties ne repartent', async () => {
    const files = fakeFiles(3)
    const done: ScreenProgress = { shots: [] }
    await expect(ingestScreen(capture(), files, undefined, 'src_screen', done)).rejects.toThrow('réseau')
    const before = files.upload.mock.calls.length
    const out = await ingestScreen(capture(), files, undefined, 'src_screen', done)
    expect(out).toHaveLength(4)
    // Une seule image avait manqué : un seul envoi de plus.
    expect(files.upload.mock.calls.length - before).toBe(1)
  })

  it('retirer l’enregistrement retire ses images', async () => {
    const t = new Date().toISOString()
    const sources: Source[] = [
      { id: 'v', kind: 'video', url: 'https://x/v.mp4', path: 'p/v', screen: true, createdAt: t },
      { id: 's1', kind: 'photo', url: 'https://x/1.jpg', path: 'p/1', shot: { sourceId: 'v', at: 1 }, createdAt: t },
      { id: 'n', kind: 'note', text: 'Garder', createdAt: t },
    ]
    const remove = vi.fn(async () => undefined)
    const data = { patch: vi.fn(async () => undefined), get: vi.fn(async () => ({ _id: 'i1', json_data: { sources } })), update: vi.fn(async () => undefined) } as unknown as DataApi
    const session = new CaptureSession({ data, files: { remove } as unknown as FilesApi, actor: { id: 'u', name: 'U' } }, { instructionId: 'i1', sources })
    await session.remove('v').catch(() => undefined)
    expect(session.snapshot.sources.map((s) => s.id)).toEqual(['n'])
    expect(remove).toHaveBeenCalledWith(['p/v', 'p/1'])
  })
})

describe('ce que l’IA en reçoit', () => {
  const t = new Date().toISOString()
  const video: Source = { id: 'v', kind: 'video', url: 'https://x/screen.mp4', durationSec: 64, sizeBytes: 5_000_000, screen: true, createdAt: t }
  const shotAt = (id: string, at: number): Source => ({ id, kind: 'photo', url: `https://x/${id}.jpg`, mimeType: 'image/jpeg', shot: { sourceId: 'v', at }, createdAt: t })

  it('la vidéo dite « enregistrement de l’écran », chaque image nette avec son instant et sa vidéo', async () => {
    const files = { geminiUpload: vi.fn(async () => ({ uri: 'gemini://f', expiresAt: new Date(Date.now() + 40 * 3600_000).toISOString() })) } as unknown as FilesApi
    const r = await prepareForAi([video, shotAt('a', 3.2), shotAt('b', 65)], files)
    expect(r.lines[0].line).toMatch(/^S1 — enregistrement de l’écran d’un logiciel, 1 min 04 s/)
    expect(r.lines[1].line).toBe('S2 — image nette de l’écran, à 0:03 de S1, juste avant une action : le pointeur y est sur ce qu’on va toucher (fichier joint n° 2)')
    expect(r.askFiles.map((f) => f.mimeType)).toEqual(['video/mp4', 'image/jpeg', 'image/jpeg'])
  })

  it('les consignes d’écran seulement quand il y en a un : une étape par action, l’image nette, l’élément entouré', () => {
    const org = { standard: defaultStandard(), learnings: [] }
    expect(generationSystem(org, { language: 'fr', screen: true })).toContain(SCREEN_RULES)
    expect(generationSystem(org, { language: 'fr' })).not.toContain('ENREGISTREMENT D’ÉCRAN')
    expect(SCREEN_RULES).toMatch(/Cliquer sur Enregistrer/)
    expect(SCREEN_RULES).toMatch(/mot de passe/)
  })

  it('l’image nette choisie par l’IA sait d’où elle vient : « Vidéo » et « GIF » repartent de cet instant', () => {
    const byId = new Map<string, Source>([
      ['S1', video],
      ['S2', shotAt('a', 12.34)],
    ])
    const marks: Array<{ stepId: string; mediaIndex: number; hint: string }> = []
    const [step] = normalizeSteps([{ title: 'Cliquer sur Enregistrer', text: '', keyPoints: [], warningLevel: 'none', warningText: '', section: '', media: [{ source: 'S2', focusLabel: 'Enregistrer' }] }] as never, byId, undefined, marks)
    expect(step.media[0]).toEqual({ kind: 'image', url: 'https://x/a.jpg', sourceId: 'a', frame: { videoUrl: 'https://x/screen.mp4', at: 12.3, start: 9.3, end: 14.3 } })
    expect(marks).toEqual([{ stepId: step.id, mediaIndex: 0, hint: 'Enregistrer' }])
  })
})

describe('la fenêtre d’enregistrement', () => {
  function fakeSession() {
    let ended: (() => void) | null = null
    const session = {
      stream: new MediaStream(),
      withVoice: true,
      seconds: () => 12,
      shots: () => 3,
      onEnded: (fn: () => void) => {
        ended = fn
      },
      cancel: vi.fn(),
      stop: vi.fn(async () => ({ video: new Blob(['mp4'], { type: 'video/mp4' }), mime: 'video/mp4', durationSec: 12, shots: [{ blob: new Blob(['j']), at: 1, width: 10, height: 10 }], withVoice: true })),
    }
    return { session, end: () => ended?.() }
  }

  beforeEach(() => {
    if (typeof globalThis.MediaStream === 'undefined') vi.stubGlobal('MediaStream', class {})
    HTMLMediaElement.prototype.play = vi.fn(async () => undefined)
  })

  it('trois phrases, la voix retenue, puis « Terminer » rend la vidéo nommée et ses images', async () => {
    const { session } = fakeSession()
    rec.startScreen.mockResolvedValue({ session, voiceDenied: false })
    const onCaptured = vi.fn()
    const onClose = vi.fn()
    render(<ScreenRecorder open onClose={onClose} onCaptured={onCaptured} />)
    expect(screen.getByText(/CLIP garde une image nette à chaque clic/)).toBeTruthy()
    expect(screen.getByRole('switch', { name: /Avec ma voix/ }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /Choisir l’écran/ }))
    await waitFor(() => expect(screen.getByText('Enregistrement en cours')).toBeTruthy())
    expect(rec.startScreen).toHaveBeenCalledWith(expect.objectContaining({ voice: true }))
    expect(screen.getByText('Micro ouvert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Terminer/ }))
    await waitFor(() => expect(onCaptured).toHaveBeenCalled())
    const capture = onCaptured.mock.calls[0][0]
    expect(capture.video.name).toMatch(/^Écran — .+\.mp4$/)
    expect(capture.shots).toHaveLength(1)
    expect(onClose).toHaveBeenCalled()
  })

  it('le micro coupé se retient ; « Arrêter le partage » du navigateur termine aussi ; fermer le choix ne fait rien', async () => {
    rec.startScreen.mockResolvedValueOnce(null)
    const onCaptured = vi.fn()
    render(<ScreenRecorder open onClose={() => undefined} onCaptured={onCaptured} />)
    fireEvent.click(screen.getByRole('switch', { name: /Avec ma voix/ }))
    expect(localStorage.getItem('clip_pref_screen_voice')).toBe('off')
    fireEvent.click(screen.getByRole('button', { name: /Choisir l’écran/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Choisir l’écran/ })).toBeTruthy())
    expect(rec.startScreen).toHaveBeenLastCalledWith(expect.objectContaining({ voice: false }))

    const { session, end } = fakeSession()
    rec.startScreen.mockResolvedValueOnce({ session, voiceDenied: true })
    fireEvent.click(screen.getByRole('button', { name: /Choisir l’écran/ }))
    await waitFor(() => expect(screen.getByText('Enregistrement en cours')).toBeTruthy())
    expect(toast.info).toHaveBeenCalledWith('Micro refusé : l’écran s’enregistre sans la voix.')
    await act(async () => end())
    await waitFor(() => expect(onCaptured).toHaveBeenCalledTimes(1))
  })
})
