import { afterEach, describe, expect, it } from 'vitest'
import { setAiGate } from '@/lib/ai/consent'
import { aiApi } from '@/lib/gateway/ai'
import { filesApi } from '@/lib/gateway/files'
import { fakeGateway } from './fakeClient'

afterEach(() => setAiGate(null))

const answer = { success: true, results: { assistant_response: 'ok', model: 'm' } }

describe('l’accord avant l’IA', () => {
  it('refusé, rien ne part : ni question, ni image, ni fichier, ni transcription', async () => {
    const gw = fakeGateway(() => answer)
    setAiGate(async () => false)
    const ai = aiApi(gw, { billing: false })
    const files = filesApi(gw)
    await expect(ai.ask('step_assist', { prompt: 'x', system_instruction: 's', provider: 'google', level: 'low' })).rejects.toMatchObject({ code: 'ai_consent' })
    await expect(ai.generateImage('p', [])).rejects.toMatchObject({ code: 'ai_consent' })
    await expect(files.geminiUpload('https://x/v.mp4', 'video/mp4', 10, 'v.mp4')).rejects.toMatchObject({ code: 'ai_consent' })
    await expect(files.transcribe(new Blob(['a']), 'n.m4a')).rejects.toMatchObject({ code: 'ai_consent' })
    expect(gw.calls).toHaveLength(0)
  })

  it('accepté, ou sans fenêtre branchée (lien public), l’appel part', async () => {
    const gw = fakeGateway(() => answer)
    setAiGate(async () => true)
    await expect(aiApi(gw, { billing: false }).ask('step_assist', { prompt: 'x', system_instruction: 's', provider: 'google', level: 'low' })).resolves.toMatchObject({ text: 'ok' })
    setAiGate(null)
    await expect(aiApi(gw, { billing: false }).ask('step_assist', { prompt: 'x', system_instruction: 's', provider: 'google', level: 'low' })).resolves.toMatchObject({ text: 'ok' })
    expect(gw.calls).toHaveLength(2)
  })
})
