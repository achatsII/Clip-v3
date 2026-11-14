'use client'

import { Check, GraduationCap, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Confirm'
import { AutoTextarea, fieldLook, Label } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { errorText, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { makeQuiz } from '@/lib/ai/quiz'
import type { AiApi } from '@/lib/gateway/ai'
import { useMessages } from '@/lib/i18n'
import { uid } from '@/lib/model/repo'
import { MAX_CHOICES, MAX_QUESTIONS } from '@/lib/model/training'
import type { InstructionContent, QuizQuestion } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

const blank = (): QuizQuestion => ({ id: uid('qz_'), question: '', choices: ['', '', ''], answer: 0 })

/**
 * Les questions de formation d'une instruction (toggle `training`) : l'IA les prépare, l'auteur les
 * retouche. Elles font partie du brouillon (enregistrées avec lui) et arrivent au poste à la
 * publication.
 */
export function QuizDialog({ open, onClose, content, ai, readOnly, published, onChange }: { open: boolean; onClose: () => void; content: InstructionContent; ai: AiApi | null; readOnly: boolean; published: boolean; onChange: (quiz: QuizQuestion[]) => void }) {
  const t = useMessages().training
  const toast = useToast()
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)
  const quiz = content.quiz ?? []
  const patch = (id: string, p: Partial<QuizQuestion>) => onChange(quiz.map((q) => (q.id === id ? { ...q, ...p } : q)))

  async function make() {
    if (!ai || busy) return
    if (quiz.length && !(await confirm({ title: t.remakeConfirm.title, description: t.remakeConfirm.description, confirmLabel: t.remakeConfirm.confirm }))) return
    setBusy(true)
    try {
      onChange(await makeQuiz(ai, content))
    } catch (e) {
      toast.error(t.errors.makeFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  function removeChoice(q: QuizQuestion, i: number) {
    const choices = q.choices.filter((_, k) => k !== i)
    // Le bon choix suit son texte : retirer un choix avant lui le fait remonter d'un rang.
    const answer = q.answer === i ? 0 : q.answer > i ? q.answer - 1 : q.answer
    patch(q.id, { choices, answer })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t.title}
      footer={
        <>
          {!readOnly && ai && quiz.length > 0 && (
            <Button onClick={() => void make()} loading={busy} icon={<Sparkles className="h-4 w-4" />}>
              {t.remake}
            </Button>
          )}
          {/* Sans question, l'action principale est « Préparer les questions » : « Terminé » s'efface. */}
          <Button variant={quiz.length && !busy ? 'primary' : undefined} onClick={onClose}>
            {t.done}
          </Button>
        </>
      }
    >
      <p className="font-medium text-slate-600 dark:text-slate-300">{t.intro}</p>
      {busy ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          <p className="text-sm font-black text-[var(--primary-strong)] dark:text-sky-300">{t.making}</p>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-3xl" />
          ))}
        </div>
      ) : !quiz.length ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl bg-slate-900/[0.03] p-6 text-center dark:bg-white/5">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-[var(--primary)]">
            <GraduationCap className="h-7 w-7" />
          </span>
          <p className="text-lg font-black">{t.empty}</p>
          {!readOnly && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {ai && (
                <Button variant="primary" onClick={() => void make()} icon={<Sparkles className="h-4 w-4" />}>
                  {t.make}
                </Button>
              )}
              <Button onClick={() => onChange([blank()])} icon={<Plus className="h-4 w-4" />}>
                {t.addQuestion}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {quiz.map((q, n) => (
            <section key={q.id} className="glass-card space-y-3 rounded-3xl p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="label-caps text-slate-500">{t.question(n + 1)}</p>
                {!readOnly && (
                  <IconButton label={t.removeQuestion} onClick={() => onChange(quiz.filter((x) => x.id !== q.id))} className="text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
              </div>
              {/* Des champs qui grandissent avec le texte : un choix long se lit en entier, même au téléphone. */}
              <AutoTextarea singleLine value={q.question} readOnly={readOnly} aria-label={t.question(n + 1)} className={cn(fieldLook, 'text-base font-black')} onChange={(e) => patch(q.id, { question: e.target.value })} />
              <ul className="space-y-2">
                {q.choices.map((c, i) => {
                  const right = q.answer === i
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <button
                        type="button"
                        disabled={readOnly}
                        aria-pressed={right}
                        aria-label={right ? t.correct : t.markCorrect}
                        title={right ? t.correct : t.markCorrect}
                        onClick={() => patch(q.id, { answer: i })}
                        className={cn('btn-press mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition', right ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent dark:border-slate-600')}
                      >
                        <Check className="h-5 w-5" strokeWidth={3} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <AutoTextarea singleLine value={c} readOnly={readOnly} aria-label={t.choice(i + 1)} placeholder={t.choice(i + 1)} onChange={(e) => patch(q.id, { choices: q.choices.map((x, k) => (k === i ? e.target.value : x)) })} className={cn(fieldLook, right && 'ring-2 ring-emerald-500/60')} />
                      </div>
                      {!readOnly && q.choices.length > 2 && (
                        <IconButton label={t.removeChoice} onClick={() => removeChoice(q, i)} className="mt-0.5">
                          <X className="h-4 w-4" />
                        </IconButton>
                      )}
                    </li>
                  )
                })}
              </ul>
              {!readOnly && q.choices.length < MAX_CHOICES && (
                <button type="button" onClick={() => patch(q.id, { choices: [...q.choices, ''] })} className="btn-press flex min-h-11 items-center gap-2 rounded-2xl px-2 text-sm font-black text-[var(--primary-strong)] dark:text-sky-300">
                  <Plus className="h-4 w-4" /> {t.addChoice}
                </button>
              )}
              <div>
                <Label htmlFor={`why-${q.id}`}>{t.why}</Label>
                <AutoTextarea singleLine id={`why-${q.id}`} value={q.why ?? ''} readOnly={readOnly} onChange={(e) => patch(q.id, { why: e.target.value })} className={fieldLook} />
              </div>
            </section>
          ))}
          {!readOnly && quiz.length < MAX_QUESTIONS && (
            <button type="button" onClick={() => onChange([...quiz, blank()])} className="btn-press flex min-h-14 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-300 text-sm font-black text-slate-600 dark:border-slate-600 dark:text-slate-300">
              <Plus className="h-4 w-4" /> {t.addQuestion}
            </button>
          )}
          {published && <p className="text-xs font-bold text-slate-400">{t.publishHint}</p>}
        </div>
      )}
    </Modal>
  )
}
