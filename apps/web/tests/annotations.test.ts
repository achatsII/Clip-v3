import { describe, expect, it } from 'vitest'
import { ANNOTATION_ICON_KEYS } from '@/lib/annotations/icons'
import { annotationsMarkup } from '@/lib/annotations/markup'
import { hitTest, sanitizeAnnotation, translate } from '@/lib/annotations/model'
import type { Annotation } from '@/lib/model/types'

const pen: Annotation = { id: 'p', type: 'pen', x: 0.1, y: 0.1, points: [[0.1, 0.1], [0.3, 0.1], [0.3, 0.3]], color: 'red' }
const box: Annotation = { id: 'r', type: 'rect', x: 0.6, y: 0.6, w: 0.2, h: 0.2, color: 'yellow', text: 'Vis <A>' }
const icon: Annotation = { id: 'i', type: 'icon', x: 0.5, y: 0.2, icon: 'gants', color: 'blue', size: 'l' }

describe('annotations : géométrie', () => {
  it('le doigt trouve la marque la plus récente sous lui, en pixels', () => {
    const list = [pen, box, icon]
    expect(hitTest(list, 200, 100, 1000, 1000)).toBe('p') // sur le trait du crayon
    expect(hitTest(list, 700, 700, 1000, 1000)).toBe('r') // dans le cadre
    expect(hitTest(list, 505, 205, 1000, 1000)).toBe('i') // sur l'icône
    expect(hitTest(list, 950, 50, 1000, 1000)).toBeNull()
  })

  it('déplacer ne sort jamais une marque de l’image', () => {
    const moved = translate(box, 0.5, 0.5)
    expect(moved.x + (moved.w ?? 0)).toBeLessThanOrEqual(1)
    expect(moved.y + (moved.h ?? 0)).toBeLessThanOrEqual(1)
    const penMoved = translate(pen, -0.5, 0)
    expect(Math.min(...penMoved.points!.map((p) => p[0]))).toBeGreaterThanOrEqual(0)
  })

  it('une annotation inconnue ou mal formée est écartée, une ancienne est gardée', () => {
    expect(sanitizeAnnotation({ id: 'x', type: 'laser', x: 0.1, y: 0.1, color: 'red' })).toBeNull()
    expect(sanitizeAnnotation({ id: 'x', type: 'icon', x: 0.1, y: 0.1, icon: 'inconnue', color: 'red' })).toBeNull()
    expect(sanitizeAnnotation({ id: 'old', type: 'arrow', x: 0.2, y: 0.2, x2: 0.4, y2: 0.4, color: 'red', text: 'Ici' })).toMatchObject({ type: 'arrow', text: 'Ici' })
    expect(sanitizeAnnotation({ id: 'c', type: 'circle', x: 2, y: -1, w: 0.1, h: 0.1, color: 'mauve' })).toMatchObject({ x: 1, y: 0, color: 'red' })
  })
})

describe('annotations : dessin (écran et PDF)', () => {
  it('dessine chaque sorte de marque et échappe le texte', () => {
    const html = annotationsMarkup([pen, box, icon, { id: 'n', type: 'number', x: 0.2, y: 0.8, text: '3', color: 'green' }, { id: 't', type: 'text', x: 0.5, y: 0.5, text: '25 N·m', color: 'white' }], { ratio: 4 / 3, idPrefix: 't' })
    expect(html).toContain('<polyline')
    expect(html).toContain('<rect')
    expect(html).toContain('Vis &lt;A&gt;')
    expect(html).not.toContain('<A>')
    expect(html).toContain('25 N·m')
    expect(html).toMatch(/viewBox="0 0 1000 750"/)
  })

  it('une zone floutée est opaque au PDF (le flou ne s’imprime pas de façon fiable)', () => {
    const blur: Annotation = { id: 'b', type: 'blur', x: 0.1, y: 0.1, w: 0.2, h: 0.1, color: 'red' }
    expect(annotationsMarkup([blur])).toContain('backdrop-filter')
    expect(annotationsMarkup([blur], { print: true })).not.toContain('backdrop-filter')
  })

  it('chaque icône proposée a son dessin', () => {
    for (const k of ANNOTATION_ICON_KEYS) expect(annotationsMarkup([{ id: k, type: 'icon', x: 0.5, y: 0.5, icon: k, color: 'red' }])).toContain('<svg viewBox="0 0 24 24"')
  })
})
