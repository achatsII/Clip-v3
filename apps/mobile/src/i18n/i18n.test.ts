import AsyncStorage from '@react-native-async-storage/async-storage'

import { BRIDGE_VERSION } from '../bridge/protocol'
import { routeBridgeMessage } from '../bridge/router'
import { capabilitiesFor } from '../config/capabilities'
import { en } from './en'
import { fr } from './fr'
import { applyPageLanguage, deviceLang, setShellLang, shellLang, shellLangOf, strings } from './index'
import { loadShellLang } from './persist'

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))

/** Les feuilles d'un dictionnaire : chemin → valeur. */
function leaves(o: unknown, path = ''): Array<[string, unknown]> {
  if (typeof o === 'string' || typeof o === 'function') return [[path, o]]
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
}

describe('les mots de la coquille', () => {
  it('ont les mêmes clés et les mêmes formes en français et en anglais', () => {
    const f = leaves(fr)
    const e = new Map(leaves(en))
    expect([...e.keys()].sort()).toEqual(f.map(([k]) => k).sort())
    for (const [k, v] of f) expect(typeof e.get(k)).toBe(typeof v)
  })

  it('sont vraiment traduits', () => {
    const frMap = new Map(leaves(fr))
    const copies = leaves(en).filter(([k, v]) => typeof v === 'string' && v === frMap.get(k) && /\s/.test(v))
    expect(copies).toEqual([])
    const accented = leaves(en).filter(([, v]) => typeof v === 'string' && /[àâçéèêëîïôûùœ]/i.test(v))
    expect(accented).toEqual([])
    expect(fr.photo.count(1)).toBe('1 photo')
    expect(en.photo.count(0)).toBe('0 photos')
  })
})

describe('la langue de la coquille', () => {
  it('part de celle de l’appareil : l’anglais s’il est en anglais, le français sinon', () => {
    expect(deviceLang('en-US')).toBe('en')
    expect(deviceLang('fr-CA')).toBe('fr')
    expect(deviceLang('es-MX')).toBe('fr')
  })

  it('suit la langue que dit la page, et l’anglais pour une langue qu’elle ne parle pas', () => {
    expect(shellLangOf('fr-CA')).toBe('fr')
    expect(shellLangOf('en')).toBe('en')
    expect(shellLangOf('es')).toBe('en')
  })

  it('reçoit la langue par le pont, la garde, et la reprend au démarrage', async () => {
    await loadShellLang()
    setShellLang('fr')
    const message = JSON.stringify({ v: BRIDGE_VERSION, id: 'l1', type: 'ui.language', payload: { lang: 'en' } })
    const handlers = {
      'ui.language': async ({ lang }: { lang: string }) => {
        applyPageLanguage(lang)
        return {}
      },
    }
    const res = await routeBridgeMessage(message, { capabilities: () => capabilitiesFor(null), handlers })
    expect(res).toMatchObject({ ok: true })
    expect(shellLang()).toBe('en')
    expect(strings().common.close).toBe('Close')
    expect(await AsyncStorage.getItem('clip.shell.uiLang')).toBe('en')

    await AsyncStorage.setItem('clip.shell.uiLang', 'fr')
    await loadShellLang()
    expect(strings().common.close).toBe('Fermer')
  })

  it('refuse une langue qui n’est pas un code', async () => {
    const message = JSON.stringify({ v: BRIDGE_VERSION, id: 'l2', type: 'ui.language', payload: { lang: 42 } })
    const res = await routeBridgeMessage(message, { capabilities: () => capabilitiesFor(null), handlers: { 'ui.language': async () => ({}) } })
    expect(res).toMatchObject({ ok: false, error: { code: 'failed' } })
  })
})
