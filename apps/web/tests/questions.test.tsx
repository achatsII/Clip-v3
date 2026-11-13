import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuestionsDialog } from '@/components/editor/QuestionsDialog'
import { normalizeQuestions } from '@/lib/ai/normalize'
import { messages } from '@/lib/i18n'

afterEach(cleanup)

describe('les questions de la génération', () => {
  it('gardent 2 à 4 réponses proposées, jamais pour une seule, et acceptent l’ancienne forme', () => {
    const { questions, choices } = normalizeQuestions([
      { question: 'Faut-il porter des gants ?', choices: ['Oui', 'Non', 'Oui'] },
      { question: 'Quel couple de serrage ?', choices: [] },
      { question: 'Le cadenas est-il personnel ?', choices: ['Oui'] },
      'Ancienne question en texte',
      { question: 'Faut-il porter des gants ?', choices: ['Oui', 'Non'] },
      { question: 'Cinquième', choices: ['A', 'B'] },
    ])
    expect(questions).toEqual(['Faut-il porter des gants ?', 'Quel couple de serrage ?', 'Le cadenas est-il personnel ?', 'Ancienne question en texte'])
    expect(choices).toEqual({ 'Faut-il porter des gants ?': ['Oui', 'Non'] })
  })
})

describe('répondre aux questions de l’IA', () => {
  const questions = ['Faut-il porter des gants ?', 'Quel couple de serrage ?', 'Le carter se remet-il avant l’essai ?']
  const choices = { 'Faut-il porter des gants ?': ['Oui', 'Non'] }

  it('une question à la fois : réponse proposée, réponse écrite, question passée ; les réponses partent ensemble', () => {
    const onApply = vi.fn()
    render(<QuestionsDialog open questions={questions} choices={choices} onClose={vi.fn()} onApply={onApply} />)
    expect(screen.getByText('Question 1 sur 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Oui' }))
    expect(screen.getByRole('button', { name: 'Oui' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(screen.getByText('Quel couple de serrage ?')).toBeTruthy()
    // Une valeur à lire : aucune réponse proposée, la personne l'écrit.
    expect(screen.queryByText('Réponses proposées')).toBeNull()
    fireEvent.change(screen.getByPlaceholderText('Votre réponse, écrite ou dictée'), { target: { value: '25 N·m' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    // La dernière est passée : elle reste à vérifier.
    fireEvent.click(screen.getByRole('button', { name: 'Passer' }))
    expect(onApply).toHaveBeenCalledWith([
      { question: 'Faut-il porter des gants ?', answer: 'Oui' },
      { question: 'Quel couple de serrage ?', answer: '25 N·m' },
    ])
  })

  it('sans aucune réponse, rien ne part', () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(<QuestionsDialog open questions={questions.slice(0, 1)} choices={{}} onClose={onClose} onApply={onApply} />)
    expect((screen.getByRole('button', { name: /Corriger l’instruction/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Passer' }))
    expect(onApply).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('une question déjà vérifiée quitte la liste ; la dernière fait partir les réponses déjà données', () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    let list = [...questions]
    const onChecked = vi.fn((q: string) => {
      list = list.filter((x) => x !== q)
    })
    const view = render(<QuestionsDialog open questions={list} choices={choices} onClose={onClose} onApply={onApply} onChecked={onChecked} />)
    const rerender = () => view.rerender(<QuestionsDialog open questions={list} choices={choices} onClose={onClose} onApply={onApply} onChecked={onChecked} />)
    // La première a sa réponse ; la deuxième est déjà vérifiée : la troisième prend sa place.
    fireEvent.click(screen.getByRole('button', { name: 'Oui' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: /C’est déjà vérifié/ }))
    rerender()
    expect(onChecked).toHaveBeenCalledWith('Quel couple de serrage ?')
    expect(screen.getByText('Le carter se remet-il avant l’essai ?')).toBeTruthy()
    // La dernière, vérifiée elle aussi : la réponse donnée part, sans les questions réglées.
    fireEvent.click(screen.getByRole('button', { name: /C’est déjà vérifié/ }))
    expect(onApply).toHaveBeenCalledWith([{ question: 'Faut-il porter des gants ?', answer: 'Oui' }])
    expect(onClose).not.toHaveBeenCalled()
  })

  it('l’assistant reçoit chaque question avec sa réponse', () => {
    const text = messages().editor.page.questions.request([{ question: 'Quel couple de serrage ?', answer: '25 N·m' }])
    expect(text).toContain('1. Quel couple de serrage ? → 25 N·m')
  })
})
