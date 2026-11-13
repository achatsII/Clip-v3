import { afterEach, describe, expect, it } from 'vitest'
import { hasSession } from '@/lib/gateway/client'
import { getLang, setLang } from '@/lib/i18n'
import { SESSION_KEY, SITE_GUARD_SCRIPT } from '@/lib/site/guard'

/** Exécute le script de garde avec un navigateur imité : où part-il, et que devient la page ? */
function run({ path = '/', session = false, shell = '' as '' | 'native' | 'webview' | 'agent' } = {}) {
  const replaced: string[] = []
  const classes = new Set<string>()
  const root = { lang: 'fr-CA', classList: { add: (c: string) => classes.add(c) } }
  const win: Record<string, unknown> = {}
  if (shell === 'native') win.__CLIP_NATIVE__ = { platform: 'ios', capabilities: [] }
  if (shell === 'webview') win.ReactNativeWebView = { postMessage() {} }
  const store = { getItem: (k: string) => (session && k === SESSION_KEY ? 'jeton' : null) }
  const nav = { userAgent: shell === 'agent' ? 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CLIPShell/1.4.0' : 'Mozilla/5.0 (Macintosh) Chrome/150' }
  new Function('window', 'document', 'location', 'navigator', 'localStorage', SITE_GUARD_SCRIPT)(
    win,
    { documentElement: root },
    { pathname: path, replace: (to: string) => replaced.push(to) },
    nav,
    store,
  )
  return { to: replaced[0] ?? null, leaving: classes.has('site-leaving'), lang: root.lang }
}

afterEach(() => {
  localStorage.removeItem(SESSION_KEY)
  document.body.innerHTML = ''
  setLang('fr')
})

describe('le script de garde du site', () => {
  it('teste la session comme l’app (`hasSession`)', () => {
    expect(hasSession()).toBe(false)
    localStorage.setItem(SESSION_KEY, 'jeton')
    expect(hasSession()).toBe(true)
  })

  it('sur `/`, une session mène à l’accueil de l’app ; sans session, le site s’affiche', () => {
    expect(run({ path: '/', session: true })).toEqual({ to: '/accueil', leaving: true, lang: 'fr-CA' })
    expect(run({ path: '/' })).toEqual({ to: null, leaving: false, lang: 'fr-CA' })
  })

  it('ailleurs sur le site, une personne connectée peut lire les pages (tarifs, solutions…)', () => {
    expect(run({ path: '/tarifs', session: true }).to).toBeNull()
    expect(run({ path: '/en', session: true }).to).toBeNull()
  })

  it('dans la coquille mobile, le site ne s’affiche jamais : connexion, ou accueil avec une session', () => {
    for (const shell of ['native', 'webview', 'agent'] as const) {
      expect(run({ path: '/', shell })).toEqual({ to: '/connexion', leaving: true, lang: 'fr-CA' })
      expect(run({ path: '/tarifs', shell }).to).toBe('/connexion')
      expect(run({ path: '/en/pricing', shell }).to).toBe('/connexion')
      expect(run({ path: '/', shell, session: true }).to).toBe('/accueil')
    }
  })

  it('une page anglaise passe `<html lang>` à `en`', () => {
    expect(run({ path: '/en' }).lang).toBe('en')
    expect(run({ path: '/en/features' }).lang).toBe('en')
    expect(run({ path: '/fonctionnalites' }).lang).toBe('fr-CA')
    expect(run({ path: '/entreprise' }).lang).toBe('fr-CA')
  })
})

describe('la langue de l’outil sur une page du site', () => {
  it('ne réécrit pas `<html lang>` quand la page est celle du site (`[data-site]`)', () => {
    document.documentElement.lang = 'fr-CA'
    document.body.innerHTML = '<div data-site="fr"></div>'
    setLang('en')
    expect(getLang()).toBe('en')
    expect(document.documentElement.lang).toBe('fr-CA')
    document.body.innerHTML = ''
    setLang('en')
    expect(document.documentElement.lang).toBe('en-CA')
  })
})
