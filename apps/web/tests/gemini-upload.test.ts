import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/gateway/client'
import { filesApi } from '@/lib/gateway/files'
import { messages } from '@/lib/i18n'
import { fakeGateway } from './fakeClient'

/**
 * L'envoi d'une vidéo chez Gemini qui échoue au serveur dit ce qui a échoué. Novembre 2026 : la
 * Gateway prod connaissait la route, mais son service d'envoi répondait 404 (« Cannot POST
 * /gemini/upload ») ; l'écran disait « Réessayez dans un instant », ce qui n'y changeait rien.
 */
const upload = (err: ApiError) => filesApi(fakeGateway(() => err)).geminiUpload('https://x/v.mp4', 'video/mp4', 10, 'v.mp4')

describe('l’envoi chez Gemini en échec', () => {
  it('route absente ou service en panne : « la vidéo n’a pas pu être préparée pour l’IA »', async () => {
    for (const status of [404, 500, 502]) {
      await expect(upload(new ApiError('Cannot POST /gemini/upload', status, '<pre>Cannot POST /gemini/upload</pre>'))).rejects.toMatchObject({
        message: messages().common.errors.videoForAi,
        status,
        code: 'gemini_upload',
        detail: '<pre>Cannot POST /gemini/upload</pre>',
      })
    }
  })

  it('une session expirée ou un refus de droit reste tel quel', async () => {
    await expect(upload(new ApiError('expirée', 401))).rejects.toMatchObject({ status: 401, message: 'expirée' })
    await expect(upload(new ApiError('crédits', 402))).rejects.toMatchObject({ status: 402, message: 'crédits' })
    await expect(upload(new ApiError('droit', 403))).rejects.toMatchObject({ status: 403, message: 'droit' })
  })
})
