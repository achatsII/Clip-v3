import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const now = Date.now()
const iso = (ago: number) => new Date(now - ago).toISOString()
let creations: unknown[] = []
let recent: unknown[] = []
vi.mock('@/hooks/useCreations', () => ({ useCreations: () => ({ data: creations }), useRecentCreations: () => ({ data: recent }) }))
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }))

import { CreationList } from '@/components/CreationList'
import { markCreatedSeen } from '@/lib/prefs'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const running = { _id: 'r1', json_data: { title: 'Changer la matrice', generating: { startedAt: iso(60_000), heartbeatAt: iso(5_000), stage: 'analyze', device: 'app', byName: 'Mélanie' } } }
const done = (id: string, title: string) => ({ _id: id, json_data: { title, generating: null, generation: { at: iso(3 * 60_000) }, stepCount: 6 } })

describe('l’accueil : les créations', () => {
  it('montre celle qui avance, puis celles qui viennent d’être créées, prêtes à ouvrir', () => {
    creations = [running]
    recent = [done('r1', 'Changer la matrice'), done('d1', 'Nettoyer les rails'), done('d2', 'Graisser la chaîne')]
    markCreatedSeen('d2')
    render(<CreationList />)
    expect(screen.getByRole('heading', { name: 'En création' })).toBeTruthy()
    expect(screen.getByText(/L’IA regarde et écoute vos notes/)).toBeTruthy()
    // La création en cours n'est pas aussi « prête » ; celle déjà ouverte sur cet appareil non plus.
    expect(screen.getAllByText('Changer la matrice')).toHaveLength(1)
    expect(screen.queryByText('Graisser la chaîne')).toBeNull()
    const link = screen.getByText('Nettoyer les rails').closest('a')!
    expect(link.getAttribute('href')).toBe('/instructions/d1')
    expect(screen.getByText(/Créée .* · 6 étapes/)).toBeTruthy()
  })

  it('sans création en cours, la liste s’appelle « Viennent d’être créées » ; × l’écarte, ouvrir aussi', () => {
    creations = []
    recent = [done('d1', 'Nettoyer les rails'), done('d3', 'Vider le bac')]
    render(<CreationList />)
    expect(screen.getByRole('heading', { name: 'Viennent d’être créées' })).toBeTruthy()
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Ne plus proposer « Nettoyer les rails » ici' }))
    })
    expect(screen.queryByText('Nettoyer les rails')).toBeNull()
    act(() => {
      fireEvent.click(screen.getByText('Vider le bac'))
    })
    expect(screen.queryByText('Vider le bac')).toBeNull()
    // Plus rien à proposer : la section disparaît.
    expect(screen.queryByText('Viennent d’être créées')).toBeNull()
  })
})
