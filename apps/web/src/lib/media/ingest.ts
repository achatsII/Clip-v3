/**
 * D'un fichier (navigateur) ou d'un média capturé par la coquille native à une source enregistrée :
 * réduction, envoi, vignette, transcription des notes vocales, conversion Word → PDF,
 * optimisation des vidéos trop lourdes.
 */
import type { CapturedMedia } from '@clip/bridge'
import { requireAiConsent } from '../ai/consent'
import { callNative, onNativeEvent } from '../bridge/native'
import { GATEWAY_URL } from '../config'
import { getAccessToken } from '../gateway/client'
import { DIRECT_UPLOAD_URL, folderPath, parseDirectUpload, presignedPutHeaders, type FilesApi } from '../gateway/files'
import { messages } from '../i18n'
import { uid } from '../model/repo'
import type { Source, SourceKind } from '../model/types'
import { audioDuration, compressImage, dataUrlToBlob, pdfPageCount, videoInfo } from './image'
import { canReadSlides, deckText, isPptx, readSlides } from './slides'

export type IngestStage = 'import' | 'prepare' | 'upload' | 'offline' | 'optimize' | 'transcribe' | 'convert'
export type IngestProgress = (stage: IngestStage, ratio?: number) => void

const WORD = /\.(docx?|odt)$/i
const SLIDES = /\.(pptx?|ppsx?|odp|key)$/i
const SLIDES_TYPES = /powerpoint|presentationml|opendocument\.presentation|keynote/i

/**
 * Une présentation (PowerPoint, Keynote) : la Gateway ne la convertit pas encore en PDF (sa route
 * n'accepte que Word et ODT). On le dit, avec le geste qui règle tout : l'enregistrer en PDF.
 */
export function isSlides(file: { type: string; name: string }): boolean {
  return SLIDES.test(file.name) || SLIDES_TYPES.test(file.type)
}
/** Au-delà, une vidéo du navigateur est réduite en 720p par la Gateway avant d'aller à l'IA. */
const VIDEO_OPTIMIZE_BYTES = 60 * 1024 * 1024

export function kindOfFile(file: { type: string; name: string }): SourceKind | null {
  if (file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name)) return 'photo'
  if (file.type.startsWith('video/') || /\.(mov|mp4|m4v|webm)$/i.test(file.name)) return 'video'
  if (file.type.startsWith('audio/') || /\.(m4a|mp3|wav|aac|ogg)$/i.test(file.name)) return 'audio'
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name) || WORD.test(file.name)) return 'document'
  return null
}

export const ACCEPTED_FILES = 'image/*,video/*,audio/*,application/pdf,.pdf,.doc,.docx,.odt,.heic,.mov,.pptx,.ppsx'

/**
 * `preset` : ce que la séance sait d'avance d'une source, comme le lien d'une photo à la note de sa
 * série (`voice`) ou l'identifiant donné d'avance à cette note.
 */
export type SourcePreset = Pick<Partial<Source>, 'id' | 'voice' | 'screen'>

