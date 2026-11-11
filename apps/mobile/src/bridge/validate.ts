import { CAPTURE_PRESETS, type BridgeRequestMap, type BridgeRequestType, type ScanFormat } from './protocol'

/**
 * Validation des requêtes reçues de la page, une par type du contrat. Une requête mal formée est
 * refusée avant d'atteindre un module natif. Les champs facultatifs absents prennent leur
 * valeur par défaut ; les champs inconnus sont ignorés (une page plus récente peut en envoyer).
 */
export type Validation<T> = { ok: true; value: T } | { ok: false; reason: string }

type Validators = { [K in BridgeRequestType]: (p: unknown) => Validation<BridgeRequestMap[K]['payload']> }

const SCAN_FORMATS: readonly ScanFormat[] = ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'datamatrix']
const HAPTIC_STYLES = ['light', 'medium', 'success', 'warning', 'error'] as const
const MAX_PRINT_HTML = 8 * 1024 * 1024

const ok = <T,>(value: T): Validation<T> => ({ ok: true, value })
const fail = <T,>(reason: string): Validation<T> => ({ ok: false, reason })

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function optionalInt(v: unknown, min: number, max: number): number | undefined | null {
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return Math.min(max, Math.max(min, Math.round(v)))
}

function stringRecord(v: unknown): Record<string, string> | undefined | null {
  if (v === undefined || v === null) return undefined
  if (!isRecord(v)) return null
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v)) {
    if (typeof val !== 'string') return null
    out[k] = val
  }
  return out
}

/** Envois : seulement en https (URL présignée de stockage, Gateway). */
export function isHttpsUrl(v: unknown): v is string {
  if (typeof v !== 'string') return false
  try {
    return new URL(v).protocol === 'https:'
  } catch {
    return false
  }
}

/** Ouverture externe : web, courriel et téléphone seulement. */
export function isExternalUrl(v: unknown): v is string {
  if (typeof v !== 'string') return false
  try {
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(new URL(v).protocol)
  } catch {
    return false
  }
}

const nonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

