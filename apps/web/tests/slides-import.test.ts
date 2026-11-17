/**
 * Toggle `slidesImport` coupé (le repli) : un PowerPoint ne se convertit pas (la route de la Gateway
 * n'accepte que Word et ODT : un .pptx y répond 500, vérifié en QA les 16 et 17 novembre 2026). Au
 * lieu de disparaître sans un mot, il dit le geste qui règle tout : l'enregistrer en PDF. Toggle
 * allumé, l'app le lit elle-même (`tests/sources-attach-slides.test.tsx`).
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/bridge/native', () => ({ callNative: vi.fn(), onNativeEvent: vi.fn(() => () => undefined), nativeEnv: vi.fn(() => null) }))
const { createInstruction } = vi.hoisted(() => ({ createInstruction: vi.fn(async () => ({ _id: 'ins1', json_data: {} })) }))
vi.mock('@/lib/model/service', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/model/service')>()), createInstruction, saveSources: vi.fn(async () => undefined) }))

import { getCaptureSession } from '@/lib/capture/session'
import type { DataApi } from '@/lib/gateway/data'
import type { FilesApi } from '@/lib/gateway/files'
import { ingestFile, isSlides } from '@/lib/media/ingest'

const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
const SAY = 'Un PowerPoint ne se lit pas encore tel quel : enregistrez-le en PDF (Fichier › Exporter), puis déposez le PDF.'

describe('un PowerPoint déposé', () => {
  it('se reconnaît par son nom ou son type ; un Word ou un PDF, non', () => {
    expect(isSlides({ name: 'Procédure.pptx', type: '' })).toBe(true)
    expect(isSlides({ name: 'formation.PPT', type: '' })).toBe(true)
    expect(isSlides({ name: 'cours.odp', type: '' })).toBe(true)
    expect(isSlides({ name: 'fichier', type: PPTX })).toBe(true)
    expect(isSlides({ name: 'Procédure.docx', type: '' })).toBe(false)
    expect(isSlides({ name: 'Procédure.pdf', type: 'application/pdf' })).toBe(false)
  })

  it('l’envoi le refuse avec le geste à faire, sans rien envoyer', async () => {
    const files = { upload: vi.fn(), convertToPdf: vi.fn() } as unknown as FilesApi
    await expect(ingestFile(new File(['x'], 'Procédure.pptx', { type: PPTX }), files)).rejects.toThrow(SAY)
    expect(files.upload).not.toHaveBeenCalled()
  })

  it('à la capture, sa carte le dit (rien à relancer) et aucune instruction ne se crée pour lui', () => {
    const session = getCaptureSession('slides', { data: {} as DataApi, files: {} as FilesApi, actor: { id: 'u1', name: 'Test' } }, { instructionId: null, sources: [] })
    session.addFiles([new File(['x'], 'Procédure.pptx', { type: PPTX })])
    const card = session.snapshot.pending[0]
    expect(card).toMatchObject({ name: 'Procédure.pptx', stage: 'error', error: SAY })
    expect(session.canRetry(card.tempId)).toBe(false)
    expect(createInstruction).not.toHaveBeenCalled()
    session.dismissPending(card.tempId)
    expect(session.snapshot.pending).toHaveLength(0)
  })
})
