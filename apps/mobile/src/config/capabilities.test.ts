import type { PublicConfig } from '../bridge/protocol'
import { CAPTURE_CAPABILITIES, SHELL_CAPABILITIES, capabilitiesFor } from './capabilities'

function withToggles(toggles: Record<string, boolean>): PublicConfig {
  return { configVersion: 1, forceUpdate: {}, toggles, realtime: false }
}

describe('capabilitiesFor', () => {
  it('annonce tout ce que la coquille sait faire quand le serveur est injoignable', () => {
    expect(capabilitiesFor(null)).toEqual([...SHELL_CAPABILITIES])
  })

  it('annonce tout quand le toggle est absent ou allumé', () => {
    expect(capabilitiesFor(withToggles({}))).toEqual([...SHELL_CAPABILITIES])
    expect(capabilitiesFor(withToggles({ nativeCapture: true }))).toEqual([...SHELL_CAPABILITIES])
  })

  it('retire la capture native quand le serveur la coupe, et garde le reste', () => {
    const caps = capabilitiesFor(withToggles({ nativeCapture: false }))
    for (const c of CAPTURE_CAPABILITIES) expect(caps).not.toContain(c)
    // Les envois des médias déjà capturés doivent pouvoir finir.
    expect(caps).toEqual(expect.arrayContaining(['upload.put', 'upload.multipart', 'media.discard', 'scan', 'print']))
  })

  it('ignore les toggles qu’il ne connaît pas', () => {
    expect(capabilitiesFor(withToggles({ autreChose: false }))).toEqual([...SHELL_CAPABILITIES])
  })
})

describe('reprise des médias après un rechargement de la page', () => {
  it('media.pending reste annoncé, même capture native coupée : un média déjà pris doit pouvoir partir', () => {
    expect(capabilitiesFor(null)).toContain('media.pending')
    expect(capabilitiesFor({ configVersion: 1, forceUpdate: {}, toggles: { nativeCapture: false }, realtime: false })).toContain('media.pending')
  })
})
