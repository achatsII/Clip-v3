import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'

import { logError, logEvent } from '../logging/log'
import { migrateState, type MediaRecord, type MigrationOutcome, type ShellState, freshState } from './migrations'

const STATE_KEY = 'clip.shell.state'

/**
 * L'état persistant de la coquille (identifiant d'installation, index des médias capturés).
 * Chargé une fois au démarrage ; chaque modification est écrite tout de suite.
 */
class LocalStore {
  private state: ShellState = freshState(randomUUID)
  private loaded = false
  private writing: Promise<void> = Promise.resolve()

  async load(): Promise<MigrationOutcome> {
    let raw: string | null = null
    try {
      raw = await AsyncStorage.getItem(STATE_KEY)
    } catch (e) {
      logError(e, { action: 'localStore.read' })
    }
    const outcome = migrateState(raw, randomUUID)
    this.state = outcome.state
    this.loaded = true

    if (outcome.kind === 'corrupt') {
      // Jamais effacé : le texte illisible est mis de côté pour diagnostic.
      try {
        await AsyncStorage.setItem(`${STATE_KEY}.corrupt.${Date.now()}`, outcome.raw)
      } catch (e) {
        logError(e, { action: 'localStore.backupCorrupt' })
      }
      logEvent('localStore.corrupt_reset')
    }
    if (outcome.kind === 'migrated') logEvent('localStore.migrated', { from: outcome.from })
    if (outcome.kind === 'newer') logEvent('localStore.newer_schema', { version: outcome.version })
    if (outcome.kind !== 'current' && outcome.kind !== 'newer') await this.persist()
    return outcome
  }

  get isLoaded(): boolean {
    return this.loaded
  }

  get installId(): string {
    return this.state.installId
  }

  getMedia(localId: string): MediaRecord | null {
    return this.state.media[localId] ?? null
  }

  listMedia(): MediaRecord[] {
    return Object.values(this.state.media)
  }

  async putMedia(record: MediaRecord): Promise<void> {
    this.state = { ...this.state, media: { ...this.state.media, [record.localId]: record } }
    await this.persist()
  }

  async patchMedia(localId: string, patch: Partial<MediaRecord>): Promise<void> {
    const current = this.state.media[localId]
    if (!current) return
    this.state = { ...this.state, media: { ...this.state.media, [localId]: { ...current, ...patch, localId } } }
    await this.persist()
  }

  async removeMedia(localIds: string[]): Promise<void> {
    const media = { ...this.state.media }
    for (const id of localIds) delete media[id]
    this.state = { ...this.state, media }
    await this.persist()
  }

  /** Écritures en file : deux modifications rapprochées ne s'écrasent pas. */
  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.state)
    this.writing = this.writing
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STATE_KEY, snapshot))
      .catch((e) => logError(e, { action: 'localStore.write' }))
    return this.writing
  }
}

export const localStore = new LocalStore()
