import * as ImagePicker from 'expo-image-picker'

import { BridgeError, cancelled } from '../bridge/errors'
import type { CapturedMedia } from '../bridge/protocol'
import { discardMedia } from './mediaStore'
import { finalizePhoto, finalizeVideo } from './pipeline'

/** Au-delà, un fichier choisi n'est pas envoyé : la page doit proposer autre chose. */
export const MAX_PICK_BYTES = 1024 * 1024 * 1024

export function tooLarge(name: string): BridgeError {
  return new BridgeError('too_large', `« ${name} » dépasse 1 Go. Choisissez un fichier plus court ou plus léger.`)
}

/**
 * Photos et vidéos déjà sur le téléphone, ramenées aux réglages de capture : sur iOS, la vidéo
 * choisie est réencodée en H.264 720p à l'export ; sur Android, la page la réduit au besoin par
 * la Gateway. Sert à `media.pick` et au bouton « Galerie » des écrans de caméra.
 */
export async function pickFromLibrary(kinds: Array<'photo' | 'video'>, multiple = true): Promise<CapturedMedia[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kinds.map((k) => (k === 'photo' ? 'images' : 'videos')),
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 30 : 1,
    orderedSelection: true,
    quality: 1,
    exif: false,
    videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
  })
  if (result.canceled) throw cancelled()
  const items: CapturedMedia[] = []
  for (const asset of result.assets) {
    if ((asset.fileSize ?? 0) > MAX_PICK_BYTES) throw tooLarge(asset.fileName ?? 'Ce fichier')
    if (asset.type === 'video' || asset.type === 'pairedVideo') {
      const media = await finalizeVideo(asset.uri, asset.duration ? asset.duration / 1000 : undefined, asset.fileName ?? undefined)
      if (media.sizeBytes > MAX_PICK_BYTES) {
        await discardMedia([media.localId])
        throw tooLarge(media.fileName)
      }
      items.push(media)
    } else {
      items.push(await finalizePhoto(asset.uri, asset.width, asset.height))
    }
  }
  return items
}
