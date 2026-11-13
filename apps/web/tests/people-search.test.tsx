import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { PeopleChips, type PersonOption } from '@/components/ui/PeopleChips'
import { matchesTokens, searchTokens } from '@/lib/util/people'

afterEach(cleanup)

describe('chercher des personnes comme on les nomme', () => {
  it('chaque mot doit se trouver, sans accents ni majuscules, dans n’importe quel champ', () => {
    expect(searchTokens('  Ana   ROY ')).toEqual(['ana', 'roy'])
    expect(matchesTokens(searchTokens('ana roy'), 'Ana-Maria Roy')).toBe(true)
    expect(matchesTokens(searchTokens('roy ana'), 'Ana-Maria Roy')).toBe(true)
    expect(matchesTokens(searchTokens('helene presse'), 'Hélène Côté', null, 'Presse P-12')).toBe(true)
    expect(matchesTokens(searchTokens('helene soudure'), 'Hélène Côté', 'Presse P-12')).toBe(false)
    expect(matchesTokens([], 'n’importe qui')).toBe(true)
  })
})

describe('choisir des personnes parmi beaucoup', () => {
  const people: PersonOption[] = Array.from({ length: 40 }, (_, i) => ({ id: `u${i}`, name: `Personne ${String(i).padStart(2, '0')}`, detail: `p${i}@usine.ca` }))

  function Host({ initial = [] as string[] }) {
    const [selected, setSelected] = useState(initial)
    return <PeopleChips people={people} selected={selected} onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} />
  }

  it('les choisies d’abord, 24 autres au plus, et la recherche trouve le reste', () => {
    const v = render(<Host initial={['u39']} />)
    const chips = () => v.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'))
    expect(chips()[0].textContent).toBe('Personne 39')
    expect(chips()[0].getAttribute('aria-pressed')).toBe('true')
    expect(chips()).toHaveLength(25)
    expect(v.getByText(/\+ 15 autres/)).toBeTruthy()
    fireEvent.change(v.getByRole('searchbox'), { target: { value: 'personne 3' } })
    // Chaque nom qui contient « 3 » ; « 39 » reste en tête, choisie.
    expect(chips().map((c) => c.textContent)).toEqual(['Personne 39', 'Personne 03', 'Personne 13', 'Personne 23', ...Array.from({ length: 9 }, (_, i) => `Personne 3${i}`)])
    fireEvent.change(v.getByRole('searchbox'), { target: { value: 'p7@usine' } })
    fireEvent.click(chips().find((c) => c.textContent === 'Personne 07')!)
    fireEvent.change(v.getByRole('searchbox'), { target: { value: '' } })
    expect(chips().slice(0, 2).map((c) => c.textContent)).toEqual(['Personne 07', 'Personne 39'])
  })

  it('une recherche sans résultat le dit', () => {
    const v = render(<Host />)
    fireEvent.change(v.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(v.getByText('Rien ne correspond à cette recherche.')).toBeTruthy()
  })
})

describe('« Qui êtes-vous ? » à la tablette, avec une grande équipe', () => {
  it('ceux du poste d’abord, les autres par la recherche, et « personne de ce nom » si rien ne correspond', async () => {
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
    const { WhoAreYou } = await import('@/components/public/WhoAreYou')
    const { dataApi } = await import('@/lib/gateway/data')
    const { fakeGateway } = await import('./fakeClient')
    const ops = Array.from({ length: 60 }, (_, i) => ({ _id: `op${i}`, json_data: { app_identifier: 'clip-v3', name: i === 7 ? 'Hélène Côté' : `Opérateur ${String(i).padStart(2, '0')}`, shift: null, stationIds: i < 3 ? ['st1'] : [], active: true, createdAt: '2026-01-01' } }))
    const gw = fakeGateway(() => ({ success: true, results: ops }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const v = render(
      <QueryClientProvider client={qc}>
        <WhoAreYou link="lien" data={dataApi(gw)} stationId="st1" canIdentify onDone={() => undefined} onSkip={() => undefined} />
      </QueryClientProvider>,
    )
    await v.findByText('Opérateur 00')
    const names = () => v.getAllByRole('button').map((b) => b.textContent ?? '').filter((x) => /Opérateur|Hélène/.test(x))
    // Les 3 du poste, puis 21 autres : 24 noms, le reste par la recherche.
    expect(names()).toHaveLength(24)
    expect(v.getByText(/\+ 36 autres : cherchez votre nom/)).toBeTruthy()
    fireEvent.change(v.getByRole('searchbox'), { target: { value: 'helene' } })
    expect(names()).toEqual(['HCHélène Côté'])
    fireEvent.change(v.getByRole('searchbox'), { target: { value: 'quelqu’un d’autre' } })
    expect(v.getByText('Personne de ce nom.')).toBeTruthy()
    expect(v.getByRole('button', { name: 'Continuer sans m’identifier' })).toBeTruthy()
  })
})
