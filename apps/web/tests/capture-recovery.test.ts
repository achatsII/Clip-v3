import { describe, expect, it, vi } from 'vitest'
import type { CapturedMedia } from '@clip/bridge'

vi.mock('@/lib/bridge/native', () => ({
  // La coquille ne répond pas ici : l'envoi échoue, ce qui ne change rien à la prise en charge.
  callNative: vi.fn(async () => {
    throw new Error('pas de coquille')
  }),
  onNativeEvent: vi.fn(() => () => undefined),
  nativeEnv: vi.fn(() => ({ platform: 'ios' })),
}))

import { getCaptureSession, isHandledNative } from '@/lib/capture/session'
import type { DataApi } from '@/lib/gateway/data'
import type { FilesApi } from '@/lib/gateway/files'

const video: CapturedMedia = { localId: 'loc-9min', kind: 'video', mimeType: 'video/quicktime', fileName: 'IMG_0420.MOV', sizeBytes: 540_000_000, durationSec: 540, origin: 'library' }

describe('reprise d’un média après un rechargement de la page', () => {
  it('un média reçu par une séance n’est plus proposé ; un média jamais reçu (page rechargée) l’est', async () => {
    const files = { presign: vi.fn(async () => ({ uploadUrl: 'https://s/x', publicUrl: 'https://p/x', path: 'x', contentType: 'video/quicktime' })) } as unknown as FilesApi
    const session = getCaptureSession('recovery-test', { data: {} as DataApi, files, actor: { id: 'u1', name: 'Test' } }, { instructionId: null, sources: [] })
    expect(isHandledNative('loc-9min')).toBe(false)
    session.addNative([video])
    expect(isHandledNative('loc-9min')).toBe(true)
    // Un autre média, choisi avant un rechargement : aucune séance de cette page ne l'a reçu.
    expect(isHandledNative('loc-avant-rechargement')).toBe(false)
    await vi.waitFor(() => expect(session.snapshot.pending[0]?.stage).toBe('error'))
  })
})
