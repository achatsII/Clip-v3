'use client'

import { useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { assistStep } from '@/lib/ai/assist'
import { STEP_ACTIONS } from '@/lib/ai/prompts'
import { useMessages } from '@/lib/i18n'
import { WARNINGS } from '@/lib/model/catalog'
import type { InstructionContent, Step } from '@/lib/model/types'

/** Les retouches d'une étape en un geste, dans l'ordre d'affichage ; le libellé se lit au rendu (`editor.assist.actions`). */
export const ASSIST_ACTIONS = ['simplify', 'clarify', 'keypoint', 'safety'] as const

export type AssistKey = (typeof ASSIST_ACTIONS)[number]

/**
 * L'IA retouche une étape : une proposition à appliquer ou non (avant / après), et la demande
 * libre. Partagé par la fiche et la vue « Comme au poste ». `element` porte les deux fenêtres.
 */
export function useStepAssist({ content, step, onApply }: { content: InstructionContent; step: Step; onApply: (s: Step) => void }) {
  const { ai, org } = useSession()
  const toast = useToast()
  const t = useMessages()
  const [busy, setBusy] = useState<string | null>(null)
  const [custom, setCustom] = useState(false)
  const [customText, setCustomText] = useState('')
  const [suggestion, setSuggestion] = useState<{ step: Step; explanation: string } | null>(null)

  async function ask(key: string, request: string) {
    setBusy(key)
    try {
      setSuggestion(await assistStep(ai, org.json_data, content, step, request))
    } catch (e) {
      toast.error(t.editor.assist.failed, errorText(e))
    } finally {
      setBusy(null)
    }
  }

  const element = (
    <>
      <Modal
        open={custom}
        onClose={() => setCustom(false)}
        title={t.editor.assist.customTitle}
        footer={
          <>
            <Button onClick={() => setCustom(false)}>{t.common.cancel}</Button>
            <Button
              variant="primary"
              disabled={!customText.trim()}
              loading={busy === 'custom'}
              onClick={async () => {
                await ask('custom', customText.trim())
                setCustom(false)
                setCustomText('')
              }}
            >
              {t.editor.assist.ask}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-2">
          <Textarea autoFocus value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder={t.editor.assist.customPlaceholder} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {t.editor.assist.examples.map((ex) => (
            <button key={ex} type="button" onClick={() => setCustomText(ex)} className="glass-card btn-press rounded-xl px-3 py-2 text-xs font-bold">
              {ex}
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        open={!!suggestion}
        onClose={() => setSuggestion(null)}
        title={t.editor.assist.proposalTitle}
        footer={
          <>
            <Button onClick={() => setSuggestion(null)}>{t.editor.assist.keepOriginal}</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (suggestion) onApply(suggestion.step)
                setSuggestion(null)
              }}
            >
              {t.editor.assist.apply}
            </Button>
          </>
        }
      >
        {suggestion && (
          <div className="space-y-3">
            {suggestion.explanation && <p className="text-sm font-bold text-slate-500">{suggestion.explanation}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-900/5 p-4 dark:bg-white/5">
                <p className="label-caps mb-1 text-slate-400">{t.editor.assist.before}</p>
                <p className="font-black">{step.title}</p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{step.text}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
                <p className="label-caps mb-1 text-emerald-600">{t.editor.assist.after}</p>
                <p className="font-black">{suggestion.step.title}</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{suggestion.step.text}</p>
                {!!suggestion.step.keyPoints?.length && (
                  <ul className="mt-2 list-disc pl-5 text-sm font-medium">
                    {suggestion.step.keyPoints.map((k) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                )}
                {suggestion.step.warning && (
                  <p className="mt-2 text-sm font-black text-rose-600">
                    {t.editor.assist.warning(WARNINGS[suggestion.step.warning.level].label, suggestion.step.warning.text)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )

  return {
    busy,
    run: (key: AssistKey) => ask(key, STEP_ACTIONS[key]),
    openCustom: () => setCustom(true),
    element,
  }
}
