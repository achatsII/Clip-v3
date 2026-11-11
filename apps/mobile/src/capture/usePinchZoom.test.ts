import { clampZoom, nextZoom } from './usePinchZoom'

describe('zoom de la caméra au pincement', () => {
  it('écarter les doigts zoome, les rapprocher dézoome, sans sortir de 0 à 1', () => {
    expect(nextZoom(0, 100, 200)).toBeGreaterThan(0)
    expect(nextZoom(0.5, 200, 100)).toBeLessThan(0.5)
    expect(nextZoom(0, 200, 100)).toBe(0)
    expect(nextZoom(0.9, 10, 10_000)).toBe(1)
    expect(clampZoom(-1)).toBe(0)
  })

  it('le même geste donne le même pas, où qu’on soit dans le zoom', () => {
    const a = nextZoom(0.1, 100, 150) - 0.1
    const b = nextZoom(0.5, 100, 150) - 0.5
    expect(a).toBeCloseTo(b, 6)
  })

  it('une mesure invalide ne bouge pas le zoom', () => {
    expect(nextZoom(0.3, 0, 120)).toBe(0.3)
  })
})
