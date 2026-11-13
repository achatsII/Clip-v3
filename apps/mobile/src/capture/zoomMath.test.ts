import { previewFrame } from './framing'
import { activePreset, cameraZoom, MAX_MAGNIFICATION, minMagnification, pickMultiLens, pinchMagnification, zoomPresets, type ZoomRange } from './zoomMath'

const multi: ZoomRange = { platform: 'ios', ultraWide: true }
const single: ZoomRange = { platform: 'ios', ultraWide: false }
const android: ZoomRange = { platform: 'android', ultraWide: false }

describe('zoom de la caméra au pincement', () => {
  it.each([multi, single, android])('écarter les doigts deux fois plus agrandit deux fois plus, comme sur l’iPhone (%o)', (r) => {
    expect(pinchMagnification(r, 1, 2)).toBeCloseTo(2, 5)
    expect(pinchMagnification(r, 2, 1.5)).toBeCloseTo(3, 5)
  })

  it('avec l’ultra grand-angle, on descend jusqu’à 0,5× ; sans lui, jamais sous 1×', () => {
    expect(pinchMagnification(multi, 1, 0.2)).toBe(0.5)
    expect(pinchMagnification(single, 1, 0.2)).toBe(1)
    expect(pinchMagnification(android, 1, 0.2)).toBe(1)
    expect(minMagnification(multi)).toBe(0.5)
  })

  it('plafonné à 10×, et une mesure invalide ne bouge rien', () => {
    expect(pinchMagnification(multi, 1, 1000)).toBe(MAX_MAGNIFICATION)
    expect(pinchMagnification(multi, 1.4, Number.NaN)).toBe(1.4)
    expect(pinchMagnification(multi, 1.4, 0)).toBe(1.4)
  })
})

describe('le grossissement devient la valeur de zoom de la caméra', () => {
  it('iPhone multi-objectifs : 0,5× est l’ultra grand-angle (zoom 0), 1× le facteur 2 où l’iPhone passe au grand-angle', () => {
    expect(cameraZoom(multi, 0.5)).toBe(0)
    // facteur = 120^zoom
    expect(Math.pow(120, cameraZoom(multi, 1))).toBeCloseTo(2, 5)
    expect(Math.pow(120, cameraZoom(multi, 2))).toBeCloseTo(4, 5)
  })

  it('iPhone objectif seul : 1× est le cadrage de départ (zoom 0)', () => {
    expect(cameraZoom(single, 1)).toBe(0)
    expect(Math.pow(60, cameraZoom(single, 3))).toBeCloseTo(3, 5)
  })

  it('Android : rapport = zoom × 10, à partir de 1×', () => {
    expect(cameraZoom(android, 1)).toBe(0)
    expect(cameraZoom(android, 3)).toBeCloseTo(0.3, 5)
  })
})

describe('les boutons d’objectif et le choix de la caméra', () => {
  it('0,5× seulement s’il y a l’ultra grand-angle ; le bouton allumé suit le pincement', () => {
    expect(zoomPresets(multi)).toEqual([0.5, 1, 2])
    expect(zoomPresets(single)).toEqual([1, 2])
    expect(activePreset([0.5, 1, 2], 0.7)).toBe(0.5)
    expect(activePreset([0.5, 1, 2], 1.4)).toBe(1)
    expect(activePreset([0.5, 1, 2], 3)).toBe(2)
  })

  it('la triple caméra d’abord, sinon la double grand-angle ; un objectif seul ne compte pas', () => {
    const t = (...types: string[]) => types.map((deviceType) => ({ deviceType }))
    expect(pickMultiLens(t('AVCaptureDeviceTypeBuiltInWideAngleCamera', 'AVCaptureDeviceTypeBuiltInDualWideCamera', 'AVCaptureDeviceTypeBuiltInTripleCamera'))).toBe('AVCaptureDeviceTypeBuiltInTripleCamera')
    expect(pickMultiLens(t('AVCaptureDeviceTypeBuiltInWideAngleCamera', 'AVCaptureDeviceTypeBuiltInDualWideCamera'))).toBe('AVCaptureDeviceTypeBuiltInDualWideCamera')
    expect(pickMultiLens(t('AVCaptureDeviceTypeBuiltInWideAngleCamera', 'AVCaptureDeviceTypeBuiltInUltraWideCamera'))).toBeUndefined()
    expect(pickMultiLens(undefined)).toBeUndefined()
  })
})

describe('l’aperçu a le cadre de la photo, pas celui de l’écran', () => {
  it('photo sur un téléphone en hauteur : 3 sur 4, sous la barre du haut', () => {
    expect(previewFrame({ width: 390, height: 844 }, 110, 4 / 3)).toEqual({ position: 'absolute', left: 0, top: 110, width: 390, height: 520 })
  })

  it('vidéo : 9 sur 16 ; un petit écran garde tout le cadre en remontant', () => {
    const tall = previewFrame({ width: 390, height: 844 }, 47, 16 / 9)
    expect(tall).toMatchObject({ top: 47, width: 390 })
    expect(tall.height).toBeCloseTo(693.33, 1)
    const small = previewFrame({ width: 375, height: 667 }, 110, 16 / 9)
    expect(small.top).toBeCloseTo(0, 0)
    expect(small.height).toBeCloseTo(666.67, 1)
  })

  it('tablette à l’horizontale : le cadre au centre, toute la hauteur', () => {
    const wide = previewFrame({ width: 1180, height: 820 }, 40, 4 / 3)
    expect(wide).toMatchObject({ top: 0, height: 820 })
    expect(wide.width).toBeCloseTo(1093.33, 1)
  })
})
