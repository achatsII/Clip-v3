import { magnification, pinchZoom } from './zoomMath'

describe('zoom de la caméra au pincement', () => {
  it.each(['ios', 'android'] as const)('%s : écarter les doigts deux fois plus agrandit deux fois plus, comme sur l’iPhone', (platform) => {
    const z = pinchZoom(platform, 0, 2)
    expect(magnification(platform, z)).toBeCloseTo(2, 5)
    const z2 = pinchZoom(platform, z, 1.5)
    expect(magnification(platform, z2)).toBeCloseTo(3, 5)
  })

  it.each(['ios', 'android'] as const)('%s : rapprocher les doigts revient au cadrage normal, jamais en dessous', (platform) => {
    const z = pinchZoom(platform, 0, 3)
    expect(magnification(platform, pinchZoom(platform, z, 1 / 3))).toBeCloseTo(1, 5)
    expect(pinchZoom(platform, 0, 0.5)).toBe(0)
  })

  it.each(['ios', 'android'] as const)('%s : plafonné à 10×, et une mesure invalide ne bouge rien', (platform) => {
    expect(magnification(platform, pinchZoom(platform, 0, 1000))).toBeLessThanOrEqual(10.0001)
    expect(pinchZoom(platform, 0.2, Number.NaN)).toBe(0.2)
    expect(pinchZoom(platform, 0.2, 0)).toBe(0.2)
  })
})
