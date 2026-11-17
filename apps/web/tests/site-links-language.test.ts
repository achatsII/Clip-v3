/**
 * Du site à l'app : la connexion et l'inscription s'ouvrent dans la langue de la page qu'on quitte
 * (`?lang=`), pas dans la dernière langue de l'appareil ; le suivi HubSpot ne charge pas son chat.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { loadHubSpot } from '@/lib/site/consent'
import { loginPath, signupPath } from '@/lib/site/routes'

describe('du site à l’app', () => {
  it('la connexion et l’inscription portent la langue de la page', () => {
    expect(loginPath('nl')).toBe('/connexion?lang=nl')
    const q = new URLSearchParams(signupPath({ code: 'solo', interval: 'month' }, 'de').split('?')[1])
    expect(Object.fromEntries(q)).toEqual({ inscription: '1', plan: 'solo', interval: 'month', lang: 'de' })
    expect(signupPath()).toBe('/connexion?inscription=1')
  })
})

describe('HubSpot', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    delete window.hsConversationsSettings
    delete window._hsq
  })

  it('le suivi se charge sans le chat du portail', () => {
    loadHubSpot('123')
    expect(document.querySelector('script[src*="hs-scripts.com/123.js"]')).toBeTruthy()
    expect(window.hsConversationsSettings?.loadImmediately).toBe(false)
  })
})
