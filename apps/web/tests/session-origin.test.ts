import { afterEach, describe, expect, it } from 'vitest'
import { ApiError, gateway, getAccessToken, hasSession, SESSION_ORIGIN, storeTokens } from '@/lib/gateway/client'

/**
 * Un jeton gardé d'une autre Gateway (QA ↔ prod) ou d'une autre application ne vaut rien ici : l'app
 * l'oublie et repart de la connexion, au lieu de rester sur « Impossible d'ouvrir CLIP » (novembre 2026,
 * TestFlight après le passage de main à la Gateway prod : il fallait réinstaller l'app).
 */
afterEach(() => localStorage.clear())

describe("la session retient d'où viennent ses jetons", () => {
  it('un jeton donné ici reste valable', () => {
    storeTokens('jeton', 'rafraichi')
    expect(localStorage.getItem('clip_session_of')).toBe(SESSION_ORIGIN)
    expect(getAccessToken()).toBe('jeton')
    expect(hasSession()).toBe(true)
  })

  it("le jeton d'une autre Gateway s'oublie, avec les données gardées de l'ancienne, pas les préférences", () => {
    localStorage.setItem('access_token', 'jeton-qa')
    localStorage.setItem('refresh_token', 'rafraichi-qa')
    localStorage.setItem('clip_session_of', 'https://qa.gateway.intelligenceindustrielle.com|html')
    localStorage.setItem('clip_cache_instruction', '{}')
    localStorage.setItem('clip_pref_editor_view', 'sheet')
    localStorage.setItem('ui_theme', 'dark')
    expect(hasSession()).toBe(false)
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('clip_cache_instruction')).toBeNull()
    expect(localStorage.getItem('clip_pref_editor_view')).toBe('sheet')
    expect(localStorage.getItem('ui_theme')).toBe('dark')
  })

  it("un jeton d'avant la marque s'oublie aussi : on ne sait pas d'où il vient", () => {
    localStorage.setItem('access_token', 'jeton-ancien')
    expect(hasSession()).toBe(false)
  })

  it("un appel avec le jeton d'ailleurs ne part pas : session expirée, vers la connexion", async () => {
    localStorage.setItem('access_token', 'jeton-qa')
    localStorage.setItem('refresh_token', 'rafraichi-qa')
    localStorage.setItem('clip_session_of', 'autre|html')
    await expect(gateway.call('/api/v1/auth/me')).rejects.toMatchObject({ status: 401 })
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })
})

describe("une erreur en page HTML ne s'affiche pas telle quelle", () => {
  it('« Cannot POST » devient le message du serveur, la page reste dans le détail', async () => {
    storeTokens('jeton')
    const html = '<!DOCTYPE html><html lang="en"><body><pre>Cannot POST /gemini/upload</pre></body></html>'
    const fetchBefore = globalThis.fetch
    globalThis.fetch = (async () => new Response(html, { status: 404, headers: { 'Content-Type': 'text/html' } })) as typeof fetch
    try {
      const err = (await gateway.call('/api/v1/ai/gemini/upload/direct', { method: 'POST', body: {} }).catch((e: unknown) => e)) as ApiError
      expect(err.status).toBe(404)
      expect(err.message).not.toContain('<')
      expect(err.detail).toBe(html)
    } finally {
      globalThis.fetch = fetchBefore
    }
  })
})
