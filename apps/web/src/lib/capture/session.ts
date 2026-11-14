/**
 * Une séance de capture : les sources enregistrées et les envois en cours. Elle vit hors des
 * composants, pour qu'un envoi commencé finisse et s'enregistre même si l'on change d'écran.
 */
import type { CapturedMedia } from '@clip/bridge'
import { nativeEnv } from '../bridge/native'
import type { DataApi } from '../gateway/data'
import type { FilesApi } from '../gateway/files'
import { messages } from '../i18n'
import { ingestFile, ingestNative, kindOfFile, type IngestStage } from '../media/ingest'
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

export class CaptureSession {
  private listeners = new Set<() => void>()
  private saving: Promise<void> = Promise.resolve()
  private creating: Promise<string> | null = null
  private snap: CaptureSnapshot

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

  private async run(pending: PendingUpload, job: (onProgress: (stage: IngestStage, ratio?: number) => void) => Promise<Source>) {
    this.set({ pending: [...this.snap.pending, pending] })
    try {
      await this.ensureDoc()
      const source = await job((stage, ratio) => this.updatePending(pending.tempId, { stage, progress: ratio }))
      if (pending.previewUrl && source.kind === 'photo' && !source.thumbnailUrl) source.thumbnailUrl = source.url
      this.set({
        sources: [...this.snap.sources, source],
        pending: this.snap.pending.filter((p) => p.tempId !== pending.tempId),
      })
      await this.persist()
      if (pending.previewUrl) setTimeout(() => URL.revokeObjectURL(pending.previewUrl!), 30_000)
    } catch (e) {
      this.updatePending(pending.tempId, { stage: 'error', error: e instanceof Error ? e.message : messages().capture.upload.failed })
    }
  }

  addFiles(list: File[]) {
    for (const file of list) {
      const kind = kindOfFile(file)
      if (!kind) continue
      const previewUrl = kind === 'photo' || kind === 'video' ? URL.createObjectURL(file) : undefined
      void this.run({ tempId: uid('tmp_'), kind, name: file.name, previewUrl, stage: 'prepare' }, (p) => ingestFile(file, this.deps.files, p))
    }
  }

  addNative(items: CapturedMedia[]) {
    const platform = nativeEnv()?.platform ?? 'ios'
    for (const item of items) {
      handledNative.add(item.localId)
      const kind: SourceKind = item.kind
      void this.run({ tempId: uid('tmp_'), kind, name: item.fileName, previewUrl: item.thumbnailDataUrl, stage: 'upload', progress: 0 }, (p) => ingestNative(item, this.deps.files, p, platform))
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
    this.set({ sources: [...this.snap.sources, ...fresh] })
    await this.persist()
    return fresh.length
  }

  async addNote(text: string) {
    const t = text.trim()
    if (!t) return
    const source: Source = { id: uid('src_'), kind: 'note', text: t, createdAt: new Date().toISOString() }
    this.set({ sources: [...this.snap.sources, source] })
    await this.persist()
  }

  async updateText(id: string, text: string) {
    this.set({ sources: this.snap.sources.map((s) => (s.id === id ? { ...s, text } : s)) })
    await this.persist()
  }

  async remove(id: string) {
    const victim = this.snap.sources.find((s) => s.id === id)
    this.set({ sources: this.snap.sources.filter((s) => s.id !== id) })
    await this.persist()
    if (victim?.path) void this.deps.files.remove([victim.path])
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
