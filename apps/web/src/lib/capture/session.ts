/**
 * Une séance de capture : les sources enregistrées et les envois en cours. Elle vit hors des
 * composants, pour qu'un envoi commencé finisse et s'enregistre même si l'on change d'écran.
 */
import type { CapturedMedia } from '@clip/bridge'
import { nativeEnv } from '../bridge/native'
import type { DataApi } from '../gateway/data'
import type { FilesApi } from '../gateway/files'
import { messages } from '../i18n'
import { ingestFile, ingestNative, ingestScreen, ingestSlides, isSlides, kindOfFile, type IngestStage, type ScreenCapture, type ScreenProgress, type SourcePreset } from '../media/ingest'
import { canReadSlides, isPptx } from '../media/slides'
import { uid } from '../model/repo'
import { createInstruction, saveSources, type Actor } from '../model/service'
import type { Source, SourceKind } from '../model/types'
import { reuseSource } from '../model/library'

export interface PendingUpload {
  tempId: string
  kind: SourceKind
  name: string
  previewUrl?: string
  stage: IngestStage | 'error'
  progress?: number
  error?: string
}

export interface CaptureSnapshot {
  instructionId: string | null
  sources: Source[]
  pending: PendingUpload[]
  intent: string
}

type Deps = { data: DataApi; files: FilesApi; actor: Actor }
/** Un envoi : une source, ou plusieurs (une présentation donne sa note et ses images). */
type IngestJob = (onProgress: (stage: IngestStage, ratio?: number) => void) => Promise<Source | Source[]>

export class CaptureSession {
  private listeners = new Set<() => void>()
  private saving: Promise<void> = Promise.resolve()
  private creating: Promise<string> | null = null
  private snap: CaptureSnapshot
  /** Le travail de chaque envoi en cours ou raté : « Réessayer » le relance (un gros fichier reprend où il était). */
  private jobs = new Map<string, IngestJob>()

  constructor(
    private deps: Deps,
    init: { instructionId: string | null; sources: Source[]; intent?: string },
    private onCreated?: (id: string) => void,
  ) {
    this.snap = { instructionId: init.instructionId, sources: init.sources, pending: [], intent: init.intent ?? '' }
  }

