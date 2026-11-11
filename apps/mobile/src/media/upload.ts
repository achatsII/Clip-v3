import { UploadType, type UploadOptions, type UploadResult } from 'expo-file-system'

import { BridgeError } from '../bridge/errors'
import { logEvent } from '../logging/log'
import { localStore } from '../storage/localStore'
import { mediaFile } from './mediaStore'
import { strings } from '../i18n'

export type ProgressSink = (sentBytes: number, totalBytes: number) => void

/** Progression au plus toutes les 200 ms, et toujours la dernière valeur. */
function throttled(sink: ProgressSink): (p: { bytesSent: number; totalBytes: number }) => void {
  let last = 0
  return ({ bytesSent, totalBytes }) => {
    const now = Date.now()
    if (now - last >= 200 || bytesSent >= totalBytes) {
      last = now
      sink(bytesSent, totalBytes)
    }
  }
}

function requireMedia(localId: string) {
  const found = mediaFile(localId)
  if (!found) throw new BridgeError('failed', strings().errors.mediaGone)
  return found
}

/** Une seule nouvelle tentative, et seulement quand la requête n'a pas abouti (coupure réseau). */
async function withOneRetry(run: () => Promise<UploadResult>, action: string): Promise<UploadResult> {
  try {
    return await run()
  } catch (first) {
    logEvent('upload.retry', { action, reason: first instanceof Error ? first.message : String(first) })
    try {
      return await run()
    } catch (second) {
      throw new BridgeError(
        'network',
        strings().errors.uploadFailed +
          (second instanceof Error && second.message ? ` (${second.message})` : ''),
      )
    }
  }
}

/** PUT binaire sur une URL présignée. Le type de contenu est celui du média, sauf s'il est fourni. */
export async function uploadPut(
  localId: string,
  url: string,
  headers: Record<string, string> | undefined,
  onProgress: ProgressSink,
): Promise<{ status: number }> {
  const { record, file } = requireMedia(localId)
  const hasContentType = Object.keys(headers ?? {}).some((h) => h.toLowerCase() === 'content-type')
  const options: UploadOptions = {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { ...(hasContentType ? {} : { 'Content-Type': record.mimeType }), ...(headers ?? {}) },
    onProgress: throttled(onProgress),
  }
  const result = await withOneRetry(() => file.upload(url, options), 'upload.put')
  if (result.status >= 200 && result.status < 300) {
    await localStore.patchMedia(localId, { uploadedAt: Date.now() })
  }
  return { status: result.status }
}

/** POST multipart (ex. transcription) avec les en-têtes fournis par la page. */
export async function uploadMultipart(
  localId: string,
  url: string,
  fieldName: string,
  fields: Record<string, string> | undefined,
  headers: Record<string, string> | undefined,
  onProgress: ProgressSink,
): Promise<{ status: number; bodyText: string }> {
  const { record, file } = requireMedia(localId)
  const options: UploadOptions = {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName,
    mimeType: record.mimeType,
    parameters: fields,
    headers,
    onProgress: throttled(onProgress),
  }
  const result = await withOneRetry(() => file.upload(url, options), 'upload.multipart')
  return { status: result.status, bodyText: result.body ?? '' }
}
