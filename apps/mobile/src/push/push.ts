/**
 * Les avertissements sur le téléphone (toggle `notify`) : la permission, le jeton push d'Expo que la
 * page range dans la fiche de contact de la personne, et le toucher sur un avertissement, qui ouvre
 * sa page dans CLIP. Hors Expo Go seulement (le push y est retiré) ; le module part dans une build.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants'
import type * as NotificationsModule from 'expo-notifications'
import { Platform } from 'react-native'

import { BridgeError } from '../bridge/errors'
import { strings } from '../i18n'

/**
 * Le module, chargé au premier usage : une version de l'app construite avant lui (sans le module
 * natif) ne plante pas en recevant ce code par une mise à jour à distance ; le push y est absent.
 */
let loaded: typeof NotificationsModule | null | undefined
function notifications(): typeof NotificationsModule | null {
  if (loaded !== undefined) return loaded
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('expo-notifications') as typeof NotificationsModule
  } catch {
    loaded = null
  }
  return loaded
}

/** Le push est-il possible dans cette version de l'app ? */
export function pushAvailable(): boolean {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && (Platform.OS === 'ios' || Platform.OS === 'android') && notifications() !== null
}

let handlerSet = false
/** Un avertissement reçu pendant que CLIP est ouvert s'affiche quand même. */
function ensureHandler(Notifications: typeof NotificationsModule) {
  if (handlerSet) return
  handlerSet = true
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  })
}

/** Demande la permission (une fois), puis rend le jeton push de ce téléphone. */
export async function registerForPush(): Promise<{ token: string; platform: 'ios' | 'android' }> {
  const Notifications = notifications()
  if (!pushAvailable() || !Notifications) throw new BridgeError('unsupported', strings().errors.pushUnavailable)
  ensureHandler(Notifications)
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'CLIP', importance: Notifications.AndroidImportance.HIGH })
  let granted = (await Notifications.getPermissionsAsync()).granted
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted
  if (!granted) throw new BridgeError('permission_denied', strings().errors.pushDenied)
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
  return { token: data, platform: Platform.OS === 'ios' ? 'ios' : 'android' }
}

/** L'adresse qu'un avertissement touché veut ouvrir. */
const urlOf = (r: NotificationsModule.NotificationResponse | null): string | null => {
  const url = r?.notification.request.content.data?.url
  return typeof url === 'string' ? url : null
}

/**
 * Un toucher sur un avertissement ouvre sa page : celui qui a lancé l'app, puis chaque suivant.
 * Rend la fonction qui arrête d'écouter.
 */
export function onPushOpen(open: (url: string) => void): () => void {
  const Notifications = notifications()
  if (!pushAvailable() || !Notifications) return () => undefined
  ensureHandler(Notifications)
  void Notifications.getLastNotificationResponseAsync()
    .then((r) => {
      const url = urlOf(r)
      if (url) open(url)
    })
    .catch(() => undefined)
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const url = urlOf(r)
    if (url) open(url)
  })
  return () => sub.remove()
}