export async function ingestFile(file: File, files: FilesApi, onProgress?: IngestProgress, capturedOn: Source['capturedOn'] = 'web', preset: SourcePreset = {}): Promise<Source> {
  const kind = kindOfFile(file)
  if (!kind) throw new Error(isSlides(file) ? messages().capture.upload.slides : messages().capture.upload.unsupported)
  const base: Source = { id: uid('src_'), kind, name: file.name, createdAt: new Date().toISOString(), capturedOn, ...preset }
  const up = (r: number) => onProgress?.('upload', r)
  // Un gros fichier part par morceaux : réseau coupé, il attend son retour, et la carte le dit.
  const wait = { onWait: (waiting: boolean) => onProgress?.(waiting ? 'offline' : 'upload') }
  onProgress?.('prepare')

  if (kind === 'photo') {
    const { blob, width, height } = await compressImage(file)
    const name = file.name.replace(/\.(heic|heif|png|webp)$/i, blob.type === 'image/jpeg' ? '.jpg' : '$&')
    const u = await files.upload(blob, name, 'captures', (s, t) => up(s / t))
    return { ...base, name, url: u.url, path: u.path, mimeType: u.mimeType, sizeBytes: u.sizeBytes, width, height, thumbnailUrl: u.url }
  }

  if (kind === 'video') {
    const info = await videoInfo(file)
    const u = await files.upload(file, file.name, 'captures', (s, t) => up(s / t), wait)
    let src: Source = { ...base, url: u.url, path: u.path, mimeType: u.mimeType || 'video/mp4', sizeBytes: u.sizeBytes, durationSec: info.durationSec, width: info.width, height: info.height }
    if (info.thumbnail) {
      const t = await files.upload(info.thumbnail, `${file.name}.jpg`, 'thumbs').catch(() => null)
      if (t) src.thumbnailUrl = t.url
    }
    const tooBig = (u.sizeBytes ?? 0) > VIDEO_OPTIMIZE_BYTES || Math.max(info.width ?? 0, info.height ?? 0) > 1920 || !/mp4|quicktime/.test(src.mimeType ?? '')
    if (tooBig) {
      onProgress?.('optimize')
      try {
        const p = await files.processVideo(u.url)
        src = { ...src, url: p.url, mimeType: 'video/mp4', sizeBytes: p.sizeBytes ?? src.sizeBytes, durationSec: src.durationSec ?? p.durationSec ?? undefined, path: undefined }
      } catch {
        /* la vidéo d'origine reste utilisable si elle passe sous 100 Mo */
      }
    }
    return src
  }

  if (kind === 'audio') {
    const durationSec = await audioDuration(file)
    const u = await files.upload(file, file.name, 'captures', (s, t) => up(s / t), wait)
    onProgress?.('transcribe')
    const text = await files.transcribe(file, file.name).catch(() => '')
    return { ...base, url: u.url, path: u.path, mimeType: u.mimeType, sizeBytes: u.sizeBytes, durationSec, text: text || undefined }
  }

  // Document : un Word devient un PDF (l'IA et l'aperçu lisent le PDF).
  let pdf: Blob = file
  let name = file.name
  if (WORD.test(file.name)) {
    onProgress?.('convert')
    pdf = await files.convertToPdf(file, file.name)
    name = file.name.replace(WORD, '.pdf')
  }
  const pageCount = await pdfPageCount(pdf)
  const u = await files.upload(new Blob([pdf], { type: 'application/pdf' }), name, 'documents', (s, t) => up(s / t), wait)
  return { ...base, name, originalName: file.name, url: u.url, path: u.path, mimeType: 'application/pdf', sizeBytes: u.sizeBytes, pageCount }
}

/** Ce qu'un enregistrement de l'écran donne à envoyer (`screenRecorder.ts`). */
export interface ScreenCapture {
  video: File
  durationSec: number
  shots: Array<{ blob: Blob; at: number; width: number; height: number }>
}

/**
 * Ce qui est déjà parti d'un enregistrement de l'écran : « Réessayer » reprend où l'envoi s'était
 * arrêté, sans renvoyer la vidéo ni les images déjà en ligne.
 */
export interface ScreenProgress {
  video?: Source
  shots: Array<Source | undefined>
}

/**
 * Un enregistrement de l'écran (toggle `screenCapture`) : la vidéo, puis ses images nettes, quatre à
 * la fois. Rend la vidéo (`screen`) suivie de ses images (`shot` : la vidéo et l'instant), dans
 * l'ordre du temps. `videoId` : l'identifiant donné d'avance à la vidéo.
 */
