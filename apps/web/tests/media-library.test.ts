import { describe, expect, it, vi } from 'vitest'
import { getCaptureSession } from '@/lib/capture/session'
import type { DataApi, Doc } from '@/lib/gateway/data'
import type { FilesApi } from '@/lib/gateway/files'
import { libraryGroups, reuseSource } from '@/lib/model/library'
import { newFromSources } from '@/lib/model/service'
import type { Instruction, Source } from '@/lib/model/types'

const now = new Date().toISOString()
const video: Source = { id: 'v1', kind: 'video', url: 'https://x/v.mp4', path: 'org/v.mp4', durationSec: 95, name: 'presse.mov', geminiFileUri: 'gemini://v', createdAt: now }
const note: Source = { id: 'n1', kind: 'note', text: 'Toujours vérifier la pression avant', createdAt: now }
const photo: Source = { id: 'p1', kind: 'photo', url: 'https://x/p.jpg', path: 'org/p.jpg', createdAt: now }
const pending: Source = { id: 'x1', kind: 'video', createdAt: now }
const doc = (id: string, title: string, sources: Source[]): Doc<Instruction> => ({ _id: id, json_data: { title, sources, updatedAt: now } as unknown as Instruction })

describe('les médias déjà pris', () => {
  it('un média repris garde le fichier, sans pouvoir le supprimer', () => {
    const r = reuseSource(video)
    expect(r.id).not.toBe('v1')
    expect(r.url).toBe('https://x/v.mp4')
    expect(r.geminiFileUri).toBe('gemini://v')
    expect(r).not.toHaveProperty('path')
    expect(video.path).toBe('org/v.mp4')
  })

  it('se groupent par instruction, sans celle en cours ni un média inutilisable, et se filtrent', () => {
    const docs = [doc('a', 'Démarrer la presse', [video, note, pending]), doc('b', 'Changer la matrice', [photo]), doc('cur', 'En cours', [photo])]
    const all = libraryGroups(docs, { exclude: 'cur' })
    expect(all.map((g) => g.id)).toEqual(['a', 'b'])
    expect(all[0].sources.map((s) => s.id)).toEqual(['v1', 'n1'])
    expect(libraryGroups(docs, { exclude: 'cur', kind: 'photo' }).map((g) => g.id)).toEqual(['b'])
    // La recherche lit le titre, le nom du fichier et le texte, sans les accents.
    expect(libraryGroups(docs, { exclude: 'cur', query: 'matrice' }).map((g) => g.id)).toEqual(['b'])
    expect(libraryGroups(docs, { exclude: 'cur', query: 'pression' })[0].sources.map((s) => s.id)).toEqual(['n1'])
    expect(libraryGroups(docs, { exclude: 'cur', query: 'demarrer' })[0].sources).toHaveLength(2)
  })

  it('s’ajoutent à une capture sans doublon, et s’enregistrent', async () => {
    const patch = vi.fn(async () => undefined)
    const session = getCaptureSession('library-test', { data: { patch } as unknown as DataApi, files: {} as FilesApi, actor: { id: 'u1', name: 'Test' } }, { instructionId: 'i1', sources: [photo] })
    await session.addExisting([photo, video, note])
    const ids = session.snapshot.sources.map((s) => s.url ?? s.text)
    expect(ids).toEqual(['https://x/p.jpg', 'https://x/v.mp4', 'Toujours vérifier la pression avant'])
    expect(session.snapshot.sources.some((s) => s.path && s.url === 'https://x/v.mp4')).toBe(false)
    expect(patch).toHaveBeenCalledWith('clip_instruction', 'i1', expect.objectContaining({ sourceCount: 3 }))
  })

  it('une instruction se relance dans une nouvelle, avec ses médias et sa demande', async () => {
    const insert = vi.fn(async (_type: string, json: Instruction) => ({ _id: 'new1', json_data: json }))
    const original = { _id: 'old', json_data: { title: 'Démarrer la presse', intent: 'Démarrage du matin', sources: [video, note], stationIds: ['st1'] } as unknown as Instruction }
    const d = await newFromSources({ insert } as unknown as DataApi, original, { id: 'u1', name: 'Test' })
    const json = insert.mock.calls[0][1]
    expect(d._id).toBe('new1')
    expect(json.intent).toBe('Démarrage du matin')
    expect(json.stationIds).toEqual(['st1'])
    expect(json.draft).toBeNull()
    expect(json.sources.map((s) => s.url ?? s.text)).toEqual(['https://x/v.mp4', 'Toujours vérifier la pression avant'])
    expect(json.sources.every((s) => !s.path && s.id !== 'v1' && s.id !== 'n1')).toBe(true)
  })
})
