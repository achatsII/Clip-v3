import { describe, expect, it } from 'vitest'
import { annotationsMarkup } from '@/lib/annotations/markup'
import { handlesOf, hitTest, moveEnd, resizeBy, sanitizeAnnotation, snap45 } from '@/lib/annotations/model'
import type { Annotation } from '@/lib/model/types'
import { IDENTITY, clampView, pinchView, zoomAround } from '@/lib/ui/zoom'

const rect: Annotation = { id: 'r', type: 'rect', x: 0.2, y: 0.2, w: 0.2, h: 0.1, color: 'red' }
const arrow: Annotation = { id: 'a', type: 'arrow', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, color: 'red' }
const pen: Annotation = { id: 'p', type: 'pen', x: 0.1, y: 0.1, points: [[0.1, 0.1], [0.3, 0.2]], color: 'red' }
const icon: Annotation = { id: 'i', type: 'icon', x: 0.5, y: 0.5, icon: 'gants', color: 'blue' }

describe('zoom de l’image (pincer, molette)', () => {
  it('le point sous les doigts reste sous les doigts', () => {
    const v = zoomAround(IDENTITY, 2, 300, 200, 1000, 800)
    expect(v.k).toBe(2)
    // Le point de l'image sous (300, 200) avant le zoom y est encore après.
    expect((300 - v.tx) / v.k).toBeCloseTo(300)
    expect((200 - v.ty) / v.k).toBeCloseTo(200)
  })

  it('pincer zoome et déplace ; on ne perd jamais l’image', () => {
    const v = pinchView(IDENTITY, 100, { x: 500, y: 400 }, 300, { x: 520, y: 380 }, 1000, 800)
    expect(v.k).toBe(3)
    expect((520 - v.tx) / v.k).toBeCloseTo(500)
    expect(clampView({ k: 0.5, tx: 50, ty: 50 }, 1000, 800)).toEqual(IDENTITY)
    expect(clampView({ k: 2, tx: -5000, ty: 100 }, 1000, 800)).toEqual({ k: 2, tx: -1000, ty: 0 })
    expect(zoomAround(IDENTITY, 50, 0, 0, 1000, 800).k).toBe(6)
  })
})

describe('déplacer et agrandir une marque', () => {
  it('un coin étire la forme, le coin opposé reste en place, et on peut la retourner', () => {
    expect(resizeBy(rect, 'se', { x: 0.6, y: 0.5 })).toMatchObject({ x: 0.2, y: 0.2, w: expect.closeTo(0.4), h: expect.closeTo(0.3) })
    // Tiré au-delà du coin fixe : la forme se retourne au lieu de disparaître.
    expect(resizeBy(rect, 'se', { x: 0.1, y: 0.1 })).toMatchObject({ x: 0.1, y: 0.1, w: expect.closeTo(0.1), h: expect.closeTo(0.1) })
    // Jamais réduite à rien.
    expect(resizeBy(rect, 'se', { x: 0.2, y: 0.2 }).w).toBeGreaterThan(0.01)
  })

  it('un tracé à main levée s’étire avec ses points', () => {
    const big = resizeBy(pen, 'se', { x: 0.5, y: 0.3 })
    expect(big.points).toEqual([
      [0.1, 0.1],
      [expect.closeTo(0.5), expect.closeTo(0.3)],
    ])
  })

  it('les deux bouts d’une flèche se tirent, Maj ramène l’angle à 45°', () => {
    expect(moveEnd(arrow, 'end', { x: 0.9, y: 0.2 })).toMatchObject({ x: 0.1, y: 0.1, x2: 0.9, y2: 0.2 })
    const flat = snap45({ x: 0.1, y: 0.5 }, { x: 0.6, y: 0.52 }, 1000, 1000)
    expect(flat.y).toBeCloseTo(0.5)
  })

  it('les poignées : deux bouts, quatre coins, un coin pour agrandir une icône', () => {
    expect(handlesOf(arrow, 1000, 1000).map((h) => h.kind)).toEqual(['start', 'end'])
    expect(handlesOf(rect, 1000, 1000).map((h) => h.kind)).toEqual(['nw', 'ne', 'sw', 'se'])
    const [scale] = handlesOf(icon, 1000, 1000)
    expect(scale.kind).toBe('scale')
    expect(scale.x).toBeGreaterThan(icon.x)
    expect(scale.y).toBeGreaterThan(icon.y)
  })

  it('une icône agrandie se touche plus loin de son centre, au zoom comme sans', () => {
    const big: Annotation = { ...icon, scale: 3 }
    expect(hitTest([icon], 500 + 70, 500, 1000, 1000)).toBeNull()
    expect(hitTest([big], 500 + 70, 500, 1000, 1000)).toBe('i')
    // Image affichée deux fois plus grande (zoom 2) : la pastille aussi.
    expect(hitTest([icon], 1000 + 70, 1000, 2000, 2000, 22, 2)).toBe('i')
  })

  it('les nouvelles tailles et l’agrandissement libre se gardent, bornés', () => {
    expect(sanitizeAnnotation({ ...icon, size: 'xxl', scale: 9 })).toMatchObject({ size: 'xxl', scale: 4 })
    expect(sanitizeAnnotation({ ...icon, size: 'géant', scale: 0.1 })).toMatchObject({ scale: 0.4 })
    expect(sanitizeAnnotation({ ...icon, size: 'géant' })?.size).toBeUndefined()
    expect(annotationsMarkup([{ ...icon, scale: 2 }])).toContain('calc(clamp(26px, 8.5cqw, 60px) * 2)')
  })
})
