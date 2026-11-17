/**
 * Les photos prises au poste : une photo de preuve d'un relevé, celle d'un retour « Pas clair ? ».
 *
 * Avec un compte, la photo part au stockage (`files.upload`) et se désigne par son adresse.
 *
 * Sur un lien public (tablette d'un poste, code QR d'une instruction), c'est impossible : la Gateway
 * n'accepte l'envoi de fichiers que des rôles `user` et `admin`, jamais `guest` (routes
 * `files/upload/generate/presigned-url` et `files/upload/direct`, vérifié au catalogue le
 * 2026-11-14). La photo, réduite, va alors dans la base, un document `clip_photo` à elle, que le
 * relevé ou le retour désigne par une référence courte (`clip-photo:<id>`) : le registre et la
 * liste des retours restent légers, et l'image ne se lit qu'à l'affichage.
 *
 * Un lien créé avant la portée v3 ne peut pas écrire `clip_photo` : la photo va alors dans le relevé
 * lui-même (une adresse `data:`), pour que rien ne casse avant la mise à jour du lien.
 */
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { ApiError } from '../gateway/client'
import type { DataApi } from '../gateway/data'
import type { FilesApi } from '../gateway/files'
import { T } from '../model/repo'
import type { Execution, PhotoDoc } from '../model/types'
import { compressImage, dataUrlToBlob } from './image'

/** Envoie une photo et rend ce qui la désigne : une adresse, ou une référence `clip-photo:`. */
export type PhotoSaver = (file: Blob, name: string, folder: 'execution' | 'feedback') => Promise<string>

export const PHOTO_REF = 'clip-photo:'
export const isPhotoRef = (value: string | null | undefined): value is string => typeof value === 'string' && value.startsWith(PHOTO_REF)
export const isInlinePhoto = (value: string | null | undefined): value is string => typeof value === 'string' && value.startsWith('data:image/')
export const photoIdOf = (ref: string) => ref.slice(PHOTO_REF.length)

/** Une photo dans la base : assez nette pour la preuve, assez légère pour un document (≈ 250 Ko au plus). */
export const DB_PHOTO_MAX_CHARS = 340_000
const DB_PHOTO_STEPS: Array<[number, number]> = [
  [1280, 0.6],
  [960, 0.5],
  [720, 0.45],
]

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read'))
    reader.readAsDataURL(blob)
  })
}

/** La photo réduite pour la base, en adresse `data:`, de plus en plus petite jusqu'à passer. */
export async function photoForDatabase(file: Blob): Promise<{ dataUrl: string; width?: number; height?: number; bytes: number }> {
  let last: { dataUrl: string; width?: number; height?: number; bytes: number } | null = null
  for (const [size, quality] of DB_PHOTO_STEPS) {
    const { blob, width, height } = await compressImage(file, size, quality)
    const dataUrl = await readAsDataUrl(blob)
    last = { dataUrl, width, height, bytes: blob.size }
    if (dataUrl.length <= DB_PHOTO_MAX_CHARS) return last
  }
  return last!
}

/** Les aperçus des photos prises sur cet appareil : l'opérateur voit la sienne sans rien relire. */
const localPreviews = new Map<string, string>()
export const localPhoto = (value: string) => localPreviews.get(value) ?? null

/** Avec un compte : le stockage, comme avant. */
export function filesPhotoSaver(files: FilesApi): PhotoSaver {
  return async (file, name, folder) => {
    const { blob } = await compressImage(file)
    return (await files.upload(blob, name, folder)).url
  }
}

/**
 * Sur un lien public : la base. Un lien trop ancien pour écrire `clip_photo` (403) range la photo
 * dans le relevé lui-même ; toute autre erreur remonte (« La photo n'est pas partie »).
 */
export function guestPhotoSaver(data: Pick<DataApi, 'insert'>, context: { instructionId?: string | null; stationId?: string | null } = {}): PhotoSaver {
  return async (file, _name, folder) => {
    const photo = await photoForDatabase(file)
    let value: string
    try {
      const doc = await data.insert<PhotoDoc>(T.photo, { dataUrl: photo.dataUrl, width: photo.width ?? null, height: photo.height ?? null, bytes: photo.bytes, folder, instructionId: context.instructionId ?? null, stationId: context.stationId ?? null, createdAt: new Date().toISOString() }, 'Photo prise au poste')
      value = PHOTO_REF + doc._id
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 403)) throw e
      value = photo.dataUrl
    }
    try {
      localPreviews.set(value, URL.createObjectURL(dataUrlToBlob(photo.dataUrl)))
    } catch {
      /* sans aperçu local, la photo s'affiche quand même là où on la relit */
    }
    return value
  }
}

