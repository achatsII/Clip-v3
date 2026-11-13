import type { Capability, PublicConfig } from '../bridge/protocol'

/** Tout ce que cette version de la coquille sait faire. */
export const SHELL_CAPABILITIES: readonly Capability[] = [
  'camera.photo',
  'camera.video',
  'audio.record',
  'media.pick',
  'file.pick',
  'upload.put',
  'upload.multipart',
  'media.discard',
  'media.pending',
  'scan',
  'haptics',
  'keepAwake',
  'share',
  'print',
  'openExternal',
  'context.set',
  'ui.language',
]

/**
 * Les capacités de capture, retirées quand le serveur coupe la capture native
 * (toggle `nativeCapture` à false) : la page retombe alors sur la capture du navigateur.
 * L'envoi et le nettoyage restent annoncés, pour finir les envois de médias déjà capturés.
 */
export const CAPTURE_CAPABILITIES: readonly Capability[] = [
  'camera.photo',
  'camera.video',
  'audio.record',
  'media.pick',
  'file.pick',
]

/**
 * Les capacités annoncées à la page. Serveur injoignable (`config` nul) : le comportement de
 * base de la coquille, avec la capture native. Le repli n'ajoute jamais rien.
 */
export function capabilitiesFor(config: PublicConfig | null, device: { store?: boolean; push?: boolean } = {}): Capability[] {
  const nativeCaptureOff = config?.toggles?.nativeCapture === false
  const caps = SHELL_CAPABILITIES.filter((c) => !(nativeCaptureOff && CAPTURE_CAPABILITIES.includes(c)))
  // L'achat dans le magasin : une fonction nouvelle, seulement si le serveur l'allume (toggle
  // `storePurchases`) et que cette version de l'app peut acheter (clé RevenueCat, hors Expo Go).
  if (device.store && config?.toggles?.storePurchases === true) caps.push(...STORE_CAPABILITIES)
  // Les avertissements sur le téléphone : seulement si le serveur les allume (toggle `notify`) et
  // que cette version de l'app a le module (hors Expo Go).
  if (device.push && config?.toggles?.notify === true) caps.push('push.register')
  return caps
}

/** L'achat dans le magasin : quatre requêtes, annoncées ensemble. */
export const STORE_CAPABILITIES: readonly Capability[] = ['store.connect', 'store.offers', 'store.purchase', 'store.restore']
