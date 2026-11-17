/**
 * Le GIF à l'étape (toggle `gifInStep`) : choisir le début et la fin dans la vidéo, puis le mettre à
 * la place du média montré, en plus, ou seulement le partager. « Vidéo · Image · GIF » sur le média
 * de l'étape, et « Vidéo » y revient sans rien perdre. L'IA ne lit jamais un GIF.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/bridge/native', () => ({ NativeError: class extends Error {}, inNativeShell: () => false, nativeEnv: () => null, hasCapability: () => false, callNative: vi.fn(), onNativeEvent: () => () => undefined, haptic: () => undefined }))
const gif = vi.hoisted(() => vi.fn())
vi.mock('@/components/providers/Session', () => ({ useSession: () => ({ files: { gif }, ai: {} }) }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => toast }))
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => vi.fn(async () => true) }))
vi.mock('@/lib/toggles', () => ({ useToggle: (name: string) => name !== 'mediaNav' }))

import { clampGifRange, GifDialog, initialGifRange } from '@/components/editor/GifDialog'
import { StepMediaEditor } from '@/components/editor/StepMediaEditor'
import { imageCandidates } from '@/lib/ai/translate'
import { GIF_MAX_SEC } from '@/lib/gateway/files'
import { isAiImage, isGif, mediaLabel } from '@/lib/model/media'
import { emptyContent } from '@/lib/model/repo'
import type { Step, StepMedia } from '@/lib/model/types'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

beforeEach(() => localStorage.setItem('clip_pref_ui_lang', 'fr'))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const VIDEO = 'https://cdn.test/v.mp4'
const clip: StepMedia = { kind: 'video', url: VIDEO, sourceId: 'src1', start: 3, end: 9, posterUrl: 'https://cdn.test/poster.jpg', caption: 'Le bon geste' }
const stepWith = (media: StepMedia[]): Step => ({ id: 'b', title: 'Serrer les vis', text: '', keyPoints: [], warning: null, media })
const contentOf = (step: Step) => emptyContent({ title: 'Changer le filtre', steps: [step] })

describe('le GIF à l’étape', () => {
  it('allumé par le serveur ; le repli ne l’active jamais', () => {
    expect(DEFAULT_TOGGLES.gifInStep).toBe(true)
    expect(FALLBACK_TOGGLES.gifInStep).toBe(false)
  })

  it('jamais plus de 15 s : le bout qu’on vient de bouger reste, l’autre suit', () => {
    expect(GIF_MAX_SEC).toBe(15)
    expect(initialGifRange({ url: VIDEO, start: 2, end: 40 })).toEqual({ start: 2, end: 17 })
    expect(initialGifRange({ url: VIDEO, start: 3, end: 9 })).toEqual({ start: 3, end: 9 })
    // « Début ici » bien avant : la fin suit le début.
    expect(clampGifRange({ start: 20, end: 30 }, { start: 5, end: 30 })).toEqual({ start: 5, end: 20 })
    // « Fin ici » bien après : le début suit la fin.
    expect(clampGifRange({ start: 20, end: 30 }, { start: 20, end: 50 })).toEqual({ start: 35, end: 50 })
    // Dans la limite : tel quel, au dixième.
    expect(clampGifRange({ start: 20, end: 30 }, { start: 21.04, end: 30 })).toEqual({ start: 21, end: 30 })
  })

  it('on choisit l’extrait, on le fait, puis on le met à la place de la vidéo', async () => {
    gif.mockResolvedValue({ url: 'https://cdn.test/g.gif', sizeBytes: 1_200_000, seconds: 6 })
    const onPlace = vi.fn()
    const onClose = vi.fn()
    render(<GifDialog clip={{ url: VIDEO, start: 3, end: 9 }} name="Étape 1 — Serrer les vis" onClose={onClose} onPlace={onPlace} />)
    // D'abord le choix du début et de la fin : rien ne part avant « Faire le GIF ».
    expect(screen.getByText('Le GIF : de 0:03 à 0:09, 6 s')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Début ici/ })).toBeTruthy()
    expect(gif).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Faire le GIF/ }))
    await waitFor(() => expect(screen.getByRole('img', { name: 'Aperçu du GIF' })).toBeTruthy())
    expect(gif).toHaveBeenCalledWith(VIDEO, 3, 9)
    // Trois choix, nommés d'après ce que l'étape montre.
    expect(screen.getByRole('button', { name: /En plus de la vidéo/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Seulement le télécharger/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /À la place de la vidéo/ }))
    expect(onPlace).toHaveBeenCalledWith({ url: 'https://cdn.test/g.gif', sizeBytes: 1_200_000, videoUrl: VIDEO, start: 3, end: 9 }, 'replace')
    expect(onClose).toHaveBeenCalled()
  })

  it('une étape pleine ne prend pas un média de plus ; « Changer le début et la fin » revient au choix', async () => {
    gif.mockResolvedValue({ url: 'https://cdn.test/g2.gif', sizeBytes: null, seconds: 6 })
    render(<GifDialog clip={{ url: VIDEO, start: 30, end: 36 }} name="x" onClose={() => undefined} onPlace={vi.fn()} target="gif" canAdd={false} />)
    fireEvent.click(screen.getByRole('button', { name: /Faire le GIF/ }))
    await waitFor(() => expect(screen.getByRole('img', { name: 'Aperçu du GIF' })).toBeTruthy())
    expect((screen.getByRole('button', { name: /En plus de ce GIF/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/L’étape a déjà tous ses médias/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Changer le début et la fin/ }))
    expect(screen.getByRole('button', { name: /Faire le GIF/ })).toBeTruthy()
  })

  it('dans l’éditeur : « GIF » à côté de « Vidéo · Image », à la place de la vidéo, puis retour à la vidéo sans rien perdre', async () => {
    gif.mockResolvedValue({ url: 'https://cdn.test/g.gif', sizeBytes: 1_200_000, seconds: 6 })
    const onChange = vi.fn()
    const step = stepWith([clip])
    const { rerender } = render(<StepMediaEditor content={contentOf(step)} step={step} sources={[]} onChange={onChange} onSourceAdded={() => undefined} />)
    expect(screen.getByRole('radio', { name: /Vidéo/ }).getAttribute('aria-checked')).toBe('true')
    // L'ancien bouton « GIF » cède la place au choix « GIF » du média.
    expect(screen.queryByRole('button', { name: /^GIF$/ })).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: /GIF/ }))
    fireEvent.click(screen.getByRole('button', { name: /Faire le GIF/ }))
    fireEvent.click(await screen.findByRole('button', { name: /À la place de la vidéo/ }))
    const placed = onChange.mock.lastCall![0] as Step
    expect(placed.media).toEqual([{ kind: 'image', url: 'https://cdn.test/g.gif', sourceId: 'src1', gif: { videoUrl: VIDEO, start: 3, end: 9, posterUrl: 'https://cdn.test/poster.jpg', sizeBytes: 1_200_000 }, caption: 'Le bon geste' }])
    expect(toast.success).toHaveBeenCalledWith('Le GIF est à l’étape', '« Vidéo » la remet d’un geste.')

    // Le GIF à l'étape : « GIF » est choisi, on peut le refaire, et « Vidéo » remet l'extrait.
    rerender(<StepMediaEditor content={contentOf(placed)} step={placed} sources={[]} onChange={onChange} onSourceAdded={() => undefined} />)
    expect(screen.getByRole('radio', { name: /GIF/ }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('button', { name: /Refaire le GIF/ })).toBeTruthy()
    // Pas d'illustration « à partir de cette image » : l'IA ne lit pas un GIF.
    expect(screen.queryByRole('button', { name: /Illustrer cette image/ })).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: /Vidéo/ }))
    await waitFor(() => expect((onChange.mock.lastCall![0] as Step).media[0].kind).toBe('video'))
    expect((onChange.mock.lastCall![0] as Step).media).toEqual([{ kind: 'video', url: VIDEO, sourceId: 'src1', start: 3, end: 9, posterUrl: 'https://cdn.test/poster.jpg', caption: 'Le bon geste' }])
  })

  it('en plus de la vidéo : le GIF se range juste après elle et devient le média choisi', async () => {
    gif.mockResolvedValue({ url: 'https://cdn.test/g.gif', sizeBytes: null, seconds: 6 })
    const onChange = vi.fn()
    const photo: StepMedia = { kind: 'image', url: 'https://cdn.test/p.jpg' }
    const step = stepWith([clip, photo])
    render(<StepMediaEditor content={contentOf(step)} step={step} sources={[]} onChange={onChange} onSourceAdded={() => undefined} />)
    fireEvent.click(screen.getByRole('radio', { name: /GIF/ }))
    fireEvent.click(screen.getByRole('button', { name: /Faire le GIF/ }))
    fireEvent.click(await screen.findByRole('button', { name: /En plus de la vidéo/ }))
    const media = (onChange.mock.lastCall![0] as Step).media
    expect(media.map((m) => (m.kind === 'image' && m.gif ? 'gif' : m.kind))).toEqual(['video', 'gif', 'image'])
    expect(toast.success).toHaveBeenCalledWith('Le GIF s’ajoute à l’étape')
  })

  it('l’IA ne lit pas un GIF : ni image refaite à la traduction, ni marques, ni illustration à partir de lui', () => {
    const g: StepMedia = { kind: 'image', url: 'https://cdn.test/g.gif', gif: { videoUrl: VIDEO, start: 3, end: 9 } }
    const p: StepMedia = { kind: 'image', url: 'https://cdn.test/p.jpg' }
    expect(isGif(g)).toBe(true)
    expect(isAiImage(g)).toBe(false)
    expect(isAiImage(p)).toBe(true)
    expect(mediaLabel(g)).toBe('GIF')
    const c = emptyContent({ title: 'x', steps: [stepWith([g, p])] })
    expect(imageCandidates(c).map((x) => x.media.url)).toEqual(['https://cdn.test/p.jpg'])
  })
})
