import * as ImagePicker from 'expo-image-picker'

import { BridgeError, cancelled } from '../bridge/errors'
import type { CapturedMedia } from '../bridge/protocol'
import { discardMedia } from './mediaStore'
import { finalizePhoto, finalizeVideo } from './pipeline'
import { strings } from '../i18n'

/** Au-delà, un fichier choisi n'est pas envoyé : la page doit proposer autre chose. */
export const MAX_PICK_BYTES = 1024 * 1024 * 1024

export function tooLarge(name: string, video = false): BridgeError {
  return new BridgeError(
    'too_large',
    video
      ? strings().errors.tooLargeVideo(name)
      : strings().errors.tooLargeFile(name),
  )
}

/**
 * Photos et vidéos déjà sur le téléphone. La vidéo est rendue telle quelle (l'original, téléchargé
 * d'iCloud au besoin) : la réencoder sur l'iPhone prenait plusieurs minutes pour une longue vidéo,
 * sans retour possible, et la pression sur la mémoire pouvait faire couper la page web. La page
 * l'envoie, puis la Gateway la ramène en 720p. Sert à `media.pick` et au bouton « Galerie » des
 * écrans de caméra.
 */
export async function pickFromLibrary(kinds: Array<'photo' | 'video'>, multiple = true): Promise<CapturedMedia[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kinds.map((k) => (k === 'photo' ? 'images' : 'videos')),
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 30 : 1,
    orderedSelection: true,
    quality: 1,
    exif: false,
    videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  })
  if (result.canceled) throw cancelled()
  const items: CapturedMedia[] = []
  for (const asset of result.assets) {
    if ((asset.fileSize ?? 0) > MAX_PICK_BYTES) throw tooLarge(asset.fileName ?? strings().errors.thisVideo, asset.type === 'video')
    if (asset.type === 'video' || asset.type === 'pairedVideo') {
      const media = await finalizeVideo(asset.uri, asset.duration ? asset.duration / 1000 : undefined, asset.fileName ?? undefined, 'library')
      if (media.sizeBytes > MAX_PICK_BYTES) {
        await discardMedia([media.localId])
        throw tooLarge(media.fileName, true)
      }
      items.push(media)
    } else {
      items.push(await finalizePhoto(asset.uri, asset.width, asset.height, 'library'))
    }
  }
  return items
}
