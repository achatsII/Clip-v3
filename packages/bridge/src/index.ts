/**
 * Contrat du pont entre l'app web de CLIP V3 et sa coquille native (Expo).
 *
 * L'interface de CLIP vit dans l'app web ; la coquille native l'affiche dans une WebView et
 * n'ajoute que ce que le navigateur fait mal : la capture à poids contrôlé, le scan, l'envoi
 * des fichiers lourds, l'impression, le partage et les achats des magasins.
 *
 * Règles du contrat (une coquille installée ne se remplace pas quand on veut) :
 * - on n'enlève ni ne renomme jamais un type de requête ou un champ : on en ajoute ;
 * - un champ ajouté est facultatif, avec une valeur par défaut des deux côtés ;
 * - l'app web lit `capabilities` avant d'appeler : une capacité absente = le chemin web.
 */

export const BRIDGE_VERSION = 1 as const

export type NativePlatform = 'ios' | 'android'

/** Ce que la coquille sait faire. L'app web n'appelle que ce qui est annoncé. */
export type Capability =
  | 'camera.photo'
  | 'camera.video'
  | 'audio.record'
  | 'media.pick'
  | 'file.pick'
  | 'upload.put'
  | 'upload.multipart'
  | 'media.discard'
  | 'scan'
  | 'haptics'
  | 'keepAwake'
  | 'share'
  | 'print'
  | 'openExternal'
  | 'context.set'

/** Injecté par la coquille dans `window.__CLIP_NATIVE__` avant le chargement de la page. */
export interface NativeEnvironment {
  bridgeVersion: number
  /** Version de la coquille (semver), celle que compare la mise à jour forcée. */
  appVersion: string
  buildNumber?: string
  platform: NativePlatform
  capabilities: Capability[]
  /** Identifiant aléatoire de l'installation (jamais un identifiant matériel). */
  installId: string
}

/** Préréglages de capture : ce qui garde les médias légers. Partagés pour que le web affiche les mêmes limites. */
export const CAPTURE_PRESETS = {
  photo: { maxDimension: 1920, jpegQuality: 0.72 },
  video: { quality: '720p' as const, bitrate: 2_500_000, maxDurationSec: 600 },
  audio: { sampleRate: 44_100, channels: 1, bitrate: 64_000, maxDurationSec: 600 },
} as const

export type CapturedKind = 'photo' | 'video' | 'audio' | 'document'

/** Un fichier capturé ou choisi, gardé dans le cache de la coquille jusqu'à `media.discard`. */
export interface CapturedMedia {
  localId: string
  kind: CapturedKind
  mimeType: string
  fileName: string
  sizeBytes: number
  width?: number
  height?: number
  durationSec?: number
  /** Petite vignette JPEG en data URL, pour l'affichage immédiat. */
  thumbnailDataUrl?: string
}

export type ScanFormat = 'qr' | 'code128' | 'code39' | 'ean13' | 'ean8' | 'upc_a' | 'datamatrix'

/** Requête web → natif : `type` et la forme de `payload` / `result`. */
export interface BridgeRequestMap {
  'camera.photo': { payload: { maxCount?: number }; result: { items: CapturedMedia[] } }
  'camera.video': { payload: { maxDurationSec?: number }; result: { items: CapturedMedia[] } }
  'audio.record': { payload: { maxDurationSec?: number }; result: { items: CapturedMedia[] } }
  'media.pick': { payload: { kinds: Array<'photo' | 'video'>; multiple?: boolean }; result: { items: CapturedMedia[] } }
  'file.pick': { payload: { mimeTypes?: string[]; multiple?: boolean }; result: { items: CapturedMedia[] } }
  /** Envoie un fichier capturé sur une URL présignée (PUT). Émet `upload.progress`. */
  'upload.put': {
    payload: { localId: string; url: string; headers?: Record<string, string> }
    result: { status: number }
  }
  /** Envoie un fichier capturé en multipart (ex. transcription) avec les en-têtes fournis. */
  'upload.multipart': {
    payload: {
      localId: string
      url: string
      fieldName: string
      fields?: Record<string, string>
      headers?: Record<string, string>
    }
    result: { status: number; bodyText: string }
  }
  /** Libère les fichiers du cache de la coquille une fois envoyés. */
  'media.discard': { payload: { localIds: string[] }; result: Record<string, never> }
  scan: {
    payload: { formats?: ScanFormat[]; prompt?: string }
    result: { value: string; format: string }
  }
  haptics: { payload: { style: 'light' | 'medium' | 'success' | 'warning' | 'error' }; result: Record<string, never> }
  keepAwake: { payload: { on: boolean }; result: Record<string, never> }
  share: {
    payload: { url?: string; text?: string; fileName?: string; mimeType?: string; base64?: string }
    result: Record<string, never>
  }
  print: { payload: { html: string }; result: Record<string, never> }
  openExternal: { payload: { url: string }; result: Record<string, never> }
  /** Le web dit à la coquille qui est connecté, pour ses journaux (`organizationId`). */
  'context.set': {
    payload: { organizationId: string | null; userId: string | null }
    result: Record<string, never>
  }
}

/**
 * Réponse publique de `GET {web}/api/config`, lue aussi par la coquille au démarrage et au
 * retour au premier plan. Serveur injoignable : rien ne bloque et chaque toggle prend son repli.
 */
export interface PublicConfig {
  configVersion: 1
  /** Versions de la coquille à bloquer (contrainte semver, ex. "<1.2.0"), par plateforme. */
  forceUpdate: Partial<Record<NativePlatform, { versions: string; storeUrl: string }>>
  toggles: Record<string, boolean>
  realtime: boolean
}

export type BridgeRequestType = keyof BridgeRequestMap

export type BridgeErrorCode = 'cancelled' | 'permission_denied' | 'unsupported' | 'too_large' | 'network' | 'failed'

/** Messages sur le fil (JSON). `v` = BRIDGE_VERSION de l'émetteur. */
export interface BridgeRequestMessage<T extends BridgeRequestType = BridgeRequestType> {
  v: number
  id: string
  type: T
  payload: BridgeRequestMap[T]['payload']
}

export type BridgeResponseMessage<T extends BridgeRequestType = BridgeRequestType> =
  | { v: number; id: string; ok: true; result: BridgeRequestMap[T]['result'] }
  | { v: number; id: string; ok: false; error: { code: BridgeErrorCode; message: string } }

/** Événements natif → web, sans requête. */
export type BridgeEvent =
  | { type: 'upload.progress'; localId: string; sentBytes: number; totalBytes: number }
  | { type: 'app.foreground' }
  | { type: 'deeplink'; url: string }

export interface BridgeEventMessage {
  v: number
  event: BridgeEvent
}

/** Nom de la fonction globale que la coquille appelle pour livrer réponses et événements. */
export const WEB_RECEIVER = '__clipBridgeReceive' as const

export function isResponseMessage(msg: unknown): msg is BridgeResponseMessage {
  return !!msg && typeof msg === 'object' && 'id' in msg && 'ok' in msg
}

export function isEventMessage(msg: unknown): msg is BridgeEventMessage {
  return !!msg && typeof msg === 'object' && 'event' in msg
}

export function isRequestMessage(msg: unknown): msg is BridgeRequestMessage {
  return !!msg && typeof msg === 'object' && 'id' in msg && 'type' in msg && 'payload' in msg
}