export const validators: Validators = {
  'camera.photo': (p) => {
    const r = isRecord(p) ? p : {}
    const maxCount = optionalInt(r.maxCount, 1, 50)
    if (maxCount === null) return fail('maxCount doit être un nombre')
    return ok({ maxCount })
  },
  'camera.video': (p) => {
    const r = isRecord(p) ? p : {}
    const maxDurationSec = optionalInt(r.maxDurationSec, 1, CAPTURE_PRESETS.video.maxDurationSec)
    if (maxDurationSec === null) return fail('maxDurationSec doit être un nombre')
    return ok({ maxDurationSec })
  },
  'audio.record': (p) => {
    const r = isRecord(p) ? p : {}
    const maxDurationSec = optionalInt(r.maxDurationSec, 1, CAPTURE_PRESETS.audio.maxDurationSec)
    if (maxDurationSec === null) return fail('maxDurationSec doit être un nombre')
    return ok({ maxDurationSec })
  },
  'media.pick': (p) => {
    if (!isRecord(p) || !Array.isArray(p.kinds) || p.kinds.length === 0) return fail('kinds est requis')
    const kinds = p.kinds.filter((k): k is 'photo' | 'video' => k === 'photo' || k === 'video')
    if (kinds.length !== p.kinds.length) return fail('kinds accepte photo et video')
    if (p.multiple !== undefined && typeof p.multiple !== 'boolean') return fail('multiple doit être un booléen')
    return ok({ kinds, multiple: p.multiple as boolean | undefined })
  },
  'file.pick': (p) => {
    const r = isRecord(p) ? p : {}
    if (r.mimeTypes !== undefined && (!Array.isArray(r.mimeTypes) || !r.mimeTypes.every(nonEmptyString)))
      return fail('mimeTypes doit être une liste de types')
    if (r.multiple !== undefined && typeof r.multiple !== 'boolean') return fail('multiple doit être un booléen')
    return ok({ mimeTypes: r.mimeTypes as string[] | undefined, multiple: r.multiple as boolean | undefined })
  },
  'upload.put': (p) => {
    if (!isRecord(p) || !nonEmptyString(p.localId)) return fail('localId est requis')
    if (!isHttpsUrl(p.url)) return fail('url doit être une adresse https')
    const headers = stringRecord(p.headers)
    if (headers === null) return fail('headers doit associer des noms à des textes')
    return ok({ localId: p.localId, url: p.url, headers })
  },
  'upload.multipart': (p) => {
    if (!isRecord(p) || !nonEmptyString(p.localId)) return fail('localId est requis')
    if (!isHttpsUrl(p.url)) return fail('url doit être une adresse https')
    if (!nonEmptyString(p.fieldName)) return fail('fieldName est requis')
    const headers = stringRecord(p.headers)
    const fields = stringRecord(p.fields)
    if (headers === null || fields === null) return fail('headers et fields associent des noms à des textes')
    return ok({ localId: p.localId, url: p.url, fieldName: p.fieldName, fields, headers })
  },
  'media.pending': () => ok({}),
  'media.discard': (p) => {
    if (!isRecord(p) || !Array.isArray(p.localIds) || !p.localIds.every(nonEmptyString))
      return fail('localIds doit être une liste')
    return ok({ localIds: p.localIds as string[] })
  },
  scan: (p) => {
    const r = isRecord(p) ? p : {}
    if (r.formats !== undefined) {
      if (!Array.isArray(r.formats) || !r.formats.every((f) => SCAN_FORMATS.includes(f as ScanFormat)))
        return fail(`formats accepte : ${SCAN_FORMATS.join(', ')}`)
    }
    if (r.prompt !== undefined && typeof r.prompt !== 'string') return fail('prompt doit être un texte')
    return ok({
      formats: r.formats as ScanFormat[] | undefined,
      prompt: typeof r.prompt === 'string' ? r.prompt.slice(0, 140) : undefined,
    })
  },
  haptics: (p) => {
    if (!isRecord(p) || !HAPTIC_STYLES.includes(p.style as (typeof HAPTIC_STYLES)[number]))
      return fail(`style accepte : ${HAPTIC_STYLES.join(', ')}`)
    return ok({ style: p.style as (typeof HAPTIC_STYLES)[number] })
  },
  keepAwake: (p) => {
    if (!isRecord(p) || typeof p.on !== 'boolean') return fail('on doit être un booléen')
    return ok({ on: p.on })
  },
  share: (p) => {
    if (!isRecord(p)) return fail('requête de partage vide')
    const { url, text, fileName, mimeType, base64 } = p
    for (const [name, v] of Object.entries({ url, text, fileName, mimeType, base64 })) {
      if (v !== undefined && typeof v !== 'string') return fail(`${name} doit être un texte`)
    }
    if (!url && !text && !base64) return fail('url, text ou base64 est requis')
    if (base64 && !nonEmptyString(fileName)) return fail('fileName est requis avec base64')
    if (url !== undefined && !isExternalUrl(url)) return fail('url doit être une adresse web')
    return ok({
      url: url as string | undefined,
      text: text as string | undefined,
      fileName: fileName as string | undefined,
      mimeType: mimeType as string | undefined,
      base64: base64 as string | undefined,
    })
  },
  print: (p) => {
    if (!isRecord(p) || !nonEmptyString(p.html)) return fail('html est requis')
    if (p.html.length > MAX_PRINT_HTML) return fail('html est trop volumineux')
    return ok({ html: p.html })
  },
  openExternal: (p) => {
    if (!isRecord(p) || !isExternalUrl(p.url)) return fail('url doit être une adresse web, mailto: ou tel:')
    return ok({ url: p.url })
  },
  'context.set': (p) => {
    if (!isRecord(p)) return fail('contexte vide')
    const { organizationId, userId } = p
    const okId = (v: unknown) => v === null || v === undefined || typeof v === 'string'
    if (!okId(organizationId) || !okId(userId)) return fail('organizationId et userId sont des textes ou null')
    return ok({
      organizationId: (organizationId as string | null | undefined) ?? null,
      userId: (userId as string | null | undefined) ?? null,
    })
  },
}

export const KNOWN_REQUEST_TYPES = Object.keys(validators) as BridgeRequestType[]

export function isKnownRequestType(type: unknown): type is BridgeRequestType {
  return typeof type === 'string' && (KNOWN_REQUEST_TYPES as string[]).includes(type)
}
