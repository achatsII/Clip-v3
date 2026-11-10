import { BridgeError } from './errors'
import { BRIDGE_VERSION, CAPTURE_PRESETS, type Capability } from './protocol'
import { routeBridgeMessage, type BridgeHandlers } from './router'

const announced: Capability[] = ['camera.photo', 'camera.video', 'haptics', 'upload.put', 'scan', 'print']

function request(type: string, payload: unknown, id = 'r1') {
  return JSON.stringify({ v: BRIDGE_VERSION, id, type, payload })
}

function deps(handlers: Partial<BridgeHandlers>, onError = jest.fn()) {
  return { handlers, capabilities: () => announced, onError }
}

describe('routeBridgeMessage', () => {
  it('ignore ce qui n’est pas une requête du pont (rien à répondre sans identifiant)', async () => {
    expect(await routeBridgeMessage('pas du json', deps({}))).toBeNull()
    expect(await routeBridgeMessage(JSON.stringify({ hello: 'world' }), deps({}))).toBeNull()
    expect(await routeBridgeMessage(JSON.stringify({ type: 'haptics', payload: {} }), deps({}))).toBeNull()
  })

  it('répond « unsupported » à un type inconnu de cette version', async () => {
    const res = await routeBridgeMessage(request('teleport', {}), deps({}))
    expect(res).toEqual({
      v: BRIDGE_VERSION,
      id: 'r1',
      ok: false,
      error: { code: 'unsupported', message: expect.stringContaining('teleport') },
    })
  })

  it('répond « unsupported » à une capacité connue mais non annoncée en ce moment', async () => {
    const share = jest.fn()
    const res = await routeBridgeMessage(request('share', { text: 'x' }), deps({ share }))
    expect(res).toMatchObject({ ok: false, error: { code: 'unsupported' } })
    expect(share).not.toHaveBeenCalled()
  })

  it('répond « unsupported » quand aucun module ne traite une capacité annoncée', async () => {
    const res = await routeBridgeMessage(request('print', { html: '<p>x</p>' }), deps({}))
    expect(res).toMatchObject({ ok: false, error: { code: 'unsupported' } })
  })

  it('refuse une charge utile invalide avant d’appeler le module', async () => {
    const haptics = jest.fn()
    const res = await routeBridgeMessage(request('haptics', { style: 'boum' }), deps({ haptics }))
    expect(res).toMatchObject({ ok: false, error: { code: 'failed', message: expect.stringContaining('style') } })
    expect(haptics).not.toHaveBeenCalled()
  })

  it('refuse un envoi vers une adresse qui n’est pas en https', async () => {
    const put = jest.fn()
    const res = await routeBridgeMessage(
      request('upload.put', { localId: 'a', url: 'http://exemple.test/f' }),
      deps({ 'upload.put': put }),
    )
    expect(res).toMatchObject({ ok: false, error: { code: 'failed' } })
    expect(put).not.toHaveBeenCalled()
  })

  it('rend le résultat du module, avec la version du pont et l’identifiant reçu', async () => {
    const haptics = jest.fn().mockResolvedValue({})
    const res = await routeBridgeMessage(request('haptics', { style: 'success' }, 'abc'), deps({ haptics }))
    expect(haptics).toHaveBeenCalledWith({ style: 'success' })
    expect(res).toEqual({ v: BRIDGE_VERSION, id: 'abc', ok: true, result: {} })
  })

  it('ramène une durée de vidéo trop longue au maximum des préréglages', async () => {
    const video = jest.fn().mockResolvedValue({ items: [] })
    await routeBridgeMessage(request('camera.video', { maxDurationSec: 99_999 }), deps({ 'camera.video': video }))
    expect(video).toHaveBeenCalledWith({ maxDurationSec: CAPTURE_PRESETS.video.maxDurationSec })
  })

  it('accepte une charge utile absente pour une capture sans option', async () => {
    const photo = jest.fn().mockResolvedValue({ items: [] })
    const res = await routeBridgeMessage(
      JSON.stringify({ v: 1, id: 'p', type: 'camera.photo' }),
      deps({ 'camera.photo': photo }),
    )
    expect(res).toMatchObject({ ok: true })
    expect(photo).toHaveBeenCalledWith({ maxCount: undefined })
  })

  it('transmet le code d’une erreur du pont (ex. capture annulée)', async () => {
    const scan = jest.fn().mockRejectedValue(new BridgeError('cancelled', 'Annulé.'))
    const res = await routeBridgeMessage(request('scan', {}), deps({ scan }))
    expect(res).toEqual({ v: BRIDGE_VERSION, id: 'r1', ok: false, error: { code: 'cancelled', message: 'Annulé.' } })
  })

  it('rend « failed » sur une erreur inattendue et la journalise', async () => {
    const onError = jest.fn()
    const photo = jest.fn().mockRejectedValue(new Error('caméra occupée'))
    const res = await routeBridgeMessage(request('camera.photo', {}), deps({ 'camera.photo': photo }, onError))
    expect(res).toMatchObject({ ok: false, error: { code: 'failed', message: 'caméra occupée' } })
    expect(onError).toHaveBeenCalledWith(expect.any(Error), { type: 'camera.photo' })
  })
})
