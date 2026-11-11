import AsyncStorage from '@react-native-async-storage/async-storage'

import { initShellLang } from './index'

const KEY = 'clip.shell.uiLang'

/**
 * Relie la langue de la coquille au stockage de l'appareil : la reprend au démarrage, et garde
 * chaque changement. Un stockage illisible laisse la langue de l'appareil.
 */
export async function loadShellLang(): Promise<void> {
  let saved: string | null = null
  try {
    saved = await AsyncStorage.getItem(KEY)
  } catch {
    // La langue de l'appareil reste.
  }
  initShellLang(saved, (lang) => {
    void AsyncStorage.setItem(KEY, lang).catch(() => undefined)
  })
}
