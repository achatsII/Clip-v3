/**
 * Ce qui se voit mieux au poste et dans l'éditeur : les outils en images (un emoji par outil),
 * le son des vidéos retenu d'une étape à l'autre, et plusieurs médias à une étape impossibles à
 * manquer (vignettes, « 2 / 3 », grandes flèches).
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VideoSegment } from '@/components/media/MediaView'
import { StepMediaArea } from '@/components/player/StepMediaArea'
import { ToolTiles } from '@/components/ToolTiles'
import { instructionSchema } from '@/lib/ai/schemas'
import { MediaPlaybackProvider } from '@/lib/media/videoPool'
import { readVideoSound } from '@/lib/media/videoSound'
import { emptyContent } from '@/lib/model/repo'
import { DEFAULT_TOOL_EMOJI, keepToolEmojis, toolIcon, TOOL_PALETTE, withToolEmoji } from '@/lib/model/tools'
import type { Step, StepMedia } from '@/lib/model/types'
import { buildPrintHtml } from '@/lib/pdf/printHtml'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('clip_pref_ui_lang', 'fr')
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve()) as unknown as HTMLMediaElement['play']
  HTMLMediaElement.prototype.pause = vi.fn()
  HTMLMediaElement.prototype.load = vi.fn()
})
afterEach(cleanup)

it('trois toggles allumés par le serveur ; le repli n’en active aucun', () => {
  for (const name of ['toolImages', 'videoSound', 'mediaNav'] as const) {
    expect(DEFAULT_TOGGLES[name]).toBe(true)
    expect(FALLBACK_TOGGLES[name]).toBe(false)
  }
})

describe('les outils en images', () => {
  it('l’emoji mis en tête fait foi ; sinon le nom le donne, en français comme en anglais ; rien de reconnu : la boîte à outils', () => {
    expect(toolIcon('🔦 Lampe frontale')).toEqual({ emoji: '🔦', label: 'Lampe frontale' })
    expect(toolIcon('⚙️ Filtre neuf')).toEqual({ emoji: '⚙️', label: 'Filtre neuf' })
    expect(toolIcon('Clé de 13 mm').emoji).toBe('🔧')
    expect(toolIcon('Clé dynamométrique 25 N·m').emoji).toBe('🔧')
    expect(toolIcon('Clé du cadenas').emoji).toBe('🔑')
    expect(toolIcon('Tournevis plat').emoji).toBe('🪛')
    expect(toolIcon('Pistolet à graisse').emoji).toBe('🛢️')
    expect(toolIcon('Chiffon propre').emoji).toBe('🧻')
    expect(toolIcon('Ruban à mesurer').emoji).toBe('📏')
    expect(toolIcon('Multimètre').emoji).toBe('📟')
    expect(toolIcon('Torque wrench').emoji).toBe('🔧')
    expect(toolIcon('Flashlight').emoji).toBe('🔦')
    expect(toolIcon('Gabarit de perçage').emoji).toBe(DEFAULT_TOOL_EMOJI)
    // Une marque de commerce n'est pas un emoji.
    expect(toolIcon('® Loctite 243')).toEqual({ emoji: DEFAULT_TOOL_EMOJI, label: '® Loctite 243' })
    expect(TOOL_PALETTE.length).toBeGreaterThan(40)
    expect(new Set(TOOL_PALETTE).size).toBe(TOOL_PALETTE.length)
  })

  it('choisir une image la met en tête ; une traduction qui l’a perdue la retrouve', () => {
    expect(withToolEmoji('🔧 Clé de 13', '🗜️')).toBe('🗜️ Clé de 13')
    expect(withToolEmoji('Chiffon', '🧽')).toBe('🧽 Chiffon')
    expect(keepToolEmojis(['🔧 Clé de 13', 'Chiffon'], ['13 mm wrench', 'Rag'])).toEqual(['🔧 13 mm wrench', 'Rag'])
    expect(keepToolEmojis(['🔧 Clé de 13'], ['🗜️ Clamp'])).toEqual(['🗜️ Clamp'])
  })

  it('au poste, des tuiles : le grand emoji, puis le nom ; dans l’éditeur, un toucher change l’image', () => {
    const { rerender } = render(<ToolTiles tools={['🔧 Clé de 13', 'Chiffon propre']} />)
    expect(screen.getByText('Clé de 13')).toBeTruthy()
    expect(screen.getByText('🧻')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    const onChangeEmoji = vi.fn()
    rerender(<ToolTiles tools={['🔧 Clé de 13', 'Chiffon propre']} size="sm" onChangeEmoji={onChangeEmoji} words={{ change: (n) => `L’image de « ${n} »` }} />)
    fireEvent.click(screen.getByRole('button', { name: 'L’image de « Chiffon propre »' }))
    fireEvent.click(screen.getByRole('button', { name: '🧽' }))
    expect(onChangeEmoji).toHaveBeenCalledWith(1, '🧽')
    // Une ligne vide (l'outil qu'on tape) n'a pas de tuile ; l'image suit le rang dans la liste.
    rerender(<ToolTiles tools={['Chiffon propre', '', 'Lampe']} size="sm" onChangeEmoji={onChangeEmoji} words={{ change: (n) => `L’image de « ${n} »` }} />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'L’image de « Lampe »' }))
    fireEvent.click(screen.getByRole('button', { name: '🔦' }))
    expect(onChangeEmoji).toHaveBeenLastCalledWith(2, '🔦')
  })

  it('l’IA met l’emoji en tête de chaque outil (le schéma passe tel quel au serveur) ; le PDF le montre aussi', () => {
    const tools = (instructionSchema as { properties: { tools: { description: string } } }).properties.tools.description
    expect(tools).toContain('« 🔧 Clé de 13 mm »')
    const content = emptyContent({ title: 'Changer le filtre', tools: ['Chiffon propre'] })
    const meta = { branding: { orgName: 'Usine' }, version: 1, stationNames: [], showClipMention: false, draft: false }
    expect(buildPrintHtml(content, { ...meta, toolImages: true })).toContain('<span class="emoji">🧻</span> Chiffon propre')
    // Toggle coupé : le texte tel qu'écrit, comme avant.
    expect(buildPrintHtml(content, meta)).not.toContain('class="emoji"')
  })
})

describe('le son des vidéos se retient', () => {
  const remembering = (ui: ReactElement, sound = true) => <MediaPlaybackProvider value={{ pool: null, reel: false, sound }}>{ui}</MediaPlaybackProvider>

  it('muet par défaut ; activé sur une étape, la vidéo d’une autre étape part avec le son, et le choix reste sur l’appareil', () => {
    const { container, unmount } = render(remembering(<VideoSegment url="https://x/a.mp4" start={2} end={8} />))
    expect(container.querySelector('video')!.muted).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Activer le son' }))
    expect(readVideoSound()).toBe(true)
    expect(container.querySelector('video')!.muted).toBe(false)
    unmount()
    const next = render(remembering(<VideoSegment url="https://x/a.mp4" start={12} end={18} />))
    expect(next.container.querySelector('video')!.muted).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Couper le son' }))
    expect(readVideoSound()).toBe(false)
  })

  it('toggle coupé : le son vaut pour l’extrait, le suivant repart muet, rien n’est retenu', () => {
    const { container, rerender } = render(remembering(<VideoSegment url="https://x/a.mp4" start={2} end={8} />, false))
    fireEvent.click(screen.getByRole('button', { name: 'Activer le son' }))
    expect(container.querySelector('video')!.muted).toBe(false)
    expect(readVideoSound()).toBe(false)
    rerender(remembering(<VideoSegment url="https://x/a.mp4" start={12} end={18} />, false))
    expect(container.querySelector('video')!.muted).toBe(true)
    expect(screen.getByRole('button', { name: 'Activer le son' })).toBeTruthy()
  })

  it('un navigateur qui refuse le son sans un toucher : la vidéo repart muette, sans oublier le choix', async () => {
    localStorage.setItem('clip_pref_video_sound', 'on')
    let calls = 0
    HTMLMediaElement.prototype.play = vi.fn(function (this: HTMLMediaElement) {
      calls += 1
      return this.muted ? Promise.resolve() : Promise.reject(new DOMException('no sound without a gesture', 'NotAllowedError'))
    }) as unknown as HTMLMediaElement['play']
    const { container } = render(remembering(<VideoSegment url="https://x/a.mp4" start={0} end={6} autoPlay />))
    const v = container.querySelector('video')!
    Object.defineProperty(v, 'readyState', { configurable: true, get: () => 1 })
    await act(async () => {
      v.dispatchEvent(new Event('loadedmetadata'))
      await new Promise((r) => setTimeout(r, 5))
    })
    expect(calls).toBeGreaterThanOrEqual(2)
    expect(v.muted).toBe(true)
    expect(readVideoSound()).toBe(true)
    expect(screen.getByRole('button', { name: 'Activer le son' })).toBeTruthy()
  })
})

describe('plusieurs médias à une étape', () => {
  const photo = (n: number): StepMedia => ({ kind: 'image', url: `https://x/p${n}.jpg` })
  const step = (media: StepMedia[]): Step => ({ id: 's1', title: 'Retirer le filtre', text: '', keyPoints: [], warning: null, media })
  const labels = { zoom: 'Agrandir', doIt: 'À faire', avoid: 'À éviter', previousMedia: 'Média précédent', nextMedia: 'Média suivant', mediaOf: (i: number, n: number) => `${i} / ${n}` }

  it('leurs vignettes, « 1 / 3 » et de grandes flèches ; la flèche « suivant » attire l’œil jusqu’à ce qu’on regarde les autres', () => {
    const { container } = render(<StepMediaArea step={step([photo(1), photo(2), photo(3)])} labels={labels} nav />)
    expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '2 / 3' }).querySelector('img')!.getAttribute('src')).toBe('https://x/p2.jpg')
    const next = screen.getByRole('button', { name: 'Média suivant' })
    expect(next.className).toContain('animate-pulse')
    fireEvent.click(next)
    expect(screen.getByRole('button', { name: '2 / 3' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Média suivant' }).className).not.toContain('animate-pulse')
    // Le grand média suit : la deuxième photo.
    expect([...container.querySelectorAll('img')].some((i) => i.getAttribute('src') === 'https://x/p2.jpg' && !i.closest('button'))).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Média précédent' }))
    fireEvent.click(screen.getByRole('button', { name: 'Média précédent' }))
    expect(screen.getByRole('button', { name: '3 / 3' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('un seul média : ni vignettes ni flèches', () => {
    render(<StepMediaArea step={step([photo(1)])} labels={labels} nav />)
    expect(screen.queryByRole('button', { name: 'Média suivant' })).toBeNull()
  })

  it('toggle coupé : les petites pastilles d’avant', () => {
    render(<StepMediaArea step={step([photo(1), photo(2)])} labels={labels} />)
    expect(screen.queryByRole('button', { name: 'Média suivant' })).toBeNull()
    expect(screen.getByRole('button', { name: '📷 2' })).toBeTruthy()
  })
})
