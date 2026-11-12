'use client'

import { useEffect, useState } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'

export interface QuestionAnswer {
  question: string
  answer: string
}

/**
 * Répondre aux questions de l'IA, une à la fois : des réponses proposées quand la réponse est l'un
 * de quelques choix clairs, sinon un champ, écrit ou dicté. On peut passer une question. À la fin,
 * les réponses partent ensemble à l'assistant d'édition, qui corrige l'instruction sous les yeux de
 * la personne (`onApply`).
 */
export function QuestionsDialog({
  open,
  questions,
  choices,
  onClose,
  onApply,
}: {
  open: boolean
  questions: string[]
  choices: Record<string, string[]>
  onClose: () => void
  onApply: (answers: QuestionAnswer[]) => void
}) {
  const t = useMessages().editor.page.questions.dialog
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!open) return
    setIndex(0)
    setAnswers({})
  }, [open])

  const total = questions.length
  const at = Math.min(index, Math.max(0, total - 1))
  const question = questions[at] ?? ''
  const value = answers[question] ?? ''
  const last = at >= total - 1
  const proposed = choices[question] ?? []

  /** Passe à la question suivante, ou envoie les réponses à la dernière. */
  function advance(next: Record<string, string>) {
    setAnswers(next)
    if (!last) {
      setIndex(at + 1)
      return
    }
    const given = questions.map((q) => ({ question: q, answer: (next[q] ?? '').trim() })).filter((x) => x.answer)
    if (given.length) onApply(given)
    else onClose()
  }

  const anyAnswer = questions.some((q) => (q === question ? value : answers[q] ?? '').trim())

  return (
    <Modal
      open={open && total > 0}
      onClose={onClose}
      title={t.title}
      footer={
        <>
          <Button onClick={() => advance({ ...answers, [question]: '' })}>{t.skip}</Button>
          {last ? (
            <Button variant="primary" disabled={!anyAnswer} onClick={() => advance(answers)}>
              {t.apply} <AiCost operation="edit_agent" />
            </Button>
          ) : (
            <Button variant="primary" onClick={() => advance(answers)}>
              {t.next}
            </Button>
          )}
        </>
      }
    >
      <p className="label-caps text-slate-500 tabular-nums">{t.progress(at + 1, total)}</p>
      <p className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">{question}</p>
      {proposed.length > 0 && (
        <div className="mt-5">
          <p className="label-caps mb-2 text-slate-500">{t.suggested}</p>
          <div className="flex flex-wrap gap-2">
            {proposed.map((c, i) => (
              <button
                key={c}
                type="button"
                aria-pressed={value === c}
                // Avec des réponses proposées, le focus va à la première : pas de clavier qui surgit.
                data-autofocus={i === 0 ? true : undefined}
                onClick={() => setAnswers({ ...answers, [question]: value === c ? '' : c })}
                className={cn('btn-press min-h-11 rounded-2xl px-4 text-[15px] font-black', value === c ? 'bg-gradient-primary shadow-primary text-white' : 'glass-card text-slate-800 dark:text-slate-100')}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4">
        <Textarea key={question} value={value} onChange={(e) => setAnswers({ ...answers, [question]: e.target.value })} placeholder={t.placeholder} rows={2} />
      </div>
    </Modal>
  )
}
