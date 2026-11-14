/**
 * Les photos prises sur un lien public (tablette d'un poste, code QR) : la Gateway refuse l'envoi de
 * fichiers au rôle guest (routes d'envoi : rôles user et admin seulement). Le cas vécu en QA le
 * 2026-11-14 : « La photo n'est pas partie » au relevé photo et « Le retour n'est pas parti » avec
 * une photo, sans qu'aucune demande n'atteigne le service d'envoi.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// jsdom ne décode aucune image : la réduction rend le fichier tel quel (le navigateur, lui, réduit).
vi.mock('@/lib/media/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/media/image')>()),
  compressImage: vi.fn(async (file: Blob) => ({ blob: file, width: 1280, height: 960 })),
}))
import { FeedbackSheet } from '@/components/player/FeedbackSheet'
import { strings } from '@/components/player/i18n'
import { StepChecks } from '@/components/player/StepChecks'
import { StoredPhoto } from '@/components/StoredPhoto'
import { ApiError } from '@/lib/gateway/client'
import type { DataApi } from '@/lib/gateway/data'
import { DB_PHOTO_MAX_CHARS, guestPhotoSaver, isInlinePhoto, isPhotoRef, PHOTO_REF, photoSrc, withPhotoImages } from '@/lib/media/photos'
import { executionsCsv, type CsvWords } from '@/lib/model/trends'
import { executionSheet } from '@/lib/pdf/executionSheet'
import { messages } from '@/lib/i18n'
import type { Execution, Step } from '@/lib/model/types'

afterEach(cleanup)

/** Une petite photo JPEG (les octets comptent peu : jsdom ne décode pas les images). */
const photoFile = () => new File([new Uint8Array(4000).fill(7)], 'IMG_0420.jpg', { type: 'image/jpeg' })

/** La base vue par un lien : il ajoute, il ne relit pas les photos. */
function guestData(failInsert?: unknown) {
  const docs: Array<{ type: string; json: Record<string, unknown> }> = []
  const insert = vi.fn(async (type: string, json: Record<string, unknown>) => {
    if (failInsert) throw failInsert
    docs.push({ type, json })
    return { _id: `p${docs.length}`, json_data: json }
  })
  return { docs, insert, api: { insert } as unknown as DataApi }
}

describe('enregistrer une photo depuis un lien public', () => {
  it('la photo réduite va dans la base ; le relevé ne garde qu’une référence courte', async () => {
    const g = guestData()
    const value = await guestPhotoSaver(g.api, { instructionId: 'i1', stationId: 's1' })(photoFile(), 'IMG_0420.jpg', 'execution')
    expect(value).toBe(`${PHOTO_REF}p1`)
    expect(g.docs[0].type).toBe('clip_photo')
    expect(g.docs[0].json).toMatchObject({ folder: 'execution', instructionId: 'i1', stationId: 's1' })
    const dataUrl = g.docs[0].json.dataUrl as string
    expect(isInlinePhoto(dataUrl)).toBe(true)
    expect(dataUrl.length).toBeLessThanOrEqual(DB_PHOTO_MAX_CHARS)
  })

  it('un lien d’avant la portée v3 (écriture refusée) : la photo va dans le relevé lui-même', async () => {
    const g = guestData(new ApiError('Action not permitted for this scope', 403))
    const value = await guestPhotoSaver(g.api)(photoFile(), 'IMG_0420.jpg', 'feedback')
    expect(isInlinePhoto(value)).toBe(true)
  })

  it('le réseau en panne : l’erreur remonte (« La photo n’est pas partie »), rien n’est inventé', async () => {
    const g = guestData(new ApiError('Pas de connexion au serveur', 0, null, 'network'))
    await expect(guestPhotoSaver(g.api)(photoFile(), 'x.jpg', 'execution')).rejects.toMatchObject({ status: 0 })
  })
})

