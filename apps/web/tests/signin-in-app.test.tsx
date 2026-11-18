/**
 * Dans l'app des magasins, la connexion ne parle ni de gratuit ni de carte : on n'y vend rien (règles d'Apple et de
 * Google, modèle « Spotify »). Sur le web, l'invitation reste « Créer un compte gratuit ».
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))
vi.mock('@/lib/config', async (orig) => ({ ...(await orig<typeof import('@/lib/config')>()), SELF_SERVICE: true }))
vi.mock('@/lib/toggles', async (orig) => ({ ...(await orig<typeof import('@/lib/toggles')>()), useToggle: () => false }))

import ConnexionPage from '@/app/connexion/page'
import { auth } from '@/lib/i18n/fr/auth'

const t = auth.login

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ConnexionPage />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  const w = window as unknown as Record<string, unknown>
  delete w.__CLIP_NATIVE__
  delete w.ReactNativeWebView
})

describe('la connexion, dans l’app et sur le web', () => {
  it('dans l’app : « Créer mon compte », puis ni gratuit ni carte', () => {
    Object.assign(window, { __CLIP_NATIVE__: { capabilities: [] }, ReactNativeWebView: { postMessage: () => undefined } })
    renderPage()
    expect(screen.queryByText(t.createFreeAccount)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: t.submit.signup }))
    expect(screen.getByRole('heading', { name: t.titles.signup })).toBeTruthy()
    expect(screen.queryByText(t.intros.signup)).toBeNull()
    expect(document.body.textContent).not.toMatch(/gratuit|carte/i)
  })

  it('sur le web : l’invitation et ses conditions, telles quelles', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: t.createFreeAccount }))
    expect(screen.getByText(t.intros.signup)).toBeTruthy()
  })
})
