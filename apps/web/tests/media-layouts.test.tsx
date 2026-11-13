import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StepMediaArea } from '@/components/player/StepMediaArea'
import { annotateImage, createVisual } from '@/lib/ai/assist'
import type { AiApi } from '@/lib/gateway/ai'
import { layoutOf, mediaLabel } from '@/lib/model/media'
import { emptyContent } from '@/lib/model/repo'
import type { Step } from '@/lib/model/types'
import { buildPrintHtml } from '@/lib/pdf/printHtml'

afterEach(cleanup)

const labels = { zoom: 'Agrandir', doIt: 'À faire', avoid: 'À éviter' }
const good = { kind: 'image' as const, url: 'https://x/bon.jpg', verdict: 'do' as const, caption: 'Gants bien ajustés' }
const bad = { kind: 'image' as const, url: 'https://x/pasbon.jpg', verdict: 'dont' as const }
const visual = { kind: 'html' as const, url: '', html: '<!doctype html><svg></svg><script>parent.localStorage</script>', title: 'Vue du panneau' }
const step = (patch: Partial<Step>): Step => ({ id: 's1', title: 'Mettre les gants', text: 'Enfiler les gants anticoupure.', media: [good, bad], ...patch })

describe('dispositions des médias d’une étape', () => {
  it('on ne compare ni ne met en grille un média seul', () => {
    expect(layoutOf(step({ layout: 'compare' }))).toBe('compare')
    expect(layoutOf(step({ layout: 'compare', media: [good] }))).toBe('focus')
    expect(layoutOf(step({}))).toBe('focus')
    expect(mediaLabel(visual)).toBe('Schéma')
  })

  it('à faire / à éviter : les deux médias côte à côte, avec leur verdict et leur légende', () => {
    const { container } = render(<StepMediaArea step={step({ layout: 'compare' })} labels={labels} />)
    expect([...container.querySelectorAll('img')].map((i) => i.getAttribute('src'))).toEqual(['https://x/bon.jpg', 'https://x/pasbon.jpg'])
    expect(screen.getByText(/À faire/)).toBeTruthy()
    expect(screen.getByText(/À éviter/)).toBeTruthy()
    expect(screen.getByText('Gants bien ajustés')).toBeTruthy()
  })

  it('un schéma HTML tourne dans un cadre isolé, sans accès à la page', () => {
    const { container } = render(<StepMediaArea step={step({ media: [visual] })} labels={labels} />)
    const frame = container.querySelector('iframe')!
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts')
    expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin')
    expect(frame.getAttribute('srcdoc')).toContain('<svg>')
  })

  it('le PDF montre la comparaison et renvoie un schéma vers l’app', () => {
    const html = buildPrintHtml(emptyContent({ steps: [step({ layout: 'compare' }), step({ id: 's2', media: [visual] })] }), { branding: { orgName: 'Usine' }, version: 1, stationNames: [], showClipMention: false, draft: false })
    expect(html).toContain('class="mgrid"')
    expect(html).toContain('✓ À faire')
    expect(html).toContain('✕ À éviter')
    expect(html).toContain('Schéma interactif')
    expect(html).not.toContain('parent.localStorage')
  })
})

describe('l’IA dessine et annote sur demande', () => {
  const fakeAi = (json: unknown) => ({ ask: vi.fn(async () => ({ json, text: '', model: 'm', usage: null })) }) as unknown as AiApi & { ask: ReturnType<typeof vi.fn> }

  it('un schéma devient une page complète, et un schéma trop lourd est refusé', async () => {
    const ai = fakeAi({ title: 'Panneau', html: '<svg viewBox="0 0 10 10"></svg>' })
    const v = await createVisual(ai, emptyContent(), step({}), 'vue de face')
    expect(ai.ask.mock.calls[0][0]).toBe('visual')
    // Le dessin seul : ni en-tête ni texte d'explication, très peu de mots.
    expect(ai.ask.mock.calls[0][1].system_instruction).toMatch(/AUCUN en-tête/)
    expect(ai.ask.mock.calls[0][1].system_instruction).toMatch(/Au plus 4 libellés de 1 à 3 mots/)
    expect(ai.ask.mock.calls[0][1].prompt).toMatch(/sans en-tête ni texte d’explication/)
    expect(v).toMatchObject({ kind: 'html', title: 'Panneau' })
    expect(v.html.startsWith('<!doctype html>')).toBe(true)
    await expect(createVisual(fakeAi({ title: 'x', html: `<svg>${'a'.repeat(400_000)}</svg>` }), emptyContent(), step({}), '')).rejects.toThrow(/trop lourd/)
  })

  it('« la distance entre les deux trous, 12 mm » : une distance d’un bout à l’autre, dans le sens le plus long', async () => {
    const wide = await annotateImage(fakeAi({ marks: [{ label: '12 mm', shape: 'measure', box: [400, 200, 500, 800] }] }), 'https://x/p.jpg', step({}), 'distance de 12 mm entre les trous')
    expect(wide[0]).toMatchObject({ type: 'measure', x: 0.2, x2: 0.8, y: 0.45, y2: 0.45, text: '12 mm' })
    const tall = await annotateImage(fakeAi({ marks: [{ label: '3 cm', shape: 'measure', box: [100, 480, 900, 520] }] }), 'https://x/p.jpg', step({}), 'hauteur')
    expect(tall[0]).toMatchObject({ type: 'measure', x: 0.5, x2: 0.5, y: 0.1, y2: 0.9 })
  })

  it('« encercle le bouton vert » : la demande et la couleur passent à la marque', async () => {
    const ai = fakeAi({ marks: [{ label: 'Démarrer', shape: 'circle', box: [100, 200, 300, 400], color: 'green' }] })
    const [mark] = await annotateImage(ai, 'https://x/p.jpg', step({}), 'encercle le bouton vert et écris Démarrer')
    expect(ai.ask.mock.calls[0][1].prompt).toContain('encercle le bouton vert')
    expect(mark).toMatchObject({ type: 'circle', color: 'green', text: 'Démarrer', x: 0.2, y: 0.1 })
  })
})