describe('relire une photo', () => {
  const get = vi.fn(async (_type: string, id: string) => (id === 'p9' ? { _id: 'p9', json_data: { dataUrl: 'data:image/jpeg;base64,AAAA', url: null } } : id === 'p8' ? { _id: 'p8', json_data: { dataUrl: null, url: 'https://cdn.test/p8.jpg' } } : null))
  const data = { get } as unknown as DataApi

  it('une adresse du stockage ou une image data: telles quelles ; une référence, relue dans la base', async () => {
    expect(await photoSrc(data, 'https://cdn.test/a.jpg')).toBe('https://cdn.test/a.jpg')
    expect(await photoSrc(data, 'data:image/jpeg;base64,BBBB')).toBe('data:image/jpeg;base64,BBBB')
    expect(await photoSrc(data, `${PHOTO_REF}p9`)).toBe('data:image/jpeg;base64,AAAA')
    expect(await photoSrc(data, `${PHOTO_REF}p8`), 'passée au stockage depuis').toBe('https://cdn.test/p8.jpg')
    expect(await photoSrc(data, `${PHOTO_REF}absente`)).toBeNull()
    expect(await photoSrc(null, `${PHOTO_REF}p9`), 'un lien ne relit pas les photos').toBeNull()
  })

  it('le registre affiche la photo d’une référence', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StoredPhoto value={`${PHOTO_REF}p9`} data={data} alt="Preuve" className="h-16 w-16" />
      </QueryClientProvider>,
    )
    const img = await screen.findByAltText('Preuve')
    expect(img.getAttribute('src')).toBe('data:image/jpeg;base64,AAAA')
  })

  const execution = (value: string, photos?: string[]): Execution =>
    ({ instructionId: 'i1', instructionTitle: 'Vérifier la pression', version: 1, stationId: null, startedAt: '2026-11-14T15:25:00.000Z', finishedAt: '2026-11-14T15:27:00.000Z', operatorId: null, operatorName: null, language: 'fr', source: 'kiosk', deviations: 0, answers: [{ stepId: 'st1', stepTitle: 'Enfiler les EPI', checkId: 'c1', label: 'Photo', kind: 'photo', value, ok: null, ...(photos ? { photos } : {}) }] }) as unknown as Execution

  it('le PDF reçoit l’image elle-même (il ne relit rien)', async () => {
    const full = await withPhotoImages(execution(`${PHOTO_REF}p9`), data)
    expect(full.answers[0].value).toBe('data:image/jpeg;base64,AAAA')
    const many = await withPhotoImages(execution(`${PHOTO_REF}p9`, [`${PHOTO_REF}p9`, 'https://cdn.test/b.jpg']), data)
    expect(many.answers[0].photos).toEqual(['data:image/jpeg;base64,AAAA', 'https://cdn.test/b.jpg'])
    const html = executionSheet(full, messages().records, { stationName: null, when: 'x', printedAt: 'y', duration: null, lang: 'fr' })
    expect(html).toContain('src="data:image/jpeg;base64,AAAA"')
  })

  it('l’export CSV dit « photo enregistrée dans CLIP » au lieu d’une adresse illisible', () => {
    const t = messages().records
    const words: CsvWords = { head: [...t.exportHead], sep: ';', text: () => '', item: (l) => l, verdict: () => '', date: (iso) => iso, station: () => '', photo: t.photoInApp }
    const csv = executionsCsv([{ _id: 'e1', json_data: execution(`${PHOTO_REF}p9`, [`${PHOTO_REF}p9`, 'data:image/jpeg;base64,CC', 'https://cdn.test/b.jpg']) }] as never, words)
    expect(csv).toContain(`${t.photoInApp} ${t.photoInApp} https://cdn.test/b.jpg`)
    expect(csv).not.toContain(PHOTO_REF)
    expect(csv).not.toContain('base64')
  })
})

describe('au poste, sur un lien', () => {
  const step = { id: 'st1', title: 'Enfiler les EPI requis', text: '', keyPoints: [], media: [], checks: [{ id: 'c1', kind: 'photo', label: 'Photo', required: true }] } as unknown as Step

  it('« Prendre la photo » : le relevé reçoit la référence de la photo enregistrée', async () => {
    const g = guestData()
    const onAnswer = vi.fn()
    const { container } = render(<StepChecks step={step} answers={{}} onAnswer={onAnswer} t={strings('fr').records} photos={guestPhotoSaver(g.api)} nudge={0} />)
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [photoFile()] } })
    await vi.waitFor(() => expect(onAnswer).toHaveBeenCalled())
    const answer = onAnswer.mock.calls.at(-1)![1]
    expect(isPhotoRef(answer.value)).toBe(true)
    expect(screen.queryByText(strings('fr').records.photoFailed)).toBeNull()
  })

  it('« Pas clair ? » avec une photo : le retour part avec la référence', async () => {
    const g = guestData()
    const inserted: Array<{ type: string; json: Record<string, unknown> }> = []
    const data = {
      insert: vi.fn(async (type: string, json: Record<string, unknown>) => {
        if (type === 'clip_photo') return g.api.insert(type, json)
        inserted.push({ type, json })
        return { _id: 'f1', json_data: json }
      }),
    } as unknown as DataApi
    const t = strings('fr')
    const { container } = render(
      <FeedbackSheet open onClose={() => undefined} t={t} data={data} photos={guestPhotoSaver(data)} base={{ instructionId: 'i1', publishedId: 'p1', version: 1, stepId: 'st1', stepIndex: 0, instructionTitle: 'Vérifier la pression', stationId: null, source: 'link', language: 'fr' } as never} />,
    )
    fireEvent.click(screen.getByText(t.kinds.unclear))
    fireEvent.change(container.ownerDocument.querySelector('input[type=file]')!, { target: { files: [photoFile()] } })
    fireEvent.click(screen.getByText(t.feedbackSend))
    await vi.waitFor(() => expect(inserted.find((d) => d.type === 'clip_feedback')).toBeTruthy())
    expect(isPhotoRef(inserted.find((d) => d.type === 'clip_feedback')!.json.photoUrl as string)).toBe(true)
    expect(screen.queryByText(t.feedbackFailed)).toBeNull()
  })
})
