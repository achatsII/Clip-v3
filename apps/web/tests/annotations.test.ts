import { describe, expect, it } from 'vitest'
import { ANNOTATION_ICON_KEYS } from '@/lib/annotations/icons'
import { annotationsMarkup, keepInside } from '@/lib/annotations/markup'
import { handlesOf, hitTest, sanitizeAnnotation, translate } from '@/lib/annotations/model'
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

describe('annotations : distance, pointillé, zone remplie', () => {
  const measure: Annotation = { id: 'm', type: 'measure', x: 0.2, y: 0.5, x2: 0.8, y2: 0.5, color: 'blue', text: '12 mm' }

  it('une distance : une pointe à chaque bout, une butée à chaque bout, la valeur au milieu', () => {
    const html = annotationsMarkup([measure], { ratio: 1, idPrefix: 'd' })
    expect(html).toContain('marker-start="url(#d-ah-blue)"')
    expect(html).toContain('marker-end="url(#d-ah-blue)"')
    // La ligne et ses deux butées, perpendiculaires (ici verticales).
    expect(html.match(/<line /g)).toHaveLength(3)
    expect(html).toMatch(/<line x1="200" y1="[\d.]+" x2="200" y2="[\d.]+"/)
    expect(html).toContain('left:50%;top:50%')
    expect(html).toContain('12 mm')
  })

  it('une distance se touche, se tire par ses deux bouts et se garde', () => {
    expect(hitTest([measure], 500, 505, 1000, 1000)).toBe('m')
    expect(handlesOf(measure, 1000, 1000).map((h) => h.kind)).toEqual(['start', 'end'])
    expect(sanitizeAnnotation({ ...measure, dashed: true, filled: true })).toEqual({ ...measure, dashed: true })
    expect(sanitizeAnnotation({ ...box, dashed: true, filled: true })).toMatchObject({ dashed: true, filled: true })
  })

  it('pointillé : le trait se coupe ; rempli : la forme devient une zone transparente', () => {
    const line = annotationsMarkup([{ id: 'l', type: 'line', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, color: 'red', dashed: true }])
    expect(line).toContain('stroke-dasharray')
    const zone = annotationsMarkup([{ ...box, filled: true }])
    expect(zone).toContain('fill-opacity=".3"')
    expect(annotationsMarkup([box])).toContain('fill="none"')
  })
})

describe('annotations : une légende reste toujours dans l’image', () => {
  const top = (html: string) => Number(/top:([\d.]+)%;transform:translate\(([-\d.]+)%,([-\d.]+)%\)/.exec(html)?.[1])
  const shift = (html: string) => /transform:translate\(([-\d.]+)%,([-\d.]+)%\)/.exec(html)!.slice(1).map(Number)

  it('un cadre au milieu : la légende dessous', () => {
    const html = annotationsMarkup([{ ...box, y: 0.3, h: 0.3 }])
    expect(top(html)).toBe(60)
    expect(shift(html)[1]).toBe(15)
  })

  it('un cadre qui touche le bas : la légende passe au-dessus du cadre', () => {
    const html = annotationsMarkup([{ ...box, y: 0.55, h: 0.45 }])
    expect(top(html)).toBe(55)
    expect(shift(html)[1]).toBe(-115)
  })

  it('un cadre haut comme l’image : la légende se pose dedans, au bas, sans sortir', () => {
    const html = annotationsMarkup([{ ...box, y: 0, h: 1 }])
    expect(top(html)).toBe(100)
    // Ancrée au bas, elle remonte d’au moins toute sa hauteur : elle reste dans l’image.
    expect(shift(html)[1]).toBeLessThanOrEqual(-100)
  })

  it('près d’un bord, une étiquette glisse vers l’intérieur ; au centre, elle reste centrée', () => {
    expect(keepInside(0.5, -0.5, 0.62)).toBe(-0.5)
    expect(keepInside(0.98, -0.5, 0.62)).toBeCloseTo(-0.968, 2)
    expect(keepInside(0.02, -0.5, 0.62)).toBeCloseTo(-0.032, 2)
    // Pour toute étiquette jusqu’à la taille prévue, rien ne dépasse.
    for (const at of [0, 0.1, 0.5, 0.9, 1])
      for (const size of [0.05, 0.2]) {
        const s = keepInside(at, 0.15, 0.2)
        expect(at + s * size).toBeGreaterThanOrEqual(-1e-9)
        expect(at + (s + 1) * size).toBeLessThanOrEqual(1 + 1e-9)
      }
  })
})