export async function ingestScreen(capture: ScreenCapture, files: FilesApi, onProgress: IngestProgress | undefined, videoId: string, done: ScreenProgress = { shots: [] }): Promise<Source[]> {
  const share = capture.shots.length ? 0.8 : 1
  if (!done.video) {
    const video = await ingestFile(capture.video, files, (stage, r) => onProgress?.(stage, r === undefined ? undefined : r * share), 'web', { id: videoId, screen: true })
    // Un enregistrement du navigateur ne dit pas toujours sa durée : on la connaît, on la garde.
    done.video = video.durationSec && Number.isFinite(video.durationSec) ? video : { ...video, durationSec: Math.round(capture.durationSec * 10) / 10 }
  }
  const createdAt = new Date().toISOString()
  let sent = done.shots.filter(Boolean).length
  const total = capture.shots.length
  const queue = capture.shots.map((shot, i) => ({ shot, i })).filter(({ i }) => !done.shots[i])
  async function worker() {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const { shot, i } = job
      const name = `${capture.video.name.replace(/\.[a-z0-9]+$/i, '')} ${clockName(shot.at)}.jpg`
      const u = await files.upload(shot.blob, name, 'captures')
      done.shots[i] = { id: uid('src_'), kind: 'photo', name, url: u.url, path: u.path, mimeType: u.mimeType || 'image/jpeg', sizeBytes: u.sizeBytes, width: shot.width, height: shot.height, thumbnailUrl: u.url, createdAt, capturedOn: 'web', shot: { sourceId: videoId, at: Math.round(shot.at * 10) / 10 } }
      sent++
      onProgress?.('upload', share + ((1 - share) * sent) / Math.max(1, total))
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker))
  const shots = done.shots.filter((x): x is Source => !!x)
  const video = !done.video.thumbnailUrl && shots[0] ? { ...done.video, thumbnailUrl: shots[0].url } : done.video
  return [video, ...shots]
}

/** « 1m05s » : l'instant d'une image de l'écran, dans un nom de fichier. */
const clockName = (sec: number) => {
  const t = Math.max(0, Math.round(sec))
  return `${Math.floor(t / 60)}m${String(t % 60).padStart(2, '0')}s`
}

/**
 * Une présentation PowerPoint lue dans l'app (toggle `slidesImport`, `slides.ts`) : une note avec son
 * texte, diapositive par diapositive, puis une photo par image, nommée d'après sa diapositive. La note
 * vient d'abord : l'IA la lit avant de regarder les images.
 */
export async function ingestSlides(file: File, files: FilesApi, onProgress?: IngestProgress, capturedOn: Source['capturedOn'] = 'web'): Promise<Source[]> {
  onProgress?.('prepare')
  let deck: Awaited<ReturnType<typeof readSlides>>
  try {
    deck = await readSlides(file)
  } catch {
    throw new Error(messages().capture.upload.unreadableSlides)
  }
  const at = new Date().toISOString()
  const photos: Source[] = []
  for (const [i, img] of deck.images.entries()) {
    onProgress?.('upload', i / Math.max(1, deck.images.length))
    photos.push(await ingestFile(new File([img.blob], img.name, { type: img.blob.type }), files, undefined, capturedOn))
  }
  const note: Source = { id: uid('src_'), kind: 'note', name: file.name, originalName: file.name, text: deckText(file.name, deck), pageCount: deck.slides.length, createdAt: at, capturedOn }
  return [note, ...photos]
}

/**
 * Un fichier, quel qu'il soit, en sources : une seule le plus souvent ; une présentation en donne
 * plusieurs (sa note et ses images). `slides` : le toggle `slidesImport`. Un .ppt, un Keynote ou un
 * .odp ne se lit pas : on dit de l'enregistrer en .pptx ou en PDF.
 */
export async function ingestAny(file: File, files: FilesApi, opts: { slides?: boolean; onProgress?: IngestProgress; capturedOn?: Source['capturedOn'] } = {}): Promise<Source[]> {
  if (opts.slides && canReadSlides()) {
    if (isPptx(file)) return ingestSlides(file, files, opts.onProgress, opts.capturedOn)
    if (isSlides(file)) throw new Error(messages().capture.upload.oldSlides)
  }
  return [await ingestFile(file, files, opts.onProgress, opts.capturedOn)]
}

/**
 * Envoie le fichier d'un média natif, sans qu'il transite par la page : PUT sur une URL présignée
 * (avec les en-têtes qu'elle signe), sinon envoi direct par la Gateway, comme le fait le navigateur.
 */
