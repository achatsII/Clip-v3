import AsyncStorage from '@react-native-async-storage/async-storage'

import { BRIDGE_VERSION } from '../bridge/protocol'
import { routeBridgeMessage } from '../bridge/router'
import { capabilitiesFor } from '../config/capabilities'
import { en } from './en'
import { fr } from './fr'
import { applyPageLanguage, deviceLang, initShellLang, setShellLang, SHELL_LANGS, shellLang, shellLangOf, strings, stringsIn } from './index'
import { loadShellLang } from './persist'

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))

/** Les feuilles d'un dictionnaire : chemin → valeur. */
function leaves(o: unknown, path = ''): Array<[string, unknown]> {
  if (typeof o === 'string' || typeof o === 'function') return [[path, o]]
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
}

describe('les mots de la coquille', () => {
  it('ont les mêmes clés et les mêmes formes dans les dix-huit langues', () => {
    const f = leaves(fr)
    const keys = f.map(([k]) => k).sort()
    const wrong: string[] = []
    for (const lang of SHELL_LANGS) {
      const d = new Map(leaves(stringsIn(lang)))
      if ([...d.keys()].sort().join() !== keys.join()) wrong.push(`${lang}: clés`)
      for (const [k, v] of f) if (typeof d.get(k) !== typeof v) wrong.push(`${lang}: ${k}`)
    }
    expect(wrong).toEqual([])
    expect(SHELL_LANGS).toHaveLength(18)
  })

  it('sont vraiment traduits', () => {
    const frMap = new Map(leaves(fr))
    const copies = leaves(en).filter(([k, v]) => typeof v === 'string' && v === frMap.get(k) && /\s/.test(v))
    expect(copies).toEqual([])
    const accented = leaves(en).filter(([, v]) => typeof v === 'string' && /[àâçéèêëîïôûùœ]/i.test(v))
    expect(accented).toEqual([])
    expect(fr.photo.count(1)).toBe('1 photo')
    expect(en.photo.count(0)).toBe('0 photos')
    // Aucune autre langue n'est une copie de l'anglais ou du français (une phrase de plus de deux mots).
    const enMap = new Map(leaves(en))
    const copied = SHELL_LANGS.filter((l) => l !== 'fr' && l !== 'en').flatMap((lang) =>
      leaves(stringsIn(lang))
        .filter(([k, v]) => typeof v === 'string' && v.split(/\s+/).length > 2 && (v === enMap.get(k) || v === frMap.get(k)))
        .map(([k]) => `${lang}: ${k}`),
    )
    expect(copied).toEqual([])
  })
})

describe('la langue de la coquille', () => {
  it('part de celle de l’appareil ; une langue qu’elle ne parle pas prend la langue de la marque', () => {
    expect(['en-US', 'fr-CA', 'es-MX', 'pt-BR', 'zh-Hans-CN', 'de_AT', 'in-ID'].map((l) => deviceLang(l))).toEqual(['en', 'fr', 'es', 'pt', 'zh', 'de', 'id'])
    // La build des tests est CLIP : sa langue par défaut est le français.
    expect(deviceLang('sv-SE')).toBe('fr')
  })

  it('suit la langue que dit la page, et l’anglais pour une langue qu’elle ne parle pas', () => {
    expect(shellLangOf('fr-CA')).toBe('fr')
    expect(shellLangOf('en')).toBe('en')
    expect(shellLangOf('es')).toBe('es')
    expect(shellLangOf('ja-JP')).toBe('ja')
    expect(shellLangOf('sv')).toBe('en')
  })

  it('reprend au démarrage n’importe laquelle de ses langues, et ignore une valeur inconnue', () => {
    initShellLang('de', () => undefined)
    expect(shellLang()).toBe('de')
    expect(strings().common.close).toBe(stringsIn('de').common.close)
    initShellLang('xx', () => undefined)
    expect(shellLang()).toBe('de')
    setShellLang('fr')
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
