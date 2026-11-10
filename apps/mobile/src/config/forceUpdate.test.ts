import type { PublicConfig } from '../bridge/protocol'
import { evaluateForceUpdate } from './forceUpdate'

function config(forceUpdate: PublicConfig['forceUpdate']): PublicConfig {
  return { configVersion: 1, forceUpdate, toggles: {}, realtime: false }
}

const ios = { versions: '<1.2.0', storeUrl: 'https://apps.apple.com/app/id000000' }

describe('evaluateForceUpdate', () => {
  it('bloque une version visée par la contrainte du serveur', () => {
    expect(evaluateForceUpdate(config({ ios }), 'ios', '1.1.9')).toEqual({ blocked: true, storeUrl: ios.storeUrl })
  })

  it('ne bloque pas une version hors de la contrainte', () => {
    expect(evaluateForceUpdate(config({ ios }), 'ios', '1.2.0')).toEqual({ blocked: false })
    expect(evaluateForceUpdate(config({ ios }), 'ios', '2.0.0')).toEqual({ blocked: false })
  })

  it('ne bloque jamais quand le serveur est injoignable', () => {
    expect(evaluateForceUpdate(null, 'ios', '0.0.1')).toEqual({ blocked: false })
  })

  it('ne bloque pas une plateforme que la règle ne vise pas', () => {
    expect(evaluateForceUpdate(config({ ios }), 'android', '1.0.0')).toEqual({ blocked: false })
  })

  it('ne bloque pas sur une contrainte ou une version illisible', () => {
    expect(evaluateForceUpdate(config({ ios: { ...ios, versions: 'n’importe quoi' } }), 'ios', '1.0.0')).toEqual({
      blocked: false,
    })
    expect(evaluateForceUpdate(config({ ios }), 'ios', 'inconnue')).toEqual({ blocked: false })
  })

  it('compare aussi une version incomplète (« 1.1 » vaut 1.1.0)', () => {
    expect(evaluateForceUpdate(config({ ios }), 'ios', '1.1')).toMatchObject({ blocked: true })
  })

  it('bloque sans bouton quand l’adresse du magasin est absente ou suspecte', () => {
    expect(evaluateForceUpdate(config({ ios: { versions: '<9.0.0', storeUrl: '' } }), 'ios', '1.0.0')).toEqual({
      blocked: true,
      storeUrl: null,
    })
    expect(
      evaluateForceUpdate(config({ ios: { versions: '<9.0.0', storeUrl: 'javascript:alert(1)' } }), 'ios', '1.0.0'),
    ).toEqual({ blocked: true, storeUrl: null })
  })
})
