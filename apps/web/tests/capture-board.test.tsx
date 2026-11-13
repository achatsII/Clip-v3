import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const insert = vi.fn(async (_type: string, json: object) => ({ _id: 'i1', json_data: json }))
const patch = vi.fn(async () => undefined)
vi.mock('@/components/providers/Session', () => ({
  useSession: () => ({ data: { insert, patch, filter: async () => [] }, files: {}, profile: { userId: 'u1' }, displayName: 'Mélanie' }),
}))

import { CaptureBoard } from '@/components/capture/CaptureBoard'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'

/** Un téléphone : aucune requête « grand écran » ne répond oui. */
function narrowScreen() {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false })) as typeof window.matchMedia
}

function Page({ id }: { id: string }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <ConfirmProvider>
          <CaptureBoard key={id} instructionId={null} initialSources={[]} title="Nouvelle instruction" subtitle="Montrez et expliquez." back={{ href: '/instructions', label: 'Instructions' }} onGenerate={vi.fn()} />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  narrowScreen()
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})
afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.immersive
})

describe('capturer une nouvelle instruction, au téléphone', () => {
  it('d’un seul écran : filmer en grand, les quatre autres façons, la phrase facultative ; aucun « Générer » grisé', () => {
    render(<Page id="vide" />)
    // La page prend tout l'écran, comme l'éditeur ; sa propre barre garde le retour.
    expect(document.documentElement.dataset.immersive).toBe('')
    expect(screen.getByRole('link', { name: 'Instructions' }).getAttribute('href')).toBe('/instructions')
    expect(screen.getByRole('button', { name: /Filmer le geste/ })).toBeTruthy()
    // (Au téléphone, la petite phrase sous chaque nom est cachée ; jsdom ne lit pas le CSS, d'où le début du nom.)
    for (const name of [/^Photos/, /^Note vocale/, /^Note(?! vocale)/, /^Fichiers/]) expect(screen.getByRole('button', { name })).toBeTruthy()
    expect(screen.getByLabelText(/De quoi s’agit-il/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Générer l’instruction/ })).toBeNull()
  })

  it('une note ajoutée : elle passe en tête, « Ajouter » en propose d’autres, et « Générer » paraît', async () => {
    render(<Page id="note" />)
    fireEvent.click(screen.getByRole('button', { name: /^Note(?! vocale)/ }))
    fireEvent.change(screen.getByPlaceholderText(/serrer à 25 N·m/), { target: { value: 'Serrer à 25 N·m.' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ajouter la note' }))
    })
    expect(screen.getByText('Vos notes')).toBeTruthy()
    expect(screen.getByText('Ajouter')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Filmer le geste/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Générer l’instruction/ })).toBeTruthy()
    // Une seule note : l'accord suit.
    expect(screen.getByText('1 note prête. L’IA va l’analyser.')).toBeTruthy()
    // La note est enregistrée : l'instruction se crée, ses sources suivent.
    expect(insert).toHaveBeenCalled()
    expect(patch).toHaveBeenCalled()
  })
})
