import { describe, expect, it, vi } from 'vitest'
import type { CapturedMedia } from '@clip/bridge'

let failures = 0
vi.mock('@/lib/media/ingest', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/media/ingest')>()),
  ingestNative: vi.fn(async (item: CapturedMedia) => {
    if (failures > 0) {
      failures--
      throw new Error('L’envoi a échoué (réseau)')
    }
    return { id: 'src_1', kind: 'video', name: item.fileName, url: 'https://cdn.test/v.mp4', createdAt: '2026-11-14T00:00:00.000Z' }
  }),
}))
vi.mock('@/lib/bridge/native', () => ({
  callNative: vi.fn(),
  onNativeEvent: vi.fn(() => () => undefined),
  nativeEnv: vi.fn(() => ({ platform: 'ios' })),
}))
vi.mock('@/lib/model/service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/model/service')>()),
  createInstruction: vi.fn(async () => ({ _id: 'ins1', json_data: {} })),
  saveSources: vi.fn(async () => undefined),
}))

import { getCaptureSession } from '@/lib/capture/session'
import type { DataApi } from '@/lib/gateway/data'
import type { FilesApi } from '@/lib/gateway/files'

const video = (localId: string): CapturedMedia => ({ localId, kind: 'video', mimeType: 'video/quicktime', fileName: `${localId}.MOV`, sizeBytes: 300_000_000, durationSec: 300 })
const deps = { data: {} as DataApi, files: {} as FilesApi, actor: { id: 'u1', name: 'Test' } }

describe('« Réessayer » un envoi raté', () => {
  it('relance le même média : la carte repart, la source s’ajoute, rien n’est à refaire après', async () => {
    failures = 1
    const session = getCaptureSession('retry-ok', deps, { instructionId: null, sources: [] })
    session.addNative([video('a')])
    await vi.waitFor(() => expect(session.snapshot.pending[0]?.stage).toBe('error'))
    const tempId = session.snapshot.pending[0].tempId
    expect(session.busy).toBe(false)
    expect(session.canRetry(tempId)).toBe(true)

    const retried = session.retry(tempId)
    // Pendant la relance, l'envoi compte de nouveau : « Générer » l'attend.
    expect(session.busy).toBe(true)
    expect(session.snapshot.pending[0].error).toBeUndefined()
    await retried
    expect(session.snapshot.pending).toHaveLength(0)
    expect(session.snapshot.sources.map((s) => s.url)).toEqual(['https://cdn.test/v.mp4'])
    expect(session.canRetry(tempId)).toBe(false)
  })

  it('un envoi raté qu’on retire ne se relance plus ; un envoi réussi ou un import en attente non plus', async () => {
    failures = 1
    const session = getCaptureSession('retry-dismiss', deps, { instructionId: null, sources: [] })
    session.addNative([video('b')])
    await vi.waitFor(() => expect(session.snapshot.pending[0]?.stage).toBe('error'))
    const tempId = session.snapshot.pending[0].tempId
    session.dismissPending(tempId)
    expect(session.canRetry(tempId)).toBe(false)
    await session.retry(tempId)
    expect(session.snapshot.sources).toHaveLength(0)

    const placeholder = session.beginImport('video', 'IMG_0001.MOV')
    expect(session.canRetry(placeholder)).toBe(false)
  })

  it('un envoi encore en cours ne se relance pas en double', async () => {
    failures = 0
    const session = getCaptureSession('retry-running', deps, { instructionId: null, sources: [] })
    session.addNative([video('c')])
    const tempId = session.snapshot.pending[0].tempId
    expect(session.canRetry(tempId)).toBe(false)
    await vi.waitFor(() => expect(session.snapshot.sources).toHaveLength(1))
  })
})