async function uploadNativeFile(item: CapturedMedia, files: FilesApi, folder: string): Promise<{ url: string; path: string }> {
  let refused = 0
  try {
    const target = await files.presign(item.fileName, item.mimeType, folder)
    const r = await callNative('upload.put', { localId: item.localId, url: target.uploadUrl, headers: presignedPutHeaders(target.uploadUrl, item.mimeType) })
    if (r.status >= 200 && r.status < 300) return { url: target.publicUrl, path: target.path }
    refused = r.status
  } catch (e) {
    // Une session expirée ne se règle pas par un autre chemin ; le reste, si.
    if ((e as { status?: number })?.status === 401) throw e
  }
  const token = getAccessToken()
  const res = await callNative('upload.multipart', {
    localId: item.localId,
    url: DIRECT_UPLOAD_URL,
    fieldName: 'files',
    fields: { path: folderPath(folder) },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(messages().capture.upload.refused(refused || '—', res.status))
  }
  const f = parseDirectUpload(res.bodyText)
  return { url: f.url, path: f.path }
}

/** Envoie un média capturé par la coquille native (le fichier ne transite pas par la page). */
export async function ingestNative(item: CapturedMedia, files: FilesApi, onProgress?: IngestProgress, platform: Source['capturedOn'] = 'ios', preset: SourcePreset = {}): Promise<Source> {
  const kind: SourceKind = item.kind === 'document' ? 'document' : item.kind
  const base: Source = {
    id: uid('src_'),
    kind,
    name: item.fileName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    width: item.width,
    height: item.height,
    durationSec: item.durationSec,
    createdAt: new Date().toISOString(),
    capturedOn: platform,
    ...preset,
  }
  const folder = kind === 'document' ? 'documents' : 'captures'
  const off = onNativeEvent((e) => {
    if (e.type === 'upload.progress' && e.localId === item.localId && e.totalBytes > 0) onProgress?.('upload', e.sentBytes / e.totalBytes)
  })
  let stored: { url: string; path: string }
  try {
    onProgress?.('upload', 0)
    stored = await uploadNativeFile(item, files, folder)
  } finally {
    off()
  }
  let src: Source = { ...base, url: stored.url, path: stored.path }
  if (kind === 'photo') src.thumbnailUrl = stored.url
  // Une vidéo de la galerie est l'original (4K, HEVC…) : la Gateway la ramène en 720p H.264, lisible partout.
  if (kind === 'video' && (item.origin === 'library' || item.sizeBytes > VIDEO_OPTIMIZE_BYTES || Math.max(item.width ?? 0, item.height ?? 0) > 1920)) {
    onProgress?.('optimize')
    try {
      const p = await files.processVideo(stored.url)
      src = { ...src, url: p.url, mimeType: 'video/mp4', sizeBytes: p.sizeBytes ?? src.sizeBytes, durationSec: src.durationSec ?? p.durationSec ?? undefined, path: undefined }
    } catch {
      /* l'original reste utilisable s'il passe sous 100 Mo */
    }
  }
  if (item.thumbnailDataUrl && kind === 'video') {
    const t = await files.upload(dataUrlToBlob(item.thumbnailDataUrl), `${item.fileName}.jpg`, 'thumbs').catch(() => null)
    if (t) src.thumbnailUrl = t.url
  }
  if (kind === 'audio') {
    onProgress?.('transcribe')
    try {
      // Comme dans le navigateur : rien ne part vers la transcription (une IA) sans l'accord de la personne.
      await requireAiConsent()
      const token = getAccessToken()
      const res = await callNative('upload.multipart', {
        localId: item.localId,
        url: `${GATEWAY_URL}/api/v1/files/audio/transcribe`,
        fieldName: 'file',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const text = (JSON.parse(res.bodyText) as { text?: string }).text?.trim()
      if (text) src = { ...src, text }
    } catch {
      /* la note vocale reste utilisable par l'IA sans transcription */
    }
  }
  void callNative('media.discard', { localIds: [item.localId] }).catch(() => undefined)
  return src
}
