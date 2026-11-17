import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClassificationCard } from '@/components/editor/ClassificationCard'
import { LabelFilters } from '@/components/LabelFilters'
import type { Nomenclature } from '@/lib/model/nomenclature'

afterEach(cleanup)

const NOM: Nomenclature = {
  families: [
    { id: 'dept', name: 'Département', kind: 'list', multiple: false, values: [{ label: 'Découpe' }, { label: 'Assemblage' }] },
    { id: 'prod', name: 'Produit', kind: 'free', multiple: true, values: [] },
  ],
}

describe('la carte Classement de l’éditeur', () => {
  it('une liste se choisit dans une fenêtre ; une famille simple se ferme au choix', () => {
    const onChange = vi.fn()
    render(<ClassificationCard labels={{}} nomenclature={NOM} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter à « Département »' }))
    fireEvent.click(screen.getByRole('button', { name: 'Découpe' }))
    expect(onChange).toHaveBeenCalledWith({ dept: ['Découpe'] })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('une valeur libre s’écrit, puis Entrée ; une valeur se retire d’un toucher', () => {
    const onChange = vi.fn()
    render(<ClassificationCard labels={{ dept: ['Découpe'] }} nomenclature={NOM} onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: 'Ajouter à « Produit »' })
    fireEvent.change(input, { target: { value: ' 12345 ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith({ dept: ['Découpe'], prod: ['12345'] })
    fireEvent.click(screen.getByRole('button', { name: 'Retirer « Découpe »' }))
    expect(onChange).toHaveBeenLastCalledWith({})
  })

  it('l’IA a classé : on le dit, et « C’est bon » efface le rappel ; sans famille, on invite à les créer', () => {
    const onConfirm = vi.fn()
    render(<ClassificationCard labels={{ dept: ['Découpe'] }} nomenclature={NOM} onChange={vi.fn()} aiCheck onConfirm={onConfirm} ruleStations={['Presse P-12']} />)
    expect(screen.getByText('L’IA a classé cette instruction : vérifiez d’un coup d’œil.')).toBeTruthy()
    expect(screen.getByText('Aussi au poste Presse P-12, par sa règle.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /C’est bon/ }))
    expect(onConfirm).toHaveBeenCalled()
    cleanup()
    render(<ClassificationCard labels={{}} nomenclature={{ families: [] }} onChange={vi.fn()} canSetUp />)
    expect(screen.getByRole('link', { name: 'Les créer' }).getAttribute('href')).toBe('/reglages?onglet=classement')
  })
})

describe('les filtres de la bibliothèque', () => {
  it('une pastille par famille en liste ; on coche une ou plusieurs valeurs, et on efface', () => {
    const onChange = vi.fn()
    const { rerender } = render(<LabelFilters nomenclature={NOM} value={{}} onChange={onChange} />)
    // Une famille à valeur libre se cherche dans la barre de recherche : pas de pastille.
    expect(screen.queryByRole('button', { name: 'Produit' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Département' }))
    fireEvent.click(screen.getByRole('button', { name: 'Assemblage' }))
    expect(onChange).toHaveBeenCalledWith({ dept: ['Assemblage'] })
    rerender(<LabelFilters nomenclature={NOM} value={{ dept: ['Assemblage'] }} onChange={onChange} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Effacer' })[0])
    expect(onChange).toHaveBeenLastCalledWith({})
  })
})