  get snapshot() {
    return this.snap
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private set(next: Partial<CaptureSnapshot>) {
    this.snap = { ...this.snap, ...next }
    this.listeners.forEach((fn) => fn())
  }

  private ensureDoc(): Promise<string> {
    if (this.snap.instructionId) return Promise.resolve(this.snap.instructionId)
    if (!this.creating) {
      this.creating = createInstruction(this.deps.data, this.deps.actor, { intent: this.snap.intent || undefined }).then((doc) => {
        this.set({ instructionId: doc._id })
        sessions.set(doc._id, this)
        this.onCreated?.(doc._id)
        return doc._id
      })
      this.creating.catch(() => {
        this.creating = null
      })
    }
    return this.creating
  }

  private persist() {
    this.saving = this.saving.then(async () => {
      const id = await this.ensureDoc()
      await saveSources(this.deps.data, id, this.snap.sources, this.deps.actor)
    })
    return this.saving
  }

  setIntent(intent: string) {
    this.set({ intent })
  }

  async saveIntent() {
    const id = this.snap.instructionId
    if (id) await this.deps.data.patch('clip_instruction', id, { intent: this.snap.intent.trim() || null })
  }

  private updatePending(tempId: string, patch: Partial<PendingUpload>) {
    this.set({ pending: this.snap.pending.map((p) => (p.tempId === tempId ? { ...p, ...patch } : p)) })
  }

  /**
   * L'ordre de prise : chaque ajout reçoit un rang à son départ, et un envoi qui finit avant un autre
   * parti plus tôt ne passe pas devant lui (les photos d'une série restent dans l'ordre du déclic). Un
   * envoi relancé (« Réessayer ») garde son rang.
   */
  private nextRank = 0
  private rankOf = new Map<string, number>()
  private pendingRank = new Map<string, number>()

  private placed(source: Source, rank: number, list = this.snap.sources): Source[] {
    this.rankOf.set(source.id, rank)
    const at = list.findIndex((x) => (this.rankOf.get(x.id) ?? -1) > rank)
    return at === -1 ? [...list, source] : [...list.slice(0, at), source, ...list.slice(at)]
  }

  private run(pending: PendingUpload, job: IngestJob) {
    this.jobs.set(pending.tempId, job)
    this.pendingRank.set(pending.tempId, this.nextRank++)
    this.set({ pending: [...this.snap.pending, pending] })
    return this.execute(pending.tempId)
  }

  private async execute(tempId: string) {
    const job = this.jobs.get(tempId)
    const pending = this.snap.pending.find((p) => p.tempId === tempId)
    if (!job || !pending) return
    try {
      await this.ensureDoc()
      const out = await job((stage, ratio) => this.updatePending(tempId, { stage, progress: ratio }))
      const list = Array.isArray(out) ? out : [out]
      for (const source of list) if (pending.previewUrl && source.kind === 'photo' && !source.thumbnailUrl) source.thumbnailUrl = source.url
      this.jobs.delete(tempId)
      // Plusieurs sources d'un même envoi restent ensemble, dans leur ordre, au rang de l'envoi.
      const rank = this.pendingRank.get(tempId) ?? this.nextRank++
      let sources = this.snap.sources
      list.forEach((source, i) => {
        sources = this.placed(source, rank + i / 1000, sources)
      })
      this.set({ sources, pending: this.snap.pending.filter((p) => p.tempId !== tempId) })
      await this.persist()
      if (pending.previewUrl) setTimeout(() => URL.revokeObjectURL(pending.previewUrl!), 30_000)
    } catch (e) {
      this.updatePending(tempId, { stage: 'error', error: e instanceof Error ? e.message : messages().capture.upload.failed })
    }
  }

  /** Un envoi raté qu'on peut relancer (le fichier est encore là). */
  canRetry(tempId: string): boolean {
    return this.jobs.has(tempId) && this.snap.pending.some((p) => p.tempId === tempId && p.stage === 'error')
  }

  /** Relance un envoi raté. Un gros fichier reprend où il s'était arrêté, sans renvoyer ce qui est parti. */
  retry(tempId: string): Promise<void> {
    if (!this.canRetry(tempId)) return Promise.resolve()
    this.updatePending(tempId, { stage: 'upload', progress: undefined, error: undefined })
    return this.execute(tempId)
  }

  /** `slides` (toggle `slidesImport`) : un PowerPoint se lit dans l'app, sa note et ses images deviennent des sources. */
  addFiles(list: File[], opts: { slides?: boolean } = {}) {
    const slides = !!opts.slides && canReadSlides()
    for (const file of list) {
      if (slides && isPptx(file)) {
        void this.run({ tempId: uid('tmp_'), kind: 'document', name: file.name, stage: 'prepare' }, (p) => ingestSlides(file, this.deps.files, p))
        continue
      }
      const kind = kindOfFile(file)
      // Une présentation qui ne se lit pas : sa carte dit quoi faire (rien à relancer).
      if (!kind && isSlides(file)) this.set({ pending: [...this.snap.pending, { tempId: uid('tmp_'), kind: 'document', name: file.name, stage: 'error', error: slides ? messages().capture.upload.oldSlides : messages().capture.upload.slides }] })
      if (!kind) continue
      const previewUrl = kind === 'photo' || kind === 'video' ? URL.createObjectURL(file) : undefined
      void this.run({ tempId: uid('tmp_'), kind, name: file.name, previewUrl, stage: 'prepare' }, (p) => ingestFile(file, this.deps.files, p))
    }
  }

  /**
   * Des photos prises en parlant, dans le navigateur : la note de la série reçoit son identifiant
   * d'avance, et chaque photo prise micro ouvert y garde son instant (`at[i]` pour `photos[i]`).
   */
  addPhotoSeries(photos: File[], voice: { audio: File; at: Array<number | undefined> } | null) {
    if (!voice) return this.addFiles(photos)
    const voiceId = uid('src_')
    photos.forEach((file, i) => {
      const at = voice.at[i]
      const preset: SourcePreset = typeof at === 'number' ? { voice: { sourceId: voiceId, at } } : {}
      void this.run({ tempId: uid('tmp_'), kind: 'photo', name: file.name, previewUrl: URL.createObjectURL(file), stage: 'prepare' }, (p) => ingestFile(file, this.deps.files, p, 'web', preset))
    })
    void this.run({ tempId: uid('tmp_'), kind: 'audio', name: voice.audio.name, stage: 'prepare' }, (p) => ingestFile(voice.audio, this.deps.files, p, 'web', { id: voiceId }))
  }

  /**
   * Un enregistrement de l'écran (toggle `screenCapture`) : un seul envoi, une seule carte — la vidéo
   * puis ses images nettes. « Réessayer » reprend où il s'était arrêté.
   */
  addScreen(capture: ScreenCapture, previewUrl?: string) {
    const videoId = uid('src_')
    const done: ScreenProgress = { shots: [] }
    void this.run({ tempId: uid('tmp_'), kind: 'video', name: capture.video.name.replace(/\.[a-z0-9]+$/i, ''), previewUrl, stage: 'prepare' }, (p) => ingestScreen(capture, this.deps.files, p, videoId, done))
  }

  addNative(items: CapturedMedia[]) {
    const platform = nativeEnv()?.platform ?? 'ios'
    // Une série de photos commentée : la note reçoit son identifiant d'avance, et chaque photo prise
    // micro ouvert y garde son instant.
    const narration = items.find((i) => i.kind === 'audio' && i.narration)
    const voiceId = narration ? uid('src_') : null
    for (const item of items) {
      handledNative.add(item.localId)
      const kind: SourceKind = item.kind
      const preset: SourcePreset =
        item === narration && voiceId ? { id: voiceId } : voiceId && item.kind === 'photo' && typeof item.voiceAt === 'number' ? { voice: { sourceId: voiceId, at: item.voiceAt } } : {}
      void this.run({ tempId: uid('tmp_'), kind, name: item.fileName, previewUrl: item.thumbnailDataUrl, stage: 'upload', progress: 0 }, (p) => ingestNative(item, this.deps.files, p, platform, preset))
    }
  }

  /**
   * Reprend des médias déjà pris (d'autres instructions) : même fichier, nouvel identifiant, rien à
   * téléverser. Un média déjà dans cette capture n'est pas ajouté deux fois.
   */
  async addExisting(list: Source[]): Promise<number> {
    const key = (x: Source) => x.url ?? `note:${x.text ?? ''}`
    const known = new Set(this.snap.sources.map(key))
    const fresh = list.filter((x) => !known.has(key(x))).map(reuseSource)
    if (!fresh.length) return 0
    fresh.forEach((x) => this.rankOf.set(x.id, this.nextRank++))
    this.set({ sources: [...this.snap.sources, ...fresh] })
    await this.persist()
    return fresh.length
  }

  async addNote(text: string) {
    const t = text.trim()
    if (!t) return
    const source: Source = { id: uid('src_'), kind: 'note', text: t, createdAt: new Date().toISOString() }
    this.rankOf.set(source.id, this.nextRank++)
    this.set({ sources: [...this.snap.sources, source] })
    await this.persist()
  }

  async updateText(id: string, text: string) {
    this.set({ sources: this.snap.sources.map((s) => (s.id === id ? { ...s, text } : s)) })
    await this.persist()
  }

  async remove(id: string) {
    // Un enregistrement de l'écran s'en va avec ses images nettes.
    const victims = this.snap.sources.filter((s) => s.id === id || s.shot?.sourceId === id)
    this.set({ sources: this.snap.sources.filter((s) => !victims.includes(s)) })
    await this.persist()
    const paths = victims.flatMap((v) => (v.path ? [v.path] : []))
    if (paths.length) void this.deps.files.remove(paths)
  }

  /**
   * Un import de la galerie du téléphone : la page le montre dès l'ouverture, car l'iPhone peut
   * d'abord télécharger la vidéo d'iCloud, puis la réduire en 720p, sans rien afficher lui-même.
   */
  beginImport(kind: SourceKind, name: string): string {
    const tempId = uid('tmp_')
    this.set({ pending: [...this.snap.pending, { tempId, kind, name, stage: 'import' }] })
    return tempId
  }

  dismissPending(tempId: string) {
    this.jobs.delete(tempId)
    this.set({ pending: this.snap.pending.filter((p) => p.tempId !== tempId) })
  }

  /** Attend la fin des envois en cours, réussis ou ratés : « Générer » peut se toucher avant. */
  whenUploaded(): Promise<void> {
    if (!this.busy) return Promise.resolve()
    return new Promise((resolve) => {
      const off = this.subscribe(() => {
        if (this.busy) return
        off()
        resolve()
      })
    })
  }

  /** Attend la fin des envois et de l'enregistrement. */
  async settled(): Promise<string> {
    await this.saving
    return this.ensureDoc()
  }

  get busy() {
    return this.snap.pending.some((p) => p.stage !== 'error')
  }
}

const sessions = new Map<string, CaptureSession>()

/**
 * Les médias de la coquille déjà pris en charge par une séance de cette page. Après un
 * rechargement (iOS peut couper la page pendant la préparation d'une longue vidéo), l'ensemble est
 * vide : ce que la coquille garde encore (`media.pending`) est proposé à nouveau.
 */
const handledNative = new Set<string>()
export const isHandledNative = (localId: string) => handledNative.has(localId)

export function getCaptureSession(key: string, deps: Deps, init: { instructionId: string | null; sources: Source[]; intent?: string }, onCreated?: (id: string) => void): CaptureSession {
  const existing = sessions.get(key)
  if (existing) return existing
  const s = new CaptureSession(deps, init, onCreated)
  sessions.set(key, s)
  return s
}

export function dropCaptureSession(key: string) {
  sessions.delete(key)
}
