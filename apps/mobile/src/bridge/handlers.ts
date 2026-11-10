import * as DocumentPicker from 'expo-document-picker'
import { Directory, File, Paths } from 'expo-file-system'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as WebBrowser from 'expo-web-browser'
import { Linking, Platform, Share } from 'react-native'

import { captureController } from '../capture/controller'
import { logError, setSessionContext } from '../logging/log'
import { discardMedia } from '../media/mediaStore'
import { finalizeDocument, finalizePhoto, finalizeVideo } from '../media/pipeline'
import { uploadMultipart, uploadPut } from '../media/upload'
import { BridgeError, cancelled } from './errors'
import type { BridgeEvent, CapturedMedia } from './protocol'
import type { BridgeHandlers } from './router'

/** Au-delà, un fichier choisi n'est pas envoyé : la page doit proposer autre chose. */
const MAX_PICK_BYTES = 1024 * 1024 * 1024
const KEEP_AWAKE_TAG = 'clip-page'

const DEFAULT_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function tooLarge(name: string): BridgeError {
  return new BridgeError('too_large', `« ${name} » dépasse 1 Go. Choisissez un fichier plus court ou plus léger.`)
}

/** Les modules natifs derrière chaque capacité du pont. `emit` livre un événement à la page. */
export function createHandlers(emit: (event: BridgeEvent) => void): BridgeHandlers {
  const progress = (localId: string) => (sentBytes: number, totalBytes: number) =>
    emit({ type: 'upload.progress', localId, sentBytes, totalBytes })

  return {
    'camera.photo': (payload) => captureController.open('photo', payload),
    'camera.video': (payload) => captureController.open('video', payload),
    'audio.record': (payload) => captureController.open('audio', payload),
    scan: (payload) => captureController.open('scan', payload),

    'media.pick': async ({ kinds, multiple }) => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: kinds.map((k) => (k === 'photo' ? 'images' : 'videos')),
        allowsMultipleSelection: multiple ?? true,
        selectionLimit: multiple === false ? 1 : 30,
        orderedSelection: true,
        quality: 1,
        exif: false,
        // iOS : la vidéo choisie est réencodée en H.264 720p à l'export (Android : telle quelle,
        // la page la réduit au besoin par la Gateway).
        videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
      })
      if (result.canceled) throw cancelled()
      const items: CapturedMedia[] = []
      for (const asset of result.assets) {
        if ((asset.fileSize ?? 0) > MAX_PICK_BYTES) throw tooLarge(asset.fileName ?? 'Ce fichier')
        if (asset.type === 'video' || asset.type === 'pairedVideo') {
          const media = await finalizeVideo(
            asset.uri,
            asset.duration ? asset.duration / 1000 : undefined,
            asset.fileName ?? undefined,
          )
          if (media.sizeBytes > MAX_PICK_BYTES) {
            await discardMedia([media.localId])
            throw tooLarge(media.fileName)
          }
          items.push(media)
        } else {
          items.push(await finalizePhoto(asset.uri, asset.width, asset.height))
        }
      }
      return { items }
    },

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
