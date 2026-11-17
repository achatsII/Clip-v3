import { afterEach, describe, expect, it } from 'vitest'
import { consentDate, consentDecision, consentWithdrawn, saveConsent, setAiGate } from '@/lib/ai/consent'
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

describe('l’accord donné à la connexion (toggle aiConsentAtSignIn)', () => {
  it('aucune fenêtre : l’IA est ouverte, sauf si la personne a retiré son accord', () => {
    expect(consentDecision({ atSignIn: true, modal: true, date: null, withdrawn: false })).toBe('allow')
    expect(consentDecision({ atSignIn: true, modal: true, date: null, withdrawn: true })).toBe('block')
    // Le modèle d'avant reste derrière le toggle aiConsent : la fenêtre tant qu'il n'y a pas de date.
    expect(consentDecision({ atSignIn: false, modal: true, date: null, withdrawn: false })).toBe('ask')
    expect(consentDecision({ atSignIn: false, modal: true, date: '2026-11-16', withdrawn: false })).toBe('allow')
    expect(consentDecision({ atSignIn: false, modal: false, date: null, withdrawn: true })).toBe('allow')
  })

  it('un retrait se garde (la connexion ne vaut plus accord), et s’annule en acceptant de nouveau', () => {
    const uid = 'essai-retrait'
    saveConsent(uid, '2026-11-16T12:00:00.000Z')
    expect(consentDate(uid)).toBe('2026-11-16T12:00:00.000Z')
    saveConsent(uid, null)
    expect(consentWithdrawn(uid)).toBe(true)
    expect(consentDate(uid)).toBeNull()
    saveConsent(uid, '2026-11-17T08:00:00.000Z')
    expect(consentWithdrawn(uid)).toBe(false)
  })

  it('la ligne de la connexion nomme Google, et OpenAI pour les images, dans les deux langues', async () => {
    const { messagesIn } = await import('@/lib/i18n')
    for (const lang of ['fr', 'en'] as const) {
      const n = messagesIn(lang).auth.login.aiNotice
      for (const line of [n.login, n.signup]) {
        expect(line).toMatch(/Google/)
        expect(line).toMatch(/OpenAI/)
      }
    }
  })
})

describe('au plus 10 fichiers par demande', () => {
  it('au-delà, rien ne part et rien n’est débité (la route découperait la demande en lots facturés)', async () => {
    const gw = fakeGateway(() => answer)
    const files = Array.from({ length: 11 }, (_, i) => ({ url: `https://x/${i}.jpg`, filename: `${i}.jpg`, mimeType: 'image/jpeg' }))
    await expect(aiApi(gw, { billing: true }).ask('generate_s', { prompt: 'x', system_instruction: 's', provider: 'google', level: 'mid', files })).rejects.toMatchObject({ code: 'too_many_files', status: 413 })
    expect(gw.calls).toHaveLength(0)
    await expect(aiApi(gw, { billing: false }).ask('generate_s', { prompt: 'x', system_instruction: 's', provider: 'google', level: 'mid', files: files.slice(0, 10) })).resolves.toMatchObject({ text: 'ok' })
  })
})
