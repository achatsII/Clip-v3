/**
 * Un seul logo au démarrage de l'app mobile : la coquille garde son écran de démarrage tant que la
 * page montre un écran de chargement de démarrage (le site qui part vers l'app, l'ouverture de la
 * session), puis la page lui dit de l'effacer (`splash.hide`), une seule fois.
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ShellSplash } from '@/components/ShellSplash'

const posted: string[] = []

function inShell(capabilities: string[]) {
  window.__CLIP_NATIVE__ = { bridgeVersion: 1, appVersion: '1.0.0', platform: 'ios', capabilities, installId: 'test' } as unknown as NonNullable<Window['__CLIP_NATIVE__']>
  window.ReactNativeWebView = { postMessage: (m: string) => void posted.push(m) }
}

const splashCalls = () => posted.filter((m) => JSON.parse(m).type === 'splash.hide').length
const frames = () => act(() => new Promise((r) => setTimeout(r, 120)))

afterEach(() => {
  cleanup()
  posted.length = 0
  delete window.__CLIP_NATIVE__
  delete window.ReactNativeWebView
})

describe('un seul logo au démarrage de l’app mobile', () => {
  it('tant qu’un écran de démarrage est là, le logo de la coquille reste ; au premier vrai écran, la page le lui dit une fois', async () => {
    inShell(['splash.hide'])
    const { rerender } = render(
      <>
        <ShellSplash />
        <div data-boot-loader />
      </>,
    )
    await frames()
    expect(splashCalls()).toBe(0)

    rerender(
      <>
        <ShellSplash />
        <main>Accueil</main>
      </>,
    )
    await frames()
    expect(splashCalls()).toBe(1)

    // Un chargement plus tard ne compte plus : l'écran de démarrage est déjà parti.
    rerender(
      <>
        <ShellSplash />
        <main>Accueil</main>
        <div data-boot-loader />
      </>,
    )
    await frames()
    expect(splashCalls()).toBe(1)
  })

  it('une page sans écran de démarrage (la connexion) le dit tout de suite', async () => {
    inShell(['splash.hide'])
    render(
      <>
        <ShellSplash />
        <main>Connexion</main>
      </>,
    )
    await frames()
    expect(splashCalls()).toBe(1)
  })

  it('sans la capacité (toggle éteint, ancienne coquille) ou hors de la coquille : rien', async () => {
    inShell(['haptics'])
    render(<ShellSplash />)
    await frames()
    expect(posted).toEqual([])
    cleanup()
    delete window.__CLIP_NATIVE__
    delete window.ReactNativeWebView
    render(<ShellSplash />)
    await frames()
    expect(posted).toEqual([])
  })
})