/** L'image d'une photo, quelle que soit sa forme ; null si elle est introuvable ou illisible ici. */
export async function photoSrc(data: Pick<DataApi, 'get'> | null | undefined, value: string): Promise<string | null> {
  if (!isPhotoRef(value)) return value
  const local = localPhoto(value)
  if (local) return local
  if (!data) return null
  const doc = await data.get<PhotoDoc>(T.photo, photoIdOf(value)).catch(() => null)
  return doc?.json_data.url ?? doc?.json_data.dataUrl ?? null
}

/**
 * Une photo prise au poste, en adresse du stockage, pour en faire un média d'étape (toggle
 * `feedbackMedia`) : une photo déjà au stockage garde son adresse ; celle qui est dans la base (un lien
 * public, `clip-photo:` ou `data:`) y est envoyée, car le poste ne lit que des adresses publiques.
 */
export async function photoToStorage(data: Pick<DataApi, 'get'>, files: Pick<FilesApi, 'upload'>, value: string, name: string): Promise<string> {
  const src = await photoSrc(data, value)
  if (!src) throw new Error('photo not found')
  if (/^https?:/i.test(src)) return src
  const blob = src.startsWith('data:') ? dataUrlToBlob(src) : await (await fetch(src)).blob()
  return (await files.upload(blob, name, 'captures')).url
}

/** L'image d'une photo, pour l'écran (relue une fois, gardée en cache). */
export function usePhotoSrc(value: string | null | undefined, data?: Pick<DataApi, 'get'> | null): { src: string | null; loading: boolean } {
  const ref = isPhotoRef(value) && !localPhoto(value) ? value : null
  const q = useQuery({
    queryKey: ['clip-photo', ref],
    queryFn: () => photoSrc(data, ref!),
    enabled: !!ref && !!data,
    staleTime: Infinity,
  })
  if (!value) return { src: null, loading: false }
  if (!isPhotoRef(value)) return { src: value, loading: false }
  const local = localPhoto(value)
  if (local) return { src: local, loading: false }
  return { src: q.data ?? null, loading: !!data && q.isLoading }
}

/**
 * Une adresse à ouvrir dans un nouvel onglet : celle du stockage telle quelle ; une image `data:`
 * passe par une adresse `blob:` (les navigateurs refusent d'ouvrir une adresse `data:`).
 */
export function useOpenableHref(src: string | null): string | null {
  const href = useMemo(() => {
    if (!src || !isInlinePhoto(src)) return src
    try {
      return URL.createObjectURL(dataUrlToBlob(src))
    } catch {
      return null
    }
  }, [src])
  useEffect(() => () => {
    if (href && href.startsWith('blob:') && href !== src) URL.revokeObjectURL(href)
  }, [href, src])
  return href
}

/** Les photos d'une réponse : une seule (`value`), ou plusieurs (`photos`). */
export function answerPhotos(a: { kind: string; value?: unknown; photos?: string[] | null }): string[] {
  if (a.kind !== 'photo') return []
  if (a.photos?.length) return a.photos
  return typeof a.value === 'string' && a.value ? [a.value] : []
}

/** Le travail fait, ses photos remplacées par leur image (pour l'imprimer : le PDF ne relit rien). */
export async function withPhotoImages(e: Execution, data: Pick<DataApi, 'get'>): Promise<Execution> {
  const answers = await Promise.all(
    e.answers.map(async (a) => {
      const photos = answerPhotos(a)
      if (!photos.some(isPhotoRef)) return a
      const resolved = await Promise.all(photos.map(async (p) => (isPhotoRef(p) ? (await photoSrc(data, p)) ?? p : p)))
      return a.photos?.length ? { ...a, photos: resolved } : { ...a, value: resolved[0] }
    }),
  )
  return { ...e, answers }
}
