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
export function capabilitiesFor(config: PublicConfig | null): Capability[] {
  const nativeCaptureOff = config?.toggles?.nativeCapture === false
  return SHELL_CAPABILITIES.filter((c) => !(nativeCaptureOff && CAPTURE_CAPABILITIES.includes(c)))
}
