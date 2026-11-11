import * as DocumentPicker from 'expo-document-picker'
import { Directory, File, Paths } from 'expo-file-system'
import * as Haptics from 'expo-haptics'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as WebBrowser from 'expo-web-browser'
import { Linking, Platform, Share } from 'react-native'

import { captureController } from '../capture/controller'
import { logError, setSessionContext } from '../logging/log'
import { thumbnailDataUrl, videoPreview } from '../media/images'
import { discardMedia, pendingMedia, toCapturedMedia } from '../media/mediaStore'
import { MAX_PICK_BYTES, pickFromLibrary, tooLarge } from '../media/pick'
import { finalizeDocument } from '../media/pipeline'
import { uploadMultipart, uploadPut } from '../media/upload'
import { BridgeError, cancelled } from './errors'
import type { BridgeEvent, CapturedMedia } from './protocol'
import type { BridgeHandlers } from './router'

const KEEP_AWAKE_TAG = 'clip-page'

const DEFAULT_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

/** Les modules natifs derrière chaque capacité du pont. `emit` livre un événement à la page. */
export function createHandlers(emit: (event: BridgeEvent) => void): BridgeHandlers {
  const progress = (localId: string) => (sentBytes: number, totalBytes: number) =>
    emit({ type: 'upload.progress', localId, sentBytes, totalBytes })

  /**
   * Signale à la page qu'un média vient d'être inscrit, avant de lui rendre la réponse : si la page
   * s'est rechargée entre-temps (iOS l'a coupée), la nouvelle page le retrouve par `media.pending`.
   */
  const announce = async (job: Promise<{ items: CapturedMedia[] }>): Promise<{ items: CapturedMedia[] }> => {
    const result = await job
    if (result.items.length) emit({ type: 'media.ready', localIds: result.items.map((i) => i.localId) })
    return result
  }

  return {
    'camera.photo': (payload) => announce(captureController.open('photo', payload)),
    'camera.video': (payload) => announce(captureController.open('video', payload)),
    'audio.record': (payload) => announce(captureController.open('audio', payload)),
    scan: (payload) => captureController.open('scan', payload),

    'media.pick': ({ kinds, multiple }) => announce(pickFromLibrary(kinds, multiple ?? true).then((items) => ({ items }))),

    'file.pick': async ({ mimeTypes, multiple }) => {
      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes?.length ? mimeTypes : DEFAULT_DOCUMENT_TYPES,
        multiple: multiple ?? false,
        copyToCacheDirectory: true,
      })
      if (result.canceled) throw cancelled()
      const items: CapturedMedia[] = []
      for (const asset of result.assets) {
        if ((asset.size ?? 0) > MAX_PICK_BYTES) throw tooLarge(asset.name)
        items.push(await finalizeDocument(asset.uri, asset.name, asset.mimeType))
      }
      return { items }
    },

    'upload.put': ({ localId, url, headers }) => uploadPut(localId, url, headers, progress(localId)),

    'upload.multipart': ({ localId, url, fieldName, fields, headers }) =>
      uploadMultipart(localId, url, fieldName, fields, headers, progress(localId)),

    'media.pending': async () => {
      const items: CapturedMedia[] = []
      for (const record of pendingMedia().slice(0, 10)) {
        let thumbnail: string | undefined
        if (record.kind === 'photo') thumbnail = await thumbnailDataUrl(record.uri)
        else if (record.kind === 'video') thumbnail = (await videoPreview(record.uri, record.durationSec)).thumbnail
        items.push(toCapturedMedia(record, thumbnail))
      }
      return { items }
    },

    'media.discard': async ({ localIds }) => {
      await discardMedia(localIds)
      return {}
    },

    haptics: async ({ style }) => {
      if (style === 'light') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      else if (style === 'medium') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      else if (style === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      else if (style === 'warning') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      else await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return {}
    },

    keepAwake: async ({ on }) => {
      if (on) await activateKeepAwakeAsync(KEEP_AWAKE_TAG)
      else await deactivateKeepAwake(KEEP_AWAKE_TAG)
      return {}
    },

    share: async ({ url, text, fileName, mimeType, base64 }) => {
      if (base64 && fileName) {
        if (!(await Sharing.isAvailableAsync())) {
          throw new BridgeError('unsupported', 'Le partage de fichiers n’est pas disponible sur cet appareil.')
        }
        const dir = new Directory(Paths.cache, 'clip-share')
        if (!dir.exists) dir.create({ intermediates: true, idempotent: true })
        const safeName = fileName.replace(/[\\/:*?"<>|]+/g, '-')
        const file = new File(dir, safeName)
        if (file.exists) file.delete()
        file.create()
        await file.write(base64, { encoding: 'base64' })
        await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Partager' })
        return {}
      }
      const outcome = await Share.share(
        Platform.OS === 'ios' && url
          ? { url, ...(text ? { message: text } : {}) }
          : { message: [text, url].filter(Boolean).join('\n') },
      )
      if (outcome.action === Share.dismissedAction) throw cancelled()
      return {}
    },

    print: async ({ html }) => {
      try {
        await Print.printAsync({ html })
      } catch (e) {
        logError(e, { action: 'print' })
        throw new BridgeError('failed', 'L’impression n’a pas pu s’ouvrir.')
      }
      return {}
    },

    openExternal: async ({ url }) => {
      const protocol = new URL(url).protocol
      if (protocol === 'https:' || protocol === 'http:') await WebBrowser.openBrowserAsync(url)
      else await Linking.openURL(url)
      return {}
    },

    'context.set': async ({ organizationId, userId }) => {
      setSessionContext(organizationId, userId)
      return {}
    },
  }
}
