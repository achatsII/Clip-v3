/**
 * Les options de la génération, dites avant de générer : ce que l'IA lit en une fois (et laquelle
 * des limites bloque), les relevés proposés ou non ; et le GIF d'un extrait, pour sortir une étape
 * de CLIP sans changer ce que voit le poste.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Une maquette complète du pont : celle qui attend le vrai module se bloque (il s'importe en boucle).
const native = vi.hoisted(() => {
  class NativeError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message)
    }
  }
  return { share: false, callNative: vi.fn(), NativeError }
})
vi.mock('@/lib/bridge/native', () => ({
  NativeError: native.NativeError,
  inNativeShell: () => false,
  nativeEnv: () => null,
  hasCapability: (cap: string) => cap === 'share' && native.share,
  callNative: native.callNative,
  onNativeEvent: () => () => undefined,
  haptic: () => undefined,
}))
const gif = vi.hoisted(() => vi.fn())
vi.mock('@/components/providers/Session', () => ({ useSession: () => ({ files: { gif } }) }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => toast }))
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => vi.fn(async () => true) }))
vi.mock('@/lib/toggles', () => ({ useToggle: () => true }))

import { GifDialog } from '@/components/editor/GifDialog'
import { StepMediaEditor } from '@/components/editor/StepMediaEditor'
import { finishGeneration, GENERATION_LIMITS, generationTier, limitUse, prepareGeneration } from '@/lib/ai/generate'
import { generationSystem } from '@/lib/ai/prompts'
import { readProposeChecks, setProposeChecks } from '@/lib/ai/proposeChecks'
import type { GatewayClient } from '@/lib/gateway/client'
import { ApiError } from '@/lib/gateway/client'
import { filesApi, GIF_MAX_SEC } from '@/lib/gateway/files'
import { messages } from '@/lib/i18n'
import { defaultStandard, emptyContent } from '@/lib/model/repo'
import type { Source } from '@/lib/model/types'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'
import { saveFile } from '@/lib/util/saveFile'

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  native.share = false
})

const at = '2026-11-16T10:00:00.000Z'
const video = (id: string, min: number): Source => ({ id, kind: 'video', url: `https://x/${id}.mp4`, durationSec: min * 60, createdAt: at })
const photo = (id: string): Source => ({ id, kind: 'photo', url: `https://x/${id}.jpg`, createdAt: at })
const org = { standard: defaultStandard(), learnings: [] } as never

describe('ce que l’IA lit en une fois', () => {
  it('pas un nombre de fichiers : dix vidéos de trois minutes passent ; la limite la plus proche vient d’abord', () => {
    const ten = Array.from({ length: 10 }, (_, i) => video(`v${i}`, 3))
    expect(generationTier(ten).tooBig).toBe(false)
    expect(limitUse([...ten, photo('p1')])[0]).toEqual({ kind: 'videoSec', used: 1800, max: GENERATION_LIMITS.videoSec, ratio: 1 })
    expect(generationTier([...ten, video('v10', 1)]).tooBig).toBe(true)
    expect(generationTier(Array.from({ length: 81 }, (_, i) => photo(`p${i}`))).tooBig).toBe(true)
  })

  it('la capture dit laquelle bloque, et prévient dès 80 %', () => {
    const tb = messages().capture.board
    expect(tb.overLimit(tb.limit.videoSec(34 * 60, 1800))).toBe('34 min de vidéo sur 30 : c’est plus que ce que l’IA lit en une fois. Retirez-en, ou séparez-la en plusieurs instructions.')
    expect(tb.nearLimit(tb.limit.photos(66, 80))).toBe('66 photos sur 80 : c’est bientôt la limite d’une instruction.')
    expect(tb.limitsHint({ videoMin: 30, audioMin: 45, photos: 80, pages: 60 })).toContain('30 min de vidéo, 45 min de notes vocales, 80 photos et 60 pages')
  })

  it('une régénération trop grosse le dit aussi précisément', async () => {
    const big = Array.from({ length: 11 }, (_, i) => video(`v${i}`, 3))
    await expect(prepareGeneration({ files: {} as never, org, sources: big, stationNames: [] })).rejects.toThrow('33 min de vidéo sur 30')
  })
})

describe('proposer des relevés', () => {
  it('oui par défaut, retenu sur l’appareil', () => {
    expect(readProposeChecks()).toBe(true)
    setProposeChecks(false)
    expect(readProposeChecks()).toBe(false)
  })

  it('la consigne dit quand en proposer ; non : aucun, et la fin retire ceux que l’IA aurait mis', () => {
    expect(generationSystem(org, { language: 'fr' })).toContain('Relevés (checks) : seulement là où le travail demande de noter quelque chose')
    expect(generationSystem(org, { language: 'fr', checks: false })).toContain('checks reste une liste vide à chaque étape')
    const json = { title: 'Purger le circuit', steps: [{ title: 'Lire la pression', text: 'Au manomètre.', keyPoints: [], warningLevel: 'none', warningText: '', section: '', media: [], checks: [{ kind: 'measure', label: 'Pression', unit: 'bar', min: '4', max: '6', target: '', expected: 'none', options: [], bad: [] }] }] }
    expect(finishGeneration(json as never, [], 'fr').content.steps[0].checks).toHaveLength(1)
    expect(finishGeneration(json as never, [], 'fr', { checks: false }).content.steps[0].checks).toBeUndefined()
  })
})

describe('le GIF d’un extrait', () => {
  it('allumé par le serveur ; le repli ne l’active jamais', () => {
    expect(DEFAULT_TOGGLES.clipGif).toBe(true)
    expect(FALLBACK_TOGGLES.clipGif).toBe(false)
  })

  it('demande un GIF en 480p de l’extrait, au plus 15 s ; à la seconde si la route refuse les dixièmes', async () => {
    const call = vi.fn(async (_path: string, opts: { body: { timestamps: Array<{ start: string; end: string }> } }) => {
      if (opts.body.timestamps[0].start.includes('.')) throw new ApiError('format', 400)
      return { results: [{ url: 'https://cdn.test/g.gif', fileSize: 2_593_073, uploadSuccess: true }] }
    })
    const files = filesApi({ call } as unknown as GatewayClient)
    const out = await files.gif('https://cdn.test/v.mp4', 4.5, 40)
    expect(out).toEqual({ url: 'https://cdn.test/g.gif', sizeBytes: 2_593_073, seconds: GIF_MAX_SEC })
    expect(call.mock.calls[0][0]).toBe('/api/v1/files/gifs/generate')
    expect(call.mock.calls[0][1].body).toMatchObject({ videoUrl: 'https://cdn.test/v.mp4', timestamps: [{ start: '00:00:04.5', end: '00:00:19.5', type: 'gif', name: 'clip' }], options: { resolution: '480p', fps: 10 } })
    expect(call.mock.calls[1][1].body.timestamps[0]).toMatchObject({ start: '00:00:05', end: '00:00:20' })
    const empty = filesApi({ call: vi.fn(async () => ({ results: [{ uploadSuccess: false }] })) } as unknown as GatewayClient)
    await expect(empty.gif('https://cdn.test/v.mp4', 0, 5)).rejects.toThrow('Le GIF n’a pas pu se faire')
  })

  it('la fenêtre le prépare, le montre, dit pourquoi l’étape garde son extrait, puis le télécharge', async () => {
    gif.mockResolvedValue({ url: 'https://cdn.test/g.gif', sizeBytes: 2_593_073, seconds: 15 })
    const blob = new Blob(['GIF89a'], { type: 'image/gif' })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, blob: async () => blob })))
    const created = vi.fn(() => 'blob:gif')
    URL.createObjectURL = created
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<GifDialog clip={{ url: 'https://cdn.test/v.mp4', start: 2, end: 40 }} name="Étape 3 — Serrer les vis" onClose={() => undefined} />)
    expect(screen.getByText('Le GIF se prépare…')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('img', { name: 'Aperçu du GIF' })).toBeTruthy())
    expect(gif).toHaveBeenCalledWith('https://cdn.test/v.mp4', 2, 40)
    expect(screen.getByText(/GIF de 15 s · 2,5 Mo/)).toBeTruthy()
    expect(screen.getByText(/Les 15 premières secondes de l’extrait/)).toBeTruthy()
    expect(screen.getByText(/Au poste, l’étape garde son extrait/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Télécharger le GIF/ }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    const a = click.mock.contexts[0] as HTMLAnchorElement
    expect(a.download).toBe('Étape 3 — Serrer les vis.gif')
    vi.unstubAllGlobals()
    click.mockRestore()
  })

  it('dans l’éditeur, « GIF » sur un extrait ouvre la fenêtre, nommée d’après l’étape ; une photo n’en a pas', async () => {
    gif.mockReturnValue(new Promise(() => undefined))
    const clip = { kind: 'video' as const, url: 'https://cdn.test/v.mp4', start: 3, end: 9 }
    const c = emptyContent({ title: 'Changer le filtre', steps: [{ id: 'a', title: 'Ouvrir', text: '', keyPoints: [], warning: null, media: [] }, { id: 'b', title: 'Serrer les vis', text: '', keyPoints: [], warning: null, media: [clip] }] })
    const { rerender } = render(<StepMediaEditor content={c} step={c.steps[1]} sources={[]} onChange={vi.fn()} onSourceAdded={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /^GIF/ }))
    expect(screen.getByText('Le GIF se prépare…')).toBeTruthy()
    expect(gif).toHaveBeenCalledWith('https://cdn.test/v.mp4', 3, 9)
    rerender(<StepMediaEditor content={c} step={{ ...c.steps[1], media: [{ kind: 'image', url: 'https://cdn.test/p.jpg' }] }} sources={[]} onChange={vi.fn()} onSourceAdded={() => undefined} />)
    expect(screen.queryByRole('button', { name: /^GIF/ })).toBeNull()
  })

  it('dans l’app, il passe par la feuille de partage du téléphone ; la fermer n’est pas une erreur', async () => {
    native.share = true
    native.callNative.mockResolvedValueOnce({})
    await saveFile(new Blob(['GIF89a'], { type: 'image/gif' }), 'Étape 3.gif')
    expect(native.callNative).toHaveBeenCalledWith('share', { fileName: 'Étape 3.gif', mimeType: 'image/gif', base64: btoa('GIF89a') })
    native.callNative.mockRejectedValueOnce(new native.NativeError('cancelled', 'fermé'))
    await expect(saveFile(new Blob(['x'], { type: 'image/gif' }), 'a.gif')).resolves.toBeUndefined()
  })
})
